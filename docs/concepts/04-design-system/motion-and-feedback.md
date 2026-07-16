---
id: motion-and-feedback
title: Motion & feedback
category: 04-design-system
tags: [cat/design-system, motion]
status: partial
code: [web/src/styles/globals.css, web/src/components/ui/FixtureTile.vue]
prerequisites: ["[[filament-overview]]"]
see_also: ["[[glowing-fixture-tile]]", "[[dark-theme-and-a11y]]"]
source_ids: [filament-mockup]
added: 2026-07-17
updated: 2026-07-17
---

# Motion & feedback

> Motion serves the instrument: the UI reacts to MIDI and to the beat, and stays still otherwise. Restraint is part of the look.

## What it is
The small set of deliberate animations that make the console feel alive without feeling AI-generated:
- **Pulse-on-beat** — a fixture tile blooms when its mapped MIDI note fires (glow opacity → 1, then decays).
- **Activity meter** — the status-bar VU bars breathe with incoming MIDI.
- **MIDI-learn arm** — the armed row/button pulses amber and shows a blinking record dot while listening.
- **Live monitor** — incoming event rows flash on arrival.
- **Micro-interactions** — tiles/scene buttons lift on hover; screens fade in on switch.

## How it works
- Pulses are CSS class toggles riding existing transitions (add `.pulse` → glow animates back). Real MIDI
  drives them at runtime via the SSE stream (see [[live-monitor-sse]]).
- Ambient loops (meter, blink) are keyframes, staggered so they don't feel mechanical.

## Key decisions & why
- **Feedback is tied to real signals** (MIDI in, beat, connection) — motion communicates state, it isn't
  ornament. This is what keeps it from reading as generated flourish.
- **Stagger over simultaneity** — pulsing a rig with a small per-tile delay looks like a rig, not a strobe.

## Gotchas
- **Respect `prefers-reduced-motion`** — wrap ambient animations in `@media (prefers-reduced-motion:
  no-preference)`; the *state* (a tile is on/bright) must remain readable with motion off.
- Heavy blur/shadow animation across many tiles can jank — keep pulses cheap and staggered (see
  [[glowing-fixture-tile]]).

## Status & TODO
Phase 2 shipped the reduced-motion-guarded keyframes (`globals.css`) and the tile pulse mechanism
(`FixtureTile.vue`, `pulse` prop). Runtime MIDI-driven pulses + the activity meter wire up in Phase 3–4 with
the live SSE stream (see [[live-monitor-sse]]).

## See also
- [[glowing-fixture-tile]] — the primary surface for pulse feedback
- [[dark-theme-and-a11y]] — reduced-motion + legibility guarantees

## Sources
- `filament-mockup` — pulse, meter, arm, and monitor animations
