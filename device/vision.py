"""Identify a medication bottle from a captured image using Gemini vision."""

from __future__ import annotations

import json
import os
import re
import time
from datetime import datetime
from pathlib import Path

import pytz
from dotenv import load_dotenv


load_dotenv(Path(__file__).parent / ".env")

VISION_PROVIDER = os.getenv("VISION_PROVIDER", "gemini")
VISION_API_KEY = os.getenv("VISION_API_KEY") or os.getenv("GEMINI_API_KEY", "")
VISION_MODEL = os.getenv("VISION_MODEL", "gemini-3.8-flash")
VISION_FALLBACK_MODEL = os.getenv("VISION_FALLBACK_MODEL", "")
TIMEZONE = os.getenv("TIMEZONE", "America/Vancouver")

LOW_CONFIDENCE = {"medication_id": None, "name_on_label": "", "confidence": "low"}


def identify_medication(image_path: str, medications: list[dict]) -> dict:
    """Return the matched medication ID, label text, and confidence."""
    if not VISION_API_KEY:
        raise ValueError("Set VISION_API_KEY or GEMINI_API_KEY in device/.env")
    if VISION_PROVIDER != "gemini":
        raise ValueError(f"Unknown VISION_PROVIDER '{VISION_PROVIDER}'. Only 'gemini' is supported.")
    return _call_gemini(image_path, medications)


def check_due_now(medication: dict, window_minutes: int = 60) -> tuple[bool, str | None]:
    """Return whether a medication is due within the configured time window."""
    timezone = pytz.timezone(medication.get("timezone") or TIMEZONE)
    now = datetime.now(timezone)
    now_minutes = now.hour * 60 + now.minute
    scheduled_days = medication.get("days") or []
    if scheduled_days and now.strftime("%a") not in scheduled_days:
        return False, None

    for scheduled_time in medication.get("times", []):
        hour, minute = map(int, scheduled_time.split(":")[:2])
        if abs(now_minutes - (hour * 60 + minute)) <= window_minutes:
            return True, scheduled_time
    return False, None


def _call_gemini(image_path: str, medications: list[dict]) -> dict:
    try:
        from google import genai
        from google.genai import types
    except ImportError as error:
        raise ImportError("Missing packages. Run: pip install -r device/requirements.txt") from error

    client = genai.Client(api_key=VISION_API_KEY)
    with open(image_path, "rb") as image_file:
        image_part = types.Part.from_bytes(data=image_file.read(), mime_type="image/jpeg")

    prompt = _build_prompt(medications)
    for attempt in range(1, 4):
        print(f"Gemini attempt {attempt}/3 — model: {VISION_MODEL}")
        try:
            response = client.models.generate_content(
                model=VISION_MODEL,
                contents=[prompt, image_part],
            )
            return _parse_response(response.text)
        except Exception as error:
            print(f"  Failed: {error}")
            if attempt < 3:
                time.sleep(2)

    if VISION_FALLBACK_MODEL:
        print(f"Primary model failed 3 times. Trying fallback: {VISION_FALLBACK_MODEL}")
        try:
            response = client.models.generate_content(
                model=VISION_FALLBACK_MODEL,
                contents=[prompt, image_part],
            )
            return _parse_response(response.text)
        except Exception as error:
            print(f"  Fallback failed: {error}")

    print("All Gemini attempts failed. Returning low confidence.")
    return LOW_CONFIDENCE.copy()


def _build_prompt(medications: list[dict]) -> str:
    medication_lines = "\n".join(
        f'  - ID: {medication["id"]} | Name: {medication["name"]} | '
        f'Dose: {medication["dose"]} | Times: {", ".join(medication["times"])}'
        for medication in medications
    )
    return f"""You are helping a medication reminder device identify a pill bottle from a photo.

The senior has these medications on their schedule:
{medication_lines}

Look at the label on the bottle in the photo. Read the text carefully.

Reply ONLY with a single JSON object — no explanation, markdown, or code fences:
{{"medication_id": "<id from the list>", "name_on_label": "<text read>", "confidence": "high"}}

Set confidence to "low" and medication_id to null if the label is unclear, does not match,
or you are uncertain. Never guess."""


def _parse_response(raw: str) -> dict:
    cleaned = re.sub(r"```(?:json)?", "", raw).replace("```", "").strip()
    try:
        result = json.loads(cleaned)
    except json.JSONDecodeError:
        print(f"Could not parse vision response as JSON. Raw response: {raw!r}")
        return LOW_CONFIDENCE.copy()

    result.setdefault("medication_id", None)
    result.setdefault("name_on_label", "")
    result.setdefault("confidence", "low")
    return result
