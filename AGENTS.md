# Agent rules

## Coding rules

- Don’t assume anything. Don’t hide confusion. Surface tradeoffs.
- Minimum code that solves the problem. Nothing speculative.
- Touch only what you must. Clean up only your own mess.
- Define success criteria. Loop until verified.

## Project rules

- You work on Windows 11, from the Visual Studio Code extension for Codex.
- All explicit project rules from the user must be added to AGENTS.md by Codex, unless they can be easily deduced from the code, documentation or tasks.md.
- Before starting work, review `TASKS.md` to see what you already did, and still must do.
- On demand, move completed tasks to `TASKS_archived.md`. Preserve enough structured detail (using the existing archive format) so each archived task can be recreated from `README.md` and/or the codebase evidence. Omit tasks that are trivially verifiable by running the app/build/tests or by inspecting currently running code paths (for example environment-verification/bootstrap checks), unless the user explicitly asks to archive them.
- The intention for this project can be found in `INTENT.md` if present.
- If you create a script that supports part of this project, put it in the `tools` folder. Any scripts you use should be placed there and all scripts that are there will be used if possible before building new ones. A `TOOLS_MANIFEST.md` with descriptions of all generated tools is in that same folder, update it whenever you create new tools.
- Documentation (in markdown) will be placed in the `docs` folder, and indexed in the `README.md`. Those references must be Markdown hyperlinks.
- Document coding choices and the reason for making them in code comments if the reasoning cannot be inferred from the code itself.
- Document architecture decisions in an overall software architecture document or in ADR files under `docs`.

- Map-rendering exception: only for Tunnel Entrance (34) <-> Muddy Tunnel (39), suppress `up/down` edge rendering and keep only horizontal (`east/west`) rendering on the map.

- Please check https://github.com/historicalsource/lurkinghorror/blob/master/yuggoth.zil for game-code related questions first. The foldercontains the entire game source code.

## Git commit message format

- Always use real newlines in commit bodies.
- Never include literal `\n` in commit messages.
- Use multiple `-m` flags for multiline commits.
