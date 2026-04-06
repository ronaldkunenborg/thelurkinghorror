# Interpreter Extensions

This project adds a few interpreter-level conveniences on top of standard story behavior.

## Commands

- `$SOUND`
  - Toggles in-game sound playback on/off at interpreter level.
  - This controls whether `sound_effect` events from the story actually play audio.

- `$SOUNDSTATS`
  - Prints collected sound event diagnostics for the current session.
  - Output includes:
    - total sound events observed
    - effect codes observed
    - sound IDs observed
    - `volumeRaw` min/max and distinct values seen
  - Useful for validating volume ranges used by the story and checking whether expected sound IDs fire.

- `$VIEW <room-id|room-name>`
  - Debug-only safe room preview command.
  - Requires `$DEBUG` to be enabled first.
  - Supports either numeric room object id (example: `$VIEW 174`) or room name (example: `$VIEW Department of Alchemy`).
  - Shows the room preview, then waits for your next command keypress and restores the exact prior state.

- `$MAP`
  - Opens the spoiler-safe university overview map panel.

- `$CREDITS`
  - Opens the credits panel with game, adaptation, and asset attribution.

## HELP Note Extension

When the game emits the in-world computer HELP message containing:

- `LOGIN your-user-id`
- `PASSWORD your-password`

the interpreter appends this note:

- `Note: according to the manual, the login is 872325412 and the password is uhlersoth.`

This is intentionally keyed to the HELP message text itself (not room-state tracking), so it still appears even if in-game positioning/state changes.

## Sound Debug Output

When sound events are fired, the interpreter logs a debug line such as:

- `[SFX debug] id=10 effect=start sound=on mapped=... gain=... volumeRaw=... volumeSigned=... routine=... operands=...`

This line reflects all currently captured event fields from VM `sound_effect` handling.

## Sound Class Behavior

Interpreter playback now distinguishes between two sound classes:

- `sfx` (default)
  - Default loop behavior: **on** (continues until explicit `stop` or replacement by another `sfx` start).
- `music`
  - Default loop behavior: **off** unless explicitly configured with `loop: true`.

Catalog entries can opt into music behavior using:

- `class: "music"` (or `kind: "music"`, or `music: true`)

Replacement is class-aware:

- Starting a new `sfx` stops active `sfx` but leaves active `music` untouched.
- Starting new `music` replaces active `music`.

## Sound Asset Source

Blorb sound assets used by this project come from IF Archive:

- https://ifarchive.org/if-archive/infocom/media/sound/

Local project copy:

- `../data/TheLurkingHorror.blb`

Current runtime extraction target used by the interpreter mapping:

- `src/assets/soundfx/blorb/`
