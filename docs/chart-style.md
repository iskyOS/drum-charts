# How to write each line of a drum chart section

Each section has two text layers. Alex gives the notes in plain words; whoever edits the chart
writes both layers.

## 1. Stage cue – `cue` (shown in Stage mode, read mid-song)

- 2–4 words, readable in about half a second.
- Say **what changes** in this section, not the whole groove.
- Exception: the first section where drums come in states the groove – there's nothing yet to
  change from.
- Use the standard terms below.
- Good: `Ride, half-time` · `↑ build` · `DROP – stay down` · `HIT 1` · `OUT` · `Add 4 on floor`

## 2. Longhand – `detail` (Rehearse / Notes mode)

- Alex's notes, lightly cleaned up, in his own words. Don't rewrite them in your voice.
- Keep the specifics and the why (which pass, what drops out, what to watch for).
- Swap in the standard terms where the wording means the same thing
  (e.g. "quarter note kicks" → "4 on floor").

## Standard terms (always name the same thing the same way)

Grooves and parts:
- **4 on floor**: quarter-note kick
- **backbeat**: snare on 2 & 4
- **half-time**: snare on 3
- **ride 8ths** / **hats 8ths** / **hats 16ths**
- **open hats**
- **triplet kick**
- **floor tom 8ths**
- **rims**: cross-stick / rim click
- **swells**: mallet cymbal swells
- **crash on 1**

Moves:
- **OUT** / **IN**: drums out / drums enter
- **↑ build** / **↓ pull back**
- **DROP**: sudden cut to out or near-out
- **rumble**
- **HIT 1**: big hit on 1
- **ring on 4**: hit on 4 and let it ring
- **fill**: fill into the next section

Structure:
- **×2**: repeats – use the section's `x:` field, not the cue
- **p1 / p2**: pass 1 / pass 2, when a part changes between passes

`python3 scripts/build.py` warns (without failing) when a cue runs past 4 words.
