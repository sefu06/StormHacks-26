# carebot

carebot is a medication support system for older adults. The first hardware prototype uses a Raspberry Pi, webcam, and JBL Bluetooth speaker. An Arduino is optional for future physical controls.

## Repository layout

```text
apps/
  caregiver-mobile/       Caregiver schedule and event tracking app
  patient-portal/         Patient and provider portal
device/                   Webcam medication scanning feature
services/
  api/                    Authenticated backend API
  patient-sync/           Scheduled external patient-data synchronization
  voice-agent/            Realtime voice, wake word, TTS, and tool calls
database/
  schema.sql              Initial PostgreSQL domain schema
  migrations/             Timestamped database migrations
hardware/
  arduino/                Optional microcontroller integrations
  laptop/                 Temporary microphone and voice-agent hardware
  raspberry-pi/           Pi hardware notes; current prototype is in pi/
pi/                       Working JBL speech prototype
packages/
  contracts/              Shared API and event contracts
docs/
  architecture.md         System boundaries and data flow
```

The architecture and first implementation boundaries are documented in [docs/architecture.md](docs/architecture.md). The current JBL test is in [pi/speak_jbl.py](pi/speak_jbl.py), the touch-confirmation monitor is in [pi/touch_monitor.py](pi/touch_monitor.py), and the merged webcam scan flow is documented in [device/README.md](device/README.md).

## Run the schedule prototype

The local vertical slice is documented in [apps/caregiver-mobile/README.md](apps/caregiver-mobile/README.md). You can use Docker or a native Homebrew PostgreSQL installation. Either way, apply `database/schema.sql`, run the API on port `8000`, and serve the caregiver app on port `8080`.

```sh
docker compose -f infra/docker-compose.yml up -d postgres
docker compose -f infra/docker-compose.yml exec -T postgres psql -U carebot -d carebot < database/schema.sql
```

Then follow the API and caregiver-app terminal commands in that README. The app creates a demo patient and sends medication schedules to PostgreSQL. The Raspberry Pi can read them with `pi/fetch_schedule.py` and speak reminders through `pi/speak_jbl.py`.
