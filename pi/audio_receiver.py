#!/usr/bin/env python3

"""Receive ElevenLabs MP3 audio from the laptop and play it through the JBL."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


MAX_AUDIO_BYTES = 10 * 1024 * 1024


def play_mp3(audio: bytes) -> None:
    player = next(
        (shutil.which(name) for name in ("ffplay", "mpg123", "mpv") if shutil.which(name)),
        None,
    )
    if player is None:
        raise RuntimeError("install ffmpeg, mpg123, or mpv to play MP3 audio")

    path = None
    try:
        with tempfile.NamedTemporaryFile(prefix="carebot-", suffix=".mp3", delete=False) as audio_file:
            audio_file.write(audio)
            path = audio_file.name

        if player.endswith("ffplay"):
            command = [player, "-nodisp", "-autoexit", "-loglevel", "quiet", path]
        elif player.endswith("mpg123"):
            command = [player, "-q", path]
        else:
            command = [player, "--no-video", "--really-quiet", path]
        playback_environment = os.environ.copy()
        if playback_environment.get("CAREBOT_AUDIO_SINK"):
            playback_environment["PULSE_SINK"] = playback_environment["CAREBOT_AUDIO_SINK"]
        subprocess.run(command, check=True, env=playback_environment)
    finally:
        if path:
            try:
                os.unlink(path)
            except FileNotFoundError:
                pass


class AudioHandler(BaseHTTPRequestHandler):
    server_version = "carebot-audio/0.1"

    def send_json(self, status: int, payload: dict[str, str]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self) -> None:  # noqa: N802 - required by BaseHTTPRequestHandler
        if self.path != "/play":
            self.send_json(404, {"error": "not found"})
            return

        expected_token = os.environ.get("CAREBOT_AUDIO_TOKEN", "")
        supplied_token = self.headers.get("X-Carebot-Audio-Token", "")
        if expected_token and supplied_token != expected_token:
            self.send_json(401, {"error": "invalid audio token"})
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.send_json(400, {"error": "invalid content length"})
            return
        if content_length <= 0 or content_length > MAX_AUDIO_BYTES:
            self.send_json(413, {"error": "audio must be between 1 byte and 10 MB"})
            return

        audio = self.rfile.read(content_length)
        if len(audio) != content_length:
            self.send_json(400, {"error": "incomplete audio body"})
            return

        try:
            play_mp3(audio)
        except (OSError, RuntimeError, subprocess.SubprocessError) as error:
            self.send_json(500, {"error": str(error)})
            return
        self.send_json(200, {"status": "played"})

    def log_message(self, format_string: str, *args: object) -> None:
        print(f"audio receiver: {format_string % args}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Play laptop voice responses through the Pi JBL")
    parser.add_argument("--host", default=os.environ.get("CAREBOT_AUDIO_HOST", "0.0.0.0"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("CAREBOT_AUDIO_PORT", "8765")))
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), AudioHandler)
    print(f"Listening for laptop audio on http://{args.host}:{args.port}/play")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping audio receiver.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
