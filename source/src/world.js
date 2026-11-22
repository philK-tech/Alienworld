// world.js: Welt: Platzierung aller Objekte entlang der Strecke
// --- World Population ---
// Stellen der Strecke, an denen Tiere auftauchen (z in Weltkoordinaten der Schleife), siehe creatures.js
const EVENTS = {
  flocks: [{ z: -345, side: 1 }, { z: -398, side: -1 }, { z: -452, side: 1 }],   // Himmelsinseln
  fish: [-176, -199, -223, -247, -271, -296],                                     // Pilzwald
  wolves: [{ z: -42, side: 1 }, { z: -96, side: -1 }, { z: -140, side: 1 }]      // Nebeltal
};
// Platz eines Wolfs im Rudel, dort wo das Rudel stehen bleibt
function wolfSpot(ev, i) {
  const z = ev.z + i * 2.6 - 2.6;
  const x = riverCenterX(z) + ev.side * (riverHalfWidth(ev.z) + 3.0 + (i % 2) * 1.6);
  return { x, z, y: terrainHeight(x, z) - 0.05 };
}
// Lichtungen am Ufer, wo die Wölfe laufen: dort wachsen keine Bäume, Felsen oder großen Pflanzen
const CLEARINGS = EVENTS.wolves.map((ev) => {
  const a = wolfSpot(ev, 1);
  return { x: a.x, z: a.z };
});
function inClearing(x, z, r) {
  for (const c of CLEARINGS) {
    const dz = Math.abs(z - c.z);
    if (Math.hypot(x - c.x, Math.min(dz, LOOP_LENGTH - dz)) < r) return true;
  }
  return false;
}

// Alle Positionen liegen in z zwischen 0 und -LOOP_LENGTH. Beim Zeichnen wird die Welt
// vor und hinter der Kamera wiederholt, dadurch ist die Fahrt eine nahtlose Schleife.
function buildWorld() {
  const L = LOOP_LENGTH;
  const valleyMesh = uploadStaticMesh(gl, buildValleyTerrainMesh());
  const waterMesh = uploadStaticMesh(gl, buildWaterSurfaceMesh());
  const skyDomeMesh = uploadStaticMesh(gl, buildSkyDomeMesh());
  const cliffHousingMesh = uploadStaticMesh(gl, buildWaterfallCliffHousingMesh());
  const mountainMesh = uploadStaticMesh(gl, buildFloatingMountainMesh());
  const archMesh = uploadStaticMesh(gl, buildStoneArchMesh());
  const waterfallMesh = uploadStaticMesh(gl, buildWaterfallRibbonMesh());
  const plungeRippleMesh = uploadStaticMesh(gl, buildPlungeRippleMesh());
  const shaftMesh = uploadStaticMesh(gl, buildLightShaftMesh());

  const archZ = -L * 0.46;
  const archModel = Mat4.create();
  Mat4.compose(archModel, [riverCenterX(archZ), 0.0, archZ], -riverSlopeX(archZ) * 0.65, 0, 0, [1.15, 1.1, 1.2]);
  const zw = [0, 0, 0];
  // true mit der Wahrscheinlichkeit, mit der Zonengewichte wA/wB/wC an der Stelle z gelten
  const zoneChance = (z, wA, wB, wC, h) => {
    zoneWeights(z, zw);
    return h < zw[0] * wA + zw[1] * wB + zw[2] * wC;
  };

  // Schwebende Inseln: nur in Zone 3. Nahe Inseln mit Wasserfällen, ferne als Kulisse
  const floatingPeaks = [];
  const nearIslands = [-336, -354, -373, -394, -416, -437, -458];
  nearIslands.forEach((z, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const s = 6.0 + hash2(i, 70.0) * 5.0;
    floatingPeaks.push({ z, offsetX: side * (17.0 + hash2(i, 71.0) * 14.0), y: 15.0 + hash2(i, 72.0) * 12.0,
      sx: s, sy: s * 1.35, sz: s * 0.9, fall: i % 2 === 0 });
  });
  for (let i = 0; i < 12; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const s = 12.0 + hash2(i, 73.0) * 18.0;
    floatingPeaks.push({ z: -338.0 - i * 11.0 - hash2(i, 74.0) * 6.0, offsetX: side * (45.0 + hash2(i, 75.0) * 75.0),
      y: 30.0 + hash2(i, 76.0) * 40.0, sx: s, sy: s * (1.2 + hash2(i, 77.0) * 0.4), sz: s * 0.9, fall: false });
  }
  floatingPeaks.forEach((pk, idx) => { pk.x = riverCenterX(pk.z) + pk.offsetX; pk.rot = idx * 1.4; });

  // Uferklippen mit Wasserfällen im Nebeltal: das Wasser tritt in der Nische aus und fällt bis y=0
  const waterfalls = [];
  const bankCliffHousings = [];
  const plungeRipples = [];
  const bankFalls = [{ z: -22, side: -1 }, { z: -60, side: 1 }, { z: -73, side: -1 }, { z: -118, side: -1 }];
  bankFalls.forEach(({ z: fz, side }) => {
    const cx = riverCenterX(fz);
    const hw = riverHalfWidth(fz);
    const cliffX = cx + side * (hw + 1.8);
    const yaw = side < 0 ? Math.PI * 0.42 : -Math.PI * 0.42;
    const cliffHeight = 7.5;
    const dirX = Math.sin(yaw);
    const dirZ = Math.cos(yaw);
    const crestX = cliffX + dirX * 0.25;
    const crestZ = fz + dirZ * 0.25;
    bankCliffHousings.push({ x: cliffX, y: -0.6, z: fz, rotY: yaw, sx: 5.2, sy: cliffHeight + 1.2, sz: 3.6 });
    waterfalls.push({ x: crestX, y: cliffHeight - 0.55, z: crestZ, rotY: yaw, sx: 2.9, sy: cliffHeight - 0.55, sz: 1.8, isSkyFall: false });
    plungeRipples.push({ x: crestX + dirX * 0.85, y: 0.02, z: crestZ + dirZ * 0.85, sx: 3.4, sz: 3.0 });
  });

  // Wasserfälle, die aus den nahen schwebenden Inseln stürzen
  floatingPeaks.forEach((pk, idx) => {
    if (!pk.fall) return;
    const startY = pk.y - pk.sy * 0.12;
    const fx = pk.x + (pk.offsetX < 0 ? 1.5 : -1.5);
    const groundY = terrainHeight(fx, pk.z + 1.6);
    waterfalls.push({ x: fx, y: startY, z: pk.z + 1.6, rotY: 0.0, sx: 1.4, sy: startY - groundY, sz: 1.2, isSkyFall: true, peakIdx: idx, groundY });
  });

  // Instanzen
  const groups = {};
  function group(name) {
    if (!groups[name]) groups[name] = { mats: [], tints: [] };
    return groups[name];
  }
  const m = Mat4.create();
  function pushInst(name, pos, rotY, rotX, rotZ, scale, tint) {
    const g = group(name);
    Mat4.compose(m, pos, rotY, rotX, rotZ, scale);
    for (let i = 0; i < 16; i++) g.mats.push(m[i]);
    g.tints.push(tint[0], tint[1], tint[2], tint[3]);
  }
  // Zufallsposition neben dem Fluss: Abstand vom Ufer zwischen dMin und dMax
  function bankSpot(i, salt, dMin, dMax, bias = 1.0) {
    const z = -hash2(i, salt) * L;
    const side = hash2(i, salt + 0.5) < 0.5 ? -1 : 1;
    const hw = riverHalfWidth(z);
    const bank = dMin + Math.pow(hash2(i, salt + 1.1), bias) * (dMax - dMin);
    const x = riverCenterX(z) + side * (hw + bank);
    // reach: waagrechter Abstand zur Fahrrinne des Boots (Bootsmitte pendelt um bis zu 1 Einheit)
    return { x, z, y: terrainHeight(x, z), side, bank, reach: hw + bank - 2.2 };
  }
  const CYAN = [0.10, 0.85, 1.0, 1], BLUE = [0.15, 0.45, 1.0, 1], VIOLET = [0.75, 0.28, 1.0, 1];
  const pickTint = (h) => (h < 0.55 ? CYAN : h < 0.85 ? BLUE : VIOLET);
  const rot = (i, salt) => hash2(i, salt) * Math.PI * 2;
  // Haine: Bäume wachsen in Gruppen, dazwischen bleiben offene Wiesen
  const grove = (p, thr) => pnoise(p.x + 517.0, p.z, 0.028, 2) > thr;

  // Felsen: viele im Nebeltal, einige auf den Himmelsinseln, wenige im Pilzwald
  for (let i = 0; i < 110; i++) {
    const p = bankSpot(i, 1.0, -0.8, 30.0, 1.1);
    if (inClearing(p.x, p.z, 9.0) || !zoneChance(p.z, 0.8, 0.3, 0.15, hash2(i, 1.9))) continue;
    // Felsen dürfen nicht in die Fahrrinne ragen
    const free = Math.abs(p.x - riverCenterX(p.z)) - 5.0;
    const s = Math.min(1.2 + hash2(i, 2.7) * 4.0, free / 1.25);
    if (s < 0.6) continue;
    pushInst("cliffs", [p.x, p.y - 0.4, p.z], rot(i, 3.1), 0, 0, [s, s * (0.6 + hash2(i, 4.9) * 0.8), s * 0.9], [0.9, 1.0, 1.15, 1]);
  }
  // Steinsäulen im Nebeltal
  for (let i = 0; i < 60; i++) {
    const p = bankSpot(i, 80.0, 1.5, 16.0, 1.2);
    if (inClearing(p.x, p.z, 8.0) || !zoneChance(p.z, 1.0, 0.0, 0.0, hash2(i, 80.7))) continue;
    const w = 0.9 + hash2(i, 81.0) * 0.6;
    pushInst("cliffs", [p.x, p.y - 0.3, p.z], rot(i, 82.0), (hash2(i, 83.0) - 0.5) * 0.15, (hash2(i, 84.0) - 0.5) * 0.15,
      [w, 3.5 + hash2(i, 85.0) * 3.0, w * 0.8], [0.95, 0.95, 1.05, 1]);
  }

  // große, abgerundete Felsberge im Mittelgrund (Himmelsinseln) und Felskuppen (Nebeltal)
  for (let i = 0; i < 60; i++) {
    const p = bankSpot(i, 110.0, 45.0, 120.0, 1.0);
    if (!zoneChance(p.z, 0.35, 0.0, 1.0, hash2(i, 110.7))) continue;
    const s = 12.0 + hash2(i, 111.0) * 16.0;
    pushInst("cliffs", [p.x, p.y - 2.0, p.z], rot(i, 112.0), 0, 0, [s, s * (1.1 + hash2(i, 113.0) * 0.9), s * 0.9], [1.05, 0.95, 0.85, 1]);
  }
  // Felsen links und rechts der Wasserfälle, damit sie wie eine Felskante wirken
  bankCliffHousings.forEach((ch, k) => {
    for (const off of [-5.5, 5.0]) {
      const z = ch.z + off;
      const sideSign = Math.sign(ch.x - riverCenterX(ch.z));
      const s = 3.0 + hash2(k, off + 1.0) * 1.5;
      const x = riverCenterX(z) + sideSign * (riverHalfWidth(z) + 1.5 + s * 1.1 + hash2(k, off) * 1.5);
      pushInst("cliffs", [x, terrainHeight(x, z) - 0.5, z], rot(k, off + 2.0), 0, 0, [s, s * 1.5, s], [0.9, 0.95, 1.05, 1]);
    }
  });

  // Zone 1: Nadelbäume, nah am Ufer kleiner (die unteren Zweige dürfen nicht in die Fahrrinne ragen)
  for (let i = 0; i < 700; i++) {
    const p = bankSpot(i, 5.0, 2.5, 34.0, 1.0);
    if (inClearing(p.x, p.z, 10.0) || !zoneChance(p.z, 1.0, 0.0, 0.0, hash2(i, 5.7)) || !grove(p, 0.4)) continue;
    const h = Math.min(9.0 + hash2(i, 6.4) * 10.0, p.reach / 0.3);
    if (h < 5.0) continue;
    pushInst("pines", [p.x, p.y - 0.2, p.z], rot(i, 8.1), 0, 0, [h, h, h], CYAN);
  }
  for (let i = 0; i < 650; i++) {
    const p = bankSpot(i, 10.0, 30.0, 140.0, 1.0);
    if (inClearing(p.x, p.z, 9.0) || !zoneChance(p.z, 1.0, 0.0, 0.0, hash2(i, 10.7)) || !grove(p, 0.36)) continue;
    const h = 16.0 + hash2(i, 11.4) * 16.0;
    pushInst("pines", [p.x, p.y - 0.3, p.z], rot(i, 13.1), 0, 0, [h, h, h], CYAN);
  }
  // Zone 2: Riesenpilze
  for (let i = 0; i < 260; i++) {
    const p = bankSpot(i, 90.0, 1.5, 70.0, 1.3);
    if (!zoneChance(p.z, 0.0, 1.0, 0.0, hash2(i, 90.7)) || !grove(p, 0.44)) continue;
    const far = p.bank > 14.0;
    const h = far ? 10.0 + hash2(i, 91.0) * 12.0 : 4.5 + hash2(i, 91.0) * 7.0;
    pushInst("giantMushrooms", [p.x, p.y - 0.2, p.z], rot(i, 92.0), (hash2(i, 93.0) - 0.5) * 0.12, (hash2(i, 94.0) - 0.5) * 0.12, [h, h, h], CYAN);
  }
  // Zone 3: Bäume mit runden Kronen
  for (let i = 0; i < 320; i++) {
    const p = bankSpot(i, 95.0, 2.5, 90.0, 1.2);
    if (!zoneChance(p.z, 0.0, 0.0, 1.0, hash2(i, 95.7)) || !grove(p, 0.47)) continue;
    const h = Math.min(6.0 + hash2(i, 96.0) * 7.0 + (p.bank > 18 ? 4.0 : 0.0), p.reach / 0.45);
    if (h < 3.5) continue;
    pushInst("roundTrees", [p.x, p.y - 0.2, p.z], rot(i, 97.0), 0, 0, [h, h, h], CYAN);
  }
  // Bäume auf den schwebenden Inseln
  floatingPeaks.forEach((pk, k) => {
    const n = 2 + Math.floor(hash2(k, 98.0) * 4);
    for (let i = 0; i < n; i++) {
      const a = hash2(k * 7 + i, 99.0) * Math.PI * 2, rr = Math.sqrt(hash2(k * 7 + i, 100.0)) * 0.45;
      const y = pk.y + pk.sy * 0.34 * (1.0 - (rr / 0.85) * (rr / 0.85)) - 0.3;
      const h = pk.sx * (0.35 + hash2(k * 7 + i, 101.0) * 0.3);
      pushInst("roundTrees", [pk.x + Math.cos(a) * rr * pk.sx, y, pk.z + Math.sin(a) * rr * pk.sz], rot(k * 7 + i, 102.0), 0, 0, [h, h, h], CYAN);
    }
  });

  // --- Bauwerke, Ruinen und Besonderheiten je Zone ---
  const STONE_A = [0.30, 0.29, 0.33, 1], STONE_B = [0.22, 0.22, 0.28, 1], MARBLE = [0.86, 0.84, 0.79, 1];
  // Nebeltal: Burgruinen auf fernen Hügeln, verfallene Mauern und Torbögen, Laternen am Ufer
  [{ z: -55, side: -1, d: 85 }, { z: -125, side: 1, d: 100 }].forEach((c, k) => {
    const x = riverCenterX(c.z) + c.side * (riverHalfWidth(c.z) + c.d);
    const s = 34 + k * 6;
    pushInst("castles", [x, terrainHeight(x, c.z) - 1.0, c.z], rot(k, 120.0), 0, 0, [s, s, s], STONE_A);
  });
  for (let i = 0; i < 40; i++) {
    const p = bankSpot(i, 125.0, 3.0, 35.0, 1.2);
    if (inClearing(p.x, p.z, 8.0) || !zoneChance(p.z, 0.6, 0.6, 0.0, hash2(i, 125.7))) continue;
    zoneWeights(p.z, zw);
    const s = 5.0 + hash2(i, 126.0) * 6.0;
    pushInst("ruinArches", [p.x, p.y - 0.15, p.z], rot(i, 127.0), 0, (hash2(i, 128.0) - 0.5) * 0.06, [s, s, s], zw[0] > zw[1] ? STONE_A : STONE_B);
  }
  for (let i = 0; i < 70; i++) {
    const p = bankSpot(i, 130.0, 0.8, 2.2, 1.0);
    if (inClearing(p.x, p.z, 5.0) || !zoneChance(p.z, 1.0, 0.0, 0.0, hash2(i, 130.7))) continue;
    const h = 2.1 + hash2(i, 131.0) * 0.5;
    // die Laterne zeigt zum Fluss
    pushInst("lanterns", [p.x, p.y - 0.05, p.z], p.side > 0 ? Math.PI : 0, 0, 0, [h, h, h], [1, 1, 1, 1]);
  }
  // Pilzwald: Tentakel in Gruppen, leuchtende Glaskugeln
  for (let g = 0; g < 26; g++) {
    const c = bankSpot(g, 135.0, 1.5, 24.0, 1.3);
    if (!zoneChance(c.z, 0.0, 1.0, 0.0, hash2(g, 135.7))) continue;
    const n = 2 + Math.floor(hash2(g, 136.0) * 4);
    for (let k = 0; k < n; k++) {
      const a = hash2(g * 9 + k, 137.0) * Math.PI * 2, r = 1.0 + hash2(g * 9 + k, 138.0) * 3.0;
      const x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r;
      if (Math.abs(x - riverCenterX(z)) < riverHalfWidth(z) + 0.5) continue;
      const h = 3.5 + hash2(g * 9 + k, 139.0) * 6.0;
      pushInst("tentacles", [x, terrainHeight(x, z) - 0.3, z], rot(g * 9 + k, 140.0), (hash2(g * 9 + k, 141.0) - 0.5) * 0.3, (hash2(g * 9 + k, 142.0) - 0.5) * 0.3,
        [h, h, h], hash2(g * 9 + k, 143.0) < 0.6 ? VIOLET : CYAN);
    }
  }
  for (let i = 0; i < 120; i++) {
    const p = bankSpot(i, 145.0, 0.3, 14.0, 1.5);
    if (!zoneChance(p.z, 0.0, 1.0, 0.0, hash2(i, 145.7))) continue;
    const r = 0.25 + Math.pow(hash2(i, 146.0), 2.0) * 0.9;
    pushInst("orbs", [p.x, p.y + r * 0.8, p.z], 0, 0, 0, [r, r, r], hash2(i, 147.0) < 0.5 ? CYAN : hash2(i, 147.0) < 0.8 ? VIOLET : [1.0, 0.55, 0.2, 1]);
  }
  // Himmelsinseln: weiße Türme auf den Inseln und am Ufer, schwebende Felsbrocken, Felsen im Fluss
  floatingPeaks.forEach((pk, k) => {
    if (hash2(k, 150.0) > 0.55) return;
    const h = pk.sx * (0.9 + hash2(k, 151.0) * 0.8);
    pushInst("spires", [pk.x + (hash2(k, 152.0) - 0.5) * pk.sx * 0.4, pk.y + pk.sy * 0.32 - 0.5, pk.z], rot(k, 153.0), 0, 0, [h, h, h], MARBLE);
  });
  for (let i = 0; i < 30; i++) {
    const p = bankSpot(i, 155.0, 12.0, 90.0, 1.0);
    if (!zoneChance(p.z, 0.0, 0.0, 1.0, hash2(i, 155.7))) continue;
    const h = 16.0 + hash2(i, 156.0) * 18.0;
    pushInst("spires", [p.x, p.y - 0.5, p.z], rot(i, 157.0), 0, 0, [h, h, h], MARBLE);
  }
  for (let i = 0; i < 55; i++) {
    const z = -330.0 - hash2(i, 160.0) * 140.0;
    const side = hash2(i, 161.0) < 0.5 ? -1 : 1;
    const x = riverCenterX(z) + side * (18.0 + hash2(i, 162.0) * 70.0);
    const y = 14.0 + hash2(i, 163.0) * 40.0;
    const s = 0.6 + Math.pow(hash2(i, 164.0), 2.0) * 3.5;
    pushInst("cliffs", [x, y, z], rot(i, 165.0), Math.PI, 0, [s, s * 1.4, s], [1.05, 0.95, 0.85, 1]);
  }
  for (let i = 0; i < 90; i++) {
    const p = bankSpot(i, 170.0, -2.0, -0.4, 1.0);
    if (!zoneChance(p.z, 0.6, 0.2, 1.0, hash2(i, 170.7))) continue;
    const s = 0.4 + hash2(i, 171.0) * 0.5;
    pushInst("cliffs", [p.x, -0.35, p.z], rot(i, 172.0), 0, 0, [s, s * 0.6, s], [0.95, 0.95, 1.0, 1]);
  }

  for (let i = 0; i < 1100; i++) {
    const p = bankSpot(i, 15.0, 0.3, 16.0, 1.6);
    if (inClearing(p.x, p.z, 8.0) || !zoneChance(p.z, 0.8, 1.0, 0.15, hash2(i, 15.9))) continue;
    const sc = 0.7 + hash2(i, 16.3) * 0.9;
    pushInst("ferns", [p.x, p.y - 0.05, p.z], rot(i, 17.4), 0, 0, [sc, sc, sc], hash2(i, 18.0) < 0.8 ? CYAN : BLUE);
  }
  for (let i = 0; i < 800; i++) {
    const p = bankSpot(i, 20.0, 0.6, 18.0, 1.5);
    if (inClearing(p.x, p.z, 8.0) || !zoneChance(p.z, 0.15, 1.0, 0.5, hash2(i, 20.9))) continue;
    const sc = 0.8 + hash2(i, 21.3) * 1.2;
    pushInst("broadleaves", [p.x, p.y - 0.05, p.z], rot(i, 22.4), 0, 0, [sc, sc, sc], pickTint(hash2(i, 23.0)));
  }
  for (let i = 0; i < 900; i++) {
    const p = bankSpot(i, 25.0, -0.7, 3.0, 1.6);
    const sc = 0.75 + hash2(i, 26.6) * 0.8;
    pushInst("reeds", [p.x, Math.max(p.y, -0.3) - 0.05, p.z], rot(i, 27.7), 0, 0, [sc, sc, sc], hash2(i, 28.0) < 0.85 ? CYAN : VIOLET);
  }
  for (let i = 0; i < 450; i++) {
    const p = bankSpot(i, 30.0, 0.4, 8.0, 1.4);
    if (!zoneChance(p.z, 0.0, 1.0, 0.0, hash2(i, 30.9))) continue;
    const sc = 0.6 + hash2(i, 31.5) * 0.7;
    pushInst("buds", [p.x, p.y - 0.05, p.z], rot(i, 32.2), 0, 0, [sc, sc, sc], hash2(i, 33.0) < 0.7 ? BLUE : VIOLET);
  }
  for (let i = 0; i < 700; i++) {
    const p = bankSpot(i, 35.0, 0.8, 20.0, 1.3);
    if (!zoneChance(p.z, 0.1, 0.15, 1.0, hash2(i, 35.9))) continue;
    const sc = 0.6 + hash2(i, 36.4) * 0.6;
    pushInst("blossoms", [p.x, p.y - 0.05, p.z], rot(i, 37.8), 0, 0, [sc, sc, sc], hash2(i, 38.0) < 0.6 ? [1.0, 0.45, 0.12, 1] : [1.0, 0.8, 0.2, 1]);
  }
  for (let i = 0; i < 260; i++) {
    const p = bankSpot(i, 40.0, 0.6, 12.0, 1.3);
    if (inClearing(p.x, p.z, 6.0) || !zoneChance(p.z, 0.25, 1.0, 0.0, hash2(i, 40.9))) continue;
    const sc = 0.5 + hash2(i, 42.9) * 1.1;
    pushInst("mushrooms", [p.x, p.y - 0.1, p.z], rot(i, 43.5), 0, 0, [sc, sc, sc], hash2(i, 44.0) < 0.6 ? [1.0, 0.45, 0.12, 1] : BLUE);
  }
  // schwebende Quallen über dem Fluss, nur im Pilzwald
  for (let i = 0; i < 40; i++) {
    const z = -(i / 40) * L - hash2(i, 45.0) * 8.0;
    if (!zoneChance(z, 0.0, 1.0, 0.0, hash2(i, 45.5))) continue;
    const x = riverCenterX(z) + (hash2(i, 46.1) - 0.5) * 12.0;
    const y = 7.5 + hash2(i, 47.4) * 4.0;
    const sc = 0.55 + hash2(i, 48.7) * 0.55;
    pushInst("jellyfish", [x, y, z], rot(i, 49.2), 0, 0, [sc, sc, sc], hash2(i, 50.0) < 0.6 ? [0.2, 0.75, 1.0, 1] : [0.7, 0.3, 1.0, 1]);
  }

  // Lichtstrahlen: warm durch den Nebel im Tal, schwach im Pilzwald
  const lightShafts = [];
  for (let i = 0; i < 22; i++) {
    const z = -(i / 22) * L * 0.68 - 6.0;
    const x = riverCenterX(z) + (hash2(i, 51.2) - 0.5) * 12.0;
    const model = Mat4.create();
    Mat4.compose(model, [x, terrainHeight(x, z), z], 0, 0.12, 0.2, [1.0, 1.0, 1.0]);
    lightShafts.push({ model, z, color: [0.35, 0.6, 1.0, 1] });
  }

  // Leuchtpunkte am Waldboden, in Flecken gehäuft, nach z sortiert
  const dots = [];
  let tries = 0;
  while (dots.length < 30000 && tries < 400000) {
    const i = tries++;
    const p = bankSpot(i, 60.0, -0.3, 22.0, 1.8);
    if (p.y < 0.02 || zoneWeights(p.z, zw)[2] > 0.5) continue;
    const patch = pnoise(p.x, p.z, 0.2, 2);
    if (patch < 0.48 + hash2(i, 61.0) * 0.12) continue;
    const h = hash2(i, 62.0);
    const c = h < 0.6 ? [0.05, 0.7, 1.0] : h < 0.9 ? [0.1, 0.35, 1.0] : [0.7, 0.25, 1.0];
    const size = 0.5 + hash2(i, 63.0) * 1.2;
    dots.push([p.x, p.y + 0.04, p.z, c[0], c[1], c[2], size]);
  }
  dots.sort((a, b) => b[2] - a[2]);
  const dotData = new Float32Array(dots.length * 7);
  const dotZ = new Float32Array(dots.length);
  dots.forEach((d, i) => { dotData.set(d, i * 7); dotZ[i] = d[2]; });
  const dotVao = gl.createVertexArray();
  gl.bindVertexArray(dotVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, dotData, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 12);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 28, 24);
  gl.bindVertexArray(null);

  // Glühwürmchen und schwebende Samen
  const pCount = 1400;
  const pData = new Float32Array(pCount * 7);
  for (let i = 0; i < pCount; i++) {
    const s2 = hash2(i, 52.7);
    const violet = s2 > 0.8;
    pData.set([hash2(i, 51.3), s2, hash2(i, 53.9), violet ? 0.8 : 0.35, violet ? 0.35 : 0.9, 1.0, 0.6 + hash2(i, 54.1) * 1.2], i * 7);
  }
  const pVao = gl.createVertexArray();
  gl.bindVertexArray(pVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, pData, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 12);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 28, 24);
  gl.bindVertexArray(null);

  const inst = (name, builder, margin) => {
    const g = group(name);
    return uploadInstancedMesh(gl, builder, new Float32Array(g.mats), new Float32Array(g.tints), margin);
  };
  return {
    valleyMesh, waterMesh, skyDomeMesh, archMesh, archZ, archModel, mountainMesh, floatingPeaks,
    cliffHousingMesh, bankCliffHousings, plungeRippleMesh, plungeRipples, waterfallMesh, waterfalls,
    shaftMesh, lightShafts,
    instGroups: [
      inst("cliffs", buildRockCliffMesh(), 10.0),
      inst("pines", buildPineMesh(), 12.0),
      inst("giantMushrooms", buildGiantMushroomMeshV2(), 16.0),
      inst("roundTrees", buildRoundTreeMesh(), 14.0),
      inst("ferns", buildFernRosetteMesh(), 2.0),
      inst("broadleaves", buildBroadLeafPlantMesh(), 3.0),
      inst("reeds", buildReedClusterMesh(), 2.0),
      inst("buds", buildGlowBudClusterMesh(), 2.0),
      inst("blossoms", buildGoldenBlossomMesh(), 2.0),
      inst("mushrooms", buildGiantMushroomMesh(), 4.0),
      inst("jellyfish", buildCanopyJellyfishMesh(), 3.0),
      inst("castles", buildCastleRuinMesh(), 40.0),
      inst("ruinArches", buildRuinArchMesh(), 12.0),
      inst("lanterns", buildLanternPostMesh(), 2.0),
      inst("tentacles", buildTentacleMesh(), 4.0),
      inst("orbs", buildOrbMesh(), 2.0),
      inst("spires", buildSpireTowerMesh(), 12.0)
    ],
    dotVao, dotZ, dotCount: dots.length,
    particleVao: pVao,
    particleCount: pCount
  };
}

const world = buildWorld();
