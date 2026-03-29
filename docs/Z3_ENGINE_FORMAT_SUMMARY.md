# Z3 Engine Format Summary (Z-Machine Standard 1.1)

This document captures the practical Z3 format details needed to implement the parser/VM for this project and maps them to `The_Lurking_Horror_Infocom_Release_219_Serial_870912.z3`.

## Scope and sources

- Standard reference: Z-Machine Standards Document 1.1, especially sections 1, 5, 6, 11, 12, 13, 14, 15.
- Story file analyzed: `data/The_Lurking_Horror_Infocom_Release_219_Serial_870912.z3`.

## Memory model (Version 3)

In Z-machine terms, memory is split into:

- Dynamic memory: writable by game logic.
- Static memory: readable but not writable.
- High memory: contains routines/strings addressed indirectly (packed addresses for V3).

Key rules:

- First 64 bytes (`0x0000..0x003F`) are the header.
- Packed address conversion in V3: byte address = `2 * packedAddress`.
- Maximum V1-3 story length is 128 KB.

## Header fields used by parser (V3)

Important offsets (all addresses below are byte offsets into file memory):

- `0x00` version
- `0x04` high-memory base
- `0x06` initial PC (byte address in V3)
- `0x08` dictionary table address
- `0x0A` object table address
- `0x0C` globals table address
- `0x0E` static-memory base
- `0x18` abbreviations table address
- `0x1A` file length (for V3 this value is in 2-byte units)
- `0x1C` checksum

## The Lurking Horror Z3 mapping

Extracted from the bundled game file:

- Version: `3`
- Release: `219`
- Serial: `870912`
- High memory base (`0x04`): `0x5234`
- Initial PC (`0x06`): `0x544B`
- Dictionary (`0x08`): `0x3D0A`
- Object table (`0x0A`): `0x0494`
- Globals (`0x0C`): `0x02B4` (240 bytes, so `0x02B4..0x03A3`)
- Static memory base (`0x0E`): `0x2C2E`
- Abbreviation table (`0x18`): `0x01F4`
- Header file length (`0x1A`): `0xFD54` words = `129704` bytes
- Actual file length: `129704` bytes (matches header)
- Header checksum (`0x1C`): `0x747A`
- Computed checksum (sum bytes from `0x40` to EOF mod 65536): `0x747A` (valid)

## Dictionary format (V1-V3)

Dictionary table layout:

- 1 byte: separator count `n`
- `n` bytes: word separator ZSCII codes
- 1 byte: entry length
- 2 bytes: number of entries
- entries follow immediately

V3 entry structure:

- 4 bytes encoded dictionary word (6 Z-characters, padded)
- `entryLength - 4` bytes parser/game metadata

The Lurking Horror dictionary header:

- Address: `0x3D0A`
- Separators (`n=3`): `.`, `,`, `"` (ZSCII `46,44,34`)
- Entry length: `7`
- Entry count: `773`
- Entry start: `0x3D11`

## Object table format (V3)

Object table starts at header word `0x0A` and contains:

- Property defaults table: 31 words (62 bytes)
- Then object entries, each 9 bytes:
- 4 bytes attributes (32 flags)
- 1 byte parent
- 1 byte sibling
- 1 byte child
- 2 bytes property table address

For this story file:

- Object table base: `0x0494`
- Property defaults end: `0x04D2`
- First object entry: `0x04D2`

## Routine and call-state encoding essentials

- Routine entry begins with one byte: local variable count (`0..15`).
- In V1-4, local initial values follow in words.
- First instruction begins after routine header/local defaults.
- Stack variable number `0` is special: direct stack push/pop semantics in relevant opcodes.

## Opcode reference for V3 implementation

The complete opcode matrix is in section 14. For V3 engine work, these opcode families are the practical baseline.

Control/branch:

- `je`, `jl`, `jg`, `jz`, `jump`, `test`, `jin`, `inc_chk`, `dec_chk`

State and stack:

- `store`, `load`, `push`, `pull`, `ret`, `ret_popped`, `rtrue`, `rfalse`

Memory:

- `loadb`, `loadw`, `storeb`, `storew`

Arithmetic/logic:

- `add`, `sub`, `mul`, `div`, `mod`, `and`, `or`, `not`

Objects/properties:

- `get_parent`, `get_child`, `get_sibling`
- `insert_obj`, `remove_obj`
- `test_attr`, `set_attr`, `clear_attr`
- `get_prop`, `get_prop_addr`, `get_prop_len`, `get_next_prop`, `put_prop`

Text and I/O:

- `print`, `print_ret`, `print_addr`, `print_paddr`, `print_obj`, `print_char`, `print_num`, `new_line`
- `sread`, `show_status`, `random`, `verify`, `quit`, `restart`, `save`, `restore`

Calls:

- `call` (VAR form in V3, up to 3 args), plus return/store behavior

## Parser checklist for Phase 1

- Validate version is `3`.
- Parse and store all core header pointers listed above.
- Validate file length from header against actual bytes.
- Validate checksum using standard formula.
- Build memory segments:
  - Dynamic: `0x0000 .. staticBase-1`
  - Static: `staticBase .. EOF`
  - High: `highMemoryBase .. EOF`
- Parse dictionary header and index entries.
- Parse object defaults and object entry table.
- Parse globals table as 240 bytes (120 words).

## Notes for this project

- This file is intended as the implementation-facing quick reference.
- Deeper behavior details for each opcode should stay linked to section 15 semantics while coding handlers.
