// world.js: Welt: Platzierung aller Objekte entlang der Strecke
// --- World Population ---
function buildWorld() {
  const valleyMesh = uploadStaticMesh(gl, buildValleyTerrainMesh());
  const waterMesh = uploadStaticMesh(gl, buildWaterSurfaceMesh());
  const skyDomeMesh = uploadStaticMesh(gl, buildSkyDomeMesh());
  const cliffHousingMesh = uploadStaticMesh(gl, buildWaterfallCliffHousingMesh());
  const mountainMesh = uploadStaticMesh(gl, buildFloatingMountainMesh());
  const archMesh = uploadStaticMesh(gl, buildStoneArchMesh());
  const waterfallMesh = uploadStaticMesh(gl, buildWaterfallRibbonMesh());
  const plungeRippleMesh = uploadStaticMesh(gl, buildPlungeRippleMesh());
  const shaftMesh = uploadStaticMesh(gl, buildLightShaftMesh());

  const archZ = -168.0;
  const archModel = Mat4.create();
  Mat4.compose(archModel, [riverCenterX(archZ), 0.0, archZ], -riverSlopeX(archZ) * 0.65, 0, 0, [1.05, 1.0, 1.15]);

  // Floating Hallelujah mountains
  const floatingPeaks = [
    { z: -92.0, offsetX: -14.5, y: 17.5, sx: 8.8, sy: 12.5, sz: 8.2, fallOffsetX: 1.8 },
    { z: -215.0, offsetX: 15.5, y: 19.2, sx: 9.6, sy: 13.8, sz: 8.8, fallOffsetX: -1.9 },
    { z: -312.0, offsetX: -12.0, y: 16.8, sx: 8.2, sy: 11.8, sz: 7.8, fallOffsetX: 1.6 }
  ];

  // Bank cliffs & waterfalls: water emerges inside the cliff niche (facing +Z toward river) and hits y=0
  const waterfalls = [];
  const bankCliffHousings = [];
  const plungeRipples = [];
  const bankFallZones = [-74.0, -86.0, -244.0, -256.0];

  bankFallZones.forEach((fz, idx) => {
    const side = idx % 2 === 0 ? -1 : 1;
    const cx = riverCenterX(fz);
    const hw = riverHalfWidth(fz);
    const cliffX = cx + side * (hw + 1.8);
    // Face inward toward river center
    const yaw = side < 0 ? Math.PI * 0.42 : -Math.PI * 0.42;
    const cliffHeight = 9.0;

    const dirX = Math.sin(yaw);
    const dirZ = Math.cos(yaw);
    const crestX = cliffX + dirX * 0.25;
    const crestZ = fz + dirZ * 0.25;
    const dropLen = cliffHeight - 0.55;
    const splashX = crestX + dirX * 0.85;
    const splashZ = crestZ + dirZ * 0.85;

    bankCliffHousings.push({ x: cliffX, y: -0.6, z: fz, rotY: yaw, sx: 4.8, sy: cliffHeight + 1.2, sz: 3.4 });
    waterfalls.push({
      x: crestX,
      y: cliffHeight - 0.55,
      z: crestZ,
      rotY: yaw,
      sx: 2.9,
      sy: dropLen,
      sz: 1.8,
      isSkyFall: false
    });
    plungeRipples.push({ x: splashX, y: 0.02, z: splashZ, sx: 3.4, sz: 3.0 });
  });

  // Sky waterfalls emerging from floating mountain lower ledges
  floatingPeaks.forEach((pk, idx) => {
    const baseX = riverCenterX(pk.z) + pk.offsetX;
    const startY = pk.y - pk.sy * 0.12;
    waterfalls.push({
      x: baseX + pk.fallOffsetX,
      y: startY,
      z: pk.z + 1.6,
      rotY: 0.0,
      sx: 1.45,
      sy: startY,
      sz: 1.2,
      isSkyFall: true,
      peakIdx: idx,
      baseY: startY
    });
  });

  // Instanced flora & cliffs
  const cliffMats = [], cliffTints = [];
  const treeMats = [], treeTints = [];
  const fernMats = [], fernTints = [];
  const reedMats = [], reedTints = [];
  const budMats = [], budTints = [];
  const blossomMats = [], blossomTints = [];
  const mushMats = [], mushTints = [];
  const jellyMats = [], jellyTints = [];

  function pushInst(mats, tints, pos, rotY, rotX, rotZ, scale, tint) {
    const m = Mat4.create();
    Mat4.compose(m, pos, rotY, rotX, rotZ, scale);
    for (let i = 0; i < 16; i++) mats.push(m[i]);
    tints.push(tint[0], tint[1], tint[2], tint[3]);
  }

  for (let i = 0; i < 72; i++) {
    const t = i / 72;
    const z = -t * LOOP_LENGTH;
    const side = i % 2 === 0 ? -1 : 1;
    const cx = riverCenterX(z);
    const hw = riverHalfWidth(z);
    const dist = hw + 2.2 + hash2(i, 1.3) * 8.5;
    const x = cx + side * dist;
    const groundY = Math.pow(Math.max(0, dist - hw) / 16.0, 1.35) * 4.4 - 0.5;
    const s = 3.2 + hash2(i, 2.7) * 5.6;
    pushInst(cliffMats, cliffTints, [x, groundY, z], hash2(i, 3.1) * Math.PI * 2, 0, 0, [s, s * (0.75 + hash2(i, 4.9) * 0.7), s * 0.9], [0.9, 1.0, 1.15, 1]);
  }

  for (let i = 0; i < 64; i++) {
    const t = i / 64;
    const z = -t * LOOP_LENGTH;
    const side = i % 2 === 0 ? -1 : 1;
    const cx = riverCenterX(z);
    const hw = riverHalfWidth(z);
    const dist = hw + 3.0 + hash2(i, 5.2) * 11.0;
    const x = cx + side * dist;
    const groundY = Math.pow(Math.max(0, dist - hw) / 16.0, 1.35) * 4.4 - 0.35;
    const h = 7.5 + hash2(i, 6.4) * 6.5;
    const r = 1.1 + hash2(i, 7.8) * 0.7;
    const vineTint = i % 3 === 0 ? [0.18, 0.92, 0.96, 1] : [0.78, 0.28, 0.98, 1];
    pushInst(treeMats, treeTints, [x, groundY, z], hash2(i, 8.1) * Math.PI * 2, 0, 0, [r, h, r], vineTint);
  }

  for (let i = 0; i < 240; i++) {
    const t = i / 240;
    const z = -t * LOOP_LENGTH;
    const side = i % 2 === 0 ? -1 : 1;
    const cx = riverCenterX(z);
    const hw = riverHalfWidth(z);
    const dist = hw + 0.6 + hash2(i, 10.1) * 5.2;
    const x = cx + side * dist;
    const y = Math.pow(Math.max(0, dist - hw) / 16.0, 1.35) * 4.4 - 0.15;
    const sc = 0.7 + hash2(i, 11.3) * 0.75;
    pushInst(fernMats, fernTints, [x, y, z], hash2(i, 12.4) * Math.PI * 2, 0, 0, [sc, sc, sc], [0.12, 0.88, 0.82, 1]);
  }

  for (let i = 0; i < 180; i++) {
    const t = i / 180;
    const z = -t * LOOP_LENGTH;
    const side = i % 2 === 0 ? -1 : 1;
    const cx = riverCenterX(z);
    const hw = riverHalfWidth(z);
    const dist = hw - 0.35 + hash2(i, 14.2) * 1.4;
    const x = cx + side * dist;
    const y = -0.05;
    const sc = 0.75 + hash2(i, 15.6) * 0.7;
    pushInst(reedMats, reedTints, [x, y, z], hash2(i, 16.7) * Math.PI * 2, 0, 0, [sc, sc, sc], [0.14, 0.92, 0.98, 1]);
  }

  for (let i = 0; i < 130; i++) {
    const t = i / 130;
    const z = -t * LOOP_LENGTH;
    const side = i % 2 === 0 ? -1 : 1;
    const cx = riverCenterX(z);
    const hw = riverHalfWidth(z);
    const dist = hw + 0.5 + hash2(i, 18.1) * 3.4;
    const x = cx + side * dist;
    const y = Math.pow(Math.max(0, dist - hw) / 16.0, 1.35) * 4.4 - 0.1;
    const sc = 0.65 + hash2(i, 19.5) * 0.65;
    pushInst(budMats, budTints, [x, y, z], hash2(i, 20.2) * Math.PI * 2, 0, 0, [sc, sc, sc], [0.08, 0.92, 1.0, 1]);
  }

  for (let i = 0; i < 75; i++) {
    const t = i / 75;
    const z = -t * LOOP_LENGTH;
    const side = i % 2 === 0 ? -1 : 1;
    const cx = riverCenterX(z);
    const hw = riverHalfWidth(z);
    const dist = hw + 1.2 + hash2(i, 22.1) * 4.5;
    const x = cx + side * dist;
    const y = Math.pow(Math.max(0, dist - hw) / 16.0, 1.35) * 4.4 - 0.1;
    const sc = 0.7 + hash2(i, 23.4) * 0.6;
    pushInst(blossomMats, blossomTints, [x, y, z], hash2(i, 24.8) * Math.PI * 2, 0, 0, [sc, sc, sc], [1.0, 0.52, 0.14, 1]);
  }

  for (let i = 0; i < 68; i++) {
    const t = i / 68;
    const z = -t * LOOP_LENGTH;
    const side = i % 2 === 0 ? -1 : 1;
    const cx = riverCenterX(z);
    const hw = riverHalfWidth(z);
    const dist = hw + 1.4 + hash2(i, 26.2) * 5.2;
    const x = cx + side * dist;
    const y = Math.pow(Math.max(0, dist - hw) / 16.0, 1.35) * 4.4 - 0.15;
    const sc = 0.8 + hash2(i, 27.9) * 1.1;
    const mTint = i % 2 === 0 ? [0.76, 0.24, 0.98, 1] : [0.16, 0.86, 0.98, 1];
    pushInst(mushMats, mushTints, [x, y, z], hash2(i, 28.5) * Math.PI * 2, 0, 0, [sc, sc, sc], mTint);
  }

  // Canopy jellyfish floating overhead along the river corridor
  for (let i = 0; i < 24; i++) {
    const z = -18.0 - i * 14.5;
    const cx = riverCenterX(z);
    const x = cx + (hash2(i, 31.1) - 0.5) * 6.5;
    const y = 6.2 + hash2(i, 32.4) * 2.8;
    const sc = 1.15 + hash2(i, 33.7) * 0.85;
    const jTint = i % 3 === 0 ? [0.24, 0.86, 1.0, 1] : [0.85, 0.26, 0.98, 1];
    pushInst(jellyMats, jellyTints, [x, y, z], hash2(i, 34.2) * Math.PI * 2, 0, 0, [sc, sc, sc], jTint);
  }

  const lightShafts = [];
  for (let i = 0; i < 28; i++) {
    const z = -12.0 - i * 12.5;
    const x = riverCenterX(z) + (hash2(i, 41.2) - 0.5) * 9.0;
    const model = Mat4.create();
    Mat4.compose(model, [x, 0.0, z], 0, 0, 0.16, [1.0, 1.0, 1.0]);
    const col = i % 3 === 0 ? [0.68, 0.32, 1.0, 1] : [0.18, 0.85, 1.0, 1];
    lightShafts.push({ model, color: col });
  }

  // Particles (woodsprites & mist spores)
  const pCount = 650;
  const pData = new Float32Array(pCount * 7);
  for (let i = 0; i < pCount; i++) {
    const s1 = hash2(i, 51.3);
    const s2 = hash2(i, 52.7);
    const s3 = hash2(i, 53.9);
    const isViolet = s2 > 0.62;
    const rCol = isViolet ? 0.85 : 0.22;
    const gCol = isViolet ? 0.35 : 0.94;
    const bCol = isViolet ? 1.0 : 1.0;
    const size = 0.8 + s3 * 1.4;
    const o = i * 7;
    pData[o + 0] = s1;
    pData[o + 1] = s2;
    pData[o + 2] = s3;
    pData[o + 3] = rCol;
    pData[o + 4] = gCol;
    pData[o + 5] = bCol;
    pData[o + 6] = size;
  }

  const pVao = gl.createVertexArray();
  gl.bindVertexArray(pVao);
  const pBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pBuf);
  gl.bufferData(gl.ARRAY_BUFFER, pData, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 12);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 28, 24);
  gl.bindVertexArray(null);

  return {
    valleyMesh,
    waterMesh,
    skyDomeMesh,
    archMesh,
    archModel,
    mountainMesh,
    floatingPeaks,
    cliffHousingMesh,
    bankCliffHousings,
    plungeRippleMesh,
    plungeRipples,
    waterfallMesh,
    waterfalls,
    shaftMesh,
    lightShafts,
    cliffs: uploadInstancedMesh(gl, buildRockCliffMesh(), new Float32Array(cliffMats), new Float32Array(cliffTints)),
    trees: uploadInstancedMesh(gl, buildJungleTreeMesh(), new Float32Array(treeMats), new Float32Array(treeTints)),
    ferns: uploadInstancedMesh(gl, buildFernRosetteMesh(), new Float32Array(fernMats), new Float32Array(fernTints)),
    reeds: uploadInstancedMesh(gl, buildReedClusterMesh(), new Float32Array(reedMats), new Float32Array(reedTints)),
    buds: uploadInstancedMesh(gl, buildGlowBudClusterMesh(), new Float32Array(budMats), new Float32Array(budTints)),
    blossoms: uploadInstancedMesh(gl, buildGoldenBlossomMesh(), new Float32Array(blossomMats), new Float32Array(blossomTints)),
    mushrooms: uploadInstancedMesh(gl, buildGiantMushroomMesh(), new Float32Array(mushMats), new Float32Array(mushTints)),
    jellyfish: uploadInstancedMesh(gl, buildCanopyJellyfishMesh(), new Float32Array(jellyMats), new Float32Array(jellyTints)),
    particleVao: pVao,
    particleCount: pCount
  };
}

const world = buildWorld();
