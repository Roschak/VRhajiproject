/**
 * Tightens the face-opening rings of Hijab_Gamis_Drape and Khimar_Drape
 * in woman.glb, outfits/woman-gamis.glb, outfits/woman-abaya-khimar.glb,
 * and crowd/woman-near.glb using a smooth analytical contour around the
 * temples, cheeks, jawline, and under-chin so no gaps or body parts show.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHAR_DIR = path.join(ROOT, 'src', 'VRHaji.Web', 'wwwroot', 'assets', 'characters');
const BACKUP_DIR = path.join(ROOT, 'artifacts', 'female-hijab', 'before');

const FULL_TARGETS = [
  'woman.glb',
  path.join('outfits', 'woman-gamis.glb'),
  path.join('outfits', 'woman-abaya-khimar.glb'),
];

const R = 49;
const N = 96;
const HALF = R * N; // 4704 (outer shell 0..4703, inner solidify shell 4704..9407)
const BLEND_RINGS = 10;

function parseGlb(buf) {
  const jlen = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.subarray(20, 20 + jlen).toString('utf8'));
  const binOff = 20 + jlen + 8;
  return { gltf, binOff };
}

function getVec3(buf, gltf, binOff, accIdx) {
  const acc = gltf.accessors[accIdx];
  const bv = gltf.bufferViews[acc.bufferView];
  const off = binOff + (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const stride = bv.byteStride || 12;
  const out = new Array(acc.count);
  for (let i = 0; i < acc.count; i++) {
    const o = off + i * stride;
    out[i] = [buf.readFloatLE(o), buf.readFloatLE(o + 4), buf.readFloatLE(o + 8)];
  }
  return out;
}

function setVec3(buf, gltf, binOff, accIdx, arr, updateMinMax) {
  const acc = gltf.accessors[accIdx];
  const bv = gltf.bufferViews[acc.bufferView];
  const off = binOff + (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const stride = bv.byteStride || 12;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < acc.count; i++) {
    const o = off + i * stride;
    const v = arr[i];
    buf.writeFloatLE(v[0], o);
    buf.writeFloatLE(v[1], o + 4);
    buf.writeFloatLE(v[2], o + 8);
    if (updateMinMax) {
      for (let k = 0; k < 3; k++) {
        if (v[k] < min[k]) min[k] = v[k];
        if (v[k] > max[k]) max[k] = v[k];
      }
    }
  }
  if (updateMinMax) {
    acc.min = min;
    acc.max = max;
  }
}

function getIndices(buf, gltf, binOff, accIdx) {
  const acc = gltf.accessors[accIdx];
  const bv = gltf.bufferViews[acc.bufferView];
  const off = binOff + (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const out = new Uint32Array(acc.count);
  if (acc.componentType === 5123) {
    for (let i = 0; i < acc.count; i++) out[i] = buf.readUInt16LE(off + i * 2);
  } else if (acc.componentType === 5125) {
    for (let i = 0; i < acc.count; i++) out[i] = buf.readUInt32LE(off + i * 4);
  } else {
    throw new Error('Unsupported index componentType: ' + acc.componentType);
  }
  return out;
}

function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function norm(a) {
  const l = Math.hypot(a[0], a[1], a[2]);
  return l > 1e-12 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 1, 0];
}

function recomputeNormalsRange(pos, nrm, idx, maxRing) {
  const acc = new Array(pos.length);
  for (let i = 0; i < pos.length; i++) acc[i] = [0, 0, 0];
  for (let i = 0; i < idx.length; i += 3) {
    const i0 = idx[i], i1 = idx[i + 1], i2 = idx[i + 2];
    const fn = cross(sub(pos[i1], pos[i0]), sub(pos[i2], pos[i0]));
    acc[i0][0] += fn[0]; acc[i0][1] += fn[1]; acc[i0][2] += fn[2];
    acc[i1][0] += fn[0]; acc[i1][1] += fn[1]; acc[i1][2] += fn[2];
    acc[i2][0] += fn[0]; acc[i2][1] += fn[1]; acc[i2][2] += fn[2];
  }
  for (let i = 0; i < pos.length; i++) {
    const r = ((i % HALF) / N) | 0;
    if (r <= maxRing) {
      nrm[i] = norm(acc[i]);
    }
  }
}

/**
 * Smooth analytical face-opening tuck for the 49x96x2 annular hijab/khimar:
 * - Preserves center forehead (j=0) and crown height so scalp never shows.
 * - Tucks side cheeks & jawline inward in |Z| (by ~13 mm at mid-cheek/jaw)
 *   and slightly forward (-X by ~4 mm) so the inner hem hugs the cheeks/jaw.
 * - Raises under-chin (j=48) slightly (+4 mm in Y, -3 mm in X) to close neck gap.
 */
function tightenAnnularHijab(pos, nrm, idx) {
  if (pos.length !== R * N * 2) {
    throw new Error(`Unexpected vertex count ${pos.length}, expected ${R * N * 2}`);
  }

  for (let r = 0; r <= BLEND_RINGS; r++) {
    const w = 0.5 * (1 + Math.cos((Math.PI * r) / BLEND_RINGS));
    for (let j = 0; j < N; j++) {
      const ang = (j / N) * Math.PI * 2;
      const s = Math.sin(ang); // +1 left, -1 right
      const c = Math.cos(ang); // +1 forehead, 0 cheek, -1 under chin
      const side = Math.abs(s);
      const lower = Math.max(0, -c);

      const upper = Math.max(0, c);

      // Pull |Z| inward around temples/cheeks/jawline (stronger on cheeks and jawline).
      const zScale = 1 - w * (0.22 * side * side + 0.14 * lower * side);
      // Shift slightly forward (-X) along cheeks/jaw/chin so the hem sits flush against the face.
      const dx = -w * (0.0075 * side + 0.004 * lower);
      // Gently raise under-chin and round the temple corners (0 at j=0) into a smooth oval.
      const dy = w * (0.007 * lower * lower - 0.005 * upper * side);

      const idxOuter = r * N + j;
      const idxInner = HALF + idxOuter;
      pos[idxOuter][0] += dx;
      pos[idxOuter][1] += dy;
      pos[idxOuter][2] *= zScale;

      pos[idxInner][0] += dx;
      pos[idxInner][1] += dy;
      pos[idxInner][2] *= zScale;
    }
  }

  if (nrm) {
    recomputeNormalsRange(pos, nrm, idx, BLEND_RINGS + 2);
  }
}

function tightenCrowdNearHijab(pos) {
  for (let i = 0; i < pos.length; i++) {
    const p = pos[i];
    if (p[0] < -0.058 && p[1] > 1.54 && p[1] < 1.72 && Math.abs(p[2]) > 0.025) {
      p[2] *= 0.86;
      p[0] -= 0.003;
    }
  }
}

function writeUpdatedGlb(livePath, buf, gltf) {
  const jsonStr = JSON.stringify(gltf);
  const jsonPad = (4 - (Buffer.byteLength(jsonStr) % 4)) % 4;
  const jsonBuf = Buffer.from(jsonStr + ' '.repeat(jsonPad), 'utf8');
  const binChunkHeaderAndData = buf.subarray(20 + buf.readUInt32LE(12));
  const totalLen = 12 + 8 + jsonBuf.length + binChunkHeaderAndData.length;
  const out = Buffer.alloc(totalLen);
  out.writeUInt32LE(0x46546C67, 0);
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(totalLen, 8);
  out.writeUInt32LE(jsonBuf.length, 12);
  out.writeUInt32LE(0x4E4F534A, 16);
  jsonBuf.copy(out, 20);
  binChunkHeaderAndData.copy(out, 20 + jsonBuf.length);
  fs.writeFileSync(livePath, out);
}

function backupAndRead(relPath) {
  const livePath = path.join(CHAR_DIR, relPath);
  const bakPath = path.join(BACKUP_DIR, relPath);
  fs.mkdirSync(path.dirname(bakPath), { recursive: true });
  if (!fs.existsSync(bakPath)) {
    fs.copyFileSync(livePath, bakPath);
  }
  return { livePath, buf: fs.readFileSync(bakPath) };
}

for (const relPath of FULL_TARGETS) {
  const { livePath, buf } = backupAndRead(relPath);
  const { gltf, binOff } = parseGlb(buf);

  for (const meshName of ['Hijab_Gamis_Drape', 'Khimar_Drape']) {
    const node = gltf.nodes.find(n => n.name === meshName);
    if (!node) continue;
    const prim = gltf.meshes[node.mesh].primitives[0];
    const pos = getVec3(buf, gltf, binOff, prim.attributes.POSITION);
    const nrm = prim.attributes.NORMAL != null ? getVec3(buf, gltf, binOff, prim.attributes.NORMAL) : null;
    const idx = getIndices(buf, gltf, binOff, prim.indices);
    tightenAnnularHijab(pos, nrm, idx);
    setVec3(buf, gltf, binOff, prim.attributes.POSITION, pos, true);
    if (nrm) setVec3(buf, gltf, binOff, prim.attributes.NORMAL, nrm, false);
    console.log(`Updated ${meshName} in ${relPath}`);
  }

  writeUpdatedGlb(livePath, buf, gltf);
}

{
  const relPath = path.join('crowd', 'woman-near.glb');
  const { livePath, buf } = backupAndRead(relPath);
  const { gltf, binOff } = parseGlb(buf);
  const node = gltf.nodes.find(n => n.name === 'Hijab_Gamis_Drape');
  if (node) {
    const prim = gltf.meshes[node.mesh].primitives[0];
    const pos = getVec3(buf, gltf, binOff, prim.attributes.POSITION);
    tightenCrowdNearHijab(pos);
    setVec3(buf, gltf, binOff, prim.attributes.POSITION, pos, true);
    writeUpdatedGlb(livePath, buf, gltf);
    console.log(`Updated Hijab_Gamis_Drape in ${relPath}`);
  }
}
