/**
 * MidiInput — thin wrapper over @julusian/midi (RtMidi) input.
 * Lists ports, opens one, parses raw MIDI bytes into MidiEvent, emits 'event'.
 *
 * macOS: to get a port from a DAW, enable the IAC Driver in Audio MIDI Setup
 * (Applications → Utilities → Audio MIDI Setup → Window → Show MIDI Studio →
 *  double-click "IAC Driver" → tick "Device is online"). The DAW sends to that bus.
 */

import { EventEmitter } from 'node:events';
import { Input } from '@julusian/midi';
import type { MidiEvent } from '../engine/types';

function parse(msg: number[]): MidiEvent | null {
  if (msg.length < 2) return null;
  const status = msg[0] & 0xf0;
  const channel = msg[0] & 0x0f;
  switch (status) {
    case 0xb0: return { kind: 'cc', channel, number: msg[1], value: msg[2] ?? 0 };
    case 0x90: // noteOn (velocity 0 == noteOff by convention)
      return (msg[2] ?? 0) === 0
        ? { kind: 'noteOff', channel, number: msg[1], value: 0 }
        : { kind: 'noteOn', channel, number: msg[1], value: msg[2] };
    case 0x80: return { kind: 'noteOff', channel, number: msg[1], value: msg[2] ?? 0 };
    default: return null; // ignore clock/program/pitchbend for now
  }
}

export class MidiInput extends EventEmitter {
  private input: Input | null = null;
  private openName: string | null = null;

  listPorts(): string[] {
    // Use a throwaway Input purely to enumerate ports (don't disturb the open one).
    const probe = new Input();
    const out: string[] = [];
    for (let i = 0; i < probe.getPortCount(); i++) out.push(probe.getPortName(i));
    try { probe.closePort(); } catch { /* not open */ }
    return out;
  }

  open(index: number): boolean {
    const ports = this.listPorts();
    if (index < 0 || index >= ports.length) return false;
    // Fresh Input every time — reopening a port on the same RtMidi handle can go deaf.
    this.close();
    const input = new Input();
    input.ignoreTypes(true, true, true); // sysex, timing(clock), active sensing
    input.on('message', (_dt: number, msg: number[]) => {
      const ev = parse(msg);
      if (ev) this.emit('event', ev);
    });
    input.openPort(index);
    this.input = input;
    this.openName = ports[index];
    return true;
  }

  openByName(name: string): boolean {
    const idx = this.listPorts().indexOf(name);
    return idx >= 0 ? this.open(idx) : false;
  }

  currentName(): string | null {
    return this.openName;
  }

  close(): void {
    if (this.input) {
      try { this.input.closePort(); } catch { /* not open */ }
      this.input.removeAllListeners('message');
      this.input = null;
    }
    this.openName = null;
  }
}
