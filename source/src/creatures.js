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

// Manta: flacher Körper mit weit geschwungenen, nach hinten gezogenen Schwingen, Kopflappen und Peitschenschwanz.
// Spannweite ~2, schaut nach -z. extra.z = Abstand von der Körpermitte (für den wellenförmigen Flügelschlag).
function buildMantaMesh() {
  const f = (p) => {
    let d = sdEllipsoid(p, [0, 0, 0], [0.22, 0.07, 0.42]);
    for (const s of [-1, 1]) {
      // Schwinge: Vorderkante leicht gebogen, Spitze nach hinten gezogen, nach außen dünner
      d = smin(d, sdFlat(p, [s * 0.1, 0.0, -0.18], [s * 0.62, 0.02, 0.0], 0.13, 1, 3.5), 0.12);
      d = smin(d, sdFlat(p, [s * 0.55, 0.02, 0.0], [s * 1.0, -0.03, 0.22], 0.05, 1, 3.5), 0.12);
      d = smin(d, sdFlat(p, [s * 0.1, 0.0, 0.15], [s * 0.5, 0.0, 0.12], 0.1, 1, 3.5), 0.1);
      d = smin(d, sdFlat(p, [s * 0.1, -0.01, -0.38], [s * 0.13, -0.03, -0.55], 0.03, 0, 2.0), 0.03);
    }
    d = smin(d, sdTaper(p, [0, 0, 0.35], [0, -0.03, 1.9], 0.035, 0.006), 0.05);
    return d;
  };
  return sdfMesh(f, [-1.08, -0.15, -0.65], [1.08, 0.15, 1.95], 0.02, (b, p, n) => {
    b.pushVertex(p[0], p[1], p[2], n[0], n[1], n[2], Math.abs(p[0]), p[2] + 0.6, 0.9, 0.0, Math.abs(p[0]), 21);
  });
}


// --- Tiere aus verschmolzenen Grundkörpern (siehe sdfmesh.js) ---
// abgeflachte Kapsel: Abstand mit gestauchter Achse (für Flossen und Hörner)
function sdFlat(p, a, b, r, ax, squash) {
  const q = [p[0], p[1], p[2]], aa = [a[0], a[1], a[2]], bb = [b[0], b[1], b[2]];
  q[ax] *= squash; aa[ax] *= squash; bb[ax] *= squash;
  return sdCapsule(q, aa, bb, r) / squash;
}
// Fellrauheit: kleine Störung der Oberfläche
const furNoise = (p, s) => (fbm2(p[0] * 31.0 + p[1] * 17.0, p[2] * 29.0 + p[1] * 7.0, 2) - 0.5) * s;

// Wolf: schaut nach -z, Pfoten bei y=0, Schulterhöhe ~0.8.
// Material 23 = Rumpf und Beine, 24 = Hals und Kopf (dreht sich beim Heulen). extra.z der Beine = Schrittphase.
function buildWolfMesh() {
  const legs = [
    { ph: 1, pts: [[-0.08, 0.52, -0.34], [-0.085, 0.26, -0.37], [-0.085, 0.04, -0.35]], r: [0.058, 0.038, 0.03] },
    { ph: -1, pts: [[0.08, 0.52, -0.34], [0.085, 0.26, -0.37], [0.085, 0.04, -0.35]], r: [0.058, 0.038, 0.03] },
    { ph: -1, pts: [[-0.09, 0.56, 0.34], [-0.095, 0.3, 0.47], [-0.09, 0.04, 0.41]], r: [0.075, 0.04, 0.03] },
    { ph: 1, pts: [[0.09, 0.56, 0.34], [0.095, 0.3, 0.47], [0.09, 0.04, 0.41]], r: [0.075, 0.04, 0.03] }
  ];
  const legD = (p, L) => {
    const [a, b2, c2] = L.pts;
    return Math.min(sdTaper(p, a, b2, L.r[0], L.r[1]), sdTaper(p, b2, c2, L.r[1], L.r[2]), sdEllipsoid(p, [c2[0], 0.03, c2[2] - 0.03], [0.038, 0.028, 0.055]));
  };
  const headD = (p) => {
    let d = sdTaper(p, [0, 0.62, -0.38], [0, 0.82, -0.6], 0.16, 0.11);
    d = smin(d, sdEllipsoid(p, [0, 0.84, -0.66], [0.1, 0.1, 0.13]), 0.06);
    d = smin(d, sdTaper(p, [0, 0.82, -0.74], [0, 0.77, -0.96], 0.065, 0.034), 0.04);
    for (const s of [-1, 1]) d = smin(d, sdFlat(p, [s * 0.06, 0.9, -0.62], [s * 0.085, 1.07, -0.6], 0.042, 2, 2.2), 0.02);
    return d;
  };
  const bodyD = (p) => {
    let d = sdEllipsoid(p, [0, 0.58, -0.22], [0.17, 0.23, 0.3]);
    d = smin(d, sdEllipsoid(p, [0, 0.6, 0.22], [0.13, 0.16, 0.32]), 0.14);
    d = smin(d, sdTaper(p, [0, 0.64, 0.5], [0, 0.36, 0.86], 0.06, 0.04), 0.06);
    return d;
  };
  const f = (p) => {
    let d = smin(bodyD(p), headD(p), 0.08);
    for (const L of legs) d = smin(d, legD(p, L), 0.06);
    return d + furNoise(p, 0.016);
  };
  const b = sdfMesh(f, [-0.32, -0.02, -1.05], [0.32, 1.1, 0.95], 0.022, (b, p, n) => {
    const dh = headD(p), db = bodyD(p);
    let best = Math.min(dh, db), leg = null;
    for (const L of legs) { const dl = legD(p, L); if (dl < best) { best = dl; leg = L; } }
    const isHead = !leg && dh <= db;
    const swing = leg ? leg.ph * (0.05 + clamp01((0.56 - p[1]) / 0.56)) : 0.0;
    b.pushVertex(p[0], p[1], p[2], n[0], n[1], n[2], Math.atan2(p[0], p[1]) / 6.283 + 0.5, p[2] + 1.0, 0.45 + 0.55 * clamp01(p[1] / 0.8), 0.0, swing, isHead ? 24 : 23);
  });
  // glühende Augen
  for (const s of [-1, 1]) addBox(b, [s * 0.052, 0.865, -0.765], [0.035, 0.02, 0.02], s * 0.4, 0, 24, 3.0);
  return b;
}

// Leuchtfisch: schaut nach -z, Länge ~1. extra.z = Position entlang des Körpers (für den Schwanzschlag)
function buildFishMesh() {
  const f = (p) => {
    let d = sdEllipsoid(p, [0, 0, -0.05], [0.085, 0.15, 0.42]);
    d = smin(d, sdTaper(p, [0, 0, 0.25], [0, 0, 0.5], 0.06, 0.018), 0.08);
    // gegabelte Schwanzflosse, Rücken-, Bauch- und Brustflossen als flache Kapseln
    d = smin(d, sdFlat(p, [0, 0.0, 0.48], [0, 0.2, 0.7], 0.035, 0, 5.0), 0.03);
    d = smin(d, sdFlat(p, [0, 0.0, 0.48], [0, -0.2, 0.7], 0.035, 0, 5.0), 0.03);
    d = smin(d, sdFlat(p, [0, 0.12, -0.15], [0, 0.26, 0.12], 0.035, 0, 5.0), 0.04);
    d = smin(d, sdFlat(p, [0, -0.12, 0.05], [0, -0.2, 0.2], 0.03, 0, 5.0), 0.04);
    for (const s of [-1, 1]) d = smin(d, sdFlat(p, [s * 0.07, -0.05, -0.18], [s * 0.2, -0.12, -0.02], 0.03, 1, 4.0), 0.03);
    return d;
  };
  const b = sdfMesh(f, [-0.25, -0.3, -0.55], [0.25, 0.32, 0.8], 0.014, (b, p, n) => {
    const fin = Math.abs(p[0]) < 0.03 && (Math.abs(p[1]) > 0.14 || p[2] > 0.45) ? 1.0 : 0.0;
    b.pushVertex(p[0], p[1], p[2], n[0], n[1], n[2], Math.atan2(p[0], p[1]) / 6.283 + 0.5, p[2] + 0.5, 0.9, fin, clamp01((p[2] + 0.45) / 1.15) * 1.2, 22);
  });
  for (const s of [-1, 1]) addBox(b, [s * 0.075, 0.04, -0.33], [0.012, 0.035, 0.035], 0, 0, 22, 3.0);
  return b;
}

// Herdentier (antilopenartig): schaut nach -z, Schulterhöhe ~1. Beine mit Schrittphase wie beim Wolf.
function buildHerdAnimalMesh() {
  const legs = [
    { ph: 1, pts: [[-0.08, 0.88, -0.32], [-0.08, 0.46, -0.35], [-0.08, 0.0, -0.31]] },
    { ph: -1, pts: [[0.08, 0.88, -0.32], [0.08, 0.46, -0.35], [0.08, 0.0, -0.31]] },
    { ph: -1, pts: [[-0.09, 0.9, 0.33], [-0.09, 0.46, 0.45], [-0.09, 0.0, 0.38]] },
    { ph: 1, pts: [[0.09, 0.9, 0.33], [0.09, 0.46, 0.45], [0.09, 0.0, 0.38]] }
  ];
  const legD = (p, L) => Math.min(sdTaper(p, L.pts[0], L.pts[1], 0.055, 0.03), sdTaper(p, L.pts[1], L.pts[2], 0.028, 0.02));
  const f = (p) => {
    let d = sdEllipsoid(p, [0, 0.96, 0.05], [0.15, 0.19, 0.46]);
    d = smin(d, sdEllipsoid(p, [0, 0.98, -0.28], [0.16, 0.22, 0.22]), 0.1);
    d = smin(d, sdTaper(p, [0, 1.05, -0.4], [0, 1.42, -0.6], 0.09, 0.055), 0.06);
    d = smin(d, sdEllipsoid(p, [0, 1.46, -0.68], [0.06, 0.07, 0.1]), 0.04);
    d = smin(d, sdTaper(p, [0, 1.44, -0.74], [0, 1.39, -0.86], 0.05, 0.03), 0.03);
    for (const s of [-1, 1]) {
      d = Math.min(d, sdTaper(p, [s * 0.035, 1.51, -0.67], [s * 0.075, 1.72, -0.6], 0.028, 0.02));
      d = Math.min(d, sdTaper(p, [s * 0.075, 1.72, -0.6], [s * 0.06, 1.86, -0.42], 0.02, 0.006));
    }
    for (const L of legs) d = smin(d, legD(p, L), 0.05);
    d = smin(d, sdTaper(p, [0, 1.02, 0.5], [0, 0.82, 0.6], 0.03, 0.015), 0.03);
    return d + furNoise(p, 0.008);
  };
  return sdfMesh(f, [-0.3, -0.02, -0.95], [0.3, 1.9, 0.7], 0.028, (b, p, n) => {
    let best = 1e9, leg = null;
    for (const L of legs) { const dl = legD(p, L); if (dl < best) { best = dl; leg = L; } }
    const onLeg = leg && best < 0.02 && p[1] < 0.9;
    b.pushVertex(p[0], p[1], p[2], n[0], n[1], n[2], 0.5, p[1], 0.5 + 0.5 * clamp01(p[1] / 1.0), 0.0, onLeg ? leg.ph * (0.05 + clamp01((0.9 - p[1]) / 0.9)) : 0.0, 23);
  });
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

// Blickziel der laufenden Szene (die Kamera richtet sich fest darauf) und kurzes Ducken der Kamera (0..1)
const sceneFocus = [0, 0, 0];
let sceneFocusOn = false;
let sceneDuck = 0.0;
let sceneShake = 0.0; // Schütteln des Boots (Tentakel)
// Staubwolken: je Wolke x, y, z, Größe, Deckkraft
const DUST_MAX = 240;
const dustData = new Float32Array(DUST_MAX * 5);
let dustCount = 0;

// weicher Verlauf 0..1 zwischen den Zeiten t0 und t1
const ease = (t, t0, t1) => smoothstep(t0, t1, t);
const bez3 = (p0, p1, p2, p3, u) => { const v = 1 - u; return v * v * v * p0 + 3 * v * v * u * p1 + 3 * v * u * u * p2 + u * u * u * p3; };

function updateCreatures(camZ, t, sceneIdx, sceneT, cam) {
  creatureDraws.length = 0;
  pois.length = 0;
  rippleDraws.length = 0;
  sceneFocusOn = false;
  sceneDuck = 0.0;
  sceneShake = 0.0;
  dustCount = 0;
  const dust = (x, y, z, size, a) => {
    if (dustCount >= DUST_MAX || a <= 0.002) return;
    dustData.set([x, y, z, size, a], dustCount * 5);
    dustCount++;
  };
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
    if (!active && sc.type !== "wolf") return; // der Wolf bleibt nach seiner Szene stehen und sieht dem Boot nach
    const st = active ? sceneT : d > 0 ? 0 : sc.dur;

    if (sc.type === "wolf") {
      // tritt ruhig aus dem Wald auf den Felsvorsprung, heult, bleibt stehen und sieht dem Boot nach
      if (!active && d > 0) return;
      if (d < -45) return;
      const spot = wolfSpot(sc), den = wolfDen(sc);
      const f = ease(st, 0.5, 4.2);
      const x = lerp(den.x, spot.x, f), z = lerp(den.z, spot.z, f) + zOff;
      // auf den letzten Schritten steigt der Wolf auf den Felsvorsprung
      const y = lerp(terrainHeight(x, z) - 0.05, spot.y, ease(f, 0.75, 1.0));
      const g = take(creatureMeshes.wolf, [1.0, 0.65, 0.2]);
      const yawOut = Math.atan2(-(spot.x - den.x), -(spot.z - den.z));
      const toBoat = Math.atan2(-(cam[0] - x), -(cam[2] - z));
      // Körper dreht sich halb zum Boot, den Rest übernimmt der Kopf
      const turn = ease(st, 3.8, 5.0);
      const bodyYaw = lerp(yawOut, yawOut + wrapAngle(toBoat - yawOut) * 0.55, turn);
      const headYaw = Math.max(-1.1, Math.min(1.1, wrapAngle(toBoat - bodyYaw))) * turn;
      Mat4.compose(g.model, [x, y, z], bodyYaw, 0, 0, [2.4, 2.4, 2.4]);
      g.anim[0] = 1.0;
      g.anim[1] = (1.0 - ease(st, 3.4, 4.4)) * ease(st, 0.3, 0.9) * 0.8;
      g.anim[2] = headYaw;
      g.anim[3] = -0.12 + 0.95 * (ease(st, 5.4, 6.3) - ease(st, 8.0, 8.8));
      if (active && st > 5.6 && !sc.howled) { sc.howled = true; if (typeof playHowl === "function") playHowl(); }
      if (!active && d > 0) sc.howled = false;
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
      // das Schloss bleibt im Blick; wenn der Schwarm vorbeirauscht, duckt sich die Kamera kurz
      focus(CASTLE.x, CASTLE.top - 6.0, CASTLE.z + zOff);
      sceneDuck = ease(st, 6.2, 7.0) * (1.0 - ease(st, 8.6, 9.8));
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
      // einer taucht direkt neben dem Bug auf und schlägt ins Wasser, die anderen links und rechts weiter vorn
      const spots = [[-1, -2.0, 0.0], [1, -5.0, 0.5], [-1, -9.0, 1.0], [1, -12.0, 1.4], [-1, -15.0, 1.9], [1, 4.5, 2.6]];
      let fx = 0, fy = 0, fz = 0, n = 0;
      spots.forEach(([side, dz, delay], i) => {
        const z = sc.z + dz + zOff, cx = riverCenterX(z);
        const near = i === 5;
        const x = cx + side * (near ? 2.6 : 2.3 + hash2(i, 310.0) * 0.8);
        const up = ease(st, 0.6 + delay, 1.3 + delay), down = ease(st, 7.0 + delay * 0.4, 7.9 + delay * 0.4);
        const h = near ? 8.0 : 9.0 + hash2(i, 311.0) * 4.0;
        const lift = up * (1.0 - down);
        ripple(x, z, (st > 0.3 + delay && st < 2.5 + delay ? 1.0 : 0) + (st > 7.0 + delay * 0.5 && st < 9.5 + delay * 0.5 ? 0.8 : 0));
        if (lift <= 0.001) return;
        const g = take(creatureMeshes.tentacle, side > 0 ? [0.6, 0.12, 0.9] : [0.05, 0.55, 0.8]);
        // der nahe Tentakel neigt sich über das Boot und schlägt zu
        const slap = near ? ease(st, 4.4, 5.0) * (1.0 - ease(st, 5.6, 6.4)) : 0.0;
        Mat4.compose(g.model, [x, -h * (1.0 - lift) - 0.3, z], side > 0 ? Math.PI : 0, 0, -side * (0.15 + slap * 0.9) * lift, [h, h * 1.1, h]);
        g.anim[0] = i * 1.9;
        g.anim[1] = 0.8 + 0.8 * ease(st, 2.0 + delay, 2.8 + delay);
        if (near && st > 5.0 && st < 6.0) ripple(cx, z - 1.0, 1.0);
        // das Boot schüttelt sich beim Auftauchen und beim Schlag
        sceneShake = Math.max(sceneShake, (near ? slap * 1.0 : 0.0) + up * (1.0 - ease(st, 1.3 + delay, 2.4 + delay)) * 0.5);
        fx += x; fy += h * lift * 0.6; fz += z; n++;
      });
      if (n) focus(fx / n, fy / n, fz / n); else focus(riverCenterX(sc.z + zOff), 2.0, sc.z - 6 + zOff);
    } else if (sc.type === "herd") {
      // eine Herde zieht in der Ferne schräg über die Ebene
      let cxs = 0, cys = 0, czs = 0, n = 0;
      const p = clamp01(st / sc.dur);
      for (let i = 0; i < 14; i++) {
        const ox = (hash2(i, 320.0) - 0.5) * 16, oz = (hash2(i, 321.0) - 0.5) * 12;
        // die Herde zieht auf dem Hügelkamm entlang, als Silhouette vor dem Himmel
        const x0 = riverCenterX(sc.z - 120) + sc.side * HERD_RIDGE, x1 = riverCenterX(sc.z + 40) + sc.side * HERD_RIDGE;
        const z0 = sc.z - 120, z1 = sc.z + 40;
        const x = lerp(x0, x1, p) + ox, z = lerp(z0, z1, p) + oz + zOff;
        const y = terrainHeight(x, z) - 0.05;
        const g = take(creatureMeshes.herd, [0.32, 0.22, 0.14, 0]);
        if (!g) break;
        const s = 3.2 + hash2(i, 322.0) * 0.8;
        const ph = t * 6.5 + i * 1.3;
        Mat4.compose(g.model, [x, y + Math.max(0, Math.sin(ph * 2.0)) * 0.25, z], Math.atan2(-(x1 - x0), -(z1 - z0)), Math.sin(ph * 2.0) * 0.04, 0, [s, s, s]);
        g.anim[0] = i * 1.3;
        g.anim[1] = 1.5;
        // Staub hinter jedem Tier: Wolken entstehen an den Hufen, steigen auf, wachsen und verblassen
        for (let k = 0; k < 8; k++) {
          const age = (t * 0.28 + k / 8 + i * 0.137) % 1.0;
          const back = age * 22.0;
          const dx = (x1 - x0), dz = (z1 - z0), dl = Math.hypot(dx, dz);
          dust(x - dx / dl * back + Math.sin(k * 3.1 + i) * 1.2, y + 0.4 + age * 2.6, z - dz / dl * back, 4.0 + age * 12.0, (1.0 - age) * 0.5);
        }
        cxs += x; cys += y; czs += z; n++;
      }
      if (n) focus(cxs / n, cys / n + 2.0, czs / n);
    } else if (sc.type === "mantas") {
      // schwarze Mantas: kommen schräg von links vorn aus der Ferne, gleiten über den Fluss
      // und ziehen schräg rechts hinter das Boot, wo sie aus dem Bild verschwinden
      let lead = null;
      for (let i = 0; i < 4; i++) {
        const q = clamp01((st - 0.3 - i * 1.1) / 10.0);
        if (q <= 0 || q >= 1) continue;
        const bz = cam[2], bx = cam[0];
        // jeder Manta auf eigener, seitlich und in der Höhe versetzter Bahn
        const ox = [0, 14, -12, 26][i], oy = [0, 7, -3, 12][i], oz = [0, -10, 12, -22][i];
        const P0 = [bx - 110 + ox, 48 + oy, bz - 150 + oz], P1 = [bx - 40 + ox, 30 + oy, bz - 70 + oz];
        const P2 = [bx + 12 + ox * 0.6, 16 + oy * 0.7, bz - 18 + oz * 0.5], P3 = [bx + 60 + ox, 20 + oy, bz + 60 + oz];
        const pos = (u) => [bez3(P0[0], P1[0], P2[0], P3[0], u), bez3(P0[1], P1[1], P2[1], P3[1], u), bez3(P0[2], P1[2], P2[2], P3[2], u)];
        const [x, y, z] = pos(q), p2 = pos(Math.min(q + 0.01, 1));
        const g = take(creatureMeshes.manta, [0.015, 0.015, 0.02, 0]);
        const s = 5.5 + i * 0.7;
        Mat4.compose(g.model, [x, y + Math.sin(t * 0.6 + i) * 0.6, z], Math.atan2(-(p2[0] - x), -(p2[2] - z)), -(p2[1] - y) * 0.3, -0.25 * Math.sin(q * Math.PI), [s, s, s]);
        g.anim[0] = i * 1.1;
        g.anim[2] = -0.72;
        if (i === 1) lead = [x, y, z];
      }
      // die Kamera folgt nur, solange die Mantas vor dem Boot sind, danach ziehen sie einfach vorbei
      if (lead && lead[2] < cam[2] - 28) focus(lead[0], lead[1], lead[2]);
    }
  });
}
