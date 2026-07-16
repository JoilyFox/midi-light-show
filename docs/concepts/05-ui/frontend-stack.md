---
id: frontend-stack
title: Frontend stack — Vue 3 + Vite + Tailwind v4
category: 05-ui
tags: [cat/ui, stack]
status: current
code: [web/vite.config.ts, web/package.json, web/src/main.ts]
prerequisites: []
see_also: ["[[component-library-pattern]]", "[[filament-overview]]", "[[live-monitor-sse]]"]
source_ids: [tailwind-v4, tailwind-theme]
added: 2026-07-17
updated: 2026-07-17
---

# Frontend stack

> A client-only Vue 3 SPA (Vite + Tailwind v4) that talks to the long-lived engine over HTTP/SSE — no meta-framework, because SSR gives a single-user localhost tool nothing.

## What it is
The UI lives in `web/` as a self-contained Vite app, separate from the engine:
- **Vue 3** (`<script setup lang="ts">`) — components + reactivity.
- **Vite** — dev server (HMR on :5173) and static production build (`web/dist`).
- **Tailwind v4** via `@tailwindcss/vite`, tokens in `web/src/styles/tokens.css` (`@theme`).
- **tailwind-variants** + a `cn()` helper + **@lucide/vue** icons (see [[component-library-pattern]]).

## How it works
- `web/vite.config.ts` registers the `vue()` and `tailwindcss()` plugins, aliases `@ → web/src`, and **proxies
  `/api` → `http://localhost:8080`** so the SPA reaches the engine in dev.
- In production the SPA builds to static files; the engine (Express) serves them. The engine stays a plain
  long-lived process — the hot path is never inside a web framework.
- `web/` has its own `package.json` and `node_modules`, keeping frontend deps out of the engine.

## Key decisions & why
- **Client-only SPA, not Nuxt/Next** — SSR/edge would add a competing server and can't host the persistent
  UDP/MIDI sockets + fade loop. See DECISIONS/RESEARCH.
- **Tailwind v4 CSS-first `@theme`** — one token declaration yields both utilities and runtime CSS vars.
- **TypeScript pinned to 5.x** — `vue-tsc` doesn't support the TS 7 native port yet (it needs `./lib/tsc`).

## Gotchas
- `vue-tsc` + `typescript@7` fails with `ERR_PACKAGE_PATH_NOT_EXPORTED` — keep TS on 5.x until vue-tsc supports 7.
- Vite's build uses esbuild (no type-check); run `npm run typecheck` (vue-tsc) separately in CI/pre-commit.

## Status & TODO
Scaffolded and building/rendering (Phase 2). TODO: wire the engine to serve `web/dist` in production, and add
the SSE client (see [[live-monitor-sse]]).

## See also
- [[component-library-pattern]] — how components are built on this stack
- [[filament-overview]] — the design system this stack renders
- [[live-monitor-sse]] — the runtime data channel from the engine

## Sources
- `tailwind-v4`, `tailwind-theme` — the CSS-first Tailwind v4 setup
