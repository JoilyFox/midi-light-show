---
id: component-library-pattern
title: Component-library pattern — variants via props
category: 05-ui
tags: [cat/ui, components]
status: current
code: [web/src/lib/cn.ts, web/src/components/ui/Button.vue, web/src/components/ui/Card.vue]
prerequisites: ["[[frontend-stack]]"]
see_also: ["[[components]]", "[[frontend-stack]]", "[[color-tokens]]"]
source_ids: [tailwind-variants, cva]
added: 2026-07-17
updated: 2026-07-17
---

# Component-library pattern

> Every reusable component maps its props (variant, size, state) to static Tailwind classes via tailwind-variants, so app code composes `<Button variant="primary" size="lg">` with no utilities of its own.

## What it is
The recipe every component in `web/src/components/ui/` follows. It's how the design system in [[components]]
is actually implemented on the [[frontend-stack]].

## How it works
1. **Define variants with `tv()`** (tailwind-variants): a `base` class string plus `variants` (e.g.
   `variant`, `size`, `iconOnly`) and `defaultVariants`. Multi-part components (Card) use `slots`.
2. **Type the props** from `VariantProps<typeof x>` so `size`/`variant` autocomplete and typecheck.
3. **Merge a passthrough `class` prop** with `cn()` (`web/src/lib/cn.ts` = `clsx` + `tailwind-merge`) so a
   caller can override cleanly and conflicting utilities resolve (last wins).
4. **Tokens, not literals** — colors/spacing come from the `@theme` utilities (`bg-panel`, `text-filament`)
   defined in [[color-tokens]]; only the fixture glow uses an inline `--c`.

Example: `Button.vue` exposes `variant` (primary·secondary·ghost·danger) × `size` (sm·md·lg) × `iconOnly`.

## Key decisions & why
- **tailwind-variants over hand-rolled class maps** — type-safe, supports slots, and sidesteps Tailwind's
  dynamic-class purge (see Gotchas). (`tailwind-variants`, `cva`.)
- **Encapsulate Tailwind inside components** — the app is assembled from `<Button>`/`<Chip>`, matching the
  requested "component library" ergonomics.
- **A `/components` showcase** (`web/src/pages/Showcase.vue`) is the living catalog — no Storybook.

## Gotchas
- Never build class names dynamically (`` `bg-${x}` ``) — Tailwind's compiler can't see them and purges them.
  All variant classes must be complete static strings inside the `tv()` map.
- `tv()` slot components return a function object: call `styles.root()` / `styles.body()` (see `Card.vue`).

## Status & TODO
Established and in use across the Phase 2 components. Extends unchanged to new components (Phase 3+).

## See also
- [[components]] — the inventory this pattern implements
- [[frontend-stack]] — the Vue/Vite/Tailwind stack underneath
- [[color-tokens]] — the token utilities components consume

## Sources
- `tailwind-variants`, `cva` — the variant mechanism
