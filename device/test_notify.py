"""
test_notify.py — sends a sample missed-dose notification to verify ntfy.sh.

Run from the device/ folder:
    python test_notify.py

You should get a notification on your phone within a few seconds.
If you don't: check that NTFY_TOPIC is set in device/.env and that
you have the ntfy app installed and subscribed to that topic.
"""

from __future__ import annotations

from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from notify import notify_missed_dose, NTFY_TOPIC

if __name__ == "__main__":
    print(f"Sending test missed-dose notification to ntfy.sh/{NTFY_TOPIC} ...")
    notify_missed_dose(
        senior_name="Em",
        medication_names=["Lisinopril", "Metformin"],
        scheduled_time="08:00",
    )
