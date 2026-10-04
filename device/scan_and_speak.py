"""Run the webcam scan and speak its result through the Pi's JBL speaker."""

from __future__ import annotations

from pathlib import Path
import subprocess
import sys

from scan import run_scan


def main() -> int:
    sentence = run_scan()
    speaker = Path(__file__).parent.parent / "pi" / "speak_jbl.py"
    if not speaker.exists():
        print(sentence)
        print(f"Speaker script not found at {speaker}", file=sys.stderr)
        return 1
    subprocess.run([sys.executable, str(speaker), sentence], check=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
