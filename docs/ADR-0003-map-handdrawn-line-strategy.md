# ADR-0003: Map Hand-Drawn Line Strategy For Blueprint-Like Tiles

- Status: Proposed
- Date: 2026-04-17
- Scope: `src/map-prototype-2.html` tile contour rendering style

## Context

Task 55 refinement introduced a darker semi-wireframe visual direction for map prototype 2.
During styling iterations, we tested an SVG filter approach (`feTurbulence` + `feDisplacementMap`) to make tile contours feel less digital.

Observed result:

- filter-based wobble is visible, but can quickly look too "boiling"/noisy when frequency is high
- this differs from the desired blueprint-like hand-drawn look in reference art
- the desired look is closer to layered pen strokes and controlled hatching than to continuous pixel displacement

Research summary (2026-04-17):

- Rough.js documents that sketch feel comes from roughness/bowing and especially multi-stroke behavior (double/stacked strokes by default, with an option to disable that behavior).
- SVG `feDisplacementMap` is explicitly a spatial pixel displacement primitive driven by a noise field, which explains the unstable/ripple-like line behavior at higher frequencies/scales.
- Practical SVG styling guidance and visual examples align with "multiple near-overlapping strokes + restrained texture/hatching" for hand-drawn line quality.

## Decision

For blueprint-like map tiles, prefer a geometry-first line strategy:

- primary technique: multiple contour strokes that are very close but not identical
- keep a deterministic jitter model (stable seed / per-room consistency) to avoid "animated boil" look
- use restrained hatching/cross-hatching for material tone
- keep displacement filter effects optional and subtle (fallback/accent only), not the main style driver

Current interim implementation remains acceptable as an experiment, but is not the target end state.
Implementation details are tracked as follow-up work in the task list.

## Consequences

- The map style should better match blueprint/ink expectations while preserving legibility.
- Rendering will rely more on explicit SVG geometry generation (slightly more CPU/DOM work per tile) and less on heavy visual filtering.
- Deterministic stroke layering reduces visual noise and gives consistent screenshots across sessions.

## Sources

- Rough.js homepage: https://roughjs.com/
- Rough.js API wiki (options including roughness, bowing, multi-stroke): https://github.com/rough-stuff/rough/wiki
- MDN `feDisplacementMap` reference: https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feDisplacementMap
- Hand-drawn SVG filter explanation ("boiling" behavior): https://camillovisini.com/coding/simulating-hand-drawn-motion-with-svg-filters
- Winkenbach & Salesin (1994), pen-and-ink reference: https://www.sci.utah.edu/~kpotter/Library/Papers/winkenbach%3A1994%3ACGPI/index.html
