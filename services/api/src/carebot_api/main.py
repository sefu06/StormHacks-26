from __future__ import annotations

from datetime import datetime, time
import os
from typing import Any, Literal
from uuid import UUID

import psycopg
from psycopg.rows import dict_row
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


DAY_NAMES = ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
DAY_NUMBERS = {day: index for index, day in enumerate(DAY_NAMES, start=1)}
DEFAULT_INSTRUCTIONS = "Follow the prescribed instructions"


class PatientCreate(BaseModel):
    display_name: str = Field(min_length=1, max_length=120)
    timezone: str = Field(default="UTC", min_length=1, max_length=80)


class MedicationScheduleCreate(BaseModel):
    patient_id: UUID
    name: str = Field(min_length=1, max_length=160)
    dose: str = Field(default="", max_length=120)
    time: str = Field(pattern=r"^\d{2}:\d{2}$")
    days: list[str] = Field(min_length=1, max_length=7)
    notes: str = Field(default="", max_length=500)


class MedicationEventCreate(BaseModel):
    patient_id: UUID
    schedule_id: UUID
    scheduled_for: datetime
    status: Literal["reminded", "taken", "skipped", "delayed", "unanswered", "escalated"]
    source: Literal["device", "caregiver", "api"]
    notes: str = Field(default="", max_length=500)


class TouchConfirmationCreate(BaseModel):
    patient_id: UUID
    sensor_id: str = Field(default="touch-sensor", min_length=1, max_length=80)
    window_minutes: int = Field(default=60, ge=1, le=1440)


def database_url() -> str:
    value = os.environ.get("DATABASE_URL")
    if not value:
        raise HTTPException(status_code=503, detail="DATABASE_URL is not configured")
    return value


def connect() -> psycopg.Connection[Any]:
    try:
        return psycopg.connect(database_url(), row_factory=dict_row)
    except psycopg.Error as error:
        raise HTTPException(status_code=503, detail="Database is unavailable") from error


def parse_days(days: list[str]) -> list[int]:
    normalized = []
    for day in days:
        canonical = day[:1].upper() + day[1:].lower()
        if canonical not in DAY_NUMBERS:
            raise HTTPException(status_code=422, detail=f"Invalid day: {day}")
        if canonical not in normalized:
            normalized.append(canonical)
    return [DAY_NUMBERS[day] for day in DAY_NAMES if day in normalized]


def parse_time(value: str) -> time:
    hours, minutes = (int(part) for part in value.split(":"))
    if hours > 23 or minutes > 59:
        raise HTTPException(status_code=422, detail="time must be a valid 24-hour time")
    return time(hours, minutes)


def serialize_schedule(row: dict[str, Any]) -> dict[str, Any]:
    instructions = row["instructions"] or ""
    if instructions == DEFAULT_INSTRUCTIONS:
        instructions = ""
    return {
        "id": str(row["id"]),
        "patient_id": str(row["patient_id"]),
        "name": row["name"],
        "dose": row["strength"] or row["dose_text"] or "",
        "time": row["time_of_day"].strftime("%H:%M"),
        "days": [DAY_NAMES[number - 1] for number in row["days_of_week"]],
        "notes": instructions,
        "timezone": row.get("schedule_timezone") or "UTC",
    }


def schedule_rows(connection: psycopg.Connection[Any], patient_id: UUID | None) -> list[dict[str, Any]]:
    conditions = ["s.active = true"]
    parameters: list[Any] = []
    if patient_id is not None:
        conditions.append("pr.patient_id = %s")
        parameters.append(patient_id)

    query = f"""
        SELECT
            s.id,
            pr.patient_id,
            m.name,
            m.strength,
            s.dose_text,
            s.time_of_day,
            s.days_of_week,
            pr.instructions,
            s.timezone AS schedule_timezone
        FROM medication_schedules AS s
        JOIN prescriptions AS pr ON pr.id = s.prescription_id
        JOIN medications AS m ON m.id = pr.medication_id
        WHERE {' AND '.join(conditions)}
        ORDER BY s.time_of_day, m.name
    """
    return list(connection.execute(query, parameters).fetchall())


app = FastAPI(title="carebot API", version="0.1.0")
allowed_origins = [
    origin.strip()
    for origin in os.environ.get(
        "CORS_ORIGINS", "http://localhost:8080,http://127.0.0.1:8080"
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
def health() -> dict[str, str]:
    with connect() as connection:
        connection.execute("SELECT 1").fetchone()
    return {"status": "ok"}


@app.post("/api/patients", status_code=status.HTTP_201_CREATED)
def create_patient(payload: PatientCreate) -> dict[str, Any]:
    with connect() as connection:
        row = connection.execute(
            """
            INSERT INTO patients (display_name, timezone)
            VALUES (%s, %s)
            RETURNING id, display_name, timezone
            """,
            (payload.display_name.strip(), payload.timezone),
        ).fetchone()
    return {"id": str(row["id"]), "display_name": row["display_name"], "timezone": row["timezone"]}


@app.get("/api/patients")
def list_patients() -> list[dict[str, Any]]:
    with connect() as connection:
        rows = connection.execute(
            "SELECT id, display_name, timezone FROM patients ORDER BY display_name"
        ).fetchall()
    return [
        {"id": str(row["id"]), "display_name": row["display_name"], "timezone": row["timezone"]}
        for row in rows
    ]


@app.post("/api/medication-schedules", status_code=status.HTTP_201_CREATED)
def create_medication_schedule(payload: MedicationScheduleCreate) -> dict[str, Any]:
    if not payload.name.strip():
        raise HTTPException(status_code=422, detail="Medication name is required")

    days = parse_days(payload.days)
    reminder_time = parse_time(payload.time)
    dose = payload.dose.strip()
    notes = payload.notes.strip() or DEFAULT_INSTRUCTIONS

    with connect() as connection:
        patient = connection.execute(
            "SELECT id FROM patients WHERE id = %s", (payload.patient_id,)
        ).fetchone()
        if patient is None:
            raise HTTPException(status_code=404, detail="Patient not found")

        medication = connection.execute(
            """
            SELECT id
            FROM medications
            WHERE lower(name) = lower(%s)
              AND coalesce(strength, '') = coalesce(%s, '')
            LIMIT 1
            """,
            (payload.name.strip(), dose or None),
        ).fetchone()
        if medication is None:
            medication = connection.execute(
                """
                INSERT INTO medications (name, strength)
                VALUES (%s, %s)
                RETURNING id
                """,
                (payload.name.strip(), dose or None),
            ).fetchone()

        prescription = connection.execute(
            """
            INSERT INTO prescriptions (patient_id, medication_id, instructions)
            VALUES (%s, %s, %s)
            RETURNING id
            """,
            (payload.patient_id, medication["id"], notes),
        ).fetchone()

        row = connection.execute(
            """
            INSERT INTO medication_schedules
                (prescription_id, days_of_week, time_of_day, dose_text, timezone)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
            """,
            (prescription["id"], days, reminder_time, dose or "As prescribed", "UTC"),
        ).fetchone()
        schedule_id = row["id"]

        created = connection.execute(
            """
            SELECT
                s.id,
                pr.patient_id,
                m.name,
                m.strength,
                s.dose_text,
                s.time_of_day,
                s.days_of_week,
                pr.instructions,
                s.timezone AS schedule_timezone
            FROM medication_schedules AS s
            JOIN prescriptions AS pr ON pr.id = s.prescription_id
            JOIN medications AS m ON m.id = pr.medication_id
            WHERE s.id = %s
            """,
            (schedule_id,),
        ).fetchone()
    return serialize_schedule(created)


@app.get("/api/medication-schedules")
def list_medication_schedules(
    patient_id: UUID | None = Query(default=None),
) -> list[dict[str, Any]]:
    with connect() as connection:
        rows = schedule_rows(connection, patient_id)
    return [serialize_schedule(row) for row in rows]


@app.get("/api/device/schedules")
def device_schedules(patient_id: UUID | None = Query(default=None)) -> list[dict[str, Any]]:
    with connect() as connection:
        rows = schedule_rows(connection, patient_id)
    return [serialize_schedule(row) for row in rows]


@app.post("/api/medication-events", status_code=status.HTTP_201_CREATED)
def create_medication_event(payload: MedicationEventCreate) -> dict[str, Any]:
    with connect() as connection:
        schedule = connection.execute(
            """
            SELECT s.id
            FROM medication_schedules AS s
            JOIN prescriptions AS pr ON pr.id = s.prescription_id
            WHERE s.id = %s
              AND pr.patient_id = %s
              AND s.active = true
            """,
            (payload.schedule_id, payload.patient_id),
        ).fetchone()
        if schedule is None:
            raise HTTPException(status_code=404, detail="Medication schedule not found")

        event = connection.execute(
            """
            INSERT INTO medication_events
                (schedule_id, patient_id, scheduled_for, status, source, notes)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, schedule_id, patient_id, scheduled_for, status, source, recorded_at, notes
            """,
            (
                payload.schedule_id,
                payload.patient_id,
                payload.scheduled_for,
                payload.status,
                payload.source,
                payload.notes.strip() or None,
            ),
        ).fetchone()
    return {
        "id": str(event["id"]),
        "schedule_id": str(event["schedule_id"]),
        "patient_id": str(event["patient_id"]),
        "scheduled_for": event["scheduled_for"].isoformat(),
        "status": event["status"],
        "source": event["source"],
        "recorded_at": event["recorded_at"].isoformat(),
        "notes": event["notes"] or "",
    }


@app.get("/api/medication-events")
def list_medication_events(
    patient_id: UUID,
    schedule_id: UUID | None = Query(default=None),
    event_status: Literal[
        "reminded", "taken", "skipped", "delayed", "unanswered", "escalated"
    ] | None = Query(default=None, alias="status"),
    since: datetime | None = Query(default=None),
    until: datetime | None = Query(default=None),
) -> list[dict[str, Any]]:
    conditions = ["patient_id = %s"]
    parameters: list[Any] = [patient_id]
    if schedule_id is not None:
        conditions.append("schedule_id = %s")
        parameters.append(schedule_id)
    if event_status is not None:
        conditions.append("status = %s")
        parameters.append(event_status)
    if since is not None:
        conditions.append("scheduled_for >= %s")
        parameters.append(since)
    if until is not None:
        conditions.append("scheduled_for < %s")
        parameters.append(until)

    with connect() as connection:
        events = connection.execute(
            f"""
            SELECT id, schedule_id, patient_id, scheduled_for, status, source, recorded_at, notes
            FROM medication_events
            WHERE {' AND '.join(conditions)}
            ORDER BY scheduled_for DESC, recorded_at DESC
            """,
            parameters,
        ).fetchall()
    return [
        {
            "id": str(event["id"]),
            "schedule_id": str(event["schedule_id"]),
            "patient_id": str(event["patient_id"]),
            "scheduled_for": event["scheduled_for"].isoformat(),
            "status": event["status"],
            "source": event["source"],
            "recorded_at": event["recorded_at"].isoformat(),
            "notes": event["notes"] or "",
        }
        for event in events
    ]


@app.post("/api/device/touch", status_code=status.HTTP_201_CREATED)
def confirm_touch(payload: TouchConfirmationCreate) -> dict[str, Any]:
    with connect() as connection:
        reminder = connection.execute(
            """
            SELECT
                e.id AS reminder_id,
                e.schedule_id,
                e.patient_id,
                e.scheduled_for,
                e.recorded_at AS reminded_at,
                m.name,
                COALESCE(m.strength, s.dose_text, '') AS dose
            FROM medication_events AS e
            JOIN medication_schedules AS s ON s.id = e.schedule_id
            JOIN prescriptions AS pr ON pr.id = s.prescription_id
            JOIN medications AS m ON m.id = pr.medication_id
            WHERE e.patient_id = %s
              AND e.status = 'reminded'
              AND e.source = 'device'
              AND e.notes = 'Spoken reminder delivered'
              AND e.recorded_at >= now() - (%s * interval '1 minute')
              AND NOT EXISTS (
                  SELECT 1
                  FROM medication_events AS taken
                  WHERE taken.patient_id = e.patient_id
                    AND taken.schedule_id = e.schedule_id
                    AND taken.status = 'taken'
                    AND taken.recorded_at >= e.recorded_at
              )
              AND NOT EXISTS (
                  SELECT 1
                  FROM medication_events AS unanswered
                  WHERE unanswered.patient_id = e.patient_id
                    AND unanswered.schedule_id = e.schedule_id
                    AND unanswered.status = 'unanswered'
                    AND unanswered.recorded_at >= e.recorded_at
              )
            ORDER BY e.recorded_at DESC
            LIMIT 1
            FOR UPDATE OF e
            """,
            (payload.patient_id, payload.window_minutes),
        ).fetchone()
        if reminder is None:
            return {
                "status": "ignored",
                "message": "No active medication reminder is waiting for a touch confirmation.",
            }

        event = connection.execute(
            """
            INSERT INTO medication_events
                (schedule_id, patient_id, scheduled_for, status, source, notes)
            VALUES (%s, %s, %s, 'taken', 'device', %s)
            RETURNING id, recorded_at
            """,
            (
                reminder["schedule_id"],
                reminder["patient_id"],
                reminder["scheduled_for"],
                f"Touch sensor confirmation ({payload.sensor_id})",
            ),
        ).fetchone()
    return {
        "status": "taken",
        "event_id": str(event["id"]),
        "schedule_id": str(reminder["schedule_id"]),
        "patient_id": str(reminder["patient_id"]),
        "name": reminder["name"],
        "dose": reminder["dose"],
        "scheduled_for": reminder["scheduled_for"].isoformat(),
        "recorded_at": event["recorded_at"].isoformat(),
    }


@app.delete("/api/medication-schedules/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_medication_schedule(schedule_id: UUID) -> None:
    with connect() as connection:
        deleted = connection.execute(
            """
            UPDATE medication_schedules
            SET active = false
            WHERE id = %s AND active = true
            RETURNING id
            """,
            (schedule_id,),
        ).fetchone()
    if deleted is None:
        raise HTTPException(status_code=404, detail="Medication schedule not found")
