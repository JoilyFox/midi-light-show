---
id: filament-overview
title: Filament — design-system overview
category: 04-design-system
tags: [cat/design-system, thesis]
status: partial
code: [web/src/styles/tokens.css, web/src/App.vue]
prerequisites: []
see_also: ["[[color-tokens]]", "[[glowing-fixture-tile]]", "[[console-layout]]", "[[typography]]"]
source_ids: [filament-mockup]
added: 2026-07-17
updated: 2026-07-17
---

# Filament — design-system overview

> A dark, instrument-grade console where the chrome stays graphite and the only saturated color anywhere is the light the fixtures are making right now.

## What it is
Filament is the visual language for the whole MIDI Light Show UI. Its thesis: the app *makes colored
light*, so the interface should let the light be the color and keep everything else quiet. The result reads
like a lighting desk that is itself lit by the rig it controls.

Four principles drive every decision:
1. **Dark-first** — built for a dim stage next to a DAW; a bright UI would blind the performer.
2. **Color is data, not decoration** — chrome is neutral graphite; saturated color is reserved for fixtures.
3. **Readouts in mono** — every number (fixture #, MIDI channel/note, IP, ms, %) is monospace, like a desk.
4. **Big tap targets** — controls are sized for live hands, not pixel-precise mousing.

## How it works
- **One committed theme: dark.** Not a light/dark toggle — a single deliberate dark world. See
  [[dark-theme-and-a11y]].
- **A restrained accent** — tungsten-amber (`#FFB25C`, a bulb-filament glow) marks *live / armed / on /
  primary* and nothing else. See [[color-tokens]].
- **The signature** — the [[glowing-fixture-tile]]: each lamp emits its live color as a bloom scaled by
  brightness, and pulses on a MIDI hit, so the on-screen grid mirrors the physical rig.
- **The shell** — a graphite [[console-layout]] (rail + status bar + stage) hosting the Rig / Map / Play /
  Log screens.
- Personality comes from the light and the mono [[typography]], not from a novelty display font.

## Key decisions & why
- **Forbid saturated color in the chrome, reserve it for fixtures.** This is the one aesthetic risk; it is
  what keeps Filament from reading as a generic dark dashboard, and it is *true* to the subject.
- **System fonts (SF Pro + SF Mono)** — zero-load, native-crisp on macOS, "easy to implement." Distinctiveness
  is spent on the glow, not the letterforms.
- **Framework-agnostic tokens** — the system is CSS variables first, so it survives the Vue 3 + Tailwind v4
  implementation (see [[frontend-stack]]) unchanged.

## Status & TODO
Design locked (2026-07-17). Phase 2 implemented the tokens + component library (Vue 3 + Vite + Tailwind v4,
see [[frontend-stack]]); the full console shell (rail / status bar / Rig-Map-Play-Log screens) is assembled
in Phase 3. `partial` until then.

## See also
- [[color-tokens]] — the palette this thesis depends on
- [[glowing-fixture-tile]] — the signature that embodies "color is the light"
- [[console-layout]] — the graphite shell that stays quiet around the light
- [[typography]] — the mono-readout treatment that carries personality

## Sources
- `filament-mockup` — the clickable reference implementation
