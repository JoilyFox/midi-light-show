/**
 * Control server — serves the UI and bridges HTTP/MIDI → WiZ.
 *
 * Manual control:
 *   GET  /                 → control panel
 *   GET  /api/discover     → fixtures on the LAN (also refreshes engine.knownFixtures)
 *   GET  /api/state?ip=    → current getPilot
 *   POST /api/state        → fire-and-forget setPilot (manual UI)
 *
 * Fixture inventory (app Phase 3):
 *   GET    /api/fixtures                → { fixtures, groups }
 *   POST   /api/fixtures                → create { name?, ip, number? }
 *   POST   /api/fixtures/discover       → discover + upsert into inventory
 *   PUT    /api/fixtures/:id            → patch { name?, ip?, number? }
 *   DELETE /api/fixtures/:id            → remove
 *   POST   /api/fixtures/:id/identify   → blink the lamp
 *   POST   /api/groups                  → create { name?, fixtureIds? }
 *   PUT    /api/groups/:id              → patch { name?, fixtureIds? }
 *   DELETE /api/groups/:id              → remove
 *
 * MIDI bridge:
 *   GET  /api/midi/ports   → { ports, current }
 *   POST /api/midi/select  → { index }     open a MIDI input port
 *   GET  /api/mappings     → { midiPortName, mappings }
 *   PUT  /api/mappings     → { mappings }   replace + persist
 *   GET  /api/midi/stream  → SSE: 'midi' events + 'applied' mapping hits + 'fixtureState' live output
 *   GET  /api/fixtures/live → snapshot of live per-fixture output
 */

import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ShowEngine } from './engine/showEngine';
import type { FixtureState } from './types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 8080);

const engine = new ShowEngine();
const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, '..', 'public')));

// ---- manual control ----
app.get('/api/discover', async (_req, res) => {
  try {
    const fixtures = await engine.driver.discover();
    engine.knownFixtures = fixtures.map((f) => f.ip);
    res.json({ ok: true, fixtures });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

app.get('/api/state', async (req, res) => {
  const ip = String(req.query.ip ?? '');
  if (!ip) return res.status(400).json({ ok: false, error: 'ip required' });
  res.json({ ok: true, state: await engine.driver.getState(ip) });
});

app.post('/api/state', (req, res) => {
  const { ip, ...rest } = req.body as { ip?: string } & FixtureState;
  if (!ip) return res.status(400).json({ ok: false, error: 'ip required' });
  engine.manualSet(ip, rest);
  res.json({ ok: true });
});

/** Snapshot of live output per fixture IP (what the SSE 'fixtureState' events stream). */
app.get('/api/fixtures/live', (_req, res) => {
  res.json({ ok: true, live: engine.liveStates() });
});

// ---- fixture inventory ----
app.get('/api/fixtures', (_req, res) => {
  res.json({ ok: true, ...engine.getInventory() });
});

app.post('/api/fixtures', (req, res) => {
  const { ip, name, number } = req.body as { ip?: string; name?: string; number?: number };
  if (!ip || typeof ip !== 'string')
    return res.status(400).json({ ok: false, error: 'ip required' });
  const fixture = engine.addFixture({ ip, name, number });
  res.json({ ok: true, fixture });
});

app.post('/api/fixtures/discover', async (_req, res) => {
  try {
    const { fixtures, added } = await engine.discoverAndMerge();
    res.json({ ok: true, fixtures, added });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

app.put('/api/fixtures/:id', (req, res) => {
  const { name, ip, number } = req.body as { name?: string; ip?: string; number?: number };
  const fixture = engine.updateFixture(req.params.id, { name, ip, number });
  if (!fixture) return res.status(404).json({ ok: false, error: 'fixture not found' });
  res.json({ ok: true, fixture });
});

app.delete('/api/fixtures/:id', (req, res) => {
  const ok = engine.removeFixture(req.params.id);
  res.status(ok ? 200 : 404).json({ ok, ...(ok ? {} : { error: 'fixture not found' }) });
});

app.post('/api/fixtures/:id/identify', (req, res) => {
  const ok = engine.identify(req.params.id);
  res.status(ok ? 200 : 404).json({ ok, ...(ok ? {} : { error: 'fixture not found' }) });
});

app.post('/api/groups', (req, res) => {
  const { name, fixtureIds } = req.body as { name?: string; fixtureIds?: string[] };
  const group = engine.addGroup({ name, fixtureIds });
  res.json({ ok: true, group });
});

app.put('/api/groups/:id', (req, res) => {
  const { name, fixtureIds } = req.body as { name?: string; fixtureIds?: string[] };
  const group = engine.updateGroup(req.params.id, { name, fixtureIds });
  if (!group) return res.status(404).json({ ok: false, error: 'group not found' });
  res.json({ ok: true, group });
});

app.delete('/api/groups/:id', (req, res) => {
  const ok = engine.removeGroup(req.params.id);
  res.status(ok ? 200 : 404).json({ ok, ...(ok ? {} : { error: 'group not found' }) });
});

// ---- MIDI ----
app.get('/api/midi/ports', (_req, res) => {
  res.json({ ok: true, ports: engine.midi.listPorts(), current: engine.midi.currentName() });
});

app.post('/api/midi/select', (req, res) => {
  const index = Number((req.body as { index?: number }).index);
  if (!Number.isInteger(index)) return res.status(400).json({ ok: false, error: 'index required' });
  const ok = engine.selectMidiPort(index);
  res.json({ ok, current: engine.midi.currentName() });
});

app.get('/api/mappings', (_req, res) => {
  res.json({
    ok: true,
    midiPortName: engine.config.midiPortName,
    mappings: engine.config.mappings,
  });
});

app.put('/api/mappings', (req, res) => {
  const mappings = (req.body as { mappings?: unknown }).mappings;
  if (!Array.isArray(mappings))
    return res.status(400).json({ ok: false, error: 'mappings array required' });
  engine.setMappings(mappings);
  res.json({ ok: true });
});

app.get('/api/midi/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write(': connected\n\n');
  const onMidi = (ev: unknown) => res.write(`event: midi\ndata: ${JSON.stringify(ev)}\n\n`);
  const onApplied = (a: unknown) => res.write(`event: applied\ndata: ${JSON.stringify(a)}\n\n`);
  const onFixture = (s: unknown) =>
    res.write(`event: fixtureState\ndata: ${JSON.stringify(s)}\n\n`);
  engine.on('midi', onMidi);
  engine.on('applied', onApplied);
  engine.on('fixtureState', onFixture);
  const ping = setInterval(() => res.write(': ping\n\n'), 15000);
  req.on('close', () => {
    clearInterval(ping);
    engine.off('midi', onMidi);
    engine.off('applied', onApplied);
    engine.off('fixtureState', onFixture);
  });
});

await engine.load();
app.listen(PORT, () => {
  console.log(`\n  🎛️  MIDI Light Show — control + bridge`);
  console.log(`  ▶  http://localhost:${PORT}\n`);
  console.log(
    `  MIDI port: ${engine.midi.currentName() ?? '(none selected — open the MIDI tab)'}\n`,
  );
});

process.on('SIGINT', () => {
  engine.driver.close();
  engine.midi.close();
  process.exit(0);
});
