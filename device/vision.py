"""
vision.py — sends a photo of a pill bottle to a vision AI and returns which
medication it matched (or says it's unsure).

The result is always a dict:
  {"medication_id": "abc123", "name_on_label": "Lisinopril 10mg", "confidence": "high"}
or:
  {"medication_id": None, "name_on_label": "", "confidence": "low"}

confidence "high" means we're sure enough to act on. Anything else → say unsure.
"""

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
VISION_API_KEY = os.getenv("VISION_API_KEY", "")
VISION_MODEL = os.getenv("VISION_MODEL", "gemini-3.8-flash")
VISION_FALLBACK_MODEL = os.getenv("VISION_FALLBACK_MODEL", "")
TIMEZONE = os.getenv("TIMEZONE", "America/Vancouver")

_LOW_CONFIDENCE = {"medication_id": None, "name_on_label": "", "confidence": "low"}


def identify_medication(image_path: str, medications: list[dict]) -> dict:
    """
    Send a photo + medication list to the vision model.

    medications: list of dicts, each with keys:
        id, name, dose, times (list of "HH:MM" strings), instructions

    Returns a dict with medication_id, name_on_label, confidence.
    """
    if not VISION_API_KEY:
        raise ValueError("VISION_API_KEY is not set in device/.env")

    if VISION_PROVIDER == "gemini":
        return _call_gemini(image_path, medications)

    raise ValueError(f"Unknown VISION_PROVIDER '{VISION_PROVIDER}'. Only 'gemini' is supported right now.")


def check_due_now(medication: dict, window_minutes: int = 60) -> tuple[bool, str | None]:
    """
    Returns (True, "08:00") if the medication is due within ±window_minutes of now.
    Returns (False, None) if it's not due.

    Example: window_minutes=60 means within 1 hour either side of the scheduled time.
    """
    tz = pytz.timezone(TIMEZONE)
    now = datetime.now(tz)
    now_minutes = now.hour * 60 + now.minute

    for t in medication.get("times", []):
        hour, minute = map(int, t.split(":"))
        scheduled_minutes = hour * 60 + minute
        if abs(now_minutes - scheduled_minutes) <= window_minutes:
            return True, t

    return False, None


# ── Gemini ──────────────────────────────────────────────────────────────────

def _call_gemini(image_path: str, medications: list[dict]) -> dict:
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        raise ImportError(
            "Missing packages. Run: pip install google-genai"
        )

    client = genai.Client(api_key=VISION_API_KEY)

    with open(image_path, "rb") as f:
        image_bytes = f.read()

    image_part = types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")
    prompt = _build_prompt(medications)

    # Try the primary model up to 3 times (handles 503 UNAVAILABLE)
    for attempt in range(1, 4):
        print(f"Gemini attempt {attempt}/3 — model: {VISION_MODEL}")
        try:
            response = client.models.generate_content(
                model=VISION_MODEL,
                contents=[prompt, image_part],
            )
            return _parse_response(response.text)
        except Exception as e:
            print(f"  Failed: {e}")
            if attempt < 3:
                time.sleep(2)

    # Primary model exhausted — try fallback if configured
    if VISION_FALLBACK_MODEL:
        print(f"Primary model failed 3 times. Trying fallback: {VISION_FALLBACK_MODEL}")
        try:
            response = client.models.generate_content(
                model=VISION_FALLBACK_MODEL,
                contents=[prompt, image_part],
            )
            return _parse_response(response.text)
        except Exception as e:
            print(f"  Fallback failed: {e}")

    print("All attempts failed. Returning low confidence.")
    return _LOW_CONFIDENCE


def _build_prompt(medications: list[dict]) -> str:
    med_lines = "\n".join(
        f'  - ID: {m["id"]} | Name: {m["name"]} | Dose: {m["dose"]} | '
        f'Times: {", ".join(m["times"])}'
        for m in medications
    )
    return f"""You are helping a medication reminder device identify a pill bottle from a photo.

The senior has these medications on their schedule:
{med_lines}

Look at the label on the bottle in the photo. Read the text on the label carefully.

Reply ONLY with a single JSON object — no explanation, no markdown, no code fences. Use this exact format:
{{"medication_id": "<id from the list above>", "name_on_label": "<text you read on the label>", "confidence": "high"}}

Set confidence to "low" and medication_id to null if:
- You cannot clearly read the label
- The label text does not match any medication in the list
- You are uncertain for any reason

Never guess. If in doubt, use confidence "low"."""


def _parse_response(raw: str) -> dict:
    # Strip markdown code fences (Gemini sometimes adds them despite instructions)
    cleaned = re.sub(r"```(?:json)?", "", raw).replace("```", "").strip()

    try:
        result = json.loads(cleaned)
    except json.JSONDecodeError:
        print(f"Could not parse vision model response as JSON.\nRaw response: {raw!r}")
        return _LOW_CONFIDENCE

    # Fill in missing keys safely
    result.setdefault("medication_id", None)
    result.setdefault("name_on_label", "")
    result.setdefault("confidence", "low")

    return result
