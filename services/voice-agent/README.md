# Voice agent

## Laptop microphone prototype

The first runnable voice loop uses the laptop microphone instead of a missing bedside microphone. It records one question with a simple voice-activity detector, sends the WAV audio to Gemini for understanding and an answer, sends that answer to ElevenLabs for text-to-speech, and plays the returned MP3 through the laptop or the Pi's JBL audio bridge.

From the repository root:

```sh
cd services/voice-agent
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
# Only if sounddevice reports that PortAudio is missing:
brew install portaudio
export GEMINI_API_KEY="your-gemini-key"
export ELEVENLABS_API_KEY="your-elevenlabs-key"
export ELEVENLABS_VOICE_ID="your-voice-id"
python laptop_voice.py
```

Press Enter, ask a question, and wait for the answer. Use `Control-C` to quit. To process one question and exit, add `--once`.

On macOS, allow microphone access for Terminal or iTerm under **System Settings → Privacy & Security → Microphone**. Gemini receives a short recorded clip rather than a continuous stream; the loop stops after it detects silence.

If the caregiver API is running, provide the patient context too:

```sh
export CAREBOT_API_BASE_URL=http://LAPTOP_IP:8000
export CAREBOT_PATIENT_ID=PATIENT_UUID
```

For JBL output, choose one of these options:

- Pair the JBL to the laptop and select it as the laptop's default output. No extra setting is needed.
- Keep the JBL paired to the Pi, start `pi/audio_receiver.py` on the Pi, and point the laptop at it:

```sh
export CAREBOT_PI_AUDIO_URL=http://PI_IP:8765/play
export CAREBOT_AUDIO_TOKEN="choose-a-shared-token"
python laptop_voice.py
```

The second option sends the ElevenLabs MP3 across the private network to the Pi's JBL audio bridge. The bridge is unauthenticated unless `CAREBOT_AUDIO_TOKEN` is configured, so use it only on a trusted local network.

## Automatic medication reminders

Once the API and Pi audio bridge are running, the laptop can poll the active PostgreSQL-backed schedules and announce due doses:

```sh
export CAREBOT_API_BASE_URL=http://localhost:8000
export CAREBOT_PATIENT_ID=PATIENT_UUID
export CAREBOT_PI_AUDIO_URL=http://192.168.2.2:8765/play
export CAREBOT_AUDIO_TOKEN="choose-a-shared-token"
python reminder_loop.py
```

Add a schedule in the caregiver app for the current local time and selected day to test it. The loop checks every 10 seconds, calls ElevenLabs when a schedule is due, sends the audio to the Pi/JBL bridge, and records a `reminded` event through the API. Keep this process running for the prototype; later it should become a supervised device service.

The voice agent will eventually contain the bedside Python runtime. Suggested modules:

```text
src/carebot_voice/
  main.py                  Process lifecycle and event loop
  config.py                Environment configuration
  audio/
    input.py               Microphone capture
    output.py              JBL/Pi audio output
  wake_word/
    detector.py            Local OpenWakeWord inference
  realtime/
    client.py              OpenAI Realtime WebSocket session
    tools.py               Medication and escalation tools
  medication/
    barcode.py             QR/barcode capture and lookup
    schedule.py            Due-dose rules
  device/
    api_client.py          Authenticated backend client
```

The existing `pi/speak_jbl.py` is the first audio-output prototype. Move or reuse its playback logic when the full agent is introduced.
