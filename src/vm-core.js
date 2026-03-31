'use strict';

function u16(value) {
  return value & 0xffff;
}

function s16(value) {
  const v = value & 0xffff;
  return (v & 0x8000) ? v - 0x10000 : v;
}

function signed14(value) {
  const v = value & 0x3fff;
  return (v & 0x2000) ? v - 0x4000 : v;
}

function read16(memory, address) {
  return ((memory[address] << 8) | memory[address + 1]) & 0xffff;
}

function write16(memory, address, value) {
  memory[address] = (value >> 8) & 0xff;
  memory[address + 1] = value & 0xff;
}

function read32(memory, address) {
  return (
    ((memory[address] << 24) >>> 0) |
    (memory[address + 1] << 16) |
    (memory[address + 2] << 8) |
    memory[address + 3]
  ) >>> 0;
}

function write32(memory, address, value) {
  const v = value >>> 0;
  memory[address] = (v >>> 24) & 0xff;
  memory[address + 1] = (v >>> 16) & 0xff;
  memory[address + 2] = (v >>> 8) & 0xff;
  memory[address + 3] = v & 0xff;
}

const STORE_OPCODES = new Set([8, 9, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 129, 130, 131, 132, 136, 142, 143, 224, 231]);
const BRANCH_OPCODES = new Set([1, 2, 3, 4, 5, 6, 7, 10, 128, 129, 130]);
const PRINTER_OPCODES = new Set([178, 179]);

class Z3VM {
  constructor(config) {
    if (!config || !config.memory || !config.header) {
      throw new Error('Z3VM requires config with memory and header');
    }

    this.memory = config.memory;
    this.originalMemory = new Uint8Array(config.memory);
    this.header = config.header;
    this.staticBase = config.header.staticBase;
    this.highMemoryBase = config.header.highMemoryBase;
    this.globalsAddress = config.header.globalsAddress;
    this.objectTableAddress = config.header.objectTableAddress || 0;
    this.abbreviationsAddress = config.header.abbreviationsAddress || 0;
    this.dictionaryAddress = config.header.dictionaryAddress || 0;
    this.propertyDefaultsAddress = this.objectTableAddress;
    this.objectsAddress = this.objectTableAddress ? (this.objectTableAddress + 62) : 0;
    this.addressMultiplier = 2;
    this.pc = config.header.initialPc;

    const io = config.io || {};
    this.onOutput = typeof io.onOutput === 'function' ? io.onOutput : function () {};
    this.onInputRequested = typeof io.onInputRequested === 'function' ? io.onInputRequested : function () {};
    this.onSoundEffect = typeof io.onSoundEffect === 'function' ? io.onSoundEffect : function () {};
    this.onUnknownOpcode = typeof io.onUnknownOpcode === 'function' ? io.onUnknownOpcode : function () {};

    this.halted = false;
    this.lastQuit = false;
    this.haltReason = null;
    this.evalStack = [];
    this.callStack = [];
    this.currentFrame = this._makeRootFrame();
    this.pendingInput = null;
    this._dictionaryMeta = null;
  }

  _makeRootFrame() {
    return {
      locals: new Uint16Array(15),
      returnPc: 0,
      storeVar: -1,
    };
  }

  _assertDynamicWrite(address, size) {
    if (address < 0 || address + size > this.staticBase) {
      throw new Error('Write outside dynamic memory at 0x' + address.toString(16));
    }
  }

  _emitOutput(text) {
    this.onOutput(String(text));
  }

  _emitSoundEffect(event) {
    this.onSoundEffect(event);
  }

  _emitUnknownOpcode(event) {
    this.onUnknownOpcode(event);
  }

  _resetMachineState() {
    this.halted = false;
    this.lastQuit = false;
    this.haltReason = null;
    this.evalStack = [];
    this.callStack = [];
    this.currentFrame = this._makeRootFrame();
    this.pendingInput = null;
    this.pc = this.header.initialPc;
  }

  _restartStory() {
    for (let i = 0; i < this.staticBase; i++) {
      this.memory[i] = this.originalMemory[i];
    }
    this._dictionaryMeta = null;
    this._resetMachineState();
  }

  _captureFrame(frame) {
    return {
      locals: Array.from(frame.locals),
      returnPc: frame.returnPc >>> 0,
      storeVar: frame.storeVar | 0,
    };
  }

  _restoreFrame(snapshot) {
    const frame = {
      locals: new Uint16Array(15),
      returnPc: snapshot && Number.isFinite(snapshot.returnPc) ? (snapshot.returnPc >>> 0) : 0,
      storeVar: snapshot && Number.isFinite(snapshot.storeVar) ? (snapshot.storeVar | 0) : -1,
    };
    const locals = snapshot && Array.isArray(snapshot.locals) ? snapshot.locals : [];
    for (let i = 0; i < frame.locals.length && i < locals.length; i++) {
      frame.locals[i] = u16(locals[i]);
    }
    return frame;
  }

  createSaveState() {
    return {
      version: 1,
      pc: this.pc >>> 0,
      halted: !!this.halted,
      lastQuit: !!this.lastQuit,
      haltReason: this.haltReason || null,
      pendingInput: this.pendingInput
        ? {
            textAddr: this.pendingInput.textAddr >>> 0,
            parseAddr: this.pendingInput.parseAddr >>> 0,
          }
        : null,
      evalStack: this.evalStack.map(value => u16(value)),
      callStack: this.callStack.map(frame => this._captureFrame(frame)),
      currentFrame: this._captureFrame(this.currentFrame),
      dynamicMemory: Array.from(this.memory.subarray(0, this.staticBase)),
    };
  }

  serializeSaveState() {
    const encoder = new TextEncoder();
    const payloadBytes = encoder.encode(JSON.stringify(this.createSaveState()));
    const out = new Uint8Array(8 + payloadBytes.length);
    out[0] = 0x54; // T
    out[1] = 0x4c; // L
    out[2] = 0x48; // H
    out[3] = 0x53; // S
    write16(out, 4, 1);
    write16(out, 6, payloadBytes.length);
    out.set(payloadBytes, 8);
    return out;
  }

  restoreSaveState(bytes) {
    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (data.length < 8) {
      throw new Error('Save data is too small');
    }
    if (data[0] !== 0x54 || data[1] !== 0x4c || data[2] !== 0x48 || data[3] !== 0x53) {
      throw new Error('Unsupported save file format');
    }
    const formatVersion = read16(data, 4);
    if (formatVersion !== 1) {
      throw new Error('Unsupported save format version: ' + formatVersion);
    }
    const payloadLength = read16(data, 6);
    if (data.length !== 8 + payloadLength) {
      throw new Error('Save payload length mismatch');
    }

    const decoder = new TextDecoder();
    const snapshot = JSON.parse(decoder.decode(data.subarray(8)));
    const dynamicMemory = Array.isArray(snapshot.dynamicMemory) ? snapshot.dynamicMemory : null;
    if (!dynamicMemory || dynamicMemory.length !== this.staticBase) {
      throw new Error('Save is incompatible with current story memory layout');
    }

    for (let i = 0; i < dynamicMemory.length; i++) {
      this.memory[i] = dynamicMemory[i] & 0xff;
    }

    this.pc = Number.isFinite(snapshot.pc) ? (snapshot.pc >>> 0) : this.header.initialPc;
    this.halted = !!snapshot.halted;
    this.lastQuit = !!snapshot.lastQuit;
    this.haltReason = snapshot.haltReason || null;
    this.pendingInput = snapshot.pendingInput
      ? {
          textAddr: Number(snapshot.pendingInput.textAddr) >>> 0,
          parseAddr: Number(snapshot.pendingInput.parseAddr) >>> 0,
        }
      : null;
    this.evalStack = Array.isArray(snapshot.evalStack)
      ? snapshot.evalStack.map(value => u16(value))
      : [];
    this.callStack = Array.isArray(snapshot.callStack)
      ? snapshot.callStack.map(frame => this._restoreFrame(frame))
      : [];
    this.currentFrame = this._restoreFrame(snapshot.currentFrame);
    this._dictionaryMeta = null;
  }

  read8(address) {
    return this.memory[address] & 0xff;
  }

  read16(address) {
    return read16(this.memory, address);
  }

  write8(address, value) {
    this._assertDynamicWrite(address, 1);
    this.memory[address] = value & 0xff;
  }

  write16(address, value) {
    this._assertDynamicWrite(address, 2);
    write16(this.memory, address, value);
  }

  getVariable(varnum) {
    if (varnum === 0) {
      if (this.evalStack.length === 0) {
        throw new Error('Stack underflow when reading variable 0');
      }
      return this.evalStack.pop();
    }
    if (varnum >= 1 && varnum <= 15) {
      return this.currentFrame.locals[varnum - 1] & 0xffff;
    }
    const globalOffset = this.globalsAddress + (varnum - 16) * 2;
    return this.read16(globalOffset);
  }

  setVariable(varnum, value) {
    const v = u16(value);
    if (varnum === 0) {
      this.evalStack.push(v);
      return v;
    }
    if (varnum >= 1 && varnum <= 15) {
      this.currentFrame.locals[varnum - 1] = v;
      return v;
    }
    const globalOffset = this.globalsAddress + (varnum - 16) * 2;
    this.write16(globalOffset, v);
    return v;
  }

  _operandValue(operand) {
    return operand.value & 0xffff;
  }

  _operandVariableRef(operand) {
    return operand.type === 'variable' ? operand.raw : operand.value;
  }

  _zsciiToText(code) {
    if (code === 13) {
      return '\n';
    }
    if (code >= 32 && code <= 126) {
      return String.fromCharCode(code);
    }
    return '';
  }

  _decodeAbbreviation(abbrevIndex, depth) {
    if (!this.abbreviationsAddress || depth > 4) {
      return '';
    }
    const wordAddress = this.read16(this.abbreviationsAddress + abbrevIndex * 2);
    const byteAddress = wordAddress * 2;
    return this._readZStringAt(byteAddress, depth + 1).text;
  }

  _getDictionaryMeta() {
    if (this._dictionaryMeta) {
      return this._dictionaryMeta;
    }
    if (!this.dictionaryAddress) {
      return null;
    }
    const base = this.dictionaryAddress;
    const separatorCount = this.read8(base);
    const separators = [];
    for (let i = 0; i < separatorCount; i++) {
      separators.push(this.read8(base + 1 + i));
    }
    const entryLength = this.read8(base + 1 + separatorCount);
    const entryCount = this.read16(base + 2 + separatorCount);
    const entriesAddress = base + 4 + separatorCount;
    this._dictionaryMeta = {
      separators,
      entryLength,
      entryCount,
      entriesAddress,
    };
    return this._dictionaryMeta;
  }

  _encodeDictionaryWord(word) {
    const a0 = 'abcdefghijklmnopqrstuvwxyz';
    const a1 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const a2 = ' \n0123456789.,!?_#\'"/\\-:()';
    const zchars = [];

    const text = String(word || '');
    for (let i = 0; i < text.length && zchars.length < 6; i++) {
      const ch = text[i];
      const c0 = a0.indexOf(ch);
      if (c0 >= 0) {
        zchars.push(c0 + 6);
        continue;
      }
      const c1 = a1.indexOf(ch);
      if (c1 >= 0) {
        zchars.push(4, c1 + 6);
        continue;
      }
      const c2 = a2.indexOf(ch);
      if (c2 >= 0) {
        zchars.push(5, c2 + 6);
        continue;
      }
      const code = ch.charCodeAt(0) & 0x3ff;
      zchars.push(5, 6, (code >> 5) & 0x1f, code & 0x1f);
    }

    while (zchars.length < 6) {
      zchars.push(5);
    }
    zchars.length = 6;

    const out = new Uint8Array(4);
    out[0] = ((zchars[0] & 0x1f) << 2) | ((zchars[1] & 0x1f) >> 3);
    out[1] = ((zchars[1] & 0x07) << 5) | (zchars[2] & 0x1f);
    out[2] = ((zchars[3] & 0x1f) << 2) | ((zchars[4] & 0x1f) >> 3);
    out[3] = ((zchars[4] & 0x07) << 5) | (zchars[5] & 0x1f);
    out[2] |= 0x80;
    return out;
  }

  _compareEncodedAt(address, encoded4) {
    for (let i = 0; i < 4; i++) {
      const a = this.read8(address + i);
      const b = encoded4[i];
      if (a < b) {
        return -1;
      }
      if (a > b) {
        return 1;
      }
    }
    return 0;
  }

  _lookupDictionaryAddress(word) {
    const meta = this._getDictionaryMeta();
    if (!meta) {
      return 0;
    }
    const encoded = this._encodeDictionaryWord(word);
    let lo = 0;
    let hi = meta.entryCount - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const addr = meta.entriesAddress + mid * meta.entryLength;
      const cmp = this._compareEncodedAt(addr, encoded);
      if (cmp === 0) {
        return addr;
      }
      if (cmp < 0) {
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return 0;
  }

  _readZStringAt(address, depth) {
    const decodeDepth = depth || 0;
    const zchars = [];
    let cursor = address;
    let stop = false;
    while (!stop) {
      const word = this.read16(cursor);
      cursor += 2;
      zchars.push((word >> 10) & 0x1f, (word >> 5) & 0x1f, word & 0x1f);
      stop = !!(word & 0x8000);
    }

    const a0 = 'abcdefghijklmnopqrstuvwxyz';
    const a1 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const a2 = ' \n0123456789.,!?_#\'"/\\-:()';

    let alphabet = 0;
    let result = '';
    for (let i = 0; i < zchars.length; i++) {
      const z = zchars[i];
      if (z === 0) {
        result += ' ';
        alphabet = 0;
        continue;
      }
      if (z >= 1 && z <= 3) {
        if (i + 1 < zchars.length) {
          const abbrevIndex = 32 * (z - 1) + zchars[++i];
          result += this._decodeAbbreviation(abbrevIndex, decodeDepth);
        }
        alphabet = 0;
        continue;
      }
      if (z === 4) {
        alphabet = 1;
        continue;
      }
      if (z === 5) {
        alphabet = 2;
        continue;
      }
      if (alphabet === 2 && z === 6) {
        if (i + 2 < zchars.length) {
          const zscii = (zchars[i + 1] << 5) | zchars[i + 2];
          result += this._zsciiToText(zscii);
          i += 2;
        }
        alphabet = 0;
        continue;
      }
      if (z >= 6) {
        const index = z - 6;
        if (alphabet === 0 && index < a0.length) {
          result += a0[index];
        } else if (alphabet === 1 && index < a1.length) {
          result += a1[index];
        } else if (alphabet === 2 && index < a2.length) {
          result += a2[index];
        }
        alphabet = 0;
      }
    }
    return { text: result, nextAddress: cursor };
  }

  _objectAddress(objectId) {
    return this.objectsAddress + 9 * (objectId - 1);
  }

  _getObjectParent(objectId) {
    return this.read8(this._objectAddress(objectId) + 4);
  }

  _getObjectSibling(objectId) {
    return this.read8(this._objectAddress(objectId) + 5);
  }

  _getObjectChild(objectId) {
    return this.read8(this._objectAddress(objectId) + 6);
  }

  _setObjectParent(objectId, parent) {
    this.write8(this._objectAddress(objectId) + 4, parent & 0xff);
  }

  _setObjectSibling(objectId, sibling) {
    this.write8(this._objectAddress(objectId) + 5, sibling & 0xff);
  }

  _setObjectChild(objectId, child) {
    this.write8(this._objectAddress(objectId) + 6, child & 0xff);
  }

  _getObjectPropertyTableAddress(objectId) {
    return this.read16(this._objectAddress(objectId) + 7);
  }

  _readObjectShortName(objectId) {
    const propertyTableAddress = this._getObjectPropertyTableAddress(objectId);
    if (!propertyTableAddress) {
      return '';
    }
    const shortNameWords = this.read8(propertyTableAddress);
    if (shortNameWords === 0) {
      return '';
    }
    return this._readZStringAt(propertyTableAddress + 1).text;
  }

  _findPropertyAddress(objectId, propertyId) {
    let address = this._getObjectPropertyTableAddress(objectId);
    const shortNameWords = this.read8(address);
    address += 1 + shortNameWords * 2;

    while (true) {
      const sizeByte = this.read8(address);
      const thisPropId = sizeByte & 0x1f;
      if (thisPropId === 0) {
        return 0;
      }
      if (thisPropId === propertyId) {
        return address + 1;
      }
      if (thisPropId < propertyId) {
        return 0;
      }
      const propLen = (sizeByte >> 5) + 1;
      address += 1 + propLen;
    }
  }

  _getPropertyLength(dataAddress) {
    if (!dataAddress) {
      return 0;
    }
    const sizeByte = this.read8(dataAddress - 1);
    return (sizeByte >> 5) + 1;
  }

  _getPropertyValue(objectId, propertyId) {
    const dataAddress = this._findPropertyAddress(objectId, propertyId);
    if (dataAddress) {
      const len = this._getPropertyLength(dataAddress);
      return len === 1 ? this.read8(dataAddress) : this.read16(dataAddress);
    }
    return this.read16(this.propertyDefaultsAddress + 2 * (propertyId - 1));
  }

  _putPropertyValue(objectId, propertyId, value) {
    const dataAddress = this._findPropertyAddress(objectId, propertyId);
    if (!dataAddress) {
      return;
    }
    const len = this._getPropertyLength(dataAddress);
    if (len === 1) {
      this.write8(dataAddress, value);
    } else {
      this.write16(dataAddress, value);
    }
  }

  _getNextPropertyId(objectId, propertyId) {
    let address = this._getObjectPropertyTableAddress(objectId);
    address += 1 + this.read8(address) * 2;

    let previous = 0;
    while (true) {
      const sizeByte = this.read8(address);
      const thisPropId = sizeByte & 0x1f;
      if (thisPropId === 0) {
        return 0;
      }
      if (propertyId === 0) {
        return thisPropId;
      }
      if (previous === propertyId) {
        return thisPropId;
      }
      const len = (sizeByte >> 5) + 1;
      address += 1 + len;
      previous = thisPropId;
    }
  }

  _testAttribute(objectId, attribute) {
    const byteAddr = this._objectAddress(objectId) + ((attribute / 8) | 0);
    const mask = 0x80 >> (attribute % 8);
    return (this.read8(byteAddr) & mask) !== 0;
  }

  _setAttribute(objectId, attribute, value) {
    const byteAddr = this._objectAddress(objectId) + ((attribute / 8) | 0);
    const mask = 0x80 >> (attribute % 8);
    const byte = this.read8(byteAddr);
    this.write8(byteAddr, value ? (byte | mask) : (byte & ~mask));
  }

  _removeObject(objectId) {
    const parent = this._getObjectParent(objectId);
    if (parent === 0) {
      return;
    }
    const firstChild = this._getObjectChild(parent);
    const sibling = this._getObjectSibling(objectId);

    if (firstChild === objectId) {
      this._setObjectChild(parent, sibling);
    } else {
      let older = firstChild;
      while (older !== 0) {
        const next = this._getObjectSibling(older);
        if (next === objectId) {
          this._setObjectSibling(older, sibling);
          break;
        }
        older = next;
      }
    }

    this._setObjectParent(objectId, 0);
    this._setObjectSibling(objectId, 0);
  }

  _insertObject(objectId, destinationId) {
    this._removeObject(objectId);
    const destFirstChild = this._getObjectChild(destinationId);
    this._setObjectParent(objectId, destinationId);
    this._setObjectSibling(objectId, destFirstChild);
    this._setObjectChild(destinationId, objectId);
  }

  decodeInstruction() {
    const offset = this.pc;
    let cursor = offset;
    let code = this.read8(cursor++);
    let opcode;
    let operandTypes;

    if (code === 190) {
      opcode = 1000 + this.read8(cursor++);
      operandTypes = [];
      const typeByte = this.read8(cursor++);
      for (let i = 0; i < 4; i++) {
        const t = (typeByte >> (6 - i * 2)) & 0x03;
        if (t !== 3) {
          operandTypes.push(t);
        }
      }
    } else if (code & 0x80) {
      if (code & 0x40) {
        const isVarForm = !!(code & 0x20);
        const low5 = code & 0x1f;
        opcode = isVarForm ? (224 + low5) : low5;
        operandTypes = [];
        const typeByte = this.read8(cursor++);
        for (let i = 0; i < 4; i++) {
          const t = (typeByte >> (6 - i * 2)) & 0x03;
          if (t !== 3) {
            operandTypes.push(t);
          }
        }
      } else {
        const shortType = (code >> 4) & 0x03;
        const low4 = code & 0x0f;
        if (shortType === 3) {
          opcode = 176 + low4;
          operandTypes = [];
        } else {
          opcode = 128 + low4;
          operandTypes = [shortType];
        }
      }
    } else {
      opcode = code & 0x1f;
      operandTypes = [(code & 0x40) ? 2 : 1, (code & 0x20) ? 2 : 1];
    }

    const operands = [];
    for (const operandType of operandTypes) {
      if (operandType === 0) {
        const raw = this.read16(cursor);
        cursor += 2;
        operands.push({ type: 'large', raw, value: raw });
      } else if (operandType === 1) {
        const raw = this.read8(cursor++);
        operands.push({ type: 'small', raw, value: raw });
      } else if (operandType === 2) {
        const raw = this.read8(cursor++);
        operands.push({ type: 'variable', raw, value: this.getVariable(raw) });
      }
    }

    let storeVar = null;
    if (STORE_OPCODES.has(opcode)) {
      storeVar = this.read8(cursor++);
    }

    let branch = null;
    if (BRANCH_OPCODES.has(opcode)) {
      const b1 = this.read8(cursor++);
      const ifTrue = !!(b1 & 0x80);
      let offsetValue;
      if (b1 & 0x40) {
        offsetValue = b1 & 0x3f;
      } else {
        const b2 = this.read8(cursor++);
        offsetValue = signed14(((b1 & 0x3f) << 8) | b2);
      }
      branch = { ifTrue, offset: offsetValue };
    }

    let literalText = null;
    if (PRINTER_OPCODES.has(opcode)) {
      const decoded = this._readZStringAt(cursor);
      literalText = decoded.text;
      cursor = decoded.nextAddress;
    }

    return {
      offset,
      opcode,
      operands,
      storeVar,
      branch,
      literalText,
      nextPc: cursor,
    };
  }

  _applyBranch(inst, condition) {
    if (!inst.branch) {
      return;
    }
    if (!!condition !== inst.branch.ifTrue) {
      return;
    }

    const branchOffset = inst.branch.offset;
    if (branchOffset === 0 || branchOffset === 1) {
      this._retFromRoutine(branchOffset);
      return;
    }
    this.pc = inst.nextPc + branchOffset - 2;
  }

  _callRoutine(packedAddress, storeVar, nextPc, args) {
    if (packedAddress === 0) {
      if (storeVar !== null && storeVar !== undefined) {
        this.setVariable(storeVar, 0);
      }
      this.pc = nextPc;
      return;
    }

    const routineAddress = packedAddress * this.addressMultiplier;
    const localsCount = this.read8(routineAddress);
    if (localsCount > 15) {
      throw new Error('Invalid locals count in routine: ' + localsCount);
    }

    const newFrame = {
      locals: new Uint16Array(15),
      returnPc: nextPc,
      storeVar: (storeVar === null || storeVar === undefined) ? -1 : storeVar,
    };

    let cursor = routineAddress + 1;
    for (let i = 0; i < localsCount; i++) {
      newFrame.locals[i] = this.read16(cursor);
      cursor += 2;
    }
    for (let i = 0; i < args.length && i < localsCount; i++) {
      newFrame.locals[i] = u16(args[i]);
    }

    this.callStack.push(this.currentFrame);
    this.currentFrame = newFrame;
    this.pc = cursor;
  }

  _retFromRoutine(value) {
    const result = u16(value);
    const finishedFrame = this.currentFrame;

    if (this.callStack.length === 0) {
      this.halted = true;
      this.haltReason = 'return';
      return result;
    }

    this.currentFrame = this.callStack.pop();
    this.pc = finishedFrame.returnPc;
    if (finishedFrame.storeVar >= 0) {
      this.setVariable(finishedFrame.storeVar, result);
    }
    return result;
  }

  _tokenizeInput(command) {
    const words = [];
    const text = (command || '').toLowerCase();
    const dict = this._getDictionaryMeta();
    const separators = (dict ? dict.separators : [46, 44, 34]).map(code => String.fromCharCode(code));
    const separatorSet = new Set(separators);
    let start = -1;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === ' ') {
        if (start >= 0) {
          words.push({ word: text.slice(start, i), pos: start + 1 });
          start = -1;
        }
      } else if (separatorSet.has(ch)) {
        if (start >= 0) {
          words.push({ word: text.slice(start, i), pos: start + 1 });
          start = -1;
        }
        words.push({ word: ch, pos: i + 1 });
      } else if (start < 0) {
        start = i;
      }
    }
    if (start >= 0) {
      words.push({ word: text.slice(start), pos: start + 1 });
    }
    return words;
  }

  _writeReadBuffers(command, textAddr, parseAddr) {
    const maxLen = this.read8(textAddr);
    const normalized = String(command || '').toLowerCase().slice(0, Math.max(0, maxLen - 1));

    for (let i = 0; i < normalized.length; i++) {
      this.write8(textAddr + 1 + i, normalized.charCodeAt(i));
    }
    this.write8(textAddr + 1 + normalized.length, 0);

    if (!parseAddr) {
      return;
    }

    const words = this._tokenizeInput(normalized);
    const maxWords = this.read8(parseAddr);
    const count = Math.min(maxWords, words.length);
    this.write8(parseAddr + 1, count);
    for (let i = 0; i < count; i++) {
      const entryAddr = parseAddr + 2 + i * 4;
      const dictAddress = this._lookupDictionaryAddress(words[i].word);
      this.write16(entryAddr, dictAddress);
      this.write8(entryAddr + 2, words[i].word.length & 0xff);
      this.write8(entryAddr + 3, words[i].pos & 0xff);
    }
  }

  provideInput(command) {
    if (!this.pendingInput) {
      throw new Error('No pending input request');
    }
    this._writeReadBuffers(command, this.pendingInput.textAddr, this.pendingInput.parseAddr);
    this.pendingInput = null;
    this.halted = false;
    this.haltReason = null;
  }

  getStatusSnapshot() {
    const roomObjectId = this.read16(this.globalsAddress);
    const secondary = this.read16(this.globalsAddress + 2);
    const tertiary = this.read16(this.globalsAddress + 4);
    return {
      roomObjectId,
      roomName: roomObjectId ? this._readObjectShortName(roomObjectId) : '',
      score: s16(secondary),
      moves: tertiary & 0xffff,
    };
  }

  executeInstruction(inst) {
    const op = inst.opcode;
    const o = index => this._operandValue(inst.operands[index]);
    const vref = index => this._operandVariableRef(inst.operands[index]);
    this.pc = inst.nextPc;

    switch (op) {
      case 1: {
        let cond = false;
        const first = o(0);
        for (let i = 1; i < inst.operands.length; i++) {
          if (o(i) === first) {
            cond = true;
            break;
          }
        }
        this._applyBranch(inst, cond);
        return;
      }
      case 2:
        this._applyBranch(inst, s16(o(0)) < s16(o(1)));
        return;
      case 3:
        this._applyBranch(inst, s16(o(0)) > s16(o(1)));
        return;
      case 4: {
        const varnum = vref(0);
        const nextValue = u16(this.getVariable(varnum) - 1);
        this.setVariable(varnum, nextValue);
        this._applyBranch(inst, s16(nextValue) < s16(o(1)));
        return;
      }
      case 5: {
        const varnum = vref(0);
        const nextValue = u16(this.getVariable(varnum) + 1);
        this.setVariable(varnum, nextValue);
        this._applyBranch(inst, s16(nextValue) > s16(o(1)));
        return;
      }
      case 8:
        this.setVariable(inst.storeVar, o(0) | o(1));
        return;
      case 9:
        this.setVariable(inst.storeVar, o(0) & o(1));
        return;
      case 6:
        this._applyBranch(inst, this._getObjectParent(o(0)) === o(1));
        return;
      case 7:
        this._applyBranch(inst, (o(0) & o(1)) === o(1));
        return;
      case 10:
        this._applyBranch(inst, this._testAttribute(o(0), o(1)));
        return;
      case 11:
        this._setAttribute(o(0), o(1), true);
        return;
      case 12:
        this._setAttribute(o(0), o(1), false);
        return;
      case 13:
        this.setVariable(vref(0), o(1));
        return;
      case 14:
        this._insertObject(o(0), o(1));
        return;
      case 15:
        this.setVariable(inst.storeVar, this.read16(u16(o(0) + 2 * s16(o(1)))));
        return;
      case 16:
        this.setVariable(inst.storeVar, this.read8(u16(o(0) + s16(o(1)))));
        return;
      case 17:
        this.setVariable(inst.storeVar, this._getPropertyValue(o(0), o(1)));
        return;
      case 18:
        this.setVariable(inst.storeVar, this._findPropertyAddress(o(0), o(1)));
        return;
      case 19:
        this.setVariable(inst.storeVar, this._getNextPropertyId(o(0), o(1)));
        return;
      case 20:
        this.setVariable(inst.storeVar, u16(o(0) + o(1)));
        return;
      case 21:
        this.setVariable(inst.storeVar, u16(o(0) - o(1)));
        return;
      case 22:
        this.setVariable(inst.storeVar, u16(s16(o(0)) * s16(o(1))));
        return;
      case 23: {
        const divisor = s16(o(1));
        if (divisor === 0) {
          throw new Error('Division by zero');
        }
        this.setVariable(inst.storeVar, u16((s16(o(0)) / divisor) | 0));
        return;
      }
      case 24: {
        const divisor = s16(o(1));
        if (divisor === 0) {
          throw new Error('Modulo by zero');
        }
        this.setVariable(inst.storeVar, u16(s16(o(0)) % divisor));
        return;
      }
      case 25:
        this._callRoutine(o(0), inst.storeVar, inst.nextPc, [o(1)]);
        return;
      case 26:
        this._callRoutine(o(0), null, inst.nextPc, [o(1)]);
        return;
      case 128:
        this._applyBranch(inst, o(0) === 0);
        return;
      case 129: {
        const sibling = this._getObjectSibling(o(0));
        this.setVariable(inst.storeVar, sibling);
        this._applyBranch(inst, sibling !== 0);
        return;
      }
      case 130: {
        const child = this._getObjectChild(o(0));
        this.setVariable(inst.storeVar, child);
        this._applyBranch(inst, child !== 0);
        return;
      }
      case 131:
        this.setVariable(inst.storeVar, this._getObjectParent(o(0)));
        return;
      case 132:
        this.setVariable(inst.storeVar, this._getPropertyLength(o(0)));
        return;
      case 133: {
        const varnum = vref(0);
        this.setVariable(varnum, u16(this.getVariable(varnum) + 1));
        return;
      }
      case 134: {
        const varnum = vref(0);
        this.setVariable(varnum, u16(this.getVariable(varnum) - 1));
        return;
      }
      case 135:
        this._emitOutput(this._readZStringAt(o(0)).text);
        return;
      case 136:
        this._callRoutine(o(0), inst.storeVar, inst.nextPc, []);
        return;
      case 137:
        this._removeObject(o(0));
        return;
      case 138:
        this._emitOutput(this._readObjectShortName(o(0)));
        return;
      case 139:
        this._retFromRoutine(o(0));
        return;
      case 140:
        this.pc = inst.nextPc + s16(o(0)) - 2;
        return;
      case 141:
        this._emitOutput(this._readZStringAt(o(0) * this.addressMultiplier).text);
        return;
      case 142:
        this.setVariable(inst.storeVar, this.getVariable(vref(0)));
        return;
      case 143:
        this.setVariable(inst.storeVar, u16(~o(0)));
        return;
      case 176:
        this._retFromRoutine(1);
        return;
      case 177:
        this._retFromRoutine(0);
        return;
      case 178:
        this._emitOutput(inst.literalText || '');
        return;
      case 179:
        this._emitOutput(inst.literalText || '');
        this._emitOutput('\n');
        this._retFromRoutine(1);
        return;
      case 180:
        return;
      case 183:
        this._restartStory();
        return;
      case 184:
        this._retFromRoutine(this.getVariable(0));
        return;
      case 185:
        this.getVariable(0);
        return;
      case 186:
        this.lastQuit = true;
        this.halted = true;
        this.haltReason = 'quit';
        return;
      case 187:
        this._emitOutput('\n');
        return;
      case 188:
        return;
      case 224: {
        const routine = inst.operands.length > 0 ? o(0) : 0;
        const args = [];
        for (let i = 1; i < inst.operands.length; i++) {
          args.push(o(i));
        }
        this._callRoutine(routine, inst.storeVar, inst.nextPc, args);
        return;
      }
      case 225:
        this.write16(u16(o(0) + 2 * s16(o(1))), o(2));
        return;
      case 226:
        this.write8(u16(o(0) + s16(o(1))), o(2));
        return;
      case 227:
        this._putPropertyValue(o(0), o(1), o(2));
        return;
      case 228:
        this.pendingInput = {
          textAddr: o(0),
          parseAddr: o(1) || 0,
        };
        this.halted = true;
        this.haltReason = 'input';
        this.onInputRequested(this.pendingInput);
        return;
      case 229:
        this._emitOutput(String.fromCharCode(o(0) & 0xff));
        return;
      case 230:
        this._emitOutput(String(s16(o(0))));
        return;
      case 231:
        if (s16(o(0)) <= 0) {
          this.setVariable(inst.storeVar, 0);
        } else {
          this.setVariable(inst.storeVar, Math.floor(Math.random() * s16(o(0))) + 1);
        }
        return;
      case 232:
        this.setVariable(0, o(0));
        return;
      case 233:
        this.setVariable(vref(0), this.getVariable(0));
        return;
      case 245:
        {
          const volumeRaw = inst.operands.length > 2 ? o(2) : null;
          const volumeSigned = volumeRaw === null ? null : s16(volumeRaw);
          const routine = inst.operands.length > 3 ? o(3) : null;
        this._emitSoundEffect({
          number: inst.operands.length > 0 ? o(0) : 0,
          effect: inst.operands.length > 1 ? o(1) : 2,
          volume: volumeSigned,
          volumeRaw,
          volumeSigned,
          routine,
          operandCount: inst.operands.length,
        });
        return;
        }
      default: {
        this._emitUnknownOpcode({
          opcode: op,
          offset: inst.offset,
          operands: inst.operands.map(operand => ({
            type: operand.type,
            raw: operand.raw,
            value: operand.value,
          })),
        });
        throw new Error('Unsupported opcode in VM core: ' + op + ' at 0x' + inst.offset.toString(16));
      }
    }
  }

  step() {
    if (this.halted) {
      return null;
    }
    const inst = this.decodeInstruction();
    this.executeInstruction(inst);
    return inst;
  }

  run(maxSteps) {
    const limit = Number.isInteger(maxSteps) ? maxSteps : 100000;
    let steps = 0;
    while (!this.halted && steps < limit) {
      this.step();
      steps++;
    }
    if (!this.halted && steps >= limit) {
      throw new Error('VM step limit reached');
    }
    return { steps, quit: this.lastQuit, haltReason: this.haltReason };
  }
}

  if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Z3VM,
    s16,
    u16,
  };
}

if (typeof window !== 'undefined') {
  window.Z3VM = Z3VM;
}
