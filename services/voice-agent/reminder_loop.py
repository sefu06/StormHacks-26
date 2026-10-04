#!/usr/bin/env python3

"""Prototype medication reminder loop for the laptop/Pi voice setup."""

from __future__ import annotations

import argparse
import json
import os
import sys
import time as time_module
from datetime import datetime, timedelta
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from laptop_voice import (
    DEFAULT_ELEVENLABS_MODEL,
    DEFAULT_ELEVENLABS_VOICE,
    elevenlabs_speech,
    play_audio,
    required_env,
)


def get_json(url: str) -> object:
    request = Request(url, headers={"Accept": "application/json"})
    try:
        with urlopen(request, timeout=15) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        raise RuntimeError(f"API returned HTTP {error.code}") from error
    except URLError as error:
        raise RuntimeError(f"could not reach API: {error.reason}") from error


def post_event(api_base_url: str, event: dict[str, object]) -> None:
    request = Request(
        f"{api_base_url.rstrip('/')}/api/medication-events",
        data=json.dumps(event).encode("utf-8"),
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=15) as response:
            response.read()
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"event API returned HTTP {error.code}: {detail}") from error
    except URLError as error:
        raise RuntimeError(f"could not record medication event: {error.reason}") from error


def fetch_schedules(api_base_url: str, patient_id: str) -> list[dict[str, object]]:
    query = urlencode({"patient_id": patient_id})
    url = f"{api_base_url.rstrip('/')}/api/device/schedules?{query}"
    payload = get_json(url)
    if not isinstance(payload, list):
        raise RuntimeError("API returned an invalid schedule list")
    return payload


def fetch_events(
    api_base_url: str,
    patient_id: str,
    event_status: str | None = None,
) -> list[dict[str, object]]:
    parameters = {"patient_id": patient_id}
    if event_status:
        parameters["status"] = event_status
    url = f"{api_base_url.rstrip('/')}/api/medication-events?{urlencode(parameters)}"
    payload = get_json(url)
    if not isinstance(payload, list):
        raise RuntimeError("API returned an invalid medication event list")
    return payload


def parse_timestamp(value: object) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.astimezone()


def check_unanswered(api_base_url: str, patient_id: str, window_minutes: int) -> int:
    events = fetch_events(api_base_url, patient_id)
    now = datetime.now().astimezone()
    reminders = [
        event
        for event in events
        if event.get("status") == "reminded"
        and event.get("notes") == "Spoken reminder delivered"
    ]
    unanswered_count = 0

    for reminder in reminders:
        reminded_at = parse_timestamp(reminder.get("recorded_at"))
        if reminded_at is None or now - reminded_at < timedelta(minutes=window_minutes):
            continue
        schedule_id = str(reminder.get("schedule_id", ""))
        reminder_recorded_at = reminded_at
        has_followup = any(
            event.get("schedule_id") == schedule_id
            and event.get("status") in {"taken", "unanswered"}
            and (
                event_time := parse_timestamp(event.get("recorded_at"))
            ) is not None
            and event_time >= reminder_recorded_at
            for event in events
        )
        if has_followup:
            continue

        post_event(
            api_base_url,
            {
                "patient_id": patient_id,
                "schedule_id": schedule_id,
                "scheduled_for": reminder.get("scheduled_for") or reminder.get("recorded_at"),
                "status": "unanswered",
                "source": "device",
                "notes": "No touch confirmation within one hour",
            },
        )
        unanswered_count += 1
        print(f"No touch confirmation for schedule {schedule_id}; caregiver notification created.")
    return unanswered_count


def reminder_text(schedule: dict[str, object]) -> str:
    name = str(schedule.get("name", "your medication"))
    dose = str(schedule.get("dose", "")).strip()
    notes = str(schedule.get("notes", "")).strip()
    text = f"It is time to take {name}"
    if dose:
        text += f", {dose}"
    text += "."
    if notes:
        text += f" {notes}."
    return text + " Please follow your caregiver's instructions."


def run_pass(args: argparse.Namespace, triggered: set[str]) -> int:
    api_base_url = required_env("CAREBOT_API_BASE_URL")
    patient_id = required_env("CAREBOT_PATIENT_ID")
    elevenlabs_key = required_env("ELEVENLABS_API_KEY")
    now = datetime.now().astimezone()
    day_name = now.strftime("%a")
    current_time = now.strftime("%H:%M")
    schedules = fetch_schedules(api_base_url, patient_id)
    triggered_count = 0

    for schedule in schedules:
        schedule_id = str(schedule.get("id", ""))
        days = schedule.get("days", [])
        if not schedule_id or not isinstance(days, list):
            continue
        trigger_key = f"{schedule_id}:{now.date().isoformat()}:{current_time}"
        if day_name not in days or str(schedule.get("time", "")) != current_time or trigger_key in triggered:
            continue

        message = reminder_text(schedule)
        print(f"Reminder: {message}")
        audio = elevenlabs_speech(
            message,
            elevenlabs_key,
            os.environ.get("ELEVENLABS_VOICE_ID", DEFAULT_ELEVENLABS_VOICE),
            os.environ.get("ELEVENLABS_MODEL", DEFAULT_ELEVENLABS_MODEL),
        )
        play_audio(
            audio,
            args.pi_audio_url or os.environ.get("CAREBOT_PI_AUDIO_URL"),
            os.environ.get("CAREBOT_AUDIO_TOKEN", ""),
        )
        post_event(
            api_base_url,
            {
                "patient_id": patient_id,
                "schedule_id": schedule_id,
                "scheduled_for": now.isoformat(),
                "status": "reminded",
                "source": "device",
                "notes": "Spoken reminder delivered",
            },
        )
        triggered.add(trigger_key)
        triggered_count += 1
    check_unanswered(api_base_url, patient_id, args.confirmation_window_minutes)
    return triggered_count


def main() -> int:
    parser = argparse.ArgumentParser(description="Speak due medication reminders from the carebot API")
    parser.add_argument("--interval", type=int, default=10, help="Seconds between schedule checks")
    parser.add_argument("--once", action="store_true", help="Check once and exit")
    parser.add_argument("--pi-audio-url", help="Pi audio bridge URL, for example http://192.168.2.2:8765/play")
    parser.add_argument(
        "--confirmation-window-minutes",
        type=int,
        default=int(os.environ.get("CAREBOT_CONFIRMATION_WINDOW_MINUTES", "60")),
        help="Minutes to wait for a touch confirmation before creating an unanswered event",
    )
    args = parser.parse_args()
    triggered: set[str] = set()

    try:
        while True:
            try:
                count = run_pass(args, triggered)
                if count:
                    print(f"Delivered {count} reminder(s).")
            except (OSError, RuntimeError) as error:
                print(f"Reminder check failed: {error}", file=sys.stderr)
            if args.once:
                return 0
            time_module.sleep(max(1, args.interval))
    except KeyboardInterrupt:
        print("\nReminder loop stopped.")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
