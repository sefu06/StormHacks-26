"""
firebase_client.py — reads and writes to Firestore.

Uses serviceAccount.json in the same folder as this file, so the path
works no matter which directory you run the script from.
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta
from pathlib import Path

import pytz
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

import firebase_admin
from firebase_admin import credentials, firestore as fs

SENIOR_ID = os.getenv("SENIOR_ID", "")
TIMEZONE = os.getenv("TIMEZONE", "America/Vancouver")

_SERVICE_ACCOUNT = Path(__file__).parent / "serviceAccount.json"

# Initialize once — guard against being imported multiple times
try:
    firebase_admin.get_app()
except ValueError:
    cred = credentials.Certificate(str(_SERVICE_ACCOUNT))
    firebase_admin.initialize_app(cred)

db = fs.client()


def get_senior(senior_id: str) -> dict:
    """Load the senior's profile document."""
    doc = db.collection("seniors").document(senior_id).get()
    if not doc.exists:
        raise ValueError(f"Senior '{senior_id}' not found in Firestore. Check SENIOR_ID in .env.")
    return {"id": doc.id, **doc.to_dict()}


def get_medications(senior_id: str) -> list[dict]:
    """Return all active medications for this senior, using doc ID as 'id'."""
    docs = (
        db.collection("seniors").document(senior_id)
        .collection("medication")
        .where("active", "==", True)
        .stream()
    )
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]


def get_taken_today(senior_id: str, medication_id: str) -> list[dict]:
    """
    Return doseLogs for this medication that are marked taken today.
    Filters by date in Python to avoid needing a Firestore composite index.
    """
    tz = pytz.timezone(TIMEZONE)
    now = datetime.now(tz)
    today_start = tz.localize(datetime(now.year, now.month, now.day, 0, 0, 0))
    tomorrow_start = today_start + timedelta(days=1)

    docs = (
        db.collection("seniors").document(senior_id)
        .collection("doseLogs")
        .where("medicationId", "==", medication_id)
        .where("status", "==", "taken")
        .stream()
    )

    results = []
    for doc in docs:
        data = doc.to_dict()
        scheduled = data.get("scheduledFor")
        if scheduled and today_start <= scheduled < tomorrow_start:
            results.append({"id": doc.id, **data})
    return results


def log_event(senior_id: str, event_type: str, message: str) -> None:
    """Write an event to seniors/{seniorId}/events."""
    db.collection("seniors").document(senior_id).collection("events").add({
        "type": event_type,
        "message": message,
        "createdAt": fs.SERVER_TIMESTAMP,
    })
    print(f"Event logged: [{event_type}] {message}")
