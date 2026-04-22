'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { runCommandBatch, renderSvg, createDefaultScene, applyCommand } = require('./wireframe3d-core.js');

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

  const occlusionScene = createDefaultScene({
    camera: { projection: 'tile_oblique', width: 900, height: 700, scale: 90, offsetY: 80 },
  });
  applyCommand(occlusionScene, { op: 'add_primitive', id: 'front', type: 'rectangle', params: { width: 2, height: 2, depth: 2 } });
  applyCommand(occlusionScene, {
    op: 'add_primitive',
    id: 'back',
    type: 'rectangle',
    params: { width: 2, height: 2, depth: 2 },
    transform: { translate: [0, 0, -1.6] },
  });
  applyCommand(occlusionScene, { op: 'export_svg', options: { hiddenEdges: 'none' } });
  const svgNoHide = occlusionScene.lastSvg;
  applyCommand(occlusionScene, { op: 'export_svg', options: { hiddenEdges: 'far' } });
  const svgFar = occlusionScene.lastSvg;
  applyCommand(occlusionScene, { op: 'export_svg', options: { hiddenEdges: 'partial' } });
  const svgPartial = occlusionScene.lastSvg;
  applyCommand(occlusionScene, { op: 'export_svg', options: { hiddenEdges: 'strict' } });
  const svgStrict = occlusionScene.lastSvg;
  const linesNoHide = (svgNoHide.match(/<line /g) || []).length;
  const linesFar = (svgFar.match(/<line /g) || []).length;
  const linesPartial = (svgPartial.match(/<line /g) || []).length;
  const linesStrict = (svgStrict.match(/<line /g) || []).length;
  assert.ok(linesFar > 0 && linesPartial > 0 && linesStrict > 0, 'occlusion render should keep visible segments');
  assert.ok(linesFar <= linesNoHide, 'far mode should never add lines');
  assert.ok(linesPartial < linesNoHide, 'partial mode should clip hidden edges');
  assert.ok(linesStrict <= linesPartial, 'strict mode should be at least as aggressive as partial');

  console.log('wireframe3d tool test passed.');
}

run();
