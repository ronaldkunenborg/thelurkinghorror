# The Lurking Horror Map Locations (Prototype-Synced)

This file is the quick-reference bridge between the room-location documentation and the live prototype map pages.

## Source of truth

- Canonical reference document: [`LOCATION_MAP.md`](./LOCATION_MAP.md)
- Primary prototype (current calibrated integrated map): [`../src/map-prototype.html`](../src/map-prototype.html)
- Second prototype track (building-first/isometric experiments): [`../src/map-prototype-2.html`](../src/map-prototype-2.html)

## Synchronization status

Last synchronized against prototype content on: `2026-04-10`.

Synchronized conventions:

- All known location IDs are rendered in prototype room labels as `[id]`.
- Repeated room names are disambiguated in prototype view labels:
  - `Infinite Corridor [W1..W5]`
  - `Steam Tunnel [S1..S5]`
  - `Wet Tunnel [Inset 1..11]` + `Wet Tunnel [Outer]`
  - `Smith Street [W]` and `Smith Street [E]`
- Puzzle/restricted paths are visually distinct in prototypes (line style), while direction labels remain explicit.

## Area-group baseline (for prototype 2)

Derived from the existing university overview map (`src/assets/gfx/maps/university_overview_map.jpg`) and current map reconciliation:

1. Main Interior Stack
2. Infinite Corridor Spine
3. Great Dome Vertical Chain
4. Computer Center / Temporary Lab Complex
5. Brown Building / Chemistry-Alchemy Wing
6. Aero / Engineering Branch
7. Steam + Utility Tunnel Network
8. Wet Tunnels + Inner Lair
9. Dream Inset

