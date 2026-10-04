#!/usr/bin/env python3

"""Prototype voice assistant using a laptop microphone, Gemini, and ElevenLabs."""

from __future__ import annotations

import argparse
import base64
import io
import json
import math
import os
import shutil
import struct
import subprocess
import sys
import tempfile
import time
import wave
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

try:
    import sounddevice as sd
except ImportError as error:  # pragma: no cover - shown when setup is incomplete
    raise SystemExit(
        "sounddevice is missing. Run: python -m pip install -r requirements.txt"
    ) from error


SAMPLE_RATE = 16_000
CHANNELS = 1
SAMPLE_WIDTH = 2
BLOCK_SECONDS = 0.1
DEFAULT_GEMINI_MODEL = "gemini-3.8-flash"
DEFAULT_ELEVENLABS_MODEL = "eleven_multilingual_v2"
DEFAULT_ELEVENLABS_VOICE = "JBFqnCBsd6RMkjVDRZzb"


class NoSpeechDetected(RuntimeError):
    """Raised when the microphone does not detect speech before the timeout."""


def required_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"set {name} before starting the voice assistant")
    return value


def rms_level(audio_block: bytes) -> float:
    sample_count = len(audio_block) // SAMPLE_WIDTH
    if sample_count == 0:
        return 0.0
    samples = struct.unpack(f"<{sample_count}h", audio_block[: sample_count * SAMPLE_WIDTH])
    return math.sqrt(sum(sample * sample for sample in samples) / sample_count) / 32768.0


def wav_bytes(audio: bytes) -> bytes:
    output = io.BytesIO()
    with wave.open(output, "wb") as wav_file:
        wav_file.setnchannels(CHANNELS)
        wav_file.setsampwidth(SAMPLE_WIDTH)
        wav_file.setframerate(SAMPLE_RATE)
        wav_file.writeframes(audio)
    return output.getvalue()


def record_question(max_seconds: float, silence_seconds: float, threshold: float) -> bytes:
    block_size = int(SAMPLE_RATE * BLOCK_SECONDS)
    blocks: list[bytes] = []
    heard_speech = False
    silent_for = 0.0
    started_at = time.monotonic()

    print("Listening… speak your question.")
    try:
        with sd.RawInputStream(
            samplerate=SAMPLE_RATE,
            blocksize=block_size,
            channels=CHANNELS,
            dtype="int16",
        ) as stream:
            while time.monotonic() - started_at < max_seconds:
                block, overflowed = stream.read(block_size)
                if overflowed:
                    print("Microphone buffer overflow; continuing.", file=sys.stderr)
                block_bytes = bytes(block)
                blocks.append(block_bytes)
                if rms_level(block_bytes) >= threshold:
                    heard_speech = True
                    silent_for = 0.0
                elif heard_speech:
                    silent_for += BLOCK_SECONDS
                    if silent_for >= silence_seconds:
                        break
    except sd.PortAudioError as error:
        raise RuntimeError(
            f"could not access the laptop microphone: {error}. "
            "Check macOS microphone permissions for Terminal or Python."
        ) from error

    if not heard_speech:
        raise NoSpeechDetected("no speech detected")
    return wav_bytes(b"".join(blocks))


def response_error(response_body: bytes) -> str:
    try:
        body = json.loads(response_body.decode("utf-8"))
        return body.get("error", {}).get("message") or body.get("detail") or str(body)
    except (UnicodeDecodeError, json.JSONDecodeError):
        return response_body.decode("utf-8", errors="replace")[:500]


def post_json(url: str, payload: dict[str, object], headers: dict[str, str]) -> dict[str, object]:
    request = Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", **headers},
        method="POST",
    )
    try:
        with urlopen(request, timeout=60) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        raise RuntimeError(f"API request failed ({error.code}): {response_error(error.read())}") from error
    except URLError as error:
        raise RuntimeError(f"could not reach API: {error.reason}") from error


def fetch_schedule_context() -> str:
    api_base_url = os.environ.get("CAREBOT_API_BASE_URL", "").strip()
    patient_id = os.environ.get("CAREBOT_PATIENT_ID", "").strip()
    if not api_base_url or not patient_id:
        return "No medication schedule was provided. Do not invent a schedule."

    url = f"{api_base_url.rstrip('/')}/api/device/schedules?{urlencode({'patient_id': patient_id})}"
    try:
        with urlopen(Request(url, headers={"Accept": "application/json"}), timeout=10) as response:
            schedules = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, OSError, json.JSONDecodeError):
        return "The medication schedule is currently unavailable. Do not invent a schedule."
    return "Medication schedule from the caregiver app:\n" + json.dumps(schedules, indent=2)[:6000]


def ask_gemini(audio: bytes, api_key: str, model: str, schedule_context: str) -> str:
    prompt = f"""
You are carebot, a calm and friendly voice assistant for an older adult.
Listen to the attached WAV recording and answer the patient's spoken question.
Return only the short answer that should be spoken aloud; do not include headings or markdown.
Use plain language and keep the answer under 80 words.
If the audio is unclear, say that you could not understand and ask the patient to repeat it.
Do not diagnose, change prescriptions, or make up medication instructions. For an emergency,
tell the patient to call local emergency services and alert their caregiver.

{schedule_context}
""".strip()
    model_path = quote(model, safe="")
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model_path}:generateContent?key={quote(api_key, safe='')}"
    )
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {
                        "inlineData": {
                            "mimeType": "audio/wav",
                            "data": base64.b64encode(audio).decode("ascii"),
                        }
                    },
                ]
            }
        ],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 180},
    }
    response = post_json(url, payload, {"x-goog-api-key": api_key})
    candidates = response.get("candidates") or []
    if not candidates:
        raise RuntimeError("Gemini returned no answer")
    parts = candidates[0].get("content", {}).get("parts", [])
    answer = " ".join(part.get("text", "").strip() for part in parts if part.get("text"))
    if not answer:
        raise RuntimeError("Gemini returned an empty answer")
    return answer


def elevenlabs_speech(text: str, api_key: str, voice_id: str, model: str) -> bytes:
    url = (
        "https://api.elevenlabs.io/v1/text-to-speech/"
        f"{quote(voice_id, safe='')}?output_format=mp3_44100_128"
    )
    payload = {
        "text": text,
        "model_id": model,
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
    }
    request = Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
            "xi-api-key": api_key,
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=60) as response:
            audio = response.read()
    except HTTPError as error:
        raise RuntimeError(
            f"ElevenLabs request failed ({error.code}): {response_error(error.read())}"
        ) from error
    except URLError as error:
        raise RuntimeError(f"could not reach ElevenLabs: {error.reason}") from error
    if not audio:
        raise RuntimeError("ElevenLabs returned empty audio")
    return audio


def play_audio_locally(audio: bytes) -> None:
    player = next((shutil.which(name) for name in ("afplay", "ffplay", "mpg123", "mpv") if shutil.which(name)), None)
    if player is None:
        raise RuntimeError("install an audio player (macOS afplay, ffplay, mpg123, or mpv)")
    with tempfile.NamedTemporaryFile(prefix="carebot-", suffix=".mp3") as audio_file:
        audio_file.write(audio)
        audio_file.flush()
        command = [player, audio_file.name]
        if player.endswith("ffplay"):
            command[1:1] = ["-nodisp", "-autoexit", "-loglevel", "quiet"]
        subprocess.run(command, check=True)


def send_audio_to_pi(audio: bytes, pi_audio_url: str, token: str) -> None:
    headers = {"Content-Type": "audio/mpeg", "Accept": "application/json"}
    if token:
        headers["X-Carebot-Audio-Token"] = token
    request = Request(pi_audio_url, data=audio, headers=headers, method="POST")
    try:
        with urlopen(request, timeout=60) as response:
            response.read()
    except HTTPError as error:
        raise RuntimeError(
            f"Pi audio receiver failed ({error.code}): {response_error(error.read())}"
        ) from error
    except URLError as error:
        raise RuntimeError(f"could not reach Pi audio receiver: {error.reason}") from error


def play_audio(audio: bytes, pi_audio_url: str | None, token: str) -> None:
    if pi_audio_url:
        print("Sending audio to the Raspberry Pi JBL bridge…")
        send_audio_to_pi(audio, pi_audio_url, token)
        return
    play_audio_locally(audio)


def run_once(args: argparse.Namespace) -> None:
    gemini_key = required_env("GEMINI_API_KEY")
    elevenlabs_key = required_env("ELEVENLABS_API_KEY")
    voice_id = os.environ.get("ELEVENLABS_VOICE_ID", DEFAULT_ELEVENLABS_VOICE).strip()
    schedule_context = fetch_schedule_context()
    audio = record_question(args.max_seconds, args.silence_seconds, args.threshold)
    print("Thinking…")
    answer = ask_gemini(
        audio,
        gemini_key,
        os.environ.get("GEMINI_MODEL", DEFAULT_GEMINI_MODEL),
        schedule_context,
    )
    print(f"carebot: {answer}")
    print("Speaking…")
    speech = elevenlabs_speech(
        answer,
        elevenlabs_key,
        voice_id,
        os.environ.get("ELEVENLABS_MODEL", DEFAULT_ELEVENLABS_MODEL),
    )
    play_audio(
        speech,
        args.pi_audio_url or os.environ.get("CAREBOT_PI_AUDIO_URL"),
        os.environ.get("CAREBOT_AUDIO_TOKEN", ""),
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Use the laptop microphone as a carebot voice prototype")
    parser.add_argument("--max-seconds", type=float, default=12.0, help="Maximum recording length")
    parser.add_argument("--silence-seconds", type=float, default=1.2, help="Stop after this much silence")
    parser.add_argument("--threshold", type=float, default=0.015, help="Microphone volume threshold")
    parser.add_argument("--once", action="store_true", help="Handle one question and exit")
    parser.add_argument(
        "--pi-audio-url",
        help="Send ElevenLabs audio to the Pi receiver instead of laptop speakers",
    )
    args = parser.parse_args()

    try:
        while True:
            input("Press Enter to ask a question (Ctrl-C to quit)… ")
            run_once(args)
            if args.once:
                return 0
    except KeyboardInterrupt:
        print("\nGoodbye.")
        return 0
    except (OSError, RuntimeError, subprocess.SubprocessError) as error:
        print(f"Voice assistant stopped: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
