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

function createVm(programBytes) {
  const size = 0x400;
  const memory = new Uint8Array(size);
  memory[0x00] = 3;
  write16(memory, 0x04, 0x40);
  write16(memory, 0x06, 0x40);
  write16(memory, 0x08, 0x200);
  write16(memory, 0x0a, 0x220);
  write16(memory, 0x0c, 0x100);
  write16(memory, 0x0e, 0x300);
  write16(memory, 0x1a, size / 2);
  for (let i = 0; i < programBytes.length; i++) {
    memory[0x40 + i] = programBytes[i];
  }
  write16(memory, 0x1c, checksum(memory));

  return new Z3VM({
    memory,
    header: {
      highMemoryBase: 0x40,
      initialPc: 0x40,
      globalsAddress: 0x100,
      staticBase: 0x300,
    },
  });
}

function run() {
  const textAddr = 0x180;
  const parseAddr = 0x1a0;

  // VAR:228 sread text parse ; quit
  const program = [
    0xe4, 0x0f, 0x01, 0x80, 0x01, 0xa0,
    0xba,
  ];

  const vm = createVm(program);
  vm.write8(textAddr, 30);
  vm.write8(parseAddr, 8);

  const first = vm.run();
  assert.strictEqual(first.haltReason, 'input', 'VM should halt for input on sread');
  assert.strictEqual(vm.pendingInput.textAddr, textAddr);
  assert.strictEqual(vm.pendingInput.parseAddr, parseAddr);

  vm.provideInput('open door');
  assert.strictEqual(vm.pendingInput, null, 'pending input should clear after provideInput');
  const second = vm.run();
  assert.strictEqual(second.haltReason, 'quit', 'VM should continue and quit after input');

  let captured = '';
  for (let i = 0; i < 9; i++) {
    const ch = vm.read8(textAddr + 1 + i);
    if (ch === 0) {
      break;
    }
    captured += String.fromCharCode(ch);
  }
  assert.strictEqual(captured, 'open door', 'text buffer should contain normalized command');

  const wordCount = vm.read8(parseAddr + 1);
  assert.strictEqual(wordCount, 2, 'parse buffer should register two words');
  assert.strictEqual(vm.read8(parseAddr + 4), 4, 'first token length should be 4');
  assert.strictEqual(vm.read8(parseAddr + 5), 1, 'first token position should be 1');
  assert.strictEqual(vm.read8(parseAddr + 8), 4, 'second token length should be 4');
  assert.strictEqual(vm.read8(parseAddr + 9), 6, 'second token position should be 6');

  console.log('VM I/O tests passed.');
}

run();
