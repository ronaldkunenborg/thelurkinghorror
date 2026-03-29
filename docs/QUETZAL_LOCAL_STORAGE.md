# Quetzal Local Storage and File Import/Export

This project now includes a browser-side Quetzal storage module in:

- `src/quetzal-storage.js`

It is designed for local-only save/load workflows without a Node.js server.

## What it provides

- Slot-based save storage in IndexedDB ("LocalDB" in browser terms).
- Save listing, lookup, delete, and per-story clear.
- Export of a save slot to a downloadable `.sav` file.
- Import of a `.sav` file back into a story slot.

## API summary

`QuetzalStorage`:

- `open()`
- `putSave({ storyId, slot, quetzalData, ...meta })`
- `getSave(storyId, slot)`
- `listSaves(storyId?)`
- `deleteSave(storyId, slot)`
- `clearStory(storyId)`

Helper functions:

- `exportSaveToFile(record, filename?)`
- `importSaveFileToSlot(storage, file, { storyId, slot, ...meta })`
- `suggestSaveFilename(record)`

## Typical integration flow

1. VM produces Quetzal bytes for current state.
2. Store bytes with `putSave(...)`.
3. User clicks export button:
   - read save record
   - call `exportSaveToFile(record)`
4. User imports file:
   - obtain `File` from `<input type="file">`
   - call `importSaveFileToSlot(...)`
5. VM restore path loads bytes from selected slot and restores state.

## Example usage

```js
const storage = new QuetzalStorage();

// Save slot 0
await storage.putSave({
  storyId: 'lurking-horror-r219-870912',
  slot: 0,
  label: 'Before entering computer lab',
  quetzalData: vmQuetzalBytes, // Uint8Array or ArrayBuffer
  serial: '870912',
  release: 219,
});

// Export slot 0
const record = await storage.getSave('lurking-horror-r219-870912', 0);
await exportSaveToFile(record);

// Import into slot 1
await importSaveFileToSlot(storage, fileInput.files[0], {
  storyId: 'lurking-horror-r219-870912',
  slot: 1,
  label: 'Imported',
});
```

## Notes

- This module stores raw Quetzal bytes exactly as provided by the VM.
- Quetzal generation/parsing remains VM responsibility.
- Recommended story id format: include title + release + serial to avoid collisions across story revisions.
