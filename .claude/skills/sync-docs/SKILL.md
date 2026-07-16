---
name: sync-docs
description: Reconcile the docs/concepts knowledge base with the actual code — a differential pass that finds where implementation drifted from the notes and updates the affected concept notes to match. Use at a feature boundary, before a commit, when the docs-staleness hook nudges, or whenever the user says "sync docs", "update the docs", or "check docs against code".
---

# Sync docs with code

Keep `docs/concepts/**` true to the implementation. This is an **active** reconciler (it writes docs);
the `docs-staleness` Stop hook is only the passive detector that suggests running this.

Follow [[_SCHEMA]] (`docs/concepts/_SCHEMA.md`) exactly — it is the contract every note obeys.

## 1. Scope the diff
Determine what code changed since docs were last reconciled, in this priority order:
1. If a git repo with history: `git log -1 --format=%cI` per concept note is overkill — instead diff the
   working tree and recent commits: `git status --porcelain` + `git diff --stat HEAD~5..HEAD` (adjust range).
2. If no useful history: compare each note's `updated:` date and its `code:` paths against the mtime/content
   of those source files; treat notes whose `code:` files changed after `updated:` as candidates.
3. Also list **source files with no owning note** (nothing references them in any `code:`) — these are
   undocumented modules.

Read the actual changed source files. Do not guess from filenames.

## 2. Detect drift (per candidate note)
For each concept note whose `code:` paths were touched, compare what the code now does against what the
note claims. Look for:
- New behavior / new public API / new routes not described.
- Renamed or removed symbols the note still mentions.
- Changed defaults, thresholds, or data shapes (e.g. rate-cap Hz, config schema, driver methods).
- `status:` that no longer matches reality (a `planned` note whose code now exists → `current`).
- Missing or now-broken `[[wikilinks]]` and `see_also`.

## 3. Update the notes
Apply the smallest correct edits:
- Fix the prose (What it is / How it works / Gotchas) to match the code.
- Bump `updated:` to today; correct `status:`; fix `code:` paths; add/repair `see_also` + wikilinks.
- For an undocumented module worth a note, either create the note (following `_SCHEMA.md`) or add a **ghost
  link** in `_MAP.md` and list it in the summary so the human can decide.
- Update `_MAP.md` (add new notes, fix one-line summaries, update the status emoji).

## 4. Guardrails
- **Never invent behavior.** If the code's intent is unclear, do NOT rewrite confidently — flag it under a
  "Needs human review" list in your summary instead.
- Never write secret values into a note (paths/roles only).
- Keep edits reviewable: prefer targeted edits over full rewrites.

## 5. Report
End with a concise summary: notes updated (and why), notes created, ghost links added, undocumented files
found, and anything flagged for human review. If nothing drifted, say so plainly.

## Optional: run at commit time
To make "docs stay up to functionality" automatic, this skill can be invoked before a commit (alongside the
gitleaks commit-gate). Ask the user before wiring an automatic pre-commit trigger — an unattended doc-writer
on every commit has a token cost and can churn; on-demand + feature-boundary is the recommended default.
