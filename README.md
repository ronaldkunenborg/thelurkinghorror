# The Lurking Horror Web Interpreter

This project builds a browser-based Z-machine interpreter for Infocom's `The Lurking Horror` (`.z3`).

## Documentation Index

- [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) - phased implementation architecture and delivery plan.
- [`OPEN_SOURCE_RESEARCH.md`](OPEN_SOURCE_RESEARCH.md) - research summary of existing Z-machine implementations.
- [`docs/Z3_ENGINE_FORMAT_SUMMARY.md`](docs/Z3_ENGINE_FORMAT_SUMMARY.md) - concise implementation reference for Z3 format, memory map, key data structures, and V3 opcode baseline.
- [`docs/IFVMS_ARCHITECTURE_ANALYSIS.md`](docs/IFVMS_ARCHITECTURE_ANALYSIS.md) - `ifvms.js` parser/runtime/opcode architecture study with adaptation guidance for our single-file Z3 interpreter.
- [`docs/PHASE1_FOUNDATION_DESIGN.md`](docs/PHASE1_FOUNDATION_DESIGN.md) - finalized Phase 1 foundation design: parser shape, opcode subset, memory strategy, and implementation architecture diagram.
- [`docs/QUETZAL_LOCAL_STORAGE.md`](docs/QUETZAL_LOCAL_STORAGE.md) - IndexedDB-based Quetzal slot storage with `.sav` import/export workflow for serverless local save/load.
- [`docs/ADR-0001-quetzal-local-storage.md`](docs/ADR-0001-quetzal-local-storage.md) - architecture decision record for serverless Quetzal persistence via IndexedDB plus file import/export.
- [`docs/INTERPRETER_EXTENSIONS.md`](docs/INTERPRETER_EXTENSIONS.md) - interpreter-specific quality-of-life features (`$SOUND`, `$SOUNDSTATS`) plus HELP/login note extension and sound debug output.

## Core Assets

- [`../data/The_Lurking_Horror_Infocom_Release_219_Serial_870912.z3`](../data/The_Lurking_Horror_Infocom_Release_219_Serial_870912.z3) - target story file used for parser/VM development and validation.
