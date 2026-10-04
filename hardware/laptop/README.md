# Laptop voice hardware

For the prototype, the laptop temporarily provides the missing microphone and local audio output:

```text
laptop microphone → laptop_voice.py → Gemini → ElevenLabs → laptop speakers or Pi/JBL
```

The laptop and Raspberry Pi can share the caregiver API and the audio bridge over the same private Wi-Fi network. The Raspberry Pi remains responsible for the webcam and can read medication schedules through the device endpoint. This is a development setup; keep API keys on the laptop and do not expose the prototype API or audio bridge to the public internet.

## Microphone permissions on macOS

The first time the script records, macOS may ask for microphone access. Allow access for Terminal, iTerm, or the Python application that launches the script. If permission was denied, open **System Settings → Privacy & Security → Microphone** and enable the terminal application.
