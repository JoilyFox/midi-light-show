# Concept-note schema (the contract)

Every file under `docs/concepts/<NN-category>/<id>.md` is ONE atomic concept and MUST follow this
contract. This mirrors the knowledge-base system used across the author's other projects, right-sized:
conceptual knowledge lives here as linked atomic notes; operational logs (`docs/RUNBOOK.md`,
`docs/DECISIONS.md`, `docs/RESEARCH.md`) stay flat and are NOT concept notes.

The `/sync-docs` skill and the `docs-staleness` hook both rely on this contract — keep it exact.

## Frontmatter (YAML) — required unless marked optional

```yaml
---
id: <kebab-case>            # == filename minus .md, globally unique across all categories
title: <Human Title>
category: <NN-category>     # == parent folder name, e.g. 04-design-system
tags: [cat/<slug>, facet]  # tags[0] ALWAYS "cat/<category-slug>"; then 1–4 facet tags
status: planned            # one of: current | partial | planned | deprecated
code: [src/path/from/root.ts]   # source files this note is the "prose of"; [] if none
prerequisites: ["[[other-id]]"] # read-these-first wikilinks; [] if none
see_also: ["[[a]]", "[[b]]"]    # related wikilinks; >= 1 REQUIRED
source_ids: [src-id]            # ids from docs/references/sources-index.md; [] if none
added: YYYY-MM-DD
updated: YYYY-MM-DD              # must be >= added; /sync-docs bumps this
---
```

## Body

```markdown
# <title>

> One-sentence summary. This exact line is what `_MAP.md` quotes.

## What it is        (required)
## How it works      (the mechanism / data flow)
## Key decisions & why
## Gotchas
## Status & TODO     (required when status is partial | planned)
## See also          (required — one line each: "[[x]] — why it's related")
## Sources           (mirror the frontmatter source_ids)
```

## Categories

| Folder | Holds |
|---|---|
| `01-architecture` | System shape, the pluggable driver boundary, data flow, latency budget |
| `02-engine` | MIDI input, mapping, fade/pulse engine, rate-limit/coalescing |
| `03-drivers` | Per-protocol output adapters (WiZ now; WLED/DDP, sACN, Art-Net later) |
| `04-design-system` | **Filament** — tokens, typography, components, motion, the glowing-tile pattern |
| `05-ui` | Frontend app structure (Vue 3 + Vite SPA), component library, state, SSE |
| `06-operations` | Running/restarting, measuring latency, the doc system itself |

## Invariants (what `/sync-docs` validates)

1. `id` == filename (minus `.md`); `category` == parent folder name.
2. `tags[0]` == `cat/<category-slug>` (e.g. `cat/design-system`).
3. `status` is one of the four enum values.
4. `see_also` is non-empty.
5. For `current`/`partial` notes, every path in `code:` exists on disk.
6. Body contains `## What it is` and `## See also`.
7. `updated >= added`.

## Linking rules

- Link concepts with `[[id]]` wikilinks (basename resolution — survives file moves). Never use relative
  markdown links between concepts.
- "Ghost links" (`[[id]]` to a note that doesn't exist yet) are encouraged — they mark notes worth writing.
- Cite external facts by `source_id` (registered in `docs/references/sources-index.md`), never by pasting a
  raw URL or secret into a note.
