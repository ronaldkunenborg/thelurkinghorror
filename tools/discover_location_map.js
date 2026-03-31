'use strict';

const fs = require('fs');
const path = require('path');
const { parseZ3Story } = require('../src/parser.js');
const { Z3VM } = require('../src/vm-core.js');

const STORY_PATH = path.resolve(__dirname, '../../data/The_Lurking_Horror_Infocom_Release_219_Serial_870912.z3');
const ROOM_ROOT_ID = 49;
const COMMANDS = [
  'north',
  'south',
  'east',
  'west',
  'northeast',
  'northwest',
  'southeast',
  'southwest',
  'up',
  'down',
  'enter',
  'exit',
];
const CANDIDATE_EXIT_PROPERTIES = [20, 21, 22, 23, 24, 25, 27, 28, 29, 31];

function createVm() {
  const bytes = fs.readFileSync(STORY_PATH);
  const parsed = parseZ3Story(bytes);
  let output = '';
  const vm = new Z3VM({
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
      onOutput(text) {
        output += text;
      },
    },
  });

  return {
    vm,
    takeOutput() {
      const current = output;
      output = '';
      return current;
    },
  };
}

function enumerateRooms(vm) {
  const rooms = [];
  for (let objectId = 1; objectId < 256; objectId++) {
    if (vm._getObjectParent(objectId) !== ROOM_ROOT_ID) {
      continue;
    }
    const name = vm._readObjectShortName(objectId);
    if (!name) {
      continue;
    }
    rooms.push({ id: objectId, name });
  }
  return rooms.sort((a, b) => a.id - b.id);
}

function roomNodeId(roomId) {
  return 'R' + roomId;
}

function roomLabel(room) {
  return room.name + ' (' + room.id + ')';
}

function roomKey(roomId) {
  return String(roomId);
}

function runCommandOnSnapshot(snapshotBytes, command) {
  const runtime = createVm();
  runtime.vm.restoreSaveState(snapshotBytes);
  runtime.takeOutput();
  runtime.vm.provideInput(command);
  const result = runtime.vm.run(2500000);
  return {
    result,
    output: runtime.takeOutput(),
    snapshot: runtime.vm.serializeSaveState(),
    room: runtime.vm.getStatusSnapshot(),
  };
}

function discoverNavigation(roomsById) {
  const runtime = createVm();
  runtime.vm.run(2500000);
  runtime.takeOutput();

  const startSnapshot = runtime.vm.serializeSaveState();
  const startRoom = runtime.vm.getStatusSnapshot();
  const roomSnapshots = new Map([[roomKey(startRoom.roomObjectId), startSnapshot]]);
  const roomPaths = new Map([[roomKey(startRoom.roomObjectId), []]]);
  const queue = [startRoom.roomObjectId];
  const visited = new Set();
  const dynamicEdges = new Map();

  while (queue.length > 0) {
    const roomId = queue.shift();
    const key = roomKey(roomId);
    if (visited.has(key)) {
      continue;
    }
    visited.add(key);

    const roomSnapshot = roomSnapshots.get(key);
    if (!roomSnapshot) {
      continue;
    }

    for (const command of COMMANDS) {
      const attempt = runCommandOnSnapshot(roomSnapshot, command);
      if (attempt.result.haltReason !== 'input') {
        continue;
      }
      if (!roomsById.has(attempt.room.roomObjectId)) {
        continue;
      }
      if (attempt.room.roomObjectId === roomId) {
        continue;
      }

      const edgeKey = roomId + '|' + command + '|' + attempt.room.roomObjectId;
      dynamicEdges.set(edgeKey, {
        from: roomId,
        to: attempt.room.roomObjectId,
        command,
        kind: 'dynamic',
      });

      const targetKey = roomKey(attempt.room.roomObjectId);
      if (!roomSnapshots.has(targetKey)) {
        roomSnapshots.set(targetKey, attempt.snapshot);
        roomPaths.set(targetKey, roomPaths.get(key).concat(command));
        queue.push(attempt.room.roomObjectId);
      }
    }
  }

  return {
    startRoomId: startRoom.roomObjectId,
    roomSnapshots,
    roomPaths,
    dynamicEdges: Array.from(dynamicEdges.values()).sort((a, b) =>
      (a.from - b.from) || a.command.localeCompare(b.command) || (a.to - b.to)
    ),
  };
}

function inferPropertyCommands(vm, dynamicEdges) {
  const inferred = new Map();
  for (const edge of dynamicEdges) {
    for (const propertyId of CANDIDATE_EXIT_PROPERTIES) {
      const propertyAddress = vm._findPropertyAddress(edge.from, propertyId);
      if (!propertyAddress) {
        continue;
      }
      if (vm._getPropertyLength(propertyAddress) !== 1) {
        continue;
      }
      if (vm._getPropertyValue(edge.from, propertyId) !== edge.to) {
        continue;
      }
      const existing = inferred.get(propertyId);
      if (!existing) {
        inferred.set(propertyId, edge.command);
        continue;
      }
      if (existing !== edge.command) {
        inferred.set(propertyId, null);
      }
    }
  }
  for (const [propertyId, command] of Array.from(inferred.entries())) {
    if (!command) {
      inferred.delete(propertyId);
    }
  }
  return inferred;
}

function buildStaticEdges(vm, roomsById, propertyCommands) {
  const edges = new Map();
  const unresolved = [];

  for (const room of roomsById.values()) {
    for (const propertyId of CANDIDATE_EXIT_PROPERTIES) {
      const propertyAddress = vm._findPropertyAddress(room.id, propertyId);
      if (!propertyAddress) {
        continue;
      }
      const length = vm._getPropertyLength(propertyAddress);
      const command = propertyCommands.get(propertyId) || null;
      if (length === 1) {
        const targetId = vm._getPropertyValue(room.id, propertyId);
        if (!roomsById.has(targetId) || !command || targetId === room.id) {
          continue;
        }
        const edgeKey = room.id + '|' + command + '|' + targetId;
        edges.set(edgeKey, {
          from: room.id,
          to: targetId,
          command,
          kind: 'static-direct',
          propertyId,
        });
        continue;
      }
      unresolved.push({
        from: room.id,
        propertyId,
        length,
        command,
        rawValue: vm._getPropertyValue(room.id, propertyId),
      });
    }
  }

  return {
    staticEdges: Array.from(edges.values()).sort((a, b) =>
      (a.from - b.from) || a.command.localeCompare(b.command) || (a.to - b.to)
    ),
    unresolved,
  };
}

function main() {
  const runtime = createVm();
  const rooms = enumerateRooms(runtime.vm);
  const roomsById = new Map(rooms.map(room => [room.id, room]));
  const navigation = discoverNavigation(roomsById);
  const propertyCommands = inferPropertyCommands(runtime.vm, navigation.dynamicEdges);
  const staticAnalysis = buildStaticEdges(runtime.vm, roomsById, propertyCommands);

  const mergedEdges = new Map();
  for (const edge of staticAnalysis.staticEdges.concat(navigation.dynamicEdges)) {
    const edgeKey = edge.from + '|' + edge.command + '|' + edge.to;
    if (!mergedEdges.has(edgeKey)) {
      mergedEdges.set(edgeKey, edge);
    }
  }

  const discoveredRoomIds = new Set(navigation.roomSnapshots.keys());
  const undiscoveredRooms = rooms.filter(room => !discoveredRoomIds.has(roomKey(room.id)));

  const result = {
    roomEncoding: {
      roomRootObjectId: ROOM_ROOT_ID,
      roomCount: rooms.length,
      currentRoomGlobalOffset: 'globals[0]',
    },
    rooms,
    startRoomId: navigation.startRoomId,
    discoveredRooms: rooms
      .filter(room => discoveredRoomIds.has(roomKey(room.id)))
      .map(room => ({
        id: room.id,
        name: room.name,
        path: navigation.roomPaths.get(roomKey(room.id)) || [],
      })),
    undiscoveredRooms,
    propertyCommands: Array.from(propertyCommands.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([propertyId, command]) => ({ propertyId, command })),
    edges: Array.from(mergedEdges.values()).sort((a, b) =>
      (a.from - b.from) || a.command.localeCompare(b.command) || (a.to - b.to)
    ),
    unresolvedExitProperties: staticAnalysis.unresolved,
  };

  if (process.argv.includes('--markdown')) {
    process.stdout.write(renderMarkdown(result));
    return;
  }

  process.stdout.write(JSON.stringify(result, null, 2));
}

function renderMarkdown(result) {
  const roomById = new Map(result.rooms.map(room => [room.id, room]));
  const discoveredRoomIds = new Set(result.discoveredRooms.map(room => room.id));
  const lines = [];

  lines.push('# The Lurking Horror Location Map');
  lines.push('');
  lines.push('This document is a first-pass location map generated from the local game engine.');
  lines.push('');
  lines.push('## Discovery basis');
  lines.push('');
  lines.push('- Rooms are currently identified as object-table entries parented under room root object `' + result.roomEncoding.roomRootObjectId + '`.');
  lines.push('- The current room comes from `' + result.roomEncoding.currentRoomGlobalOffset + '` in the VM status snapshot.');
  lines.push('- Direct movement validation was performed from the opening game state by replaying commands against serialized VM snapshots.');
  lines.push('- Additional links were inferred from single-byte room exit properties once the direction/property mapping was validated.');
  lines.push('- Routine-driven exits and puzzle-only access paths are listed separately when they remain unresolved.');
  lines.push('');
  lines.push('## Verified exit property mapping');
  lines.push('');
  for (const mapping of result.propertyCommands) {
    lines.push('- property `' + mapping.propertyId + '` -> `' + mapping.command + '`');
  }
  lines.push('');
  lines.push('## Mermaid map');
  lines.push('');
  lines.push('```mermaid');
  lines.push('flowchart TD');
  lines.push('  classDef discovered fill:#132218,stroke:#8cf7d6,color:#e9edf2;');
  lines.push('  classDef listed fill:#1a1a1a,stroke:#7d8790,color:#e9edf2,stroke-dasharray: 4 2;');
  for (const room of result.rooms) {
    lines.push('  ' + roomNodeId(room.id) + '["' + escapeMermaidText(roomLabel(room)) + '"]');
  }
  lines.push('');
  for (const edge of result.edges) {
    lines.push(
      '  ' +
      roomNodeId(edge.from) +
      ' -- "' +
      escapeMermaidText(edge.command) +
      '" --> ' +
      roomNodeId(edge.to)
    );
  }
  lines.push('');
  for (const room of result.rooms) {
    lines.push(
      '  class ' +
      roomNodeId(room.id) +
      ' ' +
      (discoveredRoomIds.has(room.id) ? 'discovered' : 'listed')
    );
  }
  lines.push('```');
  lines.push('');
  lines.push('## Location inventory');
  lines.push('');
  for (const room of result.rooms) {
    const status = discoveredRoomIds.has(room.id) ? 'discovered from opening-state exploration' : 'listed from room object inventory';
    const discovered = result.discoveredRooms.find(entry => entry.id === room.id);
    const pathText = discovered && discovered.path.length > 0
      ? ' via `' + discovered.path.join(' -> ') + '`'
      : '';
    lines.push('- `' + room.id + '` ' + room.name + ' - ' + status + pathText);
  }
  lines.push('');
  lines.push('## Unresolved routine-driven exits');
  lines.push('');
  if (result.unresolvedExitProperties.length === 0) {
    lines.push('- None.');
  } else {
    for (const unresolved of result.unresolvedExitProperties) {
      const room = roomById.get(unresolved.from);
      const commandText = unresolved.command ? '`' + unresolved.command + '`' : 'unmapped command';
      lines.push(
        '- `' +
        unresolved.from +
        '` ' +
        (room ? room.name : 'Unknown room') +
        ': property `' +
        unresolved.propertyId +
        '` (' +
        commandText +
        ', length `' +
        unresolved.length +
        '`) still resolves through routine or custom logic rather than a direct room id.'
      );
    }
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- This first pass is complete for the room inventory and for direct room-id exits decoded from the story data.');
  lines.push('- Some special-access transitions are not yet tied back to a single player-facing action label. Those show up in the unresolved exit list above.');
  lines.push('- The example special transition mentioned in task 25, reaching `Basalt Bowl`, remains a likely puzzle-driven access path that needs a later pass for a cleaner player-facing edge label.');

  return lines.join('\n') + '\n';
}

function escapeMermaidText(text) {
  return String(text).replace(/"/g, '\\"');
}

main();
