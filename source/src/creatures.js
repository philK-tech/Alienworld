// creatures.js: Tiere, die während der Fahrt auftauchen
// Drei Arten, alle prozedural:
//   Gleiter (Material 21): Schwärme mit leuchtenden Schwingen, die über den Fluss segeln
//   Springfische (Material 22): springen kurz vor dem Boot aus dem Wasser
//   Wölfe (Material 23): dunkle Schemen im Nebeltal, laufen am Ufer und bleiben stehen, wenn das Boot kommt
// Jedes Auftauchen ist an eine Stelle der Strecke gebunden und wird über den Abstand des Boots ausgelöst.

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

// Wolf (Nebeltal): dunkler Schemen mit zottigem Fell und leuchtenden Augen. Schaut nach -z, Schulterhöhe ~0.8.
// Beine: extra.z = Seite der Schrittphase (+1/-1) mal Abstand von der Hüfte, für den Laufzyklus im Shader.
function buildWolfMesh() {
  const b = createGeometryBuilder();
  const shag = (t, a, base) => base * (1.0 + 0.16 * Math.abs(Math.sin(a * 7.0 + t * 23.0)) * Math.sin(a * 3.0 + t * 11.0));
  // Rumpf: vorne hoch und kräftig, hinten schmal
  addLathe(b, 16, 14, (t) => [0, 0.56 + 0.06 * Math.sin(t * Math.PI) + 0.08 * t, 0.55 - t * 1.05], (t, a) => {
    const r = 0.14 + 0.11 * Math.sin(Math.min(t * 1.2, 1.0) * Math.PI) + 0.07 * t;
    return [shag(t, a, r * 0.8), shag(t, a, r * 1.15)];
  }, 23, (t) => [0.6, 0.0, 0.0]);
  // Hals, Kopf und Schnauze
  addLathe(b, 8, 10, (t) => [0, 0.76 + t * 0.12, -0.48 - t * 0.28], (t, a) => [shag(t, a, 0.12 - t * 0.03), shag(t, a, 0.14 - t * 0.04)], 23, () => [0.7, 0.0, 0.0]);
  addLathe(b, 8, 10, (t) => [0, 0.87 - t * 0.07, -0.74 - t * 0.3], (t) => { const r = 0.085 * (1.0 - t * 0.6) + 0.01; return [r, r * 0.9]; }, 23, () => [0.8, 0.0, 0.0]);
  // Ohren
  for (const sx of [-1, 1]) {
    addLathe(b, 3, 4, (t) => [sx * (0.05 + t * 0.015), 0.95 + t * 0.1, -0.7 + t * 0.02], (t) => { const r = 0.035 * (1 - t) + 0.003; return [r, r * 0.5]; }, 23, () => [0.8, 0.0, 0.0]);
    // Augen
    addBox(b, [sx * 0.05, 0.9, -0.86], [0.03, 0.018, 0.02], 0, 0, 23, 3.0);
  }
  // Beine mit Phase für den Laufzyklus (diagonal gleich)
  [[-0.09, -0.38, 1], [0.09, -0.38, -1], [-0.09, 0.42, -1], [0.09, 0.42, 1]].forEach(([x, z, ph]) => {
    const back = z > 0;
    addLathe(b, 6, 7, (t) => [x * 1.3, 0.5 * (1.0 - t), z + (back ? Math.sin(t * Math.PI) * 0.08 : 0.0)],
      (t, a) => { const r = (back ? 0.085 : 0.07) * (1.0 - t * 0.5); return [shag(t, a, r), shag(t, a, r)]; }, 23, (t) => [0.5, 0.0, ph * (0.05 + t)]);
  });
  // buschiger Schwanz
  addLathe(b, 8, 8, (t) => [0, 0.68 - t * 0.3, 0.55 + t * 0.4], (t, a) => { const r = 0.06 + 0.04 * Math.sin(t * Math.PI); return [shag(t, a, r), shag(t, a, r)]; }, 23, () => [0.6, 0.0, 0.0]);
  return b;
}

const creatureMeshes = {
  glider: uploadStaticMesh(gl, buildGliderMesh()),
  fish: uploadStaticMesh(gl, buildFishMesh()),
  wolf: uploadStaticMesh(gl, buildWolfMesh())
};

// Vogelschwärme (tint.a = 0 bedeutet: keine Leuchtzeichnung, Farbe aus tint)
const BIRD_FLOCKS = [
  { z: -30, offX: 22, y: 20, r: 18, dir: 1, tint: [0.03, 0.03, 0.04, 0] },
  { z: -110, offX: -30, y: 26, r: 22, dir: -1, tint: [0.03, 0.03, 0.04, 0] },
  { z: -360, offX: -25, y: 24, r: 20, dir: 1, tint: [0.95, 0.95, 0.92, 0] },
  { z: -430, offX: 28, y: 30, r: 24, dir: -1, tint: [0.95, 0.95, 0.92, 0] }
];

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
const drawPool = Array.from({ length: 80 }, () => ({ mesh: null, model: Mat4.create(), tint: [1, 1, 1, 1], anim: [0, 0, 0, 0] }));
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
    d.tint[0] = tint[0]; d.tint[1] = tint[1]; d.tint[2] = tint[2]; d.tint[3] = tint.length > 3 ? tint[3] : 1;
    d.anim[2] = 0;
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

  // Vogelschwärme, die über einer Stelle kreisen: Krähen im Nebeltal, weiße Vögel bei den Himmelsinseln
  BIRD_FLOCKS.forEach((fl, fi) => {
    const d = aheadDist(camZ, fl.z);
    if (d > 170 || d < -60) return;
    const zc = camZ - d;
    const xc = riverCenterX(zc) + fl.offX;
    for (let i = 0; i < 9; i++) {
      const a = t * (0.25 + (i % 3) * 0.04) * fl.dir + i * 0.7 + fi;
      const r = fl.r * (0.7 + 0.3 * Math.sin(i * 1.7));
      const x = xc + Math.cos(a) * r, z = zc + Math.sin(a) * r;
      const y = fl.y + Math.sin(t * 0.7 + i * 1.3) * 1.5 + (i % 4) * 0.8;
      const g = take(creatureMeshes.glider, fl.tint);
      const yaw = Math.atan2(-Math.sin(a) * fl.dir, Math.cos(a) * fl.dir) + Math.PI;
      Mat4.compose(g.model, [x, y, z], yaw, 0.0, 0.35 * fl.dir, [0.33, 0.33, 0.33]);
      g.anim[0] = i * 1.9 + fi;
      g.anim[2] = 1.4;
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

  // Wolfsrudel im Nebeltal: läuft dem Boot am Ufer entgegen, bleibt in ~25 Einheiten stehen und schaut herüber
  EVENTS.wolves.forEach((ev, ei) => {
    const d = aheadDist(camZ, ev.z);
    if (d > 150 || d < -40) return;
    const zEv = camZ - d;
    const walk = smoothstep(22, 32, d);
    for (let i = 0; i < 3; i++) {
      const spot = wolfSpot(ev, i);
      const z = zEv + (spot.z - ev.z) - Math.max(d - 26 - i * 3, 0) * 0.45;
      const x = riverCenterX(z) + (spot.x - riverCenterX(spot.z));
      const y = terrainHeight(x, z) - 0.05;
      const g = take(creatureMeshes.wolf, [1.0, 0.7, 0.25]);
      // im Laufen zum Boot hin (+z), im Stehen zum Fluss gedreht
      const yawWalk = Math.PI, yawStand = ev.side * Math.PI * 0.5 + ev.side * 0.35 * (i - 1);
      const yaw = lerp(yawStand, yawWalk, walk);
      const s = 2.3 - i * 0.2;
      Mat4.compose(g.model, [x, y, z], yaw, 0, 0, [s, s, s]);
      g.anim[0] = ei * 2.0 + i * 1.3;
      g.anim[1] = walk;
      if (i === 1 && d < 55 && d > -5) pois.push({ x, y: y + 1.0, z, w: 1.3 });
    }
  });
}
