'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { parseZ3Story } = require('../src/parser.js');

function run() {
  const scriptPath = path.resolve(__dirname, '../src/bundled-story.js');
  const source = fs.readFileSync(scriptPath, 'utf8');
  const context = {
    Uint8Array,
    ArrayBuffer,
    atob(value) {
      return Buffer.from(value, 'base64').toString('binary');
    },
  };
  context.window = context;
  context.globalThis = context;

  vm.runInNewContext(source, context, { filename: scriptPath });

  assert.ok(context.LURKING_HORROR_BUNDLED_STORY, 'Bundled story asset should register on window/global scope');
  assert.strictEqual(
    context.LURKING_HORROR_BUNDLED_STORY.fileName,
    'The_Lurking_Horror_Infocom_Release_219_Serial_870912.z3',
    'Bundled asset should expose the expected story filename'
  );

  const buffer = context.LURKING_HORROR_BUNDLED_STORY.getArrayBuffer();
  const parsed = parseZ3Story(buffer);

  assert.strictEqual(parsed.release, 219, 'Bundled story should decode to the expected release');
  assert.strictEqual(parsed.serial, '870912', 'Bundled story should decode to the expected serial');

  console.log('Bundled story test passed.');
}

run();
