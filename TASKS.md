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

36. [done] Add a spoiler-safe university overview map (buildings only, no hints).
   - Added map asset `src/assets/gfx/maps/university_overview_map.jpg` from the provided data folder input.
   - Added a dedicated map overlay (`#map-sheet`) in `src/index.html` to display the spoiler-safe campus overview.
   - Added a side-action map icon button to open the same overlay directly for discoverability.
   - Added interpreter command `$MAP` in `src/io.js`, wired to open the overview map and confirm in output/status.
   - Added `$MAP` to the commands overview and added controller test coverage in `tools/test-io-controller-output.js`.

37. [done] Rework interpreter save/load UX around slot picker, destructive checks, and parity between buttons and `$SAVE/$LOAD`.
   - Added save/load slot picker overlay in `src/index.html` showing slot, location, score, moves, and save time.
   - Wired save/load buttons to open the slot picker instead of directly targeting slot `0`.
   - Updated `$SAVE` and `$LOAD` (without slot number) to open the same picker flow as button clicks.
   - Kept story-native `save`/`restore` opcode path unchanged at slot `0`.
   - Added destructive action confirmation rules in `src/io.js`:
     - load confirmation when selected slot has lower progress (or equal score with higher moves) than current state
     - save confirmation when overwriting occupied slot with better progress (or equal score with fewer moves)
   - Replaced browser-native confirmation dialog with a custom in-game confirmation panel (`src/index.html` + `src/modern.css`) using transparent panel styling and backdrop blur consistent with the existing UI.
   - Added a hard 5-slot limit (`0..4`) for interpreter saves/loads:
     - slot picker shows only five slots
     - `$SAVE n` / `$LOAD n` reject out-of-range slots
     - direct action handlers (`save/load/delete/export/import`) enforce the same slot-range guard
   - Added per-slot action controls in the slot picker for `export`, `import`, and `delete`, including:
     - delete confirmation for occupied slots
     - import overwrite confirmation for occupied slots
     - red danger-styled delete icon button in the existing game visual language
     - automatic slot-list refresh after successful import/delete/save while the slot panel is open
     - upgraded delete button to a clean inline SVG trash icon for consistent rendering
   - Added clear local-storage warning text in the slot picker: saves are local to this browser/device.
   - Updated left action-rail button order to: `load`, `save`, `map`, `preferences`, `help`.
   - Extended save metadata persistence in `src/quetzal-storage.js` to store `roomName`, `score`, and `moves`.
   - Added controller test coverage in `tools/test-io-controller-output.js` for picker routing and destructive confirmations.

38. [done] Add rare ambient horror disturbances around room-art transitions and idle play.
   - Added a dedicated horror-effect runtime in `src/index.html` with centralized probabilities, durations, cooldowns, and one-effect-at-a-time locking.
   - Implemented room-entry disturbances:
     - rare rune text flicker after room-art transition delay (~500ms)
     - optional art micro-jump glitch path kept mutually exclusive with rune flicker
   - Implemented idle disturbances:
     - rare UI glyph icon swap using new custom glyph assets
     - rare peripheral dim pulse (`#horror-vignette`) with short animation window
   - Added and wired an initial 8-glyph SVG set under `src/assets/gfx/glyphs/` matching ids from `docs/HORROR_GLYPH_SET_PLAN.md`.
   - Added debug controls in `src/io.js`:
     - `$HORROR ON|OFF`
     - `$HORROR NOW RUNES|ART|UI|DIM`
     - `$HORROR STATS`
   - Added mitigation guardrails:
     - suppresses horror effects during splash and modal/panel states (commands, slots, settings, map, confirm)
   - suppresses effects while command input is actively being typed
   - prevents overlap with other active horror effects and blood-splatter visibility
   - keeps runtime tuning values centralized for safe iteration

39. [done] Replace `$TELEPORT` with safe `$VIEW` preview flow and fix preview pause/restore ordering.
   - Replaced state-mutating teleport workflow with `$VIEW <room-id|room-name>` preview behavior.
   - Fixed ordering bug where preview could restore before pause messaging.
   - Added preview acknowledgement flow: any key/command now exits preview and returns to prior state.
   - Fixed scene restoration so side art always returns to the live room after leaving preview.
   - Updated command/docs wiring for `$VIEW` and removed stale `$TELEPORT` references.

40. [done] Add a credits panel with UI/action/command wiring and docs/tests coverage.
   - Added dedicated `#credits-sheet` overlay with grouped attribution sections and close action in `src/index.html`.
   - Added side-action `Credits` icon button and wired open/close + backdrop-click behavior.
   - Added interpreter command `$CREDITS` in `src/io.js`, including `onCreditsRequested` callback support and status/output messaging.
   - Updated command overview panel and command docs (`README.md`, `docs/INTERPRETER_EXTENSIONS.md`) to include `$CREDITS`.
   - Added controller regression coverage in `tools/test-io-controller-output.js` for callback/output/status behavior.

41. [done] Wire up all room images so every mapped location has a resolved artwork assignment.
   - Audited `ROOM_ART_BY_ID` against discovered room ids (`docs/LOCATION_MAP.md` inventory): all 71 rooms are mapped, with no missing or orphan room ids.
   - Removed room-name fallback resolution in `src/index.html`; room art is now resolved by room id mapping only.
   - Corrected `ROOM_ART_BY_ID[140]` to the existing asset (`temporary_lab_140.png`) and added one-time console diagnostics for any future unmapped room id.

42. [done] Create new art for the splash screen that shows the university in the blizzard with a transparant blob similar to the copyrighted art hovering over it (similar to the radome failed images).
   - Switched splash art to `src/assets/gfx/splash/splash-screen.png` while keeping `box-art.png` bundled for later reuse.
   - Reworked the splash into a portrait-focused full-height artwork layout with overlaid readable text/status messaging.
   - Removed the "Interactive Horror" kicker and styled the ready prompt ("Press any key to enter") as a distinct state.

43. [done] Implement a selection option for the various additions we made from "Classic Experience" to "Modern" with settings persistence and first-run onboarding.
   - Added persisted experience settings in `src/quetzal-storage.js` (`get/put/clearExperienceSettings`) separate from audio settings.
   - Added experience slider + option checkmarks in `src/index.html`/`src/modern.css` and synchronized profile/checkbox behavior for `Classic`, `Classic+`, `Enhanced`, and `Modern`.
   - Updated startup flow so first run shows experience onboarding before loading the bundled story; game load starts only after confirming selection.
   - Applied runtime toggles for music enablement, save-slot count (1 vs 5), horror extras (ambient + blood effects), and image visibility.
   - Added debug command support to clear the experience setting: `$DEBUG CLEAR EXPERIENCE`.

44. [done] Fix same-room darkness recovery so room artwork returns after light is restored (for example in Dead Storage).
   - Updated darkness recovery logic in `src/io.js` to clear stale dark-scene state when same-room heading evidence is seen without a pitch-black line.
   - Added controller regression coverage in `tools/test-io-controller-output.js` for same-room light recovery (`isDark` flips to `false`).
   - Added real-story integration coverage in `tools/test-integration.js` for same-room stale-dark recovery.
   - Verified test runs pass: `node app/tools/test-io-controller-output.js` and `node app/tools/test-integration.js`.

45. [done] Clarify destructive load confirmation wording when score is tied but move count is higher.
   - Updated `src/io.js` load confirmation messaging so equal-score/higher-moves cases use `possibly less progress` instead of `lower progress`.
   - Kept `lower progress` wording for strictly lower-score load targets.
   - Added regression coverage in `tools/test-io-controller-output.js` to assert the new equal-score/higher-moves wording.
   - Verified test run passes: `node app/tools/test-io-controller-output.js`.

46. [done] Return to splash flow after story `quit` so input can continue from a clean restart path.
   - Added `onStoryQuit` callback plumbing in `src/io.js` and trigger on VM quit halt.
   - Wired `src/index.html` quit handling to reopen splash, clear active overlays/effect timers, and reload bundled story startup flow.
   - Added regression coverage in `tools/test-io-controller-output.js` for quit callback invocation.
   - Verified test runs pass: `node tools/test-io-controller-output.js` and `node tools/test-integration.js`.

47. [done] Improve clarity of load/save/map action icons.
   - Redesigned `icon-load`, `icon-save`, and `icon-map` in `src/modern.css` to use clearer etched silhouettes while keeping the established scratch art style.
   - Kept existing action wiring and control layout unchanged (`src/index.html`), so this is a visual-only clarity improvement.

48. [done] Refine `docs/LOCATION_MAP.md` so routine-driven exits and puzzle-only transitions get cleaner player-facing edge labels (phase 1: booklet-derived labeling only).
   - Use booklet map pages `../data/booklet-page3.png` and `../data/booklet-page4.png` as the primary source for initial player-facing transition labels.
   - Focus first on locations already identified by the discovery script but still marked unresolved due to routine-based exit logic.
   - Include destinations like `Basalt Bowl` where access is not a simple compass move.
   - Rewrite labels in player language (for example `read paper`) rather than engine/property wording.
   - For this phase, exact trigger/condition validation is explicitly out of scope; mark labels as booklet-derived where uncertainty remains.

49. [done] Build a standalone map prototype page (no library) for rapid layout iteration before runtime integration.
   - Added and refined standalone prototype page at `src/map-prototype.html` with a fixed-position Section C SVG map for layout calibration.
   - Implemented direct interaction: left-mouse drag panning and mouse-wheel zooming with cursor-centered scaling.
   - Reworked the prototype to be model-driven from one map source (`layers` + `rooms` containing `room id`, `layer`, `x/y`, and `edges`) and added reference validation for unknown room/layer ids.
   - Kept this page independent from `src/index.html` so map iteration can continue without runtime coupling.

50. [done] Refine de prototype kaart tot deze volledig is.
   - Doorgevoerde calibratie in `src/map-prototype.html`: secties `B/C/D/F/E/U` geïntegreerd met stabiele room-IDs, directionele/puzzle/restricted edges en duidelijke section-frames.
   - Ruimtelijke herverdeling afgerond voor drukke clusters (o.a. `Brown`, `Steam Tunnels`, `Wet Tunnels`) inclusief specifieke uitlijningen zoals `39 -> 99 -> Wet Tunnel [Inset 1]`.
   - Layout gemaakt met deterministische room-positions (`DETERMINISTIC_ROOM_POSITIONS`) zodat handmatige room-tweaks niet meer onbedoeld verschuiven door chained transforms.
   - Repeated-name normalisatie doorgevoerd voor leesbaarheid (`Infinite Corridor [W1..W5]`, `Steam Tunnel [S1..S5]`, `Wet Tunnel [Inset ...]`, `Smith Street [W/E]`).
   - Layer- en section-uitlijning gefinaliseerd: dynamische layer-bounds volgen nu de kaartinhoud en houden section-frame marges links/rechts correct binnen de hoogtelagen.

## Pending Tasks

51. [pending] Add an in-game map of visited locations while adventuring.
   - Keep this feature independent from `docs/LOCATION_MAP.md`; docs are reference only, not runtime source-of-truth for in-game map behavior.
   - Use a player-truth discovery model: record rooms and transitions from actual successful play actions instead of precomputed full-world completeness.
   - Before UI implementation, determine structural map constraints:
     - how many vertical levels are present in the university map
     - what distinct area groupings should be modeled (for example main building, brown building/computer lab, temporary lab, and other separable clusters)
   - Booklet-pages 3/4 discovery pass completed:
     - vertical model baseline: 6 practical level bands (`L+2`, `L+1`, `L0`, `L-1`, `L-2`, `L-3`)
     - area model baseline: 9 groups (including separate `Wet Tunnels + Inner Lair` and special `Dream` inset)
     - full rationale and section diagrams documented in `docs/LOCATION_MAP.md`
   - Decide whether the in-game map should expose only visited rooms, visited rooms plus known links, or some other progressive reveal model.
   - The map should likely be isometric, and with different layers for height, and 8 directions for exits for each room.
   - The distinct areas should be distinct when showing the map: if you are in one integrated area, you don't see the other areas unless you've been there.
   - There is no need to make a map of the 3 areas you go to from the starting room when you read the paper, as it is "just a dream", very small, and accessible only once.
   - The in-game map needs space. Possibly on the right, but then we need to integrate the images more into the main text. Needs brainstorming.

52. [pending] implement hints-booklet foundation from `docs/BOOKLET_HINTS_IMPLEMENTATION_PLAN.md` (booklet pages 1-4).
   - Add initial booklet hints dataset scaffold (source-page + topic + tier fields)
   - Add interpreter command plumbing for `hints-booklet` / consultation entry flow (placeholder output acceptable for first step)
   - Add safe-location gating skeleton and feature flag for consultation availability
   - Persist minimal interpreter-side consultation state (per-topic view count/tier baseline)
   - Keep booklet/hint handling separate from Task 43 experience mode: do not couple hint availability to classic/modern profile selection, and keep the spoiler-safe `$MAP` behavior independent.

