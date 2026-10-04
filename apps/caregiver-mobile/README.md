# Caregiver schedule app

The browser app lets a caregiver enter a medication name, dose, reminder time, repeat days, and notes. It syncs schedules to the local API and PostgreSQL database. If the API is not running, it keeps a local browser-only fallback so the form remains usable during setup.

## Start PostgreSQL with Docker

From the repository root, start the development database and apply the schema once:

```sh
docker compose -f infra/docker-compose.yml up -d postgres
docker compose -f infra/docker-compose.yml exec -T postgres psql -U carebot -d carebot < database/schema.sql
```

## Start PostgreSQL without Docker (macOS)

Install PostgreSQL with Homebrew, start it as a local service, and create the same development database and user:

```sh
brew install postgresql@16
brew services start postgresql@16
export PG_BIN="$(brew --prefix postgresql@16)/bin"
"$PG_BIN/psql" postgres -c "CREATE ROLE carebot LOGIN PASSWORD 'carebot_dev_password';"
"$PG_BIN/createdb" -O carebot carebot
"$PG_BIN/psql" -U carebot -d carebot -f database/schema.sql
```

If PostgreSQL says the role or database already exists, continue with the schema command. On an Intel Mac, `brew --prefix` still supplies the correct path.

## Start the API

In a second terminal, from the repository root:

```sh
cd services/api
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
export DATABASE_URL=postgresql://carebot:carebot_dev_password@localhost:5432/carebot
export CORS_ORIGINS=http://localhost:8080,http://127.0.0.1:8080
uvicorn carebot_api.main:app --app-dir src --reload --port 8000
```

Keep this terminal open. The API is available at `http://localhost:8000`.

## Start the caregiver app

In a third terminal:

```sh
cd apps/caregiver-mobile
python3 -m http.server 8080
```

Open `http://localhost:8080` in a browser. The first load creates a demo patient, then medication schedules are stored in PostgreSQL.

## Open it on a phone or Raspberry Pi network

Run both servers on all network interfaces:

```sh
# API terminal
uvicorn carebot_api.main:app --app-dir src --host 0.0.0.0 --port 8000

# Caregiver app terminal
python3 -m http.server 8080 --bind 0.0.0.0
```

Find the laptop's private Wi-Fi IP address and open `http://YOUR_LAPTOP_IP:8080` on the phone. Set `CORS_ORIGINS=http://YOUR_LAPTOP_IP:8080` before starting the API. Keep the laptop, phone, and Pi on the same private network.

## Raspberry Pi schedule check

The Pi can read active schedules through the demo device endpoint:

```sh
curl http://localhost:8000/api/patients
CAREBOT_API_BASE_URL=http://YOUR_LAPTOP_IP:8000 \
CAREBOT_PATIENT_ID=PATIENT_UUID \
python pi/fetch_schedule.py
```

The endpoint is intentionally unauthenticated for this prototype. Add device authentication and caregiver login before using real patient data.
