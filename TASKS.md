# Task List

Completed tasks should be moved to ## Recent Completed Context.
Completed tasks that are no longer needed for day-to-day context have been moved to `TASKS_archived.md`.
Pending tasks are listed under ## Pending tasks with status [pending].
Optional or not-yet-fleshed-out ideas should be turned into normal pending tasks once they are concrete enough to execute.
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

13. [done] Auto-load bundled story with startup splash screen
   - Added bundled story asset loading on application startup with no separate bundled-load button
   - Added a dedicated splash overlay in `src/index.html` with loading and error states
   - Kept local file loading available from both the header and splash screen as a fallback

14. [done] Add `$SOUND` interpreter support and VM sound-event plumbing
   - Added VM support for `sound_effect` opcode event emission
   - Wired sound events into the game I/O controller and honored `$SOUND` on/off preference before playback
   - Added browser audio playback scaffolding with sound-id mapping support for story-triggered effects
   - Added automated tests for VM sound-event emission and I/O `$SOUND` behavior

15. [done] Integrate original The Lurking Horror sound samples into the `$SOUND` pipeline
   - Added reusable ADF tooling in `tools/adf_tool.py` to list/extract Amiga disk images
   - Extracted original audio assets from `original_source/Lurking Horror, The - Release 219 (1987)(Infocom)[cr][serial 870912].adf`
   - Added conversion utility `tools/convert_amiga_sound_dat.py` and generated browser-playable WAV files in `../data/soundfx/lurkinghorror`
   - Wired default sound-id to file mapping in `src/io.js` for in-game `sound_effect` playback
   - Verified existing automated test suite still passes

16. [done] Add splash-screen music support with attribution
   - Added splash music playback while the splash overlay is visible
   - Added fade-out and stop behavior when dismissing the splash screen
   - Added visible music attribution on splash (`Whirlguy`, CC BY-ND 3.0, Newgrounds)
   - Copied splash music asset to `src/assets/audio/splash-horror-whirlguy.mp3` and wired `src/index.html` to use it

17. [done] Add white pen on black wax drawings for locations. Style the terminal so it is text on top of the drawing and there is no real border anymore. Move game buttons to a bar on the side.
   - Added black scene background with room-art layers behind the terminal in `src/index.html`
   - Added room-driven artwork transition system (fade in/out on location change) with subtle random offset per room entry
   - Added `onRoomChanged` callback plumbing in `src/io.js` so room transitions can drive background artwork updates
   - Restyled terminal to centered translucent overlay and moved actions into a side action bar
   - Wired current available room art (`assets/gfx/lurkinghorror/terminal_room.png`) into the room-art map

18. [done] Gate sound and VM debug output behind `$DEBUG`, with debug off by default; support `$GAMESOUND`
   - Added interpreter-level `$DEBUG` toggle in `src/io.js` with default-off behavior for `[SFX debug]`, `[VM debug]`, and missing-sample notices
   - Kept `$SOUND` working and added `$GAMESOUND` as an alias for game-audio on/off control
   - Added regression coverage for debug gating and `$GAMESOUND` command handling in `tools/test-io-controller-output.js`

19. [done] Fix restart opcode crash after restart confirmation
   - Implemented Z-machine opcode `183` (`restart`) in `src/vm-core.js`
   - Restored original dynamic memory, cleared VM stacks/input state, and reset the PC to the story entrypoint on restart
   - Added VM restart regression coverage in `tools/test-vm-core.js`

20. [done] Make room artwork updates follow actual room state instead of fragile output heuristics
   - Added VM status snapshots in `src/vm-core.js` for current room object, score, and moves
   - Switched `src/io.js` room-tracking to use VM status snapshots so examining objects like the PC no longer clears room art
   - Added controller coverage for snapshot-driven room-change handling in `tools/test-io-controller-output.js`

21. [done] Display score and moves in the top bar
   - Added top-bar room/score/moves UI in `src/index.html`
   - Extended `src/ui-framework.js` with top-bar metadata updates
   - Wired `src/io.js` to push room, score, and move counts from VM status snapshots into the UI

22. [done] Add interpreter save/load commands, sidebar buttons, and a commands overview
   - Added interpreter-level local save commands in `src/io.js`: `$SAVE`, `$LOAD`, `$SAVES`, `$DELETE`, `$EXPORT`, `$IMPORT`
   - Wired VM snapshot serialization/restoration in `src/vm-core.js` and persisted those bytes through `src/quetzal-storage.js`
   - Added sidebar `Save`, `Load`, and `Commands` buttons plus a command overview sheet in `src/index.html`
   - Added command-paste support in `src/ui-framework.js` and regression coverage in `tools/test-vm-core.js` and `tools/test-io-controller-output.js`

23. [done] Add a horizontal volume slider for the game music and another for the sound effects to the sidebar buttons.
   - Added sidebar range sliders for game music and sound effects in `src/index.html`
   - Added slider styling in `src/modern.css`
   - Extended `src/io.js` with separate SFX/music volume multipliers and active-audio refresh logic
   - Added regression coverage for SFX/music volume scaling in `tools/test-io-controller-output.js`

24. [done] Wire VM save/restore opcodes to Quetzal local persistence and UI controls
   - Added VM-level `save`/`restore` opcode pausing and branch-aware continuation handling in `src/vm-core.js`
   - Added controller-side async slot persistence for story-level save/restore using the existing Quetzal storage path in `src/io.js`
   - Story `save`/`restore` now uses the default local slot `0`, while compatibility checks remain enforced before restore
   - Added VM and controller regression coverage in `tools/test-vm-core.js` and `tools/test-io-controller-output.js`

25. [done] Replace the buttons with icons: a gear icon that opens a dialog where you can set volume for game music and sound effects, load/save icons where you can load and save the game (wired to the text inputs for that). The commands button should have a "?"-type icon. I probably have to create an icon set but you can generate a number of placeholders first. The style is scratch art, white lines on black wax paper.
   - Replaced the sidebar text buttons with an icon rail in `src/index.html`
   - Added placeholder scratch-style etched icons and icon-rail styling in `src/modern.css`
   - Moved volume controls into a gear-driven settings dialog in `src/index.html` and `src/modern.css`
   - Preserved existing handlers for load local file, save, load, and commands under the new icon UI

26. [done] Create a location map for the documentation in Mermaid format, covering all reachable locations in The Lurking Horror.
   - Added generated first-pass map document in `docs/LOCATION_MAP.md`, linked from `README.md`
   - Added engine-backed discovery script `tools/discover_location_map.js` plus generated inventory in `tools/location-map-discovery.json`
   - Verified room encoding through the story object model and current-room VM status snapshot before generating links
   - Combined dynamic command validation from opening-state exploration with direct room-exit property decoding for the first-pass Mermaid graph
   - Left routine-driven and puzzle-only access paths explicitly listed as unresolved follow-up work instead of hiding them
   - Canonical boxed-map reference is now the local PDF `../data/lurking.pdf`; the Mermaid map should be treated as a reconciled working map against that source

27. [done] Reconcile `docs/LOCATION_MAP.md` with the canonical boxed map in `../data/lurking.pdf`.
   - Elevated the boxed-map PDF and extracted booklet map pages to explicit canonical source status in `docs/LOCATION_MAP.md`
   - Added section-by-section reconciliation notes for the upper campus/building page and the lower underground/special-area page
   - Recorded the current known mismatches, especially repeated room-name disambiguation and the not-yet-reconciled Wet Tunnels numbering

28. [done] Add a direct reference path to the canonical boxed-map PDF in the documentation and decide how prominently it should be exposed.
   - Kept the canonical PDF linked from `README.md` and `docs/LOCATION_MAP.md`
   - Added direct links to the extracted booklet map pages alongside the PDF for faster local reference
   - Treated the PDF and booklet pages as reference material for documentation and map reconciliation

29. [done] Review the published location map for spoiler risk and decide whether to keep the full map, publish a reduced map, or publish a progressive/unlockable version.
   - Marked `docs/LOCATION_MAP.md` explicitly as the full spoiler-heavy technical/reference version
   - Chose not to weaken the reference doc for player-facing spoiler concerns
   - Deferred any spoiler-safe or progressive presentation to a future separate artifact, such as the in-game visited map

30. [done] make the volume settings persistent in the local database of the browser. If there are no settings yet, use the current defaults.
   - Added IndexedDB-backed interpreter settings storage in `src/quetzal-storage.js` (`InterpreterSettingsStorage`, `interpreter_settings` store)
   - Wired `src/index.html` to load persisted `gameMusicVolume` and `sfxVolume` on startup and fall back to current defaults when no record exists
   - Wired slider input handlers to persist settings after each change

31. [done] when loading using "restore" the music stops playing. The load is now affecting the sound and music differently than it used to do since there never was game music.
   - Changed restore/load audio pre-step in `src/io.js` to stop active sound effects while allowing music to continue
   - Added restore-transition handling so if restored execution immediately starts an SFX, current music and prior SFX are stopped and restored SFX starts
   - Kept music state out of save payloads (VM save format remains unchanged)
   - Added regression coverage in `tools/test-io-controller-output.js` for `$LOAD` SFX-only stop behavior and restore-triggered SFX takeover of music

32. [done] the volume dialog is modal and everything else turns invisible. I want the dialog to be positioned not too far below the gear icon, with the gear icon in the horizontal middle of the dialog. The dialog should blur everything below it and perhaps in a radius around the edges (5px to start with).
   - Reworked settings sheet layout in `src/modern.css` to remove full-screen dark modal treatment
   - Anchored dialog positioning in `src/index.html` to the gear button center with responsive clamping and live reposition on resize
   - Added a 5px backdrop blur treatment focused below/around the popup area so the game remains visible behind the panel

33. [done] Improve the splash-screen with the original picture from the box you can find in the data directory (splash-screen.png)
   - Copied the original box art into `src/assets/gfx/splash/box-art.png` for in-app bundling
   - Reworked the splash into a larger cinematic split layout (art panel + content panel) in `src/index.html` and `src/modern.css`
   - Added atmospheric gradients, framing, and subtle artwork drift animation while preserving existing startup flow and music behavior
   - Removed the splash note text for a cleaner and more focused opening presentation

34. [done] Create a list of notable locations with decent descriptive text, with title and description, so we can make images for those.
   - Added `docs/LOCATION_IMAGE_BRIEFS.md` with 20 notable locations, each with an image-focused title and descriptive visual brief
   - Grouped repeated-location families (for example `Infinite Corridor`, `Steam Tunnel`, and `Wet Tunnel`) into coherent shared art directions
   - Indexed the new brief document in `README.md` under the documentation list

35. [done] Make the action panel and terminal transparent, but blur everything behind it, then build a "blood spatter" effect that will, once in a while, show a random blood spatter on the background. Not very often and not all the time. Make it so that when debugging you can start this effect and it shows a random bloodsplatter unless you choose one (1-5).
   - Added blood assets under `src/assets/gfx/blood/`: `bloodsplatter_small_1.png`, `bloodsplatter_small_2.png`, `bloodsplatter_mediumlarge.png`, `bloodsplatter_large.png`, `bloodsplatter_double.png`
   - Implementation plan:
     1. Make side action panel and terminal stack more transparent and apply backdrop blur so scene art remains visible underneath
     2. Add a dedicated blood-splatter overlay element in the scene pane with CSS fade behavior
     3. Implement timed blood effect runtime logic in `src/index.html`:
        - random splatter selection, random placement/rotation/scale
        - low-frequency schedule (roughly every 30-75 seconds while enabled)
        - auto-hide after a short visible window
     4. Add debug-only interpreter controls in `src/io.js` to drive the effect:
        - `$BLOOD ON|RANDOM`
        - `$BLOOD OFF`
        - `$BLOOD NOW`
        - `$BLOOD 1`..`$BLOOD 5` for fixed splatter selection
     5. Wire controller callback (`onBloodEffectCommand`) from `GameIoController` to UI runtime handler
   - Executed:
     - Updated transparency/blur treatment in `src/modern.css` for `.side-actions` and `.terminal-stack`
     - Added `#blood-splatter` overlay in `src/index.html` scene pane
     - Added blood effect scheduler and renderer in `src/index.html`
     - Added `$BLOOD` debug command handling and callback support in `src/io.js`

## Pending Tasks

36. [pending] First pickup: implement booklet-hints foundation from `docs/BOOKLET_HINTS_IMPLEMENTATION_PLAN.md` (booklet pages 1-4).
   - Add initial booklet hints dataset scaffold (source-page + topic + tier fields)
   - Add interpreter command plumbing for `booklet` / consultation entry flow (placeholder output acceptable for first step)
   - Add safe-location gating skeleton and feature flag for consultation availability
   - Persist minimal interpreter-side consultation state (per-topic view count/tier baseline)

37. [pending] Refine `docs/LOCATION_MAP.md` so routine-driven exits and puzzle-only transitions get cleaner player-facing edge labels (phase 1: booklet-derived labeling only).
   - Use booklet map pages `../data/booklet-page3.png` and `../data/booklet-page4.png` as the primary source for initial player-facing transition labels.
   - Focus first on locations already identified by the discovery script but still marked unresolved due to routine-based exit logic.
   - Include destinations like `Basalt Bowl` where access is not a simple compass move.
   - Rewrite labels in player language (for example `read paper`) rather than engine/property wording.
   - For this phase, exact trigger/condition validation is explicitly out of scope; mark labels as booklet-derived where uncertainty remains.

38. [pending] Add an in-game map of visited locations while adventuring.
   - Track visited locations during play and show them in the live UI rather than only in documentation
   - Reuse or derive data from the location-map work where possible instead of maintaining a second unrelated map definition
   - Decide whether the in-game map should expose only visited rooms, visited rooms plus known links, or some other progressive reveal model

39. [pending] Add a spoiler-safe university overview map (buildings only, no hints).
   - Purpose: provide orientation so players do not need to consult hint-heavy booklet content just to understand campus layout.
   - Scope:
     - show only high-level campus/building overview
     - no puzzle clues, no route solutions, no annotation hints
     - keep it visually distinct from the hint-booklet flow
   - Access options to evaluate:
     1. interpreter command `$MAP`
     2. dedicated UI button (for fast discoverability)
     3. both command + button (recommended): command for parser-driven users, button for discoverability
   - First implementation should include option 3 unless UX constraints suggest otherwise.
