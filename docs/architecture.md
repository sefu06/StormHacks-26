# carebot architecture

## Runtime flow

```text
Caregiver app ──HTTPS──> API ──> PostgreSQL
                              └─> medication schedules and events

Laptop microphone ──> laptop voice agent ──> Gemini ──> ElevenLabs
                                      ├─> laptop speakers/JBL
                                      └─> Pi audio bridge ──> JBL

Webcam ──> Raspberry Pi ──> medication lookup/API
                         └─> caregiver event updates through the API

Webcam scan flow ──> API/PostgreSQL schedules ──> Gemini vision ──> scan decision
                                      └─> Pi/JBL speech output

Touch sensor ──> Pi GPIO ──> API `taken` event ──> JBL confirmation jingle
Reminder loop ──> one-hour timeout ──> API `unanswered` event ──> caregiver app alert
```

For the prototype, the laptop temporarily owns microphone capture and the Gemini/ElevenLabs voice loop. The Raspberry Pi owns the webcam and schedule polling. The JBL speaker can be paired to the laptop, or remain paired to the Pi through the local audio bridge; it does not need Google Home or Cast.

The backend is the source of truth for patients, prescriptions, schedules, and medication events. The voice agent should request only the patient context needed for the current interaction and should record actions through authenticated API calls.

## Components

### `apps/caregiver-mobile`

Caregivers create medication records, configure schedules, review reminders, and receive escalation events.

### `apps/patient-portal`

Patient and provider-facing web experience. Keep it separate from device credentials and hardware code.

### `services/api`

The API validates users, owns authorization, exposes medication and event endpoints, and issues short-lived device credentials. It is the only service that writes production medication data.

### `services/voice-agent`

Python service for laptop microphone capture, Gemini audio understanding, ElevenLabs speech output, wake-word detection, conversation tools, barcode/QR processing, JBL playback, and emergency escalation. It should not contain database credentials or an unbounded medical chart in source code.

### `hardware/laptop`

Temporary prototype hardware notes for microphone capture and voice output while a microphone is unavailable on the Raspberry Pi.

### `device`

Merged partner webcam-scan feature. It loads active medication schedules and medication events through the Carebot API, gives that medication list to Gemini vision for bottle matching, and applies the schedule decision locally. Firebase remains an optional legacy data source; keep its service-account file out of git.

### `pi`

Current Raspberry Pi prototype. `speak_jbl.py` generates local speech and plays it through a paired JBL Bluetooth output.

### `hardware/arduino`

Optional microcontroller code. If LED feedback is not needed, this directory can remain unused. The Pi should remain responsible for camera, speech, and network logic.

### `database`

PostgreSQL schema and future migration files. The application should access it through the API rather than directly from the Pi.

## Development order

1. Keep the Pi/JBL speech test working.
2. Run the laptop microphone/Gemini/ElevenLabs voice prototype.
3. Add a fixed medication schedule and local reminder loop.
4. Add the API and PostgreSQL schema.
5. Add caregiver schedule editing and medication event history.
6. Add QR/barcode scanning and medication matching.
7. Move microphone capture to the bedside device when hardware is available.
