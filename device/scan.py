"""Webcam medication scan flow backed by the Carebot API or legacy Firestore."""

from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path

import pytz
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from camera import capture_frame
from vision import check_due_now, identify_medication


SCAN_DATA_SOURCE = os.getenv("SCAN_DATA_SOURCE", "carebot").strip().lower()
if SCAN_DATA_SOURCE in {"firebase", "firestore"}:
    from firebase_client import get_medications, get_senior, get_taken_today, log_event

    PROFILE_ID_ENV = "SENIOR_ID"
else:
    from carebot_client import get_medications, get_senior, get_taken_today, log_event

    PROFILE_ID_ENV = "CAREBOT_PATIENT_ID"

PROFILE_ID = os.getenv(PROFILE_ID_ENV, "").strip()


def _scheduled_datetime(medication: dict, scheduled_time: str | None) -> datetime | None:
    if not scheduled_time:
        return None
    timezone = pytz.timezone(medication.get("timezone") or os.getenv("TIMEZONE", "America/Vancouver"))
    hour, minute = (int(part) for part in scheduled_time.split(":", maxsplit=1))
    now = datetime.now(timezone)
    return timezone.localize(datetime(now.year, now.month, now.day, hour, minute))


def _record_event(
    event_type: str,
    message: str,
    medication: dict | None = None,
    scheduled_time: str | None = None,
) -> None:
    log_event(
        PROFILE_ID,
        event_type,
        message,
        schedule_id=medication.get("id") if medication else None,
        scheduled_for=_scheduled_datetime(medication, scheduled_time) if medication else None,
    )


def _time_text(value: object) -> str:
    if isinstance(value, datetime):
        timezone = pytz.timezone(os.getenv("TIMEZONE", "America/Vancouver"))
        return value.astimezone(timezone).strftime("%I:%M %p").lstrip("0")
    return "earlier today"


def run_scan() -> str:
    """Capture, identify, schedule-check, log, and return speech text."""
    print("Starting bottle scan...")
    if not PROFILE_ID:
        raise ValueError(f"Set {PROFILE_ID_ENV} in device/.env")
    senior = get_senior(PROFILE_ID)
    medications = get_medications(PROFILE_ID)
    preferred_name = (
        senior.get("preferredName")
        or senior.get("displayName")
        or senior.get("display_name")
        or senior.get("name", "")
    )
    caregiver_name = senior.get("caregiverName", "your caregiver")
    print(f"Loaded {len(medications)} active medication(s) for {preferred_name}.")

    if not medications:
        return "I couldn't find any medications on your schedule."

    image_path = capture_frame()
    result = identify_medication(image_path, medications)
    confidence = result.get("confidence")
    medication_id = result.get("medication_id")
    label_text = result.get("name_on_label", "")
    print(f"Vision: label='{label_text}', matched_id={medication_id}, confidence={confidence}")

    if confidence != "high" or not medication_id:
        _record_event(
            "scan_uncertain",
            f"Scan uncertain for {preferred_name}: label read as '{label_text or 'unreadable'}'.",
        )
        return f"I'm not sure about that one. I'll let {caregiver_name} know."

    matched = next((medication for medication in medications if medication["id"] == medication_id), None)
    if not matched:
        _record_event("scan_uncertain", f"Scan returned unknown medication ID '{medication_id}'.")
        return f"I'm not sure about that one. I'll let {caregiver_name} know."

    medication_name = matched["name"]
    instructions = matched.get("instructions", "")
    taken_today = get_taken_today(PROFILE_ID, medication_id)
    if taken_today:
        confirmed_at = taken_today[0].get("confirmedAt")
        time_text = _time_text(confirmed_at)
        _record_event(
            "scan_match",
            f"Double-dose prevented: {preferred_name} already took {medication_name} at {time_text}.",
            matched,
        )
        return f"You already took your {medication_name} at {time_text}."

    due, due_at = check_due_now(matched)
    if due:
        _record_event(
            "scan_match",
            f"Scan match: {medication_name} ('{label_text}') for {preferred_name}, due at {due_at}.",
            matched,
            due_at,
        )
        sentence = f"That's your {medication_name}. You're due for it now."
        if instructions:
            sentence += f" {instructions}."
        return sentence

    times_text = " and ".join(matched.get("times", []))
    _record_event(
        "scan_wrong_time",
        f"Scan wrong time: {medication_name} scanned by {preferred_name} but scheduled for {times_text}.",
        matched,
    )
    return f"That one is scheduled for {times_text}, not right now."
