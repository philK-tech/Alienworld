// creatures.js: Tiere und ihre Szenen (Ablauf nach dem Fahrtskript)
// Zone 1: Wolf tritt auf eine Lichtung und heult; Fledermausschwarm stürzt vom Schloss auf das Boot zu
// Zone 2: Leuchtfisch springt vor dem Bug; Tentakel peitschen links und rechts aus dem Wasser
// Zone 3: Herde zieht in der Ferne über die Ebene; schwarze Mantas gleiten an den Schwebefelsen vorbei
// Jede Szene ist an eine Stelle der Strecke gebunden (SCENES in world.js) und läuft dann nach Zeit ab.

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
  // Hals, Kopf, Ohren und Augen haben Material 24: sie drehen sich im Shader um das Nackengelenk (Heulen)
  addLathe(b, 8, 10, (t) => [0, 0.72 + t * 0.12, -0.46 - t * 0.28], (t, a) => [shag(t, a, 0.13 - t * 0.03), shag(t, a, 0.15 - t * 0.04)], 24, () => [0.7, 0.0, 0.0]);
  addLathe(b, 8, 10, (t) => [0, 0.83 - t * 0.07, -0.72 - t * 0.3], (t) => { const r = 0.09 * (1.0 - t * 0.6) + 0.01; return [r, r * 0.9]; }, 24, () => [0.8, 0.0, 0.0]);
  // Ohren
  for (const sx of [-1, 1]) {
    addLathe(b, 3, 4, (t) => [sx * (0.05 + t * 0.015), 0.91 + t * 0.1, -0.68 + t * 0.02], (t) => { const r = 0.035 * (1 - t) + 0.003; return [r, r * 0.5]; }, 24, () => [0.8, 0.0, 0.0]);
    // Augen
    addBox(b, [sx * 0.05, 0.86, -0.84], [0.04, 0.024, 0.02], 0, 0, 24, 3.0);
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

// Fledermaus: kleiner Körper, zwei gezackte Hautflügel (Material 21, extra.z = Spannweite für den Flügelschlag)
function buildBatMesh() {
  const b = createGeometryBuilder();
  addLathe(b, 6, 6, (t) => [0, 0, -0.18 + t * 0.36], (t) => { const r = 0.06 * Math.sin(t * Math.PI) + 0.01; return [r, r]; }, 21, () => [0.8, 0.0, 0.0]);
  for (const s of [-1, 1]) {
    const pts = [[0.04, 0, -0.1], [0.35, 0.04, -0.12], [0.55, 0.0, 0.02], [0.42, 0, 0.12], [0.3, 0, 0.06], [0.2, 0, 0.14], [0.04, 0, 0.1]];
    const base = b.positions.length / 3;
    pts.forEach(([x, y, z]) => b.pushVertex(s * x, y, z, 0, 1, 0, x, z + 0.5, 0.8, 0.0, x / 0.55, 21));
    for (let k = 1; k < pts.length - 1; k++) b.pushTri(base, base + k, base + k + 1);
  }
  b.computeSmoothNormals();
  return b;
}

// Manta: flacher, rautenförmiger Körper mit verdickter Mitte und langem Peitschenschwanz. Spannweite 2.
function buildMantaMesh() {
  const b = createGeometryBuilder();
  const nI = 14, nJ = 6;
  for (const s of [-1, 1]) {
    const base = b.positions.length / 3;
    for (let i = 0; i <= nI; i++) {
      const u = i / nI;
      const lead = -0.65 + u * 0.62, trail = 0.38 - u * 0.36;
      for (let j = 0; j <= nJ; j++) {
        const v = j / nJ;
        const z = lerp(lead, trail, v);
        const thick = 0.09 * (1.0 - u) * Math.sin(v * Math.PI);
        b.pushVertex(s * u, thick - u * u * 0.05, z, 0, 1, 0, u, v, 0.9, 0.0, u, 21);
      }
    }
    for (let i = 0; i < nI; i++) for (let j = 0; j < nJ; j++) {
      const a = base + i * (nJ + 1) + j;
      if (s > 0) b.pushQuad(a, a + 1, a + nJ + 2, a + nJ + 1); else b.pushQuad(a, a + nJ + 1, a + nJ + 2, a + 1);
    }
  }
  // Kopflappen und Schwanz
  for (const s of [-1, 1]) addLathe(b, 3, 5, (t) => [s * 0.1, 0.0, -0.62 - t * 0.12], (t) => { const r = 0.03 * (1 - t) + 0.005; return [r, r]; }, 21, () => [0.8, 0.0, 0.0]);
  addLathe(b, 12, 5, (t) => [0, -0.02 * t, 0.35 + t * 1.6], (t) => { const r = 0.035 * (1.0 - t) + 0.003; return [r, r]; }, 21, () => [0.8, 0.0, 0.0]);
  b.computeSmoothNormals();
  return b;
}

// Herdentier: Rumpf, langer Hals, kleiner Kopf mit Hörnern, vier dünne Beine (Laufzyklus wie beim Wolf). Schaut nach -z.
function buildHerdAnimalMesh() {
  const b = createGeometryBuilder();
  addLathe(b, 10, 10, (t) => [0, 0.95 + 0.05 * Math.sin(t * Math.PI), 0.5 - t * 1.0], (t) => { const r = 0.16 + 0.1 * Math.sin(t * Math.PI); return [r * 0.85, r]; }, 23, () => [0.7, 0.0, 0.0]);
  addLathe(b, 6, 8, (t) => [0, 1.0 + t * 0.45, -0.45 - t * 0.25], (t) => { const r = 0.1 - t * 0.04; return [r, r]; }, 23, () => [0.7, 0.0, 0.0]);
  addLathe(b, 6, 8, (t) => [0, 1.45 - t * 0.06, -0.7 - t * 0.24], (t) => { const r = 0.07 * (1.0 - t * 0.5); return [r, r]; }, 23, () => [0.8, 0.0, 0.0]);
  for (const s of [-1, 1]) addLathe(b, 5, 4, (t) => [s * (0.04 + t * 0.1), 1.5 + t * 0.15, -0.72 + t * 0.12], (t) => { const r = 0.02 * (1 - t) + 0.003; return [r, r]; }, 23, () => [0.8, 0.0, 0.0]);
  [[-0.1, -0.35, 1], [0.1, -0.35, -1], [-0.1, 0.38, -1], [0.1, 0.38, 1]].forEach(([x, z, ph]) => {
    addLathe(b, 6, 6, (t) => [x, 0.9 * (1.0 - t), z], (t) => { const r = 0.045 * (1.0 - t * 0.4); return [r, r]; }, 23, (t) => [0.5, 0.0, ph * (0.05 + t)]);
  });
  addLathe(b, 4, 5, (t) => [0, 1.0 - t * 0.35, 0.52 + t * 0.12], (t) => { const r = 0.03 * (1 - t) + 0.005; return [r, r]; }, 23, () => [0.6, 0.0, 0.0]);
  return b;
}

const creatureMeshes = {
  glider: uploadStaticMesh(gl, buildGliderMesh()),
  fish: uploadStaticMesh(gl, buildFishMesh()),
  wolf: uploadStaticMesh(gl, buildWolfMesh()),
  bat: uploadStaticMesh(gl, buildBatMesh()),
  manta: uploadStaticMesh(gl, buildMantaMesh()),
  herd: uploadStaticMesh(gl, buildHerdAnimalMesh()),
  tentacle: uploadStaticMesh(gl, buildWhipTentacleMesh())
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
const drawPool = Array.from({ length: 160 }, () => ({ mesh: null, model: Mat4.create(), tint: [1, 1, 1, 1], anim: [0, 0, 0, 0] }));
const ripplePool = Array.from({ length: 16 }, () => ({ x: 0, z: 0, a: 0 }));
const rippleDraws = [];

// Blickziel der laufenden Szene (die Kamera richtet sich fest darauf)
const sceneFocus = [0, 0, 0];
let sceneFocusOn = false;

// weicher Verlauf 0..1 zwischen den Zeiten t0 und t1
const ease = (t, t0, t1) => smoothstep(t0, t1, t);
const bez3 = (p0, p1, p2, p3, u) => { const v = 1 - u; return v * v * v * p0 + 3 * v * v * u * p1 + 3 * v * u * u * p2 + u * u * u * p3; };

function updateCreatures(camZ, t, sceneIdx, sceneT, cam) {
  creatureDraws.length = 0;
  pois.length = 0;
  rippleDraws.length = 0;
  sceneFocusOn = false;
  let k = 0;
  const take = (mesh, tint) => {
    if (k >= drawPool.length) return null;
    const d = drawPool[k++];
    d.mesh = mesh;
    d.tint[0] = tint[0]; d.tint[1] = tint[1]; d.tint[2] = tint[2]; d.tint[3] = tint.length > 3 ? tint[3] : 1;
    d.anim[0] = 0; d.anim[1] = 0; d.anim[2] = 0; d.anim[3] = 0;
    creatureDraws.push(d);
    return d;
  };
  const ripple = (x, z, a) => {
    if (a <= 0) return;
    const r = ripplePool[rippleDraws.length % ripplePool.length];
    r.x = x; r.z = z; r.a = Math.min(a, 1);
    rippleDraws.push(r);
  };
  const focus = (x, y, z) => { sceneFocus[0] = x; sceneFocus[1] = y; sceneFocus[2] = z; sceneFocusOn = true; };

  SCENES.forEach((sc, si) => {
    const d = aheadDist(camZ, sc.z);
    if (d > 200 || d < -80) return;
    const zOff = (camZ - d) - sc.z; // Versatz, falls die Szene in einer anderen Runde der Schleife liegt
    const active = si === sceneIdx;
    if (!active && sc.type !== "wolf") return; // nur der Wolf ist auch vorher (versteckt) und nachher zu sehen
    const st = active ? sceneT : d > 0 ? 0 : sc.dur;

    if (sc.type === "wolf") {
      // tritt aus dem Nebel auf die Lichtung, fixiert das Boot, heult, zieht sich wieder zurück
      if (!active && d <= 0) return;
      const spot = wolfSpot(sc), den = wolfDen(sc);
      const outT = ease(st, 0.5, 3.0), backT = ease(st, 8.0, 10.0);
      const f = outT * (1.0 - backT);
      const x = lerp(den.x, spot.x, f), z = lerp(den.z, spot.z, f) + zOff;
      const y = terrainHeight(x, z) - 0.05;
      const g = take(creatureMeshes.wolf, [1.0, 0.65, 0.2]);
      const yawOut = Math.atan2(-(spot.x - den.x), -(spot.z - den.z));
      const toBoat = Math.atan2(-(cam[0] - x), -(cam[2] - z));
      let yaw = yawOut;
      if (st > 2.6) yaw = lerp(yawOut, toBoat, ease(st, 2.6, 3.6));
      if (st > 7.6) yaw = lerp(toBoat, yawOut + Math.PI, ease(st, 7.6, 8.3));
      Mat4.compose(g.model, [x, y, z], yaw, 0, 0, [2.4, 2.4, 2.4]);
      g.anim[0] = 1.0;
      g.anim[1] = (st > 0.5 && st < 3.0) || (st > 8.0 && st < 10.0) ? 1.0 : 0.0;
      g.anim[3] = -0.15 + 1.0 * (ease(st, 4.4, 5.2) - ease(st, 6.8, 7.5));
      if (active && st > 4.6 && !sc.howled) { sc.howled = true; if (typeof playHowl === "function") playHowl(); }
      if (!active) sc.howled = false;
      if (active) focus(x, y + 1.4, z);
    } else if (sc.type === "castle") {
      // das Schloss tritt aus dem Nebel; dann stürzt ein Fledermausschwarm von den Zinnen auf das Boot zu
      const top = [CASTLE.x, CASTLE.top + 8.0, CASTLE.z + zOff];
      const N = 90;
      let lead = null;
      for (let i = 0; i < N; i++) {
        const h1 = hash2(i, 300.0), h2 = hash2(i, 301.0), h3 = hash2(i, 302.0);
        const q = clamp01((st - 3.5 - h1 * 2.5) / 4.2);
        if (q <= 0 || q >= 1) continue;
        // Bahn: vom Turm aufsteigen, auf das Boot zu, kurz davor in Ströme aufteilen und vorbei
        const split = [(h2 - 0.5) * 2.0, h3 > 0.7 ? 1.0 : 0.0];
        const P0 = [top[0] + (h2 - 0.5) * 8, top[1] + h3 * 6, top[2] + (h1 - 0.5) * 8];
        const P1 = [lerp(top[0], cam[0], 0.3) + (h3 - 0.5) * 14, top[1] + 10, lerp(top[2], cam[2], 0.3)];
        const P2 = [cam[0] + split[0] * 6 + (h1 - 0.5) * 3, cam[1] + 2.5 + split[1] * 4 + h2 * 2, cam[2] - 10];
        const P3 = [cam[0] + split[0] * 14, cam[1] + 3 + split[1] * 6, cam[2] + 25];
        const x = bez3(P0[0], P1[0], P2[0], P3[0], q), y = bez3(P0[1], P1[1], P2[1], P3[1], q) + Math.sin(t * 9 + i) * 0.3;
        const z = bez3(P0[2], P1[2], P2[2], P3[2], q) + Math.cos(t * 7 + i) * 0.3;
        const q2 = Math.min(q + 0.02, 1);
        const vx = bez3(P0[0], P1[0], P2[0], P3[0], q2) - x, vz = bez3(P0[2], P1[2], P2[2], P3[2], q2) - z;
        const g = take(creatureMeshes.bat, [0.02, 0.02, 0.025, 0]);
        if (!g) break;
        const s = 0.9 + h1 * 0.6;
        Mat4.compose(g.model, [x, y, z], Math.atan2(-vx, -vz), 0, Math.sin(t * 5 + i) * 0.4, [s, s, s]);
        g.anim[0] = i * 1.7;
        g.anim[2] = 5.0;
        if (i === 7) lead = [x, y, z];
      }
      // erst das Schloss im Blick halten, dann dem Schwarm entgegensehen
      const castleLook = [CASTLE.x, CASTLE.top - 4.0, CASTLE.z + zOff];
      if (lead && st > 6.0) {
        const w = ease(st, 6.0, 7.5);
        focus(lerp(castleLook[0], lead[0], w), lerp(castleLook[1], lead[1], w), lerp(castleLook[2], lead[2], w));
      } else focus(castleLook[0], castleLook[1], castleLook[2]);
    } else if (sc.type === "fish") {
      // ein Leuchtfisch steigt vor dem Bug auf, springt im Bogen über die Fahrspur und taucht wieder ein
      const zJ = cam[2] - 9.0, cx = riverCenterX(zJ);
      const t0 = 1.4, t1 = 3.8, xa = sc.side * 4.5, xb = -sc.side * 3.5;
      ripple(cx + xa, zJ, st > t0 - 1.0 && st < t0 + 0.5 ? 1.0 - Math.abs(st - t0 + 0.3) * 1.3 : 0);
      ripple(cx + xb, zJ, st > t1 - 0.1 && st < t1 + 1.5 ? 1.0 - (st - t1) * 0.65 : 0);
      if (st > t0 && st < t1) {
        const p = (st - t0) / (t1 - t0);
        const x = cx + lerp(xa, xb, p), y = -0.4 + Math.sin(p * Math.PI) * 3.6;
        const f = take(creatureMeshes.fish, [0.2, 0.9, 1.0]);
        const dir = Math.sign(xb - xa);
        Mat4.compose(f.model, [x, y, zJ], dir > 0 ? -Math.PI * 0.5 : Math.PI * 0.5, Math.cos(p * Math.PI) * 0.9, 0, [2.4, 2.4, 2.4]);
        f.anim[0] = 3.0;
        focus(x, Math.max(y, 0.4), zJ);
      } else focus(cx + (st < t0 ? xa : xb) * 0.6, 0.3, zJ);
    } else if (sc.type === "tentacles") {
      // Tentakel schießen links und rechts der Fahrspur aus dem Wasser, peitschen und tauchen wieder ab
      const spots = [[-1, -2.0, 0.0], [1, -5.0, 0.5], [-1, -9.0, 1.0], [1, -12.0, 1.4], [-1, -15.0, 1.9]];
      let fx = 0, fy = 0, fz = 0, n = 0;
      spots.forEach(([side, dz, delay], i) => {
        const z = sc.z + dz + zOff, cx = riverCenterX(z);
        const x = cx + side * (3.8 + hash2(i, 310.0) * 1.2);
        const up = ease(st, 0.6 + delay, 1.6 + delay), down = ease(st, 7.0 + delay * 0.5, 8.2 + delay * 0.5);
        const h = 7.0 + hash2(i, 311.0) * 3.0;
        const lift = up * (1.0 - down);
        ripple(x, z, (st > 0.3 + delay && st < 2.5 + delay ? 1.0 : 0) + (st > 7.0 + delay * 0.5 && st < 9.5 + delay * 0.5 ? 0.8 : 0));
        if (lift <= 0.001) return;
        const g = take(creatureMeshes.tentacle, side > 0 ? [0.75, 0.28, 1.0] : [0.1, 0.85, 1.0]);
        Mat4.compose(g.model, [x, -h * (1.0 - lift) - 0.3, z], side > 0 ? Math.PI : 0, 0, -side * 0.15 * lift, [h, h, h]);
        g.anim[0] = i * 1.9;
        g.anim[1] = 0.6 + 0.6 * ease(st, 2.0 + delay, 3.0 + delay);
        fx += x; fy += h * lift * 0.6; fz += z; n++;
      });
      if (n) focus(fx / n, fy / n, fz / n); else focus(riverCenterX(sc.z + zOff), 2.0, sc.z - 6 + zOff);
    } else if (sc.type === "herd") {
      // eine Herde zieht in der Ferne schräg über die Ebene
      let cxs = 0, cys = 0, czs = 0, n = 0;
      const p = clamp01(st / sc.dur);
      for (let i = 0; i < 14; i++) {
        const ox = (hash2(i, 320.0) - 0.5) * 16, oz = (hash2(i, 321.0) - 0.5) * 12;
        const x0 = riverCenterX(sc.z) + sc.side * 130, x1 = riverCenterX(sc.z) + sc.side * 55;
        const z0 = sc.z - 70, z1 = sc.z + 10;
        const x = lerp(x0, x1, p) + ox, z = lerp(z0, z1, p) + oz + zOff;
        const y = terrainHeight(x, z) - 0.05;
        const g = take(creatureMeshes.herd, [0.32, 0.22, 0.14, 0]);
        if (!g) break;
        const s = 2.0 + hash2(i, 322.0) * 0.5;
        Mat4.compose(g.model, [x, y + Math.abs(Math.sin(t * 6 + i)) * 0.2, z], Math.atan2(-(x1 - x0), -(z1 - z0)), 0, 0, [s, s, s]);
        g.anim[0] = i * 1.3;
        g.anim[1] = 1.0;
        cxs += x; cys += y; czs += z; n++;
      }
      if (n) focus(cxs / n, cys / n + 2.0, czs / n);
    } else if (sc.type === "mantas") {
      // schwarze Mantas gleiten mit langsamen Wellenschlägen in einem Bogen an den Schwebefelsen vorbei
      let lead = null;
      for (let i = 0; i < 5; i++) {
        const q = clamp01((st - 0.5 - i * 0.6) / 10.0);
        if (q <= 0 || q >= 1) continue;
        const cx = riverCenterX(sc.z);
        const P0 = [cx + sc.side * 70, 45 + i * 3, sc.z - 60 + i * 4], P1 = [cx + sc.side * 25, 26 + i, sc.z - 30];
        const P2 = [cx - sc.side * 15, 22 + i * 2, sc.z - 25], P3 = [cx - sc.side * 70, 40 + i * 2, sc.z - 55];
        const x = bez3(P0[0], P1[0], P2[0], P3[0], q), y = bez3(P0[1], P1[1], P2[1], P3[1], q), z = bez3(P0[2], P1[2], P2[2], P3[2], q) + zOff;
        const q2 = Math.min(q + 0.01, 1);
        const vx = bez3(P0[0], P1[0], P2[0], P3[0], q2) - x, vz = bez3(P0[2], P1[2], P2[2], P3[2], q2) + zOff - z;
        const g = take(creatureMeshes.manta, [0.015, 0.015, 0.02, 0]);
        const s = 5.0 + i * 0.6;
        Mat4.compose(g.model, [x, y, z], Math.atan2(-vx, -vz), 0.05, -sc.side * 0.25 * Math.sin(q * Math.PI), [s, s, s]);
        g.anim[0] = i * 1.1;
        g.anim[2] = -0.72;
        if (i === 1) lead = [x, y, z];
      }
      if (lead) focus(lead[0], lead[1], lead[2]);
    }
  });
}
