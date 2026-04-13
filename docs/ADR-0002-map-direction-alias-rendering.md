# ADR-0002: Map Direction Alias Rendering For Tunnel Entrance <-> Muddy Tunnel

- Status: Accepted
- Date: 2026-04-13
- Scope: `src/map-prototype-2.html` map edge rendering

## Context

The game engine exposes multiple command aliases for movement between:

- `Tunnel Entrance (34)`
- `Muddy Tunnel (39)`

Engine data includes both horizontal and vertical aliases for the same physical transition:

- `34 -> 39`: `west`, `enter`, `down`
- `39 -> 34`: `east`, `up`

For map presentation, this project follows the boxed hint booklet as canonical spatial guidance.
For this specific tunnel bend, showing vertical aliases for the same transition leads to a slanted/diagonal interpretation that we explicitly do not want in this map style.

## Decision

For the pair `34 <-> 39` only:

- suppress rendering of `up`/`down` aliases on the map
- render only horizontal aliases (`east`/`west`)

Rationale:

- follow booklet interpretation for this bend
- avoid drawing diagonal/slanted connectors in this case

All other locations keep normal engine-alias rendering behavior.

For Wet Tunnel rendering:

- `up`/`down` transitions are rendered as curved loops only for:
  - `wet2`, `wet3`, `wet4`, `wet6`, `wet7`, `wet8`, `wet9`, `wet10`, `wet11`
- `wet_lair_link` is excluded from curved-loop rendering for `up/down` because it is treated as a distinct cross-level connector.
- Two explicit exceptions are rendered as straight vertical lines:
  - `wet1` (`Wet Tunnel [Inset 1]`, tile `B8`) `up` is straight (no curve).
  - `wet5` (`Wet Tunnel [Inset 5]`, tile `B4`) `down` is straight (no curve).

For Dream-area rendering:

- `place`, `basalt`, and `platform` are intentionally hidden from the map view.
- Reason: this area is non-physical/non-cartographic in gameplay terms and should not be presented as a normal mapped level.

## Consequences

- The map better matches intended spatial reading for this local tunnel geometry.
- This is an explicit, narrow presentation override, not a global rule.
- Engine data remains unchanged; only visual rendering policy is overridden for one edge pair.
- Wet-tunnel vertical rendering intentionally mixes looped and straight styles to match booklet-guided readability at key anchors (`wet1`/`B8`, `wet5`/`B4`).
- Dream-area nodes remain in source data but are excluded from visual map rendering.
