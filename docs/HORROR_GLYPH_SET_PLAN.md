# Horror Glyph Set Plan

This document defines an initial custom glyph set for brief icon-glitch and text-corruption effects in the UI.

## Design goal

The glyphs should feel:

- occult but not tied too rigidly to one real-world symbol system
- scratch-drawn, etched, and slightly academic
- legible as intentional marks at small sizes
- unsettling in short flashes, not ornamental

They should support:

- brief icon substitution in the action rail
- short text corruption flashes in output
- debug-triggered previews during tuning

## Visual direction

Primary direction:

- custom glyphs created specifically for this project
- angular strokes, loops, forks, broken circles, hooks, and ladder-like marks
- white or bone-colored lines on dark ground
- slightly imperfect hand-etched geometry

Allowed inspiration:

- Lovecraft-adjacent occult typography and invented eldritch marks
- Elder Futhark / Nordic rune silhouettes as loose shape inspiration
- Kabbalistic or Goetic sigil-like visual density as inspiration only

Avoid:

- direct copy of famous sigils
- highly recognizable modern fantasy "rune alphabet" clichés
- symbols that become unreadable at icon size

## Initial set

Create an initial set of `8` glyphs.

Suggested visual roles:

1. `Forked Spine`
   - vertical shaft with short opposing barbs
   - useful as a replacement for a help/info style icon

2. `Broken Halo`
   - incomplete ring with one descending stroke
   - useful as a replacement for settings or map-like icons

3. `Hook Spiral`
   - partial spiral ending in a sharp hook
   - useful for unstable, attention-pulling flashes

4. `Ladder Thorn`
   - two verticals with uneven rungs and one protruding spike
   - machine-like and institutional

5. `Split Eye`
   - eye/almond silhouette interrupted by a vertical crack
   - strongest "being watched" glyph; use sparingly

6. `Crowned Knot`
   - compact looped center with three short upper spikes
   - good for replacing save/load icons in a way that feels wrong but structured

7. `Bent Trident`
   - three-pronged top on an asymmetric stem
   - good silhouette at small size

8. `Sealed Door`
   - box/door frame crossed by a diagonal or central binding mark
   - useful as a closed/forbidden-looking substitute

## Glyph spec sheet

Each glyph should have a stable id, a preferred UI usage role, and a rough intensity so implementation can bias rarer glyphs toward rarer moments.

1. `glyph_forked_spine`
   - Silhouette: one long vertical spine with two short offset barbs left and right, plus a broken foot at the base
   - Best use: help/command/info icon replacement
   - Intensity: low
   - Notes: should read as "structured but wrong," not aggressive

2. `glyph_broken_halo`
   - Silhouette: incomplete ring in the upper half with one descending center stroke and one missing arc segment
   - Best use: settings/map/preferences replacement
   - Intensity: low
   - Notes: circular enough to feel symbolic, but visibly damaged

3. `glyph_hook_spiral`
   - Silhouette: partial inward curl terminating in a sharp hook, with one detached nick mark nearby
   - Best use: rare attention spike or text-corruption symbol
   - Intensity: medium
   - Notes: should feel unstable; use less often than the calmer glyphs

4. `glyph_ladder_thorn`
   - Silhouette: two narrow uprights joined by uneven short rungs, with one diagonal thorn jutting out
   - Best use: load/save or slot-related icon replacement
   - Intensity: low
   - Notes: leans technical and institutional, which fits the game well

5. `glyph_split_eye`
   - Silhouette: narrow eye/almond form with a central crack or vertical cut that breaks symmetry
   - Best use: very rare icon glitch or debug preview
   - Intensity: high
   - Notes: strongest "watched" glyph; avoid frequent runtime use

6. `glyph_crowned_knot`
   - Silhouette: compact looped center with three short upper spikes and a slightly collapsed lower stem
   - Best use: save/load/help replacement where a denser mark is acceptable
   - Intensity: medium
   - Notes: should still be readable at small size without becoming decorative

7. `glyph_bent_trident`
   - Silhouette: three-pronged head on an asymmetric staff, with one tine bent inward
   - Best use: action-button swap where a bold silhouette is needed
   - Intensity: medium
   - Notes: high legibility at `24x24`; keep stroke count low

8. `glyph_sealed_door`
   - Silhouette: rectangular frame or slab crossed by a binding slash and small central seal mark
   - Best use: map, slot panel, or closed-state icon replacement
   - Intensity: low
   - Notes: should imply forbidden access more than threat

## Rendering constraints

- target icon box: roughly `24x24` to `30x30`
- stroke count should stay low enough for fast recognition
- each glyph should still read at a glance when shown for only `100-200ms`
- prefer SVG so we can animate opacity, blur, and swaps cleanly

## Usage rules

- never replace every action icon at once during normal play
- normal runtime: swap `1` icon, occasionally `2`
- display duration should usually stay between `100ms` and `200ms`
- do not trigger while overlays or critical confirmation dialogs are open
- do not combine with other strong effects at the same moment

## Text corruption rules

For output-text flicker:

- use a separate rune-text substitution table derived from the same glyph language
- corrupt only a small visible slice of text
- restore the original text immediately after the flash
- prefer suggestion over readability loss

## Text substitution plan

The text-flicker system should not try to become a full alternate alphabet. It only needs enough substitutions to make a brief visible slice feel wrong.

Substitution goals:

- preserve approximate word width
- keep some letters unchanged so text remains half-recognizable
- favor uppercase-looking angular forms for visual impact
- avoid substituting punctuation and numbers in the first pass

Recommended first-pass substitution table:

- `A -> /\`
- `E -> [-`
- `H -> ][`
- `I -> |`
- `K -> |<`
- `M -> /\\/\\`
- `N -> |\\|`
- `O -> ()`
- `R -> |2`
- `S -> 5`
- `T -> +`
- `V -> \\/`
- `W -> \\/\\/`
- `X -> ><`
- `Y -> '/`

Letters to usually leave unchanged:

- `b`, `c`, `d`, `f`, `g`, `j`, `l`, `p`, `q`, `u`, `z`

Corruption rules:

- corrupt only `15-35%` of characters in the chosen slice
- prefer noun-heavy or recent visible output lines
- corrupt at most one short slice per event
- restore from the original text source immediately after the flicker

## Implementation shape

Suggested asset strategy:

- store glyph SVGs under `src/assets/gfx/glyphs/`
- keep a small manifest of glyph ids in `src/index.html` or a dedicated helper module
- allow random selection plus debug forcing by glyph id

Suggested debug support:

- force glyph preview
- force icon swap now
- print current glyph ids and effect timings when debug is enabled

## Runtime tuning table

Initial recommended runtime values:

1. `room_text_rune_flicker`
   - Trigger: about `500ms` after a room-art transition completes
   - Probability: `5%` of eligible room transitions
   - Duration: `80-150ms`
   - Cooldown: at least `90s` before the same effect can recur
   - Notes: highest-priority effect because player attention is already on the scene

2. `room_art_micro_jump`
   - Trigger: room-art transition follow-up
   - Probability: `3%` of eligible room transitions
   - Duration: `60-120ms`
   - Cooldown: at least `120s`
   - Notes: tiny offset or double-exposure flash; never combine with rune flicker

3. `ui_glyph_swap`
   - Trigger: idle play only
   - Probability: once per idle check, about `1-2%`
   - Duration: `100-200ms`
   - Cooldown: at least `180s`
   - Notes: swap one icon, occasionally two in debug only

4. `peripheral_dim_pulse`
   - Trigger: idle play only
   - Probability: once per idle check, about `2-3%`
   - Duration: `120-220ms`
   - Cooldown: at least `150s`
   - Notes: keep soft; this is atmosphere, not a jump scare

5. `debug_forced_preview`
   - Trigger: explicit debug command
   - Probability: forced
   - Duration: effect-specific
   - Cooldown: none
   - Notes: bypass runtime randomness for tuning

Suggested scheduler rules:

- idle checks no more often than every `20-35s`
- suppress all effects while overlays, splash, dialogs, or map are open
- suppress all effects while another horror effect is active
- centralize all probabilities, durations, and cooldowns in one config block

## First pass deliverable

The first implementation pass only needs:

- 8 monochrome SVG glyphs
- icon-swap support for one rail button at a time
- optional text-corruption character map sharing the same visual language
- debug commands/hooks to preview glyphs and flashes on demand
