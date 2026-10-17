# drum-charts

Drum charts and playing notes for worship songs, organized week by week for Sunday services –
plus a phone app that shows them on stage.

```
songs/   one file per song – the only place a song's chart lives
sets/    one file per Sunday – which songs, in what order, and that week's notes
app/     the phone app (HTML/CSS/JS)
scripts/build.py   checks the charts and builds the app into dist/
```

## Songs – `songs/<id>.yml`

The file name is the song's id (`holy-forever.yml` → `holy-forever`). Each song is written once and
reused every week it comes back.

```yaml
title: Holy Forever
artist: Bethel Music
key: B
bpm: 72
length: "5:30"          # quote it, or YAML reads 5:30 as a number
time: 6/8               # optional
status: draft           # optional – shows a DRAFT tag until the parts are confirmed
note: "Adam: one big tag only."   # arrangement note shown above the map

sections:
  - name: Intro
    level: 0            # 0 = drums out, 1 (lightest) … 5 (biggest)
    cue: Out – pad / keys          # the short "what to play" line shown on stage
  - name: Pre-Chorus
    x: 2                # repeats
    level: 3>4          # a build from 3 to 4 (use 4>2 for a drop)
    cue: Pass 1 toms → pass 2 build
    detail: Big build into the chorus.   # longer note, shown only in Notes mode
    hot: true           # highlight: a hit, a drop, an ending – something not to miss
    part: Act 2 · Big build   # optional – starts a labelled block here, to break up long songs
    crashes: true       # played with quarter crashes – shows a cymbal icon at the end of the row

variants:               # optional alternate arrangements of the same song
  reprise:
    length: "3:00"
    note: 2× big bridges, 2× big chorus, end big.
    sections: [...]     # anything not given is taken from the main song
```

How to word `cue` and `detail` (and the standard terms to use): [docs/chart-style.md](docs/chart-style.md).

## Sets – `sets/<date>.yml`

```yaml
date: 2026-10-18
songs:
  - song: thank-god-im-free
    leader: Kezia
    note: Rumble under the welcome → big hit on a 1.   # this week only
  - song: holy-forever
    leader: Adam
    key: C              # only if this week's key differs (highlighted on stage)
  - song: i-speak-jesus
    variant: reprise
  - what-a-friend       # a bare id works too (or "i-speak-jesus:reprise")
```

A set only *points at* songs; it never copies a chart. Week-specific things – who's leading, a key
change, a transition note – go on the set entry. Anything that's true every time you play the
song goes in the song file.

## The app

- Opens on the next upcoming Sunday. ☰ lists every set and lets you build a set from any songs.
- Any set is a link: `#set=2026-10-18`, or any songs in any order: `#songs=holy-forever,i-speak-jesus:reprise`.
- The whole song map always fits on one screen – text scales to fit, no scrolling.
- Swipe, tap the big Next button, or tap a song number at the top to change songs.
- Tap a section to mark where you are; earlier sections fade so the next one stands out.
- The stage view shows just the song title, this week's note and the map. **Notes** adds key, BPM,
  leader, artist, length, arrangement notes and the longer section details (that view scrolls);
  tap BPM there to flash the tempo.
- Bluetooth page-turner pedals work: ←/→ change songs, ↑/↓ move the section marker.
- Keeps the screen awake while open (where the browser allows it), and works offline once loaded.
- On iPhone: open it in Safari → Share → **Add to Home Screen** for a full-screen app.

## Building and publishing

```sh
pip install pyyaml
python3 scripts/build.py           # check + build dist/
python3 scripts/build.py --check   # check only
python3 -m http.server -d dist     # preview at http://localhost:8000
```

The build fails with a clear message if a set points at a song that doesn't exist, a level is
out of range, or a field name is misspelled.

To publish on GitHub Pages: copy `docs/pages-workflow.yml` to `.github/workflows/pages.yml`
(GitHub → Add file → Create new file, paste it in), then Settings → Pages → Source: **GitHub
Actions**. After that, every push to `main` checks the charts and redeploys the app. `dist/index.html` is a single self-contained file, so it can also be hosted anywhere
or opened directly.
