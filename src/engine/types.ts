/** MIDI → light mapping model. Persisted to config/show.json. */

export type MidiKind = 'cc' | 'noteOn' | 'noteOff';

export interface MidiEvent {
  kind: MidiKind;
  channel: number; // 0–15
  number: number; // CC number or note number
  value: number; // CC value / note velocity (0–127)
}

export type ActionType = 'fade' | 'toggle' | 'color' | 'brightness' | 'temp' | 'pulse';
export type DurationSource = 'value' | 'fixed' | 'cc';
export type ColorMode = 'hueFromValue' | 'fixed';
export type Trigger = 'press' | 'release' | 'change';
export type Curve = 'linear' | 'easeIn' | 'easeOut';

export interface Mapping {
  id: string;
  enabled: boolean;
  label?: string;

  /** What MIDI message fires this mapping. null channel/number = wildcard (any). */
  match: { kind: MidiKind; channel: number | null; number: number | null };

  /**
   * Target reference, resolved to fixture IP(s) by the engine (see ShowEngine.resolveTargets):
   *   - a **fixture id** (`fx_…`)      → that one fixture
   *   - a **group id** (`grp_…`)       → every fixture in the group
   *   - a raw **IP** (`192.168.…`)     → that IP (back-compat with pre-inventory configs)
   *   - `'*'` or empty                 → all fixtures in the inventory
   */
  fixture: string;

  action: ActionType;
  /** When to fire (cc: press=val≥64 / release=val<64 / change=any). Default depends on action. */
  trigger?: Trigger;

  // --- fade / toggle ---
  direction?: 'in' | 'out'; // fade only
  /** Where the on/target brightness comes from: a fixed % or the note's velocity (0–127 → 0–100%). */
  targetSource?: 'fixed' | 'velocity';
  target?: number; // brightness 0–100 for "in"/toggle-on (default 100), when targetSource='fixed'
  /** Where the time/speed param comes from. */
  durationSource?: DurationSource;
  durationCc?: number; // when durationSource = 'cc' (the "second param")
  durationFixedValue?: number; // 0–127 when durationSource = 'fixed'
  /**
   * Speed indexing: milliseconds per param-unit.
   *   on/off feel  → 10   (param 100 → 1 s)
   *   slow fade     → 1000 (param 100 → 100 s)
   */
  msPerUnit?: number;
  durationCapMs?: number; // safety ceiling (default 180000)
  curve?: Curve;

  // --- pulse (one trigger = fast attack → slow release, e.g. a beat flash with decay) ---
  attackMs?: number; // ramp up time (default 40 = near-instant snap on)
  releaseMs?: number; // fade-out time after the attack (default 800; set ≈ one beat)

  // --- color ---
  colorMode?: ColorMode;
  fixedColor?: { r: number; g: number; b: number };

  // --- brightness / temp: map MIDI value 0–127 → [min,max] ---
  min?: number;
  max?: number;
}

/**
 * A fixture in the persisted inventory. The `id` is stable and independent of the IP
 * (WiFi bulbs can move on DHCP) — mappings target the id, not the address. The `number`
 * is the human-facing rig number shown on the tile (1, 2, 3 …).
 */
export interface InventoryFixture {
  id: string;
  name: string;
  number: number;
  ip: string;
  /** Output driver. Only 'wiz' today; WLED/sACN slot in later behind the same field. */
  driver?: 'wiz';
  /** Hardware MAC, when known from discovery — the durable identity used to re-match on IP change. */
  mac?: string;
}

/** A named set of fixtures, for group control + group-targeted mappings. */
export interface Group {
  id: string;
  name: string;
  fixtureIds: string[];
}

export interface ShowConfig {
  midiPortName: string | null;
  mappings: Mapping[];
  /** Persisted fixture inventory (added app Phase 3). Optional for back-compat with old configs. */
  fixtures?: InventoryFixture[];
  /** Persisted groups (added app Phase 3). */
  groups?: Group[];
}
