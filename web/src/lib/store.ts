// Shared reactive show store — one source of truth for fixtures, groups, mappings,
// MIDI port state, and live per-fixture output. Screens read from here; mutations go
// through the api client and then refresh the relevant slice.

import { reactive, computed } from 'vue';
import { api, openMidiStream } from './api';
import type { Fixture, Group, Mapping, MidiEvent } from '@/types';

interface LiveState {
  brightness: number; // 0..100
  color?: { r: number; g: number; b: number };
  on: boolean;
}

interface LoggedMidi extends MidiEvent {
  t: number;
  seq: number;
}

const MIDI_LOG_CAP = 250;

const state = reactive({
  fixtures: [] as Fixture[],
  groups: [] as Group[],
  mappings: [] as Mapping[],
  midiPorts: [] as string[],
  midiCurrent: null as string | null,
  online: new Set<string>(), // fixture ips that answered the last discover probe
  live: new Map<string, LiveState>(), // ip → live output (from SSE)
  midiLog: [] as LoggedMidi[], // newest first, capped (Log monitor)
  lastMidi: null as MidiEvent | null, // most recent event (MIDI-Learn watches this)
  appliedTick: 0, // bumped on each mapping hit (row flash)
  lastAppliedId: null as string | null,
  connected: false, // SSE connected
  loaded: false,
});

let midiSeq = 0;
export function clearMidiLog(): void {
  state.midiLog = [];
}

export function useShow() {
  return state;
}

// ---- loading ----
export async function loadInventory(): Promise<void> {
  const { fixtures, groups } = await api.listFixtures();
  state.fixtures = fixtures;
  state.groups = groups;
  state.loaded = true;
}

export async function loadMappings(): Promise<void> {
  const { mappings } = await api.getMappings();
  state.mappings = mappings;
}

export async function loadMidiPorts(): Promise<void> {
  const { ports, current } = await api.midiPorts();
  state.midiPorts = ports;
  state.midiCurrent = current;
}

/** Seed the live-output map from the engine snapshot (SSE keeps it current after). */
export async function loadLive(): Promise<void> {
  try {
    const { live } = await api.liveStates();
    const next = new Map<string, LiveState>();
    for (const s of live) next.set(s.ip, { on: s.on, brightness: s.brightness, color: s.color });
    state.live = next;
  } catch {
    /* ignore */
  }
}

/**
 * Read each fixture's real current state directly from the bulb (unicast getPilot) and update the
 * live map + the `online` set. This is the source of truth for reachability: WiZ *broadcast* discovery
 * is unreliable (many bulbs never answer 255.255.255.255) even though they're fully controllable by
 * unicast — so a bulb is "online" iff it answers a direct read, exactly like control does.
 */
export async function hydrateLive(): Promise<void> {
  const online = new Set<string>();
  await Promise.all(
    state.fixtures.map(async (f) => {
      try {
        const { state: s } = await api.getState(f.ip);
        if (!s) return; // no answer → leave out of `online`
        online.add(f.ip);
        const on = !!s.state;
        const brightness = typeof s.dimming === 'number' ? s.dimming : 0;
        const hasRgb = s.r != null || s.g != null || s.b != null;
        const color = hasRgb
          ? { r: Number(s.r ?? 0), g: Number(s.g ?? 0), b: Number(s.b ?? 0) }
          : state.live.get(f.ip)?.color;
        state.live.set(f.ip, { on, brightness, color });
      } catch {
        /* unreachable bulb — leave it out of `online` */
      }
    }),
  );
  state.online = online;
}

// Keep the tiles' status current: re-read every fixture on an interval (getPilot is one cheap UDP
// packet per bulb). SSE covers engine-driven changes; this covers external ones + reachability.
let livePoller: ReturnType<typeof setInterval> | null = null;
export function startLivePolling(intervalMs = 5000): void {
  if (livePoller != null) return;
  livePoller = setInterval(() => void hydrateLive(), intervalMs);
}
export function stopLivePolling(): void {
  if (livePoller != null) {
    clearInterval(livePoller);
    livePoller = null;
  }
}

// ---- derived helpers ----
export const fixtureById = (id: string) => state.fixtures.find((f) => f.id === id);

/** The MIDI assignment label for a fixture, derived from mappings that target it (or its group). */
export function midiLabelFor(fixtureId: string): string | undefined {
  const groupIds = state.groups.filter((g) => g.fixtureIds.includes(fixtureId)).map((g) => g.id);
  const m = state.mappings.find(
    (mp) =>
      mp.enabled &&
      (mp.fixture === fixtureId || groupIds.includes(mp.fixture) || mp.fixture === '*'),
  );
  if (!m) return undefined;
  const { kind, channel, number } = m.match;
  const ch = channel == null ? 'CH·' : `CH${channel + 1}`;
  const tag = kind === 'cc' ? `CC${number ?? '·'}` : `N${number ?? '·'}`;
  return `${ch} · ${tag}`;
}

export const isOnline = (ip: string) => state.online.has(ip);
export const liveFor = (ip: string) => state.live.get(ip);

/** Resolve a group / fixture id / '*' to the fixtures it targets. */
export function targetsOf(ref: string): Fixture[] {
  if (!ref || ref === '*') return state.fixtures;
  if (ref.startsWith('grp_')) {
    const g = state.groups.find((x) => x.id === ref);
    return g ? state.fixtures.filter((f) => g.fixtureIds.includes(f.id)) : [];
  }
  const f = state.fixtures.find((x) => x.id === ref);
  return f ? [f] : [];
}

// ---- SSE live wiring ----
let closeStream: (() => void) | null = null;
export function connectStream(): void {
  if (closeStream) return;
  closeStream = openMidiStream({
    onOpen: () => (state.connected = true),
    onError: () => (state.connected = false),
    onMidi: (e) => {
      const ev = e as MidiEvent;
      state.lastMidi = ev;
      state.midiLog.unshift({ ...ev, t: Date.now(), seq: ++midiSeq });
      if (state.midiLog.length > MIDI_LOG_CAP) state.midiLog.length = MIDI_LOG_CAP;
    },
    onFixtureState: (s) => {
      const f = s as {
        ip: string;
        on: boolean;
        brightness: number;
        color?: { r: number; g: number; b: number };
      };
      state.live.set(f.ip, { on: f.on, brightness: f.brightness, color: f.color });
    },
    onApplied: (a) => {
      state.lastAppliedId = (a as { mappingId?: string }).mappingId ?? null;
      state.appliedTick++;
    },
  });
}
export function disconnectStream(): void {
  closeStream?.();
  closeStream = null;
  state.connected = false;
}

export type { MidiEvent };
export const groupCount = computed(() => state.groups.length);
