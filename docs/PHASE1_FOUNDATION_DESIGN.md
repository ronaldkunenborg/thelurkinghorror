# Phase 1 Foundation Design (Z3 MVP)

This document finalizes the Phase 1 implementation design based on:

- `docs/Z3_ENGINE_FORMAT_SUMMARY.md`
- `docs/IFVMS_ARCHITECTURE_ANALYSIS.md`
- Current project scope (single-file browser-first Z3 interpreter)

## 1) Phase 1 goal

Deliver a minimal but structured Z3 runtime that:

- Loads and validates The Lurking Horror `.z3` file.
- Initializes memory and VM state correctly.
- Executes a bounded baseline opcode set.
- Connects VM text output and command input to a basic web UI.

## 2) Proposed module layout

Use a minimal modular split during development; bundle to one file later.

- `src/parser.js`
  - Story file validation and structured metadata extraction.
  - Dictionary/object/globals index extraction.
- `src/vm-core.js`
  - VM state model, fetch/decode/execute loop, stacks, variables, call/return.
- `src/opcodes.js`
  - Opcode decode helpers and handler table for Phase 1 subset.
- `src/text.js`
  - Z-string decode, alphabet/abbreviation support, basic print paths.
- `src/io.js`
  - VM-facing I/O adapter: output sink + line input callback.
- `src/index.html`
  - Lightweight terminal-like shell (output pane, input, status line).

## 3) Architecture diagram (Phase 1)

```text
+--------------------------- Browser UI ----------------------------+
|  Output pane        Status line        Command input             |
+-------------------------------+----------------------------------+
                                |
                                v
+--------------------------- IO Adapter ----------------------------+
| writeText(), requestLine(), updateStatus()                       |
+-------------------------------+----------------------------------+
                                |
                                v
+------------------------ Z3 VM Runtime ----------------------------+
| fetch/decode/execute loop | stack | call frames | vars | branch  |
| opcode handlers table (Phase 1 subset)                           |
+-------------------------------+----------------------------------+
                                |
                    +-----------+-----------+
                    |                       |
                    v                       v
+---------------- Parser ----------------+  +---------------- Text ----------------+
| header + memory map + dict/object idx |  | zstring decode + abbrev + zscii map |
+----------------------+-----------------+  +----------------+-------------------+
                       |                                   |
                       +---------------+-------------------+
                                       v
                              Uint8Array story image
```

## 4) File parser design (finalized)

`parseStory(arrayBuffer)` returns:

- `version`, `release`, `serial`, `checksum`, `fileLength`
- `header` object with core pointers
- `memory` object:
  - `bytes` (full image, `Uint8Array`)
  - `dynamicEnd` (`staticBase - 1`)
  - `staticBase`
  - `highMemoryBase`
- `tables` object:
  - `dictionary` (address, separator list, entry length, entry count)
  - `objectTable` (base, propertyDefaultsBase, firstObjectAddr)
  - `globals` (base, wordCount=120)
  - `abbreviations` (base)
- `validation` object:
  - file-length check result
  - checksum check result

Parser hard checks:

- version must be `3`
- file length header must match bytes length (V3 word scaling)
- checksum must match standard sum (`0x40..EOF`)

## 5) Memory management strategy (finalized)

Use a copy-on-load model:

- `storyImage: Uint8Array` is immutable reference baseline.
- `ram: Uint8Array` starts as clone of full image, but only `0..staticBase-1` is writable.
- Runtime reads from `ram` for all memory access; write helpers guard dynamic range.

Helpers:

- `read8(addr)`, `read16(addr)`
- `write8(addr, val)`, `write16(addr, val)` with dynamic-memory bounds check
- `packedToByte(packedAddr) => packedAddr * 2` (V3)

State structures:

- `pc: number`
- `evalStack: number[]`
- `callFrames: Array<{ returnPc, storeVar, locals: number[], argMask: number }>`
- `globalsBase: number`

## 6) Opcode set for Phase 1

Phase 1 subset is chosen to boot and run initial command loops for V3 stories.
Numbers below use section 14 table semantics.

Control/branch:

- `je`, `jl`, `jg`, `jz`, `jump`, `test`, `inc_chk`, `dec_chk`

Variable/stack:

- `load`, `store`, `push`, `pull`, `ret`, `ret_popped`, `rtrue`, `rfalse`, `pop`

Memory:

- `loadb`, `loadw`, `storeb`, `storew`

Math/logic:

- `add`, `sub`, `mul`, `div`, `mod`, `and`, `or`, `not`

Calls:

- `call` (VAR form), `call_1s`, `call_2s`, `call_2n`

Text/output:

- `print`, `print_ret`, `print_addr`, `print_paddr`, `new_line`, `print_num`, `print_char`

Input/basic system:

- `sread`, `tokenise`, `random`, `show_status`, `verify`, `quit`, `restart`

Object/property baseline (needed early in Infocom stories):

- `get_parent`, `get_child`, `get_sibling`
- `insert_obj`, `remove_obj`, `jin`
- `test_attr`, `set_attr`, `clear_attr`
- `get_prop`, `get_prop_addr`, `get_prop_len`, `get_next_prop`, `put_prop`

## 7) Decoder strategy

Use direct decode + execute (non-JIT) for Phase 1:

- Decode instruction form (long/short/variable/extended marker).
- Decode operand type bytes and operands.
- Decode optional store variable, branch payload, and literal text payload.
- Dispatch to handler map keyed by canonical opcode id.

Reason:

- Lower complexity and easier tracing than AST/JIT.
- Matches MVP needs and keeps browser CSP-friendly code (no `new Function`).

## 8) Error and debug strategy

Add a `debug` mode flag:

- logs `pc`, opcode id, operands, branch/store metadata
- traps unknown opcode with structured error message
- includes minimal memory guard assertions for writes and stack underflow

## 9) Testing strategy for Phase 1

Unit tests:

- parser header fields and checksum validation
- dictionary header parse correctness
- variable addressing (stack/local/global)
- branch offset evaluation and signed math

VM smoke tests:

- boot to initial output prompt
- one read/execute/print command cycle
- deterministic opcode trace over first N instructions

## 10) Implementation sequence (next tasks)

1. Implement `src/parser.js` and parser tests.
2. Implement VM core state + decode loop in `src/vm-core.js`.
3. Add Phase 1 opcode handlers incrementally by category.
4. Wire minimal `index.html` + I/O adapter and run startup integration check.
