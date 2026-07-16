#!/usr/bin/env python3
"""Direct client for the AbletonMCP remote script socket (localhost:9877).
Bypasses the Claude Code MCP layer — talks raw JSON to the remote script in Live.

Usage:
  python3 ableton_ctl.py info                 # get_session_info
  python3 ableton_ctl.py build-beat           # build a 60 BPM beat clip on a new track
"""
import socket, json, sys, time

HOST, PORT = "localhost", 9877


def send(cmd_type, params=None, timeout=15.0):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(timeout)
    s.connect((HOST, PORT))
    s.sendall(json.dumps({"type": cmd_type, "params": params or {}}).encode())
    chunks = []
    while True:
        chunk = s.recv(8192)
        if not chunk:
            break
        chunks.append(chunk)
        try:
            data = b"".join(chunks)
            resp = json.loads(data.decode())
            s.close()
            if resp.get("status") == "error":
                raise RuntimeError(resp.get("message", "unknown error"))
            return resp.get("result", {})
        except json.JSONDecodeError:
            continue
    s.close()
    raise RuntimeError("no/invalid response")


def info():
    r = send("get_session_info")
    print(json.dumps(r, indent=2)[:1500])


def build_beat():
    print("tempo -> 60");           print(send("set_tempo", {"tempo": 60.0}))
    print("create MIDI track");      tr = send("create_midi_track", {"index": -1}); print(tr)
    idx = tr.get("index")
    print("name it LIGHTS");         print(send("set_track_name", {"track_index": idx, "name": "LIGHTS"}))
    print("create 1-bar clip");      print(send("create_clip", {"track_index": idx, "clip_index": 0, "length": 4.0}))
    # 4 notes, one per beat; rising velocity so the pulse brightness varies
    notes = [
        {"pitch": 36, "start_time": 0.0, "duration": 0.25, "velocity": 110, "mute": False},
        {"pitch": 36, "start_time": 1.0, "duration": 0.25, "velocity": 70,  "mute": False},
        {"pitch": 36, "start_time": 2.0, "duration": 0.25, "velocity": 100, "mute": False},
        {"pitch": 36, "start_time": 3.0, "duration": 0.25, "velocity": 60,  "mute": False},
    ]
    print("add notes");             print(send("add_notes_to_clip", {"track_index": idx, "clip_index": 0, "notes": notes}))
    print("name the clip");         print(send("set_clip_name", {"track_index": idx, "clip_index": 0, "name": "Beat -> Lights"}))
    print(f"\nDONE. New track index {idx} ('LIGHTS') has a 4-note beat clip in slot 1.")
    print("Now route that track's MIDI To -> the IAC/AbletonMCP output, then press the clip's play.")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "info"
    try:
        if cmd == "info":
            info()
        elif cmd == "build-beat":
            build_beat()
        else:
            print("unknown command:", cmd)
    except Exception as e:
        print("ERROR:", e)
        sys.exit(1)
