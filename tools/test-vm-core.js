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

function run() {
  testDecoderAndArithmetic();
  testStackAndVariableManagement();
  testMemoryOpcodes();
  testSimpleBranching();
  testCallAndReturn();
  testObjectTableAddressing();
  testPrintObjectUsesShortName();
  testPrintAddrUsesByteAddress();
  console.log('VM core tests passed.');
}

run();
