---
id: midi-mapping-ui
title: MIDI mapping UI (Map + Log screens)
category: 05-ui
tags: [cat/ui, midi, mapping, sse]
status: current
code:
  [
    web/src/pages/MapScreen.vue,
    web/src/pages/LogScreen.vue,
    web/src/components/console/MappingEditor.vue,
    web/src/lib/store.ts,
  ]
prerequisites: ["[[console-app-structure]]"]
see_also: ["[[mapping-engine]]", "[[fixture-inventory]]", "[[live-output-stream]]"]
source_ids: []
added: 2026-07-17
updated: 2026-07-17
---

# MIDI mapping UI (Map + Log screens)

> Log is the live MIDI monitor + port picker; Map lists the mappings and edits them by id-based target, with MIDI-Learn capturing the next incoming event straight into the match.

## What it is
The two screens that turn the engine's mapping model into something you configure by clicking. **Log**
shows what MIDI is arriving (and lets you pick the input port); **Map** is the list + editor for the
`Mapping[]` the engine persists to `config/show.json`.

## How it works
- **Store buffering** — `connectStream()`'s `onMidi` handler pushes every event into a capped,
  newest-first `midiLog` and sets `lastMidi`; `onApplied` bumps `appliedTick` + `lastAppliedId`.
- **Log** — a `<Select>` of MIDI ports (calls `selectMidiPort(index)`), a connection dot, and a table
  bound to `midiLog` (type badge, channel, number, value + a level bar). Clear empties the buffer.
- **Map** — renders `store.mappings`: each row has an enable `Toggle`, the match label, the resolved
  **target name** (`targetName()` turns a `fx_`/`grp_`/`*`/IP ref into a human name), an action badge,
  and duplicate/edit actions. A row flashes when its mapping fires (`appliedTick` → `lastAppliedId`).
  Every mutation (toggle/duplicate/edit/delete) rebuilds the array and `PUT`s it whole.
- **MappingEditor** — a modal over a fully-populated local `EditModel` (every field defined, so
  `v-model` targets need no casts). It exposes match (type/channel/number + "any"), target (all /
  group / fixture), action, and per-action fields (pulse/fade/toggle/brightness/temp/color). **Learn**
  arms a watcher on `store.lastMidi`: the next event fills kind/channel/number and disarms.

## Key decisions & why
- **Whole-array PUT, not per-mapping PATCH.** The list is small and single-user; replacing the array is
  simpler than diffing and matches the engine's `PUT /api/mappings` contract.
- **`EditModel` widens enums to `string`.** Keeps `<Select>`/`v-model` friction-free; the one boundary
  cast to `Mapping` happens in `save()`. Extra always-present fields (e.g. `fixedColor`) are harmless —
  the engine reads only the fields its action needs.
- **Learn watches the shared `lastMidi`** rather than opening its own stream — one SSE connection, and
  the same events that populate the Log drive Learn.

## Gotchas
- The editor keeps all action fields populated, so a saved mapping carries some unused keys — cosmetic
  bloat in `show.json`, not a correctness issue.
- `targetName()` falls back to the raw string for a legacy IP ref (pre-inventory mappings still resolve).

## Status & TODO
- Done: Log monitor + port select, Map list (toggle/duplicate/edit/delete), MappingEditor with Learn.
- TODO: per-mapping "test fire" button; drag-reorder priority (HTP/LTP is a deeper engine change).

## See also
- [[mapping-engine]] — the engine side that consumes the `Mapping[]` this edits
- [[fixture-inventory]] — supplies the id→name resolution the Map rows show
- [[live-output-stream]] — the sibling SSE channel; both share one connection

## Sources
- (none — internal architecture)
