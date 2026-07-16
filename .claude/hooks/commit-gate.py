#!/usr/bin/env python3
"""PreToolUse(Bash) secret gate — block `git commit`/`git push` if staged changes leak secrets.

Runs gitleaks on the staged diff when available; falls back to a small regex scan otherwise.
Degrades gracefully: if it can't scan (no git, no staged changes), it allows silently.
No test-running half yet (project has no test suite).
"""
import json
import re
import subprocess
import sys


def emit_deny(reason: str) -> None:
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        }
    }))
    sys.exit(0)


try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)

cmd = ((data.get("tool_input") or {}).get("command") or "")
if not re.search(r"\bgit\s+(commit|push)\b", cmd):
    sys.exit(0)  # not a commit/push — nothing to gate


def run(args):
    try:
        return subprocess.run(args, capture_output=True, text=True, timeout=25)
    except Exception:
        return None


# staged diff (what a commit would capture)
diff = run(["git", "diff", "--cached", "-U0"])
if diff is None or diff.returncode != 0 or not diff.stdout.strip():
    sys.exit(0)  # no git or nothing staged — allow

# Prefer gitleaks (installed on this machine)
gl = run(["gitleaks", "git", "--staged", "--no-banner", "--redact", "-v"])
if gl is not None and gl.returncode == 1:  # gitleaks: 1 == leaks found
    emit_deny("gitleaks found a secret in the staged changes. Unstage/remove it before committing.\n"
              + (gl.stdout or gl.stderr or "")[:1500])

# Regex fallback (only runs if gitleaks unavailable / errored, not when it cleanly passed)
if gl is None or gl.returncode not in (0, 1):
    PATTerns = [
        (r"-----BEGIN (RSA|EC|OPENSSH|PGP) PRIVATE KEY-----", "private key"),
        (r"\b(sk|pk)-[A-Za-z0-9]{20,}\b", "API key"),
        (r"\bAKIA[0-9A-Z]{16}\b", "AWS access key"),
        (r"(?i)\b(api[_-]?key|secret|token|password)\b\s*[:=]\s*['\"][^'\"]{8,}", "credential assignment"),
    ]
    added = "\n".join(l[1:] for l in diff.stdout.splitlines() if l.startswith("+"))
    for pat, why in PATTerns:
        if re.search(pat, added):
            emit_deny(f"Possible {why} in staged changes (regex fallback; gitleaks unavailable). "
                      "Review and remove it before committing.")

sys.exit(0)
