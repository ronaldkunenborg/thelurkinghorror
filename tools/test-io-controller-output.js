'use strict';

const assert = require('assert');
const { GameIoController } = require('../src/io.js');
const mapData = require('../src/map-data.js');
const { MapDiscoveryTracker } = require('../src/map-discovery.js');

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
    inputEnabled: true,
    lineClasses: [],
    appendOutput(text, cssClass) {
      this.lines.push(text);
      const line = {
        textContent: text,
        classes: [],
        classList: {
          add: className => {
            if (!line.classes.includes(className)) {
              line.classes.push(className);
            }
          },
          remove: className => {
            const index = line.classes.indexOf(className);
            if (index !== -1) {
              line.classes.splice(index, 1);
            }
          },
          contains: className => {
            return line.classes.includes(className);
          },
        },
      };
      this.lineClasses.push(line.classes);
      if (cssClass) {
        line.classList.add(cssClass);
      }
      return line;
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
    setInputEnabled(enabled) {
      this.inputEnabled = !!enabled;
    },
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

function testRoomDebugLookIncludesExits() {
  const ui = createUi();
  const controller = new GameIoController(ui);
  controller.debugEnabled = true;
  controller.vm = {
    getStatusSnapshot() {
      return { roomObjectId: 176, roomName: 'Terminal Room' };
    },
    _findPropertyAddress(objectId, propertyId) {
      if (objectId !== 176) {
        return 0;
      }
      if (propertyId === 22 || propertyId === 29 || propertyId === 31) {
        return 100 + propertyId;
      }
      return 0;
    },
  };

  controller._appendRoomDebugOutput('look');

  assert.ok(
    ui.lines.some(line =>
      line === '[RoomDebug][look] room=Terminal Room (176) exits=down,east,north'
    ),
    'Room debug output for look should include resolved exits'
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

function testSfxCommandTriggersMappedPlayback() {
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
      6: { src: './s6.wav', loop: false },
    },
    audioFactory() {
      return fakeAudio;
    },
  });
  controller.vm = { haltReason: null };

  controller.submitCommand('$SFX 6');

  assert.strictEqual(fakeAudio.playCalls, 1, '$SFX should trigger mapped audio playback');
  assert.ok(
    ui.lines.some(line => line.includes('[SFX command] Triggering sound effect #6.')),
    '$SFX should print command confirmation'
  );
  assert.deepStrictEqual(
    ui.statuses.slice(-1)[0],
    ['Interpreter command', 'SFX #6'],
    '$SFX should update status line'
  );
}

function testSfxCommandRejectsOutOfRangeIds() {
  const ui = createUi();
  const controller = new GameIoController(ui);
  controller.vm = { haltReason: null };

  controller.submitCommand('$SFX 19');

  assert.ok(
    ui.lines.includes('Invalid sound-effect number. Valid range for The Lurking Horror is 1-18.'),
    '$SFX should reject IDs outside TLH range'
  );
  assert.deepStrictEqual(
    ui.statuses.slice(-1)[0],
    ['Interpreter command', 'SFX range'],
    '$SFX range rejection should update status line'
  );
}

function testMapCommandOpensVisitedMap() {
  const ui = createUi();
  const mapRequests = [];
  const controller = new GameIoController(ui, {
    onMapRequested() {
      mapRequests.push('open');
    },
  });
  controller.vm = { haltReason: null };

  controller.submitCommand('$MAP');

  assert.deepStrictEqual(
    mapRequests,
    ['open'],
    '$MAP should invoke map-open callback exactly once'
  );
  assert.ok(
    ui.lines.includes('Opened the visited-location map.'),
    '$MAP should print confirmation output'
  );
  assert.deepStrictEqual(
    ui.statuses.slice(-1)[0],
    ['Interpreter command', 'Map'],
    '$MAP should update status line'
  );
}

function testMapCommandCanBeDisabledWithoutDisablingDiscovery() {
  const ui = createUi();
  const mapRequests = [];
  const controller = new GameIoController(ui, {
    isMapAvailable() {
      return false;
    },
    onMapRequested() {
      mapRequests.push('open');
    },
    mapDiscoveryTracker: {
      serialize() {
        return { version: 1, currentNodeId: 'computer', visitedNodeIds: ['computer'] };
      },
    },
  });
  controller.vm = { haltReason: null };

  controller.submitCommand('$MAP');

  assert.deepStrictEqual(mapRequests, [], 'disabled map command should not open the map UI');
  assert.ok(
    ui.lines.includes('The visited-location map is disabled for this experience profile.'),
    'disabled map command should explain the experience-profile restriction'
  );
  assert.deepStrictEqual(
    controller._getMapDiscoverySnapshot(),
    { version: 1, currentNodeId: 'computer', visitedNodeIds: ['computer'] },
    'disabling map availability should not disable map discovery data'
  );
}

function testMapDiscoveryTracksVisitedKnownAndTraversedLinks() {
  const tracker = new MapDiscoveryTracker({ mapData });

  let state = tracker.observeRoom(190, { exits: ['east'] });
  assert.ok(state.visitedNodeIds.includes('mass'), 'Mass. Ave. should be marked visited');
  assert.ok(
    state.knownLinks.some(link => link.fromNodeId === 'mass' && link.toNodeId === 'ic1'),
    'visible east exit should create a known link from Mass. Ave.'
  );

  state = tracker.observeRoom(218, { command: 'east', exits: [] });
  assert.ok(state.visitedNodeIds.includes('ic1'), 'successful movement should visit Infinite Corridor W1');
  assert.ok(
    state.traversedLinks.some(link => link.fromNodeId === 'mass' && link.toNodeId === 'ic1'),
    'successful movement should confirm the traversed link'
  );

  state = tracker.observeRoom(176, { exits: ['south'] });
  assert.ok(
    state.knownLinks.some(link => link.fromNodeId === 'terminal' && link.toNodeId === 'second'),
    'visible reverse-only exits should still create known map links'
  );
}

function testMapDiscoveryMatchesPresentationEdgeDiscoveryCommands() {
  const tracker = new MapDiscoveryTracker({ mapData });

  let state = tracker.observeRoom(150, { exits: ['down'] });
  assert.ok(
    state.knownLinks.some(link => link.fromNodeId === 'fn' && link.toNodeId === 'cp'),
    'VM down exit from Fruits and Nuts should reveal the horizontal presentation link to Cluttered Passage'
  );

  state = tracker.observeRoom(179, { command: 'down', exits: ['up'] });
  assert.ok(
    state.traversedLinks.some(link => link.fromNodeId === 'fn' && link.toNodeId === 'cp'),
    'VM down traversal should confirm the horizontal presentation link to Cluttered Passage'
  );

  state = tracker.observeRoom(179, { exits: ['up'] });
  assert.ok(
    state.knownLinks.some(link => link.fromNodeId === 'cp' && link.toNodeId === 'fn'),
    'VM up exit from Cluttered Passage should reveal the reverse horizontal presentation link'
  );
}

function testMapDiscoveryCanRecordKnownOneWayWarningLinkWithoutVisitingTarget() {
  const tracker = new MapDiscoveryTracker({ mapData });
  let state = tracker.observeRoom(210, { exits: ['south'] });

  const visibleDoorLink = state.knownLinks.find(link => link.fromNodeId === 'ic3' && link.toNodeId === 'great_court');
  assert.ok(visibleDoorLink, 'visible south door should reveal the Great Court link');
  assert.strictEqual(
    visibleDoorLink.oneWay,
    false,
    'visible south door alone should not mark the Great Court link one-way before the warning'
  );

  state = tracker.recordKnownLink('ic3', 'great_court', {
    command: 'south',
    oneWay: true,
  });

  assert.ok(state.visitedNodeIds.includes('ic3'), 'current Infinite Corridor node should remain visited');
  assert.ok(!state.visitedNodeIds.includes('great_court'), 'warning should not reveal Great Court as visited');
  assert.ok(
    state.knownLinks.some(link =>
      link.fromNodeId === 'ic3' &&
      link.toNodeId === 'great_court' &&
      link.command === 'south' &&
      link.oneWay === true
    ),
    'warning should reveal the one-way Great Court link'
  );
  assert.ok(
    !state.traversedLinks.some(link => link.fromNodeId === 'ic3' && link.toNodeId === 'great_court'),
    'warning should not mark the Great Court link as traversed'
  );
}

function testGreatCourtWarningRevealsOneWayMapLink() {
  const ui = createUi();
  const tracker = new MapDiscoveryTracker({ mapData });
  const events = [];
  const controller = new GameIoController(ui, {
    mapDiscoveryTracker: tracker,
    onMapDiscoveryChanged(state) {
      events.push(state);
    },
  });

  tracker.observeRoom(210, { exits: [] });
  controller._appendVmLine("Remember, this is one of the doors that's always locked at night. You won't be able to get back in if you go out.");

  const state = tracker.serialize();
  assert.ok(
    state.knownLinks.some(link =>
      link.fromNodeId === 'ic3' &&
      link.toNodeId === 'great_court' &&
      link.oneWay === true
    ),
    'Great Court warning should reveal the one-way link'
  );
  assert.ok(!state.visitedNodeIds.includes('great_court'), 'Great Court tile should remain hidden until visited');
  assert.ok(events.length > 0, 'warning should notify the map renderer');
}

function testMapDiscoveryIgnoresDreamRooms() {
  const tracker = new MapDiscoveryTracker({ mapData });
  const state = tracker.observeRoom(152, { exits: ['down'] });
  assert.strictEqual(state.currentNodeId, '', 'dream rooms should not become current map nodes');
  assert.deepStrictEqual(state.visitedNodeIds, [], 'dream rooms should not be revealed');
}

function testMapDiscoveryRestoresVisitedRoomsFromVmFallback() {
  const tracker = new MapDiscoveryTracker({ mapData });
  const state = tracker.restoreVisitedRooms([176, 137, 152], { currentRoomId: 137 });

  assert.ok(state.visitedRoomIds.includes(176), 'VM fallback should preserve visited Terminal Room');
  assert.ok(state.visitedRoomIds.includes(137), 'VM fallback should preserve visited Second Floor');
  assert.ok(!state.visitedRoomIds.includes(152), 'VM fallback should ignore dream rooms');
  assert.ok(state.visitedNodeIds.includes('terminal'), 'VM fallback should reveal Terminal Room node');
  assert.ok(state.visitedNodeIds.includes('second'), 'VM fallback should reveal Second Floor node');
  assert.strictEqual(state.currentNodeId, 'second', 'VM fallback should restore the current map node');
}

function testMapDiscoveryFallbackInfersSingleLinksBreadthFirst() {
  const tracker = new MapDiscoveryTracker({ mapData });
  const state = tracker.restoreVisitedRooms([65, 137, 176], { currentRoomId: 176 });

  assert.ok(
    state.knownLinks.some(link => link.fromNodeId === 'computer' && link.toNodeId === 'second'),
    'VM fallback should infer the unique Computer Center -> Second Floor route link'
  );
  assert.ok(
    state.knownLinks.some(link => link.fromNodeId === 'second' && link.toNodeId === 'terminal'),
    'VM fallback should continue breadth-first to Terminal Room'
  );

  const incomplete = new MapDiscoveryTracker({ mapData }).restoreVisitedRooms([65, 176], { currentRoomId: 176 });
  assert.ok(
    !incomplete.knownLinks.some(link => link.toNodeId === 'terminal'),
    'VM fallback should not bridge through unvisited intermediate tiles'
  );
}

function testRestartResetsMapDiscovery() {
  const ui = createUi();
  const events = [];
  const tracker = {
    resetCalls: 0,
    observedRooms: [],
    reset() {
      this.resetCalls++;
    },
    serialize() {
      return {
        version: 1,
        currentRoomId: this.observedRooms[this.observedRooms.length - 1] || 0,
        visitedRoomIds: this.observedRooms.slice(),
        visitedNodeIds: [],
        knownLinks: [],
        traversedLinks: [],
      };
    },
    observeRoom(roomId) {
      this.observedRooms.push(roomId);
    },
  };
  const controller = new GameIoController(ui, {
    mapDiscoveryTracker: tracker,
    onMapDiscoveryChanged(state) {
      events.push(state);
    },
  });
  controller.currentRoomId = 137;
  controller.currentRoomName = 'Second Floor';
  controller.lastVmRestartSerial = 0;
  controller.vm = {
    restartSerial: 1,
    run() {
      return { haltReason: 'input', quit: false };
    },
    getStatusSnapshot() {
      return { roomObjectId: 65, roomName: 'Computer Center', score: 0, moves: 0 };
    },
    _findPropertyAddress() {
      return 0;
    },
  };

  controller.runVm();

  assert.strictEqual(tracker.resetCalls, 1, 'VM restart should reset map discovery metadata');
  assert.deepStrictEqual(tracker.observedRooms, [65], 'restart should observe only the restarted current room');
  assert.ok(
    events.some(state => state && state.currentRoomId === 0),
    'restart should notify the UI about the cleared map before re-observing the start room'
  );
}

function testCreditsCommandOpensCreditsPanel() {
  const ui = createUi();
  const creditRequests = [];
  const controller = new GameIoController(ui, {
    onCreditsRequested() {
      creditRequests.push('open');
    },
  });
  controller.vm = { haltReason: null };

  controller.submitCommand('$CREDITS');

  assert.deepStrictEqual(
    creditRequests,
    ['open'],
    '$CREDITS should invoke credits-open callback exactly once'
  );
  assert.ok(
    ui.lines.includes('Opened the credits panel.'),
    '$CREDITS should print confirmation output'
  );
  assert.deepStrictEqual(
    ui.statuses.slice(-1)[0],
    ['Interpreter command', 'Credits'],
    '$CREDITS should update status line'
  );
}

async function testSaveAndLoadCommandsWithoutSlotOpenSlotPicker() {
  const ui = createUi();
  const storage = createSaveStorage();
  const menuRequests = [];
  const controller = new GameIoController(ui, {
    saveStorage: storage,
    onSaveLoadMenuRequested(payload) {
      menuRequests.push(payload);
    },
  });
  controller.storyMeta = createStoryMeta();
  controller.vm = {
    haltReason: null,
    getStatusSnapshot() {
      return { roomName: 'Terminal Room', score: 5, moves: 12 };
    },
  };

  controller.submitCommand('$SAVE');
  controller.submitCommand('$LOAD');
  await flushAsyncWork();

  assert.strictEqual(menuRequests.length, 2, '$SAVE/$LOAD without slot should open the slot picker');
  assert.strictEqual(menuRequests[0].mode, 'save', 'first picker request should be save mode');
  assert.strictEqual(menuRequests[1].mode, 'load', 'second picker request should be load mode');
}

function testSaveLoadRejectOutOfRangeSlots() {
  const ui = createUi();
  const controller = new GameIoController(ui);
  controller.storyMeta = createStoryMeta();
  controller.vm = {
    haltReason: null,
    getStatusSnapshot() {
      return { roomName: 'Terminal Room', score: 5, moves: 12 };
    },
  };

  controller.submitCommand('$SAVE 9');
  controller.submitCommand('$LOAD 5');

  assert.ok(
    ui.lines.some(line => line.includes('Save failed: slot must be between 0 and 4.')),
    'out-of-range save slot should be rejected'
  );
  assert.ok(
    ui.lines.some(line => line.includes('Load failed: slot must be between 0 and 4.')),
    'out-of-range load slot should be rejected'
  );
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

function testDefaultSfxIsOneShotUnlessConfigured() {
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
  assert.strictEqual(fakeAudio.loop, false, 'unclassified game sound should default to one-shot');
  assert.strictEqual(fakeAudio.playCalls, 1, 'start should trigger playback');

  controller._handleVmSoundEffect({ number: 10, effect: 2 });
  assert.strictEqual(
    fakeAudio.playCalls,
    1,
    'repeated start for the same active sample should not restart playback while active'
  );

  controller._handleVmSoundEffect({ number: 10, effect: 3 });
  assert.strictEqual(fakeAudio.pauseCalls, 1, 'explicit stop should halt active sample');
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
  assert.strictEqual(audioBySrc['./sfx-a.wav'].loop, false, 'SFX should default to one-shot');

  controller._handleVmSoundEffect({ number: 3, effect: 2 });
  assert.strictEqual(audioBySrc['./music-a.mp3'].pauseCalls, 1, 'new music should replace old music');
}

function testGameOverMusicStartsOnlyOnDeathBanner() {
  const ui = createUi();
  const audioBySrc = {};
  const gameOverEvents = [];

  function makeAudio(src) {
    const audio = {
      src,
      loop: false,
      paused: true,
      currentTime: 0,
      volume: 0,
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
    audioFactory(src) {
      return makeAudio(src);
    },
    onGameOver(payload) {
      gameOverEvents.push(payload);
    },
  });

  controller._appendVmLine('Dead Storage');
  assert.strictEqual(gameOverEvents.length, 0, 'ordinary room names should not emit game-over events');
  assert.strictEqual(
    audioBySrc['./assets/audio/game-over-desmae-877160.mp3'],
    undefined,
    'ordinary room names containing dead should not start game-over music'
  );

  controller._appendVmLine('   ****  You have died  ****');
  const gameOverAudio = audioBySrc['./assets/audio/game-over-desmae-877160.mp3'];
  assert.ok(gameOverAudio, 'death banner should create game-over audio');
  assert.strictEqual(gameOverEvents.length, 1, 'death banner should emit one game-over event');
  assert.strictEqual(gameOverAudio.playCalls, 1, 'death banner should start game-over music');
  assert.strictEqual(gameOverAudio.loop, false, 'game-over music should play as a one-shot track');
}

function testGameOverMusicStopsOnRecoveryCommand() {
  const ui = createUi();
  const audioBySrc = {};

  function makeAudio(src) {
    const audio = {
      src,
      loop: false,
      paused: true,
      currentTime: 0,
      volume: 0,
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
    audioFactory(src) {
      return makeAudio(src);
    },
  });
  controller.vm = {
    haltReason: 'input',
    provideInput() {},
    run() {
      return { haltReason: 'input', quit: false };
    },
  };

  controller._appendVmLine('****  You have died  ****');
  const gameOverAudio = audioBySrc['./assets/audio/game-over-desmae-877160.mp3'];
  controller.submitCommand('restart');

  assert.strictEqual(gameOverAudio.pauseCalls, 1, 'restart should stop game-over music before continuing');
  assert.strictEqual(gameOverAudio.currentTime, 0, 'restart should rewind game-over music');
}

function testGameMusicDisableStopsGameOverMusic() {
  const ui = createUi();
  const audioBySrc = {};

  function makeAudio(src) {
    const audio = {
      src,
      loop: false,
      paused: true,
      currentTime: 0,
      volume: 0,
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
    audioFactory(src) {
      return makeAudio(src);
    },
  });

  controller._appendVmLine('****  You have died  ****');
  const gameOverAudio = audioBySrc['./assets/audio/game-over-desmae-877160.mp3'];
  controller.setGameMusicEnabled(false);

  assert.strictEqual(gameOverAudio.pauseCalls, 1, 'disabling game music should stop game-over music');
  controller._appendVmLine('****  You have died  ****');
  assert.strictEqual(gameOverAudio.playCalls, 1, 'disabled game music should prevent replaying game-over music');
}

async function testGameOverMusicCanWaitForExternalFade() {
  const ui = createUi();
  const audioBySrc = {};
  let releaseFade = null;
  const gameOverEvents = [];

  function makeAudio(src) {
    const audio = {
      src,
      loop: false,
      paused: true,
      currentTime: 0,
      volume: 0,
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
    audioFactory(src) {
      return makeAudio(src);
    },
    onBeforeGameOverMusicStart() {
      return new Promise(resolve => {
        releaseFade = resolve;
      });
    },
    onGameOver(payload) {
      gameOverEvents.push(payload);
    },
  });

  controller._appendVmLine('****  You have died  ****');
  const gameOverAudio = audioBySrc['./assets/audio/game-over-desmae-877160.mp3'];

  assert.strictEqual(gameOverAudio, undefined, 'game-over audio should not be created before external fade completes');
  assert.strictEqual(gameOverEvents.length, 0, 'game-over event should wait for external fade completion');
  releaseFade();
  await flushAsyncWork();

  assert.strictEqual(gameOverEvents.length, 1, 'game-over event should fire after external fade completes');
  assert.strictEqual(
    audioBySrc['./assets/audio/game-over-desmae-877160.mp3'].playCalls,
    1,
    'game-over audio should start after external fade completes'
  );
}

async function testWinGameMusicStartsOnVictoryTextAndSuppressesQuitSplash() {
  const ui = createUi();
  const audioBySrc = {};
  const winEvents = [];
  const storyQuitEvents = [];

  function makeAudio(src) {
    const audio = {
      src,
      loop: false,
      paused: true,
      currentTime: 0,
      volume: 0,
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
    audioFactory(src) {
      return makeAudio(src);
    },
    onWinGame(payload) {
      winEvents.push(payload);
    },
    onStoryQuit(payload) {
      storyQuitEvents.push(payload);
    },
  });

  controller._appendVmLine('Something rises out of the mud, slowly straightening.');
  controller._appendVmLine('The hacker, mud-covered and weak, staggers to his feet. "Can I have my key back?" he asks.');

  const winAudio = audioBySrc['./assets/audio/743416_Game-over-victory.mp3'];
  assert.ok(winAudio, 'victory text should create victory audio');
  assert.strictEqual(winAudio.playCalls, 1, 'victory text should start victory music');
  assert.strictEqual(winAudio.loop, false, 'victory music should play as a one-shot track');
  assert.strictEqual(winEvents.length, 1, 'victory text should emit one victory event');

  controller.vm = {
    haltReason: 'quit',
    run() {
      return { haltReason: 'quit', quit: true };
    },
  };
  await controller.runVm();

  assert.strictEqual(storyQuitEvents.length, 0, 'victory finish should not return to splash through story quit callback');
  assert.deepStrictEqual(ui.statuses[ui.statuses.length - 1], ['Game completed', 'Victory']);
}

function testGameMusicDisableStopsWinGameMusic() {
  const ui = createUi();
  const audioBySrc = {};

  function makeAudio(src) {
    const audio = {
      src,
      loop: false,
      paused: true,
      currentTime: 0,
      volume: 0,
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
    audioFactory(src) {
      return makeAudio(src);
    },
  });

  controller._appendVmLine('Something rises out of the mud, slowly straightening.');
  controller._appendVmLine('The hacker, mud-covered and weak, staggers to his feet. "Can I have my key back?" he asks.');
  const winAudio = audioBySrc['./assets/audio/743416_Game-over-victory.mp3'];
  controller.setGameMusicEnabled(false);

  assert.strictEqual(winAudio.pauseCalls, 1, 'disabling game music should stop victory music');
  assert.strictEqual(winAudio.currentTime, 0, 'disabling game music should rewind victory music');
}

async function testPcPaperDreamParagraphUsesEnochianAndDelaysDreamOutput() {
  const ui = createUi();
  const controller = new GameIoController(ui, {
    pcPaperDreamRevealMs: 1,
    pcPaperDreamReturnMs: 1,
  });
  controller.vm = {
    haltReason: 'input',
    provideInput(command) {
      assert.strictEqual(command, 'click more');
      this.haltReason = 'input';
    },
    async run() {
      controller._appendVmLine('You faint, and when you awaken...');
      controller._appendVmLine('Place');
      return { haltReason: 'input' };
    },
  };

  controller._appendVmLine(
    'The fourth page is a photograph. You try to recoil from the screen, but cannot. Fascinated and repelled at the same time, you wonder: is that a mouth, and what is in it?'
  );

  assert.deepStrictEqual(
    ui.lines,
    [
      'The fourth page is a photograph. You try to recoil from the screen, but cannot. Fascinated and repelled at the same time, you wonder: is that a mouth, and what is in it?',
    ],
    'fourth-page paragraph should be shown normally before the final click more'
  );
  assert.strictEqual(
    ui.lineClasses[0].includes('story-enochian-reveal'),
    false,
    'trigger paragraph should remain normal before the final click more'
  );
  assert.strictEqual(ui.inputEnabled, true, 'input should remain enabled after the fourth-page paragraph');

  controller.submitCommand('click more');

  assert.strictEqual(
    ui.lineClasses[0].includes('story-enochian-reveal'),
    true,
    'previous paragraph should become Enochian after the final click more'
  );
  assert.deepStrictEqual(
    ui.lines,
    [
      'The fourth page is a photograph. You try to recoil from the screen, but cannot. Fascinated and repelled at the same time, you wonder: is that a mouth, and what is in it?',
    ],
    'dream output should be delayed while the previous paragraph changes to Enochian'
  );
  assert.strictEqual(ui.inputEnabled, false, 'input should be disabled during the scripted reveal');

  await new Promise(resolve => setTimeout(resolve, 5));

  assert.deepStrictEqual(
    ui.lines.slice(-2),
    ['You faint, and when you awaken...', 'Place'],
    'delayed dream output should flush after the previous paragraph has changed'
  );
  assert.strictEqual(
    ui.lineClasses[0].includes('story-enochian-return'),
    true,
    'previous paragraph should begin returning to normal after dream output appears'
  );

  await new Promise(resolve => setTimeout(resolve, 20));

  assert.strictEqual(ui.lineClasses[0].includes('story-enochian-reveal'), false, 'trigger paragraph should return to normal text');
  assert.strictEqual(ui.lineClasses[0].includes('story-enochian-return'), false, 'return animation class should be removed');
  assert.strictEqual(ui.inputEnabled, true, 'input should be re-enabled after the scripted reveal completes');
}

async function testPcPaperDreamOutputResumesAfterScriptedReveal() {
  const ui = createUi();
  const controller = new GameIoController(ui, {
    pcPaperDreamRevealMs: 1,
    pcPaperDreamReturnMs: 1,
  });
  controller.vm = {
    haltReason: 'input',
    provideInput() {
      this.haltReason = 'input';
    },
    async run() {
      controller._appendVmLine('You touch the MORE box, and a new page appears.');
      return { haltReason: 'input' };
    },
  };

  controller._appendVmLine(
    'The fourth page is a photograph. You try to recoil from the screen, but cannot. Fascinated and repelled at the same time, you wonder: is that a mouth, and what is in it?'
  );
  controller.submitCommand('click more');

  assert.strictEqual(
    ui.lines.length,
    1,
    'output should wait while the scripted reveal is active'
  );

  await new Promise(resolve => setTimeout(resolve, 30));

  assert.deepStrictEqual(
    ui.lines.slice(-1),
    ['You touch the MORE box, and a new page appears.'],
    'buffered output should flush after the scripted reveal'
  );

  controller._appendVmLine('You faint, and when you awaken...');

  assert.deepStrictEqual(
    ui.lines.slice(-2),
    ['You touch the MORE box, and a new page appears.', 'You faint, and when you awaken...'],
    'later output should be immediate after the scripted reveal completes'
  );
}

function testPcPaperDreamTransitionBlocksCommands() {
  const ui = createUi();
  const controller = new GameIoController(ui, {
    pcPaperDreamRevealMs: 50,
    pcPaperDreamReturnMs: 50,
  });
  let providedInput = '';
  controller.vm = {
    haltReason: 'input',
    provideInput(command) {
      providedInput = command;
    },
  };

  controller._appendVmLine(
    'The fourth page is a photograph. You try to recoil from the screen, but cannot. Fascinated and repelled at the same time, you wonder: is that a mouth, and what is in it?'
  );
  controller.submitCommand('click more');
  controller.submitCommand('click more');

  assert.strictEqual(providedInput, 'click more', 'the first final click more should be accepted and start the reveal');
  assert.deepStrictEqual(ui.statuses[ui.statuses.length - 1], ['Reading screen', 'Transfixed']);
  controller._clearPcPaperDreamDelay();
}

function testPcPaperDreamParagraphDoesNotTriggerOnDifferentText() {
  const ui = createUi();
  const controller = new GameIoController(ui, {
    pcPaperDreamRevealMs: 1,
    pcPaperDreamReturnMs: 1,
  });

  controller._appendVmLine('The third page is in the same script as the first, but laid out like a poem.');
  controller._appendVmLine('You faint, and when you awaken...');

  assert.deepStrictEqual(
    ui.lines,
    ['The third page is in the same script as the first, but laid out like a poem.', 'You faint, and when you awaken...'],
    'non-trigger output should remain immediate'
  );
  assert.deepStrictEqual(ui.lineClasses.map(classes => classes.slice()), [[], []], 'non-trigger output should not receive story Enochian styling');
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
    mapDiscoveryTracker: {
      serialize() {
        return { version: 1, currentNodeId: 'terminal', visitedNodeIds: ['terminal'] };
      },
    },
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
  assert.deepStrictEqual(
    record.mapDiscovery,
    { version: 1, currentNodeId: 'terminal', visitedNodeIds: ['terminal'] },
    'save command should persist map discovery metadata'
  );
  assert.ok(ui.lines.some(line => line.includes('Saved slot 2')), 'save command should report success');
}

async function testLoadCommandRestoresVmSnapshot() {
  const ui = createUi();
  const storage = createSaveStorage();
  const mapStates = [];
  const controller = new GameIoController(ui, {
    saveStorage: storage,
    mapDiscoveryTracker: new MapDiscoveryTracker({ mapData }),
    onMapDiscoveryChanged(state) {
      mapStates.push(state);
    },
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
      return { roomObjectId: 137, roomName: 'Second Floor', score: 7, moves: 8 };
    },
    _testAttribute(roomId, attribute) {
      return attribute === 6 && (roomId === 176 || roomId === 137);
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
    ['Second Floor', '7', '8'],
    'load should refresh room and score metadata after restore'
  );
  assert.ok(
    mapStates.some(state =>
      state &&
      state.visitedNodeIds.includes('terminal') &&
      state.visitedNodeIds.includes('second') &&
      state.currentNodeId === 'second'
    ),
    'load without map metadata should rebuild visited rooms from VM room attributes'
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

function testQuitHaltInvokesStoryQuitCallback() {
  const ui = createUi();
  const quitEvents = [];
  const controller = new GameIoController(ui, {
    onStoryQuit(payload) {
      quitEvents.push(payload || {});
    },
  });
  controller.vm = {
    run() {
      return { haltReason: 'quit', quit: true };
    },
  };

  controller.runVm();

  assert.strictEqual(quitEvents.length, 1, 'quit halt should invoke onStoryQuit exactly once');
  assert.strictEqual(quitEvents[0].haltReason, 'quit', 'quit payload should include haltReason');
  assert.deepStrictEqual(
    ui.statuses.slice(-1)[0],
    ['Game ended', 'Quit'],
    'quit halt should update status line'
  );
}

function testSameRoomLightRecoveryClearsDarkScene() {
  const ui = createUi();
  const roomChanges = [];
  const controller = new GameIoController(ui, {
    onRoomChanged(roomName, roomId, options) {
      roomChanges.push({ roomName, roomId, isDark: !!(options && options.isDark) });
    },
  });
  controller.currentRoomName = 'Dead Storage';
  controller.currentRoomId = 47;
  controller.lastTurnWasPitchBlack = true;
  controller.lastSceneIsDark = true;
  controller.vm = {
    haltReason: 'input',
    provideInput() {
      this.haltReason = 'running';
    },
    run() {
      controller._handleVmOutput('The flashlight clicks on.\n');
      controller._handleVmOutput('Dead Storage\n');
      controller._handleVmOutput('This is a storage room.\n');
      this.haltReason = 'input';
      return { haltReason: 'input', quit: false };
    },
    getStatusSnapshot() {
      return { roomObjectId: 47, roomName: 'Dead Storage', score: 0, moves: 0 };
    },
  };

  controller.submitCommand('turn flashlight on');

  assert.strictEqual(controller.lastTurnWasPitchBlack, false, 'same-room light evidence should clear dark-scene state');
  assert.ok(
    roomChanges.some(change => change.roomId === 47 && change.isDark === false),
    'same-room lighting recovery should notify onRoomChanged with isDark=false'
  );
}

async function testDestructiveSaveRequiresConfirmation() {
  const ui = createUi();
  const storage = createSaveStorage();
  const confirmCalls = [];
  const controller = new GameIoController(ui, {
    saveStorage: storage,
    onConfirmDestructiveAction(payload) {
      confirmCalls.push(payload);
      return false;
    },
  });
  controller.storyMeta = createStoryMeta();
  controller.currentRoomName = 'Current Room';
  controller.vm = {
    serializeSaveState() {
      return new Uint8Array([1, 2, 3]);
    },
    getStatusSnapshot() {
      return { roomName: 'Current Room', score: 5, moves: 12 };
    },
  };

  await storage.putSave({
    storyId: 'lurking-horror-r219-870912',
    slot: 2,
    label: 'Slot 2 - Better',
    roomName: 'Better Room',
    score: 7,
    moves: 8,
    serial: '870912',
    release: 219,
    checksum: 0x747a,
    quetzalData: new Uint8Array([9, 9, 9]),
  });

  controller.submitCommand('$SAVE 2');
  await flushAsyncWork();

  const record = await storage.getSave('lurking-horror-r219-870912', 2);
  assert.deepStrictEqual(Array.from(new Uint8Array(record.quetzalData)), [9, 9, 9], 'destructive save should be cancelled');
  assert.strictEqual(confirmCalls.length, 1, 'destructive save should ask confirmation');
  assert.ok(ui.lines.includes('Save cancelled.'), 'cancelling destructive save should print feedback');
}

async function testDestructiveLoadRequiresConfirmation() {
  const ui = createUi();
  const storage = createSaveStorage();
  const confirmCalls = [];
  let restored = null;
  const controller = new GameIoController(ui, {
    saveStorage: storage,
    onConfirmDestructiveAction(payload) {
      confirmCalls.push(payload);
      return false;
    },
  });
  controller.storyMeta = createStoryMeta();
  controller.vm = {
    run() {
      return { haltReason: 'input', quit: false };
    },
    restoreSaveState(bytes) {
      restored = Array.from(new Uint8Array(bytes));
    },
    getStatusSnapshot() {
      return { roomName: 'Current Room', score: 10, moves: 20 };
    },
  };

  await storage.putSave({
    storyId: 'lurking-horror-r219-870912',
    slot: 1,
    label: 'Slot 1 - Older',
    roomName: 'Older Room',
    score: 8,
    moves: 30,
    serial: '870912',
    release: 219,
    checksum: 0x747a,
    quetzalData: new Uint8Array([4, 5, 6]),
  });

  controller.submitCommand('$LOAD 1');
  await flushAsyncWork();

  assert.strictEqual(restored, null, 'destructive load should be cancelled when not confirmed');
  assert.strictEqual(confirmCalls.length, 1, 'destructive load should ask confirmation');
  assert.ok(ui.lines.includes('Load cancelled.'), 'cancelling destructive load should print feedback');
}

async function testDestructiveLoadEqualScoreHigherMovesUsesCautiousWording() {
  const ui = createUi();
  const storage = createSaveStorage();
  const confirmCalls = [];
  const controller = new GameIoController(ui, {
    saveStorage: storage,
    onConfirmDestructiveAction(payload) {
      confirmCalls.push(payload);
      return false;
    },
  });
  controller.storyMeta = createStoryMeta();
  controller.vm = {
    run() {
      return { haltReason: 'input', quit: false };
    },
    restoreSaveState() {},
    getStatusSnapshot() {
      return { roomName: 'Current Room', score: 10, moves: 63 };
    },
  };

  await storage.putSave({
    storyId: 'lurking-horror-r219-870912',
    slot: 2,
    label: 'Slot 2 - Later',
    roomName: 'Later Room',
    score: 10,
    moves: 82,
    serial: '870912',
    release: 219,
    checksum: 0x747a,
    quetzalData: new Uint8Array([1, 2, 3]),
  });

  controller.submitCommand('$LOAD 2');
  await flushAsyncWork();

  assert.strictEqual(confirmCalls.length, 1, 'destructive load should ask confirmation');
  assert.ok(
    String(confirmCalls[0].message || '').includes('possibly less progress'),
    'equal-score higher-moves destructive load should use cautious "possibly less progress" wording'
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
    mapDiscoveryTracker: {
      serialize() {
        return { version: 1, currentNodeId: 'terminal', visitedNodeIds: ['terminal'] };
      },
    },
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
  testRoomDebugLookIncludesExits();
  testSoundInterpreterCommandWorksWithoutVmInput();
  testGameSoundAliasWorksWithoutVmInput();
  testSfxCommandTriggersMappedPlayback();
  testSfxCommandRejectsOutOfRangeIds();
  testMapCommandOpensVisitedMap();
  testMapCommandCanBeDisabledWithoutDisablingDiscovery();
  testMapDiscoveryTracksVisitedKnownAndTraversedLinks();
  testMapDiscoveryMatchesPresentationEdgeDiscoveryCommands();
  testMapDiscoveryCanRecordKnownOneWayWarningLinkWithoutVisitingTarget();
  testGreatCourtWarningRevealsOneWayMapLink();
  testMapDiscoveryIgnoresDreamRooms();
  testMapDiscoveryRestoresVisitedRoomsFromVmFallback();
  testMapDiscoveryFallbackInfersSingleLinksBreadthFirst();
  testRestartResetsMapDiscovery();
  testCreditsCommandOpensCreditsPanel();
  await testSaveAndLoadCommandsWithoutSlotOpenSlotPicker();
  testSaveLoadRejectOutOfRangeSlots();
  testPlainLoadShowsRestoreHint();
  testMappedSoundPlaybackRespectsPreference();
  testGameMusicToggleDoesNotDisableSoundEffects();
  testSoundToggleDoesNotDisableMusicClassPlayback();
  testSfxVolumeMultiplierAffectsPlaybackVolume();
  testMusicVolumeMultiplierAffectsPlaybackVolume();
  testMissingMappedSoundWarnsOnce();
  testVmStatusSnapshotUpdatesTopbarAndRoomChanges();
  testQuitHaltInvokesStoryQuitCallback();
  testSameRoomLightRecoveryClearsDarkScene();
  testStartingNewSampleStopsPreviousSample();
  testDefaultSfxIsOneShotUnlessConfigured();
  testMusicAndSfxUseSeparateReplacementGroups();
  testGameOverMusicStartsOnlyOnDeathBanner();
  testGameOverMusicStopsOnRecoveryCommand();
  testGameMusicDisableStopsGameOverMusic();
  await testGameOverMusicCanWaitForExternalFade();
  await testWinGameMusicStartsOnVictoryTextAndSuppressesQuitSplash();
  testGameMusicDisableStopsWinGameMusic();
  await testPcPaperDreamParagraphUsesEnochianAndDelaysDreamOutput();
  await testPcPaperDreamOutputResumesAfterScriptedReveal();
  testPcPaperDreamTransitionBlocksCommands();
  testPcPaperDreamParagraphDoesNotTriggerOnDifferentText();
  testSoundStatsAllPrintsEventBreakdown();
  testSoundEventCommandTriggersSyntheticPlayback();
  await testSaveCommandStoresVmSnapshot();
  await testDestructiveSaveRequiresConfirmation();
  await testDestructiveLoadRequiresConfirmation();
  await testDestructiveLoadEqualScoreHigherMovesUsesCautiousWording();
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
