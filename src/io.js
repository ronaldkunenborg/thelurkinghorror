'use strict';

class GameIoController {
  constructor(ui) {
    if (!ui) {
      throw new Error('GameIoController requires a UI instance');
    }
    this.ui = ui;
    this.vm = null;
    this.storyMeta = null;

    this.ui.setCommandHandler(command => this.submitCommand(command));
  }

  async loadStoryFromArrayBuffer(buffer) {
    const parsed = window.parseZ3Story(buffer);
    this.storyMeta = parsed;
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

  runVm() {
    if (!this.vm) {
      return;
    }
    const result = this.vm.run(200000);
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

  _handleVmOutput(text) {
    if (text === '\n') {
      this.ui.appendOutput('');
      return;
    }
    const normalized = String(text).replace(/\r/g, '\n');
    const lines = normalized.split('\n');
    for (let i = 0; i < lines.length; i++) {
      this.ui.appendOutput(lines[i]);
    }
  }

  _handleInputRequested() {
    this.ui.setStatus('Awaiting command', 'Input requested');
    this.ui.focusInput();
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
