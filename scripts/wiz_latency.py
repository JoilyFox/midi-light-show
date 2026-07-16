#!/usr/bin/env python3
"""Measure WiZ local UDP round-trip latency and probe the safe command rate. No deps.

Usage:
  python3 wiz_latency.py <bulb-ip> [hz] [count]
    hz    = commands per second to send (default 20). Lower it / raise it to find the rate limit.
    count = number of commands (default 50).

Reports min/median/p95/max ACK round-trip and any drops.
NOTE: ACK round-trip is NOT photon latency. Confirm the visible change with a slow-mo phone camera.
"""
import socket, json, sys, time, statistics

def run(ip, hz=20.0, count=50):
    interval = 1.0 / hz
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.settimeout(1.0)
    samples, drops = [], 0
    for i in range(count):
        params = {"r": (i * 7) % 255, "g": 0, "b": 255, "dimming": 100, "state": True}
        pkt = json.dumps({"method": "setPilot", "params": params}).encode()
        t0 = time.perf_counter()
        s.sendto(pkt, (ip, 38899))
        try:
            s.recvfrom(2048)
            samples.append((time.perf_counter() - t0) * 1000)
        except socket.timeout:
            drops += 1
        time.sleep(interval)
    if samples:
        p95 = sorted(samples)[max(0, int(len(samples) * 0.95) - 1)]
        print(f"ip={ip} hz={hz} n={len(samples)} drops={drops} "
              f"min={min(samples):.1f} med={statistics.median(samples):.1f} "
              f"p95={p95:.1f} max={max(samples):.1f} ms")
    else:
        print(f"ip={ip} hz={hz} ALL {count} dropped — likely over the rate limit or wrong IP.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(1)
    ip = sys.argv[1]
    hz = float(sys.argv[2]) if len(sys.argv) > 2 else 20.0
    count = int(sys.argv[3]) if len(sys.argv) > 3 else 50
    run(ip, hz, count)
