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

55. [done] Rebuild campus-road rendering in `src/map-prototype-2.html` to match the blueprint-road reference style.
   - Replaced flat road rendering with layered SVG road passes (base fill, texture/grain overlays, and optional vector edge/centerline components).
   - Added deterministic per-road texture mapping with seeded phase offsets so redraws remain stable.
   - Integrated external texture workflow using `src/assets/gfx/maps/texture_road_3.png` as active source and tuned projection/crop scaling for map roads.
   - Added depth-aware road opacity attenuation so roads remain readable without overpowering lower-layer room tiles during floor scrubbing.
   - Implemented overlap-aware junction blending for `Smith Street` x `Mass. Ave.` to reduce hard overpaint dominance at crossings.
   - Added slight road extension + distance fade mask so road ends recede more naturally instead of ending abruptly.
   - Iterated and validated texture behavior with dynamic floor-focus movement to keep texture anchored during up/down scrub.

56. [done] Continue refining `src/map-prototype-2.html` layout until it is very close to the desired in-game map.
   - Added RMB floor scrubbing (vertical), tuned perspective handling, and stabilized layer motion during scrubbing.
   - Applied and finalized the semi-wireframe/cutaway profile (dark matte background, monochrome-first linework, restrained accents).
   - Locked focus mode to at most three visible layers (`X-1`, `X`, `X+1`) with consistent exploded spacing.
   - Finalized line hierarchy and adjusted detail/subtlety for readability at normal browser zoom.
   - Improved tile typography and dense-area ordering (title wrapping/projection, inline level/id placement).
   - Tuned active vs non-active layer contrast so active rooms remain dominant while adjacent layers stay readable.
   - Refined building/road/label z-order behavior across floor-focus states to avoid misleading overlap.

57. [done] Process `src/assets/audio/game-over-desmae-877160.mp3` as game-over music when the player dies.
   - Added the Newgrounds game-over track to the runtime sound catalog as music:
     - https://www.newgrounds.com/audio/listen/877160
   - Credited the track as audio by Desmae under CC BY-NC-ND 3.0:
     - https://creativecommons.org/licenses/by-nc-nd/3.0/
   - Detects the exact story death banner (`****  You have died  ****`) so ordinary room names such as `Dead Storage` do not trigger it.
   - Stops active controller-managed audio before game-over playback, respects game-music enablement and volume settings, and stops cleanly on restart/restore/quit/load flows.
   - If splash music is still playing at death, fades it out over 2 seconds before starting the game-over music.
   - Shows `src/assets/gfx/lurkinghorror/game_over.png` in the scene pane on the same death event:
     - fades out the old scene over 2 seconds alongside any remaining splash music
     - then starts game-over music and fades in the game-over artwork over 2 seconds
   - Added controller regression coverage for death detection, false-positive avoidance, delayed start after external fade, and stop behavior.

58. [done] Build a parameter-controlled 3D wireframe composition tool for game-development map/building art, with SVG export for verification.
   - Added the command-driven core in `tools/wireframe3d-core.js` and CLI runner in `tools/wireframe3d-cli.js`.
   - Supports the required primitive set: `cube`, `rectangle`, `cylinder`, `parallelogram`, and `globe` with partial globe segment parameters.
   - Supports the command flow: `create_scene`, `add_primitive`, `update_primitive`, `delete_primitive`, `transform_primitive`, `set_style`, `set_camera`, `rotate_scene`, and `export_svg`.
   - Added sample and Computer Center command presets under `asset-sources/wireframe3d/commands/`, with generated scene/SVG verification artifacts under `asset-sources/wireframe3d/scenes/` and `asset-sources/wireframe3d/svg/`.
   - Added usage docs in `docs/WIREFRAME_3D_TOOL.md` and command validation schema in `docs/wireframe3d-command.schema.json`.
   - Added `tools/test-wireframe3d.js` coverage; verified `node tools/test-wireframe3d.js` passes.

59. [done] Add snow as effect to the map-prototype-2.html and to the game itself. They are similar but not quite equal effects.
   - Added shared canvas snow engine in `src/map-snow-layer.js` with wind gusts, variable fall speed, side-buffer spawning, density multiplier support, active-area support, and rendering profile switching.
   - Added foreground snow to `src/map-prototype-2.html`, including temporary weather controls and a density slider from baseline to `10x` for tuning.
   - Optimized high-density snow so the `10x` control uses a perceptual mix of particle count, size, alpha, and foreground bias instead of literal 10x particle load.
   - Fixed wind-aware spawning so new flakes entering from the side already reflect current wind behavior instead of appearing as a vertical edge curtain.
   - Added ambient game snow behind the main UI in `src/index.html`, using the shared engine rather than a second implementation.
   - Added a layered composition model in `src/index.html`/`src/modern.css`: full-screen snow, opaque UI masks, horror/blood layer, then transparent UI/scene layer, preserving horror transparency while hiding snow under text UI.
   - Added experience settings integration:
     - Classic and Classic+ disable snow
     - Enhanced enables light indoor snow (`1.75`)
     - Modern enables current indoor snow (`3.5`)
     - independent `Snow enabled` checkbox toggles snow on/off without restarting music
   - Added outdoor storm behavior for room ids `16`, `98`, `121`, `127`, `145`, `180`, `185`, `190`, and `222`:
     - outdoor profile uses higher density/caps than indoor
     - Enhanced outdoor multiplier is `6`
     - Modern outdoor multiplier is `10`
   - Documented the snow profile API in `src/map-snow-layer.js` and the experience-vs-room layering policy near the game snow profiles.
   - Made game snow disable use the same ramp-down behavior as the map: existing flakes drift out instead of clearing abruptly.
   - Made `GameIoController.setGameMusicEnabled()` idempotent so unrelated settings re-application does not restart music.

60. [done] Redo the Brown Building overlay with our wireframe3d tool then create a new image using our custom GPT and imagegen.
   - Added a Brown Building wireframe3d preset at `asset-sources/wireframe3d/commands/wireframe3d-brown-building.commands.json`.
   - Generated verification artifacts at `asset-sources/wireframe3d/scenes/brown-building.scene.json`, `asset-sources/wireframe3d/svg/brown-building.svg`, and `asset-sources/wireframe3d/svg/brown-building-partial.svg`.
   - Modeled the Brown Building as an 18-floor square 1970s concrete tower with a recessed front window grid, blinder panelized side facade, front exit, roof equipment, antenna masts, and meteorological radome.
   - Replaced/refined `src/assets/gfx/maps/brown_building_overlay.png` from the new overlay workflow.
   - Updated `drawBrownBuildingIllustration()` in `src/map-prototype-2.html` for the new overlay aspect ratio and added tile-fraction tuning via `overlayTileOffsetE/S`.
   - multiplied Brown Building size by 2 because it's much bigger than central building.

61. [done] Redo the map prototype 2 legend.
   - Replaced the old generic building legend with building-specific PNG thumbnails and labels for Central Complex, Brown Building, Computer Center, and Temporary Lab.
   - Kept the street/road legend item as a road swatch.
   - Added a legend checkbox that toggles building overlay art and outline overlays on/off without affecting floor tiles or roads.
   - Reworked the legend into a narrower vertical list, brightened building thumbnails/labels for readability, and added the red player-character marker as the Current location item.
   - Added `src/assets/gfx/maps/playercharacter.png` to `src/map-prototype-2.html` at Terminal Room (176), including a clickable Current location legend row that switches to the player layer, pans the marker into view when needed, and plays a red ping animation.

62. [done] Rework map tile linework toward blueprint-like hand-drawn contours (Task 56 style follow-up).
   - Replaced filter-dominant tile wobble with geometry-first deterministic SVG contour paths in `src/map-prototype-2.html`.
   - Kept per-room/per-tile seeded jitter so linework stays stable between redraws, layer changes, and focus changes.
   - Used two deterministic SVG contour families based on the generated references: main family from row 1 / tile 2, and a rougher subvariant B from row 1 / tile 5 or row 2 / tile 3.
   - Implemented `tileSketchProfile()` to assign main vs. rough-B contour families deterministically per room/tile.
   - Added sparse fine parallel brush-hair strokes along tile sides, with two deterministic strokes per tile placed just inside or outside the contour.
   - Removed the old front rim/depth rectangle from room tiles so the blueprint tiles read as flat 2D shapes.
   - Tuned focus contour hierarchy to two full contour passes, a 2px-equivalent main stroke, visible 0.86px brush-hair strokes, and slightly increased focus jitter so focused tiles stay strong without looking overly regular.
   - Research + rationale documented in `docs/ADR-0003-map-handdrawn-line-strategy.md`.

63. [done] Add an in-game map of visited locations while adventuring.
   - Plan:
      - Use a shared global `window.LhMapRenderer` in `src/map-renderer.js` so `map-prototype-2.html` remains a fully working prototype/debug page and the game can use the same renderer directly.
      - Implement in phases: first extract the renderer without behavior changes, then add in-game discovery/reveal state, then wire save/load persistence and the `$MAP` modal.
      - Render the in-game map in the existing modal overlay, not in an iframe and not in the right-side room-art pane.
      - Use a player-truth discovery model: record rooms, visible exits, and transitions from actual successful play actions instead of precomputed full-world completeness.
      - Ignore the three one-shot dream locations from the starting-room paper (`place`/152, `basalt`/134, `platform`/21).
      - Keep building outlines/overlays visible from the start.
      - Reveal visited rooms and known links only:
         - visible exits from a visited room become known links, drawn from the source side;
         - targets remain hidden until visited;
         - successful traversals confirm full links;
         - puzzle links use dashed lines;
         - the one-way bar for Infinite Corridor -> Great Court appears only after that traversal is known.
      - Persist discovery in local IndexedDB save-slot metadata via an optional `mapDiscovery` field.
      - Keep `.sav` export/import pure Quetzal for compatibility; imported saves without metadata rebuild visited rooms from the VM room-visited attribute when possible, then continue discovery from the restored current room.
   - Implementation progress:
      - Extracted the prototype map renderer into `src/map-renderer.js` and changed `src/map-prototype-2.html` to initialize it in prototype mode.
      - Added `src/map-discovery.js` with deterministic player-truth discovery tracking for visited rooms, visible exits, traversed links, duplicate room ids, and dream-room exclusion.
      - Added in-game renderer mode for visited-only rooms, known-link stubs, traversed full links, current player marker placement, and prototype-free control defaults.
      - Added reverse-edge discovery/rendering so one-sided prototype links can still reveal correctly when the engine exposes or traverses the opposite direction.
      - Replaced the static `$MAP` modal image in `src/index.html` with the shared renderer and wired discovery updates from `GameIoController`.
      - Persisted optional `mapDiscovery` metadata in local IndexedDB save records while keeping `.sav` export/import pure Quetzal.
      - Added explicit renderer support for drawing the main legend and tile-direction legend independently, and enabled both legend parts on the in-game map.
      - Enlarged the game map modal with viewport-aware width/height constraints and a smaller mobile layout.
      - Added a metadata fallback for older/imported saves: scan mapped room object IDs for VM attribute `6` and restore visited rooms before normal map discovery resumes.
      - Extended the metadata fallback to infer drawable route links breadth-first from Computer Center (65) when two visited tiles have a single map link and the target tile has no other known route yet.
      - Enabled the prototype map's right-mouse floor scrub interaction on the in-game map by keeping an internal floor focus when no prototype floor select exists.
      - Added a floor-level select to the in-game map title bar and synchronized it with right-mouse floor scrubbing and Current location focus.
      - Added an in-legend `Show tile grid` toggle for the in-game map, defaulting off and using the same tile-grid overlay as the prototype map.
      - Stabilized in-game map state sync so save/load metadata updates no longer reset the selected floor/view when the current map node did not change.
      - Fixed current-location layer sync on node changes so loading into a different room updates the in-game floor focus before drawing that room tile.
      - Reset map discovery after a story `restart` opcode so visited-map state does not survive a restarted playthrough.
      - Added map availability as an experience setting while keeping map discovery save/load data independent from whether the map UI is enabled.
      - Documented runtime behavior, discovery rules, save/load fallback, UI controls, and verification in `docs/IN_GAME_VISITED_MAP.md`.

65. [done] Fix steam tunnel linkages! From tomb you end up in the wrong ID (or it is incorrect on the map).
   - Used the supplied test saves in `../data/test-saves/` to validate the real VM room IDs around the Tomb/Steam Tunnel transition.
   - Confirmed `in-steam.sav` starts in `Tomb (9)` and `down` reaches `Steam Tunnel (227)`.
   - Confirmed `tomb-to-steam.sav` starts in `Steam Tunnel (227)` and `up` returns to `Tomb (9)`.
   - Re-mapped the Steam Tunnel sequence in `src/map-prototype-2-data.js` to `34 -> 221 -> 227 -> 66 -> 78 -> 138`, so `steam2` is now the true Tomb-connected room.
   - Removed the incorrect puzzle styling from the ordinary `34 <-> 221` east/west connection.
   - Updated `docs/LOCATION_MAP.md` with the save-validated steam-chain notes.
   - Verified `node tools/test-map-prototype-2-layout.js` passes.

69. [done] Reveal Great Court one-way marker when the game warns about the locked night door.
   - Added warning-text detection in `src/io.js` for the locked-night-door message.
   - Added `MapDiscoveryTracker.recordKnownLink()` so story-learned links can be recorded without visiting the destination.
   - Kept the visible south-door stub as a normal known link, then upgraded it to one-way when the warning appears, while keeping the Great Court tile hidden until entry.
   - Updated the renderer so one-way bars also render on discovered link stubs, not only full traversed/revealed links.
   - Documented the behavior in `docs/IN_GAME_VISITED_MAP.md`.
   - Added regression coverage in `tools/test-io-controller-output.js`; verified `node tools/test-io-controller-output.js` and `node tools/test-map-prototype-2-layout.js` pass.

## Pending Tasks

66. [pending] Think about how to implement a mini-map or a continuous map displayed above the text. The current map could be "enhanced" and the minimap above the text (1/3 of the height of the screen) could be fully modern.

67. [pending] There should be achievements. Like "You brighten my day!" for finding the flaslight. Or getting killed in the dark ("something bumped you in the dark")

68. [pending] Review and clarify the save-file format.
   - Investigate whether exported `.sav` files should be pure Quetzal/IFZS, internal `TLHS` VM snapshots, or both with distinct extensions.
   - Reconcile current docs that describe exported saves as pure Quetzal with observed `TLHS` files in `../data/test-saves/`.
   - Decide whether import/export UX, file naming, compatibility checks, and docs need changes.

69. [pending] Discuss: show left items and items in a room on the map using icons or a different system? Showing them prevents the use of a notebook which we don't want any player to do in the modern version.

71. [pending] Create better icons with imagegen, instead of the current glyphs.

## Future Tasks

64. [future] Consider hints-booklet foundation from `docs/BOOKLET_HINTS_IMPLEMENTATION_PLAN.md` later.
   - Parked for now because the in-game visited-location map covers the immediate player-support need.
   - If revived later, likely scope includes booklet page 1-4 dataset scaffolding, `hints-booklet` command plumbing, safe-location gating, and minimal consultation state.

70. [pending] redo Fruits and Nuts picture, the stairway should go DOWN, not UP.
