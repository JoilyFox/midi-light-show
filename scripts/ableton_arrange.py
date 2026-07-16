#!/usr/bin/env python3
"""Build a textured, sectioned arrangement on top of the existing LIGHTS + BASS tracks,
via the AbletonMCP remote-script socket. Key: C minor, over a C pedal. 16 bars.

Sections (bars):  Intro 1-4 | Build 5-8 | Full 9-12 | Breakdown 13-16
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from ableton_ctl import send

BEAT = 1.0
BAR = 4 * BEAT
def barbeat(bar):  # start beat of a 1-based bar
    return (bar - 1) * BAR

def n(pitch, start, dur, vel):
    return {"pitch": int(pitch), "start_time": float(start), "duration": float(dur), "velocity": int(vel), "mute": False}

# ---- harmony: triads over a C pedal -> Cm, Ab/C, Cm7(Eb/C), Bb/C ----
CHORDS = [[48,51,55], [48,51,56], [51,55,58], [50,53,58]]
BASSLINE = [48, 44, 51, 46]   # moving mid bass roots: C Ab Eb Bb

def pick_sound(category, keywords):
    """Return a browser uri from Sounds/<category>, preferring a keyword match."""
    try:
        r = send("get_browser_items_at_path", {"path": "Sounds/" + category})
        items = r.get("items", r) if isinstance(r, dict) else r
        load = [it for it in items if it.get("is_loadable")]
        for it in load:
            if any(k in it["name"].lower() for k in keywords):
                return it["uri"], it["name"]
        return (load[0]["uri"], load[0]["name"]) if load else (None, None)
    except Exception as e:
        print("  pick_sound err", category, e); return None, None

def new_track(name, uri):
    idx = send("create_midi_track", {"index": -1})["index"]
    send("set_track_name", {"track_index": idx, "name": name})
    if uri:
        r = send("load_browser_item", {"track_index": idx, "item_uri": uri})
        print(f"  track {idx} {name}: loaded {r.get('item_name')}")
    return idx

def clip(idx, notes, length=4*BAR, name=""):
    send("create_clip", {"track_index": idx, "clip_index": 0, "length": length})
    send("add_notes_to_clip", {"track_index": idx, "clip_index": 0, "notes": notes})
    if name:
        send("set_clip_name", {"track_index": idx, "clip_index": 0, "name": name})

def place(idx, beats):
    for b in beats:
        send("duplicate_session_clip_to_arrangement", {"track_index": idx, "clip_index": 0, "destination_time": float(b)})
    send("stop_clip", {"track_index": idx, "clip_index": 0})

# ---------- content builders ----------
def pad_notes():
    out = []
    for i, ch in enumerate(CHORDS):
        for p in ch:
            out.append(n(p, i*BAR, BAR, 60))
    return out

def arp_notes():
    out = []
    for i, ch in enumerate(CHORDS):
        tones = [t + 12 for t in ch]
        for j in range(8):
            out.append(n(tones[j % 3], i*BAR + j*0.5, 0.45, 52 + (14 if j % 2 == 0 else 0)))
    return out

def keys_notes():
    seq = [(67,0,1.5,80),(63,2,1.0,72),
           (68,4,1.5,82),(72,6,1.5,76),
           (70,8,1.0,80),(67,9.5,1.5,74),
           (65,12,1.0,78),(62,13,1.0,72),(58,14,2.0,76)]
    return [n(*s) for s in seq]

def bassline_notes():
    out = []
    for i, root in enumerate(BASSLINE):
        out.append(n(root, i*BAR + 0.0, 1.8, 96))
        out.append(n(root, i*BAR + 2.0, 1.6, 88))
    return out

def drum_notes():  # 1-bar 808 groove (kick36 snare38 clap39 chh42 ohh46)
    out = [n(36,0,0.5,112), n(36,2,0.5,96),
           n(38,1,0.5,98),  n(38,3,0.5,104), n(39,3,0.5,84)]
    for j in range(8):                       # closed hats, 8ths
        out.append(n(42, j*0.5, 0.25, 60 if j % 2 else 48))
    out += [n(46,1.5,0.4,72), n(46,3.5,0.4,72)]  # offbeat open hats
    return out

# ---------- build ----------
def main():
    print("instruments:")
    pad_uri,  pad_nm  = pick_sound("Pad", ["warm","soft","dream","wash","glow","calm","silk","velvet","lush","air","still","deep","evolv","gentle"])
    arp_uri,  arp_nm  = pick_sound("Synth Rhythmic", ["arp","pluck","soft","glass","bell","mello","warm","bright","dream","gentle"])
    keys_uri, keys_nm = pick_sound("Piano & Keys", ["soft","warm","mellow","felt","rhodes","electric","dream","clean","simple"])
    bass_uri, bass_nm = pick_sound("Bass", ["sub","deep","round","warm","smooth","analog","pluck","mellow"])
    drum_uri = "query:Drums#FileId_5483"  # 808 Core Kit

    pad = new_track("PAD", pad_uri)
    bl  = new_track("BASSLINE", bass_uri)
    arp = new_track("ARP", arp_uri)
    keys= new_track("KEYS", keys_uri)
    drm = new_track("DRUMS", drum_uri)

    print("clips + arrangement:")
    clip(pad, pad_notes(), name="Pad: Cm Ab/C Eb/C Bb/C"); place(pad, [barbeat(1), barbeat(5), barbeat(9), barbeat(13)])
    clip(bl,  bassline_notes(), name="Bassline");          place(bl,  [barbeat(5), barbeat(9), barbeat(13)])
    clip(arp, arp_notes(), name="Arp");                    place(arp, [barbeat(5), barbeat(9), barbeat(13)])
    clip(keys,keys_notes(), name="Keys");                  place(keys,[barbeat(9), barbeat(13)])
    clip(drm, drum_notes(), length=BAR, name="808 Groove"); place(drm, [barbeat(b) for b in range(5, 13)])  # bars 5-12

    # extend the existing LIGHTS (track 4) + BASS (track 5) to cover bars 5-16
    ext = [barbeat(b) for b in range(5, 17)]
    for idx, label in [(4, "LIGHTS"), (5, "BASS")]:
        for b in ext:
            send("duplicate_session_clip_to_arrangement", {"track_index": idx, "clip_index": 0, "destination_time": float(b)})
        print(f"  extended {label} to 16 bars")

    send("set_current_song_time", {"time": 0.0})
    print("\nDONE. 16-bar arrangement: Intro(1-4) -> Build(5-8) -> Full(9-12) -> Breakdown(13-16).")
    print(f"  Pad: {pad_nm} | Bassline: {bass_nm} | Arp: {arp_nm} | Keys: {keys_nm} | Drums: 808 Core Kit")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("ERROR:", e); sys.exit(1)
