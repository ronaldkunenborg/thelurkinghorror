'use strict';

const COMPUTER_HELP_NOTE =
  'Note: according to the manual, the login is 872325412 and the password is uhlersoth.';
const SOUND_EFFECT_PREPARE = 1;
const SOUND_EFFECT_START = 2;
const SOUND_EFFECT_STOP = 3;
const SOUND_EFFECT_FINISH = 4;
const SOUND_CLASS_SFX = 'sfx';
const SOUND_CLASS_MUSIC = 'music';
const DEFAULT_SOUND_CATALOG = {
  3: { src: './assets/soundfx/blorb/s3.wav', class: SOUND_CLASS_SFX },
  4: { src: './assets/soundfx/blorb/s4.wav', class: SOUND_CLASS_SFX },
  6: { src: './assets/soundfx/blorb/s6.wav', class: SOUND_CLASS_SFX },
  7: { src: './assets/soundfx/blorb/s7.wav', class: SOUND_CLASS_SFX },
  8: { src: './assets/soundfx/blorb/s8.wav', class: SOUND_CLASS_SFX },
  9: { src: './assets/soundfx/blorb/s9.wav', class: SOUND_CLASS_SFX },
  10: { src: './assets/soundfx/blorb/s10.wav', class: SOUND_CLASS_SFX },
  11: { src: './assets/soundfx/blorb/s11.wav', class: SOUND_CLASS_SFX },
  12: { src: './assets/soundfx/blorb/s12.wav', class: SOUND_CLASS_SFX },
  13: { src: './assets/soundfx/blorb/s13.wav', class: SOUND_CLASS_SFX },
  15: { src: './assets/soundfx/blorb/s15.wav', class: SOUND_CLASS_SFX },
  16: { src: './assets/soundfx/blorb/s16.wav', class: SOUND_CLASS_SFX },
  17: { src: './assets/soundfx/blorb/s17.wav', class: SOUND_CLASS_SFX },
  18: { src: './assets/soundfx/blorb/s18.wav', class: SOUND_CLASS_SFX },
};

class GameIoController {
  constructor(ui, options) {
    if (!ui) {
      throw new Error('GameIoController requires a UI instance');
    }
    const opts = options || {};
    this.ui = ui;
    this.vm = null;
    this.storyMeta = null;
    this.outputBuffer = '';
    this.currentRoomName = '';
    this.previousVmLine = '';
    this.soundEnabled = true;
    this.soundCatalog = Object.assign({}, DEFAULT_SOUND_CATALOG, opts.soundCatalog || {});
    this.onSoundEvent = typeof opts.onSoundEvent === 'function' ? opts.onSoundEvent : function () {};
    this.onRoomChanged = typeof opts.onRoomChanged === 'function' ? opts.onRoomChanged : function () {};
    this.audioFactory = typeof opts.audioFactory === 'function'
      ? opts.audioFactory
      : (typeof Audio === 'function' ? src => new Audio(src) : null);
    this.activeSounds = new Map();
    this.warnedMissingSoundIds = new Set();
    this.soundStats = {
      count: 0,
      effectCodes: new Set(),
      soundNumbers: new Set(),
      volumeRawMin: null,
      volumeRawMax: null,
      volumeRawValues: new Set(),
      comboCounts: new Map(),
    };

    this.ui.setCommandHandler(command => this.submitCommand(command));
  }

  async loadStoryFromArrayBuffer(buffer) {
    const parsed = window.parseZ3Story(buffer);
    this.storyMeta = parsed;
    this.outputBuffer = '';
    this.currentRoomName = '';
    this.previousVmLine = '';
    this.onRoomChanged('');
    this.vm = new window.Z3VM({
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
        onOutput: text => this._handleVmOutput(text),
        onInputRequested: () => this._handleInputRequested(),
        onSoundEffect: event => this._handleVmSoundEffect(event),
        onUnknownOpcode: event => this._handleUnknownOpcode(event),
      },
    });

    this.ui.clearOutput();
    this.ui.appendOutput('Story loaded: release ' + parsed.release + ', serial ' + parsed.serial, 'system');
    this.ui.setStatus('Story loaded', 'Running');
    this.runVm();
  }

  async loadStoryFromUrl(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch story file: ' + response.status);
    }
    const buffer = await response.arrayBuffer();
    return this.loadStoryFromArrayBuffer(buffer);
  }

  async loadBundledStory() {
    const bundledStory = window.LURKING_HORROR_BUNDLED_STORY;
    if (!bundledStory || typeof bundledStory.getArrayBuffer !== 'function') {
      throw new Error('Bundled story asset is not available');
    }
    return this.loadStoryFromArrayBuffer(bundledStory.getArrayBuffer());
  }

  runVm() {
    if (!this.vm) {
      return;
    }
    let result;
    try {
      result = this.vm.run(200000);
    } catch (error) {
      this._flushVmOutputBuffer();
      this.ui.appendOutput('VM error: ' + error.message, 'error');
      this.ui.setStatus('Execution error', 'Stopped');
      return;
    }
    this._flushVmOutputBuffer();
    if (result.haltReason === 'input') {
      this.ui.setStatus('Awaiting command', 'Input ready');
      this.ui.focusInput();
      return;
    }
    if (result.haltReason === 'quit' || result.quit) {
      this.ui.setStatus('Game ended', 'Quit');
      return;
    }
    if (result.haltReason === 'return') {
      this.ui.setStatus('Execution halted', 'Returned');
      return;
    }
    this.ui.setStatus('Execution paused', result.haltReason || 'Stopped');
  }

  submitCommand(command) {
    if (this._handleInterpreterCommand(command)) {
      return;
    }
    if (!this.vm) {
      this.ui.appendOutput('No story loaded yet.', 'error');
      return;
    }
    if (this.vm.haltReason !== 'input') {
      this.ui.appendOutput('VM is not waiting for input.', 'error');
      return;
    }
    this.vm.provideInput(command);
    this.runVm();
  }

  _handleInterpreterCommand(command) {
    const original = String(command || '').trim();
    const normalized = original.toUpperCase();
    if (!normalized.startsWith('$')) {
      return false;
    }
    if (normalized === '$SOUND') {
      this.soundEnabled = !this.soundEnabled;
      if (!this.soundEnabled) {
        this._stopAllSounds();
      }
      this.ui.appendOutput(
        'Sound is now ' + (this.soundEnabled ? 'on' : 'off') + '.',
        'system'
      );
      this.ui.setStatus('Interpreter command', this.soundEnabled ? 'Sound on' : 'Sound off');
      return true;
    }
    if (normalized.startsWith('$SOUNDSTATS')) {
      const effects = Array.from(this.soundStats.effectCodes).sort((a, b) => a - b);
      const numbers = Array.from(this.soundStats.soundNumbers).sort((a, b) => a - b);
      const volumes = Array.from(this.soundStats.volumeRawValues).sort((a, b) => a - b);
      this.ui.appendOutput(
        '[SFX stats] events=' + this.soundStats.count +
        ' effects=' + (effects.length ? effects.join(',') : 'none') +
        ' numbers=' + (numbers.length ? numbers.join(',') : 'none') +
        ' volumeRawMin=' + (this.soundStats.volumeRawMin === null ? 'none' : this.soundStats.volumeRawMin) +
        ' volumeRawMax=' + (this.soundStats.volumeRawMax === null ? 'none' : this.soundStats.volumeRawMax) +
        ' volumeRawDistinct=' + (volumes.length ? volumes.join(',') : 'none'),
        'system'
      );
      if (normalized.includes('ALL')) {
        const combos = Array.from(this.soundStats.comboCounts.entries())
          .map(([key, count]) => {
            const [idText, effectText, volText] = key.split('|');
            return {
              id: Number(idText),
              effect: Number(effectText),
              volumeRaw: volText === 'none' ? null : Number(volText),
              count,
            };
          })
          .sort((a, b) =>
            (a.id - b.id) ||
            (a.effect - b.effect) ||
            ((a.volumeRaw === null ? -1 : a.volumeRaw) - (b.volumeRaw === null ? -1 : b.volumeRaw))
          );
        for (const combo of combos) {
          this.ui.appendOutput(
            '[SFX stats] id=' + combo.id +
            ' effect=' + combo.effect +
            ' volumeRaw=' + (combo.volumeRaw === null ? 'none' : combo.volumeRaw) +
            ' count=' + combo.count,
            'system'
          );
        }
      }
      this.ui.setStatus('Interpreter command', 'Sound stats');
      return true;
    }
    if (normalized.startsWith('$SOUNDEVENT')) {
      const parts = original.split(/\s+/).filter(Boolean);
      const id = parts.length > 1 ? Number(parts[1]) : NaN;
      const effect = parts.length > 2 ? Number(parts[2]) : SOUND_EFFECT_START;
      const volumeRaw = parts.length > 3 ? Number(parts[3]) : null;
      if (!Number.isFinite(id) || id <= 0) {
        this.ui.appendOutput('Usage: $SOUNDEVENT <id> [effect] [volumeRaw]', 'error');
        this.ui.setStatus('Interpreter command', 'Sound event usage');
        return true;
      }
      const event = {
        number: id,
        effect: Number.isFinite(effect) ? effect : SOUND_EFFECT_START,
        volumeRaw: Number.isFinite(volumeRaw) ? (volumeRaw & 0xffff) : null,
        volumeSigned: Number.isFinite(volumeRaw) ? (volumeRaw | 0) : null,
        routine: null,
        operandCount: Number.isFinite(volumeRaw) ? 3 : 2,
      };
      this.ui.appendOutput(
        '[SFX command] Triggering synthetic event id=' + event.number +
        ' effect=' + event.effect +
        ' volumeRaw=' + (event.volumeRaw === null ? 'none' : event.volumeRaw),
        'system'
      );
      this._handleVmSoundEffect(event);
      this.ui.setStatus('Interpreter command', 'Sound event');
      return true;
    }
    this.ui.appendOutput('Unknown interpreter command: ' + command, 'error');
    return true;
  }

  _handleVmOutput(text) {
    const normalized = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    for (let i = 0; i < normalized.length; i++) {
      const ch = normalized[i];
      if (ch === '\n') {
        this._appendVmLine(this.outputBuffer);
        this.outputBuffer = '';
        continue;
      }
      this.outputBuffer += ch;
    }
  }

  _handleInputRequested() {
    this.ui.setStatus('Awaiting command', 'Input requested');
    this.ui.focusInput();
  }

  _flushVmOutputBuffer() {
    if (!this.outputBuffer) {
      return;
    }
    this._appendVmLine(this.outputBuffer);
    this.outputBuffer = '';
  }

  _appendVmLine(line) {
    this.ui.appendOutput(line);
    if (line.startsWith('This ') && this.previousVmLine) {
      const nextRoomName = this.previousVmLine;
      if (nextRoomName && nextRoomName !== this.currentRoomName) {
        this.currentRoomName = nextRoomName;
        this.onRoomChanged(this.currentRoomName);
      }
    }
    if (this._isComputerHelpHintLine(line)) {
      this.ui.appendOutput(COMPUTER_HELP_NOTE, 'system');
    }
    this.previousVmLine = line;
  }

  _isComputerHelpHintLine(line) {
    const normalized = String(line || '').toLowerCase();
    return normalized.includes('login your-user-id') && normalized.includes('password your-password');
  }

  _handleVmSoundEffect(event) {
    const soundEvent = event || {};
    this.onSoundEvent(soundEvent);
    const number = Number(soundEvent.number) || 0;
    const effect = Number(soundEvent.effect) || SOUND_EFFECT_START;
    const volumeRaw = (soundEvent.volumeRaw === null || soundEvent.volumeRaw === undefined)
      ? null
      : (Number(soundEvent.volumeRaw) & 0xffff);
    const volumeSigned = (soundEvent.volumeSigned === null || soundEvent.volumeSigned === undefined)
      ? null
      : Number(soundEvent.volumeSigned);
    const routine = (soundEvent.routine === null || soundEvent.routine === undefined)
      ? null
      : Number(soundEvent.routine);
    const operandCount = Number(soundEvent.operandCount) || 0;
    const soundDef = this.soundCatalog[number];
    const mappedSrc = soundDef && soundDef.src ? soundDef.src : 'none';
    const gain = this._resolveSoundGain(soundDef, volumeRaw, volumeSigned);
    this.ui.appendOutput(
      '[SFX debug] id=' + number +
      ' effect=' + this._soundEffectName(effect) +
      ' sound=' + (this.soundEnabled ? 'on' : 'off') +
      ' mapped=' + mappedSrc +
      ' gain=' + (gain === null ? 'default' : gain.toFixed(3)) +
      ' volumeRaw=' + (volumeRaw === null ? 'none' : volumeRaw) +
      ' volumeSigned=' + (volumeSigned === null ? 'none' : volumeSigned) +
      ' routine=' + (routine === null ? 'none' : routine) +
      ' operands=' + operandCount,
      'system'
    );
    this._recordSoundEvent(number, effect, volumeRaw);

    if (!number || !this.soundEnabled) {
      return;
    }

    if (effect === SOUND_EFFECT_STOP) {
      this._stopSound(number);
      return;
    }
    if (effect === SOUND_EFFECT_FINISH) {
      this._finishSound(number);
      return;
    }

    if (effect === SOUND_EFFECT_PREPARE) {
      this._prepareSound(number, soundDef, gain);
      return;
    }

    if (effect !== SOUND_EFFECT_START) {
      return;
    }

    if (!soundDef || !soundDef.src) {
      if (!this.warnedMissingSoundIds.has(number)) {
        this.warnedMissingSoundIds.add(number);
        this.ui.appendOutput('Sound #' + number + ' requested, but no sample is mapped yet.', 'system');
      }
      return;
    }

    const soundClass = this._resolveSoundClass(soundDef);
    this._stopAllSoundsExcept(number, soundClass);
    this._playSound(number, soundDef, {
      gain,
      restart: false,
    });
  }

  _soundEffectName(effect) {
    if (effect === SOUND_EFFECT_PREPARE) {
      return 'prepare';
    }
    if (effect === SOUND_EFFECT_START) {
      return 'start';
    }
    if (effect === SOUND_EFFECT_STOP) {
      return 'stop';
    }
    if (effect === SOUND_EFFECT_FINISH) {
      return 'finish';
    }
    return 'unknown(' + effect + ')';
  }

  _handleUnknownOpcode(event) {
    const opcode = Number(event && event.opcode);
    const offset = Number(event && event.offset);
    const opText = Number.isFinite(opcode) ? opcode : '?';
    const addrText = Number.isFinite(offset) ? '0x' + offset.toString(16) : 'unknown';
    this.ui.appendOutput('[VM debug] Unknown opcode ' + opText + ' at ' + addrText + '.', 'system');
  }

  _recordSoundEvent(number, effect, volumeRaw) {
    this.soundStats.count += 1;
    this.soundStats.effectCodes.add(effect);
    if (number) {
      this.soundStats.soundNumbers.add(number);
    }
    if (volumeRaw !== null && volumeRaw !== undefined) {
      this.soundStats.volumeRawValues.add(volumeRaw);
      if (this.soundStats.volumeRawMin === null || volumeRaw < this.soundStats.volumeRawMin) {
        this.soundStats.volumeRawMin = volumeRaw;
      }
      if (this.soundStats.volumeRawMax === null || volumeRaw > this.soundStats.volumeRawMax) {
        this.soundStats.volumeRawMax = volumeRaw;
      }
    }
    const key = String(number) + '|' + String(effect) + '|' + (volumeRaw === null || volumeRaw === undefined ? 'none' : String(volumeRaw));
    this.soundStats.comboCounts.set(key, (this.soundStats.comboCounts.get(key) || 0) + 1);
  }

  _resolveSoundGain(soundDef, volumeRaw, volumeSigned) {
    if (typeof soundDef?.volume === 'number') {
      return Math.max(0, Math.min(1, soundDef.volume));
    }
    if (volumeRaw === null || volumeRaw === undefined) {
      return null;
    }
    const lowByte = volumeRaw & 0xff;
    if (lowByte >= 1 && lowByte <= 8) {
      // Use a perceptual curve so adjacent story volume steps are easier to hear.
      // Index 0 is unused so volume 1..8 maps directly.
      const zVolumeCurve = [0, 0.08, 0.16, 0.30, 0.45, 0.62, 0.80, 0.92, 1.0];
      return zVolumeCurve[lowByte];
    }
    if (lowByte >= 0 && lowByte <= 64) {
      // Amiga-style volume range: 0..64 (inclusive).
      // Use a gentle perceptual curve so low-mid values remain audible.
      if (lowByte === 0) {
        return 0;
      }
      return Math.pow(lowByte / 64, 0.75);
    }
    if (lowByte === 0 || lowByte === 255) {
      return null;
    }
    if (Number.isFinite(volumeSigned) && volumeSigned > 0 && volumeSigned <= 8) {
      return volumeSigned / 8;
    }
    return Math.max(0, Math.min(1, lowByte / 255));
  }

  _resolveSoundClass(soundDef) {
    if (!soundDef) {
      return SOUND_CLASS_SFX;
    }
    if (soundDef.music === true) {
      return SOUND_CLASS_MUSIC;
    }
    const soundClass = String(soundDef.class || soundDef.kind || '').trim().toLowerCase();
    if (soundClass === SOUND_CLASS_MUSIC) {
      return SOUND_CLASS_MUSIC;
    }
    return SOUND_CLASS_SFX;
  }

  _resolveLoopSetting(soundDef) {
    if (typeof soundDef?.loop === 'boolean') {
      return soundDef.loop;
    }
    // Default: game sound effects loop until explicit stop or replacement.
    // Music defaults to one-shot unless its catalog entry explicitly enables looping.
    return this._resolveSoundClass(soundDef) === SOUND_CLASS_SFX;
  }

  _ensureAudioForSound(number, soundDef) {
    if (!this.audioFactory) {
      return null;
    }
    let audio = this.activeSounds.get(number);
    if (audio) {
      return audio;
    }
    audio = this.audioFactory(soundDef.src);
    if (!audio) {
      this.ui.appendOutput('[SFX debug] id=' + number + ' audioFactory returned no audio object.', 'system');
      return null;
    }
    this.activeSounds.set(number, audio);
    if (typeof audio.preload === 'string') {
      audio.preload = 'auto';
    }
    if (typeof audio.addEventListener === 'function') {
      audio.addEventListener('ended', () => {
        this.activeSounds.delete(number);
      });
      audio.addEventListener('error', () => {
        this.ui.appendOutput(
          '[SFX debug] id=' + number + ' audio element error while loading/playing ' + soundDef.src,
          'system'
        );
      });
    }
    return audio;
  }

  _applySoundParams(audio, soundDef, gain) {
    const shouldLoop = this._resolveLoopSetting(soundDef);
    if (typeof audio.loop === 'boolean' || typeof audio.loop === 'undefined') {
      audio.loop = shouldLoop;
    }
    if (typeof audio.volume === 'number' && gain !== null && gain !== undefined) {
      audio.volume = Math.max(0, Math.min(1, gain));
    }
  }

  _prepareSound(number, soundDef, gain) {
    if (!soundDef || !soundDef.src) {
      return;
    }
    const audio = this._ensureAudioForSound(number, soundDef);
    if (!audio) {
      return;
    }
    this._applySoundParams(audio, soundDef, gain);
    if (typeof audio.load === 'function') {
      audio.load();
    }
  }

  _playSound(number, soundDef, options) {
    const opts = options || {};
    const audio = this._ensureAudioForSound(number, soundDef);
    if (!audio) {
      return;
    }
    this._applySoundParams(audio, soundDef, opts.gain);

    const shouldRestart = !!opts.restart;
    const isActivelyPlaying = !!audio && typeof audio.paused === 'boolean' ? !audio.paused : false;
    if (shouldRestart && typeof audio.currentTime === 'number') {
      audio.currentTime = 0;
    }

    if (isActivelyPlaying && !shouldRestart) {
      return;
    }

    if (typeof audio.play === 'function') {
      const playResult = audio.play();
      if (playResult && typeof playResult.catch === 'function') {
        playResult.catch(error => {
          const message = error && error.message ? error.message : String(error);
          this.ui.appendOutput(
            '[SFX debug] id=' + number + ' play() failed: ' + message,
            'system'
          );
        });
      }
    }
  }

  _stopSound(number) {
    const audio = this.activeSounds.get(number);
    if (!audio) {
      return;
    }
    if (typeof audio.pause === 'function') {
      audio.pause();
    }
    if (typeof audio.currentTime === 'number') {
      audio.currentTime = 0;
    }
    this.activeSounds.delete(number);
  }

  _finishSound(number) {
    const audio = this.activeSounds.get(number);
    if (!audio) {
      return;
    }
    if (typeof audio.loop === 'boolean') {
      audio.loop = false;
    }
  }

  _stopAllSounds() {
    const activeIds = Array.from(this.activeSounds.keys());
    for (const number of activeIds) {
      this._stopSound(number);
    }
  }

  _stopAllSoundsExcept(keepNumber, keepClass) {
    const activeIds = Array.from(this.activeSounds.keys());
    for (const number of activeIds) {
      if (number === keepNumber) {
        continue;
      }
      if (keepClass) {
        const soundDef = this.soundCatalog[number];
        const activeClass = this._resolveSoundClass(soundDef);
        if (activeClass !== keepClass) {
          continue;
        }
      }
      this._stopSound(number);
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    GameIoController,
  };
}

if (typeof window !== 'undefined') {
  window.GameIoController = GameIoController;
}
