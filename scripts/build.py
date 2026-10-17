#!/usr/bin/env python3
"""Validate songs/ and sets/ and build the app into dist/.

    python3 scripts/build.py          # validate + build dist/
    python3 scripts/build.py --check  # validate only

The output is a single self-contained dist/index.html (CSS, JS and all chart
data inlined), plus the PWA extras for GitHub Pages.
"""
import datetime as dt
import json
import re
import shutil
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
SONG_KEYS = {"title", "artist", "key", "bpm", "time", "length", "status", "note", "sections", "variants"}
VARIANT_KEYS = {"title", "key", "bpm", "time", "length", "status", "note", "sections"}
SECTION_KEYS = {"name", "x", "level", "cue", "detail", "hot"}
SET_KEYS = {"date", "title", "note", "songs"}
ENTRY_KEYS = {"song", "variant", "leader", "key", "note"}
CUE_MAX = 30  # characters that reliably fit on one line of the cue column on an iPhone
LEVEL_RE = re.compile(r"^([0-5])(?:\s*>\s*([0-5]))?$")

errors = []
warnings = []


def err(where, msg):
    errors.append(f"{where}: {msg}")


def load(path):
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as e:
        err(path.relative_to(ROOT), f"invalid YAML – {e}")
        return None
    if not isinstance(data, dict):
        err(path.relative_to(ROOT), "expected a mapping at the top level")
        return None
    return data


def unknown(where, data, allowed):
    for k in data:
        if k not in allowed:
            err(where, f"unknown field '{k}' (allowed: {', '.join(sorted(allowed))})")


def text(v):
    # YAML 1.1 reads an unquoted 5:30 as the integer 330; turn it back into m:ss.
    if isinstance(v, int) and not isinstance(v, bool):
        return f"{v // 60}:{v % 60:02d}"
    return None if v is None else str(v)


def section(where, s):
    if not isinstance(s, dict):
        err(where, "each section must be a mapping with at least name and level")
        return None
    unknown(where, s, SECTION_KEYS)
    if not s.get("name"):
        err(where, "missing name")
    m = LEVEL_RE.match(str(s.get("level", "")).strip())
    if not m:
        err(where, f"level must be 0–5 or a build like 2>4, got {s.get('level')!r}")
        return None
    x = s.get("x")
    if x is not None and (not isinstance(x, int) or x < 1):
        err(where, f"x (repeat count) must be a whole number, got {x!r}")
    out = {"n": str(s.get("name", "")), "l": int(m.group(1))}
    if m.group(2) is not None and m.group(2) != m.group(1):
        out["l2"] = int(m.group(2))
    if x and x > 1:
        out["x"] = x
    for src, dst in (("cue", "c"), ("detail", "d")):
        if s.get(src):
            out[dst] = str(s[src]).strip()
    if s.get("hot"):
        out["hot"] = 1
    if len(out.get("c", "")) > CUE_MAX:
        warnings.append(f"{where}: cue is {len(out['c'])} characters – may not fit on one line on the phone (docs/chart-style.md)")
    return out


def meta(where, data, out):
    for k in ("title", "artist", "key", "time", "length", "status", "note"):
        if data.get(k) is not None:
            out[k] = text(data[k]).strip()
    if data.get("bpm") is not None:
        if not isinstance(data["bpm"], (int, float)):
            err(where, f"bpm must be a number, got {data['bpm']!r}")
        out["bpm"] = data["bpm"]
    return out


def sections(where, data):
    secs = data.get("sections")
    if not isinstance(secs, list) or not secs:
        err(where, "needs a non-empty sections list")
        return []
    return [r for i, s in enumerate(secs) if (r := section(f"{where} section {i + 1}", s))]


def load_songs():
    songs = {}
    for path in sorted((ROOT / "songs").glob("*.yml")):
        where = path.relative_to(ROOT)
        data = load(path)
        if data is None:
            continue
        unknown(where, data, SONG_KEYS)
        if not data.get("title"):
            err(where, "missing title")
        song = meta(where, data, {"id": path.stem})
        song["s"] = sections(where, data)
        variants = {}
        for name, v in (data.get("variants") or {}).items():
            vw = f"{where} variant '{name}'"
            if not isinstance(v, dict):
                err(vw, "must be a mapping")
                continue
            unknown(vw, v, VARIANT_KEYS)
            var = meta(vw, v, {})
            if "sections" in v:
                var["s"] = sections(vw, v)
            variants[str(name)] = var
        if variants:
            song["variants"] = variants
        songs[path.stem] = song
    if not songs:
        err("songs/", "no songs found")
    return songs


def load_sets(songs):
    sets = []
    for path in sorted((ROOT / "sets").glob("*.yml")):
        where = path.relative_to(ROOT)
        data = load(path)
        if data is None:
            continue
        unknown(where, data, SET_KEYS)
        date = data.get("date", path.stem)
        if isinstance(date, (dt.date, dt.datetime)):
            date = date.isoformat()[:10]
        try:
            dt.date.fromisoformat(str(date))
        except ValueError:
            err(where, f"date must look like 2026-10-18, got {date!r}")
        out = {"id": path.stem, "date": str(date), "items": []}
        for k in ("title", "note"):
            if data.get(k):
                out[k] = str(data[k])
        entries = data.get("songs")
        if not isinstance(entries, list) or not entries:
            err(where, "needs a non-empty songs list")
            entries = []
        for i, e in enumerate(entries):
            ew = f"{where} song {i + 1}"
            if isinstance(e, str):
                sid, _, var = e.partition(":")
                e = {"song": sid, **({"variant": var} if var else {})}
            if not isinstance(e, dict):
                err(ew, "must be a song id or a mapping with 'song'")
                continue
            unknown(ew, e, ENTRY_KEYS)
            sid = str(e.get("song", ""))
            if sid not in songs:
                err(ew, f"unknown song '{sid}' (no songs/{sid}.yml)")
                continue
            var = e.get("variant")
            if var and var not in songs[sid].get("variants", {}):
                err(ew, f"song '{sid}' has no variant '{var}'")
            item = {"song": sid}
            for k in ("variant", "leader", "key", "note"):
                if e.get(k):
                    item[k] = text(e[k])
            out["items"].append(item)
        sets.append(out)
    return sets


def build():
    songs = load_songs()
    sets = load_sets(songs)
    if errors:
        print("Chart data has problems:\n  " + "\n  ".join(errors), file=sys.stderr)
        sys.exit(1)
    for w in warnings:
        print(f"warning: {w}", file=sys.stderr)
    print(f"OK – {len(songs)} songs, {len(sets)} sets")
    if "--check" in sys.argv:
        return

    app = ROOT / "app"
    data = json.dumps({"songs": songs, "sets": sets}, ensure_ascii=False, separators=(",", ":"))
    html = (app / "index.html").read_text(encoding="utf-8")
    inline = {
        "/*@CSS*/": (app / "app.css").read_text(encoding="utf-8"),
        "/*@DATA*/": "window.CHARTS=" + data.replace("</", "<\\/") + ";",
        "/*@JS*/": (app / "app.js").read_text(encoding="utf-8"),
    }
    for marker, content in inline.items():
        if marker not in html:
            sys.exit(f"app/index.html is missing the {marker} marker")
        html = html.replace(marker, content)

    dist = ROOT / "dist"
    shutil.rmtree(dist, ignore_errors=True)
    dist.mkdir()
    (dist / "index.html").write_text(html, encoding="utf-8")
    for extra in ("manifest.webmanifest", "sw.js", "icon.svg", "icon-180.png", "icon-512.png"):
        if (app / extra).exists():
            shutil.copy(app / extra, dist / extra)
    print(f"Built {dist.relative_to(ROOT)}/index.html ({len(html) // 1024} KB)")


if __name__ == "__main__":
    build()
