# Hardware

## Owned
- **1× WiZ Colors A60 E27 RGB** — Signify/Philips `9290023836A`, 8 W, 2200–6500K + RGB, 806 lm, 220–240 V, E27 screw.
  - Currently paired in **Google Home**.
  - Has a **local UDP API** (port 38899) — primary candidate for the first control spike.

## To evaluate / buy (tiers)

### Tier 0 — prove it with what we have (~$0)
- Use the existing WiZ bulb. Goal: measure real latency & rate limits, decide if WiZ is show-grade.

### Tier 1 — cheap tight-sync DIY (~low cost) ← **Phase-2 buy**
- **ESP32 + WLED** driving a **WS2812B/SK6812 addressable strip** + 5 V PSU.
  - WLED real-time (DDP/UDP) is the standard low-latency DIY path. See Ukraine sourcing below.

### Tier 2 — small real rig
- Multiple WLED nodes and/or a **USB-DMX / Art-Net→DMX node** + a couple of DMX PAR/wash fixtures.

### Tier 3 — "proper" show
- sACN/Art-Net backbone, several DMX fixtures, dedicated AP for the light LAN.

---

## Phase-2 shopping list — Ukraine sourcing (priced 2026-06-29)

Goal: one ESP32 + 1 m WS2812B strip + 5 V PSU to flash WLED and validate **DDP latency**.
Total ≈ **700–1,200 ₴ (~$17–30)**, one Nova Poshta delivery.

### 1. ESP32 DevKit v1 (WROOM-32, 30-pin)  — ~200–350 ₴
Get the **plain DevKit v1**, not an S3/special variant.
- Rozetka — ESP32 DevKit v1 WROOM-32 (DroidShop): https://rozetka.com.ua/ua/249475211/p249475211/
- ArduinoKit — ESP32 DEVKIT v1 LunaNode32 (~235 ₴): https://arduinokit.com.ua/ua/p1176510996-esp32-plata-bluetooth.html
- Ekran (Львів) — WROOM-32 CH340 30pin: https://ekran.in.ua/ua/p2595173032-plata-razrabotki-wroom.html
- Browse: https://prom.ua/ua/Esp-32.html

### 2. WS2812B addressable strip, 5 V — ~150–250 ₴ (1 m)
Buy **1 m, 60 LED/m, IP20** for the test (30 LED/m is fine; 144 is overkill).
⚠️ MUST be **WS2812B** (or SK6812) and **5 V** — NOT a plain "RGB 12V" strip (those aren't individually addressable).
- Rozetka — WS2812B 5V 30 LED/m RGBIC (Dilumeres): https://build.rozetka.com.ua/ua/481059044/p481059044/
- LED-Light — WS2812B 5V 5050 60 LED/m (~177 ₴/m): https://xn----8sbkdxhd2d.com.ua/ua/p1696582184-svetodiodnaya-adresnaya-lenta.html
- Electronica (Дніпро) — WS2812B IP24 60 LED 1 m: https://electronica.in.ua/ua/p1541915911-adresnaya-svetodiodnaya-lenta.html
- Browse: https://prom.ua/ua/Ws2812b-lenta.html

### 3. 5 V PSU — ~200–400 ₴
For 1 m/60 LEDs a **5V 4–5A (20–25 W)** brick is plenty (60 LEDs at full white ≈ 3.6 A peak).
- Rozetka — 5V power supplies: https://hard.rozetka.com.ua/ua/psu/c80086/52912=4681940/
- Prom.ua — БЖ 5V 5A: https://prom.ua/ua/Blok-pitaniya-5v-5a.html
- Prolum — 5V LED adapters: https://prolum.com.ua/bloki-pitaniya-5v/

### Small extras (cheap, save headaches)
- Jumper/Dupont wires (GPIO→data, common ground) — ~30–50 ₴.
- **300–500 Ω resistor** on the data line + **1000 µF cap** across strip 5V/GND — WS2812B best practice. ~20 ₴.
- *Optional* **74AHCT125 level shifter** (ESP32 3.3 V data → 5 V) — skippable for a 1 m test, "do it right" later. ~30–60 ₴.
- DC barrel-jack → screw-terminal adapter (if PSU has a barrel plug) — ~20 ₴.

### Where to buy — recommendation
- **Specialist shops first** (compatible parts + advice): arduino.ua, arduinokit.com.ua, kosmodrom.com.ua, imrad.com.ua, ekran.in.ua.
- **Rozetka / Prom.ua** — fastest delivery; read specs (confirm "WS2812B" + "5V").
- **AliExpress** — ~half price but slow shipping to UA; good for spares / patience.

### Wiring (so it works first try)
ESP32 GPIO (e.g. **GPIO16**) → resistor → strip **DIN**; PSU **5V/GND** → strip **5V/GND**;
**tie ESP32 GND to PSU GND** (common ground — the #1 forgotten step). For 10–20 LEDs you can power the strip from the
ESP32 5V/USB to test; use the PSU for anything brighter/longer.

## Networking notes (latency hygiene)
- Prefer a **dedicated 2.4/5 GHz AP** or VLAN for fixtures to avoid congestion jitter.
- Keep the controller machine wired or on the same AP; minimize hops.
- WiFi bulbs (WiZ) are the jitter risk; ESP/WLED on a clean network is more deterministic.
