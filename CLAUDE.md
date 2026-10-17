# drum-charts

Drum charts for Sunday worship sets plus a phone stage app. Read README.md for the data format.

Rules when adding or editing charts:
- One source of truth: a song's chart lives only in `songs/<id>.yml`. Never copy sections into a set.
  Different arrangements of the same song go under `variants:` in that song's file.
- Week-specific things (leader, a different key, a transition note) go on the set entry in `sets/<date>.yml`.
- Keep `cue` short – it is read at a glance from behind the kit. Put longer explanations in `detail`.
- Mark only the moments that must not be missed with `hot: true`; if everything is hot, nothing is.
- Run `python3 scripts/build.py` after changes; it validates everything and must pass.
- The stage view must fit a whole song on one iPhone screen without scrolling (the app auto-scales).
  If you change the layout, check a long song (13+ sections) at a 420×760 viewport.
