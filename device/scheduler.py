"""
scheduler.py — medication reminder loop backed by Firestore.

How it works:
1. Every minute, _sync_schedule() re-reads medications from Firestore and
   (re-)registers one APScheduler job per dose time.
2. At dose time, _fire() creates pending doseLogs and speaks the reminder.
3. Escalation: if no touch after REMINDER_INTERVAL, the reminder repeats.
   If still no touch after MISSED_AFTER, the dose is marked missed in
   Firestore (the caregiver app shows the alert).

DEMO_MODE=true shrinks the timers for judging (20 s repeat / 45 s miss).
"""
from __future__ import annotations

import os
import threading
from datetime import datetime
from pathlib import Path
from typing import Callable, List, Optional

import pytz
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from firebase_client import (
    create_dose_log,
    get_medications,
    increment_reminders_sent,
    log_event,
    mark_dose_missed,
    mark_dose_taken,
)

SENIOR_ID = os.getenv("SENIOR_ID", "")
TIMEZONE = os.getenv("TIMEZONE", "America/Vancouver")
DEMO_MODE = os.getenv("DEMO_MODE", "false").lower() == "true"

REMINDER_INTERVAL: int = 20 if DEMO_MODE else 600    # seconds before re-speaking
MISSED_AFTER: int = 45 if DEMO_MODE else 1500         # seconds before marking missed (~25 min)


class ReminderScheduler:
    """
    Owns the APScheduler loop and the shared 'pending' state.
    Thread-safe: the scheduler fires in a background thread; touch callbacks
    run in the main thread (or GPIO callback thread on the Pi).
    """

    def __init__(self, senior: dict, speak_fn: Callable[[str], None]) -> None:
        self.senior = senior
        self._speak = speak_fn
        self._tz = pytz.timezone(TIMEZONE)
        self._apscheduler = BackgroundScheduler(timezone=TIMEZONE)
        self._lock = threading.Lock()
        self._pending: List[dict] = []     # [{"log_id": str, "med": dict, "time": str}]
        self._timers: List[threading.Timer] = []

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def start(self) -> None:
        self._apscheduler.add_job(
            self._sync_schedule, "interval", minutes=1,
            id="sync", replace_existing=True,
        )
        self._apscheduler.start()
        self._sync_schedule()   # run immediately so we don't wait a full minute
        print(
            f"[scheduler] Started — DEMO_MODE={DEMO_MODE}, "
            f"repeat={REMINDER_INTERVAL}s, miss={MISSED_AFTER}s"
        )

    def stop(self) -> None:
        self._apscheduler.shutdown(wait=False)
        for t in self._timers:
            t.cancel()
        self._timers.clear()

    # ------------------------------------------------------------------
    # Public interface (called by main.py on touch/scan events)
    # ------------------------------------------------------------------

    def get_pending(self) -> List[dict]:
        """Return a snapshot of the currently pending dose group."""
        with self._lock:
            return list(self._pending)

    def confirm_taken(self) -> List[dict]:
        """
        Mark all pending doses as taken (short touch).
        Cancels escalation timers. Returns the confirmed group.
        """
        with self._lock:
            group = list(self._pending)
            self._pending.clear()
        for t in self._timers:
            t.cancel()
        self._timers.clear()
        for item in group:
            mark_dose_taken(SENIOR_ID, item["log_id"])
            log_event(SENIOR_ID, "taken", f"{item['med']['name']} confirmed at {item['time']}")
        return group

    def trigger_now(self) -> None:
        """Fire the earliest dose time immediately. For demo / judging."""
        try:
            meds = get_medications(SENIOR_ID)
        except Exception as exc:
            print(f"[scheduler] trigger_now failed: {exc}")
            return
        groups: dict[str, list] = {}
        for med in meds:
            for t in med.get("times", []):
                groups.setdefault(t, []).append(med)
        if not groups:
            print("[scheduler] No dose times found.")
            return
        time_str = sorted(groups)[0]
        print(f"[scheduler] Triggering {time_str} now.")
        threading.Thread(
            target=self._fire, args=[time_str, groups[time_str]], daemon=True
        ).start()

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _sync_schedule(self) -> None:
        """Re-read medications from Firestore and register dose-time jobs."""
        try:
            meds = get_medications(SENIOR_ID)
        except Exception as exc:
            print(f"[scheduler] Could not load medications: {exc}")
            return

        groups: dict[str, list] = {}
        for med in meds:
            for t in med.get("times", []):
                groups.setdefault(t, []).append(med)

        # Remove stale jobs
        for job in list(self._apscheduler.get_jobs()):
            if job.id.startswith("dose:"):
                self._apscheduler.remove_job(job.id)

        for time_str, group_meds in groups.items():
            try:
                h, m = map(int, time_str.split(":"))
            except ValueError:
                print(f"[scheduler] Bad time format: {time_str!r} — skipping")
                continue
            self._apscheduler.add_job(
                self._fire,
                CronTrigger(hour=h, minute=m, timezone=self._tz),
                args=[time_str, group_meds],
                id=f"dose:{time_str}",
                replace_existing=True,
                misfire_grace_time=60,
            )
        print(f"[scheduler] {len(groups)} dose time(s): {sorted(groups)}")

    def _fire(self, time_str: str, meds: list) -> None:
        """Called by APScheduler at dose time (runs in background thread)."""
        now = datetime.now(self._tz)
        h, m = map(int, time_str.split(":"))
        scheduled_dt = self._tz.localize(datetime(now.year, now.month, now.day, h, m))

        group = []
        for med in meds:
            log_id = create_dose_log(SENIOR_ID, med["id"], med["name"], scheduled_dt)
            log_event(SENIOR_ID, "reminder", f"Reminder: {med['name']} at {time_str}")
            group.append({"log_id": log_id, "med": med, "time": time_str})

        with self._lock:
            self._pending = group

        self._speak_reminder(group)
        self._arm_escalation(group, time_str)

    def _speak_reminder(self, group: list) -> None:
        preferred = self.senior.get("preferredName") or self.senior.get("name", "")
        names = [item["med"]["name"] for item in group]
        if len(names) == 1:
            names_str = names[0]
        elif len(names) == 2:
            names_str = f"{names[0]} and {names[1]}"
        else:
            names_str = ", ".join(names[:-1]) + f", and {names[-1]}"

        msg = f"Good morning, {preferred}! Time for your {names_str}."

        # Collect unique instructions across the group
        instrs: list[str] = []
        for item in group:
            s = (item["med"].get("instructions") or "").strip()
            if s and s not in instrs:
                instrs.append(s)
        if instrs:
            msg += " " + ". ".join(instrs) + "."

        self._speak(msg)

    def _arm_escalation(self, group: list, time_str: str) -> None:
        """Set up the two-step escalation: re-speak → mark missed."""

        def _repeat() -> None:
            still = self._still_pending(group)
            if not still:
                return
            for item in still:
                increment_reminders_sent(SENIOR_ID, item["log_id"])
            self._speak_reminder(still)

            t2 = threading.Timer(MISSED_AFTER, _miss)
            t2.daemon = True
            self._timers.append(t2)
            t2.start()

        def _miss() -> None:
            still = self._still_pending(group)
            if not still:
                return
            names = [item["med"]["name"] for item in still]
            for item in still:
                mark_dose_missed(SENIOR_ID, item["log_id"])
                log_event(SENIOR_ID, "missed", f"{item['med']['name']} missed at {time_str}")
            with self._lock:
                missed_ids = {item["log_id"] for item in still}
                self._pending = [p for p in self._pending if p["log_id"] not in missed_ids]
            print(f"[scheduler] Missed: {', '.join(names)} at {time_str}")

        t1 = threading.Timer(REMINDER_INTERVAL, _repeat)
        t1.daemon = True
        self._timers.append(t1)
        t1.start()

    def _still_pending(self, group: list) -> list:
        """Return items from group that are still in _pending."""
        with self._lock:
            pending_ids = {item["log_id"] for item in self._pending}
        return [item for item in group if item["log_id"] in pending_ids]
