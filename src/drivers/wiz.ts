/**
 * WizUdpDriver — local control of WiZ bulbs over the LAN.
 *
 * WiZ bulbs speak JSON over UDP on port 38899 (cloud-free):
 *   getSystemConfig → model / firmware / mac
 *   getPilot        → current state
 *   setPilot        → set state { r,g,b, c,w, temp, dimming, state, sceneId }
 *
 * Design notes (see docs/DECISIONS.md):
 *  - setState() is FIRE-AND-FORGET: one datagram, no blocking retry → avoids the
 *    750 ms retry penalty that pywizlight imposes on dropped packets.
 *  - discover()/getState() do a request→response on a short-lived socket.
 */

import dgram from 'node:dgram';
import type { Fixture, FixtureDriver, FixtureState } from '../types';

const WIZ_PORT = 38899;
const BROADCAST = '255.255.255.255';

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));

/** Translate the abstract FixtureState into WiZ setPilot params. */
export function buildPilotParams(s: FixtureState): Record<string, unknown> {
  const p: Record<string, unknown> = {};
  if (s.on !== undefined) p.state = s.on;
  if (s.brightness !== undefined) p.dimming = clamp(s.brightness, 10, 100);

  const hasRgb = s.r !== undefined || s.g !== undefined || s.b !== undefined;
  if (hasRgb) {
    p.r = clamp(s.r ?? 0, 0, 255);
    p.g = clamp(s.g ?? 0, 0, 255);
    p.b = clamp(s.b ?? 0, 0, 255);
  } else if (s.temp !== undefined) {
    p.temp = clamp(s.temp, 2200, 6500);
  } else {
    if (s.warm !== undefined) p.w = clamp(s.warm, 0, 255);
    if (s.cool !== undefined) p.c = clamp(s.cool, 0, 255);
  }
  return p;
}

export class WizUdpDriver implements FixtureDriver {
  /** Persistent socket for fire-and-forget setState sends. */
  private sendSock = dgram.createSocket('udp4');
  private bound = false;

  private async ensureBound(): Promise<void> {
    if (this.bound) return;
    await new Promise<void>((resolve) => {
      this.sendSock.bind(() => {
        this.sendSock.setBroadcast(true);
        this.bound = true;
        resolve();
      });
    });
  }

  /** Fire-and-forget setPilot. */
  setState(ip: string, state: FixtureState): void {
    const msg = Buffer.from(JSON.stringify({ method: 'setPilot', params: buildPilotParams(state) }));
    void this.ensureBound().then(() => {
      this.sendSock.send(msg, WIZ_PORT, ip, (err) => {
        if (err) console.error(`[wiz] send to ${ip} failed:`, err.message);
      });
    });
  }

  /** Send a method and await the first JSON response (or null on timeout). */
  private request(ip: string, method: string, timeoutMs = 1000): Promise<Record<string, unknown> | null> {
    return new Promise((resolve) => {
      const sock = dgram.createSocket('udp4');
      const done = (val: Record<string, unknown> | null) => {
        clearTimeout(timer);
        try { sock.close(); } catch { /* already closed */ }
        resolve(val);
      };
      const timer = setTimeout(() => done(null), timeoutMs);
      sock.on('message', (buf) => {
        try { done(JSON.parse(buf.toString())); } catch { done(null); }
      });
      sock.on('error', () => done(null));
      sock.bind(() => {
        const msg = Buffer.from(JSON.stringify({ method, params: {} }));
        sock.send(msg, WIZ_PORT, ip);
      });
    });
  }

  async getState(ip: string): Promise<Record<string, unknown> | null> {
    const res = await this.request(ip, 'getPilot');
    return (res?.result as Record<string, unknown>) ?? null;
  }

  /** Broadcast getPilot, collect responders, enrich each with getSystemConfig. */
  async discover(timeoutMs = 1500): Promise<Fixture[]> {
    const found = new Map<string, Fixture>();
    const sock = dgram.createSocket('udp4');

    await new Promise<void>((resolve) => {
      sock.on('message', (buf, rinfo) => {
        if (found.has(rinfo.address)) return;
        let mac: string | undefined;
        try {
          const json = JSON.parse(buf.toString());
          mac = json?.result?.mac;
        } catch { /* ignore malformed */ }
        found.set(rinfo.address, { id: rinfo.address, ip: rinfo.address, mac });
      });
      sock.bind(() => {
        sock.setBroadcast(true);
        const msg = Buffer.from(JSON.stringify({ method: 'getPilot', params: {} }));
        sock.send(msg, WIZ_PORT, BROADCAST);
        setTimeout(() => { try { sock.close(); } catch { /* */ } resolve(); }, timeoutMs);
      });
    });

    // Enrich with module name (best-effort, parallel).
    await Promise.all(
      [...found.values()].map(async (f) => {
        const cfg = await this.request(f.ip, 'getSystemConfig', 800);
        const result = cfg?.result as Record<string, unknown> | undefined;
        if (result?.moduleName) f.module = String(result.moduleName);
        f.name = f.module ? `WiZ ${f.module}` : `WiZ ${f.ip}`;
      }),
    );

    return [...found.values()];
  }

  close(): void {
    try { this.sendSock.close(); } catch { /* */ }
  }
}
