/**
 * Offline sim: feed synthetic MIDI events into the engine and watch what it does,
 * WITHOUT real MIDI hardware or touching the real bulb (targets 127.0.0.1).
 * Run: npx tsx experiments/sim_midi.ts
 */
import { ShowEngine } from '../src/engine/showEngine';
import type { MidiEvent } from '../src/engine/types';

const engine = new ShowEngine();

// Spy on the driver to log what would be sent (instead of inspecting UDP).
const sent: any[] = [];
const realSet = engine.driver.setState.bind(engine.driver);
engine.driver.setState = (ip, state) => { sent.push({ ip, ...state }); /* swallow UDP */ };

engine.knownFixtures = ['127.0.0.1'];
engine.setMappings([
  { id: 'm1', enabled: true, label: 'CC1 → fade in (value=time, ×10 → 100≈1s)',
    match: { kind: 'cc', channel: null, number: 1 }, fixture: '127.0.0.1',
    action: 'fade', direction: 'in', target: 100, durationSource: 'value', msPerUnit: 10, curve: 'linear' },
  { id: 'm2', enabled: true, label: 'CC2 → color hue from value',
    match: { kind: 'cc', channel: null, number: 2 }, fixture: '127.0.0.1',
    action: 'color', colorMode: 'hueFromValue' },
  { id: 'm3', enabled: true, label: 'Note60 → toggle',
    match: { kind: 'noteOn', channel: null, number: 60 }, fixture: '127.0.0.1',
    action: 'toggle', target: 100, durationSource: 'fixed', durationFixedValue: 50, msPerUnit: 10 },
  { id: 'm4', enabled: true, label: 'Note62 → fade-in, TARGET FROM VELOCITY',
    match: { kind: 'noteOn', channel: null, number: 62 }, fixture: '127.0.0.1',
    action: 'fade', direction: 'in', targetSource: 'velocity', durationSource: 'fixed', durationFixedValue: 1, msPerUnit: 1 },
]);

const applied: string[] = [];
engine.on('applied', (a) => applied.push(`${a.action}:${a.label}`));

const fire = (ev: MidiEvent) => engine.midi.emit('event', ev);

console.log('— fire CC2 value 40 (set a color)');
fire({ kind: 'cc', channel: 0, number: 2, value: 40 });

console.log('— fire CC1 value 50 (fade in over ~0.5s)');
fire({ kind: 'cc', channel: 0, number: 1, value: 50 });

setTimeout(() => {
  console.log('— fire Note60 (toggle off, fade over ~0.5s)');
  fire({ kind: 'noteOn', channel: 0, number: 60, value: 100 });
}, 700);

setTimeout(() => {
  console.log('— fire Note62 velocity 40 → expect ~31% brightness (40/127*100)');
  fire({ kind: 'noteOn', channel: 0, number: 62, value: 40 });
}, 1000);
setTimeout(() => {
  console.log('— fire Note62 velocity 127 → expect 100% brightness');
  fire({ kind: 'noteOn', channel: 0, number: 62, value: 127 });
}, 1100);

setTimeout(() => {
  console.log('\nApplied mappings:', applied);
  console.log('Distinct payloads sent to driver (send-on-change working = few, not hundreds):', sent.length);
  console.log('First 6:', sent.slice(0, 6).map((s) => JSON.stringify(s)).join('\n           '));
  console.log('Last 3 :', sent.slice(-3).map((s) => JSON.stringify(s)).join('\n           '));
  engine.transitions.cancelAll();
  process.exit(0);
}, 1600);
