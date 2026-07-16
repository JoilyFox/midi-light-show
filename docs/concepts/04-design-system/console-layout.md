---
id: console-layout
title: Console layout — rail, status bar, stage
category: 04-design-system
tags: [cat/design-system, layout]
status: planned
code: []
prerequisites: ["[[filament-overview]]"]
see_also: ["[[components]]", "[[glowing-fixture-tile]]"]
source_ids: [filament-mockup]
added: 2026-07-17
updated: 2026-07-17
---

# Console layout

> A graphite window: a slim icon rail on the left, a thin status bar on top, and a single stage that swaps between the four screens.

## What it is
The app shell, framed like a desktop window (traffic-light dots, title, right-aligned status chips).

- **Status bar (top):** MIDI port + a live activity meter, an Ableton **Link / BPM** chip, and a round-trip
  **latency** readout (mono). These are the always-true facts of a live session.
- **Nav rail (left, ~72px):** icon+label buttons for the four screens — **Rig**, **Map**, **Play**, **Log**
  — plus **Setup** pinned at the bottom. Active item is amber-tinted.
- **Stage (main):** a toolbar (screen title + contextual action, e.g. "Add lamp", "MIDI Learn", "Blackout")
  over the active screen's content.

## How it works
- **Screens** — one `.screen` visible at a time; the rail toggles them. Each fades in on switch.
- **Rig** — the group filter row + the [[glowing-fixture-tile]] grid (`auto-fill, minmax(168px, 1fr)`).
- **Map** — a two-column rack: mapping rows (`MIDI source → fixture · action`) beside a live monitor.
- **Play** — hands-on controls: a color pad + hue slider, a chunky vertical brightness fader, scene buttons.
- **Log** — the event stream (what the bridge heard → what it did).

## Key decisions & why
- **Four screens map to the four real jobs** — patch the rig, wire MIDI, play by hand, see what happened.
  The structure encodes the workflow, not arbitrary nav.
- **Status bar surfaces the summary before the detail** — port, tempo, latency are what a performer glances
  at; they live in the persistent chrome, not buried in a screen.
- **Contextual toolbar action per screen** — one primary verb where the hand expects it.

## Gotchas
- Keep wide content (the mapping rack, the rig grid) in its own `overflow-x: auto` container so the window
  body never scrolls sideways on a small laptop screen.
- The rail collapses poorly below tablet width — plan a responsive rail (icons-only / bottom bar) when phone
  use becomes real; for now the tool is Mac-first.

## Status & TODO
Locked. Phase 2 builds the shell (`<AppShell>`, `<NavRail>`, `<StatusBar>`); screens fill in across
Phases 2–4. Flip to `current` when the shell exists.

## See also
- [[components]] — the buttons/chips/nav items the shell is assembled from
- [[glowing-fixture-tile]] — the Rig screen's content

## Sources
- `filament-mockup` — the shell and all four screens
