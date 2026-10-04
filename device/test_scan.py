"""Run the webcam scan once and print the sentence the device should speak."""

from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from scan import run_scan


if __name__ == "__main__":
    print("carebot — Bottle Scan Test")
    print("Hold a pill bottle up to the webcam, then press Enter.")
    input()
    sentence = run_scan()
    print(f'\nDevice would say: "{sentence}"')
