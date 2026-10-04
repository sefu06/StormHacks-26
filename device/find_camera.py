"""Find available webcam indices and save a test frame from each one."""

from __future__ import annotations

import time
from pathlib import Path

import cv2


DEBUG_DIR = Path(__file__).parent / "debug_images"
DEBUG_DIR.mkdir(exist_ok=True)

print("Checking camera indices 0–4...\n")
found: list[int] = []

for index in range(5):
    camera = cv2.VideoCapture(index)
    if not camera.isOpened():
        print(f"  Camera {index}: not available")
        continue

    time.sleep(2)
    frame = None
    ok = False
    for _ in range(30):
        ok, frame = camera.read()
    camera.release()

    if ok and frame is not None:
        path = DEBUG_DIR / f"camera_{index}.jpg"
        cv2.imwrite(str(path), frame)
        print(f"  Camera {index}: FOUND — photo saved to {path}")
        found.append(index)
    else:
        print(f"  Camera {index}: opened but couldn't capture a frame")

print()
if found:
    print(f"Saved photos for cameras: {found}")
    print("Open device/debug_images/ and choose the image showing the webcam.")
    print("Set CAMERA_INDEX=<that number> in device/.env")
else:
    print("No cameras found. Make sure the webcam is plugged in.")
