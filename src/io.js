'use strict';

const COMPUTER_HELP_NOTE =
  'Note: according to the manual, the login is 872325412 and the password is uhlersoth.';
const SOUND_EFFECT_PREPARE = 1;
const SOUND_EFFECT_START = 2;
const SOUND_EFFECT_STOP = 3;
const SOUND_EFFECT_FINISH = 4;
const SOUND_CLASS_SFX = 'sfx';
const SOUND_CLASS_MUSIC = 'music';
const DEFAULT_SAVE_SLOT = 0;
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
    this.currentRoomId = 0;
    this.lastTurnWasPitchBlack = false;
    this.flashlightOverride = null;
    this.lastSceneIsDark = null;
    this.pendingDarkClearRoomId = null;
    this.sawPitchBlackThisCycle = false;
    this.previousVmLine = '';
    this.debugEnabled = false;
    this.sfxEnabled = true;
    this.gameMusicEnabled = true;
    this.sfxVolume = 1;
    this.gameMusicVolume = 1;
    this.soundCatalog = Object.assign({}, DEFAULT_SOUND_CATALOG, opts.soundCatalog || {});
    this.onSoundEvent = typeof opts.onSoundEvent === 'function' ? opts.onSoundEvent : function () {};
    this.onRoomChanged = typeof opts.onRoomChanged === 'function' ? opts.onRoomChanged : function () {};
    this.onBloodEffectCommand =
      typeof opts.onBloodEffectCommand === 'function' ? opts.onBloodEffectCommand : function () {};
    this.onMapRequested =
      typeof opts.onMapRequested === 'function' ? opts.onMapRequested : function () {};
    this.onGameMusicPreferenceChanged =
      typeof opts.onGameMusicPreferenceChanged === 'function'
        ? opts.onGameMusicPreferenceChanged
        : function () {};
    this.audioFactory = typeof opts.audioFactory === 'function'
      ? opts.audioFactory
      : (typeof Audio === 'function' ? src => new Audio(src) : null);
    this.saveStorage = opts.saveStorage || this._createDefaultSaveStorage();
    this.saveExporter = typeof opts.saveExporter === 'function'
      ? opts.saveExporter
      : (typeof window !== 'undefined' && typeof window.exportSaveToFile === 'function'
        ? window.exportSaveToFile
        : null);
    this.saveImporter = typeof opts.saveImporter === 'function'
      ? opts.saveImporter
      : (typeof window !== 'undefined' && typeof window.importSaveFileToSlot === 'function'
        ? window.importSaveFileToSlot
        : null);
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
    this.importFileInput = this._createImportFileInput();
    this.restoreAudioTransitionActive = false;

    this.ui.setCommandHandler(command => this.submitCommand(command));
    this._syncStatusDisplays();
  }

  async loadStoryFromArrayBuffer(buffer) {
    const parsed = window.parseZ3Story(buffer);
    this.storyMeta = parsed;
    this.outputBuffer = '';
    this.currentRoomName = '';
    this.currentRoomId = 0;
    this.lastTurnWasPitchBlack = false;
    this.flashlightOverride = null;
    this.lastSceneIsDark = null;
    this.pendingDarkClearRoomId = null;
    this.sawPitchBlackThisCycle = false;
    this.previousVmLine = '';
    this.onRoomChanged('', 0, { isDark: false });
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
    this._syncStatusDisplays();
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

  async runVm() {
    if (!this.vm) {
      return;
    }
    let result;
    try {
      result = this.vm.run(200000);
    } catch (error) {
      this.restoreAudioTransitionActive = false;
      this._flushVmOutputBuffer();
      this.ui.appendOutput('VM error: ' + error.message, 'error');
      this._syncStatusDisplays();
      this.ui.setStatus('Execution error', 'Stopped');
      return;
    }

    // Clear darkness only with positive evidence from the just-run command cycle:
    // room changed and this cycle did not report the pitch-black line.
    if (this.pendingDarkClearRoomId !== null && this.vm && typeof this.vm.getStatusSnapshot === 'function') {
      const snapshot = this.vm.getStatusSnapshot();
      const roomId = snapshot && Number.isFinite(snapshot.roomObjectId) ? snapshot.roomObjectId : 0;
      const roomChanged = roomId !== this.pendingDarkClearRoomId;
      if (roomChanged && !this.sawPitchBlackThisCycle) {
        this.lastTurnWasPitchBlack = false;
      }
    }

    this._flushVmOutputBuffer();
    this._syncStatusDisplays();
    if (result.haltReason !== 'restore') {
      this.restoreAudioTransitionActive = false;
    }
    if (result.haltReason === 'input') {
      this.pendingDarkClearRoomId = null;
      this.sawPitchBlackThisCycle = false;
      this.ui.setStatus('Awaiting command', 'Input ready');
      this.ui.focusInput();
      return;
    }
    if (result.haltReason === 'save') {
      this.pendingDarkClearRoomId = null;
      this.sawPitchBlackThisCycle = false;
      await this._handleVmSaveOpcode();
      return;
    }
    if (result.haltReason === 'restore') {
      this.pendingDarkClearRoomId = null;
      this.sawPitchBlackThisCycle = false;
      await this._handleVmRestoreOpcode();
      return;
    }
    if (result.haltReason === 'quit' || result.quit) {
      this.pendingDarkClearRoomId = null;
      this.sawPitchBlackThisCycle = false;
      this.ui.setStatus('Game ended', 'Quit');
      return;
    }
    if (result.haltReason === 'return') {
      this.pendingDarkClearRoomId = null;
      this.sawPitchBlackThisCycle = false;
      this.ui.setStatus('Execution halted', 'Returned');
      return;
    }
    this.ui.setStatus('Execution paused', result.haltReason || 'Stopped');
  }

  submitCommand(command) {
    if (this._handleInterpreterCommand(command)) {
      return;
    }
    const normalized = String(command || '').trim().toLowerCase();
    if (normalized === 'load') {
      this.ui.appendOutput('Use "restore" for the story command, or "$LOAD" for interpreter slot loading.', 'system');
      this.ui.setStatus('Command hint', 'Use restore or $LOAD');
      this.ui.focusInput();
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
    this.pendingDarkClearRoomId = this.currentRoomId;
    this.sawPitchBlackThisCycle = false;
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
      return this._toggleSoundEffects();
    }
    if (normalized === '$GAMESOUND') {
      return this._toggleGameMusic();
    }
    if (normalized === '$DEBUG') {
      this.debugEnabled = !this.debugEnabled;
      this.ui.appendOutput(
        'Debug output is now ' + (this.debugEnabled ? 'on' : 'off') + '.',
        'system'
      );
      this.ui.setStatus('Interpreter command', this.debugEnabled ? 'Debug on' : 'Debug off');
      return true;
    }
    if (normalized.startsWith('$FLASHLIGHT')) {
      return this._handleFlashlightCommand(original);
    }
    if (normalized.startsWith('$BLOOD')) {
      return this._handleBloodCommand(original);
    }
    if (normalized.startsWith('$SAVES')) {
      this._listSaveSlots();
      return true;
    }
    if (normalized === '$MAP') {
      this.onMapRequested();
      this.ui.appendOutput('Opened the spoiler-safe university overview map.', 'system');
      this.ui.setStatus('Interpreter command', 'Map');
      return true;
    }
    if (normalized.startsWith('$SAVE')) {
      const slot = this._parseSlotCommand(original, DEFAULT_SAVE_SLOT);
      this._saveToSlot(slot);
      return true;
    }
    if (normalized.startsWith('$LOAD')) {
      const slot = this._parseSlotCommand(original, DEFAULT_SAVE_SLOT);
      this._loadFromSlot(slot);
      return true;
    }
    if (normalized.startsWith('$DELETE')) {
      const slot = this._parseSlotCommand(original, DEFAULT_SAVE_SLOT);
      this._deleteSlot(slot);
      return true;
    }
    if (normalized.startsWith('$EXPORT')) {
      const slot = this._parseSlotCommand(original, DEFAULT_SAVE_SLOT);
      this._exportSlot(slot);
      return true;
    }
    if (normalized.startsWith('$IMPORT')) {
      const slot = this._parseSlotCommand(original, DEFAULT_SAVE_SLOT);
      this._importIntoSlot(slot);
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

  _toggleSoundEffects() {
      this.sfxEnabled = !this.sfxEnabled;
      if (!this.sfxEnabled) {
        this._stopAllSoundsByClass(SOUND_CLASS_SFX);
      }
      this.ui.appendOutput(
        'Sound effects are now ' + (this.sfxEnabled ? 'on' : 'off') + '.',
        'system'
      );
      this.ui.setStatus('Interpreter command', this.sfxEnabled ? 'SFX on' : 'SFX off');
      return true;
  }

  _toggleGameMusic() {
      this.gameMusicEnabled = !this.gameMusicEnabled;
      if (!this.gameMusicEnabled) {
        this._stopAllSoundsByClass(SOUND_CLASS_MUSIC);
      }
      this.onGameMusicPreferenceChanged(this.gameMusicEnabled);
      this.ui.appendOutput(
        'Game music is now ' + (this.gameMusicEnabled ? 'on' : 'off') + '.',
        'system'
      );
      this.ui.setStatus('Interpreter command', this.gameMusicEnabled ? 'Music on' : 'Music off');
      return true;
  }

  _handleFlashlightCommand(command) {
    const parts = String(command || '').trim().split(/\s+/);
    const mode = (parts[1] || '').toUpperCase();
    if (mode !== 'ON' && mode !== 'OFF') {
      this.ui.appendOutput('Usage: $FLASHLIGHT ON|OFF', 'error');
      this.ui.setStatus('Interpreter command', 'Flashlight usage');
      return true;
    }

    // Temporary visual override for testing dark-room art behavior.
    this.flashlightOverride = mode === 'ON' ? 'on' : null;
    const active = this.flashlightOverride === 'on';
    this.ui.appendOutput(
      'Temporary flashlight override is now ' + (active ? 'ON' : 'OFF') + '.',
      'system'
    );
    this.ui.setStatus('Interpreter command', active ? 'Flashlight ON' : 'Flashlight OFF');

    if (this.currentRoomId || this.currentRoomName) {
      const isDark = this._isDarkForScene();
      this.lastSceneIsDark = isDark;
      this.onRoomChanged(this.currentRoomName, this.currentRoomId, { isDark });
    }
    return true;
  }

  _handleBloodCommand(command) {
    if (!this.debugEnabled) {
      this.ui.appendOutput('Blood effect debug commands require $DEBUG on.', 'error');
      this.ui.setStatus('Interpreter command', 'Enable $DEBUG');
      return true;
    }

    const parts = String(command || '').trim().split(/\s+/);
    const arg = (parts[1] || 'ON').toUpperCase();

    if (arg === 'OFF' || arg === 'STOP') {
      this.onBloodEffectCommand({ enabled: false });
      this.ui.appendOutput('Blood effect disabled.', 'system');
      this.ui.setStatus('Interpreter command', 'Blood OFF');
      return true;
    }

    if (arg === 'ON' || arg === 'START' || arg === 'RANDOM') {
      this.onBloodEffectCommand({ enabled: true, mode: 'random', immediate: false, firstDelayMs: 60000 });
      this.ui.appendOutput('Blood effect enabled in random mode (first splatter in about 1 minute).', 'system');
      this.ui.setStatus('Interpreter command', 'Blood random');
      return true;
    }

    if (arg === 'NOW') {
      this.onBloodEffectCommand({ enabled: true, mode: 'random', immediate: true });
      this.ui.appendOutput('Blood effect triggered now (random).', 'system');
      this.ui.setStatus('Interpreter command', 'Blood now');
      return true;
    }

    if (/^\d+$/.test(arg)) {
      const index = Number(arg);
      if (index >= 1 && index <= 5) {
        this.onBloodEffectCommand({ enabled: true, mode: 'fixed', index, immediate: true });
        this.ui.appendOutput('Blood effect enabled with fixed splatter #' + index + '.', 'system');
        this.ui.setStatus('Interpreter command', 'Blood #' + index);
        return true;
      }
    }

    this.ui.appendOutput('Usage: $BLOOD ON|OFF|NOW|RANDOM|<1-5>', 'error');
    this.ui.setStatus('Interpreter command', 'Blood usage');
    return true;
  }

  setSoundEffectsVolume(value) {
    this.sfxVolume = this._clampVolume(value);
    this._refreshActiveSoundVolumes(SOUND_CLASS_SFX);
  }

  setGameMusicVolume(value) {
    this.gameMusicVolume = this._clampVolume(value);
    this._refreshActiveSoundVolumes(SOUND_CLASS_MUSIC);
  }

  _createDefaultSaveStorage() {
    if (typeof window !== 'undefined' && typeof window.QuetzalStorage === 'function') {
      return new window.QuetzalStorage();
    }
    return null;
  }

  _createImportFileInput() {
    if (typeof document === 'undefined') {
      return null;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.sav';
    input.style.display = 'none';
    input.addEventListener('change', event => {
      const file = event.target.files && event.target.files[0];
      const slot = Number(input.dataset.slot || DEFAULT_SAVE_SLOT);
      input.value = '';
      if (file) {
        this._importFileIntoSlot(file, slot);
      }
    });
    document.body.appendChild(input);
    return input;
  }

  _parseSlotCommand(command, defaultSlot) {
    const match = String(command || '').trim().match(/^\$\w+\s+(\d+)\s*$/i);
    return match ? Number(match[1]) : defaultSlot;
  }

  _getStoryId() {
    if (!this.storyMeta) {
      return '';
    }
    return 'lurking-horror-r' + this.storyMeta.release + '-' + this.storyMeta.serial;
  }

  _getStoryCompatibilityMeta() {
    if (!this.storyMeta) {
      return null;
    }
    return {
      storyId: this._getStoryId(),
      release: this.storyMeta.release,
      serial: this.storyMeta.serial,
      checksum: this.storyMeta.header.headerChecksum,
    };
  }

  _ensureSaveAvailable(actionLabel) {
    if (!this.vm || !this.storyMeta) {
      this.ui.appendOutput('No story loaded yet.', 'error');
      this.ui.setStatus('Interpreter command', actionLabel + ' unavailable');
      return false;
    }
    if (!this.saveStorage) {
      this.ui.appendOutput('Local save storage is not available in this environment.', 'error');
      this.ui.setStatus('Interpreter command', actionLabel + ' unavailable');
      return false;
    }
    return true;
  }

  _buildSaveLabel(slot) {
    const roomName = this.currentRoomName || 'Unknown room';
    return 'Slot ' + slot + ' - ' + roomName;
  }

  async _handleVmSaveOpcode() {
    if (!this.vm || typeof this.vm.completePendingSave !== 'function') {
      this.ui.appendOutput('Story save is not available in this VM build.', 'error');
      this.ui.setStatus('Story save', 'Unavailable');
      return;
    }
    if (!this._ensureSaveAvailable('Story save')) {
      this.vm.completePendingSave(false);
      this.runVm();
      return;
    }
    try {
      const compat = this._getStoryCompatibilityMeta();
      const slot = DEFAULT_SAVE_SLOT;
      await this.saveStorage.putSave({
        storyId: compat.storyId,
        slot,
        label: this._buildSaveLabel(slot),
        serial: compat.serial,
        release: compat.release,
        checksum: compat.checksum,
        sceneIsDark: !!this.lastTurnWasPitchBlack,
        quetzalData: this.vm.serializePendingSaveState(),
      });
      this.vm.completePendingSave(true);
      this._syncStatusDisplays();
      this.ui.setStatus('Story save', 'Saved slot ' + slot);
    } catch (error) {
      this.ui.appendOutput('Story save failed: ' + error.message, 'error');
      this.ui.setStatus('Story save', 'Save failed');
      this.vm.completePendingSave(false);
    }
    this.runVm();
  }

  async _handleVmRestoreOpcode() {
    if (!this.vm || typeof this.vm.completePendingRestore !== 'function') {
      this.ui.appendOutput('Story restore is not available in this VM build.', 'error');
      this.ui.setStatus('Story restore', 'Unavailable');
      return;
    }
    if (!this._ensureSaveAvailable('Story restore')) {
      this.vm.completePendingRestore(false);
      this.runVm();
      return;
    }
    const slot = DEFAULT_SAVE_SLOT;
    try {
      const compat = this._getStoryCompatibilityMeta();
      const record = await this.saveStorage.getSave(compat.storyId, slot);
      this._assertCompatibleSaveRecord(record);
      this._appendLightDebugOutput(
        '[LightDebug][restore] begin slot=' + slot +
        ' meta.sceneIsDark=' + String(!!(record && record.sceneIsDark)) +
        ' prev.lastTurnWasPitchBlack=' + String(!!this.lastTurnWasPitchBlack),
        'system'
      );
      this._prepareAudioForRestore();
      this.vm.restoreSaveState(record.quetzalData);
      this._appendLightDebugOutput(
        '[LightDebug][restore] vm restored; snapshot room=' +
        (this.vm.getStatusSnapshot().roomName || 'unknown') +
        ' (' + String(this.vm.getStatusSnapshot().roomObjectId || 0) + ')',
        'system'
      );
      const probedDark = this._probeDarknessFromCurrentState();
      this.lastTurnWasPitchBlack = (probedDark === null) ? !!record.sceneIsDark : probedDark;
      this._appendLightDebugOutput(
        '[LightDebug][restore] probe=' + String(probedDark) +
        ' fallbackMeta=' + String(!!record.sceneIsDark) +
        ' -> lastTurnWasPitchBlack=' + String(!!this.lastTurnWasPitchBlack),
        'system'
      );
      this.lastSceneIsDark = null;
      this._syncStatusDisplays();
      this._appendLightDebugOutput(
        '[LightDebug][restore] after _syncStatusDisplays lastSceneIsDark=' +
        String(this.lastSceneIsDark),
        'system'
      );
      this.ui.setStatus('Story restore', 'Loaded slot ' + slot);
    } catch (error) {
      this.restoreAudioTransitionActive = false;
      this.ui.appendOutput('Story restore failed: ' + error.message, 'error');
      this.ui.setStatus('Story restore', 'Restore failed');
      this.vm.completePendingRestore(false);
    }
    this.runVm();
  }

  async _saveToSlot(slot) {
    if (!this._ensureSaveAvailable('Save')) {
      return;
    }
    if (!this.vm || typeof this.vm.serializeSaveState !== 'function') {
      this.ui.appendOutput('Save support is not available in this VM build.', 'error');
      this.ui.setStatus('Interpreter command', 'Save unavailable');
      return;
    }
    try {
      const compat = this._getStoryCompatibilityMeta();
      const record = await this.saveStorage.putSave({
        storyId: compat.storyId,
        slot,
        label: this._buildSaveLabel(slot),
        serial: compat.serial,
        release: compat.release,
        checksum: compat.checksum,
        sceneIsDark: !!this.lastTurnWasPitchBlack,
        quetzalData: this.vm.serializeSaveState(),
      });
      this.ui.appendOutput(
        'Saved slot ' + slot + ' (' + (record && record.label ? record.label : this._buildSaveLabel(slot)) + ').',
        'system'
      );
      this.ui.setStatus('Interpreter command', 'Saved slot ' + slot);
    } catch (error) {
      this.ui.appendOutput('Save failed: ' + error.message, 'error');
      this.ui.setStatus('Interpreter command', 'Save failed');
    }
  }

  _assertCompatibleSaveRecord(record) {
    const compat = this._getStoryCompatibilityMeta();
    if (!compat) {
      throw new Error('No story metadata is loaded');
    }
    if (!record) {
      throw new Error('Save slot is empty');
    }
    if (record.storyId !== compat.storyId) {
      throw new Error('Save belongs to a different story build');
    }
    if (Number(record.release) !== Number(compat.release)) {
      throw new Error('Save release does not match the current story');
    }
    if (String(record.serial) !== String(compat.serial)) {
      throw new Error('Save serial does not match the current story');
    }
    if (Number(record.checksum) !== Number(compat.checksum)) {
      throw new Error('Save checksum does not match the current story');
    }
  }

  async _loadFromSlot(slot) {
    if (!this._ensureSaveAvailable('Load')) {
      return;
    }
    if (!this.vm || typeof this.vm.restoreSaveState !== 'function') {
      this.ui.appendOutput('Load support is not available in this VM build.', 'error');
      this.ui.setStatus('Interpreter command', 'Load unavailable');
      return;
    }
    try {
      const compat = this._getStoryCompatibilityMeta();
      const record = await this.saveStorage.getSave(compat.storyId, slot);
      this._assertCompatibleSaveRecord(record);
      this._appendLightDebugOutput(
        '[LightDebug][load] begin slot=' + slot +
        ' meta.sceneIsDark=' + String(!!(record && record.sceneIsDark)) +
        ' prev.lastTurnWasPitchBlack=' + String(!!this.lastTurnWasPitchBlack),
        'system'
      );
      this._prepareAudioForRestore();
      this.vm.restoreSaveState(record.quetzalData);
      this._appendLightDebugOutput(
        '[LightDebug][load] vm restored; snapshot room=' +
        (this.vm.getStatusSnapshot().roomName || 'unknown') +
        ' (' + String(this.vm.getStatusSnapshot().roomObjectId || 0) + ')',
        'system'
      );
      const probedDark = this._probeDarknessFromCurrentState();
      this.lastTurnWasPitchBlack = (probedDark === null) ? !!record.sceneIsDark : probedDark;
      this._appendLightDebugOutput(
        '[LightDebug][load] probe=' + String(probedDark) +
        ' fallbackMeta=' + String(!!record.sceneIsDark) +
        ' -> lastTurnWasPitchBlack=' + String(!!this.lastTurnWasPitchBlack),
        'system'
      );
      this.lastSceneIsDark = null;
      this._syncStatusDisplays();
      this._appendLightDebugOutput(
        '[LightDebug][load] after _syncStatusDisplays lastSceneIsDark=' +
        String(this.lastSceneIsDark),
        'system'
      );
      this.ui.appendOutput(
        'Loaded slot ' + slot + ' (' + (record.label || 'saved game') + ').',
        'system'
      );
      this.ui.setStatus('Interpreter command', 'Loaded slot ' + slot);
      await this.runVm();
    } catch (error) {
      this.restoreAudioTransitionActive = false;
      this.ui.appendOutput('Load failed: ' + error.message, 'error');
      this.ui.setStatus('Interpreter command', 'Load failed');
    }
  }

  async _deleteSlot(slot) {
    if (!this._ensureSaveAvailable('Delete')) {
      return;
    }
    try {
      const deleted = await this.saveStorage.deleteSave(this._getStoryId(), slot);
      this.ui.appendOutput(
        deleted ? 'Deleted save slot ' + slot + '.' : 'Save slot ' + slot + ' is already empty.',
        'system'
      );
      this.ui.setStatus('Interpreter command', deleted ? 'Deleted slot ' + slot : 'Slot empty');
    } catch (error) {
      this.ui.appendOutput('Delete failed: ' + error.message, 'error');
      this.ui.setStatus('Interpreter command', 'Delete failed');
    }
  }

  async _listSaveSlots() {
    if (!this._ensureSaveAvailable('Save list')) {
      return;
    }
    try {
      const records = await this.saveStorage.listSaves(this._getStoryId());
      if (!records.length) {
        this.ui.appendOutput('No local saves yet.', 'system');
        this.ui.setStatus('Interpreter command', 'No saves');
        return;
      }
      for (const record of records) {
        this.ui.appendOutput(
          '[Save slot ' + record.slot + '] ' +
          (record.label || 'saved game') +
          ' | updated ' + record.updatedAt,
          'system'
        );
      }
      this.ui.setStatus('Interpreter command', 'Listed saves');
    } catch (error) {
      this.ui.appendOutput('Listing saves failed: ' + error.message, 'error');
      this.ui.setStatus('Interpreter command', 'Save list failed');
    }
  }

  async _exportSlot(slot) {
    if (!this._ensureSaveAvailable('Export')) {
      return;
    }
    if (!this.saveExporter) {
      this.ui.appendOutput('Save export is not available in this environment.', 'error');
      this.ui.setStatus('Interpreter command', 'Export unavailable');
      return;
    }
    try {
      const record = await this.saveStorage.getSave(this._getStoryId(), slot);
      this._assertCompatibleSaveRecord(record);
      await this.saveExporter(record);
      this.ui.appendOutput('Exported save slot ' + slot + '.', 'system');
      this.ui.setStatus('Interpreter command', 'Exported slot ' + slot);
    } catch (error) {
      this.ui.appendOutput('Export failed: ' + error.message, 'error');
      this.ui.setStatus('Interpreter command', 'Export failed');
    }
  }

  _importIntoSlot(slot) {
    if (!this._ensureSaveAvailable('Import')) {
      return;
    }
    if (!this.importFileInput || !this.saveImporter) {
      this.ui.appendOutput('Save import is not available in this environment.', 'error');
      this.ui.setStatus('Interpreter command', 'Import unavailable');
      return;
    }
    this.importFileInput.dataset.slot = String(slot);
    this.importFileInput.click();
  }

  async _importFileIntoSlot(file, slot) {
    try {
      const compat = this._getStoryCompatibilityMeta();
      const record = await this.saveImporter(this.saveStorage, file, {
        storyId: compat.storyId,
        slot,
        label: 'Imported slot ' + slot,
        serial: compat.serial,
        release: compat.release,
        checksum: compat.checksum,
      });
      this.ui.appendOutput(
        'Imported ' + (file.name || 'save file') + ' into slot ' + slot + '.',
        'system'
      );
      this.ui.setStatus('Interpreter command', 'Imported slot ' + slot);
      return record;
    } catch (error) {
      this.ui.appendOutput('Import failed: ' + error.message, 'error');
      this.ui.setStatus('Interpreter command', 'Import failed');
      return null;
    }
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
    if (this._isPitchBlackLine(line)) {
      this.lastTurnWasPitchBlack = true;
      this.sawPitchBlackThisCycle = true;
    }
    if (this._isComputerHelpHintLine(line)) {
      this.ui.appendOutput(COMPUTER_HELP_NOTE, 'system');
    }
    this.previousVmLine = line;
  }

  _isPitchBlackLine(line) {
    const normalized = String(line || '').trim().toLowerCase();
    return normalized === 'it is pitch black.';
  }

  _isDarkForScene() {
    if (this.flashlightOverride === 'on') {
      return false;
    }
    return this.lastTurnWasPitchBlack;
  }

  _probeDarknessFromCurrentState() {
    if (
      !this.vm ||
      typeof this.vm.serializeSaveState !== 'function' ||
      typeof this.vm.restoreSaveState !== 'function'
    ) {
      return null;
    }

    const vmSnapshot = this.vm.serializeSaveState();
    const prevOutputBuffer = this.outputBuffer;
    const prevPendingDark = this.lastTurnWasPitchBlack;
    const prevOnOutput = this.vm.onOutput;
    const prevOnSoundEffect = this.vm.onSoundEffect;
    const prevOnUnknownOpcode = this.vm.onUnknownOpcode;
    const prevOnInputRequested = this.vm.onInputRequested;
    let probeOutput = '';

    try {
      this.outputBuffer = '';
      this.lastTurnWasPitchBlack = false;
      this._appendLightDebugOutput(
        '[LightDebug][probe] start command=look (hidden) haltReason=' + String(this.vm.haltReason),
        'system'
      );
      this.vm.onOutput = text => {
        probeOutput += String(text || '');
      };
      this.vm.onSoundEffect = function () {};
      this.vm.onUnknownOpcode = function () {};
      this.vm.onInputRequested = function () {};

      let safety = 0;
      while (this.vm.haltReason !== 'input' && safety < 8) {
        const step = this.vm.run(200000);
        if (step.haltReason === 'input') {
          break;
        }
        if (step.haltReason === 'save' || step.haltReason === 'restore') {
          this._appendLightDebugOutput(
            '[LightDebug][probe] aborted pre-look haltReason=' + step.haltReason,
            'system'
          );
          return null;
        }
        safety += 1;
      }
      if (this.vm.haltReason !== 'input') {
        this._appendLightDebugOutput('[LightDebug][probe] aborted pre-look no-input');
        return null;
      }

      this.vm.provideInput('look');
      safety = 0;
      while (this.vm.haltReason !== 'input' && safety < 8) {
        const step = this.vm.run(200000);
        if (step.haltReason === 'input') {
          break;
        }
        if (step.haltReason === 'save' || step.haltReason === 'restore') {
          this._appendLightDebugOutput(
            '[LightDebug][probe] aborted post-look haltReason=' + step.haltReason,
            'system'
          );
          return null;
        }
        safety += 1;
      }
      const detected = /\bit is pitch black\./i.test(probeOutput);
      this._appendLightDebugOutput(
        '[LightDebug][probe] detectedPitchBlack=' + String(detected) +
        ' outputLen=' + String(probeOutput.length),
        'system'
      );
      return detected;
    } catch (error) {
      this._appendLightDebugOutput('[LightDebug][probe] error=' + error.message);
      return null;
    } finally {
      try {
        this.vm.restoreSaveState(vmSnapshot);
      } catch (restoreError) {
        // If restore fails, keep going; caller will fall back to metadata/default behavior.
      }
      this.vm.onOutput = prevOnOutput;
      this.vm.onSoundEffect = prevOnSoundEffect;
      this.vm.onUnknownOpcode = prevOnUnknownOpcode;
      this.vm.onInputRequested = prevOnInputRequested;
      this.outputBuffer = prevOutputBuffer;
      this.lastTurnWasPitchBlack = prevPendingDark;
    }
  }

  _isComputerHelpHintLine(line) {
    const normalized = String(line || '').toLowerCase();
    return normalized.includes('login your-user-id') && normalized.includes('password your-password');
  }

  _handleVmSoundEffect(event) {
    const soundEvent = event || {};
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
    const soundClass = this._resolveSoundClass(soundDef);
    this.onSoundEvent(
      Object.assign({}, soundEvent, {
        resolvedEffect: effect,
        soundClass,
      })
    );
    const isEnabledForClass = this._isEnabledForSoundClass(soundClass);
    const mappedSrc = soundDef && soundDef.src ? soundDef.src : 'none';
    const gain = this._resolveSoundGain(soundDef, volumeRaw, volumeSigned);
    this._appendDebugOutput(
      '[SFX debug] id=' + number +
      ' effect=' + this._soundEffectName(effect) +
      ' sound=' + (isEnabledForClass ? 'on' : 'off') +
      ' mapped=' + mappedSrc +
      ' gain=' + (gain === null ? 'default' : gain.toFixed(3)) +
      ' volumeRaw=' + (volumeRaw === null ? 'none' : volumeRaw) +
      ' volumeSigned=' + (volumeSigned === null ? 'none' : volumeSigned) +
      ' routine=' + (routine === null ? 'none' : routine) +
      ' operands=' + operandCount
    );
    this._recordSoundEvent(number, effect, volumeRaw);

    if (!number || !isEnabledForClass) {
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
        this._appendDebugOutput('Sound #' + number + ' requested, but no sample is mapped yet.');
      }
      return;
    }

    if (this.restoreAudioTransitionActive && soundClass === SOUND_CLASS_SFX) {
      // During restore we keep music alive unless restored execution immediately enters SFX.
      this._stopAllSoundsExcept(number);
    } else {
      this._stopAllSoundsExcept(number, soundClass);
    }
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
    this._appendDebugOutput('[VM debug] Unknown opcode ' + opText + ' at ' + addrText + '.');
  }

  _appendDebugOutput(text) {
    if (!this.debugEnabled) {
      return;
    }
    this.ui.appendOutput(text, 'system');
  }

  _appendLightDebugOutput(text) {
    if (!this.debugEnabled) {
      return;
    }
    this.ui.appendOutput(text, 'system');
  }

  _syncStatusDisplays() {
    if (!this.vm || typeof this.vm.getStatusSnapshot !== 'function') {
      this.ui.setTopbarMeta('', '', '');
      return;
    }
    const snapshot = this.vm.getStatusSnapshot();
    const roomId = snapshot && Number.isFinite(snapshot.roomObjectId) ? snapshot.roomObjectId : 0;
    const roomName = snapshot && snapshot.roomName ? snapshot.roomName : '';
    const isDark = this._isDarkForScene();
    if (
      roomId !== this.currentRoomId ||
      roomName !== this.currentRoomName ||
      isDark !== this.lastSceneIsDark
    ) {
      this._appendLightDebugOutput(
        '[LightDebug][scene] room=' + (roomName || 'unknown') +
        ' (' + String(roomId || 0) + ')' +
        ' isDark=' + String(isDark) +
        ' prevIsDark=' + String(this.lastSceneIsDark),
        'system'
      );
      this.currentRoomId = roomId;
      this.currentRoomName = roomName;
      this.lastSceneIsDark = isDark;
      this.onRoomChanged(this.currentRoomName, this.currentRoomId, { isDark });
    }
    this.ui.setTopbarMeta(
      roomName || '',
      snapshot && Number.isFinite(snapshot.score) ? String(snapshot.score) : '',
      snapshot && Number.isFinite(snapshot.moves) ? String(snapshot.moves) : ''
    );
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

  _clampVolume(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return 1;
    }
    return Math.max(0, Math.min(1, numeric));
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

  _isEnabledForSoundClass(soundClass) {
    if (soundClass === SOUND_CLASS_MUSIC) {
      return this.gameMusicEnabled;
    }
    return this.sfxEnabled;
  }

  _volumeMultiplierForSoundClass(soundClass) {
    if (soundClass === SOUND_CLASS_MUSIC) {
      return this.gameMusicVolume;
    }
    return this.sfxVolume;
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
      this._appendDebugOutput('[SFX debug] id=' + number + ' audioFactory returned no audio object.');
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
        this._appendDebugOutput(
          '[SFX debug] id=' + number + ' audio element error while loading/playing ' + soundDef.src
        );
      });
    }
    return audio;
  }

  _applySoundParams(audio, soundDef, gain) {
    const soundClass = this._resolveSoundClass(soundDef);
    const shouldLoop = this._resolveLoopSetting(soundDef);
    if (typeof audio.loop === 'boolean' || typeof audio.loop === 'undefined') {
      audio.loop = shouldLoop;
    }
    if (typeof audio.volume === 'number') {
      const baseGain = gain === null || gain === undefined ? 1 : Math.max(0, Math.min(1, gain));
      audio.volume = Math.max(0, Math.min(1, baseGain * this._volumeMultiplierForSoundClass(soundClass)));
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
          this._appendDebugOutput('[SFX debug] id=' + number + ' play() failed: ' + message);
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

  _stopAllSoundsByClass(soundClass) {
    const activeIds = Array.from(this.activeSounds.keys());
    for (const number of activeIds) {
      const activeDef = this.soundCatalog[number];
      if (this._resolveSoundClass(activeDef) !== soundClass) {
        continue;
      }
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

  _refreshActiveSoundVolumes(soundClass) {
    const activeIds = Array.from(this.activeSounds.keys());
    for (const number of activeIds) {
      const soundDef = this.soundCatalog[number];
      if (this._resolveSoundClass(soundDef) !== soundClass) {
        continue;
      }
      const audio = this.activeSounds.get(number);
      if (!audio || typeof audio.volume !== 'number') {
        continue;
      }
      this._applySoundParams(audio, soundDef, null);
    }
  }

  _prepareAudioForRestore() {
    this.restoreAudioTransitionActive = true;
    this._stopAllSoundsByClass(SOUND_CLASS_SFX);
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
