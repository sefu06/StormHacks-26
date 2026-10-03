"""
test_scan.py — test the full scan flow end-to-end with Firestore.

Hold a pill bottle up to the webcam, press Enter, and the script will:
  1. Load your medications from Firestore
  2. Take a photo
  3. Ask Gemini to identify the bottle
  4. Check if it's due now (and whether you've already taken it today)
  5. Print the sentence the device would speak
  6. Write an event to Firestore so you can verify it in the console

Run from the device/ folder:
    cd device
    python test_scan.py
"""

from __future__ import annotations

from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from scan import run_scan

if __name__ == "__main__":
    print("CareBot — Bottle Scan Test")
    print("Hold a pill bottle up to the webcam, then press Enter.")
    input()
    sentence = run_scan()
    print(f'\nDevice would say: "{sentence}"')
