'use strict';

const assert = require('assert');
const { GameIoController } = require('../src/io.js');

function createUi() {
  return {
    lines: [],
    statuses: [],
    handler: null,
    appendOutput(text) {
      this.lines.push(text);
    },
    clearOutput() {
      this.lines = [];
    },
    setStatus(left, right) {
      this.statuses.push([left, right]);
    },
    focusInput() {},
    setCommandHandler(handler) {
      this.handler = handler;
    },
  };
}

function testOutputBuffering() {
  const ui = createUi();
  const controller = new GameIoController(ui);

  controller._handleVmOutput('Release ');
  controller._handleVmOutput('219');
  controller._handleVmOutput(' / Serial number ');
  controller._handleVmOutput('8');
  controller._handleVmOutput('7');
  controller._handleVmOutput('0');
  controller._handleVmOutput('9');
  controller._handleVmOutput('1');
  controller._handleVmOutput('2');
  controller._handleVmOutput('\n');

  assert.deepStrictEqual(
    ui.lines,
    ['Release 219 / Serial number 870912'],
    'Chunked VM output should be rendered as one line'
  );
}

function testFlushAtRunBoundary() {
  const ui = createUi();
  const controller = new GameIoController(ui);
  controller.vm = {
    run() {
      controller._handleVmOutput('I do');
      controller._handleVmOutput("n't know ");
      controller._handleVmOutput('that word.');
      return { haltReason: 'input', quit: false };
    },
  };

  controller.runVm();

  assert.strictEqual(ui.lines[0], "I don't know that word.", 'Partial line should flush when VM stops for input');
}

function testComputerHelpAddsManualNote() {
  const ui = createUi();
  const controller = new GameIoController(ui);

  controller._handleVmOutput('Terminal Room\n');
  controller._handleVmOutput(
    'This is a large room crammed with computer terminals, small computers, and printers.\n'
  );
  controller._handleVmOutput(
    'You push the friendly-looking HELP key. A spritely little box appears on the screen, which reads: "You should "LOGIN your-user-id" and then "PASSWORD your-password"."\n'
  );

  assert.deepStrictEqual(
    ui.lines,
    [
      'Terminal Room',
      'This is a large room crammed with computer terminals, small computers, and printers.',
      'You push the friendly-looking HELP key. A spritely little box appears on the screen, which reads: "You should "LOGIN your-user-id" and then "PASSWORD your-password"."',
      'Note: according to the manual, the login is 872325412 and the password is uhlersoth.',
    ],
    'Computer help text should be followed by the manual login note'
  );
}

function testComputerHelpSkipsManualNoteOutsideTerminalRoom() {
  const ui = createUi();
  const controller = new GameIoController(ui);

  controller._handleVmOutput('Second Floor\n');
  controller._handleVmOutput(
    'This is the second floor of the Computer Center. An elevator and call buttons are on the south side of the hallway.\n'
  );
  controller._handleVmOutput(
    'You push the friendly-looking HELP key. A spritely little box appears on the screen, which reads: "You should "LOGIN your-user-id" and then "PASSWORD your-password"."\n'
  );

  assert.deepStrictEqual(
    ui.lines,
    [
      'Second Floor',
      'This is the second floor of the Computer Center. An elevator and call buttons are on the south side of the hallway.',
      'You push the friendly-looking HELP key. A spritely little box appears on the screen, which reads: "You should "LOGIN your-user-id" and then "PASSWORD your-password"."',
    ],
    'Computer help text should not add the manual login note outside the Terminal Room'
  );
}

function testSoundInterpreterCommandWorksWithoutVmInput() {
  const ui = createUi();
  const controller = new GameIoController(ui);
  controller.vm = { haltReason: null };

  controller.submitCommand('$SOUND');
  controller.submitCommand('$SOUND');

  assert.deepStrictEqual(
    ui.lines,
    [
      'Sound is now off. Audio playback is not implemented yet; this toggles the interpreter preference only.',
      'Sound is now on. Audio playback is not implemented yet; this toggles the interpreter preference only.',
    ],
    '$SOUND should toggle interpreter sound preference without requiring VM input'
  );
  assert.deepStrictEqual(
    ui.statuses.slice(-2),
    [
      ['Interpreter command', 'Sound off'],
      ['Interpreter command', 'Sound on'],
    ],
    '$SOUND should update interpreter status when toggled'
  );
}

function run() {
  testOutputBuffering();
  testFlushAtRunBoundary();
  testComputerHelpAddsManualNote();
  testComputerHelpSkipsManualNoteOutsideTerminalRoom();
  testSoundInterpreterCommandWorksWithoutVmInput();
  console.log('I/O controller output tests passed.');
}

run();
