// Send test MIDI into "IAC Driver Bus 1" so we can confirm the bridge receives it.
// Simulates exactly what Ableton (AbletonMCP Output = IAC) will do.
import pkg from '@julusian/midi';
const out = new pkg.Output();
let idx = -1;
for (let i = 0; i < out.getPortCount(); i++) if (out.getPortName(i).includes('IAC')) idx = i;
if (idx < 0) { console.error('No IAC output port found'); process.exit(1); }
out.openPort(idx);
console.log('Sending to:', out.getPortName(idx));

out.sendMessage([0xB0, 20, 100]);                 // CC20 = 100 (ch1)
setTimeout(() => out.sendMessage([0xB0, 20, 40]), 150);  // CC20 = 40
setTimeout(() => out.sendMessage([0x90, 60, 110]), 350);  // note 60 on, vel 110
setTimeout(() => out.sendMessage([0x80, 60, 0]), 650);    // note 60 off
setTimeout(() => { out.closePort(); console.log('done'); process.exit(0); }, 900);
