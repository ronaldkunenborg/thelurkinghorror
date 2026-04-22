'use strict';

const fs = require('fs');

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function degToRad(deg) {
  return (Number(deg) * Math.PI) / 180;
}

function normalizeVec3(value, fallback) {
  if (!Array.isArray(value) || value.length !== 3) return fallback.slice();
  return value.map((v, i) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback[i];
  });
}

function normalizeShear(value) {
  const fallback = { xy: 0, xz: 0, yx: 0, yz: 0, zx: 0, zy: 0 };
  if (!value || typeof value !== 'object') return fallback;
  const out = {};
  for (const key of Object.keys(fallback)) {
    const n = Number(value[key]);
    out[key] = Number.isFinite(n) ? n : 0;
  }
  return out;
}

function createDefaultScene(overrides) {
  const scene = {
    meta: {
      units: 'meters',
      name: 'wireframe-scene',
    },
    camera: {
      projection: 'isometric',
      width: 1024,
      height: 1024,
      scale: 120,
      yScale: 1,
      perspectiveDistance: 8,
      offsetX: 0,
      offsetY: 0,
      rotationDeg: [0, 0, 0],
      oblique: {
        zDx: 0.5,
        zDy: 0.866,
        zScale: 0.82,
      },
      isometric: {
        yawDeg: 45,
        pitchDeg: 35.264,
      },
    },
    style: {
      stroke: '#f2f2f2',
      strokeWidth: 1.2,
      strokeOpacity: 0.95,
      fill: 'none',
      strokeDasharray: '',
      background: '#090909',
    },
    primitives: [],
  };
  if (!overrides || typeof overrides !== 'object') return scene;
  if (overrides.meta && typeof overrides.meta === 'object') {
    scene.meta = Object.assign({}, scene.meta, overrides.meta);
  }
  if (overrides.camera && typeof overrides.camera === 'object') {
    scene.camera = Object.assign({}, scene.camera, overrides.camera);
    if (overrides.camera.isometric && typeof overrides.camera.isometric === 'object') {
      scene.camera.isometric = Object.assign({}, scene.camera.isometric, overrides.camera.isometric);
    }
  }
  if (overrides.style && typeof overrides.style === 'object') {
    scene.style = Object.assign({}, scene.style, overrides.style);
  }
  if (Array.isArray(overrides.primitives)) {
    scene.primitives = cloneJson(overrides.primitives);
  }
  return scene;
}

function normalizeTransform(transform) {
  const t = transform && typeof transform === 'object' ? transform : {};
  return {
    translate: normalizeVec3(t.translate, [0, 0, 0]),
    rotateDeg: normalizeVec3(t.rotateDeg, [0, 0, 0]),
    scale: normalizeVec3(t.scale, [1, 1, 1]),
    shear: normalizeShear(t.shear),
  };
}

function normalizeStyle(style, sceneStyle) {
  const source = style && typeof style === 'object' ? style : {};
  return {
    stroke: typeof source.stroke === 'string' ? source.stroke : sceneStyle.stroke,
    strokeWidth: Number.isFinite(Number(source.strokeWidth)) ? Number(source.strokeWidth) : sceneStyle.strokeWidth,
    strokeOpacity: Number.isFinite(Number(source.strokeOpacity))
      ? clamp(Number(source.strokeOpacity), 0, 1)
      : sceneStyle.strokeOpacity,
    fill: typeof source.fill === 'string' ? source.fill : sceneStyle.fill,
    strokeDasharray: typeof source.strokeDasharray === 'string' ? source.strokeDasharray : sceneStyle.strokeDasharray,
  };
}

function matrixMultiply(a, b) {
  const out = new Array(16).fill(0);
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      let sum = 0;
      for (let i = 0; i < 4; i += 1) sum += a[row * 4 + i] * b[i * 4 + col];
      out[row * 4 + col] = sum;
    }
  }
  return out;
}

function matrixIdentity() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function matrixTranslate(v) {
  const [x, y, z] = v;
  return [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z, 0, 0, 0, 1];
}

function matrixScale(v) {
  const [x, y, z] = v;
  return [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1];
}

function matrixShear(s) {
  return [1, s.xy, s.xz, 0, s.yx, 1, s.yz, 0, s.zx, s.zy, 1, 0, 0, 0, 0, 1];
}

function matrixRotateX(rad) {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1];
}

function matrixRotateY(rad) {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1];
}

function matrixRotateZ(rad) {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function transformPoint(m, p) {
  const [x, y, z] = p;
  return [
    m[0] * x + m[1] * y + m[2] * z + m[3],
    m[4] * x + m[5] * y + m[6] * z + m[7],
    m[8] * x + m[9] * y + m[10] * z + m[11],
  ];
}

function buildTransformMatrix(transform) {
  const t = normalizeTransform(transform);
  const rx = matrixRotateX(degToRad(t.rotateDeg[0]));
  const ry = matrixRotateY(degToRad(t.rotateDeg[1]));
  const rz = matrixRotateZ(degToRad(t.rotateDeg[2]));
  const scale = matrixScale(t.scale);
  const shear = matrixShear(t.shear);
  const trans = matrixTranslate(t.translate);
  const rs = matrixMultiply(rz, matrixMultiply(ry, rx));
  return matrixMultiply(trans, matrixMultiply(rs, matrixMultiply(shear, scale)));
}

function boxGeometry(width, height, depth) {
  const hw = width / 2;
  const hh = height / 2;
  const hd = depth / 2;
  const vertices = [
    [-hw, -hh, -hd],
    [hw, -hh, -hd],
    [hw, hh, -hd],
    [-hw, hh, -hd],
    [-hw, -hh, hd],
    [hw, -hh, hd],
    [hw, hh, hd],
    [-hw, hh, hd],
  ];
  const edges = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ];
  return { vertices, edges };
}

function cylinderGeometry(radius, height, segments) {
  const n = Math.max(6, Math.floor(Number(segments) || 16));
  const r = Math.max(0.01, Number(radius) || 0.5);
  const h = Math.max(0.01, Number(height) || 1);
  const vertices = [];
  const edges = [];
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    vertices.push([x, -h / 2, z]);
    vertices.push([x, h / 2, z]);
  }
  for (let i = 0; i < n; i += 1) {
    const next = (i + 1) % n;
    const b0 = i * 2;
    const t0 = b0 + 1;
    const b1 = next * 2;
    const t1 = b1 + 1;
    edges.push([b0, b1], [t0, t1], [b0, t0]);
  }
  return { vertices, edges };
}

function globeGeometry(radius, latSegments, lonSegments, latStart, latEnd, lonStart, lonEnd) {
  const r = Math.max(0.01, Number(radius) || 0.5);
  const lats = Math.max(4, Math.floor(Number(latSegments) || 8));
  const lons = Math.max(6, Math.floor(Number(lonSegments) || 12));
  const latA = degToRad(Number.isFinite(Number(latStart)) ? Number(latStart) : -90);
  const latB = degToRad(Number.isFinite(Number(latEnd)) ? Number(latEnd) : 90);
  const lonA = degToRad(Number.isFinite(Number(lonStart)) ? Number(lonStart) : 0);
  const lonB = degToRad(Number.isFinite(Number(lonEnd)) ? Number(lonEnd) : 360);

  const vertices = [];
  const edges = [];
  const idx = [];
  for (let i = 0; i <= lats; i += 1) {
    const lat = latA + ((latB - latA) * i) / lats;
    const row = [];
    const y = Math.sin(lat) * r;
    const rr = Math.cos(lat) * r;
    for (let j = 0; j <= lons; j += 1) {
      const lon = lonA + ((lonB - lonA) * j) / lons;
      const x = Math.cos(lon) * rr;
      const z = Math.sin(lon) * rr;
      row.push(vertices.length);
      vertices.push([x, y, z]);
    }
    idx.push(row);
  }

  for (let i = 0; i <= lats; i += 1) {
    for (let j = 0; j < lons; j += 1) edges.push([idx[i][j], idx[i][j + 1]]);
  }
  for (let i = 0; i < lats; i += 1) {
    for (let j = 0; j <= lons; j += 1) edges.push([idx[i][j], idx[i + 1][j]]);
  }

  return { vertices, edges };
}

function buildPrimitiveGeometry(primitive) {
  const p = primitive.params || {};
  switch (primitive.type) {
    case 'cube': {
      const size = Math.max(0.01, Number(p.size) || 1);
      return boxGeometry(size, size, size);
    }
    case 'rectangle':
      return boxGeometry(Math.max(0.01, Number(p.width) || 1), Math.max(0.01, Number(p.height) || 1), Math.max(0.01, Number(p.depth) || 1));
    case 'parallelogram':
      return boxGeometry(Math.max(0.01, Number(p.width) || 1), Math.max(0.01, Number(p.height) || 1), Math.max(0.01, Number(p.depth) || 1));
    case 'cylinder':
      return cylinderGeometry(p.radius, p.height, p.segments);
    case 'globe':
      return globeGeometry(p.radius, p.latSegments, p.lonSegments, p.latStart, p.latEnd, p.lonStart, p.lonEnd);
    default:
      throw new Error(`Unsupported primitive type "${primitive.type}"`);
  }
}

function projectPoint(scene, point) {
  const cam = scene.camera || {};
  const width = Number(cam.width) || 1024;
  const height = Number(cam.height) || 1024;
  const scale = Number(cam.scale) || 120;
  const yScale = Number(cam.yScale) || 1;
  const offsetX = Number(cam.offsetX) || 0;
  const offsetY = Number(cam.offsetY) || 0;

  const cameraRotation = normalizeVec3(cam.rotationDeg, [0, 0, 0]);
  const cameraRotMatrix = matrixMultiply(
    matrixRotateZ(degToRad(cameraRotation[2])),
    matrixMultiply(matrixRotateY(degToRad(cameraRotation[1])), matrixRotateX(degToRad(cameraRotation[0])))
  );
  const rotated = transformPoint(cameraRotMatrix, point);

  if (cam.projection === 'tile_oblique') {
    const oblique = cam.oblique && typeof cam.oblique === 'object' ? cam.oblique : {};
    const zDx = Number.isFinite(Number(oblique.zDx)) ? Number(oblique.zDx) : 0.5;
    const zDy = Number.isFinite(Number(oblique.zDy)) ? Number(oblique.zDy) : 0.866;
    const zScale = Number.isFinite(Number(oblique.zScale)) ? Number(oblique.zScale) : 0.82;
    const x = width * 0.5 + offsetX + rotated[0] * scale + rotated[2] * scale * zDx * zScale;
    const y = height * 0.5 + offsetY - rotated[1] * scale * yScale + rotated[2] * scale * zDy * zScale;
    return { x, y, depth: rotated[2], nearMetric: rotated[2] };
  }

  if (cam.projection === 'perspective') {
    const d = Number(cam.perspectiveDistance) || 8;
    const denom = d - rotated[2];
    const safe = Math.abs(denom) < 1e-6 ? (denom < 0 ? -1e-6 : 1e-6) : denom;
    const factor = d / safe;
    const x = width * 0.5 + offsetX + rotated[0] * scale * factor;
    const y = height * 0.5 + offsetY - rotated[1] * scale * yScale * factor;
    return { x, y, depth: rotated[2], nearMetric: safe };
  }

  const iso = cam.isometric || {};
  const yaw = degToRad(Number(iso.yawDeg) || 45);
  const pitch = degToRad(Number(iso.pitchDeg) || 35.264);
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);

  const x1 = rotated[0] * cy + rotated[2] * sy;
  const z1 = -rotated[0] * sy + rotated[2] * cy;
  const y2 = rotated[1] * cp - z1 * sp;
  const z2 = rotated[1] * sp + z1 * cp;
  const x = width * 0.5 + offsetX + x1 * scale;
  const y = height * 0.5 + offsetY - y2 * scale * yScale;
  return { x, y, depth: z2, nearMetric: -z2 };
}

function primitiveToSegments(scene, primitive) {
  const geometry = buildPrimitiveGeometry(primitive);
  const style = normalizeStyle(primitive.style, scene.style);
  const matrix = buildTransformMatrix(primitive.transform);
  const worldVertices = geometry.vertices.map((v) => transformPoint(matrix, v));
  const projected = worldVertices.map((v) => projectPoint(scene, v));
  const segments = geometry.edges.map(([a, b]) => {
    const p1 = projected[a];
    const p2 = projected[b];
    return {
      primitiveId: primitive.id,
      x1: p1.x,
      y1: p1.y,
      x2: p2.x,
      y2: p2.y,
      depth: (p1.depth + p2.depth) * 0.5,
      nearMetric: (p1.nearMetric + p2.nearMetric) * 0.5,
      style,
    };
  });

  const hiddenMode = String((scene.exportOptions && scene.exportOptions.hiddenEdges) || 'none').toLowerCase();
  if (hiddenMode !== 'far') return segments;

  const sortedNear = segments.slice().sort((a, b) => a.nearMetric - b.nearMetric);
  const keepCount = Math.max(1, Math.floor(sortedNear.length * 0.75));
  const allowed = new Set(sortedNear.slice(0, keepCount));
  return segments.filter((s) => allowed.has(s));
}

function renderSvg(scene, options) {
  const opts = options && typeof options === 'object' ? options : {};
  const width = Number(opts.width || scene.camera.width || 1024);
  const height = Number(opts.height || scene.camera.height || 1024);
  const background = typeof opts.background === 'string' ? opts.background : scene.style.background;

  const segmentsByPrimitive = [];
  for (const primitive of scene.primitives) {
    segmentsByPrimitive.push({
      primitiveId: primitive.id,
      segments: primitiveToSegments(scene, primitive),
    });
  }

  const lines = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);
  lines.push(`  <rect x="0" y="0" width="${width}" height="${height}" fill="${background}" />`);

  for (const group of segmentsByPrimitive) {
    const segs = group.segments.slice().sort((a, b) => a.depth - b.depth);
    lines.push(`  <g id="${group.primitiveId}">`);
    for (const seg of segs) {
      const x1 = seg.x1.toFixed(2);
      const y1 = seg.y1.toFixed(2);
      const x2 = seg.x2.toFixed(2);
      const y2 = seg.y2.toFixed(2);
      const dash = seg.style.strokeDasharray ? ` stroke-dasharray="${seg.style.strokeDasharray}"` : '';
      lines.push(
        `    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"` +
          ` stroke="${seg.style.stroke}" stroke-width="${Number(seg.style.strokeWidth).toFixed(2)}"` +
          ` stroke-opacity="${Number(seg.style.strokeOpacity).toFixed(3)}" fill="none"${dash} />`
      );
    }
    lines.push(`  </g>`);
  }

  lines.push(`</svg>`);
  return lines.join('\n');
}

function nextPrimitiveId(scene) {
  let i = 1;
  const ids = new Set(scene.primitives.map((p) => p.id));
  while (ids.has(`p${i}`)) i += 1;
  return `p${i}`;
}

function applyCommand(scene, command) {
  const op = String(command && command.op || '').trim();
  if (!op) throw new Error('Command missing "op"');

  if (op === 'create_scene') {
    return createDefaultScene(command.scene || command.overrides || {});
  }

  if (!scene) throw new Error(`Cannot run "${op}" before create_scene`);

  if (op === 'add_primitive') {
    const type = String(command.type || '').trim();
    if (!type) throw new Error('add_primitive requires "type"');
    const id = command.id ? String(command.id) : nextPrimitiveId(scene);
    if (scene.primitives.some((p) => p.id === id)) throw new Error(`Primitive id "${id}" already exists`);
    const primitive = {
      id,
      type,
      params: command.params && typeof command.params === 'object' ? cloneJson(command.params) : {},
      transform: normalizeTransform(command.transform),
      style: command.style && typeof command.style === 'object' ? cloneJson(command.style) : {},
    };
    if (type === 'parallelogram' && !primitive.transform.shear) primitive.transform.shear = normalizeShear(command.shear);
    scene.primitives.push(primitive);
    return scene;
  }

  if (op === 'delete_primitive') {
    const id = String(command.id || '');
    scene.primitives = scene.primitives.filter((p) => p.id !== id);
    return scene;
  }

  if (op === 'update_primitive') {
    const id = String(command.id || '');
    const primitive = scene.primitives.find((p) => p.id === id);
    if (!primitive) throw new Error(`Primitive "${id}" not found`);
    if (command.type) primitive.type = String(command.type);
    if (command.params && typeof command.params === 'object') {
      primitive.params = Object.assign({}, primitive.params || {}, cloneJson(command.params));
    }
    if (command.style && typeof command.style === 'object') {
      primitive.style = Object.assign({}, primitive.style || {}, cloneJson(command.style));
    }
    if (command.transform && typeof command.transform === 'object') {
      const cur = normalizeTransform(primitive.transform);
      const next = normalizeTransform(Object.assign({}, cur, command.transform));
      primitive.transform = next;
    }
    return scene;
  }

  if (op === 'transform_primitive') {
    const id = String(command.id || '');
    const primitive = scene.primitives.find((p) => p.id === id);
    if (!primitive) throw new Error(`Primitive "${id}" not found`);
    const cur = normalizeTransform(primitive.transform);
    const next = cloneJson(cur);
    if (command.translate) next.translate = normalizeVec3(command.translate, cur.translate);
    if (command.rotateDeg) next.rotateDeg = normalizeVec3(command.rotateDeg, cur.rotateDeg);
    if (command.scale) next.scale = normalizeVec3(command.scale, cur.scale);
    if (command.shear) next.shear = normalizeShear(command.shear);
    primitive.transform = next;
    return scene;
  }

  if (op === 'set_style') {
    const target = String(command.target || 'primitive').toLowerCase();
    if (target === 'scene') {
      scene.style = Object.assign({}, scene.style, cloneJson(command.style || {}));
    } else {
      const id = String(command.id || '');
      const primitive = scene.primitives.find((p) => p.id === id);
      if (!primitive) throw new Error(`Primitive "${id}" not found`);
      primitive.style = Object.assign({}, primitive.style || {}, cloneJson(command.style || {}));
    }
    return scene;
  }

  if (op === 'set_camera') {
    scene.camera = Object.assign({}, scene.camera, cloneJson(command.camera || {}));
    if (command.camera && command.camera.isometric) {
      scene.camera.isometric = Object.assign({}, scene.camera.isometric || {}, cloneJson(command.camera.isometric));
    }
    if (command.camera && command.camera.rotationDeg) {
      scene.camera.rotationDeg = normalizeVec3(command.camera.rotationDeg, normalizeVec3(scene.camera.rotationDeg, [0, 0, 0]));
    }
    return scene;
  }

  if (op === 'rotate_scene') {
    scene.camera.rotationDeg = normalizeVec3(command.rotationDeg, normalizeVec3(scene.camera.rotationDeg, [0, 0, 0]));
    return scene;
  }

  if (op === 'export_svg') {
    scene.exportOptions = Object.assign({}, scene.exportOptions || {}, cloneJson(command.options || {}));
    const svg = renderSvg(scene, command.options || {});
    if (command.file) {
      fs.writeFileSync(String(command.file), svg, 'utf8');
    }
    scene.lastSvg = svg;
    return scene;
  }

  throw new Error(`Unsupported command op "${op}"`);
}

function runCommandBatch(batch) {
  const commands = Array.isArray(batch && batch.commands) ? batch.commands : [];
  let scene = batch && batch.scene ? createDefaultScene(batch.scene) : null;
  for (const command of commands) {
    scene = applyCommand(scene, command);
  }
  if (!scene) scene = createDefaultScene();
  return scene;
}

module.exports = {
  createDefaultScene,
  applyCommand,
  renderSvg,
  runCommandBatch,
};
