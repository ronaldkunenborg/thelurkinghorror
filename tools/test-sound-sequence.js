'use strict';

const assert = require('assert');
const fs = require('fs');
const { parseZ3Story } = require('../src/parser.js');
const { Z3VM } = require('../src/vm-core.js');

function run() {
  const bytes = fs.readFileSync(
    '../data/The_Lurking_Horror_Infocom_Release_219_Serial_870912.z3'
  );
  const parsed = parseZ3Story(bytes);

  const outputChunks = [];
  const soundEvents = [];

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
      onSoundEffect: event => {
        soundEvents.push(event);
      },
    },
  });

  const first = vm.run(3000000);
  assert.strictEqual(first.haltReason, 'input', 'VM should reach command input at startup');

  const commands = [
    'turn computer on',
    'help',
    'login 872325412',
    'password uhlersoth',
    'click edit classics paper',
    'click paper',
    'read paper',
    'read more',
    'read more',
    'read more',
    'read more',
  ];

  for (const command of commands) {
    const beforeOutputLen = output.length;
    const beforeEvents = soundEvents.length;
    vm.provideInput(command);
    const result = vm.run(4000000);
    assert.strictEqual(result.haltReason, 'input', 'Command should return to input: ' + command);
    outputChunks.push({
      command,
      output: output.slice(beforeOutputLen),
      soundEvents: soundEvents.slice(beforeEvents),
    });
  }

  const transitionIndex = outputChunks.findIndex(chunk =>
    chunk.output.includes('[Use $SOUND to toggle sound usage on and off.]')
  );
  assert.ok(
    transitionIndex >= 0,
    'Expected transition hint "[Use $SOUND to toggle sound usage on and off.]" in command sequence'
  );

  const transitionOutput = outputChunks[transitionIndex].output;
  assert.ok(transitionOutput.includes('Place'), 'Transition output should include "Place"');
  assert.ok(
    transitionOutput.includes('This is a place.'),
    'Transition output should include the Place description'
  );

  const nearTransitionEvents = [];
  for (
    let i = Math.max(0, transitionIndex - 1);
    i <= Math.min(outputChunks.length - 1, transitionIndex + 1);
    i++
  ) {
    nearTransitionEvents.push(...outputChunks[i].soundEvents);
  }
  assert.ok(
    nearTransitionEvents.length > 0,
    'Expected at least one sound_effect event around the Place transition'
  );

  console.log('Sound sequence integration test passed.');
}

run();
