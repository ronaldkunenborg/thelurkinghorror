# The Lurking Horror Web Interpreter

This project builds a browser-based Z-machine interpreter for Infocom's `The Lurking Horror` (`.z3`).

## Current State

The app currently provides:

- a browser-based Z-machine v3 interpreter focused on `The Lurking Horror`
- bundled-story startup with a splash screen and optional local story-file loading
- a styled terminal UI with location artwork, a sidebar action bar, and responsive mobile layout
- top-bar room, score, and moves display driven from VM status state
- in-game sound effects support via `$SOUND`
- separate splash/game-music control via `$GAMESOUND`
- local interpreter-level save/load slots via IndexedDB and `.sav` import/export
- a commands overview sheet with grouped game, control, and meta commands
- debug output gated behind `$DEBUG`

## Interpreter Commands

The interpreter adds several non-story commands:

- `$SOUND`
  Toggle in-game sound effects only.
- `$GAMESOUND`
  Toggle splash and other interpreter-controlled game music.
- `$DEBUG`
  Toggle debug-only VM and sound diagnostics.
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

## UI Features

- `Save`, `Load`, and `Commands` sidebar buttons for common interpreter actions
- grouped command overview for movement, observation, inventory, interaction, and system/meta commands
- room artwork transitions keyed to actual VM room state rather than output heuristics
- splash music attribution and startup overlay
- command history on the input field via arrow keys

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
- `x` is accepted as `examine`, though the parser’s prompt text differs slightly from the full-word form.

## Data And Assets

Project source now lives under `app/`, while large story/source data assets are expected one level up in `../data/`.

Important runtime/source assets:

- [`../data/The_Lurking_Horror_Infocom_Release_219_Serial_870912.z3`](../data/The_Lurking_Horror_Infocom_Release_219_Serial_870912.z3) - target story file used for parser/VM development and validation.
- [`src/assets/audio/splash-horror-whirlguy.mp3`](src/assets/audio/splash-horror-whirlguy.mp3) - splash music used by the startup overlay.
- [`src/assets/gfx/lurkinghorror/terminal_room.png`](src/assets/gfx/lurkinghorror/terminal_room.png) - current room-art asset used by the scene system.

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
- [`docs/IFVMS_ARCHITECTURE_ANALYSIS.md`](docs/IFVMS_ARCHITECTURE_ANALYSIS.md) - `ifvms.js` parser/runtime/opcode architecture study with adaptation guidance for our single-file Z3 interpreter.
- [`docs/PHASE1_FOUNDATION_DESIGN.md`](docs/PHASE1_FOUNDATION_DESIGN.md) - finalized Phase 1 foundation design: parser shape, opcode subset, memory strategy, and implementation architecture diagram.
- [`docs/QUETZAL_LOCAL_STORAGE.md`](docs/QUETZAL_LOCAL_STORAGE.md) - IndexedDB-based Quetzal slot storage with `.sav` import/export workflow for serverless local save/load.
- [`docs/ADR-0001-quetzal-local-storage.md`](docs/ADR-0001-quetzal-local-storage.md) - architecture decision record for serverless Quetzal persistence via IndexedDB plus file import/export.
- [`docs/INTERPRETER_EXTENSIONS.md`](docs/INTERPRETER_EXTENSIONS.md) - interpreter-specific quality-of-life features including `$SOUND`, `$GAMESOUND`, `$DEBUG`, save/load commands, HELP/login note extension, and sound debug output.
