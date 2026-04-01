# The Lurking Horror Web Interpreter

This project is now a full browser-first play experience for Infocom's `The Lurking Horror` (`.z3`): a custom Z-machine v3 runtime, layered cinematic UI, room-art scene system, local save ecosystem, sound pipeline, and in-interpreter debugging/tooling for iterative world presentation.

## Current State

The app currently provides:

- a browser-based Z-machine v3 interpreter focused on `The Lurking Horror`
- bundled-story startup with a cinematic splash screen and music handling
- layered room-art scene rendering keyed to live VM room state (including dark-room suppression)
- a transparent/blurred HUD (terminal + action rail) over scene art
- ambient blood-splatter overlay system with debug controls for deterministic testing
- top-bar room, score, and moves display driven from VM status snapshots
- in-game sound effects support via `$SOUND`
- separate splash/game-music control via `$GAMESOUND`
- local interpreter-level save/load slots via IndexedDB and `.sav` import/export
- VM-level story `save`/`restore` integrated with local Quetzal slot persistence
- command overview and audio settings sheets
- debug output gated behind `$DEBUG`

## Interpreter Commands

The interpreter adds non-story commands:

- `$SOUND`
  Toggle in-game sound effects only.
- `$GAMESOUND`
  Toggle splash/interpreter-managed game music.
- `$DEBUG`
  Toggle debug-only VM/sound/light/blood diagnostics.
- `$SOUNDSTATS`
  Print captured sound-event statistics.
- `$SAVE`
  Save to local slot `0`.
- `$SAVE <slot>`
  Save to a numbered local slot.
- `$LOAD`
  Load local slot `0`.
- `$LOAD <slot>`
  Load a numbered local slot.
- `$SAVES`
  List local save slots for the current story build.
- `$DELETE <slot>`
  Delete a numbered local save slot.
- `$EXPORT <slot>`
  Export a local slot as a `.sav` file.
- `$IMPORT <slot>`
  Import a `.sav` file into a numbered slot.
- `$FLASHLIGHT ON|OFF`
  Temporary visual override for dark-room scene testing (interpreter-side only).
- `$BLOOD ON|OFF|NOW|RANDOM|<1-5>`
  Blood effect controls for testing/tuning; guarded by `$DEBUG`.

## UI Features

- icon-based action rail (`Save`, `Load`, `Commands`, `Settings`)
- grouped command reference sheet
- room scene transitions with per-room ID mapping and dark-room handling
- splash startup flow with music attribution
- persistent music/SFX sliders in local storage
- command history on input via arrow keys

## Verified Single-Letter Game Commands

These were verified against the local interpreter/game, not added by assumption:

- `n` -> `north`
- `s` -> `south`
- `e` -> `east`
- `w` -> `west`
- `u` -> `up`
- `d` -> `down`
- `l` -> `look`
- `x` -> `examine`
- `i` -> `inventory`
- `t` -> `time`
- `z` -> `wait`
- `g` -> `again`
- `o` -> `oops`
- `q` -> `quit`
- `y` -> `yes`

Notes:

- `g` and `o` are contextual and depend on prior input.
- `x` is accepted as `examine`, though parser prompt text differs slightly from the full-word form.

## Data and Assets

Project source lives under `app/`.

Large external story/reference assets are intentionally **not committed** to this repository.  
For local development, provide them separately (for example in `../data/`) and keep them out of version control.

### Required local asset

- `The_Lurking_Horror_Infocom_Release_219_Serial_870912.z3`
  - Required for parser/VM development and runtime validation.
  - Expected by local tools/tests at `../data/The_Lurking_Horror_Infocom_Release_219_Serial_870912.z3`.

### Optional local references (not committed)

- `lurking.pdf`
- `booklet-page3.png`
- `booklet-page4.png`

These are used as map/reference material during location reconciliation work.

### Committed runtime assets

- [`src/assets/audio/splash-horror-whirlguy.mp3`](src/assets/audio/splash-horror-whirlguy.mp3) - splash music.
- [`src/assets/gfx/lurkinghorror/`](src/assets/gfx/lurkinghorror/) - location artwork set.
- [`src/assets/gfx/blood/`](src/assets/gfx/blood/) - blood-splatter overlays used by the ambient blood effect.

## Testing

Useful local checks:

- `node tools/test-vm-core.js`
- `node tools/test-io-controller-output.js`
- `node tools/test-integration.js`
- `node tools/test-sound-sequence.js`

## Documentation Index

- [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) - phased implementation architecture and delivery plan.
- [`OPEN_SOURCE_RESEARCH.md`](OPEN_SOURCE_RESEARCH.md) - research summary of existing Z-machine implementations.
- [`docs/Z3_ENGINE_FORMAT_SUMMARY.md`](docs/Z3_ENGINE_FORMAT_SUMMARY.md) - concise implementation reference for Z3 format, memory map, key data structures, and V3 opcode baseline.
- [`docs/IFVMS_ARCHITECTURE_ANALYSIS.md`](docs/IFVMS_ARCHITECTURE_ANALYSIS.md) - `ifvms.js` parser/runtime/opcode architecture study with adaptation guidance for this interpreter.
- [`docs/PHASE1_FOUNDATION_DESIGN.md`](docs/PHASE1_FOUNDATION_DESIGN.md) - finalized Phase 1 design.
- [`docs/QUETZAL_LOCAL_STORAGE.md`](docs/QUETZAL_LOCAL_STORAGE.md) - IndexedDB-based Quetzal slot storage with `.sav` import/export workflow.
- [`docs/ADR-0001-quetzal-local-storage.md`](docs/ADR-0001-quetzal-local-storage.md) - architectural decision record for Quetzal persistence.
- [`docs/INTERPRETER_EXTENSIONS.md`](docs/INTERPRETER_EXTENSIONS.md) - interpreter QoL extensions and behavior notes.
- [`docs/LOCATION_MAP.md`](docs/LOCATION_MAP.md) - spoiler-heavy technical/reference map.
- [`docs/LOCATION_IMAGE_BRIEFS.md`](docs/LOCATION_IMAGE_BRIEFS.md) - location title/description briefs for image generation workflows.

## Attribution

- Splash music: `horror` by **Whirlguy** (CC BY-ND 3.0),
  published on Newgrounds Audio Portal:
  https://www.newgrounds.com/audio/listen/6630
