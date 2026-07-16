# Knowledge Map — MIDI Light Show

Entry point for the concept knowledge base. Start at [[architecture-overview]], then follow `see_also`
**one hop** at a time — never load the whole tree. Operational docs live outside this KB:
`../RUNBOOK.md` (run/restart), `../DECISIONS.md` (ADR log), `../RESEARCH.md` (device/latency findings).

**Legend:** current ✅ · partial 🟡 · planned ⭕ · deprecated ⚠️

## 01 — Architecture · `concepts/01-architecture/`
- [[architecture-overview]] ⭕ — the MIDI → engine → driver → fixture data flow and the latency budget
- [[fixture-driver-interface]] ⭕ — the pluggable output boundary (WiZ now, WLED/DMX later)

## 02 — Engine · `concepts/02-engine/`
- [[midi-input]] ⭕ — reading MIDI from the macOS IAC port
- [[mapping-engine]] ⭕ — MIDI events → fixture actions via `config/show.json`
- [[fade-pulse-engine]] ⭕ — transitions, rate-cap + send-on-change (WiZ-safe)
- [[fixture-inventory]] ✅ — persisted fixtures + groups + target resolution (id/group/IP/*)

## 03 — Drivers · `concepts/03-drivers/`
- [[wiz-driver]] ⭕ — WiZ local UDP (port 38899), fire-and-forget setPilot
- [[wled-driver]] ⭕ — future tight-sync path (DDP/sACN over ESP32)

## 04 — Design system (Filament) · `concepts/04-design-system/`
- [[filament-overview]] 🟡 — the thesis: dark console, color is the light, not decoration
- [[color-tokens]] ✅ — the graphite + tungsten-amber palette, per-fixture dynamic color
- [[typography]] ✅ — system faces, mono readouts, the "desk" treatment
- [[glowing-fixture-tile]] ✅ — the signature component that emits its live color
- [[console-layout]] ⭕ — rail + status bar + stage shell
- [[components]] 🟡 — prop-driven library (Button, Chip, Card, NavButton, Icon…)
- [[motion-and-feedback]] 🟡 — pulse-on-beat, MIDI-learn arm, reduced-motion
- [[dark-theme-and-a11y]] 🟡 — single dark world, contrast, focus states

## 05 — UI · `concepts/05-ui/`
- [[frontend-stack]] ✅ — Vue 3 + Vite SPA, Tailwind v4, tailwind-variants
- [[component-library-pattern]] ✅ — variants via props, tokens as one source of truth
- [[live-monitor-sse]] ⭕ — streaming MIDI events into the UI

## 06 — Operations · `concepts/06-operations/`
- [[documentation-system]] ⭕ — how this KB + `/sync-docs` + the docs hook work together
- [[latency-measurement]] ⭕ — the slow-mo audit ritual
