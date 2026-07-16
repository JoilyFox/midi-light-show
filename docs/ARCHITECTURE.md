# Architecture

> Working design. Refine once `RESEARCH.md` is filled. The latency budget below drives every choice.

## Latency budget (target: <50 ms MIDI → photons)

| Stage | Est. cost | Notes / levers |
|-------|-----------|----------------|
| DAW → virtual MIDI port (IAC) | ~1–5 ms | macOS IAC is fast; keep buffer sizes low |
| Controller app processing (map + schedule) | <1–3 ms | tight event loop, no blocking I/O on the MIDI thread |
| Controller → device over WiFi (UDP) | ~5–30 ms + jitter | depends on AP, congestion; wired AP & 5 GHz help |
| Device internal processing / PWM / fade | **device-dependent** | the big unknown — WiZ fade smoothing can add 10s–100s ms |
| **Total** | **? ms** | must be measured per device; WiZ is the suspect |

**Rule:** the device stage dominates. Pick devices with a known, low, *deterministic* internal latency.

## Component model

### 1. MIDI input
- macOS **IAC Driver** virtual port (or a `loopMIDI`-style bus) carries DAW output to the controller.
- Parse: Note On/Off (trigger scenes/hits), CC (continuous params: brightness, hue, effect depth),
  MIDI Clock / Song Position, or **Ableton Link** for beat-locked timing.

### 2. Cue / mapping engine (protocol-agnostic core)
- Maps incoming MIDI → abstract fixture state (color, level, effect).
- Owns timing, scenes, and **per-device rate limiting + coalescing** (send only the latest state; drop stale).
- Emits state changes to one or more `FixtureDriver`s.

### 3. Fixture drivers (pluggable adapters)
Interface (sketch):
```
interface FixtureDriver {
  discover(): Promise<Fixture[]>
  setState(fixtureId, { r,g,b, warm?, cool?, brightness?, transitionMs? }): void  // fire-and-forget, non-blocking
  close(): void
}
```
Planned adapters (in likely priority order, pending research):
- `WizUdpDriver` — UDP 38899 `setPilot`. First, because we own the bulb.
- `WledDriver` — WLED real-time (DDP / DRGB UDP). Likely the tight-sync workhorse.
- `SacnDriver` / `ArtNetDriver` — to feed a DMX node or sACN-capable fixtures for "proper rig" scale.

## Why pluggable
WiZ may not meet <50 ms. The show logic must not care which transport delivers the photons.
Swapping the driver = swapping `WizUdpDriver` for `WledDriver`, no choreography rewrite.

## Threading / runtime notes
- Keep MIDI handling off any blocking network call. Use fire-and-forget UDP; never await a device ACK in the hot path.
- One sender per device with a small ring/latest-value buffer to enforce rate limits without queuing lag.
