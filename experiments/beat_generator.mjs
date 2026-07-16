// Beat generator: sends one note per beat into IAC → bridge's pulse mapping → lamp.
// Demonstrates the light show without Ableton. Usage: node beat_generator.mjs [bpm] [colorCC]
import pkg from '@julusian/midi';

const BPM = Number(process.argv[2] || 60);
const COLOR = process.argv[3] !== undefined ? Number(process.argv[3]) : 85; // CC20 hue: 0=red,42=green,85=blue
const interval = 60000 / BPM;

const out = new pkg.Output();
let i = -1;
for (let k = 0; k < out.getPortCount(); k++) if (out.getPortName(k).includes('IAC')) i = k;
if (i < 0) { console.error('No IAC output'); process.exit(1); }
out.openPort(i);
console.log(`Beat generator → ${out.getPortName(i)} @ ${BPM} BPM (note every ${interval}ms)`);

out.sendMessage([0xB0, 20, COLOR]); // set hue once via CC20
const beatNote = () => out.sendMessage([0x90, 36, 110]); // note36 → pulse
beatNote(); // first beat now
let n = 1;
const id = setInterval(() => { beatNote(); n++; if (n % 4 === 0) console.log(`...${n} beats`); }, interval);

const stop = () => { clearInterval(id); try { out.closePort(); } catch {} process.exit(0); };
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
