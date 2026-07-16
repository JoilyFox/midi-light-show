/**
 * Control server — serves the UI and bridges HTTP/MIDI → WiZ.
 *
 * Manual control:
 *   GET  /                 → control panel
 *   GET  /api/discover     → fixtures on the LAN (also refreshes engine.knownFixtures)
 *   GET  /api/state?ip=    → current getPilot
 *   POST /api/state        → fire-and-forget setPilot (manual UI)
 *
 * MIDI bridge:
 *   GET  /api/midi/ports   → { ports, current }
 *   POST /api/midi/select  → { index }     open a MIDI input port
 *   GET  /api/mappings     → { midiPortName, mappings }
 *   PUT  /api/mappings     → { mappings }   replace + persist
 *   GET  /api/midi/stream  → SSE: live 'midi' events + 'applied' mapping hits (monitor/learn)
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
  engine.driver.setState(ip, rest);
  res.json({ ok: true });
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
  res.json({ ok: true, midiPortName: engine.config.midiPortName, mappings: engine.config.mappings });
});

app.put('/api/mappings', (req, res) => {
  const mappings = (req.body as { mappings?: unknown }).mappings;
  if (!Array.isArray(mappings)) return res.status(400).json({ ok: false, error: 'mappings array required' });
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
  engine.on('midi', onMidi);
  engine.on('applied', onApplied);
  const ping = setInterval(() => res.write(': ping\n\n'), 15000);
  req.on('close', () => {
    clearInterval(ping);
    engine.off('midi', onMidi);
    engine.off('applied', onApplied);
  });
});

await engine.load();
app.listen(PORT, () => {
  console.log(`\n  🎛️  MIDI Light Show — control + bridge`);
  console.log(`  ▶  http://localhost:${PORT}\n`);
  console.log(`  MIDI port: ${engine.midi.currentName() ?? '(none selected — open the MIDI tab)'}\n`);
});

process.on('SIGINT', () => { engine.driver.close(); engine.midi.close(); process.exit(0); });
