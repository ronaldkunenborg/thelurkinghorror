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

8. [done] Phase 1: Implement Z-machine VM core
   - Added direct-interpreter VM core in `src/vm-core.js` with instruction decoding (`long`, `short`, `VAR`) and step/run loop
   - Implemented baseline opcode handlers for arithmetic/logic, stack/variable access, memory load/store, calls/returns, and simple branching
   - Implemented variable model (stack/local/global), call frame model, and routine call/return flow
   - Added VM unit tests in `tools/test-vm-core.js` covering decoder, arithmetic/logic, stack/variables, memory ops, branching, and call/return
   - Verified VM and parser tests pass (`node tools/test-vm-core.js`, `node tools/test-parser.js`)

9. [done] Phase 1: Create HTML/CSS UI framework
   - Added responsive single-page shell in `src/index.html` with output window, status line, and command input
   - Added `src/ui-framework.js` for output rendering, status updates, command submission, and history navigation (arrow keys)
   - Included mobile adjustments and accessible UI landmarks/labels for terminal interaction
   - Added bootstrap wiring so UI framework is ready for VM I/O integration

10. [done] Phase 1: Implement I/O system
   - Added `src/io.js` game I/O controller to connect UI command flow with VM execution loop
   - Extended VM core with I/O hooks, output emission, `sread` pause/resume flow, and command buffer/parse-buffer writes
   - Added story load paths in UI (bundled fetch and local file input) and wired run-until-input behavior
   - Added `tools/test-vm-io.js` to validate input request, command injection, parse-buffer writing, and resumed execution
   - Verified test suite passes (`node tools/test-vm-core.js`, `node tools/test-vm-io.js`, `node tools/test-parser.js`)

11. [done] Phase 1: Integration test
   - Added real-story integration smoke test in `tools/test-integration.js`
   - Verified startup path reaches input prompt using `The_Lurking_Horror_Infocom_Release_219_Serial_870912.z3`
   - Verified command cycle (`look`) resumes execution and returns to input wait state
   - Confirmed end-to-end parser + VM + I/O loop executes with current opcode subset
   - Verified full current test set passes (`node tools/test-vm-core.js`, `node tools/test-vm-io.js`, `node tools/test-parser.js`, `node tools/test-integration.js`)

12. [done] Bugfix opening room startup state
   - Corrected Z3 object table addressing in `src/vm-core.js` so object 1 resolves to the first object entry
   - Added `print_obj` and `remove_obj` opcode support needed by the correct startup flow
   - Added regression coverage in `tools/test-vm-core.js` and `tools/test-integration.js` for the Terminal Room opening text

15. [done] Auto-load bundled story with startup splash screen
   - Added bundled story asset loading on application startup with no separate bundled-load button
   - Added a dedicated splash overlay in `src/index.html` with loading and error states
   - Kept local file loading available from both the header and splash screen as a fallback

## Pending Tasks
 
13. [pending] Wire VM save/restore opcodes to Quetzal local persistence and UI controls
   - Connect VM Quetzal byte generation/restore to `src/quetzal-storage.js`
   - Add save slot UI actions (save/load/delete/export/import)
   - Add compatibility checks (story id/release/serial/checksum) before restore

14. [pending] I would like a map of visited locations that shows the locations you visited. Apparently the original package did contain a map of the buildings - we should provide that if we could. The map should be shown while adventuring.

16. [pending] An overview of possible commands should be available under a help-button.

17. [pending] Add splash-screen music support and wire it to `$SOUND`
   - Play the bundled music file from `data` while the splash screen is visible
   - Honor the interpreter `$SOUND` preference when deciding whether to play audio
   - Stop or fade the music when the splash screen is dismissed

## Refinements

nnn. [refine] None. Remove this when we get our first task in this section.

## Future Tasks

nnn. [future] None. Remove this when we get our first task in this section.
