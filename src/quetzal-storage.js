'use strict';

const DEFAULT_DB_NAME = 'lurking_horror_localdb';
const DEFAULT_DB_VERSION = 2;
const DEFAULT_STORE_NAME = 'quetzal_saves';
const DEFAULT_SETTINGS_STORE_NAME = 'interpreter_settings';

function getIndexedDB() {
  if (typeof globalThis !== 'undefined' && globalThis.indexedDB) {
    return globalThis.indexedDB;
  }
  throw new Error('IndexedDB is not available in this environment');
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
  });
}

function transactionCompletePromise(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
  });
}

function toUint8Array(data) {
  if (data instanceof Uint8Array) {
    return data;
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }
  throw new TypeError('Expected Quetzal data to be Uint8Array or ArrayBuffer');
}

function cloneArrayBuffer(bytes) {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return copy.buffer;
}

function sanitizeFilenamePart(text) {
  return String(text || '')
    .trim()
    .replace(/[^\w.-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function timestampToken(date) {
  const pad = n => String(n).padStart(2, '0');
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    '-' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds())
  );
}

class QuetzalStorage {
  constructor(options) {
    const opts = options || {};
    this.dbName = opts.dbName || DEFAULT_DB_NAME;
    this.dbVersion = opts.dbVersion || DEFAULT_DB_VERSION;
    this.storeName = opts.storeName || DEFAULT_STORE_NAME;
    this._dbPromise = null;
  }

  async open() {
    if (this._dbPromise) {
      return this._dbPromise;
    }

    this._dbPromise = new Promise((resolve, reject) => {
      const indexedDB = getIndexedDB();
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = event => {
        const db = request.result;
        let store;

        if (!db.objectStoreNames.contains(this.storeName)) {
          store = db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
        } else {
          store = request.transaction.objectStore(this.storeName);
        }

        if (!store.indexNames.contains('storyId')) {
          store.createIndex('storyId', 'storyId', { unique: false });
        }
        if (!store.indexNames.contains('storyId_slot')) {
          store.createIndex('storyId_slot', ['storyId', 'slot'], { unique: true });
        }
        if (!store.indexNames.contains('updatedAt')) {
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains(DEFAULT_SETTINGS_STORE_NAME)) {
          db.createObjectStore(DEFAULT_SETTINGS_STORE_NAME, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
      request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
    });

    return this._dbPromise;
  }

  async putSave(payload) {
    const input = payload || {};
    if (!input.storyId) {
      throw new Error('putSave requires storyId');
    }
    if (!Number.isInteger(input.slot) || input.slot < 0) {
      throw new Error('putSave requires a non-negative integer slot');
    }
    if (!input.quetzalData) {
      throw new Error('putSave requires quetzalData');
    }

    const bytes = toUint8Array(input.quetzalData);
    const now = new Date().toISOString();
    const db = await this.open();
    const tx = db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    const slotIndex = store.index('storyId_slot');

    const existing = await requestToPromise(slotIndex.get([input.storyId, input.slot]));
    const record = {
      storyId: input.storyId,
      slot: input.slot,
      label: input.label || '',
      roomName: input.roomName || '',
      score: Number.isFinite(input.score) ? Number(input.score) : null,
      moves: Number.isFinite(input.moves) ? Number(input.moves) : null,
      fileName: input.fileName || '',
      serial: input.serial || '',
      release: input.release || null,
      checksum: input.checksum || null,
      sizeBytes: bytes.length,
      quetzalData: cloneArrayBuffer(bytes),
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };
    if (existing && existing.id !== undefined && existing.id !== null) {
      record.id = existing.id;
    }

    const id = await requestToPromise(store.put(record));
    await transactionCompletePromise(tx);
    return this.getSaveById(id);
  }

  async getSave(storyId, slot) {
    const db = await this.open();
    const tx = db.transaction(this.storeName, 'readonly');
    const store = tx.objectStore(this.storeName);
    const request = store.index('storyId_slot').get([storyId, slot]);
    const record = await requestToPromise(request);
    await transactionCompletePromise(tx);
    return record || null;
  }

  async getSaveById(id) {
    const db = await this.open();
    const tx = db.transaction(this.storeName, 'readonly');
    const store = tx.objectStore(this.storeName);
    const record = await requestToPromise(store.get(id));
    await transactionCompletePromise(tx);
    return record || null;
  }

  async listSaves(storyId) {
    const db = await this.open();
    const tx = db.transaction(this.storeName, 'readonly');
    const store = tx.objectStore(this.storeName);
    let records;

    if (storyId) {
      records = await requestToPromise(store.index('storyId').getAll(storyId));
    } else {
      records = await requestToPromise(store.getAll());
    }
    await transactionCompletePromise(tx);

    records.sort((a, b) => {
      if (a.storyId !== b.storyId) {
        return String(a.storyId).localeCompare(String(b.storyId));
      }
      return a.slot - b.slot;
    });
    return records;
  }

  async deleteSave(storyId, slot) {
    const existing = await this.getSave(storyId, slot);
    if (!existing) {
      return false;
    }
    const db = await this.open();
    const tx = db.transaction(this.storeName, 'readwrite');
    tx.objectStore(this.storeName).delete(existing.id);
    await transactionCompletePromise(tx);
    return true;
  }

  async clearStory(storyId) {
    const records = await this.listSaves(storyId);
    const db = await this.open();
    const tx = db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    for (const record of records) {
      store.delete(record.id);
    }
    await transactionCompletePromise(tx);
    return records.length;
  }
}

class InterpreterSettingsStorage {
  constructor(options) {
    const opts = options || {};
    this.dbName = opts.dbName || DEFAULT_DB_NAME;
    this.dbVersion = opts.dbVersion || DEFAULT_DB_VERSION;
    this.storeName = opts.storeName || DEFAULT_SETTINGS_STORE_NAME;
    this._dbPromise = null;
  }

  async open() {
    if (this._dbPromise) {
      return this._dbPromise;
    }

    this._dbPromise = new Promise((resolve, reject) => {
      const indexedDB = getIndexedDB();
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(DEFAULT_STORE_NAME)) {
          const saveStore = db.createObjectStore(DEFAULT_STORE_NAME, { keyPath: 'id', autoIncrement: true });
          saveStore.createIndex('storyId', 'storyId', { unique: false });
          saveStore.createIndex('storyId_slot', ['storyId', 'slot'], { unique: true });
          saveStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
      request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
    });

    return this._dbPromise;
  }

  async getAudioSettings() {
    const db = await this.open();
    const tx = db.transaction(this.storeName, 'readonly');
    const store = tx.objectStore(this.storeName);
    const record = await requestToPromise(store.get('audio'));
    await transactionCompletePromise(tx);
    if (!record || typeof record.value !== 'object' || !record.value) {
      return null;
    }
    return Object.assign({}, record.value);
  }

  async putAudioSettings(settings) {
    const input = settings || {};
    const db = await this.open();
    const tx = db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    await requestToPromise(
      store.put({
        key: 'audio',
        value: {
          sfxVolume: input.sfxVolume,
          gameMusicVolume: input.gameMusicVolume,
          updatedAt: new Date().toISOString(),
        },
      })
    );
    await transactionCompletePromise(tx);
    return this.getAudioSettings();
  }

  async getExperienceSettings() {
    const db = await this.open();
    const tx = db.transaction(this.storeName, 'readonly');
    const store = tx.objectStore(this.storeName);
    const record = await requestToPromise(store.get('experience'));
    await transactionCompletePromise(tx);
    if (!record || typeof record.value !== 'object' || !record.value) {
      return null;
    }
    return Object.assign({}, record.value);
  }

  async putExperienceSettings(settings) {
    const input = settings || {};
    const db = await this.open();
    const tx = db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    await requestToPromise(
      store.put({
        key: 'experience',
        value: {
          level: input.level || '',
          musicEnabled: !!input.musicEnabled,
          extraSlotsEnabled: !!input.extraSlotsEnabled,
          horrorExtrasEnabled: !!input.horrorExtrasEnabled,
          imagesEnabled: !!input.imagesEnabled,
          updatedAt: new Date().toISOString(),
        },
      })
    );
    await transactionCompletePromise(tx);
    return this.getExperienceSettings();
  }

  async clearExperienceSettings() {
    const db = await this.open();
    const tx = db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    await requestToPromise(store.delete('experience'));
    await transactionCompletePromise(tx);
    return true;
  }
}

function createSaveBlob(record) {
  if (!record || !record.quetzalData) {
    throw new Error('createSaveBlob requires a save record with quetzalData');
  }
  return new Blob([record.quetzalData], { type: 'application/octet-stream' });
}

function suggestSaveFilename(record) {
  const base = sanitizeFilenamePart(record.storyId || 'story');
  const slot = Number.isInteger(record.slot) ? record.slot : 0;
  const stamp = timestampToken(new Date(record.updatedAt || Date.now()));
  return base + '-slot' + slot + '-' + stamp + '.sav';
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function exportSaveToFile(record, filename) {
  const blob = createSaveBlob(record);
  const resolvedName = filename || suggestSaveFilename(record);
  triggerDownload(blob, resolvedName);
  return resolvedName;
}

async function importSaveFileToSlot(storage, file, metadata) {
  if (!(storage instanceof QuetzalStorage)) {
    throw new Error('importSaveFileToSlot requires a QuetzalStorage instance');
  }
  if (!file) {
    throw new Error('importSaveFileToSlot requires a File object');
  }

  const meta = metadata || {};
  if (!meta.storyId) {
    throw new Error('importSaveFileToSlot requires metadata.storyId');
  }
  if (!Number.isInteger(meta.slot) || meta.slot < 0) {
    throw new Error('importSaveFileToSlot requires metadata.slot');
  }

  const quetzalData = new Uint8Array(await file.arrayBuffer());
  return storage.putSave({
    storyId: meta.storyId,
    slot: meta.slot,
    label: meta.label || file.name || '',
    fileName: file.name || '',
    serial: meta.serial || '',
    release: meta.release || null,
    checksum: meta.checksum || null,
    quetzalData,
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    QuetzalStorage,
    InterpreterSettingsStorage,
    createSaveBlob,
    suggestSaveFilename,
    exportSaveToFile,
    importSaveFileToSlot,
  };
}

if (typeof window !== 'undefined') {
  window.QuetzalStorage = QuetzalStorage;
  window.InterpreterSettingsStorage = InterpreterSettingsStorage;
  window.exportSaveToFile = exportSaveToFile;
  window.importSaveFileToSlot = importSaveFileToSlot;
  window.suggestSaveFilename = suggestSaveFilename;
}
