---
name: latency-audit
description: Measure end-to-end MIDI-to-photons latency with a slow-mo camera and log the result to experiments/. Use when optimizing the bridge, validating a new fixture/driver, or sweeping a device's safe command rate. The number that matters for the show — measure, don't guess.
---

# Latency audit

Measure the real MIDI-event → visible-light-change latency. Per the project's #1 rule, this is the metric
every design decision is judged against (<~50 ms target). WiZ is expected to be scene-grade, not tight;
capture the honest number anyway.

## Setup
1. Stabilize a phone at **120+ fps slow-mo**, framing BOTH the trigger and the light:
   - the trigger moment (a terminal echoing the send time, or the DAW), and
   - the bulb / LED under test.
2. Darken the room; steady the camera.

## Send a clean trigger
Use one obvious impulse so the trigger frame is unambiguous:
```bash
node experiments/send_to_iac.mjs        # push a single note/CC into IAC (see RUNBOOK §7)
```
(Or fire a one-shot clip in Ableton.) Keep the bridge running (`run-bridge`).

## Measure
1. Import the clip; scrub to the **trigger** frame → note frame number.
2. Scrub to the **first visible light change** frame → note frame number.
3. `latency_ms = (light_frame − trigger_frame) × 1000 / fps`.
4. Note also the *settle* time (trigger → final color/brightness) — WiZ's internal fade lives here.

## Log it (required)
Write `experiments/latency-<device>-<YYYY-MM-DD>.md`:
```markdown
# Latency: WiZ ESP24 RGBC, 2026-07-16
- Path: Ableton → IAC → bridge → 192.168.0.200 (setPilot, fire-and-forget)
- fps: 120 · trigger frame: 120 · light frame: 135
- **First-change latency: 125 ms** · settle: ~180 ms (internal fade)
- Verdict: fine for washes/moods; too loose for on-beat hits. Matches RESEARCH.md.
```
Then reconcile `docs/RESEARCH.md` / `docs/DECISIONS.md` if reality differs from what's recorded.

## Rate sweep (optional)
Repeat while increasing the send rate (10 → 20 → 40 Hz) to find where WiZ starts dropping/lagging; record
the inflection point. This defines the engine's safe rate-cap.
