# Backend API

The API is the authorization boundary between apps, devices, and PostgreSQL.

## Run locally

Start PostgreSQL (with Docker or the native Homebrew setup) and apply `database/schema.sql` using the commands in `apps/caregiver-mobile/README.md`. Then run the API from the repository root:

```sh
cd services/api
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
export DATABASE_URL=postgresql://carebot:carebot_dev_password@localhost:5432/carebot
export CORS_ORIGINS=http://localhost:8080,http://127.0.0.1:8080
uvicorn carebot_api.main:app --app-dir src --reload --port 8000
```

The current vertical slice exposes:

- `GET /health` to verify the database connection
- `POST /api/patients` and `GET /api/patients` for the demo patient record
- `POST /api/medication-schedules` and `GET /api/medication-schedules` for caregiver schedules
- `DELETE /api/medication-schedules/{scheduleId}` to deactivate a schedule
- `POST /api/medication-events` to record a spoken reminder or patient response
- `GET /api/medication-events?patient_id=...&schedule_id=...&status=taken` for device dose checks
- `POST /api/device/touch` to atomically confirm the latest waiting reminder as taken
- `GET /api/device/schedules?patient_id=...` for the Raspberry Pi schedule reader

Initial endpoint groups:

- `POST /auth/*` for caregiver and provider authentication
- `GET/POST /patients/*` for authorized patient records
- `GET/POST /medications/*` for medication and schedule management
- `POST /medication-events` for device reports
- `GET /devices/{deviceId}/context` for the minimum voice-agent context
- `POST /alerts/escalate` for caregiver escalation

Keep device credentials separate from human user sessions. Validate every patient and medication identifier against the authenticated user’s permissions.

The implemented demo endpoints do not authenticate users or devices yet. Do not expose them to the public internet or use them with real medical data.
