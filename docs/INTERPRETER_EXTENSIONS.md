# Interpreter Extensions

This project adds a few interpreter-level conveniences on top of standard story behavior.

## Commands

- `$SOUND`
  - Toggles in-game sound playback on/off at interpreter level.
  - This controls whether `sound_effect` events from the story actually play audio.

- `$SFX <sound-effect-number>`
  - Triggers a synthetic `start` event for a specific The Lurking Horror sound effect ID.
  - Valid range is `1` to `18`.
  - Intended for quick audio verification without stepping to a story location that emits the effect naturally.

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
  - Opens the in-game visited-location map when the current experience profile enables map access.
  - Map discovery still runs and persists in save metadata even when map access is disabled.
  - Runtime design details: [`IN_GAME_VISITED_MAP.md`](IN_GAME_VISITED_MAP.md).

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
  - Default loop behavior: **off** unless explicitly configured or overridden by story-specific compatibility rules.
- `music`
  - Default loop behavior: **off** unless explicitly configured with `loop: true`.

Catalog entries can opt into music behavior using:

- `class: "music"` (or `kind: "music"`, or `music: true`)

Replacement is class-aware:

- Starting a new `sfx` stops active `sfx` but leaves active `music` untouched.
- Starting new `music` replaces active `music`.

## The Lurking Horror (Frotz Compatibility)

For `The Lurking Horror`, sound handling should follow Frotz `sound.c` behavior as the compatibility baseline:

- Source:
  - https://gitlab.com/DavidGriffith/frotz/-/blob/master/src/common/sound.c

- Effect codes:
  - `1` = prepare
  - `2` = play/start
  - `3` = stop
  - `4` = finish-with

- TLH-specific repeat handling (from `lh_repeats` in Frotz):
  - `3 -> 0x01`
  - `4 -> 0xff`
  - `6 -> 0x01`
  - `7 -> 0x01`
  - `8 -> 0x01`
  - `9 -> 0x01`
  - `10 -> 0xff`
  - `11 -> 0x01`
  - `12 -> 0x01`
  - `13 -> 0xff`
  - `15 -> 0xff`
  - `16 -> 0xff`
  - `17 -> 0xff`
  - `18 -> 0xff`
  - (`0x01` = one-shot, `0xff` = loop indefinitely)

- TLH queue rule for fast back-to-back effects:
  - Sound IDs `9` and `16` are delayed via `next_sample`/`next_volume`.
  - If a play request for `9` or `16` arrives while another sample is playing, it is queued to start after `end_of_sound`.
  - If a non-play effect arrives for `9`/`16`, Frotz does not queue it.

- Known TLH sample numbering notes:
  - No sample files are associated with IDs `1`, `2`, `5`, or `14` in the original TLH sample set.
  - The 14 sample files correspond to IDs `3` through `18` (with the gaps above).
  - Commonly identified names:
    - `3`: Drone (`S-DRONE`)
    - `4`: Attack (`S-ATTACK`)
    - `6`: Psycho (`S-PSYCHO`)
    - `7`: Monster (`S-MONSTR`)
    - `8`: Voice (`S-VOICE`)
    - `9`: Zombie (`S-ZOMBIE`) - notable for timing/queue handling in modern interpreters.
    - `10`: Cretin (`S-CRETIN`)
    - `16`: looping effect that also needs special queue handling in modern interpreters.

Notes:

- This is intentionally story-specific behavior (`story_id == LURKING_HORROR` in Frotz), not a generic rule for all Z-machine games.
- For V3 stories like TLH, the optional fourth `@sound_effect` operand is not part of the V3 opcode contract and should not be interpreted as in V5+.

## Sound Asset Source

Blorb sound assets used by this project come from IF Archive:

- https://ifarchive.org/if-archive/infocom/media/sound/

Local project copy:

- `../data/TheLurkingHorror.blb`

Current runtime extraction target used by the interpreter mapping:

- `src/assets/soundfx/blorb/`
