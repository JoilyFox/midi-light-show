---
id: typography
title: Typography — system faces, desk treatment
category: 04-design-system
tags: [cat/design-system, type]
status: current
code: [web/src/styles/tokens.css]
prerequisites: ["[[filament-overview]]"]
see_also: ["[[color-tokens]]", "[[components]]"]
source_ids: [filament-mockup]
added: 2026-07-17
updated: 2026-07-17
---

# Typography

> Two system faces, no webfont. Personality comes from the treatment — mono readouts and tracked micro-labels — not a novelty display font.

## What it is
- **Sans (UI / headings):** `-apple-system, "SF Pro Display", ui-sans-serif, system-ui, "Segoe UI", Roboto,
  sans-serif`.
- **Mono (data / readouts):** `ui-monospace, "SF Mono", Menlo, "JetBrains Mono", monospace`.

Every *number* is set in mono with `font-variant-numeric: tabular-nums`: fixture numbers, MIDI channel/note,
IP, BPM, ms, %. That mono layer is the instrument-readout texture and the memorable part of the type system.

## How it works
Treatment conventions:
- **Micro-labels** — uppercase, `letter-spacing: .14–.22em`, `--text-mute`, mono or sans (e.g. section
  eyebrows, "LIVE MONITOR"). Structural, not decorative.
- **Readouts** — mono, tabular, often larger and `--text` (e.g. the fader value `78`, `124.0 BPM`).
- **Headings/names** — sans, weight 600, tight `letter-spacing: -.01…-.03em`; `text-wrap: balance` on
  display headings.
- **Body/labels** — sans 15px, `--text-dim`, quiet. Keep running text near 65ch.

## Key decisions & why
- **No webfont** — the Artifact CSP blocks font CDNs, and for a macOS-only tool the OS stack (SF Pro + SF
  Mono) is zero-load and native-crisp. Legibility in the dark beats a novelty face.
- **Mono for all technical values** — honest to the subject (MIDI/lighting are numeric) and makes columns of
  digits line up.

## Gotchas
- Don't reach for a display webfont later "for character" — it fights the dark legibility goal and re-adds
  the load we deliberately avoided. Character lives in the mono treatment + the light.
- Always pair mono numerics with `tabular-nums`, or live-updating values (BPM, ms) will jitter their width.

## Status & TODO
Implemented in `web/src/styles/tokens.css` (`@theme` `--font-sans` / `--font-mono`); the mono/tabular
treatment is applied per-component. A formal type-scale can be added if headings proliferate.

## See also
- [[components]] — chips, faders, and readouts apply these conventions
- [[color-tokens]] — text-color tokens pair with the type roles

## Sources
- `filament-mockup` — the type treatment in situ
