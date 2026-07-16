---
id: dark-theme-and-a11y
title: Dark theme & accessibility
category: 04-design-system
tags: [cat/design-system, a11y]
status: partial
code: [web/src/styles/globals.css]
prerequisites: ["[[filament-overview]]", "[[color-tokens]]"]
see_also: ["[[color-tokens]]", "[[motion-and-feedback]]"]
source_ids: [filament-mockup]
added: 2026-07-17
updated: 2026-07-17
---

# Dark theme & accessibility

> One deliberate dark world, held to a real quality floor: legible contrast, visible focus, reduced-motion, and state you can read without color alone.

## What it is
Filament commits to a single dark theme — not an omission of a light mode, a choice: the tool runs in a dim
room next to a DAW. The a11y baseline that goes with it.

## How it works
- **Single theme** — no `prefers-color-scheme` swap for the app itself. (In the Artifact mockup this is
  forced dark regardless of viewer theme.)
- **Contrast** — primary text `--text` (`#ECEEF1`) on `--ink` clears WCAG AA for body; `--text-dim` is for
  secondary content only, never load-bearing small text on the darkest wells.
- **Focus** — every interactive element shows a visible `:focus-visible` ring (amber, offset).
- **State without color** — online/offline also differ by dot fill + tile opacity; off vs on differ by glow
  presence, not hue — so the UI survives color-blindness and the all-graphite chrome.
- **Reduced motion** — see [[motion-and-feedback]]; ambient animation is gated, state stays readable.

## Key decisions & why
- **Dark is a design commitment, not a default** — stated so future work doesn't "add a light mode" and
  dilute the instrument feel.
- **Runtime tokens on `:root`, not `@theme inline`** — so the live fixture glow can change color at runtime
  (the `@theme inline` form bakes values at build time). See [[color-tokens]] gotcha.

## Gotchas
- Amber-on-graphite for small text is borderline — reserve `--filament` for larger labels, icons, and fills,
  not paragraph text.
- Pure black (`#000`) was avoided deliberately (`--ink` is `#0F1013`) — pure black is harsh and hides the
  panel elevation that structures the UI.

## Status & TODO
Phase 2 baked the focus-ring (`globals.css` `:focus-visible`), `color-scheme: dark`, and the reduced-motion
gate. Still to do: a per-component contrast audit on real hardware brightness. `partial` until that pass.

## See also
- [[color-tokens]] — the values these contrast/focus rules are built on
- [[motion-and-feedback]] — the reduced-motion half of the a11y floor

## Sources
- `filament-mockup` — the dark ground, focus states, and non-color state encoding
