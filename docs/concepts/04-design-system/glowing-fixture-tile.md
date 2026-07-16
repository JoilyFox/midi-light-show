---
id: glowing-fixture-tile
title: The glowing fixture tile (signature)
category: 04-design-system
tags: [cat/design-system, component, signature]
status: current
code: [web/src/components/ui/FixtureTile.vue]
prerequisites: ["[[filament-overview]]", "[[color-tokens]]"]
see_also: ["[[motion-and-feedback]]", "[[components]]", "[[console-layout]]"]
source_ids: [filament-mockup]
added: 2026-07-17
updated: 2026-07-17
---

# The glowing fixture tile

> The signature element: a lamp tile that actually emits its live color, scaled by brightness, and blooms when a MIDI note hits it — so the grid mirrors the physical rig, lit.

## What it is
The Rig screen is a grid of tiles, one per fixture. Each tile carries two runtime CSS variables:
- `--c` — the fixture's live RGB color.
- `--b` — its brightness, `0`–`1`.

From those it renders: a **radial glow** behind the tile, a **bulb glyph** with a color-matched bloom, the
fixture **number** (mono), **name**, a **status dot**, the **MIDI assignment chip** (e.g. `CH1 · N60`), and
the **brightness %**.

## How it works
- **Glow** — a `::before` radial-gradient in `--c`, its opacity `calc(.08 + var(--b) * .40)` so brighter
  lamps glow more; a dim lamp barely glows; an `off` lamp is near-dark.
- **Bulb** — a small circle filled `radial-gradient(#fff → var(--c) → darker)`, with
  `box-shadow: 0 0 calc(5px + var(--b)*30px) <c>` for a brightness-driven bloom.
- **States** — `.off` kills the glow and greys the bulb; `.offline` fades the whole tile and greys the
  status dot; hover lifts the tile (`translateY(-2px)`).
- **Pulse** — a `.pulse` class briefly forces glow opacity to 1; adding/removing it (on a MIDI hit) animates
  via the existing opacity transition. See [[motion-and-feedback]].

## Key decisions & why
- **Brightness drives glow, not just a number** — the panel reads like the room. State is encoded in *form*,
  not only text.
- **Color is a CSS var, never a Tailwind utility** — runtime RGB can't be a utility class (see
  [[color-tokens]] gotcha); the glow is inherently inline-styled.
- **`isolation: isolate` + `z-index:-1` on the glow** — keeps each tile's bloom contained so neighbors don't
  wash into each other.

## Gotchas
- `color-mix(in srgb, …)` is used for the bulb bloom — fine in current Chrome (the target), but note the
  dependency if the UI ever needs older-browser support.
- Don't animate `box-shadow`/`filter: blur` on many tiles at once without care — batch pulses with a small
  stagger to avoid jank (the mockup staggers by ~70ms per tile).

## Status & TODO
Built as `web/src/components/ui/FixtureTile.vue` (Phase 2) with props `color`/`brightness`/`on`/`online`/
`pulse`. Still to wire (Phase 3+): real per-fixture live state feeding `--c`/`--b`, and runtime pulses from
the MIDI SSE stream (see [[live-monitor-sse]]).

## See also
- [[motion-and-feedback]] — the pulse-on-beat behavior
- [[components]] — the tile is the headline member of the component library
- [[console-layout]] — the Rig grid that hosts these tiles

## Sources
- `filament-mockup` — the tile, its states, and the pulse demo
