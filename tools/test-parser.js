'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { parseZ3Story } = require('../src/parser.js');

function run() {
  const storyPath = path.resolve(
    __dirname,
    '..',
    'data',
    'The_Lurking_Horror_Infocom_Release_219_Serial_870912.z3'
  );
  const bytes = fs.readFileSync(storyPath);

  const parsed = parseZ3Story(bytes);

  // Header metadata
  assert.strictEqual(parsed.version, 3, 'Version should be 3');
  assert.strictEqual(parsed.release, 219, 'Release should be 219');
  assert.strictEqual(parsed.serial, '870912', 'Serial should be 870912');
  assert.strictEqual(parsed.header.highMemoryBase, 0x5234, 'High memory base mismatch');
  assert.strictEqual(parsed.header.initialPc, 0x544b, 'Initial PC mismatch');
  assert.strictEqual(parsed.header.dictionaryAddress, 0x3d0a, 'Dictionary address mismatch');
  assert.strictEqual(parsed.header.objectTableAddress, 0x0494, 'Object table address mismatch');
  assert.strictEqual(parsed.header.globalsAddress, 0x02b4, 'Globals address mismatch');
  assert.strictEqual(parsed.header.staticBase, 0x2c2e, 'Static base mismatch');
  assert.strictEqual(parsed.header.abbreviationsAddress, 0x01f4, 'Abbrev table mismatch');
  assert.strictEqual(parsed.header.headerFileLengthBytes, bytes.length, 'Header length mismatch');
  assert.strictEqual(parsed.validation.checksumMatchesHeader, true, 'Checksum should match');

  // Dictionary extraction
  assert.strictEqual(parsed.tables.dictionary.separatorCount, 3, 'Dictionary separator count mismatch');
  assert.deepStrictEqual(
    parsed.tables.dictionary.separators,
    [46, 44, 34],
    'Dictionary separators mismatch'
  );
  assert.strictEqual(parsed.tables.dictionary.entryLength, 7, 'Dictionary entry length mismatch');
  assert.strictEqual(parsed.tables.dictionary.entryCount, 773, 'Dictionary entry count mismatch');
  assert.strictEqual(parsed.tables.dictionary.entriesAddress, 0x3d11, 'Dictionary entries start mismatch');

  // Initial memory model
  assert.strictEqual(parsed.memory.dynamicEnd, parsed.header.staticBase - 1);
  assert.strictEqual(parsed.memory.model.dynamic.length, parsed.header.staticBase);
  assert.strictEqual(
    parsed.memory.model.static.length,
    bytes.length - parsed.header.staticBase,
    'Static memory slice length mismatch'
  );
  assert.strictEqual(
    parsed.memory.model.high.length,
    bytes.length - parsed.header.highMemoryBase,
    'High memory slice length mismatch'
  );

  // Ensure story image is immutable baseline and ram is mutable copy
  const originalFirstByte = parsed.memory.model.storyImage[0];
  parsed.memory.model.ram[0] = (parsed.memory.model.ram[0] + 1) & 0xff;
  assert.strictEqual(
    parsed.memory.model.storyImage[0],
    originalFirstByte,
    'Story image should not change when RAM changes'
  );

  // Validation checks
  const tamperedChecksum = Buffer.from(bytes);
  tamperedChecksum[0x40] = (tamperedChecksum[0x40] + 1) & 0xff;
  assert.throws(
    () => parseZ3Story(tamperedChecksum),
    /Header checksum mismatch/,
    'Checksum validation should fail for tampered story'
  );

  const tamperedVersion = Buffer.from(bytes);
  tamperedVersion[0] = 5;
  assert.throws(
    () => parseZ3Story(tamperedVersion),
    /version 3 is supported/,
    'Version validation should fail for non-Z3 story'
  );

  console.log('Parser tests passed.');
}

run();
