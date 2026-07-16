# Ableton MCP (extended) — setup & usage

We use **ahujasid/ableton-mcp**, vendored at `vendor/ableton-mcp/` and **extended** with direct MIDI-out tools
so Claude can emit **CC and notes straight to the IAC bus** (Live's API can't author MIDI-CC clip envelopes, so we
send CC live from the remote script). This drives the light bridge from Ableton.

## What was installed/changed (already done)
- Cloned ahujasid/ableton-mcp → `vendor/ableton-mcp/`.
- **Remote script** (`AbletonMCP_Remote_Script/__init__.py`): added a `send_midi` command + `_send_midi_messages()`
  that calls the Control Surface's `_send_midi` (emits to the surface's OUTPUT port).
- **MCP server** (`MCP_Server/server.py`): added tools **`send_cc`**, **`send_cc_ramp`** (timed CC sweep/fade),
  **`send_note`** (note-on + auto note-off, velocity encodes level). Telemetry made optional (no `supabase` needed).
- Python venv (`vendor/ableton-mcp/.venv`, python3.12) with `mcp[cli]`; editable launcher `.venv/bin/ableton-mcp`.
- Remote script copied to `~/Music/Ableton/User Library/Remote Scripts/AbletonMCP/__init__.py`.
- Registered with Claude Code: `claude mcp add ableton -- …/.venv/bin/ableton-mcp` (local scope).

## Manual steps you must do (one-time)

1. **macOS IAC bus on** — Audio MIDI Setup → MIDI Studio → IAC Driver → "Device is online" (e.g. "IAC Driver Bus 1").
2. **Ableton Live 12 → Settings → Link, Tempo & MIDI:**
   - **Control Surface** slot → choose **AbletonMCP** (this starts the MCP's remote script + socket).
     - Set its **Input** = None, and its **Output** = **IAC Driver (Bus 1)**. ← this is what routes Claude's
       `send_cc`/`send_note` to the bridge.
   - Under **MIDI Ports**, for **Output: IAC Driver (Bus 1)** enable **Track** (and **Remote**). For the bridge to
     also receive **clip notes**, you'll set a MIDI track's **"MIDI To" → IAC Driver (Bus 1)** later.
3. **Restart Claude Code** so the new `ableton` MCP tools load into the session (added mid-session won't appear until reload).
4. **Bridge:** open http://localhost:8080 → MIDI tab → select **IAC Driver Bus 1** as the input. (Run `npm start` if it's not up.)

## Two ways to drive the bridge from Ableton
- **A — Live CC/notes from Claude (interactive testing):** I call `send_cc` / `send_cc_ramp` / `send_note`
  → remote script `_send_midi` → AbletonMCP Output (IAC) → bridge. Great for "sweep brightness now".
- **B — Timeline clips (song-synced):** I create a MIDI track + clip with **notes** (`create_midi_track`,
  `create_clip`, `add_notes_to_clip`), you set the track's **"MIDI To" → IAC**; velocity encodes brightness
  (bridge maps velocity→level), note-on/off drives the fade engine. Plays in time with your music.

## New tools (capability summary)
| Tool | Does | Use |
|------|------|-----|
| `send_cc(cc, value, channel=1)` | one CC message | instant param set |
| `send_cc_ramp(cc, start, end, duration_ms, steps, channel=1)` | timed CC sweep | brightness/color fades |
| `send_note(note, velocity, channel=1, duration_ms=200)` | note-on + note-off | triggers; velocity = level |
| (stock) `create_midi_track`, `create_clip`, `add_notes_to_clip`, `set_tempo`, `fire_clip`, … | build timeline | song-synced shows |

## Quick test after setup (ask Claude, post-restart)
1. In the bridge MIDI tab, **Learn** a mapping on CC 20 → action **Color** (hue from value), and CC 21 → **Fade** (value→time).
2. Ask: "send_cc 20 value 64" → bulb hue changes. "send_cc_ramp cc 21 start 0 end 127 over 2000ms" → watch a fade.
3. Or "send_note 60 velocity 100" with a Note 60 → toggle/fade mapping.

## Notes / gotchas
- The remote script only runs while **AbletonMCP is selected as a Control Surface** — required for any MCP tool.
- `_send_midi` goes to the **Control Surface Output** port; if it's None, nothing is emitted — must be IAC.
- Don't point the bridge at a port Ableton is *also reading* from the same app → feedback. We only read IAC in the bridge.
- This is a third-party remote script (runs Python in Live) — source is vendored in-repo for review; pinned by our edits.
