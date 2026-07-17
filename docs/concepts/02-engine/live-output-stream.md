---
id: live-output-stream
title: Live output stream (fixtureState SSE)
category: 02-engine
tags: [cat/engine, sse, state, ui]
status: current
code: [src/engine/transitions.ts, src/engine/showEngine.ts, src/server.ts]
prerequisites: ["[[fade-pulse-engine]]"]
see_also: ["[[fixture-inventory]]", "[[console-app-structure]]", "[[live-monitor-sse]]"]
source_ids: []
added: 2026-07-17
updated: 2026-07-17
---

# Live output stream (fixtureState SSE)

> Every actual change to a fixture's output — whether from a MIDI-driven fade or a manual UI set — is broadcast as a `fixtureState` SSE event so the console tiles glow with the real live color and brightness.

## What it is
A single push channel that tells the UI what each lamp is *currently doing*. It closes the loop
between the engine's output and the fixtures shown on screen: a beat pulse during a show, or a manual
brightness drag, both light up the corresponding tile.

## How it works
- **Source of truth = the one place output leaves the engine.** `TransitionEngine` takes an optional
  `OutputListener`; it fires from `apply()` (after the send-on-change guard) and `setTemp()`, reporting
  `{ on, brightness, color? }` per IP. Because it sits after the send-on-change check, it never emits
  duplicates during slow fades.
- **ShowEngine merges + broadcasts.** `onOutput()` folds each partial into a `live` map (keeping the
  last color across brightness-only fades) and emits `'fixtureState'`. `manualSet()` (used by
  `POST /api/state`) routes UI control through the same path: it fires the driver, syncs the fade
  engine's tracked brightness (`setCurrent`, so a later fade starts from here), and emits.
- **Transport.** The existing `GET /api/midi/stream` SSE adds a `fixtureState` event next to `midi` and
  `applied`. `GET /api/fixtures/live` returns a one-shot snapshot to seed the UI on load.
- **UI.** `store.connectStream()` writes each event into `live: Map<ip, {on,brightness,color}>`;
  `liveFor(ip)` feeds the `FixtureTile` color/brightness on Rig and Play.

## Key decisions & why
- **One listener, both paths.** Manual sets and mapping-driven fades emit through the same
  `onOutput`, so the live map is coherent no matter what drove the lamp — no separate "manual" state.
- **Color temperature → approximate RGB** (`kelvinToRgb`) purely for the tile tint; the bulb still gets
  the real `temp`. The UI never shows a white lamp as black.

## Gotchas
- Emitting from *after* send-on-change means an unchanged re-send produces no event — correct, but a
  screen must seed from `/api/fixtures/live` on mount rather than wait for the next change.
- The live map is keyed by **IP**; the inventory is keyed by **id** — cross via `fixture.ip`.

## Status & TODO
- Done: OutputListener, merge+broadcast, manualSet, snapshot endpoint, UI wiring (Rig + Play tiles).
- TODO: none for WiZ; a future WLED driver should call the same listener so its fixtures stream too.

## See also
- [[fade-pulse-engine]] — where the listener fires from
- [[console-app-structure]] — the store slice + SSE handler that consumes it
- [[fixture-inventory]] — id↔ip mapping the UI crosses to place live state on tiles

## Sources
- (none — internal architecture)
