---
id: components
title: Component library — prop-driven, tokenized
category: 04-design-system
tags: [cat/design-system, components]
status: partial
code: [web/src/components/ui/Button.vue, web/src/components/ui/Chip.vue, web/src/components/ui/Card.vue, web/src/components/ui/Fader.vue, web/src/components/ui/StatusDot.vue, web/src/components/ui/NavButton.vue, web/src/components/ui/Icon.vue, web/src/components/ui/GroupChip.vue]
prerequisites: ["[[filament-overview]]", "[[color-tokens]]", "[[typography]]"]
see_also: ["[[component-library-pattern]]", "[[glowing-fixture-tile]]", "[[console-layout]]"]
source_ids: [filament-mockup, tailwind-variants, cva]
added: 2026-07-17
updated: 2026-07-17
---

# Component library

> A small set of reusable Vue components whose look is driven entirely by props (variant, size, state) and tokens — Tailwind lives inside them, app code stays clean.

## What it is
The inventory of shared UI pieces. Each is used like `<Button variant="primary" size="lg" :icon="Plus">`,
with no utility classes leaking into page code. Variants are defined with **tailwind-variants** (slots +
built-in tailwind-merge); tokens come from [[color-tokens]] / [[typography]]. See the implementation pattern
in [[component-library-pattern]].

| Component | Key props | Notes |
|---|---|---|
| `Button` | `variant` (primary·ghost·danger), `size` (sm·md·lg), `icon`, `loading`, `disabled` | primary = amber gradient |
| `Chip` | `size`, `tone` (default·filament) | mono content (`CH1 · N60`) |
| `Card`/`Panel` | slots: header/body; `padding` | uses tailwind-variants slots |
| `NavButton` | `active`, `icon`, `label` | the rail item |
| `Icon` | `name` (lucide), `size` | wraps `lucide-vue-next` for consistent sizing |
| `StatusDot` | `state` (online·offline) | encodes reachability |
| `Fader` | `value`, `label`, `min`/`max` | vertical, chunky, mono value |
| `GroupChip` | `active`, `count` | the Rig group filter |
| `FixtureTile` | `color`, `brightness`, state | the signature — see [[glowing-fixture-tile]] |

## How it works
- **Props → variants → classes** via tailwind-variants, so `size="sm"` swaps a static class set (no
  dynamically-built class strings — see Gotchas).
- **`class` passthrough** is merged with `tailwind-merge` so a caller can override cleanly.
- **Typed** — `<script setup lang="ts">` + `defineProps<…>()` gives autocomplete on every variant.
- **Sizes are a scale, not ad-hoc** — sm/md/lg share the same padding/height/`font-size` ramp across all
  components so a small Button and a small Chip agree.

## Key decisions & why
- **Encapsulate Tailwind inside components** — the UI is then assembled from `<Button>`/`<Chip>` with almost
  no utilities, exactly the "component library" ergonomics requested.
- **tailwind-variants over hand-rolled class maps** — type-safe variants, slots for multi-part components,
  and it sidesteps Tailwind's dynamic-class purge (`tailwind-variants`, `cva`).
- **One showcase route (`/components`), not Storybook** — a living catalog without the tooling weight.

## Gotchas
- Never build class names dynamically (`` `bg-${x}` ``) — Tailwind purges them. Variants must be static
  strings inside the variant map.
- The `FixtureTile`'s color is the exception to "no inline styles": its `--c`/`--b` are runtime CSS vars.

## Status & TODO
Built in `web/src/components/ui/` (Phase 2): Button, Chip, GroupChip, StatusDot, NavButton, Icon, Card,
Fader, [[glowing-fixture-tile|FixtureTile]] — verified in the `/components` showcase (`web/src/pages/Showcase.vue`).
`partial` until they're assembled into the console screens (Phase 3) and wired to live data.

## See also
- [[component-library-pattern]] — the exact tailwind-variants + `cn()` implementation recipe
- [[glowing-fixture-tile]] — the headline component
- [[console-layout]] — where these components are assembled

## Sources
- `filament-mockup` — every component's visual spec
- `tailwind-variants`, `cva` — the variant mechanism
