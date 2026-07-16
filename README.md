# MIDI Light Show 🎛️💡

Control smart lamps / LED fixtures over local WiFi to perform **live light-music shows synced to a DAW** (Ableton Live / Cubase) via MIDI — no hard-wiring.

**Goal:** tight, on-the-beat sync (**<~50 ms** end-to-end).

## Status: Phase 1 — manual MVP + MIDI bridge ✅

| Area | State |
|------|-------|
| Project context (`CLAUDE.md`) | ✅ written |
| Deep research (`docs/RESEARCH.md`) | ✅ done |
| WiZ local-control MVP (UI + server) | ✅ built & tested |
| MIDI → light bridge + config UI | ✅ built & tested (`docs/MIDI-BRIDGE.md`) |
| Hardware decision (ESP32/WLED) | ✅ researched (`docs/HARDWARE.md`) |

## Run the control panel

```bash
npm install        # first time
npm start          # → http://localhost:8080  (or: npm run dev to auto-reload)
```

**Manual tab:** Discover → pick your WiZ bulb → on/off, color picker, brightness, swatches, white presets. Local UDP, no cloud.

**MIDI Bridge tab:** pick a MIDI input → **Learn** a control → map it to an action.
- Actions: **Fade / On-Off**, **Toggle**, **Color** (hue-from-value or fixed), **Brightness**, **White temp**.
- Fade speed is indexed by **ms per unit**: `10` → value 100 = **1 s** (on/off feel), `1000` → value 100 = **100 s** (slow fade).
- Fade time can come from the triggering control, a fixed value, or **a second CC** ("time depends on another knob").
- Engine rate-limits + send-on-change so WiZ doesn't flicker. Mappings persist to `config/show.json`.

**Drive it from a DAW:** enable the macOS **IAC Driver** (Audio MIDI Setup → MIDI Studio), point Ableton/Cubase
MIDI-out at the IAC bus, then select it in the MIDI tab.

**Stack:** TypeScript + Node (`dgram` UDP) + Express + `tsx`; vanilla-JS UI. The WiZ logic lives behind a
pluggable `FixtureDriver` (`src/types.ts`) so WLED/DMX drivers slot in later without touching the UI/engine.

## Quick orientation

- **Start here:** [`CLAUDE.md`](./CLAUDE.md) — full context, architecture, rules.
- **Findings & decisions:** [`docs/RESEARCH.md`](./docs/RESEARCH.md), [`docs/DECISIONS.md`](./docs/DECISIONS.md).
- **Hardware:** [`docs/HARDWARE.md`](./docs/HARDWARE.md).
- **Design:** [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## The idea in one diagram

```
DAW (Ableton/Cubase) ──MIDI──▶ virtual port (IAC) ──▶ controller app ──UDP/LAN──▶ lamps
   notes / CC / clock                                  (map + rate-limit)         WiZ → WLED → DMX
```

## Hardware on hand

- 1× **WiZ Colors A60 E27 RGB** (Signify/Philips `9290023836A`) — currently on Google Home; has a local UDP API (port 38899).

## Next steps

1. Finish deep research → fill `docs/RESEARCH.md`.
2. Spike: discover the WiZ bulb on LAN + measure local UDP round-trip latency (`scripts/`).
3. Go/no-go on WiZ for tight sync; pick the show-device default.
4. MIDI bridge spike (IAC → color change).
