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
import os from 'node:os';
import type { Fixture, FixtureDriver, FixtureState } from '../types';

const WIZ_PORT = 38899;
const BROADCAST = '255.255.255.255';

/** Current-state snapshot parsed from a getPilot response (for the discovery preview). */
export interface PilotState {
  on: boolean;
  brightness: number; // 0..100
  color?: { r: number; g: number; b: number };
  temp?: number;
}

/** A bulb found by a scan — a Fixture plus its live pilot state, when known. */
export type ScannedBulb = Fixture & { pilot?: PilotState };

function pilotFrom(result: Record<string, unknown>): PilotState {
  const on = !!result.state;
  const brightness = typeof result.dimming === 'number' ? result.dimming : 0;
  const hasRgb = result.r != null || result.g != null || result.b != null;
  const color = hasRgb
    ? { r: Number(result.r ?? 0), g: Number(result.g ?? 0), b: Number(result.b ?? 0) }
    : undefined;
  const temp = typeof result.temp === 'number' ? result.temp : undefined;
  return { on, brightness, color, temp };
}

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
    const msg = Buffer.from(
      JSON.stringify({ method: 'setPilot', params: buildPilotParams(state) }),
    );
    void this.ensureBound().then(() => {
      this.sendSock.send(msg, WIZ_PORT, ip, (err) => {
        if (err) console.error(`[wiz] send to ${ip} failed:`, err.message);
      });
    });
  }

  /** Send a method and await the first JSON response (or null on timeout). */
  private request(
    ip: string,
    method: string,
    timeoutMs = 1000,
  ): Promise<Record<string, unknown> | null> {
    return new Promise((resolve) => {
      const sock = dgram.createSocket('udp4');
      const done = (val: Record<string, unknown> | null) => {
        clearTimeout(timer);
        try {
          sock.close();
        } catch {
          /* already closed */
        }
        resolve(val);
      };
      const timer = setTimeout(() => done(null), timeoutMs);
      sock.on('message', (buf) => {
        try {
          done(JSON.parse(buf.toString()));
        } catch {
          done(null);
        }
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
        } catch {
          /* ignore malformed */
        }
        found.set(rinfo.address, { id: rinfo.address, ip: rinfo.address, mac });
      });
      sock.bind(() => {
        sock.setBroadcast(true);
        const msg = Buffer.from(JSON.stringify({ method: 'getPilot', params: {} }));
        sock.send(msg, WIZ_PORT, BROADCAST);
        setTimeout(() => {
          try {
            sock.close();
          } catch {
            /* */
          }
          resolve();
        }, timeoutMs);
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

  /** Local IPv4 /24 subnet bases (e.g. "192.168.0") this host sits on. */
  private localSubnets(): string[] {
    const bases = new Set<string>();
    for (const addrs of Object.values(os.networkInterfaces())) {
      for (const a of addrs ?? []) {
        if (a.family === 'IPv4' && !a.internal) {
          const p = a.address.split('.');
          if (p.length === 4) bases.add(`${p[0]}.${p[1]}.${p[2]}`);
        }
      }
    }
    return [...bases];
  }

  /**
   * Thorough discovery: broadcast getPilot AND unicast it to every host in the local /24(s),
   * then keep only the addresses that answer the WiZ protocol (i.e. actual bulbs). Each responder
   * is enriched with its module name and current pilot state so the UI can preview + identify it.
   */
  async scan(timeoutMs = 2500): Promise<ScannedBulb[]> {
    const found = new Map<string, ScannedBulb>();
    const sock = dgram.createSocket('udp4');
    const getPilot = Buffer.from(JSON.stringify({ method: 'getPilot', params: {} }));

    await new Promise<void>((resolve) => {
      sock.on('message', (buf, rinfo) => {
        let json: { result?: Record<string, unknown> } | undefined;
        try {
          json = JSON.parse(buf.toString());
        } catch {
          return;
        }
        const result = json?.result;
        if (!result) return; // not a WiZ getPilot reply → ignore (this is the "only bulbs" filter)
        const existing = found.get(rinfo.address);
        const pilot = pilotFrom(result);
        if (existing) {
          existing.pilot = pilot;
          return;
        }
        found.set(rinfo.address, {
          id: rinfo.address,
          ip: rinfo.address,
          mac: result.mac ? String(result.mac) : undefined,
          pilot,
        });
      });
      sock.on('error', () => {
        /* ignore per-packet errors (unreachable hosts) */
      });
      sock.bind(() => {
        sock.setBroadcast(true);
        sock.send(getPilot, WIZ_PORT, BROADCAST);
        for (const base of this.localSubnets()) {
          for (let h = 1; h <= 254; h++) sock.send(getPilot, WIZ_PORT, `${base}.${h}`);
        }
        setTimeout(() => {
          try {
            sock.close();
          } catch {
            /* */
          }
          resolve();
        }, timeoutMs);
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

    return [...found.values()].sort((a, b) => cmpIp(a.ip, b.ip));
  }

  close(): void {
    try {
      this.sendSock.close();
    } catch {
      /* */
    }
  }
}

/** Numeric IPv4 comparison so a scan list sorts .2 before .10. */
function cmpIp(a: string, b: string): number {
  const na = a.split('.').map(Number);
  const nb = b.split('.').map(Number);
  for (let i = 0; i < 4; i++) if (na[i] !== nb[i]) return (na[i] ?? 0) - (nb[i] ?? 0);
  return 0;
}
