# ifvms.js Architecture Analysis (Task 2)

This document summarizes the `ifvms.js` design and extracts implementation patterns suitable for our single-file Z3 interpreter.

Repository analyzed: `https://github.com/curiousdannii/ifvms.js` (local shallow clone, source under `src/`).

## 1) High-level architecture

`ifvms.js` composes the VM from four major modules:

- Runtime/state engine (`src/zvm/runtime.js`)
- Text and dictionary handling (`src/zvm/text.js`)
- I/O and Glk event integration (`src/zvm/io.js`)
- Disassembler + JIT pipeline (`src/zvm/disassembler.js` + `src/common/ast.js` + `src/zvm/opcodes.js`)

Public API shell (`src/zvm.js`) performs:

- story identification/loading
- memory view setup (`m`, `ram`, `origram`)
- restart/init
- run loop and event loop integration

## 2) File parser and memory initialization patterns

Core parser behavior in `ifvms.js`:

- `common/file.js::identify()` detects Blorb vs raw Z-code and extracts exec payload.
- `zvm.js::start()` validates format/version, then wraps bytes with a `MemoryView` abstraction.
- `runtime.js::restart()` re-reads key header fields, reinitializes VM structures, and sets version-dependent values.

Notable implementation patterns worth reusing:

- Keep immutable story image + mutable RAM copy (`origram` + `ram` writes).
- Normalize all binary reads/writes through one helper abstraction (`MemoryView`).
- Resolve core header pointers once per restart and cache on VM object (`pc`, `globals`, `objects`, `staticmem`, `eof`).

## 3) Execution model: decode -> AST -> JIT function

`ifvms.js` runtime is not a direct opcode switch interpreter.
It does:

1. `run()` checks cache for JIT routine at current PC.
2. If missing: `compile()` calls `disassemble()`.
3. `disassemble()` decodes opcodes/operands into AST nodes.
4. AST context is stringified into JavaScript source.
5. `new Function('e', code)` produces compiled routine.
6. Routine executes until stopper/pauser/caller behavior returns control.

Why this matters:

- Very fast steady-state execution.
- More complex control-flow and debugging behavior.
- Higher implementation complexity than needed for initial Z3 MVP.

## 4) Opcode architecture and handler strategy

Opcode handlers are declarative in `src/zvm/opcodes.js`:

- Opcode map keyed by numeric opcode id.
- Helper classes from `ast.js` (`Storer`, `Brancher`, `Caller`, `Pauser`, etc.) encode behavior types.
- `opcode_builder()` creates classes with small semantic functions (often returning JS fragments).

Pattern to reuse:

- Classify opcodes by behavior traits, not only by mnemonic:
  - stores result
  - branches
  - stops frame
  - calls routine
  - pauses for I/O

This taxonomy is useful even in a non-JIT interpreter.

## 5) Call stack and variable model

Runtime uses a packed frame model inside a stack buffer:

- Stack frame metadata contains return PC, storer var, locals count, args mask, stack usage.
- Locals and eval stack are view slices over one underlying buffer.
- Variable addressing follows Z-machine rules:
  - `0` => eval stack
  - `1..15` => locals
  - `16+` => globals table

Reusable insight:

- Keep variable addressing centralized in one function (`variable()` equivalent).
- Keep call/return semantics centralized (`call()` and `ret()` equivalents).

## 6) Text, dictionary, and tokenization algorithms

`text.js` includes robust reference behavior for:

- Z-string decode with alphabet shifts and abbreviation expansion.
- Dictionary parsing:
  - separators
  - entry length/count
  - encoded-word index map
- Input tokenization flow:
  - split words using spaces + dictionary separators
  - encode words into dictionary form
  - dictionary lookup
  - parse buffer write-back (addr, length, position)

Strongly reusable for our project:

- Dictionary parse+cache structure.
- Tokenization steps and parse buffer encoding.
- Separation of raw ZSCII conversion and display text conversion.

## 7) Save/restore and undo design

`runtime.js` implements:

- Quetzal save/restore via `common/file.js::Quetzal`.
- Compressed dynamic memory delta strategy for normal saves.
- Undo snapshots as in-memory RAM+stack snapshots with byte-budget limiting.

For Phase 1:

- We can defer full Quetzal support.
- Keep architecture hooks for future save/restore so VM state layout does not block it later.

## 8) I/O and platform abstraction

`ifvms.js` is deeply Glk-oriented:

- Event-driven `resume()` flow handles line/char/file events.
- Output streams and window model map to Glk APIs.

For our browser single-page app:

- Do not port the Glk layer.
- Keep only VM-facing I/O contracts:
  - `print()`
  - `read()`
  - status update hook
- Map those to DOM UI.

## 9) Recommended adoption strategy for our codebase

Use as reference, not direct port.

Adopt:

- Header/memory initialization discipline.
- Variable/call-stack semantics layout.
- Dictionary parse/tokenize flow.
- Opcode taxonomy (storer/brancher/caller/pauser mindset).

Simplify/avoid in MVP:

- AST/JIT compilation pipeline.
- Glk dispatch integration.
- Full multi-version opcode surface.

## 10) Concrete implementation blueprint for our single-file Z3 VM

1. Direct interpreter loop first (`decode -> execute` switch table).
2. Separate modules (or sections) for:
   - memory/header
   - stack/variables/calls
   - text/dictionary/parser
   - opcode handlers
   - UI adapter
3. Keep function signatures close to ifvms semantics where practical to ease cross-checking.
4. Add trace mode for opcode-by-opcode diffing against reference behavior.

## 11) Risks and caveats identified from reference study

- Dynamic codegen (`new Function`) complicates debugging and CSP compatibility in browsers.
- Glk assumptions should not leak into core VM design.
- `ifvms.js` supports V3/4/5/8; our Z3-only scope allows major simplifications.
- Some opcodes in table are implemented as stubs/no-ops for specific environments; verify behavior against spec before copying patterns.

## Outcome

Task objective met:

- Studied parser implementation and runtime architecture.
- Documented opcode execution model and handler patterns.
- Identified practical patterns to adapt for single-file Z3 implementation without direct porting.
