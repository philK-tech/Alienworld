// world.js: Welt: Platzierung aller Objekte entlang der Strecke
// --- World Population ---
// Stellen der Strecke, an denen Tiere auftauchen (z in Weltkoordinaten der Schleife), siehe creatures.js
const EVENTS = {
  flocks: [{ z: -55, side: 1 }, { z: -215, side: -1 }, { z: -372, side: 1 }],
  fish: [-28, -132, -168, -248, -300, -345, -440],
  longnecks: [{ z: -100, side: -1 }, { z: -282, side: 1 }, { z: -418, side: -1 }]
};
// Standort eines Langhalses (i = 0 erwachsenes Tier, i = 1 Jungtier)
function longneckSpot(ev, i) {
  const z = ev.z + i * 4.5;
  const x = riverCenterX(z) + ev.side * (riverHalfWidth(ev.z) + 2.6 + i * 1.5);
  return { x, z, y: terrainHeight(x, z) - 0.1 };
}
// Lichtungen um die Langhälse: dort wachsen keine Bäume, Felsen oder großen Pflanzen
const CLEARINGS = EVENTS.longnecks.map((ev) => {
  const a = longneckSpot(ev, 0), b = longneckSpot(ev, 1);
  return { x: (a.x + b.x) * 0.5, z: (a.z + b.z) * 0.5 };
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

  // Schwebende Berge: drei nahe mit Wasserfällen, viele ferne als Silhouetten im Dunst
  const floatingPeaks = [
    { z: -112.0, offsetX: -26.0, y: 25.0, sx: 11.0, sy: 15.0, sz: 10.0, fall: true },
    { z: -262.0, offsetX: 28.0, y: 28.0, sx: 12.0, sy: 16.5, sz: 10.5, fall: true },
    { z: -398.0, offsetX: -23.0, y: 23.0, sx: 10.0, sy: 14.0, sz: 9.0, fall: true }
  ];
  for (let i = 0; i < 14; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const s = 16.0 + hash2(i, 71.0) * 22.0;
    floatingPeaks.push({
      z: -(i / 14) * L - hash2(i, 72.0) * 20.0,
      offsetX: side * (55.0 + hash2(i, 73.0) * 75.0),
      y: 32.0 + hash2(i, 74.0) * 40.0,
      sx: s, sy: s * (1.2 + hash2(i, 75.0) * 0.5), sz: s * 0.9,
      fall: false
    });
  }
  floatingPeaks.forEach((pk, idx) => { pk.x = riverCenterX(pk.z) + pk.offsetX; pk.rot = idx * 1.4; });

  // Uferklippen mit Wasserfällen: das Wasser tritt in der Nische aus und fällt bis y=0
  const waterfalls = [];
  const bankCliffHousings = [];
  const plungeRipples = [];
  const bankFallZones = [-70.0, -84.0, -318.0, -332.0];

  bankFallZones.forEach((fz, idx) => {
    const side = idx % 2 === 0 ? -1 : 1;
    const cx = riverCenterX(fz);
    const hw = riverHalfWidth(fz);
    const cliffX = cx + side * (hw + 1.8);
    const yaw = side < 0 ? Math.PI * 0.42 : -Math.PI * 0.42;
    const cliffHeight = 10.0;
    const dirX = Math.sin(yaw);
    const dirZ = Math.cos(yaw);
    const crestX = cliffX + dirX * 0.25;
    const crestZ = fz + dirZ * 0.25;
    bankCliffHousings.push({ x: cliffX, y: -0.6, z: fz, rotY: yaw, sx: 4.8, sy: cliffHeight + 1.2, sz: 3.4 });
    waterfalls.push({ x: crestX, y: cliffHeight - 0.55, z: crestZ, rotY: yaw, sx: 2.9, sy: cliffHeight - 0.55, sz: 1.8, isSkyFall: false });
    plungeRipples.push({ x: crestX + dirX * 0.85, y: 0.02, z: crestZ + dirZ * 0.85, sx: 3.4, sz: 3.0 });
  });

  // Wasserfälle, die aus den nahen schwebenden Bergen stürzen
  floatingPeaks.forEach((pk, idx) => {
    if (!pk.fall) return;
    const startY = pk.y - pk.sy * 0.12;
    const fx = pk.x + (pk.offsetX < 0 ? 2.0 : -2.0);
    const groundY = terrainHeight(fx, pk.z + 1.6);
    waterfalls.push({ x: fx, y: startY, z: pk.z + 1.6, rotY: 0.0, sx: 1.6, sy: startY - groundY, sz: 1.2, isSkyFall: true, peakIdx: idx, groundY });
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
    const dist = hw + dMin + Math.pow(hash2(i, salt + 1.1), bias) * (dMax - dMin);
    const x = riverCenterX(z) + side * dist;
    return { x, z, y: terrainHeight(x, z), side };
  }
  const CYAN = [0.10, 0.85, 1.0, 1], BLUE = [0.15, 0.45, 1.0, 1], VIOLET = [0.75, 0.28, 1.0, 1];
  const pickTint = (h) => (h < 0.55 ? CYAN : h < 0.85 ? BLUE : VIOLET);

  for (let i = 0; i < 130; i++) {
    const p = bankSpot(i, 1.0, -0.8, 22.0, 1.3);
    if (inClearing(p.x, p.z, 9.0)) continue;
    // Felsen dürfen nicht in die Fahrrinne ragen: Radius kleiner als Abstand zur Flussmitte minus 3,5
    const free = Math.abs(p.x - riverCenterX(p.z)) - 3.5;
    const s = Math.min(2.0 + hash2(i, 2.7) * 6.0, free / 1.25);
    if (s < 0.6) continue;
    pushInst("cliffs", [p.x, p.y - 0.4, p.z], hash2(i, 3.1) * Math.PI * 2, 0, 0, [s, s * (0.6 + hash2(i, 4.9) * 0.8), s * 0.9], [0.9, 1.0, 1.15, 1]);
  }
  for (let i = 0; i < 230; i++) {
    const p = bankSpot(i, 5.0, 2.6, 16.0, 1.2);
    if (inClearing(p.x, p.z, 11.0)) continue;
    const h = 9.0 + hash2(i, 6.4) * 7.0;
    const r = 1.0 + hash2(i, 7.8) * 0.7;
    pushInst("trees", [p.x, p.y - 0.2, p.z], hash2(i, 8.1) * Math.PI * 2, 0, 0, [r, h, r], pickTint(hash2(i, 9.0)));
  }
  for (let i = 0; i < 150; i++) {
    const p = bankSpot(i, 10.0, 16.0, 75.0, 1.1);
    if (inClearing(p.x, p.z, 9.0)) continue;
    const h = 20.0 + hash2(i, 11.4) * 16.0;
    const r = 2.3 + hash2(i, 12.8) * 1.8;
    pushInst("giants", [p.x, p.y - 0.3, p.z], hash2(i, 13.1) * Math.PI * 2, 0, 0, [r, h, r], pickTint(hash2(i, 14.0)));
  }
  for (let i = 0; i < 1100; i++) {
    const p = bankSpot(i, 15.0, 0.3, 16.0, 1.6);
    if (inClearing(p.x, p.z, 3.5)) continue;
    const sc = 0.7 + hash2(i, 16.3) * 0.9;
    pushInst("ferns", [p.x, p.y - 0.05, p.z], hash2(i, 17.4) * Math.PI * 2, 0, 0, [sc, sc, sc], hash2(i, 18.0) < 0.8 ? CYAN : BLUE);
  }
  for (let i = 0; i < 800; i++) {
    const p = bankSpot(i, 20.0, 0.6, 18.0, 1.5);
    if (inClearing(p.x, p.z, 5.0)) continue;
    const sc = 0.8 + hash2(i, 21.3) * 1.2;
    pushInst("broadleaves", [p.x, p.y - 0.05, p.z], hash2(i, 22.4) * Math.PI * 2, 0, 0, [sc, sc, sc], pickTint(hash2(i, 23.0)));
  }
  for (let i = 0; i < 650; i++) {
    const p = bankSpot(i, 25.0, -0.7, 1.4, 1.0);
    const sc = 0.75 + hash2(i, 26.6) * 0.8;
    pushInst("reeds", [p.x, Math.max(p.y, -0.3) - 0.05, p.z], hash2(i, 27.7) * Math.PI * 2, 0, 0, [sc, sc, sc], hash2(i, 28.0) < 0.85 ? CYAN : VIOLET);
  }
  for (let i = 0; i < 450; i++) {
    const p = bankSpot(i, 30.0, 0.4, 8.0, 1.4);
    const sc = 0.6 + hash2(i, 31.5) * 0.7;
    pushInst("buds", [p.x, p.y - 0.05, p.z], hash2(i, 32.2) * Math.PI * 2, 0, 0, [sc, sc, sc], hash2(i, 33.0) < 0.7 ? CYAN : VIOLET);
  }
  for (let i = 0; i < 160; i++) {
    const p = bankSpot(i, 35.0, 0.8, 9.0, 1.3);
    const sc = 0.6 + hash2(i, 36.4) * 0.6;
    pushInst("blossoms", [p.x, p.y - 0.05, p.z], hash2(i, 37.8) * Math.PI * 2, 0, 0, [sc, sc, sc], [1.0, 0.45, 0.12, 1]);
  }
  for (let i = 0; i < 150; i++) {
    const p = bankSpot(i, 40.0, 1.0, 12.0, 1.3);
    if (inClearing(p.x, p.z, 6.0)) continue;
    const big = hash2(i, 41.0) < 0.2;
    const sc = big ? 2.2 + hash2(i, 42.9) * 1.5 : 0.7 + hash2(i, 42.9) * 1.0;
    pushInst("mushrooms", [p.x, p.y - 0.1, p.z], hash2(i, 43.5) * Math.PI * 2, 0, 0, [sc, sc, sc], hash2(i, 44.0) < 0.5 ? VIOLET : CYAN);
  }
  // schwebende Quallen über dem Fluss
  for (let i = 0; i < 30; i++) {
    const z = -(i / 30) * L - hash2(i, 45.0) * 8.0;
    const x = riverCenterX(z) + (hash2(i, 46.1) - 0.5) * 12.0;
    const y = 7.5 + hash2(i, 47.4) * 4.0;
    const sc = 0.55 + hash2(i, 48.7) * 0.55;
    pushInst("jellyfish", [x, y, z], hash2(i, 49.2) * Math.PI * 2, 0, 0, [sc, sc, sc], hash2(i, 50.0) < 0.6 ? [0.2, 0.75, 1.0, 1] : [0.7, 0.3, 1.0, 1]);
  }

  const lightShafts = [];
  for (let i = 0; i < 16; i++) {
    const z = -(i / 16) * L - 10.0;
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
    if (p.y < 0.02) continue;
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
  const treeMesh = buildJungleTreeMesh();
  return {
    valleyMesh, waterMesh, skyDomeMesh, archMesh, archZ, archModel, mountainMesh, floatingPeaks,
    cliffHousingMesh, bankCliffHousings, plungeRippleMesh, plungeRipples, waterfallMesh, waterfalls,
    shaftMesh, lightShafts,
    instGroups: [
      inst("cliffs", buildRockCliffMesh(), 10.0),
      inst("trees", treeMesh, 8.0),
      inst("giants", treeMesh, 14.0),
      inst("ferns", buildFernRosetteMesh(), 2.0),
      inst("broadleaves", buildBroadLeafPlantMesh(), 3.0),
      inst("reeds", buildReedClusterMesh(), 2.0),
      inst("buds", buildGlowBudClusterMesh(), 2.0),
      inst("blossoms", buildGoldenBlossomMesh(), 2.0),
      inst("mushrooms", buildGiantMushroomMesh(), 4.0),
      inst("jellyfish", buildCanopyJellyfishMesh(), 3.0)
    ],
    dotVao, dotZ, dotCount: dots.length,
    particleVao: pVao,
    particleCount: pCount
  };
}

const world = buildWorld();
