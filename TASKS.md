# Task List

Completed tasks should be moved to ## Recent Completed Context.
Completed tasks that are no longer needed for day-to-day context have been moved to `TASKS_archived.md`.
Pending tasks are listed under ## Pending tasks with status [pending].
Tasks under ## Refinements are optional with status [refine] and should only be done by user demand.
Ideas for expansion and new capabilities go under ## Future tasks with status [future]

## Recent Completed Context

1. [done] Create implementation plan for web-based Z-machine interpreter
   - Documented in IMPLEMENTATION_PLAN.md
   - Covers architecture, phases, technical challenges, testing strategy

2. [done] Research open-source Z-machine parsers
   - Documented in OPEN_SOURCE_RESEARCH.md
   - Found 3 major JavaScript implementations (ifvms.js, jszm, zmach)
   - ifvms.js (97 stars) recommended: MIT licensed, production-ready, used on iplayif.com
   - Recommended approach: Hybrid (build from scratch while using ifvms.js as reference)

3. [done] Study Z-Machine Standard 1.1 - File Format & Z3 Specifics
   - Reviewed official specification sections for memory, routines, objects, dictionary, and opcode tables
   - Documented Z3 header format and memory layout in `docs/Z3_ENGINE_FORMAT_SUMMARY.md`
   - Added V3 opcode/data-structure reference guide linked to The Lurking Horror `.z3` file mapping
   - Indexed new docs in `README.md`

4. [done] Analyze ifvms.js architecture and core algorithms
   - Studied parser/runtime/disassembler/opcode pipeline from `ifvms.js` source
   - Documented opcode handler and VM execution patterns in `docs/IFVMS_ARCHITECTURE_ANALYSIS.md`
   - Identified patterns suitable for single-file Z3 implementation and explicitly scoped out JIT/Glk-heavy parts
   - Kept approach as reference-driven, not direct port

5. [done] Design Phase 1 implementation (Foundation)
   - Finalized parser, VM, text, I/O module boundaries for development-time structure
   - Defined Phase 1 opcode baseline grouped by execution concerns
   - Locked memory strategy (`storyImage` + guarded dynamic `ram`) and core helper APIs
   - Added architecture diagram and implementation sequence in `docs/PHASE1_FOUNDATION_DESIGN.md`
   - Indexed design doc in `README.md`

6. [done] Add local Quetzal persistence module (serverless save/load foundation)
   - Added `src/quetzal-storage.js` with IndexedDB slot storage (`storyId + slot`)
   - Added save listing/get/delete/clear operations and metadata handling
   - Added `.sav` export helper (download) and import helper (file upload to slot)
   - Documented integration workflow in `docs/QUETZAL_LOCAL_STORAGE.md`
   - Indexed new documentation in `README.md`

7. [done] Phase 1: Build Z3 file parser
   - Implemented parser in `src/parser.js` for Z3 header metadata extraction and validation
   - Added dictionary extraction/validation and bounds checks for core table regions
   - Added initial memory model (`storyImage`, writable `ram`, dynamic/static/high slices)
   - Added parser correctness tests in `tools/test-parser.js`
   - Verified tests pass against `The_Lurking_Horror_Infocom_Release_219_Serial_870912.z3`

## Pending Tasks

8. [pending] Phase 1: Implement Z-machine VM core
   - Create instruction decoder
   - Implement basic opcodes (arithmetic, logic, stack, memory)
   - Build call stack and variable management
   - Simple branching support
   - Unit tests for each opcode category

9. [pending] Phase 1: Create HTML/CSS UI framework
   - Single-file or minimal modular structure
   - Game text output window (scrollable)
   - Command input field with history
   - Status line display
   - Responsive design

10. [pending] Phase 1: Implement I/O system
   - Connect VM to UI (text output)
   - Command input and parsing
   - Game loop (read-execute-output cycle)
   - Buffer management

11. [pending] Phase 1: Integration test
   - Load The Lurking Horror Z3 file
   - Execute startup sequence
   - Display initial game state
   - Test basic command processing
   - Verify output matches expectations

12. [pending] Wire VM save/restore opcodes to Quetzal local persistence and UI controls
   - Connect VM Quetzal byte generation/restore to `src/quetzal-storage.js`
   - Add save slot UI actions (save/load/delete/export/import)
   - Add compatibility checks (story id/release/serial/checksum) before restore

## Refinements

nnn. [refine] None. Remove this when we get our first task in this section.

## Future Tasks

nnn. [future] None. Remove this when we get our first task in this section.
