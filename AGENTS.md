## Project rules
- You work on Windows 11, from the Visual Studio Code extension for Codex.
- All explicit project rules from the user must be added to AGENTS.md by Codex, unless they can be easily deduced from the code, documentation or tasks.md.
- Before starting work, review `TASKS.md` to see what you already did, and still must do.
- Once the 'TASKS.MD' has reached at least 20 tasks, move completed tasks to `TASKS_archived.md`.
- When moving tasks to `TASKS_archived.md`, preserve enough structured detail (using the existing archive format) so each archived task can be recreated from `README.md` and/or the codebase evidence. Omit tasks that are trivially verifiable by running the app/build/tests or by inspecting currently running code paths (for example environment-verification/bootstrap checks), unless the user explicitly asks to archive them.
- The intention for this project can be found in `INTENT.md` if present.
- If you create a script that supports part of this project, put it in the `tools` folder. Any scripts you use should be placed there and all scripts that are there will be used if possible before building new ones.
- documentation will be placed in the `docs` folder, indexed in the `README.md`
- architecture decisions will be documented in ADR files under `docs`.
- When documents are added under `docs` and referenced from `README.md`, those references must be Markdown hyperlinks.

## Git commit message format
- Always use real newlines in commit bodies.
- Never include literal `\n` in commit messages.
- Use multiple `-m` flags for multiline commits.
