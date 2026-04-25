'use strict';

const fs = require('fs');
const path = require('path');
const { runCommandBatch, renderSvg } = require('./wireframe3d-core.js');

function usage() {
  console.log(
    [
      'Usage:',
      '  node tools/wireframe3d-cli.js <commands.json> [--scene-out <scene.json>] [--svg-out <out.svg>]',
      '',
      'Example:',
      '  node tools/wireframe3d-cli.js asset-sources/wireframe3d/commands/wireframe3d-sample-commands.json --svg-out asset-sources/wireframe3d/svg/sample.svg',
    ].join('\n')
  );
}

function resolveLocal(filePath) {
  if (!filePath) return null;
  return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
}

function main(argv) {
  if (!argv[0] || argv.includes('-h') || argv.includes('--help')) {
    usage();
    process.exit(argv[0] ? 0 : 1);
  }

  const inputPath = resolveLocal(argv[0]);
  const raw = fs.readFileSync(inputPath, 'utf8');
  const payload = JSON.parse(raw);
  const scene = runCommandBatch(payload);

  let sceneOut = null;
  let svgOut = null;
  for (let i = 1; i < argv.length; i += 1) {
    const cur = argv[i];
    if (cur === '--scene-out') {
      sceneOut = resolveLocal(argv[i + 1]);
      i += 1;
      continue;
    }
    if (cur === '--svg-out') {
      svgOut = resolveLocal(argv[i + 1]);
      i += 1;
    }
  }

  if (sceneOut) {
    fs.writeFileSync(sceneOut, JSON.stringify(scene, null, 2), 'utf8');
    console.log(`Scene written: ${sceneOut}`);
  }

  if (svgOut) {
    const svg = scene.lastSvg || renderSvg(scene, {});
    fs.writeFileSync(svgOut, svg, 'utf8');
    console.log(`SVG written: ${svgOut}`);
  }

  console.log(
    `Completed ${Array.isArray(payload.commands) ? payload.commands.length : 0} command(s). ` +
      `Primitives in scene: ${scene.primitives.length}`
  );
}

main(process.argv.slice(2));
