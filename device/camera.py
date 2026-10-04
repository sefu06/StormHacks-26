"""Capture a single webcam frame for medication scanning."""

from __future__ import annotations

import os
import shutil
import time
from datetime import datetime
from pathlib import Path

import cv2
from dotenv import load_dotenv


load_dotenv(Path(__file__).parent / ".env")

CAMERA_INDEX = int(os.getenv("CAMERA_INDEX", "0"))
MOCK_HARDWARE = os.getenv("MOCK_HARDWARE", "false").lower() == "true"
DEBUG_DIR = Path(__file__).parent / "debug_images"
TEST_IMAGES_DIR = Path(__file__).parent / "test_images"


def capture_frame() -> str:
    """Capture a frame and return the saved image path."""
    DEBUG_DIR.mkdir(exist_ok=True)
    filename = DEBUG_DIR / f"scan_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"

    if MOCK_HARDWARE:
        return _load_test_image(filename)
    return _capture_from_webcam(filename)


def _capture_from_webcam(filename: Path) -> str:
    camera = cv2.VideoCapture(CAMERA_INDEX)
    if not camera.isOpened():
        raise RuntimeError(
            f"Cannot open camera index {CAMERA_INDEX}. Run 'python find_camera.py' "
            "to find the right number, then update CAMERA_INDEX in device/.env"
        )

    time.sleep(2)
    for _ in range(30):
        camera.read()

    ok, frame = camera.read()
    camera.release()
    if not ok:
        raise RuntimeError("Webcam opened but failed to capture a frame.")

    cv2.imwrite(str(filename), frame)
    print(f"Photo saved: {filename}")
    return str(filename)


def _load_test_image(filename: Path) -> str:
    images = list(TEST_IMAGES_DIR.glob("*.jpg")) + list(TEST_IMAGES_DIR.glob("*.png"))
    if not images:
        raise FileNotFoundError(
            f"MOCK_HARDWARE=true but no images found in {TEST_IMAGES_DIR}. "
            "Add a .jpg or .png of a pill bottle there."
        )
    source = images[0]
    shutil.copy(source, filename)
    print(f"[MOCK] Using test image: {source}")
    return str(filename)
