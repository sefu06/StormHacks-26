# Raspberry Pi hardware

The current working Raspberry Pi files are in the repository-level `pi/` directory while the prototype is being developed.

Target hardware:

- Raspberry Pi with Raspberry Pi OS
- USB webcam for QR/barcode capture
- JBL Bluetooth speaker for speech output
- Optional laptop as the microphone and Gemini/ElevenLabs voice host
- TTP223-style digital touch sensor for dose confirmation

The Pi needs network access for SSH, package installation, API sync, and the laptop audio bridge. JBL audio itself uses Bluetooth.

The merged webcam scan flow is in `device/`. The current prototype can keep the webcam on the laptop and send scan speech to the Pi JBL. The touch monitor uses the API's medication-event records rather than a separate schedule column.

## Touch sensor wiring

The board appears to be a Seeed Grove Base Hat. For a 3.3 V-compatible Grove touch sensor, connect its Grove cable to the digital `D16` socket. `D16` means BCM GPIO16 on this HAT; the Python monitor uses that number. Do not use a 5 V Grove sensor with this HAT.

Install the GPIO dependency and start the monitor on the Pi:

```sh
sudo apt install -y python3-gpiozero
cd ~/StormHacks-26/pi
source .venv/bin/activate
python -m pip install -r requirements.txt
python touch_monitor.py \
  --gpio 16 \
  --api http://LAPTOP_IP:8000 \
  --patient-id PATIENT_UUID
```

The API must be reachable from the Pi, and the reminder loop must be running. A touch during the one-hour confirmation window creates a `taken` event and plays a jingle through the JBL. If no touch arrives, the reminder loop creates an `unanswered` event for the caregiver app.
