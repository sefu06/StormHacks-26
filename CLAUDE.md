# CareBot — Project Brief for Claude Code

You are helping a student team build **CareBot** at StormHacks (a ~9-hour build). Read this whole file before writing code. Several teammates are beginners, so explain what you're doing in simple terms and give exact commands to run. When something is ambiguous, ask before making a big architectural decision. Prefer simple, working, demoable code over clever code.

## 1. What we're building

CareBot is a medication-reminder assistant for seniors, plus a web app for their caregivers.

**The senior's experience (the device):**
1. At scheduled times (e.g. 8:00am), the device speaks a reminder through a speaker: "Good morning, Em! Time for your Lisinopril. Take it with a glass of water."
2. After taking the medication, the senior touches a touch sensor to confirm.
3. If they don't confirm, the device repeats the reminder. If they still don't confirm, it marks the dose missed and notifies the caregiver.
4. If the senior is unsure which medication to take, they trigger a scan: they hold the pill bottle up to a webcam, the device reads the label with a vision AI model, checks it against their schedule, and speaks back: "That's your Lisinopril. You're due for it now." / "That one is for lunchtime, not now." / "I'm not sure about that one. I'll let Maggie know."

**The caregiver's experience (the web app):**
- Sign up / log in.
- Set up the senior's profile (name, preferred name, notes like "speak slowly").
- Add and edit medications, dose times, and instructions.
- See today's doses live (Taken at 8:12 / Pending / Missed) and a weekly history.
- See missed doses highlighted live (the Pi writes "missed" to Firestore; the app shows the alert).

## 2. Hardware

- Raspberry Pi: runs the device software in Python.
- Speaker (a JBL portable speaker): plays spoken audio from the Pi, via AUX cable to the Pi's 3.5mm jack or via Bluetooth. (A Raspberry Pi 5 has no 3.5mm jack, so use Bluetooth or a USB audio adapter on a Pi 5.)
- Logitech USB webcam: for bottle-label scanning. Can be tested on a Mac laptop first.
- Capacitive touch sensor (likely TTP223: VCC, GND, SIG) wired to Pi GPIO.

We are NOT using a Google Home Mini, an RGB sensor, or an Arduino.

## 3. Architecture

Raspberry Pi (Python: scheduler, touch sensor, webcam + vision AI, text-to-speech) <-> Firebase (Firestore data + Authentication for caregiver login) <-> Caregiver web app (React, exported from Figma Make, in web/).
The Pi plays audio through the JBL speaker. Missed doses are written to Firestore; the caregiver app shows the alert live.

Firestore is the contract between the device and the app. They never talk directly; both read/write the same data (section 6). Do not change field names or collection names without updating this file and telling the team.

## 4. Device technical notes

Speech:
- Use speak_text(message) from device/speak_jbl.py.
- On the Pi: espeak-ng (TTS) → paplay (PulseAudio → JBL Bluetooth). sudo apt install espeak-ng pulseaudio-utils.
- Mock mode: prints text and tries Mac's 'say' command.
- Bluetooth: pair once with bluetoothctl (pair, trust, connect). Set JBL_SPEAKER_NAME in .env.

Touch sensor:
- Use gpiozero (Button on the signal pin). GPIO pin 16 (wired by Pi teammate; configurable via TOUCH_GPIO_PIN).
- Debounce. Short press = confirm dose. Long press (~2s) = start bottle scan.

Mock mode (MOCK_HARDWARE=true) so teammates can develop on laptops:
- Touch sensor -> keyboard input (t = touch, s = scan, r = trigger reminder now).
- Speaker -> laptop speakers + print the text.
- Webcam -> laptop/USB webcam, or a test image from device/test_images/.
- Camera index must be configurable in .env (CAMERA_INDEX). On a Mac with an external webcam the Logitech is usually 1; on the Pi it's usually 0.

## 5. Medication scan safety rules (important)

- Identify medications by reading the bottle label, not by recognizing loose pills. Demo bottles have labels: "Lisinopril 10mg", "Metformin 500mg", "Vitamin D 1000 IU".
- Send the webcam frame + the senior's medication list to a vision model (Gemini by default; keep provider swappable).
- Force structured JSON output, e.g. {"medication_id": "abc123", "name_on_label": "Lisinopril 10mg", "confidence": "high"} or {"medication_id": null, "confidence": "low"}.
- Never say a medication is "safe." Only say whether the bottle matches the caregiver's schedule, and repeat the caregiver's instructions.
- If confidence isn't high or there's no match: say "I'm not sure about that one" and notify the caregiver. Never guess.
- Double-dose check: if that dose is already marked taken, say so ("You already took this at 8:12").
- Strip markdown code fences before parsing JSON; treat parse failures as low confidence.

## 6. Firebase data model

Project: CareBot (Firebase, free Spark plan). Firestore is in test mode for now; security rules come later.

Collection names are exact and case-sensitive. Note "medication" is SINGULAR. Field names are lowercase camelCase.

seniors/{seniorId}
- name: string ("Emma")
- preferredName: string ("Em", used in spoken reminders)
- notes: string ("Speak slowly.")
- caregiverName: string ("Maggie")
- caregiverUid: string (Firebase Auth uid of the caregiver who owns this senior)
- caregiverContact: string (optional: ntfy topic and/or phone)
- speechRate: "slow" | "normal" (optional, default "normal")

seniors/{seniorId}/medication/{medId}
- name: string ("Lisinopril")
- dose: string ("10mg, 1 tablet")
- times: array of strings (["08:00"], 24h, zero-padded)
- instructions: string ("Take with a glass of water")
- active: boolean

seniors/{seniorId}/doseLogs/{logId}
- medicationId: string
- medicationName: string
- scheduledFor: timestamp
- status: "pending" | "taken" | "missed"
- remindersSent: number
- confirmedAt: timestamp or null
- confirmedBy: "touch" | "scan" | "caregiver" | null

seniors/{seniorId}/events/{eventId}
- type: "reminder" | "taken" | "missed" | "scan_match" | "scan_uncertain" | "scan_wrong_time"
- message: string
- createdAt: timestamp

Existing demo data (already in Firestore):
- Senior ID: p40qPtBDrWcmNAoIZmXN. name "Emma", preferredName "Em", caregiverName "Maggie", notes "Speak slowly."
- Medications: Lisinopril (10mg, 1 tablet, 08:00, take with a glass of water), Metformin (500mg, 1 tablet, 08:00 and 20:00, take with food), Vitamin D (1000 IU, 1 capsule, 12:00, take with lunch).
- No caregiverUid yet; it gets linked once login works.

Timezone: America/Vancouver. No Firebase Storage (requires paid plan), so no photo uploads.

## 7. Device logic (Python, on the Pi)

The Pi connects to Firestore with the Firebase Admin SDK (firebase-admin) using serviceAccount.json (never committed). It follows the senior in SENIOR_ID from .env.

Dose lifecycle:
1. APScheduler loads active medications from seniors/{SENIOR_ID}/medication and schedules a job per dose time. Re-sync every minute or with a Firestore listener.
2. At dose time: create a pending doseLog, log a reminder event, play a chime, speak the reminder (use preferredName and instructions).
3. Touch -> mark pending dose(s) taken, set confirmedAt and confirmedBy "touch", speak encouragement ("Great job, Em!").
4. No touch after REMINDER_INTERVAL -> repeat reminder, increment remindersSent.
5. No touch after MISSED_AFTER -> mark doseLog "missed", log a "missed" event. The caregiver app shows the alert live.
Group medications due at the same time into one reminder; one touch confirms the group.

Timers: real values 10 min repeat / 25 min missed. DEMO_MODE=true shrinks to ~20s / ~45s. Support triggering a reminder immediately for judging (r key in mock mode; trigger_now() in scheduler).

Scan flow (long press):
1. Speak "Please hold the bottle up to the camera."
2. Wait ~3s, capture a frame with OpenCV (cv2.VideoCapture using CAMERA_INDEX). Save it locally for debugging.
3. Call the vision model (section 5).
4. "Due now" = within ±60 min of a scheduled time and not yet taken (configurable).
5. Speak the result, log the event.

## 8. Caregiver web app 

The design team builds the app in Figma Make with fake data, then exports the React code into web/. Then we connect it to Firebase:
1. npm install firebase, config in one web/src/firebase/ module reading from .env (VITE_FIREBASE_... if the project uses Vite; check the exported build tool).
2. Email/Password login with Firebase Authentication: sign up, log in, log out, stay logged in, protect pages.
3. After sign-up, a "Set up your senior" page creates a seniors doc with caregiverUid = the user's uid. On login, load the senior whose caregiverUid matches.
4. Replace fake data with real Firestore data using the exact field names in section 6. Use onSnapshot for live updates on the Today page.
When editing the Figma Make code, keep the design: change data and logic only. When restyling, never break the Firebase logic.

Pages: Login / Sign up, Set up your senior, Today (live doses + events), Medications (add/edit/deactivate), History (optional).
Design: mobile-friendly, large readable text, calm and warm.
Demo account for judging: e.g. demo@carebot.app linked to the demo senior.

## 9. Repo structure

StormHacks-26/
- CLAUDE.md (this file), AGENTS.md (copy for teammates using Codex), README.md
- .gitignore (.env, serviceAccount.json, node_modules, __pycache__)
- device/: main.py, scheduler.py, speak_jbl.py, camera.py, vision.py, scan.py, firebase_client.py, test_images/, requirements.txt, .env.example
- web/: React app from Figma Make, with src/firebase/ for config and helpers
- firestore.rules (added later)

## 10. Environment variables (never commit real values)

device/.env:
FIREBASE_CREDENTIALS_PATH=./serviceAccount.json
SENIOR_ID=p40qPtBDrWcmNAoIZmXN
TOUCH_GPIO_PIN=16
CAMERA_INDEX=0
MOCK_HARDWARE=false
DEMO_MODE=true
VISION_PROVIDER=gemini
VISION_MODEL=gemini-3.8-flash
VISION_API_KEY=...
JBL_SPEAKER_NAME=JBL
TIMEZONE=America/Vancouver

web/.env: Firebase web config values (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).

## 11. Team roles

- Pi / hardware: speaker audio, touch sensor, scheduler, Pi integration.
- Design (x2): Figma designs, app built in Figma Make, exported into web/.
- Wakana: Firebase setup and demo data (done), webcam scan (camera.py + vision.py, built on Mac first), then connecting the app to Firebase (login, real data), security rules, demo account.

## 12. Build order

1. Speaker: speak("hello") plays through the JBL from the Pi.
2. Touch sensor prints on press; mock mode works.
3. Pi reads the demo medications from Firestore.
4. Core loop: reminder -> touch -> doseLog taken -> visible in Firestore.
5. Webcam scan works on the Mac (camera.py + vision.py + test script), then on the Pi.
6. App connected to Firebase: login, senior setup, real medications, live Today page.
7. Escalation: missed dose written to Firestore; caregiver app shows alert live.
8. Security rules: users can only read/write a senior where caregiverUid matches their uid. The Pi's Admin SDK bypasses rules.
9. Demo prep: DEMO_MODE, manual trigger, demo account, README.
If time runs short, cut from the bottom. Milestones 1-7 are a complete project.

## 13. Demo script (~90 seconds)

1. Trigger the morning reminder: chime + "Good morning, Em! Time for your Lisinopril and Metformin..."
2. Em holds up Vitamin D: "That one is for lunchtime, not now."
3. Em holds up Lisinopril: "That's your Lisinopril, you're due now. Take it with a glass of water."
4. Em touches the sensor: "Great job, Em!" and the caregiver app updates live to "Taken."
5. A second reminder is ignored: the dose is marked "missed" in Firestore and appears live in the caregiver app.

## 14. How to work with us

- Keep code readable, comment where non-obvious, avoid unnecessary abstractions.
- Explain simply and give exact terminal commands. Pi runs Raspberry Pi OS; use a Python venv; note when apt is easier (OpenCV, mpg123, espeak-ng).
- After each task, summarize what changed and how to test it.
- Don't silently change the schema, collection names, env var names, or file structure; propose first.
- Never hard-code API keys or commit .env / serviceAccount.json.
- Pull before starting work; commit and push working changes often.
