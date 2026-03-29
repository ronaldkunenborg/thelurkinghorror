# ADR-0001: Quetzal Saves in Browser Local Storage with File Import/Export

## Status

Accepted

## Date

2026-03-30

## Context

The project aims to run fully in the browser without requiring a Node.js server.
Players still need reliable save/load behavior for progress persistence and portability.

Quetzal is the standard Z-machine save format, so preserving compatibility requires storing raw Quetzal save bytes and allowing users to move saves between environments.

## Decision

Implement save persistence using browser local storage infrastructure (IndexedDB, referred to as LocalDB in project discussion), and provide:

- local slot-based save/load
- export of saves as downloadable `.sav` files
- import of `.sav` files into local slots

VM-level save/restore remains responsible for generating and consuming Quetzal bytes.
Storage layer remains responsible for persistence and transfer only.

## Consequences

Positive:

- Fully local/offline save functionality.
- No backend/server dependency for save management.
- User-controlled backup/transfer through file export/import.
- Standards-aligned save representation.

Trade-offs:

- Requires IndexedDB support in the runtime environment.
- Save compatibility checks (story id/release/serial/checksum) must be enforced at restore time.
- Additional UI controls are needed for slot management and import/export.

## Implementation notes

- Reference module: `src/quetzal-storage.js`
- Supporting documentation: `docs/QUETZAL_LOCAL_STORAGE.md`
