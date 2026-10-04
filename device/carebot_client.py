"""Client for the Carebot API used by the webcam scan flow."""

from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import pytz
from dotenv import load_dotenv


load_dotenv()
load_dotenv(Path(__file__).parent / ".env")

DEFAULT_TIMEZONE = "America/Vancouver"


def _api_base_url() -> str:
    value = os.getenv("CAREBOT_API_BASE_URL", "").strip()
    if not value:
        raise RuntimeError("set CAREBOT_API_BASE_URL in device/.env")
    return value.rstrip("/")


def _request_json(
    method: str,
    path: str,
    payload: dict[str, object] | None = None,
) -> object:
    body = None
    headers = {"Accept": "application/json"}
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    request = Request(
        f"{_api_base_url()}{path}",
        data=body,
        headers=headers,
        method=method,
    )
    try:
        with urlopen(request, timeout=15) as response:
            response_body = response.read()
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")[:500]
        raise RuntimeError(f"Carebot API request failed ({error.code}): {detail}") from error
    except URLError as error:
        raise RuntimeError(f"could not reach Carebot API: {error.reason}") from error
    try:
        return json.loads(response_body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise RuntimeError("Carebot API returned invalid JSON") from error


def get_senior(patient_id: str) -> dict:
    patients = _request_json("GET", "/api/patients")
    if not isinstance(patients, list):
        raise RuntimeError("Carebot API returned an invalid patient list")
    for patient in patients:
        if isinstance(patient, dict) and str(patient.get("id")) == patient_id:
            return {
                "id": patient_id,
                "name": patient.get("display_name", ""),
                "displayName": patient.get("display_name", ""),
                "timezone": patient.get("timezone") or os.getenv("TIMEZONE", DEFAULT_TIMEZONE),
            }
    raise RuntimeError(f"Patient '{patient_id}' was not found in the Carebot API")


def _patient_timezone(patient_id: str) -> str:
    timezone = get_senior(patient_id).get("timezone") or DEFAULT_TIMEZONE
    try:
        pytz.timezone(timezone)
    except pytz.UnknownTimeZoneError:
        return os.getenv("TIMEZONE", DEFAULT_TIMEZONE)
    return timezone


def get_medications(patient_id: str) -> list[dict]:
    query = urlencode({"patient_id": patient_id})
    schedules = _request_json("GET", f"/api/device/schedules?{query}")
    if not isinstance(schedules, list):
        raise RuntimeError("Carebot API returned an invalid medication schedule list")
    timezone = _patient_timezone(patient_id)
    medications = []
    for schedule in schedules:
        if not isinstance(schedule, dict):
            continue
        reminder_time = str(schedule.get("time", ""))
        if not reminder_time:
            continue
        medications.append(
            {
                "id": str(schedule.get("id", "")),
                "name": str(schedule.get("name", "")),
                "dose": str(schedule.get("dose", "")),
                "times": [reminder_time],
                "days": schedule.get("days", []),
                "instructions": str(schedule.get("notes", "")),
                "timezone": timezone,
            }
        )
    return [medication for medication in medications if medication["id"] and medication["name"]]


def _parse_datetime(value: object, timezone_name: str) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    timezone = pytz.timezone(timezone_name)
    if parsed.tzinfo is None:
        return timezone.localize(parsed)
    return parsed


def get_taken_today(patient_id: str, medication_id: str) -> list[dict]:
    query = urlencode(
        {"patient_id": patient_id, "schedule_id": medication_id, "status": "taken"}
    )
    events = _request_json("GET", f"/api/medication-events?{query}")
    if not isinstance(events, list):
        return []

    timezone_name = _patient_timezone(patient_id)
    timezone = pytz.timezone(timezone_name)
    now = datetime.now(timezone)
    results = []
    for event in events:
        if not isinstance(event, dict):
            continue
        scheduled = _parse_datetime(event.get("scheduled_for"), timezone_name)
        recorded = _parse_datetime(event.get("recorded_at"), timezone_name)
        if scheduled and scheduled.astimezone(timezone).date() == now.date():
            results.append(
                {
                    **event,
                    "confirmedAt": recorded or scheduled,
                }
            )
    return results


def log_event(
    patient_id: str,
    event_type: str,
    message: str,
    *,
    schedule_id: str | None = None,
    scheduled_for: datetime | None = None,
) -> None:
    if not schedule_id:
        print(f"Scan event (not persisted without a matched schedule): [{event_type}] {message}")
        return
    timezone_name = _patient_timezone(patient_id)
    timezone = pytz.timezone(timezone_name)
    timestamp = scheduled_for or datetime.now(timezone)
    if timestamp.tzinfo is None:
        timestamp = timezone.localize(timestamp)
    payload = {
        "patient_id": patient_id,
        "schedule_id": schedule_id,
        "scheduled_for": timestamp.isoformat(),
        "status": "reminded",
        "source": "device",
        "notes": f"{event_type}: {message}",
    }
    _request_json("POST", "/api/medication-events", payload)
    print(f"Event logged: [{event_type}] {message}")
