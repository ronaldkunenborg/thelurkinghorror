'use strict';

function toUint8Array(input) {
  if (input instanceof Uint8Array) {
    return input;
  }
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  throw new TypeError('Expected Uint8Array or ArrayBuffer story data');
}

function read16(bytes, offset) {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function computeChecksum(bytes) {
  let sum = 0;
  for (let i = 0x40; i < bytes.length; i++) {
    sum = (sum + bytes[i]) & 0xffff;
  }
  return sum;
}

function parseDictionary(bytes, dictionaryAddress) {
  const separatorCount = bytes[dictionaryAddress];
  const separators = [];
  for (let i = 0; i < separatorCount; i++) {
    separators.push(bytes[dictionaryAddress + 1 + i]);
  }

  const entryLength = bytes[dictionaryAddress + 1 + separatorCount];
  const entryCount = read16(bytes, dictionaryAddress + 2 + separatorCount);
  const entriesAddress = dictionaryAddress + 4 + separatorCount;
  const entriesEndAddress = entriesAddress + entryLength * entryCount;

  return {
    address: dictionaryAddress,
    separatorCount,
    separators,
    entryLength,
    entryCount,
    entriesAddress,
    entriesEndAddress,
  };
}

function parseZ3Story(storyData, options) {
  const opts = Object.assign(
    {
      validateVersion: true,
      validateFileLength: true,
      validateChecksum: true,
    },
    options || {}
  );

  const bytes = toUint8Array(storyData);
  if (bytes.length < 64) {
    throw new Error('Story file is too small to contain a valid header');
  }

  const version = bytes[0x00];
  if (opts.validateVersion && version !== 3) {
    throw new Error('Only Z-machine version 3 is supported by this parser');
  }

  const release = read16(bytes, 0x02);
  const highMemoryBase = read16(bytes, 0x04);
  const initialPc = read16(bytes, 0x06);
  const dictionaryAddress = read16(bytes, 0x08);
  const objectTableAddress = read16(bytes, 0x0a);
  const globalsAddress = read16(bytes, 0x0c);
  const staticBase = read16(bytes, 0x0e);
  const flags2 = read16(bytes, 0x10);
  const serial = String.fromCharCode(
    bytes[0x12],
    bytes[0x13],
    bytes[0x14],
    bytes[0x15],
    bytes[0x16],
    bytes[0x17]
  );
  const abbreviationsAddress = read16(bytes, 0x18);
  const headerFileLengthWord = read16(bytes, 0x1a);
  const headerFileLengthBytes = headerFileLengthWord * 2;
  const headerChecksum = read16(bytes, 0x1c);
  const actualFileLengthBytes = bytes.length;
  const computedChecksum = computeChecksum(bytes);

  if (opts.validateFileLength && headerFileLengthBytes !== actualFileLengthBytes) {
    throw new Error(
      'Header file length does not match actual story size: expected ' +
        headerFileLengthBytes +
        ', got ' +
        actualFileLengthBytes
    );
  }

  if (opts.validateChecksum && headerChecksum !== computedChecksum) {
    throw new Error(
      'Header checksum mismatch: expected 0x' +
        headerChecksum.toString(16) +
        ', got 0x' +
        computedChecksum.toString(16)
    );
  }

  const dictionary = parseDictionary(bytes, dictionaryAddress);
  const propertyDefaultsAddress = objectTableAddress;
  const propertyDefaultsSizeBytes = 31 * 2;
  const firstObjectAddress = propertyDefaultsAddress + propertyDefaultsSizeBytes;

  return {
    version,
    release,
    serial,
    header: {
      highMemoryBase,
      initialPc,
      dictionaryAddress,
      objectTableAddress,
      globalsAddress,
      staticBase,
      flags2,
      abbreviationsAddress,
      headerFileLengthWord,
      headerFileLengthBytes,
      headerChecksum,
    },
    memory: {
      bytes,
      dynamicEnd: staticBase - 1,
      staticBase,
      highMemoryBase,
      eof: bytes.length,
    },
    tables: {
      dictionary,
      objectTable: {
        address: objectTableAddress,
        propertyDefaultsAddress,
        propertyDefaultsSizeBytes,
        firstObjectAddress,
      },
      globals: {
        address: globalsAddress,
        wordCount: 120,
        byteLength: 240,
        endAddress: globalsAddress + 240,
      },
      abbreviations: {
        address: abbreviationsAddress,
      },
    },
    validation: {
      fileLengthMatchesHeader: headerFileLengthBytes === actualFileLengthBytes,
      computedChecksum,
      checksumMatchesHeader: headerChecksum === computedChecksum,
    },
  };
}

module.exports = {
  parseZ3Story,
  computeChecksum,
};
