---
id: console-app-structure
title: Console app structure (shell, router, store, API client)
category: 05-ui
tags: [cat/ui, spa, state, api]
status: partial
code:
  [
    web/src/App.vue,
    web/src/components/console/ConsoleShell.vue,
    web/src/lib/router.ts,
    web/src/lib/store.ts,
    web/src/lib/api.ts,
    web/src/lib/toast.ts,
  ]
prerequisites: ["[[frontend-stack]]"]
see_also: ["[[component-library-pattern]]", "[[fixture-inventory]]", "[[live-monitor-sse]]", "[[console-layout]]"]
source_ids: []
added: 2026-07-17
updated: 2026-07-17
---

# Console app structure (shell, router, store, API client)

> How the Filament SPA is wired: a left-rail shell hosts four screens (Rig/Play/Map/Log), a tiny hash router switches them, one reactive store is the single source of truth, and a typed client is the only thing that knows the wire API.

## What it is
The application skeleton that turns the Phase-2 component library into a running console. It is
deliberately dependency-light: no Vuex/Pinia, no vue-router — a single `reactive()` store and a
~20-line hash router cover a four-screen, single-user tool.

## How it works
- **Shell** — `ConsoleShell.vue`: fixed left rail (`NavButton` per screen + the UI/showcase link) and a
  global status bar (engine-live dot from SSE, current MIDI port chip, **Blackout** button that sends
  `off` to every fixture IP). Renders the active screen through `<component :is>`.
- **Router** — `lib/router.ts`: `useRoute()` exposes a readonly `route` ref driven by `location.hash`
  (`#/rig` … `#/components`); `navigate(route)` sets the hash. Reload-safe, no build-time routes.
- **Store** — `lib/store.ts`: one `reactive` object holding `fixtures`, `groups`, `mappings`, MIDI
  port state, an `online` set (last reachability probe), a `live` map (ip → output), and `connected`.
  Loader functions (`loadInventory`, `loadMappings`, `loadMidiPorts`, `refreshReachability`) refresh
  slices; derived helpers (`midiLabelFor`, `targetsOf`, `isOnline`, `liveFor`) keep screens thin.
  `connectStream()` opens the SSE connection once for the whole app.
- **API client** — `lib/api.ts`: `api.*` methods wrap `fetch('/api/...')` with typed request/response
  shapes and unified error handling (throws on `ok:false`); `openMidiStream()` wraps `EventSource`.
  It is the single place that knows URLs and payloads.
- **Toasts** — `lib/toast.ts` + `ToastHost.vue`: a shared queue for transient success/error feedback.

## Key decisions & why
- **No router/state libraries.** Four fixed screens and one user don't justify the bundle or ceremony;
  a hash router survives reloads and deep-links each screen for free.
- **One store, screens are views.** Rig, Play, and Map all read the same fixtures/groups/mappings, so a
  mutation on one screen (add a fixture, edit a group) is visible everywhere after a single re-load.
- **The API client is the only wire-aware module.** Screens call `api.addFixture(...)`, never `fetch`,
  so the engine's routes can change in one file.

## Gotchas
- The store's `live` map is keyed by **IP** (the engine speaks IPs), while the UI mostly keys by fixture
  **id** — cross via `fixture.ip`. `midiLabelFor` shows `CH· · N·` for wildcard mappings (null channel/number).
- SSE is opened once in `App.onMounted`; screens must not open their own `EventSource` or the engine
  fans out duplicate listeners.

## Status & TODO
- Done: shell, router, store, API client, toasts, **Rig** screen (fixture + group CRUD, discover, identify).
- TODO: Play (Phase 5), Map + Log (Phase 6), and wiring the `live` map from a fixture-state SSE channel (Phase 5/7).

## See also
- [[component-library-pattern]] — the prop-driven components the screens compose
- [[fixture-inventory]] — the engine model the store mirrors and the API client targets
- [[live-monitor-sse]] — the SSE stream `connectStream()` consumes
- [[console-layout]] — the Filament rail + status-bar layout this implements

## Sources
- (none — internal architecture)
