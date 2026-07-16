---
name: wiz-probe
description: Discover WiZ bulbs on the local network and exercise/benchmark their local UDP API (port 38899) — getSystemConfig, getPilot, setPilot — and measure round-trip latency and safe command rate. Use when working on the WiZ control spike, debugging local control, or measuring latency/rate limits for the MIDI Light Show project.
---

# wiz-probe

Local control & latency probing for WiZ bulbs (MIDI Light Show project).

## What WiZ local control is
WiZ bulbs listen for **UDP JSON** on **port 38899** on the LAN (no cloud needed). Key methods:
- `{"method":"getSystemConfig","params":{}}` → model, firmware (`fwVersion`), MAC.
- `{"method":"getPilot","params":{}}` → current state (r,g,b,c,w,dimming,state,scene).
- `{"method":"setPilot","params":{...}}` → set state. Useful params:
  - `r,g,b` (0–255), `c` (cool white), `w` (warm white), `dimming` (10–100),
  - `state` (true/false on/off), `temp` (Kelvin), `sceneId`, `speed`.
- Bulbs also **broadcast/respond** to discovery via `getPilot` to the subnet broadcast address.

## Discover bulbs (no extra deps)
Broadcast a `getPilot` and collect responders:
```bash
# Requires: nc may not broadcast reliably; prefer the python one-liner below.
python3 - <<'PY'
import socket, json, time
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
s.settimeout(2)
msg = json.dumps({"method":"getPilot","params":{}}).encode()
s.sendto(msg, ("255.255.255.255", 38899))
seen=set()
t=time.time()
while time.time()-t < 2:
    try:
        data, addr = s.recvfrom(2048)
        if addr[0] not in seen:
            seen.add(addr[0]); print(addr[0], data.decode())
    except socket.timeout:
        break
PY
```

## Set color (single bulb)
```bash
IP=<bulb-ip>
python3 - "$IP" <<'PY'
import socket, json, sys
ip=sys.argv[1]
s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM); s.settimeout(2)
pkt=json.dumps({"method":"setPilot","params":{"r":255,"g":0,"b":0,"dimming":100,"state":True}}).encode()
s.sendto(pkt,(ip,38899)); print(s.recvfrom(2048)[0].decode())
PY
```

## Measure round-trip latency
```bash
IP=<bulb-ip>
python3 - "$IP" <<'PY'
import socket, json, sys, time, statistics
ip=sys.argv[1]
s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM); s.settimeout(1)
samples=[]
for i in range(50):
    pkt=json.dumps({"method":"setPilot","params":{"r":(i*5)%255,"g":0,"b":255,"dimming":100,"state":True}}).encode()
    t0=time.perf_counter()
    s.sendto(pkt,(ip,38899))
    try:
        s.recvfrom(2048)             # ACK round-trip (not photons)
        samples.append((time.perf_counter()-t0)*1000)
    except socket.timeout:
        print("timeout (dropped) at", i)
    time.sleep(0.05)                  # 20 Hz — adjust to probe rate limits
print(f"n={len(samples)} min={min(samples):.1f} med={statistics.median(samples):.1f} "
      f"p95={sorted(samples)[int(len(samples)*0.95)-1]:.1f} max={max(samples):.1f} ms")
PY
```

## Probe the rate limit
Re-run the latency loop reducing `time.sleep` (e.g. 0.02 = 50 Hz, 0.01 = 100 Hz). Watch for:
- Rising drops/timeouts, climbing latency, or the bulb visibly **lagging behind** the commands.
- The last `sleep` value with no drops and visually-tracking color ≈ the **safe command rate** for the show engine.

## Caveats
- ACK round-trip ≠ **photon latency** (the eye-visible change). The bulb's internal fade/PWM adds more —
  confirm visually / with a phone slow-mo camera. Record both in `experiments/`.
- WiZ may apply a **fade** between colors; abrupt per-beat hits can look soft. Check if `setPilot` has a way to
  minimize transition, else accept the floor and note it.
- Google Home pairing should not block UDP control, but verify the bulb is on the same subnet.
