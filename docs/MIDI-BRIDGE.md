# MIDI → Light Bridge — design, research & roadmap

Status 2026-06-29: **MVP built & tested.** MIDI input → mapping engine → fade/transition engine → WiZ driver,
with a config UI (port select, live monitor, MIDI-Learn, mapping editor). Cited research below shaped the design.

## What's built (Phase 1 bridge)

- **MIDI input** (`src/midi/input.ts`) via `@julusian/midi` (RtMidi/CoreMIDI). Lists ports, opens by index/name,
  parses CC / Note-On / Note-Off (Note-On vel 0 treated as Note-Off). Clock/sysex ignored for now.
- **Mapping engine** (`src/engine/showEngine.ts`): JSON mappings, channel-aware, wildcard channel/number,
  per-binding **trigger** (press ≥64 / release <64 / any change). Actions: `fade`, `toggle`, `color`,
  `brightness`, `temp`. Keeps a CC-value table so a fade's time can come from **another CC ("2nd param")**.
- **Fade/transition engine** (`src/engine/transitions.ts`): per-fixture brightness envelope, cancel→retarget
  (Latest-Takes-Precedence), easing (linear/easeIn/easeOut), **rate cap ~22/s + send-on-change** so slow fades
  send the *fewest* packets (verified: a 0.5 s fade = ~12 packets, a 100 s fade < 1 pkt/s) — this is what stops
  WiZ flickering.
- **The speed indexing you asked for:** on/off and fade are the same engine; only `msPerUnit` differs.
  `10` → value 100 = **1 s** (on/off feel); `1000` → value 100 = **100 s** (slow fade). Per-mapping, with a UI preset.
- **Config UI** (`public/index.html`, MIDI tab): port picker, **live MIDI monitor**, **MIDI-Learn** (capture next
  control), mapping editor with action-specific fields, fire-flash feedback. Persists to `config/show.json`.

## Research-backed best practices (sources at bottom)

The pro-tool consensus (QLC+, Resolume, Lightjams, Chataigne; consoles ETC/MA):

1. **Notes/PC = discrete triggers, CC = continuous values; bind by MIDI-Learn gesture.** Keep the three message
   types as *distinct* targets (grandMA's flattening of Note==CC is the anti-pattern). ✅ done.
2. **Per-binding mode** (toggle / momentary / range / velocity). ✅ partial — we have press/release/change + toggle.
3. **Decouple jittery MIDI from a fixed-step render loop.** MIDI handlers update *state only*; a fixed-rate tick
   advances envelopes and decides what to emit ("Fix Your Timestep"). ⚠️ we currently tick per-fade via setInterval
   (works, rate-capped) — see roadmap to move to one global loop.
4. **Fades = `{from,to,start,duration,easing}`, interpolated on the tick; cancel → retarget from the *current*
   value** (no snaps). ✅ done.
5. **Perceptual brightness (gamma/CIE).** Eyes are far more sensitive at low levels; a linear ramp looks like it
   jumps early then crawls. Do easing in linear space, apply gamma last. WiZ `dimming` may already be partly
   perceptual → make the curve a per-device setting. ⬜ not yet (linear today).
6. **Slow-device protection:** per-device send queue with **rate cap + send-on-change + coalesce-latest**. This is
   THE thing that keeps WiZ smooth. ✅ send-on-change + rate cap done; coalesce/global queue = roadmap.
7. **Merge multiple sources: HTP for intensity, LTP for color/attributes** (console convention). ⬜ roadmap.
8. **Beat sync: prefer Ableton Link** (shares beat+tempo+phase over LAN) over MIDI clock; if MIDI clock, use a
   dedicated clock-only port. ⬜ roadmap.

### Pitfalls (all accounted for or noted)
- MIDI **feedback loops** on IAC — never read the port you write; we only read. ✅
- **Note-On vel 0 = Note-Off**; CC 0 vs release semantics → per-binding trigger. ✅
- **Channel 1–16 (UI) = 0–15 (wire)** — UI shows Ch+1, stores 0–15. ✅
- **Bind by stable port name, not cached index** — we persist `midiPortName` and re-open by name on load. ✅
  (hot-plug re-scan = minor roadmap item.)
- Don't let MIDI drive device sends directly — always through the engine + rate limit. ✅

## Roadmap / what I'd add next (my recommendations)

**High value, low effort**
- **Perceptual brightness curve** (gamma ≈2.2 or CIE L\* LUT), per-device toggle. Biggest visual-quality win for fades.
- **Single global fixed-step loop** (30–60 Hz) replacing per-fade intervals — cleaner, enables multi-attribute envelopes.
- **Hot-plug rescan** of MIDI ports + auto-reopen by name.

**High value, more effort**
- **Ableton Link** client → expose beat/phase as state so effects can lock to the grid (your tight-sync goal).
  This is the natural answer to "react on the beat."
- **HTP/LTP layer merge** once >1 control or >1 fixture group drives a light.
- **Scenes/banks** (Program Change switches mapping sets; snapshot recall) for live performance.
- **Color crossfade** (currently color is instant; add a timed RGB interpolation like brightness).

**When hardware arrives (Phase 2)**
- **WLED driver** (DDP/DRGB UDP) behind the same `FixtureDriver` — far higher safe packet rate than WiZ, so the
  same engine can run smooth 40–60 fps fades and real beat hits. This is where <50 ms sync actually becomes possible.

## Critique of the current MVP (honest)
- **Per-fade `setInterval` isn't a true global clock.** Fine for a few fixtures; refactor before the rig grows.
- **No gamma yet** → fades may feel slightly top-heavy. Easy fix, listed above.
- **Color is instant, only brightness fades.** Matches your stated need; crossfade is a nice extra.
- **`fixture` is a single IP or `*`.** No fixture *groups* yet (e.g. "left/right"). Add when you have >1 bulb.
- **WiZ remains the latency ceiling** — the bridge is correct, but on-the-beat tightness waits on WLED (Phase 2).

## Sources
QLC+ MIDI: https://docs.qlcplus.org/v4/plugins/midi · input profiles https://docs.qlcplus.org/v4/input-output/input-profiles
Resolume MIDI shortcuts (per-binding modes, learn): https://resolume.com/support/en/midi-shortcuts
Lightjams (fixed render rate, input multiple): https://www.lightjams.com/history.html
Fix Your Timestep: https://gafferongames.com/post/fix_your_timestep/ · Easings: https://easings.net/
Gamma/CIE: https://www.advateklighting.com/blog/guides/dithering-and-gamma-correction · https://gist.github.com/mathiasvr/19ce1d7b6caeab230934080ae1f1380e
HTP/LTP: https://www.onstagelighting.co.uk/learn-stage-lighting/htp-vs-ltp-lighting-desk-basics-5/ · OLA merging https://www.openlighting.org/ola/advanced-topics/ola-merging-algorithms/
Ableton Link/MIDI: https://www.ableton.com/en/manual/synchronizing-with-link-tempo-follower-and-midi/
IAC feedback pitfalls: https://www.qlcplus.org/forum/viewtopic.php?t=16994 · https://midilize.com/guides/iac-driver-mac
pywizlight (write throttle to avoid flicker): https://github.com/sbidy/pywizlight
Node MIDI: https://github.com/Julusian/node-midi · https://www.npmjs.com/package/easymidi · https://github.com/jazz-soft/JZZ
