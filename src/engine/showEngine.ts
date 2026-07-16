/**
 * ShowEngine — the bridge brain.
 * MIDI in → match mappings → run actions (fades/color/etc.) on fixtures via the driver.
 * Owns the WiZ driver, the transition engine, the MIDI input, config + persistence.
 * Emits 'midi' (every incoming event) and 'applied' (when a mapping fires) for the UI.
 */

import { EventEmitter } from 'node:events';
import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WizUdpDriver } from '../drivers/wiz';
import { TransitionEngine } from './transitions';
import { MidiInput } from '../midi/input';
import type { Mapping, MidiEvent, ShowConfig } from './types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, '..', '..', 'config', 'show.json');
const ccKey = (ch: number, num: number) => `${ch}:${num}`;

export class ShowEngine extends EventEmitter {
  readonly driver = new WizUdpDriver();
  readonly transitions = new TransitionEngine(this.driver);
  readonly midi = new MidiInput();
  config: ShowConfig = { midiPortName: null, mappings: [] };
  knownFixtures: string[] = [];
  private ccState = new Map<string, number>();

  constructor() {
    super();
    this.setMaxListeners(50); // SSE clients subscribe here
    this.midi.on('event', (ev: MidiEvent) => this.onMidi(ev));
  }

  async load(): Promise<void> {
    try {
      this.config = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf8'));
    } catch { /* first run, no config */ }
    if (this.config.midiPortName) this.midi.openByName(this.config.midiPortName);
  }

  async save(): Promise<void> {
    await fs.mkdir(dirname(CONFIG_PATH), { recursive: true });
    await fs.writeFile(CONFIG_PATH, JSON.stringify(this.config, null, 2));
  }

  selectMidiPort(index: number): boolean {
    const ok = this.midi.open(index);
    this.config.midiPortName = this.midi.currentName();
    void this.save();
    return ok;
  }

  setMappings(mappings: Mapping[]): void {
    this.config.mappings = mappings;
    void this.save();
  }

  private onMidi(ev: MidiEvent): void {
    if (ev.kind === 'cc') this.ccState.set(ccKey(ev.channel, ev.number), ev.value);
    this.emit('midi', ev);
    for (const m of this.config.mappings) {
      if (!m.enabled || !this.matches(m, ev) || !this.triggerOk(m, ev)) continue;
      this.execute(m, ev);
      this.emit('applied', { mappingId: m.id, label: m.label, action: m.action });
    }
  }

  private matches(m: Mapping, ev: MidiEvent): boolean {
    if (m.match.kind !== ev.kind) return false;
    if (m.match.channel != null && m.match.channel !== ev.channel) return false;
    if (m.match.number != null && m.match.number !== ev.number) return false;
    return true;
  }

  private triggerOk(m: Mapping, ev: MidiEvent): boolean {
    const trig = m.trigger ?? (isContinuous(m.action) ? 'change' : 'press');
    if (ev.kind === 'noteOn') return trig !== 'release';
    if (ev.kind === 'noteOff') return trig === 'release';
    if (trig === 'change') return true;
    if (trig === 'press') return ev.value >= 64;
    return ev.value < 64; // release
  }

  private targets(m: Mapping): string[] {
    if (m.fixture && m.fixture !== '*') return [m.fixture];
    return this.knownFixtures;
  }

  private execute(m: Mapping, ev: MidiEvent): void {
    for (const ip of this.targets(m)) {
      switch (m.action) {
        case 'fade': {
          const to = m.direction === 'out' ? 0 : this.resolveTarget(m, ev);
          this.transitions.start(ip, to, this.resolveDuration(m, ev), { curve: m.curve });
          break;
        }
        case 'toggle': {
          const on = this.transitions.getBrightness(ip) > 0;
          this.transitions.start(ip, on ? 0 : this.resolveTarget(m, ev), this.resolveDuration(m, ev), { curve: m.curve });
          break;
        }
        case 'pulse':
          this.transitions.pulse(ip, this.resolveTarget(m, ev), m.attackMs ?? 40, m.releaseMs ?? 800, m.curve ?? 'easeOut');
          break;
        case 'brightness':
          this.transitions.setInstant(ip, mapRange(ev.value, 0, 127, m.min ?? 0, m.max ?? 100));
          break;
        case 'color':
          this.transitions.setColor(ip, m.colorMode === 'fixed' && m.fixedColor
            ? m.fixedColor
            : hsvToRgb((ev.value / 127) * 360, 1, 1));
          break;
        case 'temp':
          this.transitions.setTemp(ip, Math.round(mapRange(ev.value, 0, 127, m.min ?? 2200, m.max ?? 6500)));
          break;
      }
    }
  }

  /** On/target brightness: fixed % or note velocity (0–127 → 0–100%). */
  private resolveTarget(m: Mapping, ev: MidiEvent): number {
    return m.targetSource === 'velocity' ? mapRange(ev.value, 0, 127, 0, 100) : (m.target ?? 100);
  }

  private resolveDuration(m: Mapping, ev: MidiEvent): number {
    const src = m.durationSource ?? 'fixed';
    let val: number;
    if (src === 'value') val = ev.value;
    else if (src === 'cc') val = this.ccState.get(ccKey(ev.channel, m.durationCc ?? -1)) ?? 0;
    else val = m.durationFixedValue ?? 100;
    return Math.max(0, Math.min(val * (m.msPerUnit ?? 10), m.durationCapMs ?? 180000));
  }
}

const isContinuous = (a: Mapping['action']) => a === 'color' || a === 'brightness' || a === 'temp';

function mapRange(v: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  const t = Math.max(0, Math.min(1, (v - inMin) / (inMax - inMin)));
  return outMin + t * (outMax - outMin);
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  h = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}
