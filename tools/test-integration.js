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
      abbreviationsAddress: parsed.header.abbreviationsAddress,
      dictionaryAddress: parsed.header.dictionaryAddress,
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
  assert.ok(
    output.includes('Most of the tables are covered with waste paper, old pizza boxes, and empty Coke cans.'),
    'Startup output should describe the opening room rather than darkness'
  );
  assert.ok(
    output.includes("There are usually a lot of people here, but tonight it's almost deserted."),
    'Startup output should end with the expected opening room description'
  );
  assert.ok(!output.includes('It is pitch black.'), 'Startup output should not report darkness in the opening room');
  assert.ok(output.includes('>'), 'Startup output should include prompt marker');

  const beforeCommandLen = output.length;
  vm.provideInput('look');
  const second = vm.run(2500000);
  assert.strictEqual(second.haltReason, 'input', 'VM should return to input after command processing');
  const commandOutput = output.slice(beforeCommandLen);
  assert.ok(commandOutput.length > 0, 'Output should grow after command processing');
  assert.ok(commandOutput.includes('Terminal Room'), 'Look should redisplay the current room name');
  assert.ok(
    commandOutput.includes('Most of the tables are covered with waste paper, old pizza boxes, and empty Coke cans.'),
    'Look should redisplay the current room description'
  );

  const beforeComputerOnLen = output.length;
  vm.provideInput('turn computer on');
  const third = vm.run(2500000);
  assert.strictEqual(third.haltReason, 'input', 'Computer power-on flow should return to input');
  const computerOnOutput = output.slice(beforeComputerOnLen);
  assert.ok(
    computerOnOutput.includes('LOGIN PLEASE:'),
    'Computer power-on flow should reach the login prompt'
  );

  const beforeLoginLen = output.length;
  vm.provideInput('login computer');
  const fourth = vm.run(2500000);
  assert.strictEqual(fourth.haltReason, 'input', 'Computer login flow should return to input');
  const loginOutput = output.slice(beforeLoginLen);
  assert.ok(
    loginOutput.includes('PASSWORD PLEASE:'),
    'Computer login flow should reach the password prompt'
  );

  console.log('Integration smoke test passed.');
}

run();
