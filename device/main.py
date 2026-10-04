"""
main.py — CareBot entry point: reminder scheduler + touch sensor.

Run from the device/ folder:
    python main.py

Mock mode (MOCK_HARDWARE=true) — for testing on a laptop without Pi hardware.
After the scheduler prints, type a key and press Enter:
    t  — short touch (confirm current dose group)
    s  — long press  (bottle scan)
    r  — trigger the next reminder right now (for demo / judging)
    q  — quit
"""
from __future__ import annotations

import os
import sys
import threading
import time
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from firebase_client import get_senior
from scan import run_scan
from scheduler import ReminderScheduler
from speak_jbl import play_jingle, speak_text

SENIOR_ID = os.getenv("SENIOR_ID", "")
MOCK_HARDWARE = os.getenv("MOCK_HARDWARE", "false").lower() == "true"
TOUCH_GPIO_PIN = int(os.getenv("TOUCH_GPIO_PIN", "16"))
LONG_PRESS_SECONDS = 2.0


# ------------------------------------------------------------------
# Touch event handlers
# ------------------------------------------------------------------

def on_short_press(scheduler: ReminderScheduler) -> None:
    pending = scheduler.get_pending()
    if not pending:
        print("[touch] No pending dose to confirm right now.")
        return
    scheduler.confirm_taken()
    play_jingle()
    preferred = scheduler.senior.get("preferredName") or scheduler.senior.get("name", "")
    speak_text(f"Great job, {preferred}!")


def on_long_press(scheduler: ReminderScheduler) -> None:
    speak_text("Please hold the bottle up to the camera.")
    try:
        sentence = run_scan()
        speak_text(sentence)
    except Exception as exc:
        print(f"[scan] Error: {exc}")
        speak_text("Sorry, the scan didn't work. Please try again.")


# ------------------------------------------------------------------
# Mock mode (keyboard input)
# ------------------------------------------------------------------

def _mock_loop(scheduler: ReminderScheduler) -> None:
    print("\nMock mode — t=touch  s=scan  r=reminder now  q=quit")
    print("(Type a key and press Enter)\n")
    while True:
        try:
            key = input().strip().lower()
        except (EOFError, KeyboardInterrupt):
            break
        if key == "q":
            break
        elif key == "t":
            on_short_press(scheduler)
        elif key == "s":
            threading.Thread(target=on_long_press, args=(scheduler,), daemon=True).start()
        elif key == "r":
            scheduler.trigger_now()
        else:
            print("t=touch  s=scan  r=reminder now  q=quit")


# ------------------------------------------------------------------
# Real GPIO loop (Pi only)
# ------------------------------------------------------------------

def _gpio_loop(scheduler: ReminderScheduler) -> None:
    try:
        from gpiozero import Button
    except ImportError:
        sys.exit(
            "gpiozero not found. On the Pi: sudo apt install python3-gpiozero\n"
            "On a laptop: set MOCK_HARDWARE=true in device/.env"
        )

    press_start: list[float] = [0.0]

    def _on_press() -> None:
        press_start[0] = time.time()

    def _on_release() -> None:
        held = time.time() - press_start[0]
        if held >= LONG_PRESS_SECONDS:
            threading.Thread(target=on_long_press, args=(scheduler,), daemon=True).start()
        else:
            threading.Thread(target=on_short_press, args=(scheduler,), daemon=True).start()

    sensor = Button(TOUCH_GPIO_PIN, pull_up=False, bounce_time=0.3)
    sensor.when_pressed = _on_press
    sensor.when_released = _on_release
    print(f"Touch sensor on GPIO {TOUCH_GPIO_PIN}. Press Ctrl-C to stop.")

    try:
        while True:
            time.sleep(0.1)
    except KeyboardInterrupt:
        print("\nStopped.")


# ------------------------------------------------------------------
# Entry point
# ------------------------------------------------------------------

def main() -> None:
    if not SENIOR_ID:
        sys.exit("SENIOR_ID is not set. Add it to device/.env.")

    try:
        senior = get_senior(SENIOR_ID)
    except Exception as exc:
        sys.exit(f"Could not load senior from Firestore: {exc}")

    print(f"CareBot started for {senior.get('name')} (MOCK_HARDWARE={MOCK_HARDWARE})")

    scheduler = ReminderScheduler(senior, speak_fn=speak_text)
    scheduler.start()

    try:
        if MOCK_HARDWARE:
            _mock_loop(scheduler)
        else:
            _gpio_loop(scheduler)
    finally:
        scheduler.stop()
        print("CareBot stopped.")


if __name__ == "__main__":
    main()
