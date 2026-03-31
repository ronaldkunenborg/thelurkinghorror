'use strict';

const assert = require('assert');
const { Z3VM } = require('../src/vm-core.js');

function write16(memory, address, value) {
  memory[address] = (value >> 8) & 0xff;
  memory[address + 1] = value & 0xff;
}

function checksum(memory) {
  let sum = 0;
  for (let i = 0x40; i < memory.length; i++) {
    sum = (sum + memory[i]) & 0xffff;
  }
  return sum;
}

function createVm(programBytes, options) {
  const opts = Object.assign(
    {
      size: 0x400,
      initialPc: 0x40,
      staticBase: 0x300,
      globalsAddress: 0x100,
      highMemoryBase: 0x40,
    },
    options || {}
  );

  const memory = new Uint8Array(opts.size);
  memory[0x00] = 3;
  write16(memory, 0x04, opts.highMemoryBase);
  write16(memory, 0x06, opts.initialPc);
  write16(memory, 0x08, 0x200);
  write16(memory, 0x0a, 0x220);
  write16(memory, 0x0c, opts.globalsAddress);
  write16(memory, 0x0e, opts.staticBase);
  write16(memory, 0x1a, opts.size / 2);

  for (let i = 0; i < programBytes.length; i++) {
    memory[opts.initialPc + i] = programBytes[i];
  }

  write16(memory, 0x1c, checksum(memory));

  return new Z3VM({
    memory,
    header: {
      highMemoryBase: opts.highMemoryBase,
      initialPc: opts.initialPc,
      globalsAddress: opts.globalsAddress,
      staticBase: opts.staticBase,
      objectTableAddress: 0x220,
    },
  });
}

function testDecoderAndArithmetic() {
  // add 7 5 -> g0 ; and 6 3 -> g1 ; or 1 2 -> g2 ; sub 10 4 -> g3 ; quit
  const program = [
    0x14, 0x07, 0x05, 0x10,
    0x09, 0x06, 0x03, 0x11,
    0x08, 0x01, 0x02, 0x12,
    0x15, 0x0a, 0x04, 0x13,
    0xba,
  ];
  const vm = createVm(program);

  const decoded = vm.decodeInstruction();
  assert.strictEqual(decoded.opcode, 20, 'Expected first opcode to be add (20)');
  assert.strictEqual(decoded.operands[0].value, 7);
  assert.strictEqual(decoded.operands[1].value, 5);
  assert.strictEqual(decoded.storeVar, 0x10);

  vm.run();
  assert.strictEqual(vm.read16(0x100), 12, 'add result mismatch');
  assert.strictEqual(vm.read16(0x102), 2, 'and result mismatch');
  assert.strictEqual(vm.read16(0x104), 3, 'or result mismatch');
  assert.strictEqual(vm.read16(0x106), 6, 'sub result mismatch');
}

function testStackAndVariableManagement() {
  // push 9 ; push 3 ; pull g0 ; pull g1 ; quit
  const program = [
    0xe8, 0x7f, 0x09, // VAR 232 push 9
    0xe8, 0x7f, 0x03, // push 3
    0xe9, 0xbf, 0x10, // pull g0
    0xe9, 0xbf, 0x11, // pull g1
    0xba,
  ];
  const vm = createVm(program);
  vm.run();
  assert.strictEqual(vm.read16(0x100), 3, 'pull should retrieve last pushed value');
  assert.strictEqual(vm.read16(0x102), 9, 'pull should retrieve next pushed value');
}

function testMemoryOpcodes() {
  const base = 0x0180;
  const vm = createVm([0xba]);
  vm.executeInstruction({
    opcode: 225,
    operands: [
      { type: 'small', raw: 0, value: base },
      { type: 'small', raw: 0, value: 0x0000 },
      { type: 'large', raw: 0x1234, value: 0x1234 },
    ],
    nextPc: vm.pc,
    offset: vm.pc,
  });
  vm.executeInstruction({
    opcode: 15,
    operands: [
      { type: 'small', raw: 0, value: base },
      { type: 'small', raw: 0, value: 0x0000 },
    ],
    storeVar: 0x11,
    nextPc: vm.pc,
    offset: vm.pc,
  });
  vm.executeInstruction({
    opcode: 226,
    operands: [
      { type: 'small', raw: 0, value: base },
      { type: 'small', raw: 0, value: 0x0002 },
      { type: 'small', raw: 0x77, value: 0x77 },
    ],
    nextPc: vm.pc,
    offset: vm.pc,
  });
  vm.executeInstruction({
    opcode: 16,
    operands: [
      { type: 'small', raw: 0, value: base },
      { type: 'small', raw: 0, value: 0x0002 },
    ],
    storeVar: 0x12,
    nextPc: vm.pc,
    offset: vm.pc,
  });
  assert.strictEqual(vm.read16(0x102), 0x1234, 'loadw result mismatch');
  assert.strictEqual(vm.read16(0x104), 0x77, 'loadb result mismatch');
}

function testSimpleBranching() {
  // jz 0 ?+6 ; store g0 1 ; nop ; store g0 2 ; quit
  const program = [
    0x90, 0x00, 0xc6,
    0x0d, 0x10, 0x01,
    0xb4,
    0x0d, 0x10, 0x02,
    0xba,
  ];
  const vm = createVm(program);
  vm.run();
  assert.strictEqual(vm.read16(0x100), 2, 'branch should skip first store and execute second');
}

function testCallAndReturn() {
  // call (VAR) packed 0x30 -> g0 ; quit ; routine@0x60: 0 locals, rtrue
  const program = [
    0xe0, 0x3f, 0x00, 0x30, 0x10,
    0xba,
  ];
  const vm = createVm(program);
  const routineAddr = 0x60;
  vm.memory[routineAddr] = 0x00;
  vm.memory[routineAddr + 1] = 0xb0; // rtrue
  vm.run();
  assert.strictEqual(vm.read16(0x100), 1, 'call should store routine return value in g0');
}

function testObjectTableAddressing() {
  const vm = createVm([0xba], { size: 0x500 });
  const objectTableAddress = 0x220;
  const objectsAddress = objectTableAddress + 62;

  write16(vm.memory, objectsAddress + 7, 0x3456);

  vm.memory[objectsAddress + 4] = 0x11;
  vm.memory[objectsAddress + 5] = 0x22;
  vm.memory[objectsAddress + 6] = 0x33;

  vm.memory[objectsAddress + 9 + 4] = 0x44;

  assert.strictEqual(vm._getObjectParent(1), 0x11, 'object 1 parent should come from first object entry');
  assert.strictEqual(vm._getObjectSibling(1), 0x22, 'object 1 sibling should come from first object entry');
  assert.strictEqual(vm._getObjectChild(1), 0x33, 'object 1 child should come from first object entry');
  assert.strictEqual(vm._getObjectPropertyTableAddress(1), 0x3456, 'object 1 property table should come from first object entry');
  assert.strictEqual(vm._getObjectParent(2), 0x44, 'object 2 should use the next object entry');
}

function testPrintObjectUsesShortName() {
  let output = '';
  const vm = createVm([0xba], { size: 0x500 });
  vm.onOutput = text => {
    output += text;
  };
  vm._readObjectShortName = objectId => {
    assert.strictEqual(objectId, 1, 'print_obj should request the target object short name');
    return 'foo';
  };

  vm.executeInstruction({
    opcode: 138,
    operands: [{ type: 'small', raw: 1, value: 1 }],
    nextPc: vm.pc,
    offset: vm.pc,
  });

  assert.strictEqual(output, 'foo', 'print_obj should emit the object short name');
}

function testPrintAddrUsesByteAddress() {
  let output = '';
  const vm = createVm([0xba], { size: 0x500 });
  vm.onOutput = text => {
    output += text;
  };
  vm._readZStringAt = address => {
    assert.strictEqual(address, 0x345, 'print_addr should decode from the supplied byte address');
    return { text: 'bar' };
  };

  vm.executeInstruction({
    opcode: 135,
    operands: [{ type: 'large', raw: 0x345, value: 0x345 }],
    nextPc: vm.pc,
    offset: vm.pc,
  });

  assert.strictEqual(output, 'bar', 'print_addr should emit decoded text');
}

function testSoundEffectOpcodeEmitsEvent() {
  const vm = createVm([0xba]);
  let captured = null;
  vm.onSoundEffect = event => {
    captured = event;
  };

  vm.executeInstruction({
    opcode: 245,
    operands: [
      { type: 'small', raw: 3, value: 3 },
      { type: 'small', raw: 2, value: 2 },
      { type: 'small', raw: 8, value: 8 },
      { type: 'small', raw: 0x40, value: 0x40 },
    ],
    nextPc: vm.pc,
    offset: vm.pc,
  });

  assert.deepStrictEqual(
    captured,
    { number: 3, effect: 2, volume: 8, volumeRaw: 8, volumeSigned: 8, routine: 0x40, operandCount: 4 },
    'sound_effect should forward event parameters to the I/O hook'
  );
}

function testRestartRestoresDynamicMemoryAndPc() {
  const vm = createVm([0xb7, 0xba]);
  vm.write8(0x80, 0x33);
  vm.write16(0x100, 7);
  vm.evalStack.push(9);
  vm.callStack.push(vm._makeRootFrame());
  vm.currentFrame.locals[0] = 0x55;
  vm.pc = 0x99;
  vm.halted = true;
  vm.haltReason = 'input';
  vm.pendingInput = { textAddr: 1, parseAddr: 2 };

  vm.executeInstruction({
    opcode: 183,
    operands: [],
    nextPc: 0x41,
    offset: 0x40,
  });

  assert.strictEqual(vm.read8(0x80), 0, 'restart should restore original dynamic memory');
  assert.strictEqual(vm.read16(0x100), 0, 'restart should restore globals from original story state');
  assert.strictEqual(vm.pc, 0x40, 'restart should reset PC to initial address');
  assert.deepStrictEqual(vm.evalStack, [], 'restart should clear evaluation stack');
  assert.deepStrictEqual(vm.callStack, [], 'restart should clear call stack');
  assert.strictEqual(vm.currentFrame.locals[0], 0, 'restart should reset locals');
  assert.strictEqual(vm.pendingInput, null, 'restart should clear pending input');
  assert.strictEqual(vm.halted, false, 'restart should resume execution state');
  assert.strictEqual(vm.haltReason, null, 'restart should clear halt reason');
}

function testStatusSnapshotExposesRoomScoreAndMoves() {
  const vm = createVm([0xba], { size: 0x500 });
  vm._readObjectShortName = objectId => {
    assert.strictEqual(objectId, 12, 'status snapshot should read the current room object name');
    return 'Terminal Room';
  };

  write16(vm.memory, 0x100, 12);
  write16(vm.memory, 0x102, 42);
  write16(vm.memory, 0x104, 99);

  assert.deepStrictEqual(
    vm.getStatusSnapshot(),
    {
      roomObjectId: 12,
      roomName: 'Terminal Room',
      score: 42,
      moves: 99,
    },
    'status snapshot should expose room, score, and moves from global variables'
  );
}

function testSaveStateRoundTripRestoresVmState() {
  const vm = createVm([0xba], { size: 0x500 });
  vm.write8(0x80, 0x7a);
  vm.pc = 0x4567;
  vm.halted = true;
  vm.haltReason = 'input';
  vm.pendingInput = { textAddr: 0x120, parseAddr: 0x140 };
  vm.evalStack = [1, 2, 3];
  vm.currentFrame.locals[0] = 0x2222;
  vm.currentFrame.returnPc = 0x3333;
  vm.currentFrame.storeVar = 0x10;
  vm.callStack.push({
    locals: new Uint16Array([9, 8, 7]),
    returnPc: 0x1234,
    storeVar: 0x11,
  });

  const saved = vm.serializeSaveState();

  vm.write8(0x80, 0x00);
  vm.pc = 0;
  vm.halted = false;
  vm.haltReason = null;
  vm.pendingInput = null;
  vm.evalStack = [];
  vm.callStack = [];
  vm.currentFrame = vm._makeRootFrame();

  vm.restoreSaveState(saved);

  assert.strictEqual(vm.read8(0x80), 0x7a, 'restore should restore dynamic memory');
  assert.strictEqual(vm.pc, 0x4567, 'restore should restore program counter');
  assert.strictEqual(vm.halted, true, 'restore should restore halted flag');
  assert.strictEqual(vm.haltReason, 'input', 'restore should restore halt reason');
  assert.deepStrictEqual(vm.pendingInput, { textAddr: 0x120, parseAddr: 0x140 }, 'restore should restore pending input');
  assert.deepStrictEqual(vm.evalStack, [1, 2, 3], 'restore should restore evaluation stack');
  assert.strictEqual(vm.callStack.length, 1, 'restore should restore call stack frames');
  assert.strictEqual(vm.callStack[0].locals[0], 9, 'restore should restore frame locals');
  assert.strictEqual(vm.currentFrame.locals[0], 0x2222, 'restore should restore current frame locals');
}

function testSaveOpcodeSerializesSuccessfulBranchContinuation() {
  const vm = createVm([0xba], { size: 0x500 });
  vm.write8(0x80, 0x7a);
  vm.pc = 0x4567;
  vm.executeInstruction({
    opcode: 181,
    operands: [],
    branch: { ifTrue: true, offset: 4 },
    nextPc: 0x4569,
    offset: 0x4567,
  });

  assert.strictEqual(vm.halted, true, 'save opcode should halt the VM while storage is pending');
  assert.strictEqual(vm.haltReason, 'save', 'save opcode should expose save halt reason');

  const saved = vm.serializePendingSaveState();
  const restoredVm = createVm([0xba], { size: 0x500 });
  restoredVm.restoreSaveState(saved);

  assert.strictEqual(restoredVm.pc, 0x456b, 'serialized save should resume at the successful save branch target');
  assert.strictEqual(restoredVm.halted, false, 'serialized save should not preserve transient save halt state');
  assert.strictEqual(restoredVm.haltReason, null, 'serialized save should clear transient save halt reason');
  assert.strictEqual(restoredVm.read8(0x80), 0x7a, 'serialized save should preserve dynamic memory');
}

function testSaveOpcodeCompletionAppliesSuccessAndFailureBranches() {
  const successVm = createVm([0xba]);
  successVm.executeInstruction({
    opcode: 181,
    operands: [],
    branch: { ifTrue: true, offset: 6 },
    nextPc: 0x90,
    offset: 0x80,
  });
  successVm.completePendingSave(true);
  assert.strictEqual(successVm.halted, false, 'successful save completion should resume execution');
  assert.strictEqual(successVm.haltReason, null, 'successful save completion should clear halt reason');
  assert.strictEqual(successVm.pc, 0x94, 'successful save completion should branch true');

  const failureVm = createVm([0xba]);
  failureVm.executeInstruction({
    opcode: 181,
    operands: [],
    branch: { ifTrue: true, offset: 6 },
    nextPc: 0x90,
    offset: 0x80,
  });
  failureVm.completePendingSave(false);
  assert.strictEqual(failureVm.pc, 0x90, 'failed save completion should fall through without branching');
}

function testRestoreOpcodeCompletionAppliesFailureBranch() {
  const vm = createVm([0xba]);
  vm.executeInstruction({
    opcode: 182,
    operands: [],
    branch: { ifTrue: true, offset: 5 },
    nextPc: 0xa0,
    offset: 0x90,
  });

  assert.strictEqual(vm.halted, true, 'restore opcode should halt the VM while storage is pending');
  assert.strictEqual(vm.haltReason, 'restore', 'restore opcode should expose restore halt reason');

  vm.completePendingRestore(false);

  assert.strictEqual(vm.halted, false, 'failed restore should resume execution');
  assert.strictEqual(vm.haltReason, null, 'failed restore should clear halt reason');
  assert.strictEqual(vm.pc, 0xa0, 'failed restore should fall through without branching');
}

function testUnknownOpcodeEmitsDebugEvent() {
  const vm = createVm([0xba]);
  let unknown = null;
  vm.onUnknownOpcode = event => {
    unknown = event;
  };

  assert.throws(
    () => {
      vm.executeInstruction({
        opcode: 999,
        operands: [{ type: 'small', raw: 7, value: 7 }],
        nextPc: vm.pc,
        offset: 0x123,
      });
    },
    /Unsupported opcode in VM core: 999 at 0x123/,
    'Unknown opcode should still throw an error'
  );

  assert.deepStrictEqual(
    unknown,
    {
      opcode: 999,
      offset: 0x123,
      operands: [{ type: 'small', raw: 7, value: 7 }],
    },
    'Unknown opcode event should include opcode, address, and operands'
  );
}

function run() {
  testDecoderAndArithmetic();
  testStackAndVariableManagement();
  testMemoryOpcodes();
  testSimpleBranching();
  testCallAndReturn();
  testObjectTableAddressing();
  testPrintObjectUsesShortName();
  testPrintAddrUsesByteAddress();
  testSoundEffectOpcodeEmitsEvent();
  testRestartRestoresDynamicMemoryAndPc();
  testStatusSnapshotExposesRoomScoreAndMoves();
  testSaveStateRoundTripRestoresVmState();
  testSaveOpcodeSerializesSuccessfulBranchContinuation();
  testSaveOpcodeCompletionAppliesSuccessAndFailureBranches();
  testRestoreOpcodeCompletionAppliesFailureBranch();
  testUnknownOpcodeEmitsDebugEvent();
  console.log('VM core tests passed.');
}

run();
