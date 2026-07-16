// Drive the REAL bulb through IAC → bridge → WiZ, leaving it in a clear persistent state.
// CC21=full brightness, CC20=green hue. Mirrors what Ableton will send.
import pkg from '@julusian/midi';
const out = new pkg.Output();
let idx = -1;
for (let i = 0; i < out.getPortCount(); i++) if (out.getPortName(i).includes('IAC')) idx = i;
if (idx < 0) { console.error('No IAC output'); process.exit(1); }
out.openPort(idx);
console.log('→ IAC:', out.getPortName(idx));

out.sendMessage([0xB0, 21, 100]);                          // CC21 brightness ~79%→ (100/127)
setTimeout(() => out.sendMessage([0xB0, 20, 42]), 250);    // CC20 = green hue
setTimeout(() => { out.closePort(); console.log('sent: brightness + green'); process.exit(0); }, 700);
