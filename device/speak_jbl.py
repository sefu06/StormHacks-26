"""
speak_jbl.py — text-to-speech and jingle playback through the JBL speaker.

On the Pi:  uses espeak-ng (TTS) + paplay (PulseAudio output).
Mock mode:  prints the text and plays audio via Mac's 'say' command if available.

Two main helpers used by the rest of the code:
    speak_text(message)  — speak a sentence
    play_jingle()        — play the short confirmation chime

Original Pi implementation by the Pi teammate; mock mode added here.
"""
from __future__ import annotations

import io
import math
import os
import re
import shutil
import struct
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

MOCK_HARDWARE = os.getenv("MOCK_HARDWARE", "false").lower() == "true"
JBL_SPEAKER_NAME = os.getenv("JBL_SPEAKER_NAME")

SAMPLE_RATE = 44_100


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def speak_text(message: str) -> None:
    """Speak a sentence. In mock mode prints it and tries Mac's 'say' command."""
    print(f"[SPEAK] {message}")
    if MOCK_HARDWARE:
        say = shutil.which("say")
        if say:
            subprocess.run([say, message], check=False)
        return
    speak(JBL_SPEAKER_NAME, message)


def play_jingle() -> None:
    """Play the short confirmation chime. In mock mode prints a placeholder."""
    if MOCK_HARDWARE:
        print("[JINGLE] ♪")
        return
    _play_jingle_audio(JBL_SPEAKER_NAME)


# ---------------------------------------------------------------------------
# JBL speaker implementation (Pi only)
# ---------------------------------------------------------------------------

def speak(device: str | None, message: str) -> None:
    paplay = shutil.which("paplay")
    if paplay is None:
        raise RuntimeError(
            "paplay is missing; install it with: sudo apt install pulseaudio-utils"
        )
    sink_name, sink_description = select_sink(device)
    audio, _ = _create_speech_audio(message)
    with tempfile.NamedTemporaryFile(prefix="carebot-speech-", suffix=".wav") as audio_file:
        audio_file.write(audio)
        audio_file.flush()
        _run([paplay, "--device", sink_name, audio_file.name])
    print(f"Played speech through {sink_description}.")


def _play_jingle_audio(device: str | None) -> None:
    paplay = shutil.which("paplay")
    if paplay is None:
        raise RuntimeError("paplay is missing; install it with: sudo apt install pulseaudio-utils")
    sink_name, sink_description = select_sink(device)
    with tempfile.NamedTemporaryFile(prefix="carebot-jingle-", suffix=".wav") as audio_file:
        audio_file.write(_jingle_audio())
        audio_file.flush()
        subprocess.run([paplay, "--device", sink_name, audio_file.name], check=True)
    print(f"Played jingle through {sink_description}.")


def _create_speech_audio(message: str) -> tuple[bytes, float]:
    espeak = shutil.which("espeak-ng")
    if espeak is None:
        raise RuntimeError("espeak-ng is missing; install it with: sudo apt install espeak-ng")
    with tempfile.TemporaryDirectory(prefix="carebot-speech-") as tmp:
        audio_path = Path(tmp) / "speech.wav"
        result = subprocess.run(
            [espeak, "-w", str(audio_path), message],
            capture_output=True, text=True, check=False,
        )
        if result.returncode != 0:
            detail = result.stderr.strip() or "speech generation failed"
            raise RuntimeError(detail)
        audio = audio_path.read_bytes()
    with wave.open(io.BytesIO(audio), "rb") as wav_file:
        duration = wav_file.getnframes() / wav_file.getframerate()
    return audio, duration


def _jingle_audio() -> bytes:
    """Three-note ascending chime (C5, E5, G5)."""
    notes = ((523.25, 0.16), (659.25, 0.16), (783.99, 0.24))
    frames: list[int] = []
    for frequency, duration in notes:
        total = int(SAMPLE_RATE * duration)
        for i in range(total):
            progress = i / total
            envelope = min(1.0, progress * 25, (1.0 - progress) * 25)
            value = int(0.28 * envelope * 32767 * math.sin(2 * math.pi * frequency * i / SAMPLE_RATE))
            frames.append(value)
        frames.extend([0] * int(SAMPLE_RATE * 0.03))
    output = io.BytesIO()
    with wave.open(output, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(SAMPLE_RATE)
        wav_file.writeframes(b"".join(struct.pack("<h", f) for f in frames))
    return output.getvalue()


def select_sink(requested: str | None) -> tuple[str, str]:
    sinks = _list_audio_sinks()
    if not sinks:
        raise RuntimeError("No audio output devices found")
    if requested:
        requested_lower = requested.casefold()
        matches = [s for s in sinks if requested_lower in s[0].casefold() or requested_lower in s[1].casefold()]
        if len(matches) == 1:
            return matches[0]
        if len(matches) > 1:
            choices = ", ".join(name for name, _ in matches)
            raise RuntimeError(f"'{requested}' matches multiple audio devices: {choices}")
        available = "; ".join(f"{name} ({desc})" for name, desc in sinks)
        raise RuntimeError(f"Audio device '{requested}' not found. Available: {available}")
    bluetooth = [s for s in sinks if s[0].startswith("bluez_output.") or "JBL" in s[1]]
    if len(bluetooth) == 1:
        return bluetooth[0]
    if len(bluetooth) > 1:
        choices = ", ".join(name for name, _ in bluetooth)
        raise RuntimeError(f"Multiple Bluetooth devices found; set JBL_SPEAKER_NAME in .env: {choices}")
    default = _default_sink()
    for s in sinks:
        if s[0] == default:
            raise RuntimeError(
                f"No JBL Bluetooth device found. Current output: '{s[1]}'. "
                "Pair the JBL and select it as the Pi's audio output."
            )
    raise RuntimeError("Default audio output is not available")


def _list_audio_sinks() -> list[tuple[str, str]]:
    pactl = shutil.which("pactl")
    if pactl is None:
        raise RuntimeError("pactl is missing; install it with: sudo apt install pulseaudio-utils")
    output = _run([pactl, "list", "sinks"])
    sinks: list[tuple[str, str]] = []
    name = description = None
    for line in output.splitlines():
        m = re.match(r"\s*Name:\s*(.+)$", line)
        d = re.match(r"\s*Description:\s*(.+)$", line)
        if m:
            if name is not None:
                sinks.append((name, description or name))
            name, description = m.group(1).strip(), None
        elif d and name is not None:
            description = d.group(1).strip()
    if name is not None:
        sinks.append((name, description or name))
    return sinks


def _default_sink() -> str:
    pactl = shutil.which("pactl")
    if pactl is None:
        raise RuntimeError("pactl is missing; install it with: sudo apt install pulseaudio-utils")
    return _run([pactl, "get-default-sink"]).strip()


def _run(command: list[str]) -> str:
    result = subprocess.run(command, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        detail = result.stderr.strip() or result.stdout.strip() or "command failed"
        raise RuntimeError(detail)
    return result.stdout
