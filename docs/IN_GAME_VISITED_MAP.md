# In-Game Visited Map

The in-game map is a progressive, player-facing map built from the calibrated `map-prototype-2` data and renderer. It replaces the earlier static `$MAP` overview with a visited-location map that reveals only what the current playthrough has earned.

## Runtime components

- `src/map-data.js`
  - Shared map model used by the prototype page, renderer, discovery tracker, and Node tests.
- `src/map-renderer.js`
  - Shared SVG renderer exposed as `window.LhMapRenderer`.
  - Supports `prototype` mode for `src/map-prototype-2.html` and `ingame` mode for `src/index.html`.
- `src/map-renderer.css`
  - Shared map SVG styling extracted from the prototype.
- `src/map-discovery.js`
  - Player-truth discovery tracker exposed as `window.LhMapDiscoveryTracker`.
  - Tracks visited rooms/nodes, visible known exits, confirmed traversed links, and the current map node.
- `src/io.js`
  - Wires room-status snapshots, command input, save/load, restart, and `$MAP` to map discovery.

## Discovery model

The tracker records player-visible truth rather than revealing the complete reference map:

- Entered rooms become visited.
- Clearly visible exits from a visited room become known links.
- Known links to unvisited destinations render as source-side stubs.
- Successful movement between two mapped nodes confirms a full traversed link.
- Puzzle links keep the dashed/puzzle style from the prototype/booklet map.
- The Infinite Corridor to Great Court one-way marker is preserved once that link is known.
- The visible south door from `Infinite Corridor [W3]` reveals a normal stub toward Great Court; the locked-door warning upgrades that known stub with the one-way marker without revealing the Great Court tile.
- Dream-only rooms from the starting-room paper (`place`/152, `basalt`/134, `platform`/21) are excluded from normal map discovery.

Repeated room IDs are resolved against the previous mapped node and movement command when possible. Reverse-only prototype links can still be discovered when the VM exposes or traverses the opposite direction.

## Fallback from VM state

Local save records may contain rich `mapDiscovery` metadata. Imported `.sav` files or older local saves may not.

When metadata is missing, the controller rebuilds a conservative visited map from VM room state:

- mapped room object IDs are scanned for VM object attribute `6`, which The Lurking Horror uses for visited rooms;
- the current restored room is added even if it was not otherwise detected;
- fallback links are inferred breadth-first from Computer Center (`65`) when two visited tiles have a single map link and the destination has no other fallback route yet.

This fallback restores useful visited-room context while avoiding full-world spoiler reconstruction.

## Save, load, restart, and export

- Local IndexedDB save records include optional `mapDiscovery` metadata.
- Exported `.sav` files remain pure Quetzal bytes for compatibility.
- Imported `.sav` files therefore do not carry `mapDiscovery`; they use the VM-state fallback above.
- Story `restart` resets interpreter-side map discovery and then observes the restarted current room.
- Experience settings may disable map UI availability, but discovery and save/load persistence continue independently.
- Experience settings also persist map display mode (`modal` or `inline`) and the inline map height ratio.

## In-game UI

The game map is rendered in the existing modal map sheet in `src/index.html`.

Controls and affordances:

- `$MAP` and the action-rail map button open the visited map when map UI is enabled for the current experience profile.
- The optional inline map mode renders a compact visited map above the terminal transcript while keeping the modal map available for full inspection.
- The inline map starts near one third of the terminal text area and can be resized with the horizontal drag handle between map and transcript.
- The title bar includes a floor-level selector synchronized with right-mouse vertical floor scrubbing.
- The legend includes clickable `Current location`; it focuses the player layer, pans the player marker into view, and plays a red ping.
- The legend also includes view toggles for building overlays and the tile grid.
- The main legend and tile-direction legend are independently drawable by the renderer.

## Verification

Relevant test coverage:

- `tools/test-map-prototype-2-layout.js`
  - Validates map-prototype-2 layout rules, especially vertical edge consistency.
- `tools/test-io-controller-output.js`
  - Covers `$MAP`, map availability gating, discovery tracking, the Great Court warning link, VM fallback, restart reset, and save/load metadata behavior.
- `tools/test-integration.js`
  - Runs real parser/VM/controller startup and command smoke tests.
- `tools/test-vm-core.js`
  - Covers core VM behavior, including restart signaling used by the controller.
