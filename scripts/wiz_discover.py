#!/usr/bin/env python3
"""Discover WiZ bulbs on the LAN via UDP broadcast (port 38899). No deps.

Usage: python3 wiz_discover.py
Prints each responding bulb's IP and its getPilot JSON.
"""
import socket, json, time

def discover(timeout=2.0):
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
    s.settimeout(timeout)
    msg = json.dumps({"method": "getPilot", "params": {}}).encode()
    s.sendto(msg, ("255.255.255.255", 38899))
    seen = {}
    t = time.time()
    while time.time() - t < timeout:
        try:
            data, addr = s.recvfrom(2048)
            if addr[0] not in seen:
                seen[addr[0]] = data.decode()
        except socket.timeout:
            break
    return seen

if __name__ == "__main__":
    found = discover()
    if not found:
        print("No WiZ bulbs answered. Check the bulb is powered, on the same subnet, and UDP 38899 isn't firewalled.")
    for ip, payload in found.items():
        print(f"{ip}\t{payload}")
