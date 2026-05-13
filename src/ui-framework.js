'use strict';

class UiFramework {
  constructor(options) {
    const opts = options || {};
    this.outputEl = opts.outputEl;
    this.inputEl = opts.inputEl;
    this.promptEl = opts.promptEl;
    this.statusLeftEl = opts.statusLeftEl;
    this.statusRightEl = opts.statusRightEl;
    this.topbarRoomEls = normalizeElements(opts.topbarRoomEls || opts.topbarRoomEl);
    this.topbarScoreEls = normalizeElements(opts.topbarScoreEls || opts.topbarScoreEl);
    this.topbarMovesEls = normalizeElements(opts.topbarMovesEls || opts.topbarMovesEl);

    if (!this.outputEl || !this.inputEl || !this.statusLeftEl || !this.statusRightEl) {
      throw new Error('UiFramework requires output, input, and status elements');
    }

    this.commandHistory = [];
    this.historyIndex = 0;
    this.onCommand = null;
    this.prompt = opts.prompt || '>';

    this.setPrompt(this.prompt);
    this._bindInputEvents();
  }

  setPrompt(prompt) {
    this.prompt = prompt || '>';
    if (this.promptEl) {
      this.promptEl.textContent = this.prompt;
    }
  }

  setStatus(leftText, rightText) {
    this.statusLeftEl.textContent = leftText || '';
    this.statusRightEl.textContent = rightText || '';
  }

  setTopbarMeta(roomName, score, moves) {
    for (const element of this.topbarRoomEls) {
      element.textContent = roomName || '';
    }
    for (const element of this.topbarScoreEls) {
      element.textContent = score === '' ? '--' : String(score);
    }
    for (const element of this.topbarMovesEls) {
      element.textContent = moves === '' ? '--' : String(moves);
    }
  }

  appendOutput(text, cssClass) {
    const line = document.createElement('div');
    line.className = cssClass ? 'line ' + cssClass : 'line';
    line.textContent = text;
    this.outputEl.appendChild(line);
    this.outputEl.scrollTop = this.outputEl.scrollHeight;
    return line;
  }

  clearOutput() {
    this.outputEl.innerHTML = '';
  }

  focusInput() {
    if (this.inputEl.disabled) {
      return;
    }
    this.inputEl.focus();
  }

  setInputValue(text) {
    this.inputEl.value = text || '';
    this.focusInput();
  }

  setInputEnabled(enabled) {
    this.inputEl.disabled = !enabled;
    if (enabled) {
      this.focusInput();
    }
  }

  setCommandHandler(handler) {
    this.onCommand = handler;
  }

  _pushHistory(command) {
    if (!command) {
      return;
    }
    const last = this.commandHistory[this.commandHistory.length - 1];
    if (last !== command) {
      this.commandHistory.push(command);
    }
    this.historyIndex = this.commandHistory.length;
  }

  _showHistory(direction) {
    if (this.commandHistory.length === 0) {
      return;
    }
    this.historyIndex += direction;
    if (this.historyIndex < 0) {
      this.historyIndex = 0;
    }
    if (this.historyIndex > this.commandHistory.length) {
      this.historyIndex = this.commandHistory.length;
    }

    if (this.historyIndex === this.commandHistory.length) {
      this.inputEl.value = '';
      return;
    }
    this.inputEl.value = this.commandHistory[this.historyIndex];
  }

  _bindInputEvents() {
    this.inputEl.addEventListener('keydown', event => {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        this._showHistory(-1);
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this._showHistory(1);
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        if (this.inputEl.disabled) {
          return;
        }
        const command = this.inputEl.value.trim();
        if (!command) {
          return;
        }
        this.appendOutput(this.prompt + ' ' + command, 'command');
        this._pushHistory(command);
        this.inputEl.value = '';
        if (typeof this.onCommand === 'function') {
          this.onCommand(command);
        }
      }
    });
  }
}

function normalizeElements(input) {
  if (!input) {
    return [];
  }
  if (Array.isArray(input)) {
    return input.filter(Boolean);
  }
  if (typeof input.length === 'number' && typeof input !== 'string' && !input.nodeType) {
    return Array.from(input).filter(Boolean);
  }
  return [input];
}

window.UiFramework = UiFramework;
