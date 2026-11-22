// creatures.js: Tiere, die während der Fahrt auftauchen
// Drei Arten, alle prozedural:
//   Gleiter (Material 21): Schwärme mit leuchtenden Schwingen, die über den Fluss segeln
//   Springfische (Material 22): springen kurz vor dem Boot aus dem Wasser
//   Langhälse (Material 23): große Grasende am Ufer, heben den Kopf, wenn das Boot kommt
// Jedes Auftauchen ist an eine Stelle der Strecke gebunden und wird über den Abstand des Boots ausgelöst.

// Rotationskörper entlang einer Mittellinie: center(t) und radius(t) für t = 0..1
function addLathe(b, rings, secs, center, radius, matId, extra) {
  const base = b.positions.length / 3;
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const c = center(t);
    const c2 = center(Math.min(t + 0.01, 1.0)), c1 = center(Math.max(t - 0.01, 0.0));
    let tx = c2[0] - c1[0], ty = c2[1] - c1[1], tz = c2[2] - c1[2];
    const tl = Math.hypot(tx, ty, tz) || 1;
    tx /= tl; ty /= tl; tz /= tl;
    // zwei Achsen senkrecht zur Mittellinie
    let ax = Math.abs(ty) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    let ux = ty * ax[2] - tz * ax[1], uy = tz * ax[0] - tx * ax[2], uz = tx * ax[1] - ty * ax[0];
    const ul = Math.hypot(ux, uy, uz) || 1;
    ux /= ul; uy /= ul; uz /= ul;
    const vx = ty * uz - tz * uy, vy = tz * ux - tx * uz, vz = tx * uy - ty * ux;
    for (let j = 0; j <= secs; j++) {
      const a = (j / secs) * Math.PI * 2.0;
      const [rx, ry] = radius(t, a);
      const nx = ux * Math.cos(a) + vx * Math.sin(a);
      const ny = uy * Math.cos(a) + vy * Math.sin(a);
      const nz = uz * Math.cos(a) + vz * Math.sin(a);
      const r = Math.cos(a) * Math.cos(a) * rx + Math.sin(a) * Math.sin(a) * ry;
      const e = extra(t, a);
      b.pushVertex(c[0] + nx * r, c[1] + ny * r, c[2] + nz * r, nx, ny, nz, j / secs, t, e[0], e[1], e[2], matId);
    }
  }
  const row = secs + 1;
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < secs; j++) {
      const a = base + i * row + j;
      b.pushQuad(a, a + row, a + row + 1, a + 1);
    }
  }
}

function buildGliderMesh() {
  const b = createGeometryBuilder();
  // schlanker Körper, Kopf bei -z
  addLathe(b, 14, 8, (t) => [0, 0, -0.6 + t * 1.7], (t) => {
    const r = 0.13 * Math.pow(Math.sin(Math.min(t * 1.4, 1.0) * Math.PI), 0.7) + 0.01;
    return [r, r * 0.7];
  }, 21, (t) => [0.8, t > 0.6 ? 0.8 : 0.2, 0.0]);
  // zwei Schwingen, nach hinten gepfeilt; extra.z = Abstand vom Körper (für den Flügelschlag)
  for (const s of [-1, 1]) {
    const base = b.positions.length / 3;
    const nI = 12, nJ = 5;
    for (let i = 0; i <= nI; i++) {
      const u = i / nI;
      const chord = 0.95 * (1.0 - Math.pow(u, 1.4) * 0.8);
      const lead = -0.35 + u * 0.55 + Math.sin(u * Math.PI) * 0.1;
      for (let j = 0; j <= nJ; j++) {
        const v = j / nJ;
        const x = s * (0.08 + u * 1.7);
        const y = -0.08 * u * u + 0.03 * Math.sin(v * Math.PI);
        const z = lead + v * chord;
        b.pushVertex(x, y, z, 0, 1, 0, u, v, 0.9, 1.0, u, 21);
      }
    }
    for (let i = 0; i < nI; i++) {
      for (let j = 0; j < nJ; j++) {
        const a = base + i * (nJ + 1) + j;
        b.pushQuad(a, a + 1, a + nJ + 2, a + nJ + 1);
      }
    }
  }
  b.computeSmoothNormals();
  return b;
}

function buildFishMesh() {
  const b = createGeometryBuilder();
  addLathe(b, 16, 10, (t) => [0, 0, -0.5 + t * 1.0], (t) => {
    const r = 0.16 * Math.pow(Math.sin(Math.min(t * 1.08, 1.0) * Math.PI), 0.65) + 0.012;
    return [r * 0.7, r];
  }, 22, (t) => [0.9, 0.0, t]);
  // Schwanzflosse und Rückenflosse
  const fin = (pts) => {
    const base = b.positions.length / 3;
    for (const p of pts) b.pushVertex(p[0], p[1], p[2], 1, 0, 0, p[3], p[4], 0.9, 1.0, p[5], 22);
    b.pushTri(base, base + 1, base + 2);
    if (pts.length === 4) b.pushTri(base, base + 2, base + 3);
  };
  fin([[0, 0, 0.45, 0.5, 0.0, 0.95], [0, 0.26, 0.78, 0.0, 1.0, 1.3], [0, 0.0, 0.66, 0.5, 0.8, 1.2], [0, -0.26, 0.78, 1.0, 1.0, 1.3]]);
  fin([[0, 0.14, -0.15, 0.5, 0.0, 0.4], [0, 0.32, 0.12, 0.5, 1.0, 0.6], [0, 0.13, 0.2, 0.5, 0.5, 0.7]]);
  b.computeSmoothNormals();
  return b;
}

// Langhals: Kopf zeigt nach -z. Hals und Kopf haben extra.z = 1 und werden im Shader um das Halsgelenk gedreht.
const NECK_PIVOT = [0, 2.65, -1.45];
function buildLongneckMesh() {
  const b = createGeometryBuilder();
  const body = (t, a) => [0.8 * Math.sin(Math.PI * t) + 0.05, 0.85 * Math.sin(Math.PI * t) + 0.05];
  addLathe(b, 18, 16, (t) => [0, 2.35 + Math.sin(t * Math.PI) * 0.1, 1.9 - t * 3.8], body, 23, (t, a) => {
    const back = Math.max(0.0, -Math.sin(a));
    return [0.75, back > 0.7 ? 1.0 : 0.0, 0.0];
  });
  // vier Beine mit leichtem Knick
  for (const [lx, lz] of [[-0.45, 1.15], [0.45, 1.15], [-0.42, -1.05], [0.42, -1.05]]) {
    addLathe(b, 8, 8, (t) => [lx * (1.0 + t * 0.12), 2.0 * (1.0 - t), lz + Math.sin(t * Math.PI) * 0.18],
      (t) => { const r = lerp(0.17, 0.08, t); return [r, r]; }, 23, (t) => [0.4 + 0.6 * (1.0 - t), t > 0.85 ? 1.0 : 0.0, 0.0]);
  }
  // Schwanz
  addLathe(b, 8, 6, (t) => [0, 2.45 - t * 1.1, 1.85 + t * 1.0 + t * t * 0.3], (t) => { const r = lerp(0.18, 0.03, t); return [r, r]; },
    23, (t) => [0.7, t > 0.5 ? 0.6 : 0.0, 0.0]);
  // Hals bis zum Kopf (dreht sich mit)
  const [px, py, pz] = NECK_PIVOT;
  addLathe(b, 12, 10, (t) => [px, py + t * 2.0 + Math.sin(t * Math.PI) * 0.15, pz - t * 1.6],
    (t) => { const r = lerp(0.36, 0.2, t); return [r, r]; }, 23, (t, a) => [0.8, Math.sin(a) > 0.75 ? 0.8 : 0.0, 1.0]);
  // Kopf
  addLathe(b, 10, 10, (t) => [px, py + 2.05 - t * 0.25, pz - 1.55 - t * 0.85],
    (t) => { const r = 0.27 * Math.pow(Math.sin(Math.min(t * 1.15, 1.0) * Math.PI), 0.6) + 0.04; return [r * 0.85, r]; },
    23, (t, a) => [0.85, (t > 0.25 && t < 0.35 && Math.abs(Math.cos(a)) > 0.85) ? 3.0 : 0.0, 1.0]);
  // zwei leuchtende Fühler
  for (const sx of [-1, 1]) {
    addLathe(b, 6, 5, (t) => [px + sx * (0.1 + t * 0.25), py + 2.15 + t * 0.7, pz - 1.75 + t * 0.5],
      (t) => { const r = lerp(0.05, 0.015, t); return [r, r]; }, 23, (t) => [0.9, 0.5 + t * 2.5, 1.0]);
  }
  b.computeSmoothNormals();
  return b;
}

const creatureMeshes = {
  glider: uploadStaticMesh(gl, buildGliderMesh()),
  fish: uploadStaticMesh(gl, buildFishMesh()),
  longneck: uploadStaticMesh(gl, buildLongneckMesh())
};

// Abstand entlang der Strecke vom Boot zum Ereignis, positiv = liegt noch voraus (berücksichtigt die Schleife)
function aheadDist(camZ, z) {
  let d = (camZ - z) % LOOP_LENGTH;
  if (d < 0) d += LOOP_LENGTH;
  if (d > LOOP_LENGTH * 0.5) d -= LOOP_LENGTH;
  return d;
}

// Für jedes Bild: Positionen der sichtbaren Tiere und Blickziele (POIs) für die Kamera
const creatureDraws = [];   // { mesh, model, tint, anim }
const pois = [];            // { x, y, z, w }
const drawPool = Array.from({ length: 40 }, () => ({ mesh: null, model: Mat4.create(), tint: [1, 1, 1, 1], anim: [0, 0, 0, 0] }));
const ripplePool = Array.from({ length: 12 }, () => ({ x: 0, z: 0, a: 0 }));
const rippleDraws = [];

function updateCreatures(camZ, t) {
  creatureDraws.length = 0;
  pois.length = 0;
  rippleDraws.length = 0;
  let k = 0;
  const take = (mesh, tint) => {
    const d = drawPool[k++];
    d.mesh = mesh;
    d.tint[0] = tint[0]; d.tint[1] = tint[1]; d.tint[2] = tint[2]; d.tint[3] = 1;
    creatureDraws.push(d);
    return d;
  };

  // Gleiterschwärme: queren den Fluss, während das Boot von 90 auf 0 Einheiten herankommt
  EVENTS.flocks.forEach((ev, ei) => {
    const d = aheadDist(camZ, ev.z);
    if (d > 95 || d < -15) return;
    const p = (95 - d) / 110;
    const zEv = camZ - d;
    const cx = riverCenterX(zEv);
    for (let i = 0; i < 7; i++) {
      const lag = i * 0.035;
      const q = p - lag;
      const x = cx + ev.side * lerp(-55, 55, q) + Math.sin(i * 2.3) * 3.0;
      const y = 9.0 + Math.sin(q * Math.PI) * 4.0 + Math.cos(i * 1.7) * 1.8 + Math.sin(t * 0.8 + i) * 0.4;
      const z = zEv - 6.0 + Math.sin(i * 4.1) * 5.0 + q * 10.0;
      const g = take(creatureMeshes.glider, i % 3 === 0 ? [0.75, 0.3, 1.0] : [0.15, 0.8, 1.0]);
      const yaw = ev.side > 0 ? -Math.PI * 0.5 + 0.25 : Math.PI * 0.5 - 0.25;
      const bank = Math.sin(t * 0.6 + i) * 0.15;
      const s = 1.5 + (i % 3) * 0.25;
      Mat4.compose(g.model, [x, y, z], yaw, Math.sin(t * 0.9 + i) * 0.05, bank, [s, s, s]);
      g.anim[0] = i * 1.3 + ei;
      g.anim[1] = 0;
      if (i === 3) pois.push({ x, y, z, w: 1.6 });
    }
  });

  // Springfische: drei Fische springen nacheinander quer über den Fluss
  EVENTS.fish.forEach((zf, ei) => {
    const d = aheadDist(camZ, zf);
    if (d > 26 || d < 2) return;
    const zEv = camZ - d;
    const cx = riverCenterX(zEv);
    const side = ei % 2 === 0 ? 1 : -1;
    for (let i = 0; i < 3; i++) {
      const p = (26 - d) / 9 - i * 0.55;
      const x0 = cx + side * (3.2 - i * 0.6), x1 = cx - side * (0.2 + i * 0.5);
      if (p > -0.05 && p < 0.25 || p > 0.9 && p < 1.4) {
        // Ringwellen beim Auftauchen und Eintauchen
        const r = ripplePool[rippleDraws.length % ripplePool.length];
        r.x = p < 0.5 ? x0 : x1;
        r.z = zEv - i * 1.5;
        r.a = p < 0.5 ? 1.0 - Math.abs(p - 0.1) * 4.0 : 1.0 - (p - 0.9) * 2.0;
        rippleDraws.push(r);
      }
      if (p < 0 || p > 1) continue;
      const x = lerp(x0, x1, p);
      const y = -0.25 + Math.sin(p * Math.PI) * (2.0 + i * 0.3);
      const z = zEv - i * 1.5;
      const f = take(creatureMeshes.fish, i === 1 ? [1.0, 0.55, 0.2] : [0.15, 0.85, 1.0]);
      const yaw = side > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
      const pitch = Math.cos(p * Math.PI) * 0.9;
      Mat4.compose(f.model, [x, y, z], yaw, pitch, 0, [1.0, 1.0, 1.0]);
      f.anim[0] = ei * 3.0 + i;
      if (i === 0) pois.push({ x, y, z, w: 1.4 });
    }
  });

  // Langhälse am Ufer: trinken, heben den Kopf, wenn das Boot näher als ~30 Einheiten ist
  EVENTS.longnecks.forEach((ev, ei) => {
    const d = aheadDist(camZ, ev.z);
    if (d > 160 || d < -40) return;
    const zEv = camZ - d;
    const lift = smoothstep(32, 16, d) * (1.0 - smoothstep(-5, -25, d));
    for (let i = 0; i < 2; i++) {
      const s = i === 0 ? 1.25 : 0.7;
      const spot = longneckSpot(ev, i);
      const z = zEv + (spot.z - ev.z);
      const x = spot.x;
      const y = spot.y;
      const g = take(creatureMeshes.longneck, i === 0 ? [0.15, 0.75, 1.0] : [0.55, 0.35, 1.0]);
      const yaw = ev.side * Math.PI * 0.5 + (i === 0 ? 0.15 : -0.3) * ev.side;
      Mat4.compose(g.model, [x, y, z], yaw, 0, 0, [s, s, s]);
      const sip = Math.sin(t * 0.5 + i * 2.0) * 0.12;
      g.anim[0] = ei + i;
      g.anim[1] = lerp(-1.65 + sip, -0.15 + Math.sin(t * 0.7 + i) * 0.08, Math.max(0, lift - i * 0.25));
      if (i === 0 && d < 60 && d > -10) pois.push({ x, y: y + 3.5 * s, z, w: 1.3 });
    }
  });
}
