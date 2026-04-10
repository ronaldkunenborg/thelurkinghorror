# Archival Task List

This archive contains completed tasks from `TASKS.md` that are directly understandable from `README.md`.

## README-Evidenced Completed Tasks

### Core Interpreter Foundation

| Task(s) | Completed outcome | Where this is evidenced (in `README.md`, other documentation or source) |
|---|---|---|
| 1-5 | Project and engine foundation planned/researched/designed (implementation plan, parser/runtime references, Phase 1 design) | `README.md` sections **Current State** + **Documentation Index** (`IMPLEMENTATION_PLAN.md`, `docs/OPEN_SOURCE_RESEARCH.md`, `docs/Z3_ENGINE_FORMAT_SUMMARY.md`, `docs/IFVMS_ARCHITECTURE_ANALYSIS.md`, `docs/PHASE1_FOUNDATION_DESIGN.md`) |
| 6-12 | Z3 parser/VM core + I/O loop + integration and startup bugfixes landed | `README.md` **Current State** ("browser-based Z-machine v3 interpreter"), **Testing** (`test-vm-core`, `test-integration`) and source files in `src/parser.js`, `src/vm-core.js`, `src/io.js` |

### UX, Audio, and Persistence Baseline

| Task(s) | Completed outcome | Where this is evidenced (in `README.md`, other documentation or source) |
|---|---|---|
| 13-16 | Bundled startup splash/music and sound pipeline (`$SOUND`, `$GAMESOUND`) | `README.md` **Current State**, **Interpreter Commands**, **Attribution**, committed assets under `src/assets/audio/` |
| 17-21 | Room-art-driven scene system + HUD/status metadata integration | `README.md` **Current State** and **UI Features** (room scene transitions, top-bar room/score/moves, dark-room handling) |
| 22-25 | Local save/load ecosystem, command overview/settings sheets, icon action rail, VM save/restore integration | `README.md` **Current State**, **Interpreter Commands** (`$SAVE/$LOAD/$SAVES/$DELETE/$EXPORT/$IMPORT`), **UI Features**, docs `docs/QUETZAL_LOCAL_STORAGE.md` |

## Notes

- This file is for archival/readability so active planning in `TASKS.md` can stay shorter.
- If `README.md` changes substantially, this archive should be refreshed to keep evidence mapping accurate.
