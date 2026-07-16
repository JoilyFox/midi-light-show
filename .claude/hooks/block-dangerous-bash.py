#!/usr/bin/env python3
"""PreToolUse(Bash) guard — deny catastrophic commands, ask on borderline ones.

Reads the tool payload from stdin, inspects the shell command, and returns a
permissionDecision. Silent (exit 0) for anything not matched. No external deps.
"""
import json
import re
import sys


def emit(decision: str, reason: str) -> None:
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": decision,      # "deny" | "ask"
            "permissionDecisionReason": reason,
        }
    }))
    sys.exit(0)


try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)

cmd = ((data.get("tool_input") or {}).get("command") or "").strip()
if not cmd:
    sys.exit(0)

# --- hard deny: irreversible / catastrophic ---
DENY = [
    (r"\brm\s+-[a-z]*r[a-z]*f|\brm\s+-[a-z]*f[a-z]*r", "recursive force delete"),
    (r"\brm\s+-rf?\s+(/|~|\$HOME|\.\.)(\s|/|$)", "delete of root/home/parent"),
    (r":\(\)\s*\{.*\|.*&\s*\}\s*;", "fork bomb"),
    (r"\bgit\s+push\b.*--force(-with-lease)?\b.*\b(main|master)\b", "force-push to main/master"),
    (r"\bgit\s+push\s+.*\bmain\b\s+--force|--force\s+.*\bmain\b", "force-push to main"),
    (r"\bmkfs\b|\bdd\s+if=.*of=/dev/", "disk / filesystem wipe"),
    (r">\s*/dev/sd|\bchmod\s+-R\s+000\b", "destructive device / permission op"),
]
for pat, why in DENY:
    if re.search(pat, cmd):
        emit("deny", f"Blocked ({why}). This is destructive/irreversible — do it manually if truly intended.")

# --- ask: risky but sometimes legitimate ---
ASK = [
    (r"\bgit\s+reset\s+--hard\b", "git reset --hard discards uncommitted work"),
    (r"\bgit\s+clean\s+-[a-z]*f", "git clean -f deletes untracked files (incl. config/)"),
    (r"\brm\s+-rf?\b", "recursive delete"),
    (r"\bgit\s+checkout\s+--\s+\.", "checkout -- . discards local changes"),
    (r"\bpkill\s+-9\b", "force-kill a process"),
    (r"\bchmod\s+-R\s+777\b", "world-writable permissions"),
]
for pat, why in ASK:
    if re.search(pat, cmd):
        emit("ask", f"Confirm: {why}. Proceed?")

sys.exit(0)
