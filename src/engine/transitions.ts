/**
 * TransitionEngine — smooth brightness fades for fixtures, with WiZ-friendly rate limiting.
 *
 * Brightness is tracked in PERCENT (0 = off, 1–100 = on). It maps to WiZ dimming 10–100
 * (the bulb's floor) on output. A fade interpolates percent over time on a fixed timestep,
 * but never sends faster than MIN_STEP_MS (≈22 cmd/s) so we don't overrun the bulb's
 * undocumented command ceiling (see docs/RESEARCH.md). Long fades naturally send slowly;
 * fast fades are capped in step-rate and just take coarser brightness steps.
 *
 * A new transition on a fixture cancels the previous one (Latest-Takes-Precedence).
 */

import type { WizUdpDriver } from '../drivers/wiz';
import type { Curve } from './types';

const MIN_STEP_MS = 45;

type Rgb = { r: number; g: number; b: number };

/** Notified whenever a fixture's output actually changes — powers the live UI tiles. */
export type OutputListener = (
  ip: string,
  out: { on: boolean; brightness: number; color?: Rgb },
) => void;

const ease = (t: number, c: Curve): number =>
  c === 'easeIn' ? t * t : c === 'easeOut' ? 1 - (1 - t) * (1 - t) : t;

export class TransitionEngine {
  private timers = new Map<string, NodeJS.Timeout>();
  private current = new Map<string, number>(); // ip → brightness %
  private lastEmit = new Map<string, string>(); // ip → last payload signature (send-on-change)

  constructor(
    private driver: WizUdpDriver,
    private onOutput?: OutputListener,
  ) {}

  getBrightness(ip: string): number {
    return this.current.get(ip) ?? 0;
  }

  /** Sync tracked brightness without sending (e.g. after a manual set went straight to the driver). */
  setCurrent(ip: string, pct: number): void {
    this.current.set(ip, clampPct(pct));
  }

  /** Fade current → toPct over durationMs. Optional color at the start; optional onComplete when it lands. */
  start(
    ip: string,
    toPct: number,
    durationMs: number,
    opts: { color?: Rgb; curve?: Curve; onComplete?: () => void } = {},
  ): void {
    this.cancel(ip);
    const from = this.current.get(ip) ?? (toPct > 0 ? 0 : 100);
    const to = clampPct(toPct);
    const curve = opts.curve ?? 'linear';

    if (opts.color && to > 0) this.apply(ip, Math.max(from, 1), opts.color);

    if (durationMs <= MIN_STEP_MS || from === to) {
      this.apply(ip, to, opts.color);
      opts.onComplete?.();
      return;
    }

    const start = Date.now();
    const timer = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / durationMs);
      this.apply(ip, from + (to - from) * ease(t, curve));
      if (t >= 1) {
        this.cancel(ip);
        this.apply(ip, to);
        opts.onComplete?.();
      }
    }, MIN_STEP_MS);
    this.timers.set(ip, timer);
  }

  /** One shot: fast attack up to toPct, then slow release down to 0. A beat "flash with decay". */
  pulse(
    ip: string,
    toPct: number,
    attackMs: number,
    releaseMs: number,
    curve: Curve = 'easeOut',
  ): void {
    this.start(ip, toPct, attackMs, {
      curve: 'linear',
      onComplete: () => this.start(ip, 0, releaseMs, { curve }),
    });
  }

  /** Jump to a brightness now (cancels any fade). */
  setInstant(ip: string, pct: number, color?: Rgb): void {
    this.cancel(ip);
    this.apply(ip, pct, color);
  }

  /** Change color, keep current brightness (default on if unknown). */
  setColor(ip: string, color: Rgb): void {
    this.apply(ip, Math.max(this.current.get(ip) ?? 100, 1), color);
  }

  /** Set white color temperature (Kelvin), keep current brightness. */
  setTemp(ip: string, kelvin: number): void {
    const pct = Math.max(this.current.get(ip) ?? 100, 1);
    this.current.set(ip, pct);
    this.driver.setState(ip, { on: true, temp: kelvin, brightness: toDimming(pct) });
    this.onOutput?.(ip, { on: true, brightness: pct, color: kelvinToRgb(kelvin) });
  }

  private apply(ip: string, pct: number, color?: Rgb): void {
    const p = clampPct(pct);
    this.current.set(ip, p);

    // Build the WiZ-resolution payload, then SEND-ON-CHANGE: skip if the quantized
    // output is identical to what we last sent. This is what keeps slow fades from
    // flooding the bulb with duplicate dimming values (and flickering it).
    const state =
      p <= 0
        ? { on: false }
        : color
          ? { on: true, brightness: toDimming(p), r: color.r, g: color.g, b: color.b }
          : { on: true, brightness: toDimming(p) };
    const sig = JSON.stringify(state);
    if (this.lastEmit.get(ip) === sig) return;
    this.lastEmit.set(ip, sig);
    this.driver.setState(ip, state);
    this.onOutput?.(ip, { on: p > 0, brightness: p, color });
  }

  cancel(ip: string): void {
    const t = this.timers.get(ip);
    if (t) {
      clearInterval(t);
      this.timers.delete(ip);
    }
  }
  cancelAll(): void {
    for (const t of this.timers.values()) clearInterval(t);
    this.timers.clear();
  }
}

const clampPct = (n: number) => Math.max(0, Math.min(100, n));
const toDimming = (pct: number) => Math.max(10, Math.min(100, Math.round(pct)));

/** Rough color-temperature → RGB, only for the UI's live tile tint (not sent to the bulb). */
export function kelvinToRgb(kelvin: number): Rgb {
  const t = Math.max(1000, Math.min(40000, kelvin)) / 100;
  let r: number, g: number, b: number;
  if (t <= 66) {
    r = 255;
    g = 99.47 * Math.log(t) - 161.12;
  } else {
    r = 329.7 * Math.pow(t - 60, -0.1332);
    g = 288.12 * Math.pow(t - 60, -0.0755);
  }
  if (t >= 66) b = 255;
  else if (t <= 19) b = 0;
  else b = 138.52 * Math.log(t - 10) - 305.04;
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return { r: c(r), g: c(g), b: c(b) };
}
