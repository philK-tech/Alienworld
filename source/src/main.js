// main.js: Zustand, Steuerung und Render-Loop
// --- State & Controls ---
const state = {
  running: true,
  time: 0.0,
  travelDist: 0.0,
  lastFrame: performance.now()
};

function toggleRun() {
  state.running = !state.running;
  btnToggle.textContent = state.running ? "Stop" : "Start";
  state.lastFrame = performance.now();
}

btnToggle.addEventListener("click", toggleRun);
btnAudio.addEventListener("click", () => setAudio(!audioEnabled));
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    toggleRun();
  } else if (e.key === "m" || e.key === "M") {
    setAudio(!audioEnabled);
  }
});

function updateChapterLabel(zMod) {
  let label = "Schlucht der Leuchtenden Wasserfälle";
  if (zMod > 120 && zMod <= 240) {
    label = "Kronendach der Violetten Quallenpilze";
  } else if (zMod > 240) {
    label = "Lagune der Schwebenden Hallelujah-Berge";
  }
  if (chapterEl.textContent !== label) {
    chapterEl.textContent = label;
  }
}

// --- Render Loop ---
const viewMat = Mat4.create();
const projMat = Mat4.create();
const viewProjMat = Mat4.create();
const identityMat = Mat4.create();
const tempModelMat = Mat4.create();

function bindOpaqueUniforms(modelMat, tint, instanced) {
  gl.uniformMatrix4fv(gl.getUniformLocation(progOpaque, "uViewProj"), false, viewProjMat);
  gl.uniformMatrix4fv(gl.getUniformLocation(progOpaque, "uModel"), false, modelMat);
  gl.uniform4fv(gl.getUniformLocation(progOpaque, "uTint"), tint);
  gl.uniform1f(gl.getUniformLocation(progOpaque, "uTime"), state.time);
  gl.uniform3f(gl.getUniformLocation(progOpaque, "uCamPos"), camEye[0], camEye[1], camEye[2]);
  gl.uniform1f(gl.getUniformLocation(progOpaque, "uInstanced"), instanced);
}

function bindFxUniforms(modelMat, tint) {
  gl.uniformMatrix4fv(gl.getUniformLocation(progFx, "uViewProj"), false, viewProjMat);
  gl.uniformMatrix4fv(gl.getUniformLocation(progFx, "uModel"), false, modelMat);
  gl.uniform4fv(gl.getUniformLocation(progFx, "uTint"), tint);
  gl.uniform1f(gl.getUniformLocation(progFx, "uTime"), state.time);
  gl.uniform3f(gl.getUniformLocation(progFx, "uCamPos"), camEye[0], camEye[1], camEye[2]);
}

const camEye = [0, 2.2, 0];
const camTarget = [0, 2.4, -14];

function render(now) {
  const dt = Math.min((now - state.lastFrame) * 0.001, 0.05);
  state.lastFrame = now;
  if (state.running) {
    state.time += dt;
    state.travelDist += dt * 4.6;
  }

  const zCur = -state.travelDist;
  const zMod = ((state.travelDist % LOOP_LENGTH) + LOOP_LENGTH) % LOOP_LENGTH;
  updateChapterLabel(zMod);

  const swayX = Math.sin(state.time * 0.45) * 1.35;
  const bobY = 2.15 + Math.sin(state.time * 0.85) * 0.16;
  camEye[0] = riverCenterX(zCur) + swayX;
  camEye[1] = bobY;
  camEye[2] = zCur;

  const lookZ = zCur - 16.0;
  const lookSway = Math.cos(state.time * 0.32) * 2.2;
  const lookY = 2.55 + Math.sin(state.time * 0.38) * 0.75;
  camTarget[0] = riverCenterX(lookZ) + lookSway;
  camTarget[1] = lookY;
  camTarget[2] = lookZ;

  const aspect = canvas.width / Math.max(canvas.height, 1);
  Mat4.perspective(projMat, (56 * Math.PI) / 180, aspect, 0.2, 340.0);
  Mat4.lookAt(viewMat, camEye, camTarget, [0, 1, 0]);
  Mat4.multiply(viewProjMat, projMat, viewMat);

  // 1. Scene Pass into offscreen target
  gl.bindFramebuffer(gl.FRAMEBUFFER, sceneFbo);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.01, 0.02, 0.045, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);

  gl.useProgram(progOpaque);

  // Sky dome
  gl.depthMask(false);
  gl.bindVertexArray(world.skyDomeMesh.vao);
  bindOpaqueUniforms(identityMat, [1, 1, 1, 1], 0.0);
  gl.drawElements(gl.TRIANGLES, world.skyDomeMesh.indexCount, gl.UNSIGNED_INT, 0);
  gl.depthMask(true);

  // Valley terrain & water
  gl.bindVertexArray(world.valleyMesh.vao);
  bindOpaqueUniforms(identityMat, [1, 1, 1, 1], 0.0);
  gl.drawElements(gl.TRIANGLES, world.valleyMesh.indexCount, gl.UNSIGNED_INT, 0);

  gl.bindVertexArray(world.waterMesh.vao);
  bindOpaqueUniforms(identityMat, [1, 1, 1, 1], 0.0);
  gl.drawElements(gl.TRIANGLES, world.waterMesh.indexCount, gl.UNSIGNED_INT, 0);

  // Stone arch
  gl.bindVertexArray(world.archMesh.vao);
  bindOpaqueUniforms(world.archModel, [0.92, 1.0, 1.12, 1], 0.0);
  gl.drawElements(gl.TRIANGLES, world.archMesh.indexCount, gl.UNSIGNED_INT, 0);

  // Bank waterfall cliff housings
  gl.bindVertexArray(world.cliffHousingMesh.vao);
  for (const ch of world.bankCliffHousings) {
    Mat4.compose(tempModelMat, [ch.x, ch.y, ch.z], ch.rotY, 0, 0, [ch.sx, ch.sy, ch.sz]);
    bindOpaqueUniforms(tempModelMat, [0.88, 0.98, 1.14, 1], 0.0);
    gl.drawElements(gl.TRIANGLES, world.cliffHousingMesh.indexCount, gl.UNSIGNED_INT, 0);
  }

  // Floating Hallelujah mountains
  gl.bindVertexArray(world.mountainMesh.vao);
  world.floatingPeaks.forEach((pk, idx) => {
    const bob = Math.sin(state.time * 0.55 + idx * 2.1) * 0.45;
    const bx = riverCenterX(pk.z) + pk.offsetX;
    Mat4.compose(tempModelMat, [bx, pk.y + bob, pk.z], idx * 1.4, 0, 0, [pk.sx, pk.sy, pk.sz]);
    bindOpaqueUniforms(tempModelMat, [0.92, 1.0, 1.15, 1], 0.0);
    gl.drawElements(gl.TRIANGLES, world.mountainMesh.indexCount, gl.UNSIGNED_INT, 0);
  });

  // Instanced flora & cliffs
  const instGroups = [
    world.cliffs,
    world.trees,
    world.ferns,
    world.reeds,
    world.buds,
    world.blossoms,
    world.mushrooms,
    world.jellyfish
  ];
  for (const grp of instGroups) {
    gl.bindVertexArray(grp.vao);
    bindOpaqueUniforms(identityMat, [1, 1, 1, 1], 1.0);
    gl.drawElementsInstanced(gl.TRIANGLES, grp.indexCount, gl.UNSIGNED_INT, 0, grp.instanceCount);
  }

  // Additive FX: Waterfalls, Plunge Ripples, Light Shafts & Particles
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.depthMask(false);

  gl.useProgram(progFx);
  gl.bindVertexArray(world.waterfallMesh.vao);
  for (const wf of world.waterfalls) {
    const bob = wf.isSkyFall ? Math.sin(state.time * 0.55 + wf.peakIdx * 2.1) * 0.45 : 0.0;
    const curY = wf.y + bob;
    const curScaleY = wf.isSkyFall ? Math.max(0.5, wf.baseY + bob) : wf.sy;
    Mat4.compose(tempModelMat, [wf.x, curY, wf.z], wf.rotY, 0, 0, [wf.sx, curScaleY, wf.sz]);
    bindFxUniforms(tempModelMat, [0.35, 0.92, 1.0, 1.0]);
    gl.drawElements(gl.TRIANGLES, world.waterfallMesh.indexCount, gl.UNSIGNED_INT, 0);
  }

  gl.bindVertexArray(world.plungeRippleMesh.vao);
  for (const rp of world.plungeRipples) {
    Mat4.compose(tempModelMat, [rp.x, rp.y, rp.z], 0, 0, 0, [rp.sx, 1.0, rp.sz]);
    bindFxUniforms(tempModelMat, [0.3, 0.92, 1.0, 1.0]);
    gl.drawElements(gl.TRIANGLES, world.plungeRippleMesh.indexCount, gl.UNSIGNED_INT, 0);
  }

  gl.bindVertexArray(world.shaftMesh.vao);
  for (const sh of world.lightShafts) {
    bindFxUniforms(sh.model, sh.color);
    gl.drawElements(gl.TRIANGLES, world.shaftMesh.indexCount, gl.UNSIGNED_INT, 0);
  }

  // Particles
  gl.useProgram(progParticles);
  gl.uniformMatrix4fv(gl.getUniformLocation(progParticles, "uViewProj"), false, viewProjMat);
  gl.uniform1f(gl.getUniformLocation(progParticles, "uTime"), state.time);
  gl.uniform3f(gl.getUniformLocation(progParticles, "uCamPos"), camEye[0], camEye[1], camEye[2]);
  gl.uniform1f(gl.getUniformLocation(progParticles, "uPixelRatio"), Math.min(window.devicePixelRatio || 1, 2.0));
  gl.bindVertexArray(world.particleVao);
  gl.drawArrays(gl.POINTS, 0, world.particleCount);

  gl.depthMask(true);
  gl.disable(gl.BLEND);
  gl.disable(gl.DEPTH_TEST);

  // 2. Bloom Pass
  const bw = Math.max(1, Math.floor(canvas.width / 2));
  const bh = Math.max(1, Math.floor(canvas.height / 2));
  gl.bindFramebuffer(gl.FRAMEBUFFER, bloomFbo);
  gl.viewport(0, 0, bw, bh);
  gl.useProgram(progBloom);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, sceneTex);
  gl.uniform1i(gl.getUniformLocation(progBloom, "uSceneTex"), 0);
  gl.uniform2f(gl.getUniformLocation(progBloom, "uTexelSize"), 1.0 / bw, 1.0 / bh);
  gl.bindVertexArray(quadVao);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  // 3. Composite Pass to Screen
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.useProgram(progComposite);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, sceneTex);
  gl.uniform1i(gl.getUniformLocation(progComposite, "uSceneTex"), 0);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, bloomTex);
  gl.uniform1i(gl.getUniformLocation(progComposite, "uBloomTex"), 1);
  gl.bindVertexArray(quadVao);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  gl.bindVertexArray(null);
  requestAnimationFrame(render);
}

requestAnimationFrame(render);
