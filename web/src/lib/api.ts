// Typed client for the engine's HTTP + SSE API. One place that knows the wire shapes.
// In dev, Vite proxies /api → the engine on :8080 (see vite.config.ts).

import type { DiscoveredBulb, Fixture, Group, Mapping, ManualState } from '@/types';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok || (body as { ok?: boolean })?.ok === false) {
    const msg = (body as { error?: string })?.error ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body as T;
}

const json = (b: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(b) });

export const api = {
  // ---- fixtures / groups ----
  listFixtures: () => req<{ fixtures: Fixture[]; groups: Group[] }>('/fixtures'),
  addFixture: (input: { name?: string; ip: string; number?: number }) =>
    req<{ fixture: Fixture }>('/fixtures', json(input)),
  updateFixture: (id: string, patch: { name?: string; ip?: string; number?: number }) =>
    req<{ fixture: Fixture }>(`/fixtures/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
      headers: { 'Content-Type': 'application/json' },
    }),
  deleteFixture: (id: string) => req<{ ok: true }>(`/fixtures/${id}`, { method: 'DELETE' }),
  identifyFixture: (id: string) =>
    req<{ ok: true }>(`/fixtures/${id}/identify`, { method: 'POST' }),
  discoverFixtures: () =>
    req<{ fixtures: Fixture[]; added: number }>('/fixtures/discover', { method: 'POST' }),

  addGroup: (input: { name?: string; fixtureIds?: string[] }) =>
    req<{ group: Group }>('/groups', json(input)),
  updateGroup: (id: string, patch: { name?: string; fixtureIds?: string[] }) =>
    req<{ group: Group }>(`/groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
      headers: { 'Content-Type': 'application/json' },
    }),
  deleteGroup: (id: string) => req<{ ok: true }>(`/groups/${id}`, { method: 'DELETE' }),

  // ---- passive reachability probe (no visible change) ----
  discover: () => req<{ fixtures: { ip: string }[] }>('/discover'),

  // ---- full-network scan + blink-by-ip (Add-fixture discovery flow) ----
  scan: () => req<{ bulbs: DiscoveredBulb[] }>('/scan'),
  identifyIp: (ip: string) => req<{ ok: true }>('/identify', json({ ip })),

  // ---- manual control ----
  setState: (ip: string, state: ManualState) => req<{ ok: true }>('/state', json({ ip, ...state })),
  getState: (ip: string) =>
    req<{ state: Record<string, unknown> | null }>(`/state?ip=${encodeURIComponent(ip)}`),
  liveStates: () =>
    req<{
      live: Array<{
        ip: string;
        on: boolean;
        brightness: number;
        color?: { r: number; g: number; b: number };
      }>;
    }>('/fixtures/live'),

  // ---- MIDI ----
  midiPorts: () => req<{ ports: string[]; current: string | null }>('/midi/ports'),
  selectMidiPort: (index: number) =>
    req<{ ok: boolean; current: string | null }>('/midi/select', json({ index })),
  getMappings: () => req<{ midiPortName: string | null; mappings: Mapping[] }>('/mappings'),
  putMappings: (mappings: Mapping[]) =>
    req<{ ok: true }>('/mappings', {
      method: 'PUT',
      body: JSON.stringify({ mappings }),
      headers: { 'Content-Type': 'application/json' },
    }),
};

/** Open the MIDI SSE stream. Returns an unsubscribe. */
export function openMidiStream(handlers: {
  onMidi?: (ev: unknown) => void;
  onApplied?: (a: unknown) => void;
  onFixtureState?: (s: unknown) => void;
  onOpen?: () => void;
  onError?: () => void;
}): () => void {
  const es = new EventSource('/api/midi/stream');
  const on = (name: string, fn?: (v: unknown) => void) => {
    if (fn) es.addEventListener(name, (e) => fn(JSON.parse((e as MessageEvent).data)));
  };
  on('midi', handlers.onMidi);
  on('applied', handlers.onApplied);
  on('fixtureState', handlers.onFixtureState);
  if (handlers.onOpen) es.addEventListener('open', () => handlers.onOpen!());
  if (handlers.onError) es.addEventListener('error', () => handlers.onError!());
  return () => es.close();
}
