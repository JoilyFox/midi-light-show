# RUNBOOK — continue the MIDI Light Show project here

Single entry point for any new conversation. Read this + `CLAUDE.md` first. Covers: what works now, how to
run it, every tool/script, the Ableton-control method, and the gotchas that cost time before.

---

## 0. One-paragraph status (2026-06-29)
A Node/TS **bridge** (`npm start` → http://localhost:8080) listens to MIDI on the macOS **IAC Driver Bus 1**, maps it to
**WiZ lamp** actions over UDP, and runs a fade/pulse engine. **Ableton Live 12.4.2** drives it: a **16-bar A-minor
arrangement** (Am–F–C–G) plays, and its **LIGHTS** track (routed to IAC) pulses the lamp on the beat with velocity =
brightness. We control Ableton **directly via the AbletonMCP remote-script socket** (`scripts/ableton_ctl.py`), not the
Claude Code MCP. Everything is verified working end-to-end.

---

## 1. Run / restart the bridge
```bash
cd "/Users/bohdan/Documents/Claude Agents/midi-light-show"
npm install            # first time only
npm start              # → http://localhost:8080   (Manual / MIDI Bridge / Reference tabs)
```
**Restart correctly (this bit a lot):**
```bash
pkill -9 -f "src/server.ts"; sleep 1     # kill stale process FIRST
PORT=8080 npm start                      # then start
```
Always **check the server log** for a clean boot. If you see `EADDRINUSE`, a stale process still owns 8080 and the OLD
code is running — kill it and retry. On boot it auto-selects the saved MIDI port (IAC) from `config/show.json`.

Verify the bridge hears Ableton (while a clip plays):
```bash
node experiments/sse_listen.mjs          # prints MIDI events the bridge receives over IAC for 4s
```

---

## 2. The bridge (what it does)
- **Stack:** TypeScript + Node `dgram` (WiZ UDP) + Express + `@julusian/midi` + `tsx`. UI = vanilla JS.
- **Flow:** MIDI in (IAC) → mappings (`config/show.json`) → fade/pulse engine (rate-limited + send-on-change) → WiZ driver
  (fire-and-forget UDP 38899). All behind a pluggable `FixtureDriver` (so WLED/DMX can slot in later — see RESEARCH.md).
- **Source map:** `src/midi/input.ts` (MIDI, **fresh Input per open** — reopening a port goes deaf), `src/engine/
  showEngine.ts` (mappings), `src/engine/transitions.ts` (fades/pulse, rate cap ~22/s + send-on-change so WiZ doesn't
  flicker), `src/drivers/wiz.ts` (driver), `src/server.ts` (API + SSE), `public/index.html` (UI).
- **Actions:** `fade`, `toggle`, `color`, `brightness`, `temp`, `pulse`.
  - **pulse** = fast attack (`attackMs`, default 40) → slow release (`releaseMs`, default 800; set ≈ one beat = 60000/BPM).
  - **Fade speed** indexed by `msPerUnit` (10 → value 100 = 1 s; 1000 → value 100 = 100 s).
  - Modifiers: `trigger` (press≥64 / release / change), `targetSource` (fixed % | note velocity), `durationSource`
    (value | fixed | another CC), `curve` (linear/easeIn/easeOut), channel/number (null = any).
- **API:** `GET /api/discover`, `GET/POST /api/state`, `GET /api/midi/ports`, `POST /api/midi/select`,
  `GET/PUT /api/mappings`, `GET /api/midi/stream` (SSE). Mappings persist to `config/show.json`.
- **Reference tab** in the UI documents all commands live (reads current mappings).

## 3. The lamps (WiZ, local UDP 38899)
Two bulbs on the LAN:
- `192.168.0.195` — ESP03_SHRGB1W_01
- **`192.168.0.200`** — ESP24_SHRGBC_01 — **the one in use** (all mappings target it).

Current mappings (`config/show.json`): **any note → pulse** (peak from velocity, attack 40 ms, release 1000 ms, easeOut)
· **CC20 → color** (hue from value) · **CC21 → brightness**. Change via the MIDI Bridge tab or `PUT /api/mappings`.

To switch bulb / re-probe: `python3 scripts/wiz_discover.py` (lists all) and `python3 scripts/wiz_latency.py <ip>`.

## 4. Controlling Ableton — THE method (no Claude Code restart needed)
The Claude Code `ableton` MCP works but is fragile (project `.mcp.json` needs trust approval; tools only load at session
start). **Instead, talk straight to the AbletonMCP remote-script socket** — works any time the AbletonMCP control surface
is selected in Live:
- **Server:** `localhost:9877`, raw JSON `{"type": "...", "params": {...}}`, read the socket until the bytes parse as
  JSON. Helper: `scripts/ableton_ctl.py` → `from ableton_ctl import send; send("get_session_info")`.
- **Build helpers:** `python3 scripts/ableton_ctl.py info` (session), `... build-beat` (note clip),
  `scripts/ableton_arrange.py` (full arrangement), `scripts/ableton_fix.py` (re-harmonize).

**Useful commands** (params): `get_session_info`, `get_track_info{track_index}`, `create_midi_track{index:-1}`,
`set_track_name{track_index,name}`, `load_browser_item{track_index,item_uri}` (uri from
`get_browser_items_at_path{path:'Sounds/<Category>'}` or `'Drums'`), `create_clip{track_index,clip_index,length}`,
`add_notes_to_clip{track_index,clip_index,notes:[{pitch,start_time,duration,velocity,mute}]}`,
`set_clip_name`, `duplicate_session_clip_to_arrangement{track_index,clip_index,destination_time}` (beats),
`get_arrangement_clips{track_index}`, `fire_clip`, `stop_clip`, `start_playback`, `stop_playback`,
`set_tempo{tempo}`, `set_current_song_time{time}`, `switch_to_arrangement_view`, plus our added
`send_midi{messages:[[status,d1,d2]]}` (the basis of send_cc/send_note in the MCP).

**Ableton gotchas (learned the hard way):**
- `start_playback` returns `{playing: False}` spuriously — confirm with `get_session_info().is_playing`.
- **No delete** command for tracks/clips. BUT `duplicate_session_clip_to_arrangement` **OVERWRITES** the region it lands
  on — so to "edit" arrangement content, build a fresh clip (use a spare slot, e.g. clip_index 1) and re-place it at the
  same beats; a 4-bar clip overwrites the four 1-bar clips beneath it.
- **Cannot set a track's MIDI output routing via the Live API** → the user must do that ONE manual step (below).
- Note format times are in **beats**; 1 bar = 4 beats at 4/4.

## 5. The ONE manual step (only the user can do it)
For the lamp to react, the **LIGHTS** track's MIDI output must reach IAC. In Live (already set up, but if it breaks):
1. Settings → Tempo & MIDI → **Output Ports** → tick **Track** on **AbletonMCP Output (IAC Driver Bus 1)**.
2. LIGHTS track **MIDI To → AbletonMCP Output**, Ch 1.
(AbletonMCP control surface Output = IAC; IAC input Track enabled. The remote-script socket is independent of these.)

## 6. Current Ableton project state
Tempo **60 BPM**, 16 bars, key **A minor (Am F C G)**. Tracks:
`4 LIGHTS` (→IAC, pulses lamp, all 16 bars) · `5 BASS` (Amber Low Glow, root pulse follows chords) ·
`6 PAD` (After Glow) · `7 SUB` (Analog Bass, held sub) · `8 ARP` (Bad Maths Arp, fed held chords) ·
`9 KEYS` (Clav Clean melody) · `10 DRUMS` (808 Core Kit, bars 5-12).
Sections: Intro 1-4 → Build 5-8 → Full 9-12 → Breakdown 13-16. (Tracks 0-3 are the user's empty starter tracks.)

## 7. Tools / scripts index
- `scripts/wiz_discover.py`, `scripts/wiz_latency.py` — WiZ LAN probes.
- `scripts/ableton_ctl.py` — Ableton socket client (`send()`, `info`, `build-beat`).
- `scripts/ableton_arrange.py` — build a full sectioned arrangement.
- `scripts/ableton_fix.py` — re-harmonize / overwrite arrangement clips.
- `experiments/sim_midi.ts`, `sim_pulse.ts` — offline engine sims (no hardware).
- `experiments/send_to_iac.mjs`, `demo_bulb.mjs`, `beat_generator.mjs` — push MIDI into IAC (drive lamp without Ableton).
- `experiments/sse_probe.mjs`, `sse_listen.mjs` — confirm the bridge receives IAC MIDI.
- `.claude/skills/wiz-probe/` — WiZ API cheat-sheet. `.claude/agents/light-show-engineer.md` — project agent.

## 8. Docs map
- `CLAUDE.md` — durable brief + rules. `docs/RESEARCH.md` — WiZ/latency findings (WiZ = scenes, WLED/DMX = tight sync).
- `docs/MIDI-BRIDGE.md` — bridge best-practices + roadmap. `docs/ABLETON-MCP.md` — MCP setup/extension.
- `docs/DECISIONS.md` — ADR log. `docs/SESSION-LOG.md` — chronological progress. `docs/HARDWARE.md` — buy list (UA).

## 9. Roadmap / next ideas
Perceptual gamma curve + single global fixed-step loop → per-section light color changes (CC automation) → Ableton Link
beat-lock → **Phase 2 hardware: ESP32 + WLED (DDP)** for real <50 ms beat sync (WiZ stays scene/mood). Sound swaps
(softer keys/arp), longer arrangement, light "melodies" mapped to specific notes/colors.
