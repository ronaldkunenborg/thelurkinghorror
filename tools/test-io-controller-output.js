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

function testComputerHelpAddsManualNoteRegardlessOfRoomState() {
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
      'Note: according to the manual, the login is 872325412 and the password is uhlersoth.',
    ],
    'Computer help text should add the manual login note even if room tracking state differs'
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
      'Sound is now off.',
      'Sound is now on.',
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

function testMappedSoundPlaybackRespectsPreference() {
  const ui = createUi();
  const fakeAudio = {
    loop: false,
    currentTime: 5,
    playCalls: 0,
    pauseCalls: 0,
    addEventListener() {},
    play() {
      this.playCalls++;
      return Promise.resolve();
    },
    pause() {
      this.pauseCalls++;
    },
  };
  const controller = new GameIoController(ui, {
    soundCatalog: {
      7: { src: './data/sample-7.mp3', loop: false },
    },
    audioFactory() {
      return fakeAudio;
    },
  });

  controller._handleVmSoundEffect({ number: 7, effect: 2 });
  assert.strictEqual(fakeAudio.playCalls, 1, 'sound should play when enabled');

  controller.submitCommand('$SOUND');
  controller._handleVmSoundEffect({ number: 7, effect: 2 });
  assert.strictEqual(fakeAudio.playCalls, 1, 'sound should not play when disabled');
}

function testMissingMappedSoundWarnsOnce() {
  const ui = createUi();
  const controller = new GameIoController(ui);

  controller._handleVmSoundEffect({ number: 99, effect: 2 });
  controller._handleVmSoundEffect({ number: 99, effect: 2 });

  const debugLines = ui.lines.filter(line => line.startsWith('[SFX debug]'));
  assert.strictEqual(debugLines.length, 2, 'each sound event should emit one SFX debug line');
  assert.ok(
    debugLines.every(line => line.includes('id=99') && line.includes('effect=start') && line.includes('mapped=none')),
    'SFX debug line should include sound id, effect, and mapping status'
  );
  assert.deepStrictEqual(
    ui.lines.filter(line => line.startsWith('Sound #')),
    ['Sound #99 requested, but no sample is mapped yet.'],
    'missing sound mapping should be announced once per sound id'
  );
}

function testStartingNewSampleStopsPreviousSample() {
  const ui = createUi();
  const audioBySrc = {};
  function makeAudio(src) {
    const audio = {
      src,
      paused: true,
      currentTime: 0,
      playCalls: 0,
      pauseCalls: 0,
      addEventListener() {},
      play() {
        this.paused = false;
        this.playCalls++;
        return Promise.resolve();
      },
      pause() {
        this.paused = true;
        this.pauseCalls++;
      },
    };
    audioBySrc[src] = audio;
    return audio;
  }

  const controller = new GameIoController(ui, {
    soundCatalog: {
      7: { src: './a.wav' },
      8: { src: './b.wav' },
    },
    audioFactory(src) {
      return makeAudio(src);
    },
  });

  controller._handleVmSoundEffect({ number: 7, effect: 2 });
  controller._handleVmSoundEffect({ number: 8, effect: 2 });

  assert.strictEqual(audioBySrc['./a.wav'].pauseCalls, 1, 'starting a new sample should stop the previous one');
  assert.strictEqual(audioBySrc['./b.wav'].playCalls, 1, 'new sample should start playing');
}

function testDefaultSfxLoopsUntilExplicitStop() {
  const ui = createUi();
  const fakeAudio = {
    loop: false,
    paused: true,
    currentTime: 0,
    playCalls: 0,
    pauseCalls: 0,
    addEventListener() {},
    play() {
      this.paused = false;
      this.playCalls++;
      return Promise.resolve();
    },
    pause() {
      this.paused = true;
      this.pauseCalls++;
    },
  };
  const controller = new GameIoController(ui, {
    soundCatalog: {
      10: { src: './s10.wav' },
    },
    audioFactory() {
      return fakeAudio;
    },
  });

  controller._handleVmSoundEffect({ number: 10, effect: 2 });
  assert.strictEqual(fakeAudio.loop, true, 'unclassified game sound should default to looping');
  assert.strictEqual(fakeAudio.playCalls, 1, 'start should trigger playback');

  controller._handleVmSoundEffect({ number: 10, effect: 2 });
  assert.strictEqual(
    fakeAudio.playCalls,
    1,
    'repeated start for the same active sample should keep current loop without restart'
  );

  controller._handleVmSoundEffect({ number: 10, effect: 3 });
  assert.strictEqual(fakeAudio.pauseCalls, 1, 'explicit stop should halt looping sample');
}

function testMusicAndSfxUseSeparateReplacementGroups() {
  const ui = createUi();
  const audioBySrc = {};

  function makeAudio(src) {
    const audio = {
      src,
      loop: false,
      paused: true,
      currentTime: 0,
      playCalls: 0,
      pauseCalls: 0,
      addEventListener() {},
      play() {
        this.paused = false;
        this.playCalls++;
        return Promise.resolve();
      },
      pause() {
        this.paused = true;
        this.pauseCalls++;
      },
    };
    audioBySrc[src] = audio;
    return audio;
  }

  const controller = new GameIoController(ui, {
    soundCatalog: {
      1: { src: './music-a.mp3', class: 'music' },
      2: { src: './sfx-a.wav' },
      3: { src: './music-b.mp3', class: 'music' },
    },
    audioFactory(src) {
      return makeAudio(src);
    },
  });

  controller._handleVmSoundEffect({ number: 1, effect: 2 });
  controller._handleVmSoundEffect({ number: 2, effect: 2 });

  assert.strictEqual(audioBySrc['./music-a.mp3'].pauseCalls, 0, 'starting SFX should not stop active music');
  assert.strictEqual(audioBySrc['./music-a.mp3'].loop, false, 'music should default to non-looping');
  assert.strictEqual(audioBySrc['./sfx-a.wav'].loop, true, 'SFX should default to looping');

  controller._handleVmSoundEffect({ number: 3, effect: 2 });
  assert.strictEqual(audioBySrc['./music-a.mp3'].pauseCalls, 1, 'new music should replace old music');
}

function testSoundStatsAllPrintsEventBreakdown() {
  const ui = createUi();
  const controller = new GameIoController(ui);
  controller.vm = { haltReason: null };

  controller._handleVmSoundEffect({ number: 10, effect: 2, volumeRaw: 2, volumeSigned: 2, operandCount: 3 });
  controller._handleVmSoundEffect({ number: 10, effect: 2, volumeRaw: 4, volumeSigned: 4, operandCount: 3 });
  controller._handleVmSoundEffect({ number: 10, effect: 3, operandCount: 2 });

  controller.submitCommand('$SOUNDSTATS ALL');

  const statLines = ui.lines.filter(line => line.startsWith('[SFX stats]'));
  assert.ok(statLines.length >= 4, 'SOUNDSTATS ALL should include summary and per-event breakdown');
  assert.ok(
    statLines.some(line => line.includes('events=3') && line.includes('effects=2,3')),
    'summary should report aggregate counts'
  );
  assert.ok(
    statLines.some(line => line.includes('id=10') && line.includes('effect=2') && line.includes('volumeRaw=2') && line.includes('count=1')),
    'breakdown should include first start event'
  );
  assert.ok(
    statLines.some(line => line.includes('id=10') && line.includes('effect=3') && line.includes('volumeRaw=none') && line.includes('count=1')),
    'breakdown should include stop event'
  );
}

function testSoundEventCommandTriggersSyntheticPlayback() {
  const ui = createUi();
  const fakeAudio = {
    paused: true,
    currentTime: 0,
    playCalls: 0,
    pauseCalls: 0,
    addEventListener() {},
    play() {
      this.paused = false;
      this.playCalls++;
      return Promise.resolve();
    },
    pause() {
      this.paused = true;
      this.pauseCalls++;
    },
  };
  const controller = new GameIoController(ui, {
    soundCatalog: {
      10: { src: './s10.wav' },
    },
    audioFactory() {
      return fakeAudio;
    },
  });
  controller.vm = { haltReason: null };

  controller.submitCommand('$SOUNDEVENT 10 2 8');

  assert.strictEqual(fakeAudio.playCalls, 1, 'SOUNDEVENT should trigger playback for mapped sound');
  assert.ok(
    ui.lines.some(line => line.includes('[SFX command] Triggering synthetic event id=10 effect=2 volumeRaw=8')),
    'SOUNDEVENT should announce the synthetic trigger'
  );
  assert.ok(
    ui.lines.some(line => line.includes('[SFX debug] id=10') && line.includes('effect=start')),
    'SOUNDEVENT should flow through normal SFX debug output'
  );
}

function run() {
  testOutputBuffering();
  testFlushAtRunBoundary();
  testComputerHelpAddsManualNote();
  testComputerHelpAddsManualNoteRegardlessOfRoomState();
  testSoundInterpreterCommandWorksWithoutVmInput();
  testMappedSoundPlaybackRespectsPreference();
  testMissingMappedSoundWarnsOnce();
  testStartingNewSampleStopsPreviousSample();
  testDefaultSfxLoopsUntilExplicitStop();
  testMusicAndSfxUseSeparateReplacementGroups();
  testSoundStatsAllPrintsEventBreakdown();
  testSoundEventCommandTriggersSyntheticPlayback();
  console.log('I/O controller output tests passed.');
}

run();
