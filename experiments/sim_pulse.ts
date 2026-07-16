/** Verify the pulse envelope: fast attack → slow release. Targets 127.0.0.1 (no real bulb). */
import { ShowEngine } from '../src/engine/showEngine';
const engine = new ShowEngine();
const sent: any[] = [];
engine.driver.setState = (ip, s) => { sent.push({ t: Date.now(), ...s }); };
engine.knownFixtures = ['127.0.0.1'];
engine.setMappings([{
  id: 'beat', enabled: true, label: 'Note36 → pulse', match: { kind: 'noteOn', channel: null, number: 36 },
  fixture: '127.0.0.1', action: 'pulse', target: 100, attackMs: 40, releaseMs: 600, curve: 'easeOut',
}]);

const t0 = Date.now();
engine.midi.emit('event', { kind: 'noteOn', channel: 0, number: 36, value: 120 });
setTimeout(() => {
  console.log('payloads (ms since trigger → brightness):');
  for (const s of sent) console.log(`  +${String(s.t - t0).padStart(4)}ms  ${s.on === false ? 'OFF' : 'dim ' + s.brightness}`);
  console.log(`\ntotal sends: ${sent.length} (snap to 100, then a smooth decay to OFF over ~600ms)`);
  engine.transitions.cancelAll(); process.exit(0);
}, 900);
