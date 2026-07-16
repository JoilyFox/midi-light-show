#!/usr/bin/env python3
"""Re-harmonize the arrangement into a clean, consonant A-minor progression (Am F C G).
Overwrites the existing arrangement clips (verified: duplicate_clip_to_arrangement overwrites).
Bass now FOLLOWS the chords; arp is fed held chords so its arpeggiator stays in key.
Leaves DRUMS (track 10) and LIGHTS (track 4) untouched.
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from ableton_ctl import send

BAR = 4.0
def n(p, s, d, v): return {"pitch": int(p), "start_time": float(s), "duration": float(d), "velocity": int(v), "mute": False}

# Am  F   C   G   — smooth voice-leading triads
CH   = [[57,60,64], [57,60,65], [55,60,64], [55,59,62]]
ROOT = [45, 41, 48, 43]   # A F C G  (mid bass, follows harmony)
SUB  = [33, 29, 36, 31]   # one octave below (held sub)
KEYS = [(69,0,1.5,72),(67,2,1.0,64), (69,4,1.5,74),(72,6,1.5,68),
        (67,8,1.5,72),(64,10,1.0,64), (74,12,1.5,74),(71,14,1.5,70)]

def pad():  return [n(p, i*BAR, BAR, 56) for i,ch in enumerate(CH) for p in ch]
def bass(): return [n(r, i*BAR+b, 0.85, 88) for i,r in enumerate(ROOT) for b in range(4)]   # root pulse, follows chords
def sub():  return [n(r, i*BAR, BAR, 64) for i,r in enumerate(SUB)]                          # held sub foundation
def arp():  return [n(p+12, i*BAR, BAR, 50) for i,ch in enumerate(CH) for p in ch]           # held chords -> arpeggiator
def keys(): return [n(*k) for k in KEYS]

def rebuild(track, notes, positions, name):
    # build a fresh 4-bar clip in slot 1, then overwrite the arrangement at the given beats
    send("create_clip", {"track_index": track, "clip_index": 1, "length": 4*BAR})
    send("add_notes_to_clip", {"track_index": track, "clip_index": 1, "notes": notes})
    send("set_clip_name", {"track_index": track, "clip_index": 1, "name": name})
    for b in positions:
        send("duplicate_session_clip_to_arrangement", {"track_index": track, "clip_index": 1, "destination_time": float(b)})
    send("stop_clip", {"track_index": track, "clip_index": 1})
    print(f"  track {track} {name}: {len(notes)} notes -> {len(positions)} arrangement spots")

def main():
    send("stop_playback")
    rebuild(6, pad(),  [0,16,32,48], "Pad Am-F-C-G")     # PAD
    rebuild(5, bass(), [0,16,32,48], "Bass (follows)")    # BASS (overwrites the 1-bar C clips)
    rebuild(7, sub(),  [16,32,48],   "Sub")               # BASSLINE -> held sub
    rebuild(8, arp(),  [16,32,48],   "Arp (chords)")      # ARP fed held chords
    rebuild(9, keys(), [32,48],      "Keys melody")       # KEYS
    # check the bass region overwrite worked
    r = send("get_arrangement_clips", {"track_index": 5})
    cl = r.get("clips", r) if isinstance(r, dict) else r
    print(f"  BASS arrangement clips now: {len(cl)} (was 16 one-bar; expect 4 four-bar)")
    send("set_current_song_time", {"time": 0.0})
    print("DONE — A-minor Am F C G, bass follows the chords, arp in key.")

if __name__ == "__main__":
    try: main()
    except Exception as e:
        print("ERROR:", e); sys.exit(1)
