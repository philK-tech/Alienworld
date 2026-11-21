// meshes.js: Prozedurale Meshes (Terrain, Felsen, Wasserfälle, Pflanzen, Quallen ...)
// --- Procedural Meshes ---
function buildValleyTerrainMesh() {
  const b = createGeometryBuilder();
  const segX = 110;
  const segZ = 220;
  const spanX = 96.0;
  for (let iz = 0; iz <= segZ; iz++) {
    const vz = iz / segZ;
    const z = -vz * LOOP_LENGTH;
    const cx = riverCenterX(z);
    const hw = riverHalfWidth(z);
    for (let ix = 0; ix <= segX; ix++) {
      const vx = ix / segX;
      const localX = (vx * 2.0 - 1.0) * spanX;
      const x = cx + localX;
      const distFromRiver = Math.max(0.0, Math.abs(localX) - hw);

      // Riverbed dips to -1.25; banks rise gently with mossy terraces & low distant ridges
      const riverDip = -1.25 * (1.0 - smoothstep(0.0, hw * 1.12, Math.abs(localX)));
      const bankRise = Math.pow(distFromRiver / 16.0, 1.35) * 4.4;
      const lowRidge = smoothstep(22.0, 48.0, distFromRiver) * (2.2 + 3.4 * fbm2(x * 0.045, z * 0.045, 3));
      const undulation = (fbm2(x * 0.14, z * 0.14, 3) - 0.5) * 0.65 * smoothstep(0.5, 4.0, distFromRiver);
      const y = riverDip + bankRise + lowRidge + undulation;

      const emMask = smoothstep(0.4, 2.2, distFromRiver) * (1.0 - smoothstep(8.0, 18.0, distFromRiver));
      b.pushVertex(x, y, z, 0, 1, 0, x * 0.18, z * 0.18, 0.85, emMask, 0.0, 0);
    }
  }
  const row = segX + 1;
  for (let iz = 0; iz < segZ; iz++) {
    for (let ix = 0; ix < segX; ix++) {
      const a = iz * row + ix;
      const c = a + 1;
      const d = a + row;
      const e = d + 1;
      b.pushQuad(a, c, e, d);
    }
  }
  b.computeSmoothNormals();
  return b;
}

function buildWaterSurfaceMesh() {
  const b = createGeometryBuilder();
  const segX = 44;
  const segZ = 220;
  const spanX = 24.0;
  for (let iz = 0; iz <= segZ; iz++) {
    const vz = iz / segZ;
    const z = -vz * LOOP_LENGTH;
    const cx = riverCenterX(z);
    for (let ix = 0; ix <= segX; ix++) {
      const vx = ix / segX;
      const x = cx + (vx * 2.0 - 1.0) * spanX;
      const edgeMask = 1.0 - Math.pow(Math.abs(vx * 2.0 - 1.0), 3.0);
      b.pushVertex(x, 0.0, z, 0, 1, 0, vx, vz * 45.0, edgeMask, 0.0, 0.0, 1);
    }
  }
  const row = segX + 1;
  for (let iz = 0; iz < segZ; iz++) {
    for (let ix = 0; ix < segX; ix++) {
      const a = iz * row + ix;
      const c = a + 1;
      const d = a + row;
      const e = d + 1;
      b.pushQuad(a, c, e, d);
    }
  }
  return b;
}

function buildSkyDomeMesh() {
  const b = createGeometryBuilder();
  const rings = 24;
  const sectors = 40;
  const radius = 260.0;
  for (let ir = 0; ir <= rings; ir++) {
    const v = ir / rings;
    const phi = v * Math.PI * 0.52;
    const y = Math.sin(phi) * radius;
    const rXZ = Math.cos(phi) * radius;
    for (let is = 0; is <= sectors; is++) {
      const u = is / sectors;
      const theta = u * Math.PI * 2.0;
      const x = Math.cos(theta) * rXZ;
      const z = Math.sin(theta) * rXZ;
      b.pushVertex(x, y, z, -x, -y, -z, u, v, 1.0, 0.0, 0.0, 99);
    }
  }
  const row = sectors + 1;
  for (let ir = 0; ir < rings; ir++) {
    for (let is = 0; is < sectors; is++) {
      const a = ir * row + is;
      const c = a + 1;
      const d = a + row;
      const e = d + 1;
      b.pushQuad(a, d, e, c);
    }
  }
  return b;
}

function buildRockCliffMesh() {
  const b = createGeometryBuilder();
  const rings = 20;
  const sectors = 24;
  for (let ir = 0; ir <= rings; ir++) {
    const v = ir / rings;
    const strata = 1.0 + 0.17 * Math.sin(v * Math.PI * 8.0) + 0.08 * Math.cos(v * Math.PI * 16.0);
    const radius = (1.0 - Math.pow(v, 1.45) * 0.64) * strata;
    const y = v * 1.0;
    for (let is = 0; is <= sectors; is++) {
      const u = is / sectors;
      const ang = u * Math.PI * 2.0;
      const nA = fbm2(Math.cos(ang) * 2.5 + v * 4.0, Math.sin(ang) * 2.5 + 3.7, 3);
      const jag = 0.72 + 0.44 * nA;
      const rx = Math.cos(ang) * radius * jag;
      const rz = Math.sin(ang) * radius * jag * 0.88;
      const ao = clamp01(0.32 + 0.68 * v);
      const glow = smoothstep(0.45, 0.88, Math.sin(v * Math.PI * 6.0)) * (1.0 - v * 0.8) * 0.55;
      b.pushVertex(rx, y, rz, rx, 0.3, rz, u * 3.0, v * 3.0, ao, glow, 0.0, 2);
    }
  }
  const row = sectors + 1;
  for (let ir = 0; ir < rings; ir++) {
    for (let is = 0; is < sectors; is++) {
      const a = ir * row + is;
      const c = a + 1;
      const d = a + row;
      const e = d + 1;
      b.pushQuad(a, c, e, d);
    }
  }
  b.computeFacetedNormals();
  return b;
}

// Sculpted waterfall cliff basin: local +Z faces toward the river
function buildWaterfallCliffHousingMesh() {
  const b = createGeometryBuilder();
  const segsX = 28;
  const segsY = 24;
  for (let iy = 0; iy <= segsY; iy++) {
    const v = iy / segsY; // 0 = river base, 1 = top crest
    const y = v * 1.0;
    for (let ix = 0; ix <= segsX; ix++) {
      const u = ix / segsX;
      const sx = u * 2.0 - 1.0; // -1..+1 across cliff face
      const absX = Math.abs(sx);

      const chuteMask = 1.0 - smoothstep(0.14, 0.44, absX);
      const topLip = smoothstep(0.76, 0.92, v) * (1.0 - smoothstep(0.92, 1.0, v));
      const flankBulge = smoothstep(0.16, 0.62, absX) * (1.0 - smoothstep(0.76, 1.0, absX)) * 1.1;
      const taper = 1.0 - Math.pow(v, 1.75) * 0.32;
      const crag = fbm2(sx * 3.6 + 2.1, v * 5.0 + 1.4, 4);

      // Recessed dark alcove in center, overhanging lip at top crest
      let z = (-0.3 + flankBulge + (crag - 0.5) * 0.62) * taper;
      z -= chuteMask * (0.46 - topLip * 0.42);
      z += chuteMask * topLip * 0.34;

      const px = sx * (1.0 + (1.0 - v) * 0.22);
      const ao = clamp01((0.36 + 0.64 * v) * (1.0 - chuteMask * 0.45));
      const glow = smoothstep(0.42, 0.88, crag) * (1.0 - chuteMask * 0.75) * 0.5;
      b.pushVertex(px, y, z, 0, 0.2, 1, u * 3.0, v * 3.0, ao, glow, 0.0, 2);
    }
  }
  const row = segsX + 1;
  for (let iy = 0; iy < segsY; iy++) {
    for (let ix = 0; ix < segsX; ix++) {
      const a = iy * row + ix;
      const c = a + 1;
      const d = a + row;
      const e = d + 1;
      b.pushQuad(a, c, e, d);
    }
  }
  b.computeFacetedNormals();
  return b;
}

function buildFloatingMountainMesh() {
  const b = createGeometryBuilder();
  const rings = 22;
  const sectors = 32;
  // v=0 is pointed inverted cone bottom; v=0.68 is broad plateau; v=1 is rounded mossy cap
  for (let ir = 0; ir <= rings; ir++) {
    const v = ir / rings;
    let radius, y;
    if (v < 0.68) {
      const t = v / 0.68;
      radius = Math.pow(t, 0.78);
      y = (t - 0.68) * 0.85;
    } else {
      const t = (v - 0.68) / 0.32;
      radius = Math.cos(t * Math.PI * 0.46);
      y = t * 0.32;
    }
    for (let is = 0; is <= sectors; is++) {
      const u = is / sectors;
      const ang = u * Math.PI * 2.0;
      const n = fbm2(Math.cos(ang) * 2.6 + v * 3.4, Math.sin(ang) * 2.6 + 8.2, 4);
      const jag = 0.68 + 0.48 * n;
      const rx = Math.cos(ang) * radius * jag;
      const rz = Math.sin(ang) * radius * jag * 0.86;
      const glow = smoothstep(0.55, 0.9, n) * (1.0 - smoothstep(0.68, 1.0, v)) * 0.65;
      b.pushVertex(rx, y, rz, rx, y + 0.2, rz, u * 3.0, v * 3.0, 0.4 + 0.6 * v, glow, 0.0, 2);
    }
  }
  const row = sectors + 1;
  for (let ir = 0; ir < rings; ir++) {
    for (let is = 0; is < sectors; is++) {
      const a = ir * row + is;
      const c = a + 1;
      const d = a + row;
      const e = d + 1;
      b.pushQuad(a, c, e, d);
    }
  }
  b.computeFacetedNormals();
  return b;
}

function buildStoneArchMesh() {
  const b = createGeometryBuilder();
  const segs = 36;
  const radialSegs = 12;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const ang = t * Math.PI; // 0..PI across river
    const archX = -Math.cos(ang) * 11.5;
    const archY = Math.sin(ang) * 10.5 - 0.6;
    const thick = lerp(2.1, 1.15, Math.sin(ang));
    const tx = Math.sin(ang) * 11.5;
    const ty = Math.cos(ang) * 10.5;
    const tLen = Math.hypot(tx, ty) || 1.0;
    const nxBase = -ty / tLen;
    const nyBase = tx / tLen;

    for (let j = 0; j <= radialSegs; j++) {
      const v = j / radialSegs;
      const phi = v * Math.PI * 2.0;
      const crag = 0.78 + 0.36 * fbm2(t * 9.0, v * 5.0, 3);
      const r = thick * crag;
      const px = archX + nxBase * Math.cos(phi) * r;
      const py = archY + nyBase * Math.cos(phi) * r;
      const pz = Math.sin(phi) * r * 1.15;
      const glow = smoothstep(0.62, 0.92, crag) * 0.45;
      b.pushVertex(px, py, pz, nxBase * Math.cos(phi), nyBase * Math.cos(phi), Math.sin(phi), t * 5.0, v * 2.0, 0.75, glow, 0.0, 2);
    }
  }
  const row = radialSegs + 1;
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radialSegs; j++) {
      const a = i * row + j;
      const c = a + 1;
      const d = a + row;
      const e = d + 1;
      b.pushQuad(a, c, e, d);
    }
  }
  b.computeFacetedNormals();
  return b;
}

// Waterfall ribbon: local y goes from 0 (crest) down to -1 (river surface), curving forward along +Z
function buildWaterfallRibbonMesh() {
  const b = createGeometryBuilder();
  const layers = [
    { zOff: 0.0, wScale: 1.0, uvMul: 1.0, glow: 1.0 },
    { zOff: 0.14, wScale: 0.82, uvMul: 1.35, glow: 1.25 }
  ];
  for (let l = 0; l < layers.length; l++) {
    const lay = layers[l];
    const segsX = 18;
    const segsY = 28;
    const baseIdx = b.positions.length / 3;
    for (let iy = 0; iy <= segsY; iy++) {
      const v = iy / segsY; // 0 = top crest, 1 = bottom splash
      const curveZ = lay.zOff + Math.sin(Math.min(v * 1.35, 1.0) * Math.PI * 0.5) * 0.85;
      const flareX = (0.76 + Math.pow(v, 0.85) * 0.46) * lay.wScale;
      for (let ix = 0; ix <= segsX; ix++) {
        const u = ix / segsX;
        const ux = (u * 2.0 - 1.0) * 0.5 * flareX;
        const rippleZ = Math.sin(u * Math.PI * 6.0 + v * 8.0 + l * 1.7) * 0.05;
        const edgeFade = 1.0 - Math.pow(Math.abs(u * 2.0 - 1.0), 2.2);
        const topFade = smoothstep(0.0, 0.06, v);
        b.pushVertex(
          ux, -v, curveZ + rippleZ,
          0, 0.25, 1,
          u * lay.uvMul, v * 3.0 * lay.uvMul,
          edgeFade * topFade, lay.glow, l * 0.5, 4
        );
      }
    }
    const row = segsX + 1;
    for (let iy = 0; iy < segsY; iy++) {
      for (let ix = 0; ix < segsX; ix++) {
        const a = baseIdx + iy * row + ix;
        const c = a + 1;
        const d = a + row;
        const e = d + 1;
        b.pushQuad(a, d, e, c);
      }
    }
  }
  return b;
}

function buildPlungeRippleMesh() {
  const b = createGeometryBuilder();
  const rings = 6;
  const sectors = 28;
  for (let ir = 0; ir <= rings; ir++) {
    const v = ir / rings; // 0 = center, 1 = outer edge
    const r = 0.1 + v * 0.9;
    for (let is = 0; is <= sectors; is++) {
      const u = is / sectors;
      const ang = u * Math.PI * 2.0;
      b.pushVertex(Math.cos(ang) * r, 0.02, Math.sin(ang) * r, 0, 1, 0, u, v, 1.0 - v, 1.0, 0.0, 15);
    }
  }
  const row = sectors + 1;
  for (let ir = 0; ir < rings; ir++) {
    for (let is = 0; is < sectors; is++) {
      const a = ir * row + is;
      const c = a + 1;
      const d = a + row;
      const e = d + 1;
      b.pushQuad(a, c, e, d);
    }
  }
  return b;
}

function buildJungleTreeMesh() {
  const b = createGeometryBuilder();
  const trunkRings = 14;
  const trunkSectors = 12;
  for (let ir = 0; ir <= trunkRings; ir++) {
    const v = ir / trunkRings;
    const rootFlare = 1.0 + 1.8 * Math.pow(1.0 - v, 3.2);
    const rad = lerp(0.42, 0.13, v) * rootFlare;
    const bendX = Math.sin(v * Math.PI * 1.35) * 0.32;
    const bendZ = Math.cos(v * Math.PI * 1.1) * 0.24;
    const y = v * 1.0;
    for (let is = 0; is <= trunkSectors; is++) {
      const u = is / trunkSectors;
      const ang = u * Math.PI * 2.0;
      const buttress = 1.0 + 0.42 * Math.cos(ang * 5.0) * Math.pow(1.0 - v, 2.0);
      const px = bendX + Math.cos(ang) * rad * buttress;
      const pz = bendZ + Math.sin(ang) * rad * buttress;
      const sapVein = smoothstep(0.75, 0.97, Math.sin(ang * 3.0 + v * 10.0)) * 0.45;
      b.pushVertex(px, y, pz, Math.cos(ang), 0.15, Math.sin(ang), u * 2.0, v * 5.0, 0.42 + 0.48 * v, sapVein, v * 0.3, 5);
    }
  }
  const row = trunkSectors + 1;
  for (let ir = 0; ir < trunkRings; ir++) {
    for (let is = 0; is < trunkSectors; is++) {
      const a = ir * row + is;
      const c = a + 1;
      const d = a + row;
      const e = d + 1;
      b.pushQuad(a, c, e, d);
    }
  }

  const tiers = [
    { y: 0.84, r: 1.62, h: 0.18 },
    { y: 0.94, r: 1.28, h: 0.16 },
    { y: 1.02, r: 0.85, h: 0.12 }
  ];
  for (const tier of tiers) {
    const baseIdx = b.positions.length / 3;
    const cSectors = 16;
    b.pushVertex(0.14, tier.y + tier.h, 0.1, 0, 1, 0, 0.5, 0.5, 0.85, 0.18, 0.95, 6);
    for (let is = 0; is <= cSectors; is++) {
      const ang = (is / cSectors) * Math.PI * 2.0;
      const leafWave = 0.82 + 0.24 * Math.sin(ang * 6.0);
      const px = 0.14 + Math.cos(ang) * tier.r * leafWave;
      const pz = 0.1 + Math.sin(ang) * tier.r * leafWave;
      const py = tier.y - 0.04 * Math.sin(ang * 4.0);
      b.pushVertex(px, py, pz, Math.cos(ang) * 0.5, 0.85, Math.sin(ang) * 0.5, Math.cos(ang) * 0.5 + 0.5, Math.sin(ang) * 0.5 + 0.5, 0.45, 0.3, 1.0, 6);
    }
    for (let is = 0; is < cSectors; is++) {
      b.pushTri(baseIdx, baseIdx + 1 + is, baseIdx + 2 + is);
    }
  }

  // Hanging glowing willow tendrils
  const vineCount = 14;
  const vineSegs = 6;
  for (let vc = 0; vc < vineCount; vc++) {
    const ang = (vc / vineCount) * Math.PI * 2.0 + 0.25;
    const rRim = 1.05 + (vc % 3) * 0.22;
    const vx = 0.14 + Math.cos(ang) * rRim;
    const vz = 0.1 + Math.sin(ang) * rRim;
    const vLen = 0.22 + (vc % 4) * 0.06;
    const nx = -Math.sin(ang);
    const nz = Math.cos(ang);
    const startIdx = b.positions.length / 3;
    for (let s = 0; s <= vineSegs; s++) {
      const t = s / vineSegs;
      const w = lerp(0.02, 0.005, t);
      const py = 0.84 - t * vLen;
      const tipGlow = smoothstep(0.25, 1.0, t) * 1.2;
      b.pushVertex(vx - nx * w, py, vz - nz * w, nx, 0, nz, 0, t, 0.9, tipGlow, 0.85 + t * 0.75, 6);
      b.pushVertex(vx + nx * w, py, vz + nz * w, nx, 0, nz, 1, t, 0.9, tipGlow, 0.85 + t * 0.75, 6);
    }
    for (let s = 0; s < vineSegs; s++) {
      const a = startIdx + s * 2;
      b.pushQuad(a, a + 1, a + 3, a + 2);
    }
  }

  b.computeSmoothNormals();
  return b;
}

function buildFernRosetteMesh() {
  const b = createGeometryBuilder();
  const fronds = 10;
  const segs = 5;
  for (let f = 0; f < fronds; f++) {
    const ang = (f / fronds) * Math.PI * 2.0 + (f % 2) * 0.15;
    const cosA = Math.cos(ang), sinA = Math.sin(ang);
    const perpX = -sinA, perpZ = cosA;
    const len = 0.68 + (f % 3) * 0.14;
    const lift = 0.36 + (f % 2) * 0.1;
    const startIdx = b.positions.length / 3;
    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const r = t * len;
      const y = Math.sin(t * Math.PI * 0.72) * lift;
      const halfW = Math.sin(t * Math.PI) * 0.12 + 0.015;
      const tipGlow = smoothstep(0.45, 1.0, t) * 0.85;
      const px = cosA * r;
      const pz = sinA * r;
      b.pushVertex(px - perpX * halfW, y, pz - perpZ * halfW, 0, 1, 0, 0, t, 0.7 + 0.3 * t, tipGlow, t, 7);
      b.pushVertex(px + perpX * halfW, y, pz + perpZ * halfW, 0, 1, 0, 1, t, 0.7 + 0.3 * t, tipGlow, t, 7);
    }
    for (let s = 0; s < segs; s++) {
      const a = startIdx + s * 2;
      b.pushQuad(a, a + 1, a + 3, a + 2);
    }
  }
  b.computeSmoothNormals();
  return b;
}

function buildReedClusterMesh() {
  const b = createGeometryBuilder();
  const blades = 12;
  for (let i = 0; i < blades; i++) {
    const ang = (i / blades) * Math.PI * 2.0;
    const lean = 0.14 + (i % 3) * 0.06;
    const h = 0.55 + (i % 4) * 0.16;
    const bx = Math.cos(ang) * 0.12;
    const bz = Math.sin(ang) * 0.12;
    const dx = Math.cos(ang) * lean;
    const dz = Math.sin(ang) * lean;
    const px = -Math.sin(ang) * 0.025;
    const pz = Math.cos(ang) * 0.025;
    const baseIdx = b.positions.length / 3;
    b.pushVertex(bx - px, 0, bz - pz, 0, 1, 0, 0, 0, 0.6, 0.0, 0.0, 8);
    b.pushVertex(bx + px, 0, bz + pz, 0, 1, 0, 1, 0, 0.6, 0.0, 0.0, 8);
    b.pushVertex(bx + dx * 0.5 - px * 0.7, h * 0.5, bz + dz * 0.5 - pz * 0.7, 0, 1, 0, 0, 0.5, 0.85, 0.45, 0.5, 8);
    b.pushVertex(bx + dx * 0.5 + px * 0.7, h * 0.5, bz + dz * 0.5 + pz * 0.7, 0, 1, 0, 1, 0.5, 0.85, 0.45, 0.5, 8);
    b.pushVertex(bx + dx, h, bz + dz, 0, 1, 0, 0.5, 1.0, 1.0, 1.2, 1.0, 8);
    b.pushQuad(baseIdx, baseIdx + 1, baseIdx + 3, baseIdx + 2);
    b.pushTri(baseIdx + 2, baseIdx + 3, baseIdx + 4);
  }
  b.computeSmoothNormals();
  return b;
}

function buildGlowBudClusterMesh() {
  const b = createGeometryBuilder();
  const buds = [
    { x: 0.0, y: 0.0, z: 0.0, r: 0.14, h: 0.38 },
    { x: 0.18, y: 0.0, z: 0.08, r: 0.11, h: 0.28 },
    { x: -0.16, y: 0.0, z: 0.11, r: 0.10, h: 0.24 },
    { x: 0.05, y: 0.0, z: -0.17, r: 0.12, h: 0.31 }
  ];
  for (const bud of buds) {
    const rings = 7, sectors = 10;
    const baseIdx = b.positions.length / 3;
    for (let ir = 0; ir <= rings; ir++) {
      const v = ir / rings;
      const profile = Math.sin(v * Math.PI) * bud.r;
      const py = bud.y + v * bud.h;
      const glow = smoothstep(0.25, 0.95, v) * 1.45;
      for (let is = 0; is <= sectors; is++) {
        const u = is / sectors;
        const ang = u * Math.PI * 2.0;
        b.pushVertex(bud.x + Math.cos(ang) * profile, py, bud.z + Math.sin(ang) * profile, Math.cos(ang), 0.3, Math.sin(ang), u, v, 0.7 + 0.3 * v, glow, v, 9);
      }
    }
    const row = sectors + 1;
    for (let ir = 0; ir < rings; ir++) {
      for (let is = 0; is < sectors; is++) {
        const a = baseIdx + ir * row + is;
        const c = a + 1;
        const d = a + row;
        const e = d + 1;
        b.pushQuad(a, c, e, d);
      }
    }
  }
  b.computeSmoothNormals();
  return b;
}

function buildGoldenBlossomMesh() {
  const b = createGeometryBuilder();
  const petals = 10;
  for (let p = 0; p < petals; p++) {
    const ang = (p / petals) * Math.PI * 2.0;
    const tilt = 0.55 + (p % 2) * 0.25;
    const len = 0.52;
    const wid = 0.14;
    const cosA = Math.cos(ang), sinA = Math.sin(ang);
    const px = -sinA * wid, pz = cosA * wid;
    const tipX = cosA * len * Math.sin(tilt);
    const tipZ = sinA * len * Math.sin(tilt);
    const tipY = 0.16 + len * Math.cos(tilt);
    const baseIdx = b.positions.length / 3;
    b.pushVertex(0, 0.12, 0, 0, 1, 0, 0.5, 0.0, 0.7, 0.4, 0.0, 10);
    b.pushVertex(tipX * 0.55 - px, 0.15 + len * 0.55 * Math.cos(tilt), tipZ * 0.55 - pz, 0, 1, 0, 0, 0.5, 0.9, 1.1, 0.5, 10);
    b.pushVertex(tipX * 0.55 + px, 0.15 + len * 0.55 * Math.cos(tilt), tipZ * 0.55 + pz, 0, 1, 0, 1, 0.5, 0.9, 1.1, 0.5, 10);
    b.pushVertex(tipX, tipY, tipZ, 0, 1, 0, 0.5, 1.0, 1.0, 1.65, 1.0, 10);
    b.pushTri(baseIdx, baseIdx + 1, baseIdx + 2);
    b.pushTri(baseIdx + 1, baseIdx + 3, baseIdx + 2);
  }
  b.computeSmoothNormals();
  return b;
}

function buildGiantMushroomMesh() {
  const b = createGeometryBuilder();
  // Stalk
  const sRings = 8, sSecs = 10;
  for (let ir = 0; ir <= sRings; ir++) {
    const v = ir / sRings;
    const r = lerp(0.14, 0.08, v);
    const y = v * 0.72;
    for (let is = 0; is <= sSecs; is++) {
      const u = is / sSecs;
      const ang = u * Math.PI * 2.0;
      b.pushVertex(Math.cos(ang) * r, y, Math.sin(ang) * r, Math.cos(ang), 0.1, Math.sin(ang), u, v, 0.6 + 0.4 * v, 0.25, v * 0.4, 11);
    }
  }
  const sRow = sSecs + 1;
  for (let ir = 0; ir < sRings; ir++) {
    for (let is = 0; is < sSecs; is++) {
      const a = ir * sRow + is;
      const c = a + 1;
      const d = a + sRow;
      const e = d + 1;
      b.pushQuad(a, c, e, d);
    }
  }
  // Cap
  const cRings = 7, cSecs = 18;
  const baseIdx = b.positions.length / 3;
  for (let ir = 0; ir <= cRings; ir++) {
    const v = ir / cRings;
    const r = Math.sin(v * Math.PI * 0.88) * 0.62;
    const y = 0.72 + Math.cos(v * Math.PI * 0.5) * 0.24;
    for (let is = 0; is <= cSecs; is++) {
      const u = is / cSecs;
      const ang = u * Math.PI * 2.0;
      const rib = 1.0 + 0.08 * Math.sin(ang * 14.0);
      const glow = (0.55 + 0.65 * Math.sin(ang * 14.0)) * smoothstep(0.15, 0.85, v);
      b.pushVertex(Math.cos(ang) * r * rib, y, Math.sin(ang) * r * rib, Math.cos(ang) * 0.5, 0.85, Math.sin(ang) * 0.5, u, v, 0.85, glow, 0.8, 11);
    }
  }
  const cRow = cSecs + 1;
  for (let ir = 0; ir < cRings; ir++) {
    for (let is = 0; is < cSecs; is++) {
      const a = baseIdx + ir * cRow + is;
      const c = a + 1;
      const d = a + cRow;
      const e = d + 1;
      b.pushQuad(a, c, e, d);
    }
  }
  b.computeSmoothNormals();
  return b;
}

function buildCanopyJellyfishMesh() {
  const b = createGeometryBuilder();
  // Ribbed bell (top at y=0 down to rim y=-0.42)
  const rings = 8, secs = 22;
  for (let ir = 0; ir <= rings; ir++) {
    const v = ir / rings;
    const r = Math.sin(v * Math.PI * 0.65) * 1.15;
    const y = -v * 0.42;
    for (let is = 0; is <= secs; is++) {
      const u = is / secs;
      const ang = u * Math.PI * 2.0;
      const rib = 1.0 + 0.09 * Math.sin(ang * 16.0);
      const glow = 0.75 + 0.55 * Math.sin(ang * 16.0);
      b.pushVertex(Math.cos(ang) * r * rib, y, Math.sin(ang) * r * rib, Math.cos(ang) * 0.4, 0.9, Math.sin(ang) * 0.4, u, v, 0.9, glow, 1.0, 12);
    }
  }
  const row = secs + 1;
  for (let ir = 0; ir < rings; ir++) {
    for (let is = 0; is < secs; is++) {
      const a = ir * row + is;
      const c = a + 1;
      const d = a + row;
      const e = d + 1;
      b.pushQuad(a, c, e, d);
    }
  }
  // Trailing glowing tentacles
  const tenCount = 12, tenSegs = 8;
  for (let tc = 0; tc < tenCount; tc++) {
    const ang = (tc / tenCount) * Math.PI * 2.0;
    const rStart = 0.25 + (tc % 3) * 0.22;
    const tx = Math.cos(ang) * rStart;
    const tz = Math.sin(ang) * rStart;
    const tLen = 1.35 + (tc % 4) * 0.28;
    const nx = -Math.sin(ang), nz = Math.cos(ang);
    const startIdx = b.positions.length / 3;
    for (let s = 0; s <= tenSegs; s++) {
      const t = s / tenSegs;
      const w = lerp(0.024, 0.004, t);
      const py = -0.35 - t * tLen;
      const swayX = Math.sin(t * 5.0 + tc) * 0.14 * t;
      const glow = 1.25 * (1.0 - t * 0.45);
      b.pushVertex(tx + swayX - nx * w, py, tz - nz * w, nx, 0, nz, 0, t, 0.95, glow, 1.0, 12);
      b.pushVertex(tx + swayX + nx * w, py, tz + nz * w, nx, 0, nz, 1, t, 0.95, glow, 1.0, 12);
    }
    for (let s = 0; s < tenSegs; s++) {
      const a = startIdx + s * 2;
      b.pushQuad(a, a + 1, a + 3, a + 2);
    }
  }
  b.computeSmoothNormals();
  return b;
}

function buildLightShaftMesh() {
  const b = createGeometryBuilder();
  const segs = 16;
  const topR = 0.55;
  const botR = 2.4;
  const h = 16.0;
  for (let iy = 0; iy <= 1; iy++) {
    const v = iy;
    const y = (1.0 - v) * h;
    const r = lerp(topR, botR, v);
    for (let is = 0; is <= segs; is++) {
      const u = is / segs;
      const ang = u * Math.PI * 2.0;
      b.pushVertex(Math.cos(ang) * r, y, Math.sin(ang) * r, Math.cos(ang), 0.15, Math.sin(ang), u, v, 1.0, 1.0, 0.0, 20);
    }
  }
  const row = segs + 1;
  for (let is = 0; is < segs; is++) {
    b.pushQuad(is, is + 1, row + is + 1, row + is);
  }
  return b;
}
