# Asset Decisions

This document records visual/audio/font asset choices that affect the shipped game experience, especially when multiple source assets were considered.

## Victory Ending Assets

- Decision: play `743416_Game-over-victory.mp3` and show `game_over_victory.png` when the story victory text reaches `<FINISH>`.
- Runtime audio path: `src/assets/audio/743416_Game-over-victory.mp3`.
- Runtime visual path: `src/assets/gfx/lurkinghorror/game_over_victory.png`.
- Attribution source: <https://www.newgrounds.com/audio/listen/743416>.
- License: Creative Commons Attribution-NonCommercial-NoDerivs 3.0.

Rationale:

- The story VM exposes `<FINISH>` through the same quit opcode used by ordinary story quit, so the runtime detects the canonical victory text before the halt and preserves a dedicated completed-game screen instead of returning to splash.
- The victory music uses the same non-looping `music` sound class as game-over music so the existing music preference and volume controls apply consistently.

## Enochian Text Flicker Font

- Decision: use `Enochian-BGlG.woff2` for the horror text-flicker effect.
- Attribution: `Enochian` by Digital Type Foundry, published on FontSpace.
- Runtime asset path: `src/assets/fonts/Enochian-BGlG.woff2`.
- Source asset path: `asset-sources/fonts/Enochian-BGlG.woff2`.
- Comparison specimen: `asset-sources/fonts/enochian-font-specimen.html`.
- Alternative considered: `EnochianPlain-10GB.woff2`.

Rationale:

- At terminal size and `12pt`, `Enochian-BGlG` reads thinner and more scratchy.
- `EnochianPlain-10GB` reads clearer and slightly heavier at those sizes.
- Above `12pt`, the practical visual difference is minor.
- The thinner, scratchier `Enochian-BGlG` better matches the intended subtle horror interruption: an unstable, briefly glimpsed wrongness in otherwise normal terminal output.

Licensing note:

- Source package notes list the font as `Freeware, Non-Commercial`.
- The font metadata identifies Digital Type Foundry as the manufacturer.
- Source link: <https://www.fontspace.com/enochian-font-f6183>.
- Before any commercial or broadly distributed release, re-check whether this license is acceptable or replace the font with a custom/project-owned equivalent.
