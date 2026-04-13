'use strict';

const assert = require('assert');
const path = require('path');
const data = require(path.join(__dirname, '..', 'src', 'map-prototype-2-data.js'));

const HIDDEN_ROOMS = new Set(['place', 'basalt', 'platform']);

function parseLayer(layer) {
  const m = /^L([+-]?)(\d+)$/.exec(String(layer || '').trim());
  if (!m) return null;
  const sign = m[1] === '-' ? -1 : 1;
  return sign * Number(m[2]);
}

function isUp(label) {
  const s = String(label || '').toLowerCase();
  return s.includes('up') && !s.includes('down');
}

function isDown(label) {
  const s = String(label || '').toLowerCase();
  return s.includes('down');
}

function run() {
  const roomById = new Map(data.MAP_ROOMS.map((room) => [room.id, room]));
  const locationByNodeId = data.LOCATION_ID_BY_NODE_ID || {};
  const layout = data.ROOM_LAYOUT || {};
  const exceptions = data.VERTICAL_EDGE_TEST_EXCEPTIONS || {};
  const allowUnpairedUp = exceptions.allowUnpairedUp || new Set();
  const allowUnpairedDown = exceptions.allowUnpairedDown || new Set();

  const failures = [];

  for (const room of data.MAP_ROOMS) {
    if (HIDDEN_ROOMS.has(room.id)) continue;
    const fromLayout = layout[room.id];
    if (!fromLayout) continue;
    const fromLayer = parseLayer(fromLayout.layer);
    if (fromLayer == null) continue;

    for (const edge of room.edges || []) {
      const up = isUp(edge.label);
      const down = isDown(edge.label);
      if (!up && !down) continue;

      const toRoom = roomById.get(edge.to);
      if (!toRoom || HIDDEN_ROOMS.has(toRoom.id)) {
        failures.push(`${room.id} -> ${edge.to}: target room missing/hidden for vertical edge "${edge.label}"`);
        continue;
      }
      const toLayout = layout[toRoom.id];
      if (!toLayout) {
        failures.push(`${room.id} -> ${toRoom.id}: target has no ROOM_LAYOUT for vertical edge "${edge.label}"`);
        continue;
      }
      const toLayer = parseLayer(toLayout.layer);
      if (toLayer == null) {
        failures.push(`${room.id} -> ${toRoom.id}: target has invalid layer "${toLayout.layer}"`);
        continue;
      }

      if (String(fromLayout.tile).toUpperCase() !== String(toLayout.tile).toUpperCase()) {
        failures.push(
          `${room.id} -> ${toRoom.id}: vertical edge "${edge.label}" crosses tiles (${fromLayout.tile} -> ${toLayout.tile})`
        );
      }

      const expectedDelta = up ? 1 : -1;
      if (toLayer - fromLayer !== expectedDelta) {
        failures.push(
          `${room.id} -> ${toRoom.id}: vertical edge "${edge.label}" has wrong layer delta (${fromLayout.layer} -> ${toLayout.layer})`
        );
      }

      const fromLocationId = locationByNodeId[room.id];
      const toLocationId = locationByNodeId[toRoom.id];
      const exceptionKey = `${fromLocationId}->${toLocationId}`;
      if (up && allowUnpairedUp.has(exceptionKey)) continue;
      if (down && allowUnpairedDown.has(exceptionKey)) continue;

      const reverseNeeded = up ? 'down' : 'up';
      const reverseExists = (toRoom.edges || []).some((back) => {
        if (back.to !== room.id) return false;
        const lbl = String(back.label || '').toLowerCase();
        return reverseNeeded === 'up' ? lbl.includes('up') && !lbl.includes('down') : lbl.includes('down');
      });

      if (!reverseExists) {
        failures.push(
          `${room.id} -> ${toRoom.id}: vertical edge "${edge.label}" missing reverse "${reverseNeeded}" edge`
        );
      }
    }
  }

  if (failures.length > 0) {
    const msg = ['map-prototype-2 vertical layout validation failed:', ...failures.map((f) => `- ${f}`)].join('\n');
    assert.fail(msg);
  }

  console.log('map-prototype-2 vertical layout validation passed.');
}

run();
