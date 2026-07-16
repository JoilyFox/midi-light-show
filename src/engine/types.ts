/** MIDI → light mapping model. Persisted to config/show.json. */

export type MidiKind = 'cc' | 'noteOn' | 'noteOff';

export interface MidiEvent {
  kind: MidiKind;
  channel: number; // 0–15
  number: number;  // CC number or note number
  value: number;   // CC value / note velocity (0–127)
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

  /** Target fixture: a bulb IP, or '*' for all discovered fixtures. */
  fixture: string;

  action: ActionType;
  /** When to fire (cc: press=val≥64 / release=val<64 / change=any). Default depends on action. */
  trigger?: Trigger;

  // --- fade / toggle ---
  direction?: 'in' | 'out';     // fade only
  /** Where the on/target brightness comes from: a fixed % or the note's velocity (0–127 → 0–100%). */
  targetSource?: 'fixed' | 'velocity';
  target?: number;              // brightness 0–100 for "in"/toggle-on (default 100), when targetSource='fixed'
  /** Where the time/speed param comes from. */
  durationSource?: DurationSource;
  durationCc?: number;          // when durationSource = 'cc' (the "second param")
  durationFixedValue?: number;  // 0–127 when durationSource = 'fixed'
  /**
   * Speed indexing: milliseconds per param-unit.
   *   on/off feel  → 10   (param 100 → 1 s)
   *   slow fade     → 1000 (param 100 → 100 s)
   */
  msPerUnit?: number;
  durationCapMs?: number;       // safety ceiling (default 180000)
  curve?: Curve;

  // --- pulse (one trigger = fast attack → slow release, e.g. a beat flash with decay) ---
  attackMs?: number;            // ramp up time (default 40 = near-instant snap on)
  releaseMs?: number;           // fade-out time after the attack (default 800; set ≈ one beat)

  // --- color ---
  colorMode?: ColorMode;
  fixedColor?: { r: number; g: number; b: number };

  // --- brightness / temp: map MIDI value 0–127 → [min,max] ---
  min?: number;
  max?: number;
}

export interface ShowConfig {
  midiPortName: string | null;
  mappings: Mapping[];
}
