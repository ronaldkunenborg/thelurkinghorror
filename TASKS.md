# Task List

Completed tasks should be moved to ## Recent Completed Context.
Completed tasks that are no longer needed for day-to-day context have been moved to `TASKS_archived.md`.
Pending tasks are listed under ## Pending tasks with status [pending].
Optional or not-yet-fleshed-out ideas should be turned into normal pending tasks once they are concrete enough to execute.
Ideas for expansion and new capabilities go under ## Future tasks with status [future]

## Recent Completed Context

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

51. [done] Synchronize map-locations documentation with the current prototype.
   - Integrated prototype-synced index content directly into `docs/LOCATION_MAP.md`.
   - Linked both prototype pages (`src/map-prototype.html`, `src/map-prototype-2.html`) from `docs/LOCATION_MAP.md`.
   - Captured synchronized naming/ID conventions and area-group baseline for the next prototype cycle.

52. [done] Update `README.md` with installation/start instructions and map prototype links.
   - Added a dedicated **Installation** section with `git clone` + direct browser-open workflow.
   - Added explicit links to prototype map v1/v2 and `docs/LOCATION_MAP.md`.
   - Kept documentation index aligned with `docs/LOCATION_MAP.md` as the single map reference document.

53. [done] Refine de prototype kaart verder in een tweede prototype.
   - Added `src/map-prototype-2.html` as a separate building-first prototype track.
   - Implemented isometric room cards (parallelogram geometry) and building-based clustering.
   - Added per-building local level bands/layer labels and a map legend for edge semantics.
   - Kept 8-direction edge labels visible and highlighted cross-building links for readability.

54. [done] Refine `src/map-prototype-2.html` layout until fully aligned with the campus map.
   - Shifted global room/building/road placement rightward to restore left-side map margin while keeping route readability stable.
   - Reworked Steam/Wet tunnel placement (including `steam2` under `tomb`) and aligned key vertical stacks (`39 -> 99 -> wet1`, `steam5 -> concrete_box`) to booklet-driven layout intent.
   - Added selective vertical-edge rendering rules: straight screen-vertical for generic up/down, Tunnel Entrance/Muddy exception (34<->39), and wet-tunnel loop/straight mixed exceptions.
   - Hid Dream-only rooms (`place`, `basalt`, `platform`) from map rendering while preserving source data.
   - Documented map-rendering decisions in `docs/ADR-0002-map-direction-alias-rendering.md` and linked ADR from `README.md`/`docs/LOCATION_MAP.md`.
   - Extracted shared map data into `src/map-prototype-2-data.js` for browser + Node reuse.
   - Added `tools/test-map-prototype-2-layout.js` to validate ROOM_LAYOUT + vertical edge reciprocity with only agreed wet-tunnel exceptions; test currently passes.

## Pending Tasks

55. [pending] Continue refining `src/map-prototype-2.html` layout until it is very close to the desired in-game map.

56. [pending] Add an in-game map of visited locations while adventuring.
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

57. [pending] implement hints-booklet foundation from `docs/BOOKLET_HINTS_IMPLEMENTATION_PLAN.md` (booklet pages 1-4).
   - Add initial booklet hints dataset scaffold (source-page + topic + tier fields)
   - Add interpreter command plumbing for `hints-booklet` / consultation entry flow (placeholder output acceptable for first step)
   - Add safe-location gating skeleton and feature flag for consultation availability
   - Persist minimal interpreter-side consultation state (per-topic view count/tier baseline)
   - Keep booklet/hint handling separate from Task 43 experience mode: do not couple hint availability to classic/modern profile selection, and keep the spoiler-safe `$MAP` behavior independent.
