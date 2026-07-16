// Connect to the bridge SSE stream, then send MIDI into IAC, and report what the bridge saw.
import http from 'node:http';
import pkg from '@julusian/midi';

const events = [];
http.get('http://localhost:8080/api/midi/stream', (res) => {
  res.on('data', (d) => { const s = d.toString(); if (s.includes('data:')) events.push(s.trim().replace(/\s+/g, ' ')); });
});

setTimeout(() => {
  const o = new pkg.Output();
  let i = -1;
  for (let k = 0; k < o.getPortCount(); k++) { if (o.getPortName(k).includes('IAC')) i = k; }
  console.log('IAC output idx:', i, '(', i >= 0 ? o.getPortName(i) : 'NONE', ')');
  o.openPort(i);
  o.sendMessage([0x90, 36, 120]);   // note on
  o.sendMessage([0xB0, 20, 0]);     // CC20=0
  setTimeout(() => o.closePort(), 150);
}, 800);

setTimeout(() => {
  console.log('events bridge received:', events.length);
  events.forEach((e) => console.log('  ', e));
  process.exit(0);
}, 2500);
