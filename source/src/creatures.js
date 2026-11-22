// creatures.js: Tiere, die während der Fahrt auftauchen
// Drei Arten, alle prozedural:
//   Gleiter (Material 21): Schwärme mit leuchtenden Schwingen, die über den Fluss segeln
//   Springfische (Material 22): springen kurz vor dem Boot aus dem Wasser
//   Wolf (Material 23/24): tritt im Nebeltal aus dem Wald, steigt auf einen Felsen und heult
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

const creatureMeshes = {
  glider: uploadStaticMesh(gl, buildGliderMesh()),
  fish: uploadStaticMesh(gl, buildFishMesh()),
  wolf: uploadStaticMesh(gl, buildWolfMesh())
};

// Vogelschwärme (tint.a = 0 bedeutet: keine Leuchtzeichnung, Farbe aus tint)
const BIRD_FLOCKS = [
  { z: -40, offX: 22, y: 22, r: 18, dir: 1, tint: [0.03, 0.03, 0.04, 0] },        // Raben im Nebeltal
  { z: -440, offX: 28, y: 30, r: 24, dir: -1, tint: [0.95, 0.95, 0.92, 0] }      // weiße Vögel bei den Inseln
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

// Laufende Szene: vom Programm gesetzt (index in SCENES, Zeit seit Beginn, oder -1)
const sceneFocus = [0, 0, 0];
let sceneFocusOn = false;

// sanfter Verlauf von a nach b zwischen den Zeiten t0 und t1
const ease = (t, t0, t1) => smoothstep(t0, t1, t);

function updateCreatures(camZ, t, sceneIdx, sceneT) {
  creatureDraws.length = 0;
  pois.length = 0;
  rippleDraws.length = 0;
  sceneFocusOn = false;
  let k = 0;
  const take = (mesh, tint) => {
    const d = drawPool[k++];
    d.mesh = mesh;
    d.tint[0] = tint[0]; d.tint[1] = tint[1]; d.tint[2] = tint[2]; d.tint[3] = tint.length > 3 ? tint[3] : 1;
    d.anim[0] = 0; d.anim[1] = 0; d.anim[2] = 0; d.anim[3] = 0;
    creatureDraws.push(d);
    return d;
  };
  const ripple = (x, z, a) => {
    const r = ripplePool[rippleDraws.length % ripplePool.length];
    r.x = x; r.z = z; r.a = a;
    rippleDraws.push(r);
  };
  const focus = (x, y, z) => { sceneFocus[0] = x; sceneFocus[1] = y; sceneFocus[2] = z; sceneFocusOn = true; };

  // Vogelschwärme, die über einer Stelle kreisen
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

  SCENES.forEach((sc, si) => {
    const d = aheadDist(camZ, sc.z);
    if (d > 160 || d < -60) return;
    const zOff = (camZ - d) - sc.z; // Versatz, falls die Szene in einer anderen Runde der Schleife liegt
    const active = si === sceneIdx;
    // vor der Szene: Ausgangslage, nach der Szene: Endlage
    const st = active ? sceneT : d > 0 ? 0 : sc.dur;

    if (sc.type === "wolf") {
      const rock = wolfRock(sc), den = wolfDen(sc, 0);
      // Weg: aus dem Wald zum Felsen
      const walkT = ease(st, 2.5, 7.0);
      const x = lerp(den.x, rock.x, walkT), z = lerp(den.z, rock.z, walkT) + zOff;
      const y = lerp(den.y, rock.y, ease(walkT, 0.75, 1.0)) + (walkT > 0.75 && walkT < 1 ? 0.25 * Math.sin((walkT - 0.75) * 4 * Math.PI) : 0);
      const g = take(creatureMeshes.wolf, [1.0, 0.65, 0.2]);
      const yawWalk = Math.atan2(-(rock.x - den.x), -(rock.z - den.z));
      const toBoat = Math.atan2(-(riverCenterX(camZ) - rock.x), -(camZ - (rock.z + zOff)));
      const yaw = st < 7.2 ? yawWalk : lerp(yawWalk, toBoat, ease(st, 7.2, 8.2));
      Mat4.compose(g.model, [x, y, z], yaw, 0, 0, [2.4, 2.4, 2.4]);
      g.anim[0] = 1.0;
      g.anim[1] = st > 2.5 && st < 7.0 ? 1.0 : 0.0;
      // Kopf: gesenkt, dann Heulen (hoch), dann wieder auf das Boot gerichtet
      g.anim[3] = -0.25 + 1.0 * (ease(st, 8.6, 9.4) - ease(st, 11.6, 12.4)) + 0.15 * ease(st, 12.4, 13.0);
      if (active && st > 8.8 && st < 9.0 && !sc.howled) { sc.howled = true; if (typeof playHowl === "function") playHowl(); }
      if (!active) sc.howled = false;
      // zwei weitere Wölfe bleiben im Dunkel zwischen den Bäumen
      for (let i = 1; i <= 2; i++) {
        const p = wolfDen(sc, i);
        const w = take(creatureMeshes.wolf, [1.0, 0.65, 0.2]);
        Mat4.compose(w.model, [p.x, p.y, p.z + zOff], toBoat + (i - 1.5) * 0.5, 0, 0, [2.1, 2.1, 2.1]);
        w.anim[0] = i * 2.0;
        w.anim[3] = -0.1 + 0.08 * Math.sin(t * 0.6 + i);
      }
      if (active) focus(x, y + 1.6, z);
      else if (d < 60 && d > -5) pois.push({ x, y: y + 1.5, z, w: 1.0 });
    } else if (sc.type === "fish") {
      // ein großer Leuchtfisch springt zweimal in langsamen Bögen vor dem Boot über den Fluss
      const zJ = sc.z + 7.0 + zOff, cx = riverCenterX(zJ);
      const jumps = [[2.0, 4.6, sc.side * 5.5, -sc.side * 4.0, 4.2], [6.0, 8.0, -sc.side * 3.0, sc.side * 2.0, 2.6]];
      let shown = false;
      jumps.forEach(([t0, t1, xa, xb, hgt], ji) => {
        if (st > t0 - 0.8 && st < t0 + 0.4) ripple(cx + xa, zJ, 1.0 - Math.abs(st - t0 + 0.2) * 1.5);
        if (st > t1 - 0.2 && st < t1 + 1.2) ripple(cx + xb, zJ, 1.0 - (st - t1) * 0.8);
        if (st < t0 || st > t1) return;
        const p = (st - t0) / (t1 - t0);
        const x = cx + lerp(xa, xb, p), y = -0.4 + Math.sin(p * Math.PI) * hgt;
        const f = take(creatureMeshes.fish, [1.0, 0.55, 0.15]);
        const dir = Math.sign(xb - xa);
        Mat4.compose(f.model, [x, y, zJ], dir > 0 ? -Math.PI * 0.5 : Math.PI * 0.5, Math.cos(p * Math.PI) * 0.9, 0, [2.6, 2.6, 2.6]);
        f.anim[0] = 3.0;
        if (active) focus(x, Math.max(y, 0.5), zJ);
        shown = true;
      });
      if (active && !shown) focus(cx + (st < 5 ? jumps[0][2] : jumps[1][2]) * 0.5, 0.6, zJ);
    } else if (sc.type === "flock") {
      // Gleiterschwarm: von den Inseln herab, tief über den Fluss vor dem Boot, auf der anderen Seite wieder hinauf
      const zF = sc.z + 6.0 + zOff, cx = riverCenterX(zF);
      for (let i = 0; i < 7; i++) {
        const q = clamp01((st - 1.0 - i * 0.25) / 10.5);
        if (q <= 0 || q >= 1) continue;
        const ox = Math.sin(i * 2.3) * 3.0, oz = Math.cos(i * 1.7) * 4.0;
        // Bezierkurve: oben seitlich -> tief über dem Fluss -> oben auf der anderen Seite
        const P0 = [cx + sc.side * 50 + ox, 34 + i, zF - 35 + oz], P1 = [cx + sc.side * 15 + ox, -4, zF - 10 + oz];
        const P2 = [cx - sc.side * 15 + ox, -2, zF + 2 + oz], P3 = [cx - sc.side * 55 + ox, 38 + i, zF - 20 + oz];
        const bez = (u, k2) => { const v = 1 - u; return v * v * v * P0[k2] + 3 * v * v * u * P1[k2] + 3 * v * u * u * P2[k2] + u * u * u * P3[k2]; };
        const x = bez(q, 0), y = Math.max(bez(q, 1), 4.0 + i * 0.4), z = bez(q, 2);
        const q2 = Math.min(q + 0.01, 1.0);
        const vx = bez(q2, 0) - x, vy = bez(q2, 1) - bez(q, 1), vz = bez(q2, 2) - z;
        const g = take(creatureMeshes.glider, i % 3 === 0 ? [0.75, 0.3, 1.0] : [0.15, 0.8, 1.0]);
        const s = 1.8 + (i % 3) * 0.3;
        Mat4.compose(g.model, [x, y, z], Math.atan2(-vx, -vz), Math.atan2(vy, Math.hypot(vx, vz)) * 0.8, -sc.side * 0.3 * Math.sin(q * Math.PI), [s, s, s]);
        g.anim[0] = i * 1.3;
        if (active && i === 3) focus(x, y, z);
      }
    }
  });
}
