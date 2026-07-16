// Listen-only: report what MIDI the bridge receives over IAC for 4 seconds.
import http from 'node:http';
const events = [];
http.get('http://localhost:8080/api/midi/stream', (res) => {
  res.on('data', (d) => { const s = d.toString(); if (s.includes('"kind"')) events.push(s.trim().replace(/\s+/g, ' ')); });
});
setTimeout(() => {
  console.log(`MIDI events bridge received in 4s: ${events.length}`);
  events.slice(0, 12).forEach((e) => console.log('  ', e));
  process.exit(0);
}, 4000);
