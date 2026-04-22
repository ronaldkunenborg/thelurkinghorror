'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { runCommandBatch, renderSvg } = require('./wireframe3d-core.js');

function run() {
  const samplePath = path.join(__dirname, 'wireframe3d-sample-commands.json');
  const payload = JSON.parse(fs.readFileSync(samplePath, 'utf8'));
  const scene = runCommandBatch(payload);
  const svg = scene.lastSvg || renderSvg(scene, {});

  assert.ok(scene, 'scene should exist');
  assert.ok(Array.isArray(scene.primitives), 'scene should contain primitives');
  assert.ok(scene.primitives.length >= 6, 'sample should contain multiple primitives');
  assert.ok(svg.includes('<svg'), 'svg output should include <svg');
  assert.ok(svg.includes('id="mass_core"'), 'svg should include grouped primitive ids');
  assert.ok(svg.includes('id="dome_half"'), 'svg should include globe primitive group');
  assert.ok(svg.includes('<line '), 'svg should include line segments');

  const sceneRotation = scene.camera && scene.camera.rotationDeg;
  assert.deepStrictEqual(sceneRotation, [10, -15, 0], 'scene rotation must be applied in degrees');

  console.log('wireframe3d tool test passed.');
}

run();

