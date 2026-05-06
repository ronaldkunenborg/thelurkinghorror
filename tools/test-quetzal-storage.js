'use strict';

const assert = require('assert');
const {
  createSaveBlob,
  isIfzsQuetzalData,
} = require('../src/quetzal-storage.js');

function makeIfzsBytes() {
  const bytes = new Uint8Array(12);
  bytes[0] = 0x46; // F
  bytes[1] = 0x4f; // O
  bytes[2] = 0x52; // R
  bytes[3] = 0x4d; // M
  bytes[7] = 0x04;
  bytes[8] = 0x49; // I
  bytes[9] = 0x46; // F
  bytes[10] = 0x5a; // Z
  bytes[11] = 0x53; // S
  return bytes;
}

function run() {
  const ifzs = makeIfzsBytes();
  const unknown = new Uint8Array([1, 2, 3, 4]);

  assert.strictEqual(isIfzsQuetzalData(ifzs), true, 'FORM/IFZS bytes should be recognized as Quetzal saves');
  assert.strictEqual(isIfzsQuetzalData(unknown), false, 'unknown bytes should not be recognized as Quetzal saves');

  const blob = createSaveBlob({ quetzalData: ifzs });
  assert.strictEqual(blob.type, 'application/octet-stream', 'exported save blobs should use binary type');
  assert.throws(
    () => createSaveBlob({ quetzalData: unknown }),
    /not Quetzal\/IFZS/,
    'unknown bytes should not be exportable as .sav'
  );

  console.log('Quetzal storage tests passed.');
}

run();
