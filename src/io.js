'use strict';

const COMPUTER_HELP_HINT =
  'You push the friendly-looking HELP key. A spritely little box appears on the screen, which reads: "You should "LOGIN your-user-id" and then "PASSWORD your-password"."';
const COMPUTER_HELP_NOTE =
  'Note: according to the manual, the login is 872325412 and the password is uhlersoth.';

class GameIoController {
  constructor(ui) {
    if (!ui) {
      throw new Error('GameIoController requires a UI instance');
    }
    this.ui = ui;
    this.vm = null;
    this.storyMeta = null;
    this.outputBuffer = '';
    this.currentRoomName = '';
    this.previousVmLine = '';
    this.soundEnabled = true;

    this.ui.setCommandHandler(command => this.submitCommand(command));
  }

  async loadStoryFromArrayBuffer(buffer) {
    const parsed = window.parseZ3Story(buffer);
    this.storyMeta = parsed;
    this.outputBuffer = '';
    this.currentRoomName = '';
    this.previousVmLine = '';
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
    const result = this.vm.run(200000);
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
    const normalized = String(command || '').trim().toUpperCase();
    if (!normalized.startsWith('$')) {
      return false;
    }
    if (normalized === '$SOUND') {
      this.soundEnabled = !this.soundEnabled;
      this.ui.appendOutput(
        'Sound is now ' + (this.soundEnabled ? 'on' : 'off') + '. Audio playback is not implemented yet; this toggles the interpreter preference only.',
        'system'
      );
      this.ui.setStatus('Interpreter command', this.soundEnabled ? 'Sound on' : 'Sound off');
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
      this.currentRoomName = this.previousVmLine;
    }
    if (line === COMPUTER_HELP_HINT && this.currentRoomName === 'Terminal Room') {
      this.ui.appendOutput(COMPUTER_HELP_NOTE, 'system');
    }
    this.previousVmLine = line;
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
