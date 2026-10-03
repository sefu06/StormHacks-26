"""
find_camera.py — finds all cameras and saves a test photo from each one.

Run this once to figure out which number is your Logitech webcam:
    python find_camera.py

It saves device/debug_images/camera_0.jpg, camera_1.jpg, etc.
Open those images and the one that shows your pill bottle setup is the Logitech.
Then set CAMERA_INDEX=<that number> in device/.env
"""

import time
from pathlib import Path
import cv2

DEBUG_DIR = Path(__file__).parent / "debug_images"
DEBUG_DIR.mkdir(exist_ok=True)

print("Checking camera indices 0–4...\n")

found = []
for i in range(5):
    cap = cv2.VideoCapture(i)
    if not cap.isOpened():
        print(f"  Camera {i}: not available")
        continue

    # Wait 2 s and flush ~30 frames so the sensor has time to adjust exposure
    time.sleep(2)
    frame = None
    for _ in range(30):
        ok, frame = cap.read()
    cap.release()

    if ok and frame is not None:
        save_path = DEBUG_DIR / f"camera_{i}.jpg"
        cv2.imwrite(str(save_path), frame)
        print(f"  Camera {i}: FOUND — photo saved to {save_path}")
        found.append(i)
    else:
        print(f"  Camera {i}: opened but couldn't capture a frame")

print()
if found:
    print(f"Saved photos for cameras: {found}")
    print(f"Open device/debug_images/ and look at the photos.")
    print("The one showing your desk/bottle setup is the Logitech.")
    print("Set CAMERA_INDEX=<that number> in device/.env")
else:
    print("No cameras found. Make sure the Logitech is plugged in.")
