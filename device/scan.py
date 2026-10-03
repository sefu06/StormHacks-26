"""
scan.py — the full bottle-scan flow called on a long press.

run_scan() is the one function the Pi person calls from main.py
when the touch sensor is held for ~2 seconds. It:
  1. Loads medications from Firestore
  2. Takes a photo
  3. Sends it to Gemini
  4. Checks the schedule (due now? already taken?)
  5. Logs an event to Firestore
  6. Returns the sentence to speak
"""

from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path

import pytz
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

SENIOR_ID = os.getenv("SENIOR_ID", "")
TIMEZONE = os.getenv("TIMEZONE", "America/Vancouver")

from camera import capture_frame
from vision import identify_medication, check_due_now
from firebase_client import get_senior, get_medications, get_taken_today, log_event


def run_scan() -> str:
    """
    Run the full bottle-scan flow and return the sentence to speak.
    Logs one event to Firestore regardless of outcome.
    """
    print("Starting bottle scan...")

    # Load senior profile and active medications from Firestore
    senior = get_senior(SENIOR_ID)
    medications = get_medications(SENIOR_ID)

    preferred_name = senior.get("preferredName") or senior.get("name", "")
    caregiver_name = senior.get("caregiverName", "your caregiver")

    print(f"Loaded {len(medications)} active medication(s) for {preferred_name}.")

    if not medications:
        return "I couldn't find any medications on your schedule."

    # Take photo
    image_path = capture_frame()

    # Identify the bottle label
    result = identify_medication(image_path, medications)
    confidence = result.get("confidence")
    medication_id = result.get("medication_id")
    label_text = result.get("name_on_label", "")

    print(f"Vision: label='{label_text}', matched_id={medication_id}, confidence={confidence}")

    # ── Uncertain or no match ────────────────────────────────────────────────
    if confidence != "high" or not medication_id:
        message = f"Scan uncertain for {preferred_name}: label read as '{label_text or 'unreadable'}'."
        log_event(SENIOR_ID, "scan_uncertain", message)
        return f"I'm not sure about that one. I'll let {caregiver_name} know."

    matched = next((m for m in medications if m["id"] == medication_id), None)
    if not matched:
        message = f"Scan returned unknown medication ID '{medication_id}'."
        log_event(SENIOR_ID, "scan_uncertain", message)
        return f"I'm not sure about that one. I'll let {caregiver_name} know."

    med_name = matched["name"]
    instructions = matched.get("instructions", "")

    # ── Double-dose check ────────────────────────────────────────────────────
    taken_today = get_taken_today(SENIOR_ID, medication_id)
    if taken_today:
        confirmed_at = taken_today[0].get("confirmedAt")
        if confirmed_at:
            tz = pytz.timezone(TIMEZONE)
            time_str = confirmed_at.astimezone(tz).strftime("%I:%M %p").lstrip("0")
        else:
            time_str = "earlier today"
        message = f"Double-dose prevented: {preferred_name} already took {med_name} at {time_str}."
        log_event(SENIOR_ID, "scan_match", message)
        return f"You already took your {med_name} at {time_str}."

    # ── Schedule check ───────────────────────────────────────────────────────
    due, due_at = check_due_now(matched)

    if due:
        message = f"Scan match: {med_name} ('{label_text}') for {preferred_name}, due at {due_at}."
        log_event(SENIOR_ID, "scan_match", message)
        sentence = f"That's your {med_name}. You're due for it now."
        if instructions:
            sentence += f" {instructions}."
        return sentence
    else:
        times_str = " and ".join(matched.get("times", []))
        message = f"Scan wrong time: {med_name} scanned by {preferred_name} but scheduled for {times_str}."
        log_event(SENIOR_ID, "scan_wrong_time", message)
        return f"That one is scheduled for {times_str}, not right now."
