# MIDI Light Show — Project Context (CLAUDE.md)

> **Read this first.** This file is the durable brief for current and future contexts.
> If anything here conflicts with a quick assumption, this file wins. Keep it updated as the project evolves.
>
> 👉 **Continuing in a new conversation? Start with [`docs/RUNBOOK.md`](docs/RUNBOOK.md)** — it has the live status,
> how to run/restart the bridge, every tool/script, the Ableton-via-socket control method, and the time-saving gotchas.

## 1. What we're building

A system that controls smart lamps / LED fixtures **over local WiFi/LAN** so they react to
**MIDI commands coming from a DAW** (Ableton Live and/or Cubase), to perform **live "light music" shows**
— color, brightness, and effects choreographed to music **without hard-wiring** the lights.

Two horizons:
- **Now (exploration / phase 0–1):** Prove we can control the user's existing **WiZ Colors** bulb locally
  with the lowest latency possible, and bridge MIDI → lamp commands.
- **Future:** A small rig (multiple fixtures) driven from the DAW for real beat-synced shows.

## 2. The hard constraint: latency

**Target: tight, on-the-beat sync — under ~50 ms end-to-end** (MIDI event → visible light change).
This is the single most important success criterion. Every design decision is judged against it.

Latency budget is the sum of: DAW MIDI out → virtual MIDI port → controller app processing →
network send → device receive → device internal processing/PWM/fade → photons.
Consumer WiFi bulbs add jitter and have firmware-side rate limits and fade-smoothing that eat into this budget.
**Do not assume <50 ms is achievable on WiZ until measured.** See `docs/RESEARCH.md` for findings.

## 3. The user

- Backend developer (NestJS/TypeScript background), comfortable with services & APIs.
- On **macOS**.
- DAWs: **Ableton Live** and **Cubase** (either may be used).
- Musician building this for live performance, not just tinkering.
- Stack preference: **open — recommend the best tool for sub-50 ms** (Python vs Node decided by research, see below).

## 4. Hardware in hand

- **1× WiZ Colors A60 E27 RGB bulb** — Signify (Philips) model `9290023836A`, 8 W, 2200–6500K + RGB, 806 lm,
  220–240 V. Currently paired and controlled through **Google Home**.
- WiZ bulbs expose a **local UDP JSON API on port 38899** (`setPilot`/`getPilot`/`getSystemConfig`) that works
  on-LAN without the cloud. Google Home pairing does **not** have to block local control (verify in RESEARCH).

## 5. Architecture (working model — refine after research)

```
┌────────────┐   MIDI    ┌──────────────┐  parsed cues  ┌─────────────────┐  UDP/LAN  ┌──────────┐
│ Ableton /  │ ───────▶ │ Virtual MIDI │ ───────────▶ │  Controller app │ ───────▶ │ Fixtures │
│ Cubase     │  notes/  │ port (IAC on │   note/CC →   │  (mapping +     │  setPilot │ WiZ /    │
│            │  CC/clock│  macOS)      │   color/level │   scheduler)    │  / DDP /  │ WLED /   │
└────────────┘          └──────────────┘               └─────────────────┘  Art-Net  │ DMX node │
                                                                                      └──────────┘
```

- **MIDI source:** DAW sends notes/CC/clock out a **virtual MIDI port** (macOS **IAC Driver**, or `loopMIDI`-equivalent).
- **Mapping layer:** notes → fixture/scene, CC → brightness/hue/effect param, MIDI clock or **Ableton Link** → beat timing.
- **Output layer (pluggable):** start with WiZ local UDP; design so the same cue engine can target
  **WLED (DDP/UDP-realtime)**, **sACN/E1.31**, or **Art-Net→DMX** later. The output protocol is an adapter.

> **Design principle:** Keep the **cue/mapping engine protocol-agnostic.** Fixtures are drivers behind an interface.
> This lets us swap WiZ → WLED/DMX without rewriting the show logic when we hit latency limits.

## 6. Likely tech directions (confirm against RESEARCH.md before committing)

- **Python path:** `pywizlight` (mature WiZ local UDP) + `mido`/`python-rtmidi` for MIDI. Fastest to prototype.
- **Node/TS path:** matches user background; WiZ via raw UDP `dgram` + `JZZ`/`easymidi`. Better for a long-lived service.
- For tight sync, the protocol and the device matter more than the language. WiZ is the bottleneck, not Python vs Node.

## 7. Repo layout

```
midi-light-show/
├── CLAUDE.md            ← this file (durable context + rules)
├── README.md            ← human-facing quickstart & status
├── docs/
│   ├── RESEARCH.md      ← cited findings from deep research (latency, rate limits, hardware) — SOURCE OF TRUTH for decisions
│   ├── HARDWARE.md      ← what we own, what to buy, budget tiers
│   ├── ARCHITECTURE.md  ← detailed design, adapters, latency budget
│   ├── DECISIONS.md     ← running log of decisions + rationale (ADR-lite)
│   ├── RUNBOOK.md       ← "continue here" — live status, run/restart, tools
│   └── concepts/        ← atomic concept-note knowledge base (_SCHEMA + _MAP)
├── src/                 ← engine source (MIDI → mappings → fade engine → WiZ driver)
├── web/                 ← Vue 3 + Vite SPA — Filament UI + component library
├── scripts/             ← probes/spikes (e.g. discover WiZ bulb, ping latency test)
├── experiments/         ← throwaway latency measurements, logs, captures
└── .claude/
    ├── skills/          ← project skills (wiz-probe, sync-docs, run-bridge, latency-audit)
    ├── hooks/           ← guard hooks (block-dangerous-bash, gitleaks commit-gate, docs-staleness)
    └── agents/          ← project agents (light-show-engineer)
```

## 8. Working rules (for any Claude/agent in this repo)

1. **Latency is the boss.** When in doubt, choose the lower-latency / lower-jitter option, even if it's more work.
   Always state expected latency impact of a change.
2. **Measure, don't guess.** Before claiming a latency or rate-limit number, measure it (real device or cited source).
   Put numbers in `experiments/` with the method used.
3. **RESEARCH.md is the source of truth** for device behavior, latency, and rate limits. If reality contradicts it, update it.
4. **Keep the output layer pluggable.** Never hard-couple show logic to WiZ. New device = new adapter behind the interface.
5. **Respect device rate limits.** WiZ firmware throttles/drops on flooding. The controller must rate-limit and coalesce
   commands per device (send latest state, drop stale) — never blast every MIDI tick to the bulb.
6. **Don't break the user's existing setup** silently. The bulb is also used via Google Home; note any pairing/network changes.
7. **No cloud in the hot path.** All show-time control is local LAN only. Cloud is acceptable only for one-time setup.
8. **Honest trade-offs.** When WiZ can't meet the goal, say so plainly and recommend the alternative with pros/cons.
9. Prefer **small, runnable spikes** over big designs. A working latency probe beats a paragraph of theory.
10. Update **DECISIONS.md** whenever a non-obvious choice is made (protocol, library, hardware).

## 9. Research verdict (2026-06-29) — see `docs/RESEARCH.md` for cited detail

- **WiZ local control works, cloud-free** (UDP 38899; "Local Control" on by default → Google Home not required).
- **WiZ is NOT the tight-sync engine.** WiFi jitter + uncontrollable internal fade (transition speed isn't settable via
  UDP) + undocumented firmware rate ceiling ⇒ good for **scenes/moods/slow fades**, not on-the-beat hits.
- **Tight-sync path = WLED on ESP32 + addressable LEDs over DDP/DRGB/sACN** (target 40 fps/25 ms; wired ESP32 to beat
  50 ms reliably). DMX via QLC+/Art-Net for "real fixtures."
- **Baseline bridge:** DAW → macOS **IAC** virtual MIDI → **QLC+/Chataigne** → Art-Net/sACN/DDP → WLED/DMX. Cubase uses
  generic MIDI via IAC.

### Remaining items to confirm by YOUR measurement
- [ ] Real WiZ UDP round-trip + visible-change latency on your LAN (`scripts/wiz_latency.py` + slow-mo camera).
- [ ] WiZ practical max command rate before lag/de-sync (sweep `hz` in the probe).
- [ ] WLED DDP end-to-end latency once an ESP32 is in hand (the number that matters for the show).
- [ ] Final language/stack decision (Python vs Node) — record in DECISIONS.md after the WiZ spike.

## 10. Status

- **App build (2026-07) — Filament console ✅ (app-plan Phases 0–7 COMPLETE):**
  - **Docs KB + tooling (Phase 0):** `docs/concepts/` concept notes (`_SCHEMA`/`_MAP`/`sources-index`); Claude Code
    hooks (`block-dangerous-bash`, gitleaks `commit-gate`, `docs-staleness` nudge); skills (`sync-docs`, `run-bridge`,
    `latency-audit`); Prettier/editorconfig/nvmrc + scoped permissions. Reconcile docs with `/sync-docs`.
  - **Filament design system (Phase 1–2):** documented in `docs/concepts/04-design-system/`, implemented in `web/`
    as a **Vue 3 + Vite + Tailwind v4** component library + `/components` showcase.
  - **Fixture inventory (Phase 3):** persisted `fixtures`/`groups` in `config/show.json` with **stable IP-independent
    ids**; CRUD API (`/api/fixtures`, `/api/groups`), discover-merge, blink-identify; mappings target `fx_`/`grp_`/IP/`*`
    via `resolveTargets`; one-time legacy migration. See `docs/concepts/02-engine/fixture-inventory.md`.
  - **Console SPA (Phase 4–6):** shell (left rail + status bar + hash router + reactive store + typed API client) with
    four screens — **Rig** (fixture/group CRUD, discover, identify), **Play** (manual power/brightness/color/temp/flash,
    WiZ-safe throttled sends, live tiles), **Map** (mapping editor + MIDI-Learn), **Log** (live MIDI monitor + port
    select). Live output streamed via a `fixtureState` SSE channel (`docs/concepts/02-engine/live-output-stream.md`,
    `05-ui/console-app-structure.md`, `05-ui/midi-mapping-ui.md`).
  - **Integration (Phase 7):** the engine serves the built SPA (`web/dist`) at **:8080** (falls back to legacy
    `public/`). Run everything with **`npm run serve`** (builds the SPA + starts the engine). Dev with hot-reload:
    `npm start` + `cd web && npm run dev` (:5173, proxies `/api`).
  - **Git:** repo at **github.com/JoilyFox/midi-light-show** (`main`); push over **HTTPS via `gh`**, not SSH (see
    DECISIONS 2026-07-16). `vendor/`, `config/`, `web/dist/`, `.claude/settings.local.json` gitignored.
  - **Next:** Ableton Link beat-lock → Phase 2 hardware (ESP32 + WLED/DDP driver) for real <50 ms beat sync.
- **Phase 0 ✅:** Scaffold + deep research done (`docs/RESEARCH.md`). Verdict above.
- **Phase 1 ✅ (manual MVP + MIDI bridge built):** TypeScript/Node controller. `npm install` then `npm start`
  → http://localhost:8080. Two tabs: **Manual** (on/off, color, brightness, white) and **MIDI Bridge**
  (port select, live monitor, MIDI-Learn, mapping editor). Engine: MIDI → mappings → fade engine (rate-cap +
  send-on-change) → WiZ driver, all behind the pluggable `FixtureDriver`. Config persists to `config/show.json`.
  Real bulb discovered at `192.168.0.195`. Fade speed indexed by `msPerUnit` (10 → val100=1s; 1000 → val100=100s).
  See `docs/MIDI-BRIDGE.md` for design + roadmap.
- **Next (roadmap, docs/MIDI-BRIDGE.md):** perceptual gamma curve + single global fixed-step loop (quick wins) →
  Ableton Link beat-lock → then Phase 2 hardware: ESP32 + WLED (DDP) driver for actual <50 ms beat sync.
- **Ableton control (Live 12.4.2) ✅:** ahujasid/ableton-mcp vendored at `vendor/ableton-mcp/` and **extended** with
  `send_cc` / `send_cc_ramp` / `send_note` (direct MIDI-out → Control Surface Output = IAC). Bridge gained
  **velocity→brightness**. MCP registered with Claude Code (`ableton`). See `docs/ABLETON-MCP.md`. Remaining = user's
  one-time Ableton GUI setup (select AbletonMCP control surface, set Output→IAC; enable IAC) + **restart Claude Code**
  to load the `ableton` tools. Live's API can't author MIDI-CC clip envelopes → we emit CC live (Path A) + use
  velocity-encoded note clips for song-synced shows (Path C).
- **To run live with a DAW:** enable macOS **IAC Driver** (Audio MIDI Setup), point Ableton/Cubase MIDI-out at it,
  pick it on the **Log** screen, then Learn + map a control on **Map**. (WiZ stays a scene/mood device — tight beat
  hits await WLED.)

---
_Last updated: 2026-07-17. Keep §9 and §10 current._
