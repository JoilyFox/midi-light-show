---
name: run-bridge
description: Start (or restart) the MIDI Light Show bridge server and verify a clean boot, then report the URL and MIDI port. Use when starting work, after code changes, or to confirm the bridge is healthy. Triggers on "run the bridge", "start the server", "restart the bridge".
---

# Run the bridge

Start the Node/TS control server and confirm it booted cleanly. Full operational detail lives in
`docs/RUNBOOK.md §1` — this skill is the repeatable health-checked start.

## Restart correctly (order matters)
Kill any stale process FIRST, then start — otherwise the OLD code keeps running on port 8080.
```bash
pkill -9 -f "src/server.ts" 2>/dev/null; sleep 1
PORT=8080 npm start
```
Run it in the background so the session stays interactive; watch the log for a clean boot.

## Clean-boot checklist
- [ ] Log prints `▶ http://localhost:8080` with no stack trace.
- [ ] No `EADDRINUSE` (means a stale process still owns 8080 — kill it and retry).
- [ ] Log shows the MIDI port line; it should auto-select the saved IAC port from `config/show.json`.
- [ ] `GET http://localhost:8080/api/midi/ports` returns the port list (bridge is serving).
- [ ] Optional: `GET /api/discover` lists the WiZ bulb(s) on the LAN.

## Troubleshooting
- Port in use → `lsof -ti:8080 | xargs kill -9`, then restart.
- MIDI port missing → enable the macOS **IAC Driver** in Audio MIDI Setup; re-open the MIDI tab.
- Bulb not found → `python3 scripts/wiz_discover.py` (see the `wiz-probe` skill).

Report back: the URL, the selected MIDI port, and any failed checklist item with its exact error.
