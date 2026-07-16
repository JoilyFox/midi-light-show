# Session Log

Chronological progress journal for the MIDI Light Show project. Narrative companion to
`CLAUDE.md` (durable brief), `DECISIONS.md` (ADRs), `RESEARCH.md` / `MIDI-BRIDGE.md` / `ABLETON-MCP.md` (deep dives).
Newest at top. **New here? Read `docs/RUNBOOK.md` first** — it's the single continue-the-project entry point.

---

## 2026-06-29 — Session 2 (pulse action, Ableton control, full arrangement)

### Outcome
Ableton Live 12.4.2 now drives the lamp: a **16-bar A-minor arrangement** plays and its LIGHTS track pulses the bulb on
the beat (velocity = brightness). We build/edit Ableton **directly via the remote-script socket** (no Claude Code MCP).

### What happened
1. **`pulse` action** added to the bridge (fast attack → slow release; one note = a beat "flash with decay"). Verified on
   the real bulb. Also: `velocity → brightness` (Path C) and direct CC/note MCP tools (Path A) from the prior session.
2. **Two bulbs** discovered — `.195` and `.200`; switched all mappings to **`.200`** (the user's intended bulb).
3. **MIDI bugfixes:** `MidiInput` now uses a fresh `@julusian/midi` Input per open (reopen-deaf bug); and restarts must
   `pkill -9` the stale process first (silent `EADDRINUSE` left old code running — wasted real time, now documented).
4. **Ableton control breakthrough:** the `ableton` MCP kept failing to load (project `.mcp.json` pending-approval; tools
   only register at session start). Bypassed it by talking **straight to the AbletonMCP remote-script socket**
   (`localhost:9877`, raw JSON) via `scripts/ableton_ctl.py`. Pre-approved the MCP for future sessions
   (`.claude/settings.local.json`).
5. **Built the music** by socket: a beat clip → moved to Arrangement (`duplicate_session_clip_to_arrangement`) → full
   sectioned arrangement (`scripts/ableton_arrange.py`: PAD/BASSLINE/ARP/KEYS/808-DRUMS, Intro/Build/Full/Breakdown).
6. **Re-harmonized** (`scripts/ableton_fix.py`) after the first pass sounded atonal: clean **Am–F–C–G**, bass follows the
   roots, arp fed held chords. Confirmed clips **overwrite** on re-place (so we can edit arrangement without a delete cmd).

### Key learnings (also in RUNBOOK §4)
- Ableton socket is the reliable control path; `start_playback` returns `playing:False` spuriously (check `is_playing`);
  no delete but `duplicate_clip_to_arrangement` overwrites; **can't set track MIDI output routing via API** → the user
  does that one manual step (LIGHTS MIDI To → AbletonMCP Output/IAC).

### Wrote
`docs/RUNBOOK.md` (the continue-here doc), `scripts/ableton_ctl.py`/`ableton_arrange.py`/`ableton_fix.py`,
`experiments/beat_generator.mjs`/`sse_probe.mjs`/`sse_listen.mjs`/`sim_pulse.ts`. Updated bridge engine (pulse, velocity,
MIDI fix), UI (pulse action + Reference tab), and all docs.

## 2026-06-29 — Session 1 (scaffold → research → MVP → MIDI bridge → Ableton MCP, end-to-end working)

### Outcome
Working local pipeline proven **end-to-end**: **MIDI → IAC → bridge → mapping/fade engine → WiZ lamp**.
The real bulb (`192.168.0.195`) reacted to MIDI sent over IAC (confirmed live: turned green on command).

### What we built (in order)
1. **Project scaffold + rules** — `CLAUDE.md` (latency-is-boss prime directive, 10 rules, pluggable `FixtureDriver`),
   `docs/`, `scripts/` (python WiZ probes), `.claude/` skill (`wiz-probe`) + agent (`light-show-engineer`).
2. **Deep research** (`docs/RESEARCH.md`, cited) — verdict: **WiZ is great for scenes/moods but NOT for <50 ms
   beat-sync** (WiFi jitter + uncontrollable internal fade + undocumented rate ceiling). Tight sync ⇒ WLED/DDP or DMX.
   Decided stack: **TypeScript + Node `dgram` + Express + tsx**, output layer pluggable.
3. **Manual control MVP** — `src/drivers/wiz.ts` (fire-and-forget UDP), `src/server.ts`, `public/index.html`
   (Manual tab: on/off, color, brightness, white). Discovery found the real bulb.
4. **MIDI bridge** (`docs/MIDI-BRIDGE.md`, research-backed) — `@julusian/midi` input → `src/engine/showEngine.ts`
   (JSON mappings, per-binding trigger) → `src/engine/transitions.ts` (fade engine, **rate-cap ~22/s + send-on-change**
   so WiZ doesn't flicker) → driver. Config UI (MIDI tab): port select, live SSE monitor, **MIDI-Learn**, mapping editor.
   Persists to `config/show.json`. **Fade speed = `msPerUnit`** (10 → value100=1 s; 1000 → value100=100 s). Duration
   can come from the triggering CC, a fixed value, or a **second CC**.
5. **Ableton control (Live 12.4.2)** — researched MCP options; chose **ahujasid/ableton-mcp**, vendored at
   `vendor/ableton-mcp/` and **extended**: added `send_cc` / `send_cc_ramp` / `send_note` tools (remote-script
   `_send_midi` → Control Surface Output = IAC; Live's API can't author MIDI-CC clip envelopes, so we emit CC live).
   Telemetry made optional (no `supabase`). python3.12 venv + editable launcher. Remote script copied to
   `~/Music/Ableton/User Library/Remote Scripts/AbletonMCP/`. Registered as **project-scoped** MCP → `.mcp.json`.
6. **Path C** — bridge gained **velocity → brightness** (note loudness = level), tested.

### Verified this session
- `tsc` typecheck clean; server boots; manual API + discovery (real bulb) OK.
- Synthetic-MIDI sim: CC→color, Note→fade, velocity→brightness all correct; **send-on-change** holds a 0.5 s fade to
  ~12 packets.
- IAC online → bridge receives live MIDI over IAC (CC + notes) → mapping fired.
- **Live bulb test:** MIDI over IAC drove the real WiZ bulb green at full brightness. ✅

### State of the MCP
- ahujasid extended; `.mcp.json` in project root (project scope); shows ✔ Connected.
- **Tools load only after a Claude Code restart** (added mid-session).

### Open / next
- User to finish Ableton GUI: AbletonMCP control surface **Output = IAC**; then restart Claude Code to use `send_cc`
  etc. (Or pure-Ableton path: a MIDI track’s **MIDI To = IAC** + a note clip — no restart.)
- Roadmap (`docs/MIDI-BRIDGE.md`): perceptual gamma curve + single global fixed-step loop (quick wins) → Ableton Link
  beat-lock → HTP/LTP → scenes/banks → **Phase 2 hardware: ESP32 + WLED (DDP) driver** for real <50 ms beat sync.

### How to run
- Bridge: `npm install` → `npm start` → http://localhost:8080 (Manual / MIDI Bridge / Reference tabs).
- Ableton MCP launcher: `vendor/ableton-mcp/.venv/bin/ableton-mcp` (in `.mcp.json`).
- Starter mappings for the bulb live in `config/show.json` (CC20 color, CC21 brightness, CC22 fade, Note60 toggle,
  Note62 velocity-fade).
