# MIDI Light Show 🎛️💡

Control smart lamps / LED fixtures over local WiFi to perform **live light-music shows synced to a DAW** (Ableton Live / Cubase) via MIDI — no hard-wiring.

**Goal:** tight, on-the-beat sync (**<~50 ms** end-to-end).

## Status: Filament console ✅ (engine + full 4-screen UI)

| Area | State |
|------|-------|
| Project context (`CLAUDE.md`) | ✅ written |
| Deep research (`docs/RESEARCH.md`) | ✅ done |
| WiZ local-control engine + MIDI bridge | ✅ built & tested (`docs/MIDI-BRIDGE.md`) |
| Fixture inventory + groups (stable ids) | ✅ built & tested |
| **Filament** design system + Vue 3 SPA | ✅ Rig · Play · Map · Log |
| Hardware decision (ESP32/WLED) | ✅ researched (`docs/HARDWARE.md`) |

## Run it

```bash
npm install          # first time (engine deps)
npm run serve        # build the SPA + start the engine → http://localhost:8080
```

`npm run serve` builds the Filament UI (`web/`) and serves it from the engine at **http://localhost:8080**.
For UI development with hot-reload, run the engine (`npm start`) and Vite together (`cd web && npm run dev`
→ http://localhost:5173, which proxies `/api` to the engine).

### The console (four screens)
- **Rig** — your fixtures + groups. Discover on the LAN, add/edit by hand, blink-to-identify. Fixtures have a
  **stable id** independent of their IP, so DHCP moves don't break your show.
- **Play** — manual control of any fixture / group / all: power, brightness, color, white temp, flash. Tiles
  glow with the real live color (streamed over SSE). Slider sends are throttled so WiZ isn't flooded.
- **Map** — MIDI → light mappings with **MIDI-Learn**: Fade, Toggle, Pulse, Color, Brightness, White temp.
  Target a fixture, a group, or all. Fade speed indexed by **ms per unit** (`10` → value 100 = 1 s; `1000` →
  100 s); duration can come from the control, a fixed value, or a second CC.
- **Log** — live MIDI monitor + input-port picker.

**Drive it from a DAW:** enable the macOS **IAC Driver** (Audio MIDI Setup → MIDI Studio), point Ableton/Cubase
MIDI-out at the IAC bus, then pick it on the **Log** screen.

**Stack:** engine = TypeScript + Node (`dgram` UDP) + Express + `tsx`; UI = Vue 3 + Vite + Tailwind v4 (Filament
design system, `web/`). WiZ lives behind a pluggable `FixtureDriver` (`src/types.ts`) so WLED/DMX slot in later.

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

1. Ableton Link beat-lock (tighter than MIDI clock) for on-the-beat shows.
2. **Phase 2 hardware:** ESP32 + WLED (DDP) driver behind the same `FixtureDriver` — the real path to
   sub-50 ms beat sync (WiZ stays a scene/mood device; see `docs/RESEARCH.md`).
3. Per-mapping "test fire" + scenes/banks.
