#!/usr/bin/env python3

"""Confirm the latest reminder from a GPIO touch sensor."""

from __future__ import annotations

import argparse
import io
import json
import math
import os
import shutil
import struct
import subprocess
import sys
import tempfile
import wave
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

try:
    from gpiozero import Button
except ImportError as error:
    raise SystemExit(
        "gpiozero is missing. Install it with: sudo apt install python3-gpiozero"
    ) from error

from speak_jbl import select_sink


SAMPLE_RATE = 44_100


def post_touch(api_url: str, patient_id: str, sensor_id: str, window_minutes: int) -> dict[str, object]:
    payload = json.dumps(
        {
            "patient_id": patient_id,
            "sensor_id": sensor_id,
            "window_minutes": window_minutes,
        }
    ).encode("utf-8")
    request = Request(
        f"{api_url.rstrip('/')}/api/device/touch",
        data=payload,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=15) as response:
            result = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")[:500]
        raise RuntimeError(f"touch API returned HTTP {error.code}: {detail}") from error
    except URLError as error:
        raise RuntimeError(f"could not reach touch API: {error.reason}") from error
    if not isinstance(result, dict):
        raise RuntimeError("touch API returned an invalid response")
    return result


def jingle_audio() -> bytes:
    notes = ((523.25, 0.16), (659.25, 0.16), (783.99, 0.24))
    frames: list[int] = []
    for frequency, duration in notes:
        total = int(SAMPLE_RATE * duration)
        for index in range(total):
            progress = index / total
            envelope = min(1.0, progress * 25, (1.0 - progress) * 25)
            value = int(0.28 * envelope * 32767 * math.sin(2 * math.pi * frequency * index / SAMPLE_RATE))
            frames.append(value)
        frames.extend([0] * int(SAMPLE_RATE * 0.03))

    output = io.BytesIO()
    with wave.open(output, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(SAMPLE_RATE)
        wav_file.writeframes(b"".join(struct.pack("<h", frame) for frame in frames))
    return output.getvalue()


def play_jingle(device: str | None) -> None:
    paplay = shutil.which("paplay")
    if paplay is None:
        raise RuntimeError("paplay is missing; install it with: sudo apt install pulseaudio-utils")
    sink_name, sink_description = select_sink(device)
    with tempfile.NamedTemporaryFile(prefix="carebot-jingle-", suffix=".wav") as audio_file:
        audio_file.write(jingle_audio())
        audio_file.flush()
        subprocess.run([paplay, "--device", sink_name, audio_file.name], check=True)
    print(f"Played confirmation jingle through {sink_description}.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Confirm medication reminders with a GPIO touch sensor")
    parser.add_argument("--gpio", type=int, default=int(os.environ.get("CAREBOT_TOUCH_GPIO", "16")))
    parser.add_argument("--api", default=os.environ.get("CAREBOT_API_BASE_URL", "http://192.168.2.1:8000"))
    parser.add_argument("--patient-id", default=os.environ.get("CAREBOT_PATIENT_ID"))
    parser.add_argument("--sensor-id", default=os.environ.get("CAREBOT_TOUCH_SENSOR_ID", "touch-sensor"))
    parser.add_argument(
        "--window-minutes",
        type=int,
        default=int(os.environ.get("CAREBOT_CONFIRMATION_WINDOW_MINUTES", "60")),
    )
    parser.add_argument("--device", default=os.environ.get("JBL_SPEAKER_NAME"))
    args = parser.parse_args()
    if not args.patient_id:
        parser.error("provide --patient-id or set CAREBOT_PATIENT_ID")

    sensor = Button(args.gpio, pull_up=False, bounce_time=0.3)
    print(f"Touch monitor listening on GPIO {args.gpio}; press Ctrl-C to stop.")
    try:
        while True:
            sensor.wait_for_press()
            try:
                result = post_touch(args.api, args.patient_id, args.sensor_id, args.window_minutes)
                if result.get("status") == "taken":
                    print(f"Touch confirmed: {result.get('name', 'medication')}.")
                    play_jingle(args.device)
                else:
                    print(str(result.get("message", "No reminder is waiting.")))
            except (OSError, RuntimeError, subprocess.SubprocessError) as error:
                print(f"Touch handling failed: {error}", file=sys.stderr)
            sensor.wait_for_release()
    except KeyboardInterrupt:
        print("\nTouch monitor stopped.")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
