#!/usr/bin/env python3

from __future__ import annotations

import argparse
import io
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import wave


def create_speech_audio(message: str) -> tuple[bytes, float]:
    espeak = shutil.which("espeak-ng")
    if espeak is None:
        raise RuntimeError("espeak-ng is missing; install it with: sudo apt install espeak-ng")

    with tempfile.TemporaryDirectory(prefix="medication-assistant-") as temp_dir:
        audio_path = Path(temp_dir) / "speech.wav"
        result = subprocess.run(
            [espeak, "-w", str(audio_path), message],
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            detail = result.stderr.strip() or "speech generation failed"
            raise RuntimeError(detail)
        audio = audio_path.read_bytes()

    with wave.open(io.BytesIO(audio), "rb") as wav_file:
        duration = wav_file.getnframes() / wav_file.getframerate()

    return audio, duration


def run_command(command: list[str]) -> str:
    result = subprocess.run(command, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        detail = result.stderr.strip() or result.stdout.strip() or "command failed"
        raise RuntimeError(detail)
    return result.stdout


def list_audio_sinks() -> list[tuple[str, str]]:
    pactl = shutil.which("pactl")
    if pactl is None:
        raise RuntimeError(
            "pactl is missing; install it with: sudo apt install pulseaudio-utils"
        )

    output = run_command([pactl, "list", "sinks"])
    sinks: list[tuple[str, str]] = []
    name = None
    description = None

    for line in output.splitlines():
        name_match = re.match(r"\s*Name:\s*(.+)$", line)
        description_match = re.match(r"\s*Description:\s*(.+)$", line)
        if name_match:
            if name is not None:
                sinks.append((name, description or name))
            name = name_match.group(1).strip()
            description = None
        elif description_match and name is not None:
            description = description_match.group(1).strip()

    if name is not None:
        sinks.append((name, description or name))
    return sinks


def default_sink() -> str:
    pactl = shutil.which("pactl")
    if pactl is None:
        raise RuntimeError(
            "pactl is missing; install it with: sudo apt install pulseaudio-utils"
        )
    return run_command([pactl, "get-default-sink"]).strip()


def select_sink(requested: str | None) -> tuple[str, str]:
    sinks = list_audio_sinks()
    if not sinks:
        raise RuntimeError("No audio output devices found")

    if requested:
        requested_lower = requested.casefold()
        matches = [
            sink
            for sink in sinks
            if requested_lower in sink[0].casefold() or requested_lower in sink[1].casefold()
        ]
        if len(matches) == 1:
            return matches[0]
        if len(matches) > 1:
            choices = ", ".join(name for name, _ in matches)
            raise RuntimeError(f"'{requested}' matches multiple audio devices: {choices}")

        available = "; ".join(f"{name} ({description})" for name, description in sinks)
        raise RuntimeError(f"Audio device '{requested}' was not found. Available: {available}")

    bluetooth_sinks = [
        sink for sink in sinks if sink[0].startswith("bluez_output.") or "JBL" in sink[1]
    ]
    if len(bluetooth_sinks) == 1:
        return bluetooth_sinks[0]
    if len(bluetooth_sinks) > 1:
        choices = ", ".join(name for name, _ in bluetooth_sinks)
        raise RuntimeError(f"Multiple Bluetooth audio devices found; use --device: {choices}")

    selected_default = default_sink()
    for sink in sinks:
        if sink[0] == selected_default:
            raise RuntimeError(
                f"No JBL Bluetooth audio device was found. The current output is '{sink[1]}'. "
                "Pair the JBL and select it as the Pi's audio output."
            )
    raise RuntimeError("The current default audio output is not available")


def print_devices() -> None:
    sinks = list_audio_sinks()
    current = default_sink()
    if not sinks:
        print("No audio output devices found.")
        return
    for name, description in sinks:
        marker = " (default)" if name == current else ""
        print(f"{description}: {name}{marker}")


def speak(device: str | None, message: str) -> None:
    paplay = shutil.which("paplay")
    if paplay is None:
        raise RuntimeError(
            "paplay is missing; install it with: sudo apt install pulseaudio-utils"
        )

    sink_name, sink_description = select_sink(device)
    audio, _ = create_speech_audio(message)
    with tempfile.NamedTemporaryFile(prefix="medication-assistant-", suffix=".wav") as audio_file:
        audio_file.write(audio)
        audio_file.flush()
        run_command([paplay, "--device", sink_name, audio_file.name])
    print(f"Played speech through {sink_description}.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Speak a phrase through a JBL Bluetooth speaker.")
    parser.add_argument("message", nargs="?", help="The phrase for the speaker to play")
    parser.add_argument(
        "--device",
        default=os.environ.get("JBL_SPEAKER_NAME"),
        help="A matching part of the JBL audio device name or description",
    )
    parser.add_argument(
        "--list-devices",
        action="store_true",
        help="List audio outputs visible to the Pi",
    )
    args = parser.parse_args()

    try:
        if args.list_devices:
            print_devices()
            return 0
        if not args.message or not args.message.strip():
            parser.error("provide a short phrase to speak")
        if len(args.message) > 250:
            parser.error("keep the test phrase under 250 characters")
        speak(args.device, args.message.strip())
        return 0
    except (OSError, RuntimeError, subprocess.SubprocessError) as error:
        print(f"Could not play speech: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
