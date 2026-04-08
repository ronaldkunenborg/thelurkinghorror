'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { parseZ3Story } = require('../src/parser.js');
const { Z3VM } = require('../src/vm-core.js');
const { GameIoController } = require('../src/io.js');

const STORY_PATH = path.join(
  __dirname,
  '..',
  '..',
  'data',
  'The_Lurking_Horror_Infocom_Release_219_Serial_870912.z3'
);

function run() {
  const bytes = fs.readFileSync(STORY_PATH);
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

function createUiStub() {
  return {
    lines: [],
    statuses: [],
    topbarMeta: [],
    commandHandler: null,
    appendOutput(text) {
      this.lines.push(String(text || ''));
    },
    clearOutput() {
      this.lines = [];
    },
    setStatus(left, right) {
      this.statuses.push([left, right]);
    },
    setTopbarMeta(room, score, moves) {
      this.topbarMeta.push([room, score, moves]);
    },
    setCommandHandler(handler) {
      this.commandHandler = handler;
    },
    focusInput() {},
  };
}

function createRealVmForController(controller, storyBytes) {
  const parsed = parseZ3Story(storyBytes);
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
      onOutput: text => controller._handleVmOutput(text),
      onInputRequested: () => controller._handleInputRequested(),
      onSoundEffect: event => controller._handleVmSoundEffect(event),
      onUnknownOpcode: event => controller._handleUnknownOpcode(event),
    },
  });
  return { parsed, vm };
}

function testSameRoomHeadingClearsStaleDarkState() {
  const bytes = fs.readFileSync(STORY_PATH);
  const ui = createUiStub();
  const roomEvents = [];
  const controller = new GameIoController(ui, {
    onRoomChanged(roomName, roomObjectId, options) {
      roomEvents.push({
        roomName: String(roomName || ''),
        roomObjectId: Number(roomObjectId) || 0,
        isDark: !!(options && options.isDark),
      });
    },
  });
  const vmSetup = createRealVmForController(controller, bytes);
  controller.storyMeta = vmSetup.parsed;
  controller.vm = vmSetup.vm;

  controller.runVm();

  // Simulate a stale-dark scene flag while staying in the same lit room.
  // This mirrors the bug class where visual darkness could persist without
  // a room transition, and validates that same-room heading evidence clears it.
  controller.lastTurnWasPitchBlack = true;
  controller.lastSceneIsDark = true;
  controller.submitCommand('look');

  assert.ok(
    ui.lines.some(line => line.includes('Terminal Room')),
    'look should emit current-room heading in the same room'
  );
  assert.ok(
    roomEvents.some(event => event.roomObjectId === 176 && event.isDark === false),
    'same-room heading should clear stale dark state and emit isDark=false for Terminal Room'
  );

  console.log('Integration same-room stale-dark recovery test passed.');
}

run();
testSameRoomHeadingClearsStaleDarkState();
