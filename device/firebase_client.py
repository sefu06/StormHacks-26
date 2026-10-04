"""Firestore adapter used by the partner's webcam scan flow."""

from __future__ import annotations

import os
from datetime import datetime, timedelta
from pathlib import Path

import pytz
from dotenv import load_dotenv

import firebase_admin
from firebase_admin import credentials, firestore as fs


load_dotenv(Path(__file__).parent / ".env")

SENIOR_ID = os.getenv("SENIOR_ID", "")
TIMEZONE = os.getenv("TIMEZONE", "America/Vancouver")
DEVICE_DIR = Path(__file__).resolve().parent
SERVICE_ACCOUNT = Path(os.getenv("FIREBASE_CREDENTIALS_PATH", "serviceAccount.json"))
if not SERVICE_ACCOUNT.is_absolute():
    SERVICE_ACCOUNT = DEVICE_DIR / SERVICE_ACCOUNT

try:
    firebase_admin.get_app()
except ValueError:
    if not SERVICE_ACCOUNT.exists():
        raise FileNotFoundError(
            f"Firebase service account file not found: {SERVICE_ACCOUNT}. "
            "Download it from Firebase and keep it out of git."
        )
    firebase_admin.initialize_app(credentials.Certificate(str(SERVICE_ACCOUNT)))

db = fs.client()


def get_senior(senior_id: str) -> dict:
    document = db.collection("seniors").document(senior_id).get()
    if not document.exists:
        raise ValueError(f"Senior '{senior_id}' not found in Firestore. Check SENIOR_ID in .env.")
    return {"id": document.id, **document.to_dict()}


def get_medications(senior_id: str) -> list[dict]:
    documents = (
        db.collection("seniors").document(senior_id)
        .collection("medication")
        .where("active", "==", True)
        .stream()
    )
    return [{"id": document.id, **document.to_dict()} for document in documents]


def get_taken_today(senior_id: str, medication_id: str) -> list[dict]:
    timezone = pytz.timezone(TIMEZONE)
    now = datetime.now(timezone)
    today_start = timezone.localize(datetime(now.year, now.month, now.day))
    tomorrow_start = today_start + timedelta(days=1)
    documents = (
        db.collection("seniors").document(senior_id)
        .collection("doseLogs")
        .where("medicationId", "==", medication_id)
        .where("status", "==", "taken")
        .stream()
    )

    results = []
    for document in documents:
        data = document.to_dict()
        scheduled = data.get("scheduledFor")
        if scheduled and today_start <= scheduled < tomorrow_start:
            results.append({"id": document.id, **data})
    return results


def log_event(
    senior_id: str,
    event_type: str,
    message: str,
    *,
    schedule_id: str | None = None,
    scheduled_for: object | None = None,
) -> None:
    db.collection("seniors").document(senior_id).collection("events").add(
        {"type": event_type, "message": message, "createdAt": fs.SERVER_TIMESTAMP}
    )
    print(f"Event logged: [{event_type}] {message}")
