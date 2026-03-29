'use strict';

const assert = require('assert');
const fs = require('fs');
const { parseZ3Story } = require('../src/parser.js');
const { Z3VM } = require('../src/vm-core.js');

function run() {
  const bytes = fs.readFileSync(
    'data/The_Lurking_Horror_Infocom_Release_219_Serial_870912.z3'
  );
  const parsed = parseZ3Story(bytes);

  let output = '';
  const vm = new Z3VM({
    memory: parsed.memory.bytes,
    header: {
      highMemoryBase: parsed.header.highMemoryBase,
      initialPc: parsed.header.initialPc,
      globalsAddress: parsed.header.globalsAddress,
      staticBase: parsed.header.staticBase,
      objectTableAddress: parsed.header.objectTableAddress,
    },
    io: {
      onOutput: text => {
        output += text;
      },
    },
  });

  const first = vm.run(2500000);
  assert.strictEqual(first.haltReason, 'input', 'VM should reach command input at startup');
  assert.ok(output.includes('THE LURKING HORROR'), 'Startup output should contain game title');
  assert.ok(output.includes('>'), 'Startup output should include prompt marker');

  const beforeCommandLen = output.length;
  vm.provideInput('look');
  const second = vm.run(2500000);
  assert.strictEqual(second.haltReason, 'input', 'VM should return to input after command processing');
  assert.ok(output.length > beforeCommandLen, 'Output should grow after command processing');
  assert.ok(output.toLowerCase().includes('look'), 'Command response should reference submitted input');

  console.log('Integration smoke test passed.');
}

run();
