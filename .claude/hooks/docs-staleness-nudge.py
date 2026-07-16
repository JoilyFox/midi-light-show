#!/usr/bin/env python3
"""Stop hook — nudge to update docs when code changed but concept notes didn't.

Pure git read (no writing, non-blocking). If the working tree has changes under source paths
(src/, public/, scripts/) but nothing under docs/concepts/, emit a gentle reminder to run /sync-docs.
Silent when there's no drift, no git, or docs were already touched.
"""
import subprocess
import sys
import json


def run(args):
    try:
        return subprocess.run(args, capture_output=True, text=True, timeout=8)
    except Exception:
        return None


st = run(["git", "status", "--porcelain"])
if st is None or st.returncode != 0:
    sys.exit(0)  # not a git repo yet — nothing to compare

changed = [line[3:].strip().strip('"') for line in st.stdout.splitlines() if line.strip()]
if not changed:
    sys.exit(0)

SOURCE_PREFIXES = ("src/", "public/", "scripts/")
code_touched = any(p.startswith(SOURCE_PREFIXES) for p in changed)
docs_touched = any(p.startswith("docs/concepts/") for p in changed)

if code_touched and not docs_touched:
    n = sum(1 for p in changed if p.startswith(SOURCE_PREFIXES))
    print(json.dumps({
        "systemMessage": (
            f"📝 Docs check: {n} source file(s) changed but no docs/concepts/ note was updated. "
            "If this changed real behavior, run /sync-docs to reconcile the affected concept notes "
            "(or update them by hand). Docs ship with features."
        )
    }))

sys.exit(0)
