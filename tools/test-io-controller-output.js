'use strict';

const assert = require('assert');
const { GameIoController } = require('../src/io.js');

function flushAsyncWork() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

function createStoryMeta() {
  return {
    release: 219,
    serial: '870912',
    header: {
      headerChecksum: 0x747a,
    },
  };
}

function createSaveStorage() {
  const records = new Map();
  return {
    async putSave(record) {
      const key = record.storyId + ':' + record.slot;
      const stored = Object.assign({}, record, {
        id: key,
        updatedAt: '2026-03-31T00:00:00.000Z',
        quetzalData: record.quetzalData,
      });
      records.set(key, stored);
      return stored;
    },
    async getSave(storyId, slot) {
      return records.get(storyId + ':' + slot) || null;
    },
    async listSaves(storyId) {
      return Array.from(records.values()).filter(record => record.storyId === storyId);
    },
    async deleteSave(storyId, slot) {
      return records.delete(storyId + ':' + slot);
    },
  };
}

function createUi() {
  return {
    lines: [],
    statuses: [],
    topbarMeta: [],
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
    setTopbarMeta(room, score, moves) {
      this.topbarMeta.push([room, score, moves]);
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

function testDebugCommandTogglesDebugOutput() {
  const ui = createUi();
  const controller = new GameIoController(ui);
  controller.vm = { haltReason: null };

  controller._handleVmSoundEffect({ number: 99, effect: 2 });
  assert.deepStrictEqual(ui.lines, [], 'debug output should stay hidden by default');

  controller.submitCommand('$DEBUG');
  controller._handleVmSoundEffect({ number: 99, effect: 2 });
  controller.submitCommand('$DEBUG');
  controller._handleVmSoundEffect({ number: 99, effect: 2 });

  assert.ok(ui.lines.includes('Debug output is now on.'), '$DEBUG should report when debug output is enabled');
  assert.ok(ui.lines.includes('Debug output is now off.'), '$DEBUG should report when debug output is disabled');
  assert.strictEqual(
    ui.lines.filter(line => line.startsWith('[SFX debug]')).length,
    1,
    'debug output should only be emitted while debug mode is enabled'
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
      'Sound effects are now off.',
      'Sound effects are now on.',
    ],
    '$SOUND should toggle interpreter sound preference without requiring VM input'
  );
  assert.deepStrictEqual(
    ui.statuses.slice(-2),
    [
      ['Interpreter command', 'SFX off'],
      ['Interpreter command', 'SFX on'],
    ],
    '$SOUND should update interpreter status when toggled'
  );
}

function testGameSoundAliasWorksWithoutVmInput() {
  const ui = createUi();
  const musicStates = [];
  const controller = new GameIoController(ui);
  controller.vm = { haltReason: null };
  controller.onGameMusicPreferenceChanged = enabled => musicStates.push(enabled);

  controller.submitCommand('$GAMESOUND');

  assert.deepStrictEqual(
    ui.lines,
    ['Game music is now off.'],
    '$GAMESOUND should toggle game music preference'
  );
  assert.deepStrictEqual(musicStates, [false], '$GAMESOUND should notify music preference changes');
}

function testPlainLoadShowsRestoreHint() {
  const ui = createUi();
  const controller = new GameIoController(ui);
  controller.vm = { haltReason: 'input' };

  controller.submitCommand('load');

  assert.ok(
    ui.lines.includes('Use "restore" for the story command, or "$LOAD" for interpreter slot loading.'),
    'plain load should show a restore/$LOAD hint instead of going through the story parser'
  );
  assert.deepStrictEqual(
    ui.statuses.slice(-1)[0],
    ['Command hint', 'Use restore or $LOAD'],
    'plain load hint should update the status line'
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

function testGameMusicToggleDoesNotDisableSoundEffects() {
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
      7: { src: './data/sample-7.mp3', class: 'sfx' },
    },
    audioFactory() {
      return fakeAudio;
    },
  });
  controller.vm = { haltReason: null };

  controller.submitCommand('$GAMESOUND');
  controller._handleVmSoundEffect({ number: 7, effect: 2 });

  assert.strictEqual(fakeAudio.playCalls, 1, 'turning game music off should not block sound effects');
}

function testSoundToggleDoesNotDisableMusicClassPlayback() {
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
      1: { src: './music.mp3', class: 'music' },
    },
    audioFactory() {
      return fakeAudio;
    },
  });
  controller.vm = { haltReason: null };

  controller.submitCommand('$SOUND');
  controller._handleVmSoundEffect({ number: 1, effect: 2 });

  assert.strictEqual(fakeAudio.playCalls, 1, 'turning sound effects off should not block music-class playback');
}

function testSfxVolumeMultiplierAffectsPlaybackVolume() {
  const ui = createUi();
  const fakeAudio = {
    loop: false,
    paused: true,
    currentTime: 0,
    volume: 1,
    addEventListener() {},
    play() {
      this.paused = false;
      return Promise.resolve();
    },
    pause() {
      this.paused = true;
    },
  };
  const controller = new GameIoController(ui, {
    soundCatalog: {
      7: { src: './sfx.wav', class: 'sfx' },
    },
    audioFactory() {
      return fakeAudio;
    },
  });

  controller.setSoundEffectsVolume(0.25);
  controller._handleVmSoundEffect({ number: 7, effect: 2 });

  assert.strictEqual(fakeAudio.volume, 0.25, 'SFX volume slider should scale active sound playback volume');
}

function testMusicVolumeMultiplierAffectsPlaybackVolume() {
  const ui = createUi();
  const fakeAudio = {
    loop: false,
    paused: true,
    currentTime: 0,
    volume: 1,
    addEventListener() {},
    play() {
      this.paused = false;
      return Promise.resolve();
    },
    pause() {
      this.paused = true;
    },
  };
  const controller = new GameIoController(ui, {
    soundCatalog: {
      1: { src: './music.mp3', class: 'music' },
    },
    audioFactory() {
      return fakeAudio;
    },
  });

  controller.setGameMusicVolume(0.4);
  controller._handleVmSoundEffect({ number: 1, effect: 2 });

  assert.strictEqual(fakeAudio.volume, 0.4, 'music volume slider should scale active music playback volume');
}

function testMissingMappedSoundWarnsOnce() {
  const ui = createUi();
  const controller = new GameIoController(ui);

  controller._handleVmSoundEffect({ number: 99, effect: 2 });
  controller._handleVmSoundEffect({ number: 99, effect: 2 });

  const debugLines = ui.lines.filter(line => line.startsWith('[SFX debug]'));
  assert.strictEqual(debugLines.length, 0, 'debug lines should stay hidden until debug mode is enabled');
}

function testVmStatusSnapshotUpdatesTopbarAndRoomChanges() {
  const ui = createUi();
  const roomChanges = [];
  const controller = new GameIoController(ui, {
    onRoomChanged(roomName) {
      roomChanges.push(roomName);
    },
  });
  let runCount = 0;
  controller.vm = {
    haltReason: null,
    run() {
      runCount++;
      return { haltReason: 'input', quit: false };
    },
    getStatusSnapshot() {
      if (runCount === 0) {
        return { roomName: '', score: 0, moves: 0 };
      }
      return { roomName: 'Terminal Room', score: 5, moves: 12 };
    },
  };

  controller.runVm();

  assert.deepStrictEqual(
    ui.topbarMeta.slice(-1)[0],
    ['Terminal Room', '5', '12'],
    'controller should push room, score, and moves into the topbar UI'
  );
  assert.deepStrictEqual(
    roomChanges,
    ['Terminal Room'],
    'room changes should follow VM status snapshots instead of text heuristics'
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
  controller.submitCommand('$DEBUG');

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

async function testSaveCommandStoresVmSnapshot() {
  const ui = createUi();
  const storage = createSaveStorage();
  const controller = new GameIoController(ui, {
    saveStorage: storage,
  });
  controller.storyMeta = createStoryMeta();
  controller.currentRoomName = 'Terminal Room';
  controller.vm = {
    serializeSaveState() {
      return new Uint8Array([1, 2, 3]);
    },
    getStatusSnapshot() {
      return { roomName: 'Terminal Room', score: 1, moves: 2 };
    },
  };

  controller.submitCommand('$SAVE 2');
  await flushAsyncWork();

  const record = await storage.getSave('lurking-horror-r219-870912', 2);
  assert.ok(record, 'save command should persist a slot');
  assert.strictEqual(record.label, 'Slot 2 - Terminal Room', 'save label should include slot and room');
  assert.ok(ui.lines.some(line => line.includes('Saved slot 2')), 'save command should report success');
}

async function testLoadCommandRestoresVmSnapshot() {
  const ui = createUi();
  const storage = createSaveStorage();
  const controller = new GameIoController(ui, {
    saveStorage: storage,
  });
  controller.storyMeta = createStoryMeta();
  let restored = null;
  controller.vm = {
    run() {
      return { haltReason: 'input', quit: false };
    },
    restoreSaveState(bytes) {
      restored = Array.from(new Uint8Array(bytes));
    },
    getStatusSnapshot() {
      return { roomName: 'Restored Room', score: 7, moves: 8 };
    },
  };

  await storage.putSave({
    storyId: 'lurking-horror-r219-870912',
    slot: 1,
    label: 'Slot 1 - Saved',
    serial: '870912',
    release: 219,
    checksum: 0x747a,
    quetzalData: new Uint8Array([9, 8, 7]),
  });

  controller.submitCommand('$LOAD 1');
  await flushAsyncWork();

  assert.deepStrictEqual(restored, [9, 8, 7], 'load command should restore saved bytes into the VM');
  assert.ok(ui.lines.some(line => line.includes('Loaded slot 1')), 'load command should report success');
  assert.deepStrictEqual(
    ui.topbarMeta.slice(-1)[0],
    ['Restored Room', '7', '8'],
    'load should refresh room and score metadata after restore'
  );
}

async function testSavesCommandListsSlots() {
  const ui = createUi();
  const storage = createSaveStorage();
  const controller = new GameIoController(ui, {
    saveStorage: storage,
  });
  controller.storyMeta = createStoryMeta();
  controller.vm = {
    getStatusSnapshot() {
      return { roomName: 'Terminal Room', score: 0, moves: 0 };
    },
  };

  await storage.putSave({
    storyId: 'lurking-horror-r219-870912',
    slot: 3,
    label: 'Slot 3 - Terminal Room',
    serial: '870912',
    release: 219,
    checksum: 0x747a,
    quetzalData: new Uint8Array([1]),
  });

  controller.submitCommand('$SAVES');
  await flushAsyncWork();

  assert.ok(
    ui.lines.some(line => line.includes('[Save slot 3] Slot 3 - Terminal Room')),
    'save listing should print persisted slots'
  );
}

async function testLoadStopsActiveSfxButKeepsMusic() {
  const ui = createUi();
  const storage = createSaveStorage();
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
    saveStorage: storage,
    soundCatalog: {
      1: { src: './music.mp3', class: 'music' },
      2: { src: './sfx.wav', class: 'sfx' },
    },
    audioFactory(src) {
      return makeAudio(src);
    },
  });
  controller.storyMeta = createStoryMeta();
  controller.vm = {
    run() {
      return { haltReason: 'input', quit: false };
    },
    restoreSaveState() {},
    getStatusSnapshot() {
      return { roomName: 'Restored Room', score: 7, moves: 8 };
    },
  };

  controller._handleVmSoundEffect({ number: 1, effect: 2 });
  controller._handleVmSoundEffect({ number: 2, effect: 2 });

  await storage.putSave({
    storyId: 'lurking-horror-r219-870912',
    slot: 1,
    label: 'Slot 1 - Saved',
    serial: '870912',
    release: 219,
    checksum: 0x747a,
    quetzalData: new Uint8Array([9, 8, 7]),
  });

  controller.submitCommand('$LOAD 1');
  await flushAsyncWork();

  assert.strictEqual(audioBySrc['./sfx.wav'].pauseCalls, 1, 'load should stop active sound effects');
  assert.strictEqual(audioBySrc['./music.mp3'].pauseCalls, 0, 'load should keep active music running');
}

async function testStorySaveOpcodeStoresSuccessfulContinuation() {
  const ui = createUi();
  const storage = createSaveStorage();
  const controller = new GameIoController(ui, {
    saveStorage: storage,
  });
  controller.storyMeta = createStoryMeta();
  controller.currentRoomName = 'Terminal Room';
  let completed = null;
  let runCount = 0;
  controller.vm = {
    run() {
      runCount += 1;
      return runCount === 1
        ? { haltReason: 'save', quit: false }
        : { haltReason: 'input', quit: false };
    },
    serializePendingSaveState() {
      return new Uint8Array([4, 5, 6]);
    },
    completePendingSave(success) {
      completed = success;
    },
    getStatusSnapshot() {
      return { roomName: 'Terminal Room', score: 12, moves: 34 };
    },
  };

  controller.runVm();
  await flushAsyncWork();

  const record = await storage.getSave('lurking-horror-r219-870912', 0);
  assert.ok(record, 'story save opcode should persist the default slot');
  assert.deepStrictEqual(Array.from(new Uint8Array(record.quetzalData)), [4, 5, 6], 'story save should persist the VM-provided continuation snapshot');
  assert.strictEqual(completed, true, 'story save should resume the VM with a successful save result');
  assert.ok(
    ui.statuses.some(([left, right]) => left === 'Story save' && right === 'Saved slot 0'),
    'story save should update the status bar when the slot is written'
  );
}

async function testStoryRestoreOpcodeLoadsDefaultSlot() {
  const ui = createUi();
  const storage = createSaveStorage();
  const controller = new GameIoController(ui, {
    saveStorage: storage,
  });
  controller.storyMeta = createStoryMeta();
  let restored = null;
  let restoreFailureResult = null;
  let runCount = 0;
  controller.vm = {
    run() {
      runCount += 1;
      return runCount === 1
        ? { haltReason: 'restore', quit: false }
        : { haltReason: 'input', quit: false };
    },
    restoreSaveState(bytes) {
      restored = Array.from(new Uint8Array(bytes));
    },
    completePendingRestore(success) {
      restoreFailureResult = success;
    },
    getStatusSnapshot() {
      return { roomName: 'Restored Room', score: 99, moves: 100 };
    },
  };

  await storage.putSave({
    storyId: 'lurking-horror-r219-870912',
    slot: 0,
    label: 'Slot 0 - Terminal Room',
    serial: '870912',
    release: 219,
    checksum: 0x747a,
    quetzalData: new Uint8Array([8, 7, 6]),
  });

  controller.runVm();
  await flushAsyncWork();

  assert.deepStrictEqual(restored, [8, 7, 6], 'story restore should load the default slot into the VM');
  assert.strictEqual(restoreFailureResult, null, 'successful story restore should not take the failure continuation');
  assert.deepStrictEqual(
    ui.topbarMeta.slice(-1)[0],
    ['Restored Room', '99', '100'],
    'story restore should refresh room, score, and moves after restore'
  );
}

async function testStoryRestoreStopsMusicWhenRestoredStateStartsSfx() {
  const ui = createUi();
  const storage = createSaveStorage();
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
    saveStorage: storage,
    soundCatalog: {
      1: { src: './music.mp3', class: 'music' },
      2: { src: './sfx.wav', class: 'sfx' },
    },
    audioFactory(src) {
      return makeAudio(src);
    },
  });
  controller.storyMeta = createStoryMeta();
  let runCount = 0;
  controller.vm = {
    run() {
      runCount += 1;
      if (runCount === 1) {
        return { haltReason: 'restore', quit: false };
      }
      controller._handleVmSoundEffect({ number: 2, effect: 2 });
      return { haltReason: 'input', quit: false };
    },
    restoreSaveState() {},
    completePendingRestore() {},
    getStatusSnapshot() {
      return { roomName: 'Restored Room', score: 3, moves: 4 };
    },
  };

  controller._handleVmSoundEffect({ number: 1, effect: 2 });
  await storage.putSave({
    storyId: 'lurking-horror-r219-870912',
    slot: 0,
    label: 'Slot 0 - Saved',
    serial: '870912',
    release: 219,
    checksum: 0x747a,
    quetzalData: new Uint8Array([8, 7, 6]),
  });

  controller.runVm();
  await flushAsyncWork();

  assert.strictEqual(audioBySrc['./music.mp3'].pauseCalls, 1, 'restore should stop music if restored execution starts a sound effect');
  assert.strictEqual(audioBySrc['./sfx.wav'].playCalls, 1, 'restore should start the restored sound effect');
}

async function run() {
  testOutputBuffering();
  testFlushAtRunBoundary();
  testComputerHelpAddsManualNote();
  testComputerHelpAddsManualNoteRegardlessOfRoomState();
  testDebugCommandTogglesDebugOutput();
  testSoundInterpreterCommandWorksWithoutVmInput();
  testGameSoundAliasWorksWithoutVmInput();
  testPlainLoadShowsRestoreHint();
  testMappedSoundPlaybackRespectsPreference();
  testGameMusicToggleDoesNotDisableSoundEffects();
  testSoundToggleDoesNotDisableMusicClassPlayback();
  testSfxVolumeMultiplierAffectsPlaybackVolume();
  testMusicVolumeMultiplierAffectsPlaybackVolume();
  testMissingMappedSoundWarnsOnce();
  testVmStatusSnapshotUpdatesTopbarAndRoomChanges();
  testStartingNewSampleStopsPreviousSample();
  testDefaultSfxLoopsUntilExplicitStop();
  testMusicAndSfxUseSeparateReplacementGroups();
  testSoundStatsAllPrintsEventBreakdown();
  testSoundEventCommandTriggersSyntheticPlayback();
  await testSaveCommandStoresVmSnapshot();
  await testLoadCommandRestoresVmSnapshot();
  await testLoadStopsActiveSfxButKeepsMusic();
  await testSavesCommandListsSlots();
  await testStorySaveOpcodeStoresSuccessfulContinuation();
  await testStoryRestoreOpcodeLoadsDefaultSlot();
  await testStoryRestoreStopsMusicWhenRestoredStateStartsSfx();
  console.log('I/O controller output tests passed.');
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
