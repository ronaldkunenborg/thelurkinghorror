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
  const faces = [
    [0, 1, 2, 3],
    [4, 5, 6, 7],
    [0, 1, 5, 4],
    [3, 2, 6, 7],
    [0, 4, 7, 3],
    [1, 2, 6, 5],
  ];
  return { vertices, edges, faces };
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
  return { vertices, edges, faces: [] };
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

  return { vertices, edges, faces: [] };
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
  const cameraPoint = cameraSpacePoint(scene, point);
  return projectCameraPoint(scene, cameraPoint);
}

function cameraSpacePoint(scene, point) {
  const cam = scene.camera || {};

  const cameraRotation = normalizeVec3(cam.rotationDeg, [0, 0, 0]);
  const cameraRotMatrix = matrixMultiply(
    matrixRotateZ(degToRad(cameraRotation[2])),
    matrixMultiply(matrixRotateY(degToRad(cameraRotation[1])), matrixRotateX(degToRad(cameraRotation[0])))
  );
  const rotated = transformPoint(cameraRotMatrix, point);

  if (cam.projection === 'tile_oblique') {
    return { x: rotated[0], y: rotated[1], z: rotated[2], w: 1 };
  }

  if (cam.projection === 'perspective') {
    return { x: rotated[0], y: rotated[1], z: rotated[2], w: 1 };
  }

  const iso = cam.isometric || {};
  const yaw = degToRad(Number(iso.yawDeg) || 45);
  const pitch = degToRad(Number(iso.pitchDeg) || 35.264);
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);

  const x = rotated[0] * cy + rotated[2] * sy;
  const z1 = -rotated[0] * sy + rotated[2] * cy;
  const y = rotated[1] * cp - z1 * sp;
  const z = rotated[1] * sp + z1 * cp;
  return { x, y, z, w: 1 };
}

function projectCameraPoint(scene, cameraPoint) {
  const cam = scene.camera || {};
  const width = Number(cam.width) || 1024;
  const height = Number(cam.height) || 1024;
  const scale = Number(cam.scale) || 120;
  const yScale = Number(cam.yScale) || 1;
  const offsetX = Number(cam.offsetX) || 0;
  const offsetY = Number(cam.offsetY) || 0;

  if (cam.projection === 'tile_oblique') {
    const oblique = cam.oblique && typeof cam.oblique === 'object' ? cam.oblique : {};
    const zDx = Number.isFinite(Number(oblique.zDx)) ? Number(oblique.zDx) : 0.5;
    const zDy = Number.isFinite(Number(oblique.zDy)) ? Number(oblique.zDy) : 0.866;
    const zScale = Number.isFinite(Number(oblique.zScale)) ? Number(oblique.zScale) : 0.82;
    const safeYScale = Math.abs(yScale) < 1e-6 ? 1 : yScale;
    const projA = zDx * zScale;
    const projB = zDy * zScale;
    // Depth along the actual oblique view direction (not raw z only).
    const depthMetric = cameraPoint.x * (-projA) + cameraPoint.y * (projB / safeYScale) + cameraPoint.z;
    const x = width * 0.5 + offsetX + cameraPoint.x * scale + cameraPoint.z * scale * zDx * zScale;
    const y = height * 0.5 + offsetY - cameraPoint.y * scale * yScale + cameraPoint.z * scale * zDy * zScale;
    return { x, y, depth: depthMetric, nearMetric: depthMetric };
  }

  if (cam.projection === 'perspective') {
    const d = Number(cam.perspectiveDistance) || 8;
    const denom = d - cameraPoint.z;
    const safe = Math.abs(denom) < 1e-6 ? (denom < 0 ? -1e-6 : 1e-6) : denom;
    const factor = d / safe;
    const x = width * 0.5 + offsetX + cameraPoint.x * scale * factor;
    const y = height * 0.5 + offsetY - cameraPoint.y * scale * yScale * factor;
    return { x, y, depth: cameraPoint.z, nearMetric: safe };
  }

  const x = width * 0.5 + offsetX + cameraPoint.x * scale;
  const y = height * 0.5 + offsetY - cameraPoint.y * scale * yScale;
  return { x, y, depth: cameraPoint.z, nearMetric: -cameraPoint.z };
}

function primitiveToRenderData(scene, primitive) {
  const geometry = buildPrimitiveGeometry(primitive);
  const style = normalizeStyle(primitive.style, scene.style);
  const matrix = buildTransformMatrix(primitive.transform);
  const worldVertices = geometry.vertices.map((v) => transformPoint(matrix, v));
  const cameraVertices = worldVertices.map((v) => cameraSpacePoint(scene, v));
  const projected = cameraVertices.map((v) => projectCameraPoint(scene, v));
  const segments = geometry.edges.map(([a, b], edgeIndex) => {
    const p1 = projected[a];
    const p2 = projected[b];
    return {
      primitiveId: primitive.id,
      x1: p1.x,
      y1: p1.y,
      x2: p2.x,
      y2: p2.y,
      z1: p1.depth,
      z2: p2.depth,
      edgeIndex,
      depth: (p1.depth + p2.depth) * 0.5,
      nearMetric: (p1.nearMetric + p2.nearMetric) * 0.5,
      style,
    };
  });

  const faces = (geometry.faces || []).map((faceIdx, faceIndex) => {
    const pts = faceIdx.map((idx) => projected[idx]);
    return {
      primitiveId: primitive.id,
      occluder: primitive.occluder !== false,
      faceIndex,
      polygon: pts.map((p) => ({ x: p.x, y: p.y })),
      vertices: faceIdx.map((idx) => ({
        x: projected[idx].x,
        y: projected[idx].y,
        z: projected[idx].depth,
      })),
      depth: faceIdx.reduce((acc, idx) => acc + projected[idx].depth, 0) / faceIdx.length,
      area: polygonArea(pts.map((p) => ({ x: p.x, y: p.y }))),
      style,
    };
  });

  return { primitiveId: primitive.id, segments, faces };
}

function polygonArea(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum * 0.5;
}

function pointInPolygon(pt, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersects = yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointOnSegment2d(pt, a, b, eps = 1e-6) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = pt.x - a.x;
  const apy = pt.y - a.y;
  const cross = abx * apy - aby * apx;
  if (Math.abs(cross) > eps) return false;
  const dot = apx * abx + apy * aby;
  if (dot < -eps) return false;
  const abLenSq = abx * abx + aby * aby;
  if (dot - abLenSq > eps) return false;
  return true;
}

function pointInPolygonInclusive(pt, polygon) {
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    if (pointOnSegment2d(pt, a, b)) return true;
  }
  return pointInPolygon(pt, polygon);
}

function segmentIntersectionT(a, b, c, d) {
  const r = { x: b.x - a.x, y: b.y - a.y };
  const s = { x: d.x - c.x, y: d.y - c.y };
  const rxs = r.x * s.y - r.y * s.x;
  const qp = { x: c.x - a.x, y: c.y - a.y };
  const qpxr = qp.x * r.y - qp.y * r.x;
  if (Math.abs(rxs) < 1e-9 && Math.abs(qpxr) < 1e-9) return null;
  if (Math.abs(rxs) < 1e-9) return null;
  const t = (qp.x * s.y - qp.y * s.x) / rxs;
  const u = (qp.x * r.y - qp.y * r.x) / rxs;
  if (t < -1e-9 || t > 1 + 1e-9 || u < -1e-9 || u > 1 + 1e-9) return null;
  return clamp(t, 0, 1);
}

function colinearOverlapTRange(a, b, c, d, eps = 1e-9) {
  const r = { x: b.x - a.x, y: b.y - a.y };
  const rr = r.x * r.x + r.y * r.y;
  if (rr <= eps) return null;

  const ac = { x: c.x - a.x, y: c.y - a.y };
  const ad = { x: d.x - a.x, y: d.y - a.y };
  const crossC = r.x * ac.y - r.y * ac.x;
  const crossD = r.x * ad.y - r.y * ad.x;
  if (Math.abs(crossC) > eps || Math.abs(crossD) > eps) return null;

  const t0 = (ac.x * r.x + ac.y * r.y) / rr;
  const t1 = (ad.x * r.x + ad.y * r.y) / rr;
  const lo = Math.max(0, Math.min(t0, t1));
  const hi = Math.min(1, Math.max(t0, t1));
  if (hi - lo <= 1e-6) return null;
  return [lo, hi];
}

function uniqueSorted(values, eps = 1e-6) {
  const sorted = values.slice().sort((a, b) => a - b);
  const out = [];
  for (const v of sorted) {
    if (!out.length || Math.abs(v - out[out.length - 1]) > eps) out.push(v);
  }
  return out;
}

function pointInTriangleWithBarycentric(pt, a, b, c) {
  const v0x = b.x - a.x;
  const v0y = b.y - a.y;
  const v1x = c.x - a.x;
  const v1y = c.y - a.y;
  const v2x = pt.x - a.x;
  const v2y = pt.y - a.y;

  const d00 = v0x * v0x + v0y * v0y;
  const d01 = v0x * v1x + v0y * v1y;
  const d11 = v1x * v1x + v1y * v1y;
  const d20 = v2x * v0x + v2y * v0y;
  const d21 = v2x * v1x + v2y * v1y;
  const denom = d00 * d11 - d01 * d01;
  if (Math.abs(denom) < 1e-10) return null;

  const v = (d11 * d20 - d01 * d21) / denom;
  const w = (d00 * d21 - d01 * d20) / denom;
  const u = 1 - v - w;
  const eps = 1e-6;
  if (u < -eps || v < -eps || w < -eps) return null;
  return { u, v, w };
}

function faceDepthAtPoint(face, pt) {
  if (!face || !Array.isArray(face.vertices) || face.vertices.length < 3) return null;
  const verts = face.vertices;
  const a = verts[0];
  for (let i = 1; i < verts.length - 1; i += 1) {
    const b = verts[i];
    const c = verts[i + 1];
    const bary = pointInTriangleWithBarycentric(pt, a, b, c);
    if (!bary) continue;
    return bary.u * a.z + bary.v * b.z + bary.w * c.z;
  }
  return null;
}

function polygonCentroid(points) {
  if (!Array.isArray(points) || !points.length) return { x: 0, y: 0 };
  let area2 = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const cross = a.x * b.y - b.x * a.y;
    area2 += cross;
    cx += (a.x + b.x) * cross;
    cy += (a.y + b.y) * cross;
  }
  if (Math.abs(area2) < 1e-9) {
    let sx = 0;
    let sy = 0;
    for (const p of points) {
      sx += p.x;
      sy += p.y;
    }
    return { x: sx / points.length, y: sy / points.length };
  }
  return { x: cx / (3 * area2), y: cy / (3 * area2) };
}

function subtractIntervals(baseIntervals, cutIntervals) {
  let out = baseIntervals.slice();
  for (const cut of cutIntervals) {
    const next = [];
    for (const intv of out) {
      const a = intv[0];
      const b = intv[1];
      const c = cut[0];
      const d = cut[1];
      if (d <= a || c >= b) {
        next.push([a, b]);
        continue;
      }
      if (c > a) next.push([a, c]);
      if (d < b) next.push([d, b]);
    }
    out = next.filter((i) => i[1] - i[0] > 1e-5);
    if (!out.length) break;
  }
  return out;
}

function occludedIntervalsForSegment(seg, polygon) {
  const p0 = { x: seg.x1, y: seg.y1 };
  const p1 = { x: seg.x2, y: seg.y2 };
  const ts = [0, 1];
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const overlap = colinearOverlapTRange(p0, p1, a, b);
    if (overlap) {
      ts.push(overlap[0], overlap[1]);
      continue;
    }
    const t = segmentIntersectionT(p0, p1, a, b);
    if (t != null) ts.push(t);
  }
  const cuts = [];
  const uniq = uniqueSorted(ts);
  for (let i = 0; i < uniq.length - 1; i += 1) {
    const a = uniq[i];
    const b = uniq[i + 1];
    if (b - a <= 1e-6) continue;
    const mid = (a + b) * 0.5;
    const mp = { x: p0.x + (p1.x - p0.x) * mid, y: p0.y + (p1.y - p0.y) * mid };
    if (pointInPolygonInclusive(mp, polygon)) cuts.push([a, b]);
  }
  return cuts;
}

function applyFaceOcclusion(segments, faces, mode) {
  if (!['far', 'partial', 'strict'].includes(mode)) return segments;
  const out = [];
  const faceCandidates = faces.filter((f) => Math.abs(f.area) > 1e-5 && f.occluder !== false);
  const farDepthGap = 0.35;
  const partialDepthGap = 0.05;
  for (const seg of segments) {
    let visibleIntervals = [[0, 1]];
    const p0 = { x: seg.x1, y: seg.y1 };
    const p1 = { x: seg.x2, y: seg.y2 };
    for (const face of faceCandidates) {
      let cuts = [];
      if (mode === 'far') {
        // Conservative mode: only hide clearly far edges that are fully behind one face.
        const depthGap = face.depth - seg.depth;
        if (depthGap <= 1e-4) continue;
        if (depthGap < farDepthGap) continue;
        if (!pointInPolygonInclusive(p0, face.polygon) || !pointInPolygonInclusive(p1, face.polygon)) continue;
        const midPt = { x: (p0.x + p1.x) * 0.5, y: (p0.y + p1.y) * 0.5 };
        const faceMidZ = faceDepthAtPoint(face, midPt);
        const segMidZ = (seg.z1 + seg.z2) * 0.5;
        if (faceMidZ == null || faceMidZ <= segMidZ + farDepthGap) continue;
        cuts = [[0, 1]];
      } else {
        const candidates = occludedIntervalsForSegment(seg, face.polygon);
        cuts = candidates.filter(([a, b]) => {
          const mid = (a + b) * 0.5;
          const mp = {
            x: seg.x1 + (seg.x2 - seg.x1) * mid,
            y: seg.y1 + (seg.y2 - seg.y1) * mid,
          };
          const faceZ = faceDepthAtPoint(face, mp);
          if (faceZ == null) return false;
          const segZ = seg.z1 + (seg.z2 - seg.z1) * mid;
          const gap = mode === 'strict' ? 1e-4 : partialDepthGap;
          return faceZ > segZ + gap;
        });
      }
      if (!cuts.length) continue;
      visibleIntervals = subtractIntervals(visibleIntervals, cuts);
      if (!visibleIntervals.length) break;
    }
    for (const [a, b] of visibleIntervals) {
      out.push(
        Object.assign({}, seg, {
          x1: seg.x1 + (seg.x2 - seg.x1) * a,
          y1: seg.y1 + (seg.y2 - seg.y1) * a,
          x2: seg.x1 + (seg.x2 - seg.x1) * b,
          y2: seg.y1 + (seg.y2 - seg.y1) * b,
        })
      );
    }
  }
  return out;
}

function renderSvg(scene, options) {
  const opts = options && typeof options === 'object' ? options : {};
  const width = Number(opts.width || scene.camera.width || 1024);
  const height = Number(opts.height || scene.camera.height || 1024);
  const background = typeof opts.background === 'string' ? opts.background : scene.style.background;
  const exportOptions = Object.assign({}, scene.exportOptions || {}, opts.exportOptions || {});
  const hiddenMode = String(exportOptions.hiddenEdges || opts.hiddenEdges || 'none').toLowerCase();
  const faceDebug = exportOptions.faceDebug && typeof exportOptions.faceDebug === 'object' ? exportOptions.faceDebug : null;
  const faceDebugEnabled = !!(faceDebug && faceDebug.enabled);
  const faceDebugHatchColor = faceDebug && typeof faceDebug.hatchColor === 'string' ? faceDebug.hatchColor : '#7cc7ff';
  const faceDebugHatchOpacity = faceDebug && Number.isFinite(Number(faceDebug.hatchOpacity))
    ? clamp(Number(faceDebug.hatchOpacity), 0, 1)
    : 0.45;
  const faceDebugHatchSpacing = faceDebug && Number.isFinite(Number(faceDebug.hatchSpacing))
    ? Math.max(4, Number(faceDebug.hatchSpacing))
    : 10;
  const faceDebugHatchStrokeWidth = faceDebug && Number.isFinite(Number(faceDebug.hatchStrokeWidth))
    ? Math.max(0.2, Number(faceDebug.hatchStrokeWidth))
    : 0.9;
  const faceDebugFillOpacity = faceDebug && Number.isFinite(Number(faceDebug.fillOpacity))
    ? clamp(Number(faceDebug.fillOpacity), 0, 1)
    : 0.06;
  const faceDebugFill = faceDebug && typeof faceDebug.fill === 'string' ? faceDebug.fill : '#6eb9ff';
  const debugLabels = exportOptions.debugLabels && typeof exportOptions.debugLabels === 'object' ? exportOptions.debugLabels : null;
  const debugLabelsEnabled = !!(debugLabels && debugLabels.enabled);
  const debugLabelColor = debugLabels && typeof debugLabels.color === 'string' ? debugLabels.color : '#ffe082';
  const debugLabelHalo = debugLabels && typeof debugLabels.halo === 'string' ? debugLabels.halo : '#0b1220';
  const debugLabelFontSize = debugLabels && Number.isFinite(Number(debugLabels.fontSize))
    ? Math.max(7, Number(debugLabels.fontSize))
    : 11;
  const debugLabelFaces = debugLabelsEnabled && debugLabels.faces !== false;
  const debugLabelEdges = debugLabelsEnabled && debugLabels.edges !== false;
  const debugLabelPrefixPrimitive = debugLabelsEnabled && debugLabels.prefixPrimitive !== false;
  const debugLabelMinEdgeLength = debugLabels && Number.isFinite(Number(debugLabels.minEdgeLength))
    ? Math.max(0, Number(debugLabels.minEdgeLength))
    : 16;

  const renderData = [];
  for (const primitive of scene.primitives) {
    renderData.push(primitiveToRenderData(scene, primitive));
  }
  const allFaces = renderData.flatMap((d) => d.faces);
  const segmentsByPrimitive = renderData.map((d) => ({
    primitiveId: d.primitiveId,
    segments: applyFaceOcclusion(d.segments, allFaces, hiddenMode),
  }));

  const lines = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);
  if (faceDebugEnabled) {
    const s = faceDebugHatchSpacing.toFixed(2);
    const sw = faceDebugHatchStrokeWidth.toFixed(2);
    lines.push(`  <defs>`);
    lines.push(`    <pattern id="wf-face-hatch" patternUnits="userSpaceOnUse" width="${s}" height="${s}">`);
    lines.push(`      <line x1="0" y1="${s}" x2="${s}" y2="0" stroke="${faceDebugHatchColor}" stroke-opacity="${faceDebugHatchOpacity.toFixed(3)}" stroke-width="${sw}" />`);
    lines.push(`      <line x1="0" y1="0" x2="${s}" y2="${s}" stroke="${faceDebugHatchColor}" stroke-opacity="${faceDebugHatchOpacity.toFixed(3)}" stroke-width="${sw}" />`);
    lines.push(`    </pattern>`);
    lines.push(`  </defs>`);
  }
  lines.push(`  <rect x="0" y="0" width="${width}" height="${height}" fill="${background}" />`);
  if (faceDebugEnabled) {
    const facePolys = allFaces
      .filter((f) => Math.abs(f.area) > 1e-5)
      .slice()
      .sort((a, b) => a.depth - b.depth);
    lines.push(`  <g id="face-debug">`);
    for (const face of facePolys) {
      const points = face.polygon.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
      const stroke = face.style && typeof face.style.stroke === 'string' ? face.style.stroke : '#d7ecff';
      lines.push(
        `    <polygon points="${points}" fill="url(#wf-face-hatch)" fill-opacity="${faceDebugFillOpacity.toFixed(3)}"` +
          ` stroke="${stroke}" stroke-opacity="0.220" stroke-width="0.65" data-primitive="${face.primitiveId}" />`
      );
      lines.push(
        `    <polygon points="${points}" fill="${faceDebugFill}" fill-opacity="${(faceDebugFillOpacity * 0.2).toFixed(3)}"` +
          ` stroke="none" data-primitive="${face.primitiveId}" />`
      );
    }
    lines.push(`  </g>`);
  }

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

  if (debugLabelsEnabled) {
    lines.push(`  <g id="debug-labels">`);
    if (debugLabelFaces) {
      const facePolys = allFaces
        .filter((f) => Math.abs(f.area) > 1e-5)
        .slice()
        .sort((a, b) => a.depth - b.depth);
      for (const face of facePolys) {
        const c = polygonCentroid(face.polygon);
        const text = debugLabelPrefixPrimitive ? `${face.primitiveId}:F${face.faceIndex}` : `F${face.faceIndex}`;
        lines.push(
          `    <text x="${c.x.toFixed(2)}" y="${c.y.toFixed(2)}" font-size="${debugLabelFontSize.toFixed(1)}"` +
            ` fill="${debugLabelColor}" stroke="${debugLabelHalo}" stroke-width="2.2" paint-order="stroke"` +
            ` text-anchor="middle" dominant-baseline="middle">${text}</text>`
        );
      }
    }
    if (debugLabelEdges) {
      for (const group of segmentsByPrimitive) {
        for (const seg of group.segments) {
          const dx = seg.x2 - seg.x1;
          const dy = seg.y2 - seg.y1;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len < debugLabelMinEdgeLength) continue;
          const mx = (seg.x1 + seg.x2) * 0.5;
          const my = (seg.y1 + seg.y2) * 0.5;
          const text = debugLabelPrefixPrimitive ? `${seg.primitiveId}:E${seg.edgeIndex}` : `E${seg.edgeIndex}`;
          lines.push(
            `    <text x="${mx.toFixed(2)}" y="${my.toFixed(2)}" font-size="${debugLabelFontSize.toFixed(1)}"` +
              ` fill="${debugLabelColor}" stroke="${debugLabelHalo}" stroke-width="2.2" paint-order="stroke"` +
              ` text-anchor="middle" dominant-baseline="middle">${text}</text>`
          );
        }
      }
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
      occluder: command.occluder !== false,
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
    if (Object.prototype.hasOwnProperty.call(command, 'occluder')) {
      primitive.occluder = command.occluder !== false;
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
