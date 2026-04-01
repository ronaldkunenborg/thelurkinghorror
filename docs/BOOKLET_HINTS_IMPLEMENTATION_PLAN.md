# Booklet Hints Implementation Plan (Booklet 1-4)

## Goal

Make the booklet/map hints available in-game with a strong balance between:

- **availability** (players can get unstuck), and
- **intentional usage** (players do not keep it open as a constant walkthrough).

Source material for this plan is the local booklet pages:

- `../data/booklet-page1.png`
- `../data/booklet-page2.png`
- `../data/booklet-page3.png`
- `../data/booklet-page4.png`

These files are local reference assets and are not committed to git.

## Booklet Page Semantics (Refined)

Interpret the booklet pages as follows:

- **Page 1 (cover):**
  - Primarily presentational.
  - No gameplay hint value.
  - Do not use as a default in-game hint page.

- **Page 2 (yellow handwritten note):**
  - Flavor/context page; does not itself provide direct puzzle hints.
  - In the UI it should be shown as an **overlay layer** above the first map page.
  - Player can dismiss/close this overlay to reveal the map.

- **Page 3 (first practical map page):**
  - First meaningful map/hint-bearing page.
  - Should be the initial underlying page when opening booklet consultation.

- **Page 4 (second practical map page):**
  - Secondary map/hint-bearing page.
  - Available through normal page navigation.

## Design Principles

1. Hints are always reachable, but never frictionless.
2. Orientation and explicit puzzle hints are separate layers.
3. Hint strength escalates gradually (subtle -> stronger -> explicit).
4. The system should work with existing save/load flows without breaking VM save semantics.
5. Player agency stays central: hints are opt-in and deliberate.

## Behavior Model

### 1) Access Context (deliberate consultation)

Booklet consultation is allowed only in explicit contexts:

- at designated “safe” locations (first implementation target), or
- via a dedicated consultation action that carries a lightweight time/turn cost.

Recommended first implementation:

- Start with location-gated access (safe nodes).
- Add optional “consult anywhere with cost” only if playtesting shows too much friction.

### 2) Two Layers

- **Layer A: Map/Orientation**
  - Campus/area layout guidance, no direct puzzle answering.
- **Layer B: Annotations/Hints**
  - Actionable clues, gated behind an extra explicit action (`Study annotations`).

### 3) Hint Escalation

Per hint topic:

- Tier 1: subtle nudge
- Tier 2: clearer direction
- Tier 3: explicit action-level hint

Escalation rule:

- repeated consultation on same topic raises tier,
- but only one tier step per consultation.

### 4) Soft Anti-Spam Friction

Use one or more:

- “You spend a few minutes studying the booklet” text beat,
- small turn/move cost,
- one or two hint lines per consultation.

## Data Model

## A) Static booklet dataset

Create a structured local dataset derived from booklet pages:

- `id`
- `sourcePage` (`1..4`)
- `region/topic`
- optional room references (`roomIds`)
- `orientationText`
- `hintTier1`
- `hintTier2`
- `hintTier3`
- optional prerequisites (`requiredClues`, `requiredVisitedRooms`)

Recommended location:

- `app/src/data/booklet-hints.json` (or equivalent JS module).

## B) Runtime state

Track per play session / save context:

- topics viewed count
- tier reached per topic
- last consulted timestamp/move
- optional total consult count

State should live in interpreter-managed save metadata (not VM core story image), similar to other interpreter-side UX state.

## UX / Command Flow

### Entry points

- new command family (working names):
  - `hint-booklet`
  - `consult hint-booklet`
  - `study annotations`

### Discoverability via `help` / `hint`

To make the feature discoverable without encouraging constant usage:

- Track `help`/`hint` command usage count per session.
- On the **third** `help` or `hint` request in the same session, append a one-time nudge:
  - e.g. `You could also consult the hint-booklet (try: "hint-booklet" or "consult hint-booklet").`
- Do not spam this message on every help call; show once per session (or until restart/new session).
- This behavior is analogous to the existing interpreter-side contextual help augmentation pattern.

### Flow

1. Player enters consultation context.
2. Open booklet viewer on **page 3** (map layer), with **page 2 note overlay visible on top**.
3. Player dismisses the yellow note overlay to continue to map viewing.
4. Show Layer A orientation first (page-based).
5. Offer Layer B as explicit second step (`Study annotations`).
6. If Layer B chosen, show tier based on prior usage and prerequisites.
7. Apply friction and return to command prompt.

### Naming and command wording

- Use `hint-booklet` as the canonical player-facing term (not plain `booklet`).
- Support `consult hint-booklet` as an explicit synonym/long form.
- Keep naming consistent across:
  - command sheet,
  - help/hint discovery nudge,
  - any in-game UI labels.

### Overlay Behavior (yellow note)

- Overlay appears at booklet-open by default (above page 3).
- Overlay is dismissible with explicit action (`Close note`, `Continue`, or click/tap equivalent).
- After dismissal, page 3 remains active in view.
- Overlay content is non-hint flavor/context and should not escalate hint tiers.
- Recommended implementation detail:
  - Track `noteSeenThisOpen` state for the current booklet-open session.
  - Optional future toggle: persist “don’t auto-show note again this session” if UX testing suggests repetition fatigue.

## Integration Plan (Phased)

### Phase 1 - Foundation (first task)

- Define structured booklet hint data model.
- Add initial parser/loader for booklet hints dataset.
- Add minimal command plumbing (`hint-booklet` / `consult hint-booklet`) returning placeholder response.
- Add safe-location gate skeleton (feature-flagged).
- Add booklet page-role metadata (`cover`, `noteOverlay`, `mapPrimary`, `mapSecondary`) and initialize viewer on map primary with note overlay.
- Add session counter scaffolding for `help`/`hint` and one-time third-call booklet discovery nudge.

### Phase 2 - Core behavior

- Implement layer split (orientation vs annotations).
- Implement tier progression logic.
- Implement per-topic consultation counters.
- Implement one-turn/soft-cost feedback copy.

### Phase 3 - Content wiring

- Populate first subset from booklet pages 1-4 (priority topics only).
- Map topics to room IDs / region tags.
- Add prerequisites where needed.

### Phase 4 - Polish and balancing

- Tune friction (line count, cost, cadence).
- Adjust tier wording based on playtesting.
- Add debug command(s) for testing tier state.

## Acceptance Criteria

1. Players can consult booklet in-game without leaving flow.
2. Consultation is intentional, not permanently-on overlay behavior.
3. Orientation text is available before explicit hints.
4. Repeated use escalates hint strength by tier.
5. System state survives interpreter save/load roundtrips.
6. No VM save format changes required.

## Risks and Mitigations

- **Risk:** too generous hints trivialize puzzles.  
  **Mitigation:** keep Tier 1 conservative and gate stronger tiers.

- **Risk:** too much friction makes hints annoying.  
  **Mitigation:** start with light friction, then tune via playtesting.

- **Risk:** content extraction from booklet pages is noisy.  
  **Mitigation:** seed with curated manual subset first, expand incrementally.
