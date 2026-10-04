# JBL speaker speech test

This prototype makes the Raspberry Pi generate speech locally and play it through a paired JBL Bluetooth speaker. It does not require Google Home or Cast, and it does not send audio to the internet.

## Set up on the Raspberry Pi

Raspberry Pi OS Desktop is easiest because it provides Bluetooth and audio controls. Raspberry Pi OS Lite also works, but audio routing may require additional setup.

Install the local text-to-speech engine and PulseAudio-compatible playback tools:

```sh
sudo apt update
sudo apt install -y espeak-ng pulseaudio-utils bluez python3-venv ffmpeg
cd ~/StormHacks-26/pi
python3 -m venv .venv
source .venv/bin/activate
```

The Python program uses only the standard library, so `requirements.txt` does not install additional packages.

## Pair the JBL speaker

Turn on the JBL speaker and press its Bluetooth button until it enters pairing mode. On Raspberry Pi OS Desktop, use the Bluetooth menu to pair it.

For a terminal-only setup:

```sh
sudo systemctl enable --now bluetooth
bluetoothctl
```

Inside `bluetoothctl`, run:

```text
power on
agent on
default-agent
scan on
```

Wait for the JBL speaker to appear. Copy its Bluetooth address and run:

```text
pair AA:BB:CC:DD:EE:FF
trust AA:BB:CC:DD:EE:FF
connect AA:BB:CC:DD:EE:FF
quit
```

Replace the example address with the address shown for your speaker. On the desktop, select the JBL as the Pi's audio output after pairing.

## Check the audio output

Activate the virtual environment and list the outputs detected by the Pi:

```sh
cd ~/StormHacks-26/pi
source .venv/bin/activate
python speak_jbl.py --list-devices
```

You should see a JBL or `bluez_output` device. If more than one output is listed, use part of the JBL name:

```sh
python speak_jbl.py --device JBL "This is a speaker test from the Raspberry Pi."
```

If there is exactly one Bluetooth audio output, the `--device` option can be omitted:

```sh
python speak_jbl.py "Hello. This is a speaker test from the Raspberry Pi."
```

You can save a matching device name for later commands:

```sh
echo 'export JBL_SPEAKER_NAME="JBL"' >> ~/.bashrc
source ~/.bashrc
```

The script creates a temporary WAV file, plays it through the selected audio sink, and deletes the file when playback finishes.

## Keep the JBL paired to the Pi

If the laptop is providing the microphone but the JBL should remain paired to the Pi, run the audio bridge on the Pi:

```sh
cd ~/StormHacks-26
CAREBOT_AUDIO_TOKEN="choose-a-shared-token" python3 pi/audio_receiver.py
```

Make sure the JBL is the Pi's default Bluetooth audio output. Find the Pi's private Wi-Fi address with `hostname -I`. On the laptop, set:

```sh
export CAREBOT_PI_AUDIO_URL=http://PI_IP:8765/play
export CAREBOT_AUDIO_TOKEN="choose-a-shared-token"
```

If the Pi has multiple audio outputs, set `CAREBOT_AUDIO_SINK` on the Pi to the JBL sink name shown by `python3 pi/speak_jbl.py --list-devices`.

The laptop voice agent sends the ElevenLabs MP3 to the Pi, and the Pi plays it through its default output (the JBL). The reminder loop can also record a `reminded` medication event through the API after playback. Keep both computers on the same private network. This prototype bridge is intended for a trusted local network only.

## Read schedules from the caregiver API

When the API is running on the laptop, the Pi can fetch active schedules over the same private network. Start the API with `--host 0.0.0.0`, find the demo patient's UUID with `curl http://LAPTOP_IP:8000/api/patients`, then run:

```sh
cd ~/StormHacks-26
CAREBOT_API_BASE_URL=http://LAPTOP_IP:8000 \
CAREBOT_PATIENT_ID=PATIENT_UUID \
python3 pi/fetch_schedule.py
```

This prints JSON that the reminder loop can use to decide when to call `speak_jbl.py`. The endpoint is a prototype and currently has no device authentication.

## Confirm a dose with a touch sensor

The database already models `reminded`, `taken`, and `unanswered` medication events, so no extra boolean column is needed. If your board is the Seeed Grove Base Hat, plug a 3.3 V-compatible Grove touch sensor into the digital `D16` socket. `D16` is BCM GPIO16; do not use a 5 V Grove sensor with this HAT.

Install GPIO support and run the monitor:

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

The monitor calls `/api/device/touch`. When a current reminder is waiting, the API records a `taken` event and the monitor plays a confirmation jingle through the JBL. A reminder without a touch for one hour is recorded as `unanswered` by `reminder_loop.py`; the caregiver app polls and displays it under **Needs attention**.

## Troubleshooting

- If no JBL device appears, put the speaker back into pairing mode and run `bluetoothctl` again.
- If it is paired but not listed by `--list-devices`, select it as the Pi's output in the desktop audio menu or restart the Bluetooth connection.
- If `pactl` or `paplay` is missing, run `sudo apt install -y pulseaudio-utils`.
- If the Pi is on a restricted network, that does not affect Bluetooth playback. Network access is still needed for SSH, package installation, or a future caregiver-app sync.
