"""
camera.py — captures a single frame from the webcam and saves it.

On Mac with an external Logitech: set CAMERA_INDEX=1 in device/.env
  (0 is the built-in camera, 1 is usually the first USB camera).
On the Pi: CAMERA_INDEX=0.

Run find_camera.py first if you're not sure which index is correct.
"""

from __future__ import annotations

import os
import shutil
import time
from pathlib import Path
from datetime import datetime

import cv2
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

CAMERA_INDEX = int(os.getenv("CAMERA_INDEX", "0"))
MOCK_HARDWARE = os.getenv("MOCK_HARDWARE", "false").lower() == "true"

_DEBUG_DIR = Path(__file__).parent / "debug_images"
_TEST_IMAGES_DIR = Path(__file__).parent / "test_images"


def capture_frame() -> str:
    """
    Takes one photo and saves it to device/debug_images/.
    Returns the path to the saved image file.
    """
    _DEBUG_DIR.mkdir(exist_ok=True)
    filename = _DEBUG_DIR / f"scan_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"

    if MOCK_HARDWARE:
        return _load_test_image(filename)

    return _capture_from_webcam(filename)


def _capture_from_webcam(filename: Path) -> str:
    cap = cv2.VideoCapture(CAMERA_INDEX)
    if not cap.isOpened():
        raise RuntimeError(
            f"Cannot open camera index {CAMERA_INDEX}. "
            "Run 'python find_camera.py' to find the right number, "
            "then update CAMERA_INDEX in device/.env"
        )

    # Wait 2 s and flush ~30 frames so the sensor has time to adjust exposure
    time.sleep(2)
    for _ in range(30):
        cap.read()

    ok, frame = cap.read()
    cap.release()

    if not ok:
        raise RuntimeError("Webcam opened but failed to capture a frame.")

    cv2.imwrite(str(filename), frame)
    print(f"Photo saved: {filename}")
    return str(filename)


def _load_test_image(filename: Path) -> str:
    images = list(_TEST_IMAGES_DIR.glob("*.jpg")) + list(_TEST_IMAGES_DIR.glob("*.png"))
    if not images:
        raise FileNotFoundError(
            f"MOCK_HARDWARE=true but no images found in {_TEST_IMAGES_DIR}. "
            "Add a .jpg or .png of a pill bottle there."
        )
    src = images[0]
    shutil.copy(src, filename)
    print(f"[MOCK] Using test image: {src}")
    return str(filename)
