# Research Findings — SOURCE OF TRUTH for device/latency decisions

> Compiled 2026-06-29 from a multi-agent deep-research run (104 agents, ~388 web fetches/searches,
> 3-vote adversarial verification per claim). Each major claim below was verified against primary sources.
> Where a claim was nuanced/refined by the verifiers, that nuance is kept. Measurements you take on the real
> device override anything here — update the entry and note it.

---

## TL;DR / Verdict

- **WiZ local control works and is cloud-free.** The bulb speaks **UDP JSON on port 38899** (`getPilot`/`setPilot`/
  `getSystemConfig`); the WiZ app's "Local Control" toggle is **on by default**, so the **Google Home dependency can be
  removed** entirely for your control path.
- **WiZ is a poor fit for tight (<50 ms) on-the-beat sync.** Three independent reasons: (1) WiFi jitter, (2) the bulb's
  **internal color-fade smoothing** (you cannot set/disable transition speed via the UDP API — only in the app), and
  (3) an **undocumented firmware command-rate ceiling**. Real verdict: great for **scenes, moods, slow fades, section
  changes**; not for hitting kicks/snares.
- **The proven low-latency path is WLED on an ESP32 driving addressable LED strips**, fed by real-time UDP
  (**DDP / DRGB / DNRGB / E1.31-sACN / Art-Net**). With a **wired** ESP32 you can reliably beat 50 ms; WLED docs target
  **40 fps = 25 ms** frame intervals. This is the workhorse for real beat-sync.
- **For a "proper" rig**, go **DAW → IAC virtual MIDI → QLC+/TouchDesigner/Chataigne → Art-Net/sACN → DMX or WLED**.
- **Best bulbs *if* you stay with bulbs:** Philips **Hue Entertainment** (UDP 2100, DTLS, needs a Hue Bridge; most
  purpose-built for sync, but the Zigbee bridge runs ~25 Hz) and **LIFX LAN** (UDP 56700, ~20 msg/s/device). Both beat
  WiZ for realtime; none beat wired WLED/DMX.

---

## 1. WiZ local control & latency

**Transport.** WiZ WiFi bulbs communicate via **UDP on ports 38899 and 38900** on the LAN. JSON request/response with
`method`/`params`/`result`/`error`. Cloud connectivity is **not required** for local control.
- Quick test: `echo '{"method":"getPilot","params":{}}' | nc -u -w 1 <bulb-ip> 38899`.
- Methods: `getSystemConfig` (model, fwVersion, MAC, RSSI), `getPilot` (state: r,g,b,c,w,dimming,temp,sceneId,state),
  `setPilot` (set those params).
- Sources: WiZ/Home-Assistant integration docs (home-assistant.io/integrations/wiz/), `sbidy/pywizlight` README,
  Rogozin blog (2021-08-13), plus independent OpenWiz (C#), a Dart `wiz` package, and Go tutorials — all describe the
  same port-38899 UDP JSON protocol. **3-0 verified.**

**Removing the cloud / Google Home dependency.** The WiZ app has a **"Local Control" / allow-local toggle that is on by
default**; enabling/leaving it on permits direct LAN control independent of any cloud account. Google Home pairing does
not block UDP control as long as the bulb is on the same subnet. **3-0 verified.**

**Library.** `sbidy/pywizlight` (Python, asyncio, non-blocking `DatagramTransport`) is the mature reference
implementation. Node can do the same with raw `dgram` UDP — there is no rate limit *in the bulb's protocol itself* that
the library exposes; pywizlight's "rate limiting" is **library-level retry logic, not a documented bulb limit.**

**The "750 ms" gotcha (important nuance).** pywizlight's `_send_udp_message_with_retry` uses constants
`TIMEOUT=13s, MAX_SEND_DATAGRAMS=6, FIRST_SEND_INTERVAL=0.75, MAX_BACKOFF=3`. Because UDP can drop packets, it **re-sends
the same datagram** with backoff (0, 0.75, 2.25, 5.25, 8.25, 11.25 s). So **a single lost packet is not retried for
750 ms** — fatal for beat sync. **BUT** the verifiers stress: this only hits on the **lost-packet path**; the happy-path
first datagram fires immediately, and **a custom fire-and-forget sender bypasses pywizlight's blocking retry entirely.**
So 750 ms is a *library* artifact, not a hard bulb ceiling. **3-0 verified, with this nuance.**

**Fade/transition cannot be controlled via UDP.** Transition (on↔off / color fade) speed is **not settable via the local
UDP API — only in the WiZ app** (Home-Assistant issue #118562). The bulb applies its own smoothing between colors, which
adds perceived latency and softens hard hits. You can't turn this off programmatically. **Verified.**

**Honest failure reports.** Community reports of WiZ RGBW bulbs taking **10–20 seconds** to change in some
firmware/driver configs, and **flicker** when the same `setPilot` is re-applied by duplicate retransmissions (a
sender-side artifact, mitigated by de-duping to one packet per distinct cue). **Verified.**

**Native "Music Sync" is not usable here.** WiZ's built-in Music Sync is an **app + Bluetooth-mic, foreground-only**
feature (firmware 1.32.0+, June 2024) — **not** a headless LAN/MIDI path. Irrelevant to our architecture. **3-0 verified.**

### 2. Can WiZ hit <50 ms on-the-beat? — No (practical floor)
Even with a custom non-blocking UDP sender (avoiding the 750 ms retry), you're still subject to **WiFi jitter + the
bulb's uncontrollable internal fade + an undocumented firmware update ceiling.** Verdict from the run: **WiZ is a poor
fit for tight sync.** Treat it as a **scene/mood device** (slow fades, section-level color changes, ambient pulses),
not a transient-accurate one. **Measure your own bulb** with `scripts/wiz_latency.py` to get the real number on your
network, but plan the show architecture around WLED/DMX for the tight parts.

---

## 3. Lower-latency hardware paths

### WLED on ESP32/ESP8266 + addressable strips — **recommended for tight sync**
- Hardware: ESP32 (preferred) or ESP8266 driving **WS2812B / SK6812** addressable LEDs + a 5 V PSU.
- Real-time protocols (WLED wiki, **primary**, 3-0 verified):
  - **UDP Realtime on port 21324**, byte 0 selects protocol: **WARLS(1)** max 255 LEDs, **DRGB(2)** max 490,
    **DRGBW(3)** max 367, **DNRGB(4)** max 489 LEDs/packet (multi-packet).
  - **DDP** (Distributed Display Protocol) over **UDP port 4048** — lower header overhead than E1.31 → smoother
    animation; **LedFx's default** for WLED.
  - **E1.31 (sACN)** and **Art-Net** — standard lighting-industry streaming; sACN universe = 512 ch = 170 RGB LEDs.
- Performance guidance (WLED docs, **primary**): for **fluent 40 fps (25 ms frame interval)** with E1.31, use **≤3
  universes (≤510 LEDs)**. For lowest latency/jitter: **disable WiFi sleep on the ESP32**, run WLED in **station mode**
  (not AP), optionally **disable router WMM/QoS**, and keep **MTU = 1500** (lower MTU fragments DDP packets and WLED
  drops the rest of the frame). **Wired-Ethernet ESP32 is recommended to reliably beat 50 ms**; pure-WiFi boards can
  struggle for fluid streams. **Verified.**
- **Bottom line:** WLED + DDP/sACN on a clean (ideally wired) network is the most deterministic DIY sub-50 ms path.

### DMX512 via USB / Art-Net-sACN nodes — for "real fixtures"
- Path: **DAW → IAC MIDI → QLC+ (or TouchDesigner/Chataigne/Resolume) → Enttec DMX USB Pro → DMX fixtures**, or
  **→ Art-Net/sACN → DMX node → fixtures.** QLC+ can act as a MIDI→DMX translator and "learn" MIDI notes to scenes, or
  use a TAP/beat function. **Verified** (multiple practitioner writeups, QLC+ forum, Unzyme Ableton-DMX tutorial).
- Use this when you want PAR/wash/moving-head fixtures rather than LED strips.

### Other bulb ecosystems (all WiFi-class; better than WiZ, still behind wired WLED/DMX)
- **Philips Hue Entertainment:** streams over **UDP port 2100 with DTLS 1.2 (PSK, TLS_PSK_WITH_AES_128_GCM_SHA256)**;
  **requires a Hue Bridge**. Apps stream **50–60 Hz**, but the **bridge only pushes Zigbee at ~25 Hz**. Most
  purpose-built bulb path for low-latency sync. **3-0 verified.**
- **LIFX LAN:** cloud-free **UDP port 56700**, packed-binary protocol; docs **recommend ~20 messages/s/device** and warn
  against flooding/malformed packets. Better realtime than WiZ. **3-0 verified.**
- **Govee LAN API:** must be **enabled per device** in the app; multicast discovery **239.255.255.250 UDP 4001**,
  responses **UDP 4002**, control **UDP 4003**; commands: on/off, brightness, status, color/temp. **Verified.**
- **Nanoleaf:** Nanoleaf 4D quoted **sub-45 ms** latency (deterministic hardware path). (Marketing-ish; treat as
  ballpark.)

---

## 4. MIDI → light bridge (DAW integration)

- **Virtual MIDI on macOS = IAC Driver** (Audio MIDI Setup → enable IAC bus). DAW sends MIDI out the IAC bus; the
  controller app / QLC+ reads it in. **Verified** (QLC+ macOS forum).
- **Ableton feedback-loop gotcha:** set Ableton to take input **only from your intended MIDI source** (it defaults to
  "any"), and enable **Track** in MIDI prefs for output. Otherwise you get a MIDI feedback loop with the IAC bus.
  **Verified.**
- **Mapping:** notes → scenes/hits; CC → continuous params (brightness/hue/effect depth); **MIDI clock / Song Position**
  or **Ableton Link** for beat timing. Ableton's **Track Delay** can compensate for fixed output latency.
- **Tools** (all verified to support the relevant protocols):
  - **QLC+** — free; MIDI-in (IAC) → DMX/Art-Net/sACN/E1.31 out; "learn" notes to scenes, TAP beat sync. Great glue.
  - **Chataigne** — free, modular router: MIDI, OSC, **DMX (Art-Net, sACN/E1.31, Enttec OpenDMX)**, Serial, UDP/TCP,
    **Ableton Link**. Ships an **Ableton Live (M4L) module but NOT a Cubase module** → from **Cubase use generic MIDI
    via IAC**. Most flexible for a custom show brain without coding.
  - **TouchDesigner** — powerful, programmable; DMX/Art-Net out; overkill unless you want visuals too.
  - **Resolume, LedFx, SoundSwitch, Magic, xLights, showxpress** — exist in this space; LedFx is audio-reactive (mic/
    line-in) rather than MIDI-driven.

---

## 5. Recommended language / library stack (custom controller)

- The **device/protocol is the latency bottleneck, not Python vs Node.** Either is fine for a fire-and-forget UDP sender.
- **Python:** `python-rtmidi` (thin RtMidi C++ wrapper; supports true blocking `receive()` in Python 3 → low-latency
  MIDI) or `mido` (wraps rtmidi) + `pywizlight` for WiZ **or** raw `socket` UDP for WLED DDP/DRGB. Fastest to prototype.
- **Node/TS:** `JZZ`/`easymidi` for MIDI + raw `dgram` UDP for WiZ/WLED. Matches your backend background; better for a
  long-lived service.
- For WiZ specifically, prefer a **custom non-blocking sender** (one packet per distinct cue, no blocking retry) over
  pywizlight's default retry path to avoid the 750 ms penalty.

---

## 6. Shopping list / budget tiers

| Tier | Buy | ~Goal | Notes |
|------|-----|-------|-------|
| **0 — prove it ($0)** | nothing | measure WiZ on your LAN | Run `scripts/wiz_*.py`; confirm WiZ = scene device |
| **1 — DIY tight-sync (low)** | 1× **ESP32**, a reel of **WS2812B/SK6812**, a **5 V PSU**, a logic-level/data wire | beat-sync <50 ms | Flash **WLED**; feed **DDP/DRGB**; disable WiFi sleep; ideally wire the ESP32 via Ethernet |
| **2 — small real rig (mid)** | + 2–3 **WLED nodes** and/or a **USB-DMX (Enttec DMX USB Pro)** or **Art-Net→DMX node** + a couple of **DMX PAR/wash** fixtures | mixed strips + fixtures | QLC+/Chataigne as the MIDI→DMX/Art-Net brain |
| **3 — proper show (higher)** | sACN/Art-Net backbone, several DMX fixtures, **dedicated AP/VLAN** for the light LAN | venue-grade | Separate the light network from everything else to kill jitter |

**Keep WiZ in the rig** as ambient/wash fills and slow color beds — it's genuinely good at that, and you already own it.

---

## Open items to confirm by measurement (yours)
- [ ] Real WiZ UDP round-trip + visible-change latency on your network (`scripts/wiz_latency.py` + slow-mo camera).
- [ ] Your bulb's practical max command rate before it lags/de-syncs (sweep `hz` in the probe).
- [ ] WLED DDP end-to-end latency once you have an ESP32 (the number that actually matters for the show).

## Key sources
- Home Assistant WiZ integration — https://www.home-assistant.io/integrations/wiz/
- pywizlight — https://github.com/sbidy/pywizlight (+ `bulb.py` retry constants)
- WiZ fade-not-settable — https://github.com/home-assistant/core/issues/118562
- WiZ Music Sync (app/BT) — https://wizconnected.helpshift.com/hc/en/7-wiz-v2/section/177-light-sync-with-music/
- WLED UDP Realtime — https://github.com/wled/WLED/wiki/UDP-Realtime-Control
- WLED DDP / E1.31 / FAQ — https://kno.wled.ge/interfaces/ddp/ , /interfaces/e1.31-dmx/ , /basics/faq/
- LedFx network/latency — https://docs.ledfx.app/en/latest/troubleshoot/network.html
- Chataigne — https://github.com/benkuper/Chataigne
- QLC+ + IAC (macOS) — https://www.qlcplus.org/forum/viewtopic.php?t=16994
- Ableton→DMX — https://unzyme.com/diy/ableton-live-dmx-controller/
- LIFX LAN — https://lan.developer.lifx.com/docs/introduction
- Hue Entertainment — https://iotech.blog/posts/philips-hue-entertainment-api/
- Govee LAN API — https://community.govee.com/posts/mastering-the-lan-api-series-lan-api-101/136755
