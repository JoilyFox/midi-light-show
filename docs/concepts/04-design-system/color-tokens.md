---
id: color-tokens
title: Color tokens — graphite, filament, and the live light
category: 04-design-system
tags: [cat/design-system, color, tokens]
status: current
code: [web/src/styles/tokens.css]
prerequisites: ["[[filament-overview]]"]
see_also: ["[[dark-theme-and-a11y]]", "[[glowing-fixture-tile]]", "[[typography]]"]
source_ids: [filament-mockup, tailwind-theme, tailwind-v4]
added: 2026-07-17
updated: 2026-07-17
---

# Color tokens

> Three layers of color: a graphite ramp for chrome, one tungsten-amber accent for "live", and the fixtures' own dynamic RGB as the only real chroma.

## What it is
The complete palette, named by **role** (not by hue) so a rebrand or state change is one edit. Values are
the source of truth for the whole UI.

### Graphite — the chrome
| Token | Hex | Use |
|---|---|---|
| `--ink` | `#0F1013` | app base (warm-neutral near-black, biased toward the amber) |
| `--ink-2` | `#0A0B0D` | deepest wells (window frame, tracks) |
| `--panel` | `#15171C` | surface |
| `--panel-2` | `#1B1E24` | raised surface (tiles, cards) |
| `--panel-3` | `#23272F` | hover / active surface |
| `--line` | `#2A2E37` | hairline border |
| `--line-soft` | `#1F232A` | inner dividers |
| `--text` | `#ECEEF1` | primary text |
| `--text-dim` | `#98A0AA` | secondary text |
| `--text-mute` | `#606770` | tertiary / labels |

### Filament — the one accent
| Token | Hex | Use |
|---|---|---|
| `--filament` | `#FFB25C` | live · armed · on · primary action |
| `--filament-hi` | `#FFDCA6` | highlight / glow core |
| `--filament-deep` | `#C77A2E` | pressed / gradient bottom |

### State — semantic, separate from the accent
| Token | Hex | Use |
|---|---|---|
| `--online` | `#57D9A3` | fixture reachable |
| `--offline` | `#565D67` | fixture unreachable |
| `--danger` | `#FF6B6B` | blackout · delete |

### Fixture color — dynamic
Per-lamp RGB set at runtime (`--c`), rendered as a glow (see [[glowing-fixture-tile]]). Sample rig colors
in the mockup: amber `#FF9E3D`, cyan `#35D0E0`, magenta `#E85CC4`, blue `#3B6BFF`, green `#4FD86A`,
warm-white `#FFE7C4`.

## How it works
Implemented (Phase 2) as **Tailwind v4 `@theme`** tokens: declaring `--color-filament` etc. generates
`bg-filament` / `text-filament` utilities *and* exposes the CSS variable for direct use in the dynamic glow.
One declaration serves both the component library and the runtime light color.

## Key decisions & why
- **Role names, not hue names** (`--filament`, not `--amber-400`) — semantics survive a palette change.
- **Only three accent stops; state colors are not the accent** — keeps the hue budget tiny so the fixtures'
  color always wins the eye.
- **Amber over acid-green** — a bulb-filament/tungsten glow is on-theme and dodges the cliché neon-on-black.

## Gotchas
- **`@theme inline` bakes values at build time and breaks runtime theming.** Because the fixture glow needs
  *runtime* color, define the raw channel/hex values on `:root` and reference them; use non-inline `@theme`
  for the utilities. (`tailwind-theme`, `tailwind-v4`.)
- Tailwind utilities **cannot** express a runtime fixture color — that must stay an inline CSS var `--c`.

## Status & TODO
Implemented in `web/src/styles/tokens.css` as Tailwind v4 `@theme` tokens (Phase 2). Single dark theme meant
no `:root` channel split was needed; only the dynamic fixture `--c` stays inline.

## See also
- [[glowing-fixture-tile]] — where the dynamic `--c` / `--b` tokens are consumed
- [[dark-theme-and-a11y]] — contrast + the single-theme commitment these values target
- [[typography]] — text tokens pair with these color tokens

## Sources
- `filament-mockup` — the palette in situ
- `tailwind-theme`, `tailwind-v4` — `@theme` tokens → utilities + CSS vars; runtime-theming caveat
