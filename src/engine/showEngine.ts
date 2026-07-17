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
import { TransitionEngine, kelvinToRgb } from './transitions';
import { MidiInput } from '../midi/input';
import type { Group, InventoryFixture, Mapping, MidiEvent, ShowConfig } from './types';
import type { FixtureState } from '../types';
import * as inventory from './inventory';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, '..', '..', 'config', 'show.json');
const ccKey = (ch: number, num: number) => `${ch}:${num}`;

interface FixtureLive {
  on: boolean;
  brightness: number; // 0..100
  color?: { r: number; g: number; b: number };
}

export class ShowEngine extends EventEmitter {
  readonly driver = new WizUdpDriver();
  readonly transitions = new TransitionEngine(this.driver, (ip, out) => this.onOutput(ip, out));
  readonly midi = new MidiInput();
  config: ShowConfig = { midiPortName: null, mappings: [] };
  knownFixtures: string[] = [];
  private ccState = new Map<string, number>();
  /** Last known output per fixture IP — streamed to the UI as 'fixtureState'. */
  private live = new Map<string, FixtureLive>();

  constructor() {
    super();
    this.setMaxListeners(50); // SSE clients subscribe here
    this.midi.on('event', (ev: MidiEvent) => this.onMidi(ev));
  }

  /** Merge a partial output into the live map and broadcast it (retaining last color on fades). */
  private onOutput(
    ip: string,
    out: { on: boolean; brightness: number; color?: { r: number; g: number; b: number } },
  ): void {
    const prev = this.live.get(ip);
    const next: FixtureLive = {
      on: out.on,
      brightness: out.brightness,
      color: out.color ?? prev?.color,
    };
    this.live.set(ip, next);
    this.emit('fixtureState', { ip, ...next });
  }

  /** Current live output for every fixture the engine has driven. */
  liveStates(): Array<{ ip: string } & FixtureLive> {
    return [...this.live.entries()].map(([ip, s]) => ({ ip, ...s }));
  }

  /**
   * Manual (UI) set — fire the driver, sync the fade engine's tracked brightness so a later fade
   * starts from here, and broadcast the resulting live state.
   */
  manualSet(ip: string, state: FixtureState): void {
    this.driver.setState(ip, state);
    const prev = this.live.get(ip);
    const brightness = state.brightness ?? prev?.brightness ?? 100;
    const on = state.on ?? (state.brightness != null ? state.brightness > 0 : (prev?.on ?? true));
    let color = prev?.color;
    if (state.r != null || state.g != null || state.b != null) {
      color = { r: state.r ?? 0, g: state.g ?? 0, b: state.b ?? 0 };
    } else if (state.temp != null) {
      color = kelvinToRgb(state.temp);
    }
    this.transitions.setCurrent(ip, on ? brightness : 0);
    this.onOutput(ip, { on, brightness, color });
  }

  async load(): Promise<void> {
    try {
      this.config = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf8'));
    } catch {
      /* first run, no config */
    }
    // Seed the inventory from legacy IP-referencing mappings on first load after the upgrade.
    if (inventory.migrateLegacyConfig(this.config)) await this.save();
    this.knownFixtures = inventory.allIps(this.config);
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

  // ---- fixture inventory (app Phase 3) ----

  getInventory(): { fixtures: InventoryFixture[]; groups: Group[] } {
    return { fixtures: inventory.fixturesOf(this.config), groups: inventory.groupsOf(this.config) };
  }

  addFixture(input: {
    name?: string;
    ip: string;
    number?: number;
    mac?: string;
  }): InventoryFixture {
    const fx = inventory.addFixture(this.config, input);
    this.afterInventoryChange();
    return fx;
  }

  updateFixture(
    id: string,
    patch: Partial<Pick<InventoryFixture, 'name' | 'ip' | 'number' | 'mac'>>,
  ): InventoryFixture | null {
    const fx = inventory.updateFixture(this.config, id, patch);
    if (fx) this.afterInventoryChange();
    return fx;
  }

  removeFixture(id: string): boolean {
    const ok = inventory.removeFixture(this.config, id);
    if (ok) this.afterInventoryChange();
    return ok;
  }

  addGroup(input: { name?: string; fixtureIds?: string[] }): Group {
    const g = inventory.addGroup(this.config, input);
    void this.save();
    return g;
  }

  updateGroup(id: string, patch: { name?: string; fixtureIds?: string[] }): Group | null {
    const g = inventory.updateGroup(this.config, id, patch);
    if (g) void this.save();
    return g;
  }

  removeGroup(id: string): boolean {
    const ok = inventory.removeGroup(this.config, id);
    if (ok) void this.save();
    return ok;
  }

  /** Discover on the LAN and upsert responders into the inventory (match by mac, else ip). */
  async discoverAndMerge(): Promise<{ fixtures: InventoryFixture[]; added: number }> {
    const found = await this.driver.discover();
    this.knownFixtures = found.map((f) => f.ip);
    let added = 0;
    for (const d of found) {
      const list = inventory.fixturesOf(this.config);
      const existing = list.find((f) => (d.mac && f.mac === d.mac) || f.ip === d.ip);
      if (existing) {
        if (d.mac && !existing.mac) existing.mac = d.mac;
        existing.ip = d.ip; // refresh address (DHCP may have moved it)
      } else {
        inventory.addFixture(this.config, {
          ip: d.ip,
          name: d.name ?? `Fixture ${d.ip}`,
          mac: d.mac,
        });
        added++;
      }
    }
    this.afterInventoryChange();
    return { fixtures: inventory.fixturesOf(this.config), added };
  }

  /** Full-network scan (broadcast + unicast sweep) for WiZ bulbs, with live pilot preview. */
  scan(): ReturnType<WizUdpDriver['scan']> {
    return this.driver.scan();
  }

  /** Blink a known fixture (by id) so the user can spot which physical lamp it is. */
  identify(id: string): boolean {
    const fx = inventory.fixturesOf(this.config).find((f) => f.id === id);
    if (!fx) return false;
    void this.blinkIp(fx.ip);
    return true;
  }

  /** Blink any bulb by IP (used from the discovery list, before it's added to the inventory). */
  identifyIp(ip: string): void {
    void this.blinkIp(ip);
  }

  /**
   * Flash a bulb white three times, then restore its prior state — so identifying a lamp during
   * setup doesn't leave it switched off. Fire-and-forget; the initial getPilot is best-effort.
   */
  private async blinkIp(ip: string): Promise<void> {
    const before = await this.driver.getState(ip);
    const step = 600;
    const flashes = 3;
    for (let i = 0; i < flashes; i++) {
      setTimeout(
        () => this.driver.setState(ip, { on: true, brightness: 100, r: 255, g: 255, b: 255 }),
        i * step,
      );
      setTimeout(() => this.driver.setState(ip, { on: false }), i * step + step / 2);
    }
    setTimeout(
      () => {
        if (!before) return void this.driver.setState(ip, { on: true });
        const s = before as Record<string, unknown>;
        const restore: FixtureState = { on: !!s.state };
        if (typeof s.dimming === 'number') restore.brightness = s.dimming;
        if (s.r != null || s.g != null || s.b != null) {
          restore.r = Number(s.r ?? 0);
          restore.g = Number(s.g ?? 0);
          restore.b = Number(s.b ?? 0);
        } else if (typeof s.temp === 'number') {
          restore.temp = s.temp;
        }
        this.driver.setState(ip, restore);
      },
      flashes * step + 120,
    );
  }

  private afterInventoryChange(): void {
    this.knownFixtures = inventory.allIps(this.config);
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
    const ips = inventory.resolveTargets(this.config, m.fixture);
    // Fallback: if the inventory is empty (fresh install, discovery-only), a '*'/empty ref
    // still drives whatever discovery last found.
    if (ips.length === 0 && (!m.fixture || m.fixture === '*')) return this.knownFixtures;
    return ips;
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
          this.transitions.start(
            ip,
            on ? 0 : this.resolveTarget(m, ev),
            this.resolveDuration(m, ev),
            { curve: m.curve },
          );
          break;
        }
        case 'pulse':
          this.transitions.pulse(
            ip,
            this.resolveTarget(m, ev),
            m.attackMs ?? 40,
            m.releaseMs ?? 800,
            m.curve ?? 'easeOut',
          );
          break;
        case 'brightness':
          this.transitions.setInstant(ip, mapRange(ev.value, 0, 127, m.min ?? 0, m.max ?? 100));
          break;
        case 'color':
          this.transitions.setColor(
            ip,
            m.colorMode === 'fixed' && m.fixedColor
              ? m.fixedColor
              : hsvToRgb((ev.value / 127) * 360, 1, 1),
          );
          break;
        case 'temp':
          this.transitions.setTemp(
            ip,
            Math.round(mapRange(ev.value, 0, 127, m.min ?? 2200, m.max ?? 6500)),
          );
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
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}
