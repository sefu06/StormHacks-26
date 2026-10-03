"""
test_scan.py — quick test for camera.py + vision.py.

Press Enter to take a photo with the Logitech webcam, send it to Gemini,
and see which medication it matched and whether it's due right now.

Run from the device/ folder:
    python test_scan.py

Make sure device/.env exists with VISION_API_KEY and CAMERA_INDEX set.
"""

from __future__ import annotations

from pathlib import Path
from dotenv import load_dotenv

# Load .env before importing our modules (they also load it, but this is explicit)
load_dotenv(Path(__file__).parent / ".env")

from camera import capture_frame
from vision import identify_medication, check_due_now

# ── Demo medications (from CLAUDE.md section 6) ────────────────────────────
# These match the demo data already in Firestore.
# Later, firebase_client.py will fetch these dynamically instead.

DEMO_MEDICATIONS = [
    {
        "id": "med-lisinopril",
        "name": "Lisinopril",
        "dose": "10mg, 1 tablet",
        "times": ["08:00"],
        "instructions": "Take with a glass of water",
    },
    {
        "id": "med-metformin",
        "name": "Metformin",
        "dose": "500mg, 1 tablet",
        "times": ["08:00", "20:00"],
        "instructions": "Take with food",
    },
    {
        "id": "med-vitamind",
        "name": "Vitamin D",
        "dose": "1000 IU, 1 capsule",
        "times": ["12:00"],
        "instructions": "Take with lunch",
    },
]

# ── Main ───────────────────────────────────────────────────────────────────

def run_test():
    print("CareBot — Bottle Scan Test")
    print("=" * 40)
    print("Medications on schedule:")
    for m in DEMO_MEDICATIONS:
        print(f"  • {m['name']} {m['dose']}  (times: {', '.join(m['times'])})")
    print()

    input("Press Enter to take a photo with the webcam...")

    # Step 1: capture
    print("\nCapturing photo...")
    try:
        image_path = capture_frame()
    except RuntimeError as e:
        print(f"\nCamera error: {e}")
        return

    # Step 2: identify
    print("Sending photo to Gemini...")
    result = identify_medication(image_path, DEMO_MEDICATIONS)

    print(f"\nVision result:")
    print(f"  Label read:    {result['name_on_label'] or '(nothing readable)'}")
    print(f"  Matched ID:    {result['medication_id'] or 'no match'}")
    print(f"  Confidence:    {result['confidence']}")

    # Step 3: interpret
    print()
    if result["confidence"] != "high" or result["medication_id"] is None:
        print("→ I'm not sure about that one. Would notify caregiver.")
        return

    matched_med = next(
        (m for m in DEMO_MEDICATIONS if m["id"] == result["medication_id"]), None
    )
    if matched_med is None:
        print("→ Matched ID not found in medication list. Would notify caregiver.")
        return

    due, at_time = check_due_now(matched_med)
    if due:
        print(
            f"→ That's your {matched_med['name']}. "
            f"You're due for it now. {matched_med['instructions']}."
        )
    else:
        # Find the next scheduled time for a friendlier message
        times_str = " and ".join(matched_med["times"])
        print(
            f"→ That one is scheduled for {times_str}, not right now."
        )


if __name__ == "__main__":
    run_test()
