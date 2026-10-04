"""Run a laptop webcam scan and send the spoken result to the Pi JBL bridge."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from dotenv import load_dotenv

from scan import run_scan


DEVICE_DIR = Path(__file__).resolve().parent
DEFAULT_PI_AUDIO_URL = "http://192.168.2.2:8765/play"
DEFAULT_ELEVENLABS_MODEL = "eleven_multilingual_v2"


def response_error(body: bytes) -> str:
    try:
        payload = json.loads(body.decode("utf-8"))
        return payload.get("detail") or payload.get("error") or str(payload)
    except (UnicodeDecodeError, json.JSONDecodeError):
        return body.decode("utf-8", errors="replace")[:500]


def elevenlabs_speech(text: str) -> bytes:
    api_key = os.getenv("ELEVENLABS_API_KEY", "").strip()
    voice_id = os.getenv("ELEVENLABS_VOICE_ID", "").strip()
    if not api_key:
        raise RuntimeError("set ELEVENLABS_API_KEY in device/.env")
    if not voice_id:
        raise RuntimeError("set ELEVENLABS_VOICE_ID in device/.env")

    url = (
        "https://api.elevenlabs.io/v1/text-to-speech/"
        f"{quote(voice_id, safe='')}?output_format=mp3_44100_128"
    )
    payload = json.dumps(
        {
            "text": text,
            "model_id": os.getenv("ELEVENLABS_MODEL", DEFAULT_ELEVENLABS_MODEL),
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
        }
    ).encode("utf-8")
    request = Request(
        url,
        data=payload,
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


def send_audio_to_pi(audio: bytes) -> None:
    url = os.getenv("CAREBOT_PI_AUDIO_URL", DEFAULT_PI_AUDIO_URL).strip()
    token = os.getenv("CAREBOT_AUDIO_TOKEN", "")
    headers = {"Content-Type": "audio/mpeg", "Accept": "application/json"}
    if token:
        headers["X-Carebot-Audio-Token"] = token
    request = Request(url, data=audio, headers=headers, method="POST")
    try:
        with urlopen(request, timeout=60) as response:
            response.read()
    except HTTPError as error:
        raise RuntimeError(
            f"Pi audio receiver failed ({error.code}): {response_error(error.read())}"
        ) from error
    except URLError as error:
        raise RuntimeError(f"could not reach Pi audio receiver: {error.reason}") from error


def main() -> int:
    load_dotenv(DEVICE_DIR / ".env")
    try:
        input("Hold the medication bottle in view, then press Enter to scan… ")
        sentence = run_scan()
        print(f'Device would say: "{sentence}"')
        print("Generating speech with ElevenLabs…")
        audio = elevenlabs_speech(sentence)
        print("Sending speech to the Raspberry Pi JBL bridge…")
        send_audio_to_pi(audio)
        print("Played through the Pi JBL speaker.")
        return 0
    except (OSError, RuntimeError) as error:
        print(f"Scan audio failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
