// Shared UI types — mirror the engine's public shapes (src/engine/types.ts, src/types.ts).
// Kept deliberately small; only what the SPA consumes over the API.

export interface Fixture {
  id: string;
  name: string;
  number: number;
  ip: string;
  driver?: 'wiz';
  mac?: string;
}

export interface Group {
  id: string;
  name: string;
  fixtureIds: string[];
}

export type MidiKind = 'cc' | 'noteOn' | 'noteOff';
export type ActionType = 'fade' | 'toggle' | 'color' | 'brightness' | 'temp' | 'pulse';
export type Trigger = 'press' | 'release' | 'change';
export type Curve = 'linear' | 'easeIn' | 'easeOut';
export type ColorMode = 'hueFromValue' | 'fixed';
export type DurationSource = 'value' | 'fixed' | 'cc';

export interface Mapping {
  id: string;
  enabled: boolean;
  label?: string;
  match: { kind: MidiKind; channel: number | null; number: number | null };
  fixture: string; // fixture id / group id / IP / '*'
  action: ActionType;
  trigger?: Trigger;
  direction?: 'in' | 'out';
  targetSource?: 'fixed' | 'velocity';
  target?: number;
  durationSource?: DurationSource;
  durationCc?: number;
  durationFixedValue?: number;
  msPerUnit?: number;
  durationCapMs?: number;
  curve?: Curve;
  attackMs?: number;
  releaseMs?: number;
  colorMode?: ColorMode;
  fixedColor?: { r: number; g: number; b: number };
  min?: number;
  max?: number;
}

export interface MidiEvent {
  kind: MidiKind;
  channel: number;
  number: number;
  value: number;
}

/** Live per-fixture state pushed over SSE (added Phase 5). */
export interface FixtureLive {
  ip: string;
  brightness: number; // 0..100
  color?: { r: number; g: number; b: number };
  on: boolean;
}

/** Abstract manual state sent to POST /api/state. */
export interface ManualState {
  on?: boolean;
  r?: number;
  g?: number;
  b?: number;
  temp?: number;
  brightness?: number;
}
