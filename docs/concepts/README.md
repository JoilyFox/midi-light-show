# docs/concepts — the concept knowledge base

Atomic, wikilinked notes for the *conceptual* knowledge of this project (architecture, engine, drivers,
the Filament design system, UI, operations). One idea per file. Operational logs stay flat outside this
folder (`../RUNBOOK.md`, `../DECISIONS.md`, `../RESEARCH.md`).

## Read protocol (for humans and agents)
1. Open [[_MAP]] (`_MAP.md`) — the index.
2. Read the ONE concept you need.
3. Follow its `see_also` **one hop** if you need adjacent context. Don't load the whole tree.
4. Drill into a `source_id` (via `../references/sources-index.md`) only for load-bearing detail.

## Write protocol
- New concept → new file `<NN-category>/<id>.md` following [[_SCHEMA]] (`_SCHEMA.md`) exactly.
- Reference the code it describes in the `code:` frontmatter — that link is what keeps docs honest.
- Add the note to `_MAP.md` under its category with its one-line summary.
- Link generously with `[[id]]`; ghost links (to not-yet-written notes) are welcome.

## Keeping docs in sync with code
Two mechanisms work together:
- **`docs-staleness` hook** (passive) — after a work session, if source changed but no concept note did,
  it nudges. Cheap; git-only; no writing.
- **`/sync-docs` skill** (active) — does a *differential* pass: compares changed code against the notes
  whose `code:` paths it touches, then updates the drifted notes (prose, `status`, `updated`, links) and
  flags anything it can't safely resolve. Run it at a feature boundary or let it run at commit time.

The rule this operationalizes: **docs ship with features.** A note's `updated` date and `code:` paths are
the audit trail.
