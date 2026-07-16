# Decisions Log (ADR-lite)

Running log of non-obvious decisions and their rationale. Newest at top.
Format: date · decision · why · status.

---

## 2026-06-29 · Added `pulse` action (fast attack → slow release) + two bugfixes
**Decision:** New bridge action **`pulse`**: one trigger = snap on to peak (attackMs, default 40), then ease-out fade to
0 (releaseMs, default 800; set ≈ one beat = 60000/BPM). Peak from fixed % or note velocity. Ideal for beat "flash with
decay". Exposed in UI + Reference. Verified on the real bulb (snap→decay→off).
**Bugfix 1 — MIDI reopen-deaf:** `MidiInput` now creates a **fresh `@julusian/midi` Input per open** (reopening a port on
the same RtMidi handle goes deaf — broke reception after a re-select).
**Bugfix 2 — stale bridge process:** restarts were hitting `EADDRINUSE` (old process kept the port + old code). Always
`pkill -9 -f "src/server.ts"` before `npm start`, and verify the server log shows a clean boot (not EADDRINUSE).
**Status:** Done; end-to-end verified (IAC note → pulse → lamp). Lesson: after restart, check the server LOG, not just
that *a* process answers on 8080.

## 2026-06-29 · MCP moved to project scope (.mcp.json) + Reference UI tab + UI bugfix
**Decision:** Convert the `ableton` MCP from local scope to **project scope** → committable `.mcp.json` in the repo root.
Add a **Reference** tab to the web UI documenting all commands (live mappings table + actions/timing/MCP-tools/checklist).
**Bugfix:** the browser UI had been missing its closing `</script></body></html>` since the MIDI-bridge rewrite,
silently breaking all client JS in-browser (unnoticed because testing was via API/sim). Restored the tags; verified in
Chrome that Manual swatches, the MIDI mapping editor, and the Reference tab all render.
**Why:** User wanted the MCP "in this folder" and an at-a-glance command reference. Browser verification caught the bug.
**Status:** Done; screenshot-verified. Lesson: screenshot the browser UI after big HTML edits, not just API tests.

## 2026-06-29 · Ableton control = ahujasid/ableton-mcp, vendored & extended with direct MIDI-out
**Decision:** Use ahujasid/ableton-mcp (most-vetted) for Live 12 control, vendored at `vendor/ableton-mcp/` and
**extended** with `send_cc` / `send_cc_ramp` / `send_note` tools (remote-script `_send_midi` → Control Surface Output =
IAC). Bridge gains **velocity→brightness** (Path C). See docs/ABLETON-MCP.md.
**Why:** Research showed NO MCP can author MIDI-CC clip envelopes (Live API limit). So: emit CC/notes live from the
remote script (Path A) for interactive testing, and use velocity-encoded notes in clips (Path C) for song-synced shows.
AbletonOSC could script IAC routing but the routing is a trivial one-time manual click — not worth the heavier setup.
**Why ahujasid over AbletonOSC:** maturity + one-launcher install; the routing-automation edge of AbletonOSC is marginal.
**Status:** Adopted. Code done + import-tested; MCP registered (✔ connected). Remaining = user's one-time Ableton GUI
setup (select AbletonMCP control surface, Output→IAC) + restart Claude Code to load tools.

## 2026-06-29 · MIDI bridge architecture: state-only handlers + fade engine + send-on-change
**Decision:** MIDI input updates engine state and triggers actions; a transition engine runs brightness fades with
**rate cap (~22/s) + send-on-change quantization**; mappings are JSON, channel-aware, with per-binding trigger
(press/release/change). MIDI lib = `@julusian/midi` (RtMidi, prebuilt, virtual-port capable). See docs/MIDI-BRIDGE.md.
**Why:** Matches the pro-tool consensus (QLC+/Resolume/Lightjams) and the WiZ flicker constraint — send-on-change is
the key guard so slow fades don't flood the bulb (the reason pywizlight throttles writes).
**Status:** Adopted. MVP built & tested 2026-06-29 (synthetic-MIDI sim + endpoint smoke tests pass).

## 2026-06-29 · Fade speed indexing via `msPerUnit`
**Decision:** On/off and fade in/out are ONE engine; the only difference is `msPerUnit` (ms per param-unit).
`10` → value 100 = 1 s (on/off); `1000` → value 100 = 100 s (fade). Duration value can come from the triggering CC,
a fixed value, or a second CC. Per-mapping, configurable in the UI.
**Why:** Directly implements the user's spec ("turn on param 100 = 1 s, fade in param 100 = 100 s") with one code path.
**Status:** Adopted.

## 2026-06-29 · Deferred (roadmap, not in MVP): gamma curve, global fixed-step loop, Ableton Link, HTP/LTP, scenes
**Decision:** Ship MVP with linear fades + per-fade timers; defer perceptual brightness, a single global render loop,
Ableton Link beat-lock, HTP/LTP source merging, and scenes/banks.
**Why:** Keep MVP small and working; these are quality/scale features. Link + WLED are the real path to <50 ms beat sync.
**Status:** Open — prioritized list in docs/MIDI-BRIDGE.md (gamma + global loop first).

## 2026-06-29 · WiZ = scene/mood device, NOT the tight-sync engine (research verdict)
**Decision:** Use the existing WiZ bulb for ambient/wash/slow-fade beds. Do **not** rely on it for <50 ms beat hits.
For tight sync, target **WLED (ESP32 + addressable LEDs) over DDP/DRGB/sACN**, ideally on a wired ESP32.
**Why:** Research (see RESEARCH.md) confirmed WiZ has WiFi jitter, an undocumented firmware command-rate ceiling, and
**non-controllable internal fade** (transition speed isn't settable via the UDP API, only the app). pywizlight also adds
a 750 ms retry on dropped packets (avoidable with a custom fire-and-forget sender, but the other limits remain).
**Status:** Adopted (pending your own latency measurement to confirm the bulb's floor).

## 2026-06-29 · Custom WiZ sender bypasses pywizlight retry
**Decision:** If we control WiZ from custom code, send **one fire-and-forget UDP packet per distinct cue** (no blocking
retry), de-duped per device, instead of pywizlight's default retry path.
**Why:** Avoids the 750 ms lost-packet retry penalty and the duplicate-retransmit flicker.
**Status:** Adopted for any WiZ driver we write.

## 2026-06-29 · Bridge tooling: QLC+ / Chataigne over IAC (no-code baseline)
**Decision:** Baseline bridge = **DAW → macOS IAC virtual MIDI → QLC+ or Chataigne → Art-Net/sACN/DDP → WLED/DMX.**
Cubase uses **generic MIDI via IAC** (Chataigne ships an Ableton M4L module but no Cubase module).
**Why:** Proven, free, avoids writing a bridge before we've validated the show idea. Watch the Ableton MIDI feedback-loop
gotcha (set input to your source only, not "any").
**Status:** Adopted as the phase-1 baseline; custom controller optional later.

## 2026-06-29 · Keep the output (device) layer pluggable behind an interface
**Decision:** The cue/mapping engine targets an abstract `FixtureDriver` interface; WiZ, WLED, DMX are adapters.
**Why:** Tight-sync goal (<50 ms) may force a move off WiZ WiFi bulbs to WLED/DDP or Art-Net/DMX. Decoupling the show
logic from the transport lets us swap devices without rewriting choreography.
**Status:** Adopted (design principle in CLAUDE.md §5).

## 2026-06-29 · Local-only control in the show hot path
**Decision:** All performance-time control is LAN-only (WiZ UDP 38899 / WLED UDP / sACN / Art-Net). Cloud only for setup.
**Why:** Cloud round-trips add 100s of ms and jitter — incompatible with on-the-beat sync.
**Status:** Adopted.

## 2026-06-29 · Language/stack — CHOSEN: TypeScript / Node.js
**Decision:** Build the controller in **TypeScript on Node.js**. WiZ control via Node's built-in **`dgram`** (no
`pywizlight`), HTTP/UI via **Express**, run with **`tsx`** (no build step). UI = plain HTML + vanilla JS (no framework).
**Why:** Matches the user's NestJS/TS background and the "long-lived service" goal; `dgram` gives direct fire-and-forget
UDP (our chosen WiZ send model) with zero deps; TS interfaces model the pluggable `FixtureDriver` cleanly. The device,
not the language, is the latency bottleneck — so the ergonomic/maintainable choice wins. MIDI later via `JZZ`/`easymidi`.
**Status:** Adopted. MVP (manual WiZ control UI) built & smoke-tested 2026-06-29 — discovery found the real bulb.
