#!/usr/bin/env python3

"""Fetch active medication schedules for the bedside device."""

from __future__ import annotations

import argparse
import json
import os
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


def fetch_schedules(api_base_url: str, patient_id: str) -> list[dict[str, object]]:
    url = f"{api_base_url.rstrip('/')}/api/device/schedules?{urlencode({'patient_id': patient_id})}"
    request = Request(url, headers={"Accept": "application/json"})
    try:
        with urlopen(request, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"API returned HTTP {error.code}: {detail}") from error
    except URLError as error:
        raise RuntimeError(f"could not reach API: {error.reason}") from error

    if not isinstance(payload, list):
        raise RuntimeError("API returned an unexpected schedule payload")
    return payload


def main() -> int:
    parser = argparse.ArgumentParser(description="Read active medication schedules from carebot API")
    parser.add_argument(
        "--api",
        default=os.environ.get("CAREBOT_API_BASE_URL", "http://localhost:8000"),
        help="API base URL (or CAREBOT_API_BASE_URL)",
    )
    parser.add_argument(
        "--patient-id",
        default=os.environ.get("CAREBOT_PATIENT_ID"),
        help="Patient UUID (or CAREBOT_PATIENT_ID)",
    )
    args = parser.parse_args()

    if not args.patient_id:
        parser.error("provide --patient-id or set CAREBOT_PATIENT_ID")

    try:
        schedules = fetch_schedules(args.api, args.patient_id)
    except (OSError, RuntimeError) as error:
        print(f"Could not fetch schedules: {error}", file=sys.stderr)
        return 1

    print(json.dumps(schedules, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
