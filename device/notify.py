"""
notify.py — sends missed-dose notifications to the caregiver via ntfy.sh.

ntfy.sh is a free, no-signup service. The caregiver installs the ntfy app
on their phone and subscribes to the topic set in NTFY_TOPIC in .env.

Called by the scheduler (scheduler.py) when a dose is marked missed.
"""

from __future__ import annotations

import os
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path
from typing import List

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

NTFY_TOPIC = os.getenv("NTFY_TOPIC", "")
NTFY_BASE_URL = "https://ntfy.sh"


def notify_missed_dose(senior_name: str, medication_names: List[str], scheduled_time: str) -> None:
    """
    Notify the caregiver that a dose was missed.

    senior_name:      the senior's preferred name, e.g. "Em"
    medication_names: list of medication names, e.g. ["Lisinopril"] or ["Lisinopril", "Metformin"]
    scheduled_time:   24h time string from Firestore, e.g. "08:00"

    Sends: "Em hasn't taken her Lisinopril (8:00 AM)."
    """
    if not NTFY_TOPIC:
        print("[notify] NTFY_TOPIC not set in .env — skipping notification.")
        return

    # Format time: "08:00" -> "8:00 AM"
    hour, minute = map(int, scheduled_time.split(":"))
    time_str = datetime(2000, 1, 1, hour, minute).strftime("%I:%M %p").lstrip("0")

    # Format medication list: ["Lisinopril"] -> "Lisinopril"
    #                         ["Lisinopril", "Metformin"] -> "Lisinopril and Metformin"
    if len(medication_names) == 1:
        meds_str = medication_names[0]
    else:
        meds_str = ", ".join(medication_names[:-1]) + " and " + medication_names[-1]

    message = f"{senior_name} hasn't taken her {meds_str} ({time_str})."
    title = "Missed dose"

    print(f"[notify] Sending to ntfy.sh/{NTFY_TOPIC} — {title}: {message}")

    try:
        req = urllib.request.Request(
            f"{NTFY_BASE_URL}/{NTFY_TOPIC}",
            data=message.encode("utf-8"),
            headers={
                "Title": title,
                "Priority": "high",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            if resp.status == 200:
                print("[notify] Sent.")
            else:
                print(f"[notify] Unexpected status: {resp.status}")
    except urllib.error.URLError as e:
        print(f"[notify] Failed to send notification: {e}")
