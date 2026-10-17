# How to write each line of a drum chart section

Each section has two text layers. Alex gives the notes in plain words; whoever edits the chart
writes both layers, cleaning the notes up for whatever reads easiest.

## 1. Stage cue – `cue` (shown in Stage mode, read mid-song)

- Plain, straightforward words that say what to play in this section. Clear beats short: it should
  make sense at a glance to someone who hasn't seen the chart before.
- Lead with what's new or different in this section, then the rest of the groove if it helps.
- No arrows, symbols or abbreviations standing in for words (write "pull back", not "↓";
  "pass 2", not "p2").
- Aim to fit on one line on the phone (about 30 characters). Put anything longer in the longhand.
- Use the standard terms below.
- Good: `Pull back: rims, 4 on floor` · `Toms pass 1, full pass 2` · `Drop way down, stay down` ·
  `Big hit on 1 to end` · `Drums out – acoustic only`

## 2. Longhand – `detail` (Rehearse / Notes mode)

- Alex's notes, cleaned up and reworded freely for whatever is easiest to read.
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
- **cymbal swells**: mallet cymbal swells
- **crash on 1**
- **quarter crashes**: crash on every beat
- **snare 16ths** / **floor tom triplets** / **kick 8ths**

Moves:
- **drums out** / **drums in**
- **build** / **pull back**
- **drop**: sudden cut to out or near-out
- **rumble**
- **big hit on 1**
- **ring on 4**: hit on 4 and let it ring
- **fill**: fill into the next section

Structure:
- **×2**: only when every pass is played exactly the same – use the section's `x:` field.
- When passes play differently (a bridge that builds, a pre-chorus that's toms then a build), give
  each pass its own row – `Bridge 1`, `Bridge 2`, `Bridge 3` – with what to play that time through.
  Never squeeze several passes into one "Bridge ×3" row.

## Kick patterns (count notation)

- Write kick patterns as the beats themselves, using 16th-note counting (1 e & a): `kick 1 · 2a · 3&`
- A beat number alone means the downbeat. Separate hits with `·`.
- If the pattern isn't every bar, add it after the count: `kick 3 · 4 · 1, end of every 2nd bar`
- Convert plain words to this format: "kick on 1, the 'a' of 2 and the '&' of 3" → `kick 1 · 2a · 3&`
- Counts are short enough for the stage cue. Use them there when the kick pattern is what changes
  in that section.
- Common patterns: `kick 1 · 3&` · `kick 1 · 2a · 3&` · `kick 3 · 4 · 1`

`python3 scripts/build.py` warns (without failing) when a cue is likely too long for one line.
