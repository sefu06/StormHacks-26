# Webcam medication scan

This feature was merged from the partner branch under `device/`. It captures a webcam image, sends the bottle label to Gemini vision, compares the result with the patient's medication schedule from the Carebot API/PostgreSQL database, checks for a possible double dose, and returns a sentence for the device to speak. Gemini identifies the bottle from the database's active medication list; the application, not Gemini, decides whether the schedule is due.

The existing caregiver app, reminder loop, laptop microphone, Pi audio bridge, and JBL code continue to work unchanged. Firebase remains available as an optional legacy data source by setting `SCAN_DATA_SOURCE=firebase`.

## Install

From the repository root, on the computer that has the webcam:

```sh
python3 -m venv device/.venv
source device/.venv/bin/activate
python -m pip install -r device/requirements.txt
cp device/.env.example device/.env
```

Set `SCAN_DATA_SOURCE=carebot`, `CAREBOT_API_BASE_URL`, and `CAREBOT_PATIENT_ID` in `device/.env`. The same Gemini API key used by the voice agent can be placed in `VISION_API_KEY` or exported as `GEMINI_API_KEY`. Firebase credentials are only required for the optional Firebase mode.

## Find the webcam

Connect the USB webcam and run:

```sh
cd device
python find_camera.py
```

Open the saved images in `device/debug_images/`, then set the matching `CAMERA_INDEX` in `device/.env`. Use `0` on most Pi setups; a Mac with a built-in camera and external webcam often uses `1` for the external camera.

## Run a scan

```sh
cd device
python test_scan.py
```

Press Enter while holding a bottle in view. The result is printed and a matched scan event is recorded through the Carebot API.

On the Raspberry Pi, where `pi/speak_jbl.py` and the paired JBL are available, use:

```sh
python device/scan_and_speak.py
```

The script captures the bottle and speaks the scan result through the Pi's default Bluetooth audio output.

If the webcam stays connected to the laptop while the JBL remains connected to the Pi, keep
`audio_receiver.py` running on the Pi and use this laptop-side bridge instead:

```sh
cd device
python scan_and_send.py
```

Set `CAREBOT_PI_AUDIO_URL`, `CAREBOT_AUDIO_TOKEN`, `ELEVENLABS_API_KEY`, and
`ELEVENLABS_VOICE_ID` in `device/.env` first. In the default Carebot mode, the scan reads
medication schedules from the Carebot API; Firebase credentials are only needed in legacy mode.

## Mock a camera during development

Place a `.jpg` or `.png` bottle photo in `device/test_images/` and set:

```sh
MOCK_HARDWARE=true
```

The scan then uses that image instead of opening a webcam. The full scan still needs the Carebot API and Gemini credentials; Firebase is only required in legacy Firebase mode.
