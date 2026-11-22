// main.js: Zustand, Steuerung und Render-Loop
// --- State & Controls ---
const state = {
  running: true,
  time: 0.0,
  travelDist: 0.0,
  lastFrame: performance.now()
};
// Testhilfe: index.html#t=30 startet 30 Sekunden in der Fahrt
{
  const m = /t=([\d.]+)/.exec(location.hash);
  if (m) { state.time = +m[1]; state.travelDist = +m[1] * 4.6; }
}

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

// Selbst umsehen: Maus ziehen oder mit dem Finger wischen. Nach kurzer Zeit übernimmt wieder der automatische Blick.
const look = { yaw: 0, pitch: 0, dragging: false, lastX: 0, lastY: 0, idle: 99 };
canvas.addEventListener("pointerdown", (e) => {
  look.dragging = true;
  look.lastX = e.clientX;
  look.lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
  if (!look.dragging) return;
  const k = 2.6 / Math.max(window.innerWidth, window.innerHeight);
  look.yaw = Math.max(-2.6, Math.min(2.6, look.yaw + (e.clientX - look.lastX) * k));
  look.pitch = Math.max(-0.7, Math.min(0.9, look.pitch + (e.clientY - look.lastY) * k));
  look.lastX = e.clientX;
  look.lastY = e.clientY;
  look.idle = 0;
});
const endDrag = () => { look.dragging = false; };
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);

function updateChapterLabel(zMod) {
  let label = "Schlucht der Leuchtenden Wasserfälle";
  if (zMod > LOOP_LENGTH / 3 && zMod <= (LOOP_LENGTH * 2) / 3) {
    label = "Kronendach der Violetten Quallenpilze";
  } else if (zMod > (LOOP_LENGTH * 2) / 3) {
    label = "Lagune der Schwebenden Berge";
  }
  if (chapterEl.textContent !== label) {
    chapterEl.textContent = label;
  }
}

// --- Render Loop ---
const FAR = 300.0;       // Sichtweite
const BEHIND = 30.0;     // was hinter der Kamera noch gezeichnet wird (seitlich im Bild)
const viewMat = Mat4.create();
const projMat = Mat4.create();
const viewProjMat = Mat4.create();
const reflViewProj = Mat4.create();
const mirrorMat = Mat4.create();
mirrorMat[5] = -1;
const identityMat = Mat4.create();
const tempModelMat = Mat4.create();
const camEye = [0, 2.2, 0];
const ridePos = [0, 0, 0];
const gaze = { yaw: 0, pitch: 0.05 };
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
// feste Blickziele entlang der Strecke: Wasserfälle und die nahen schwebenden Berge
const staticPois = [];
const camTarget = [0, 2.4, -14];
const camMirror = [0, -2.2, 0];
const offsetVec = [0, 0, 0];
const pixelRatio = Math.min(window.devicePixelRatio || 1, 2.0);

// Die Welt existiert dreimal hintereinander (Versatz +L, 0, -L).
// Für jede Kopie wird nur der Abschnitt gezeichnet, der in Sichtweite liegt.
const copies = [LOOP_LENGTH, 0.0, -LOOP_LENGTH].map((o) => ({ o, zMin: 0, zMax: 0, on: false }));
function updateCopies(camZ) {
  for (const c of copies) {
    c.zMin = Math.max(camZ - FAR - c.o, -LOOP_LENGTH - 20.0);
    c.zMax = Math.min(camZ + BEHIND - c.o, 20.0);
    c.on = c.zMin < c.zMax;
  }
}

world.waterfalls.forEach((wf) => staticPois.push({ x: wf.x, y: wf.isSkyFall ? wf.y * 0.6 : wf.y * 0.5, z: wf.z, w: wf.isSkyFall ? 0.9 : 0.8 }));
world.floatingPeaks.forEach((pk) => { if (pk.fall) staticPois.push({ x: pk.x, y: pk.y, z: pk.z, w: 0.7 }); });

function drawScene(pass) {
  // pass.reflect: Spiegelbild für den Fluss (gespiegelte Kamera, alles unter Wasser verworfen)
  const vp = pass.reflect ? reflViewProj : viewProjMat;
  const cam = pass.reflect ? camMirror : camEye;
  const u = progOpaque.u;

  gl.useProgram(progOpaque.prog);
  gl.uniformMatrix4fv(u.uViewProj, false, vp);
  gl.uniform1f(u.uTime, state.time);
  gl.uniform3fv(u.uCamPos, cam);
  gl.uniform3fv(u.uRidePos, ridePos);
  gl.uniform4f(u.uAnim, 0, 0, 0, 0);
  gl.uniform1i(u.uBoatTex, 1);
  gl.uniform1f(u.uClip, pass.reflect ? 1.0 : 0.0);
  gl.uniform2f(u.uScreen, canvas.width, canvas.height);
  gl.uniform1i(u.uReflTex, 0);
  const setModel = (mat, tint, instanced) => {
    gl.uniformMatrix4fv(u.uModel, false, mat);
    gl.uniform4fv(u.uTint, tint);
    gl.uniform1f(u.uInstanced, instanced);
  };
  const setOffset = (o) => { offsetVec[2] = o; gl.uniform3fv(u.uOffset, offsetVec); };

  // Himmel, um die Kamera zentriert
  gl.depthMask(false);
  setOffset(0);
  Mat4.compose(tempModelMat, cam, 0, 0, 0, [1, 1, 1]);
  setModel(tempModelMat, [1, 1, 1, 1], 0.0);
  gl.bindVertexArray(world.skyDomeMesh.vao);
  gl.drawElements(gl.TRIANGLES, world.skyDomeMesh.indexCount, gl.UNSIGNED_INT, 0);
  gl.depthMask(true);

  for (const c of copies) {
    if (!c.on) continue;
    setOffset(c.o);
    const near = (z, r) => z + r > c.zMin && z - r < c.zMax;

    setModel(identityMat, [1, 1, 1, 1], 0.0);
    gl.bindVertexArray(world.valleyMesh.vao);
    gl.drawElements(gl.TRIANGLES, world.valleyMesh.indexCount, gl.UNSIGNED_INT, 0);
    if (!pass.reflect) {
      gl.bindVertexArray(world.waterMesh.vao);
      gl.drawElements(gl.TRIANGLES, world.waterMesh.indexCount, gl.UNSIGNED_INT, 0);
    }

    if (near(world.archZ, 15)) {
      setModel(world.archModel, [0.92, 1.0, 1.12, 1], 0.0);
      gl.bindVertexArray(world.archMesh.vao);
      gl.drawElements(gl.TRIANGLES, world.archMesh.indexCount, gl.UNSIGNED_INT, 0);
    }

    gl.bindVertexArray(world.cliffHousingMesh.vao);
    for (const ch of world.bankCliffHousings) {
      if (!near(ch.z, 6)) continue;
      Mat4.compose(tempModelMat, [ch.x, ch.y, ch.z], ch.rotY, 0, 0, [ch.sx, ch.sy, ch.sz]);
      setModel(tempModelMat, [0.88, 0.98, 1.14, 1], 0.0);
      gl.drawElements(gl.TRIANGLES, world.cliffHousingMesh.indexCount, gl.UNSIGNED_INT, 0);
    }

    gl.bindVertexArray(world.mountainMesh.vao);
    world.floatingPeaks.forEach((pk, idx) => {
      if (!near(pk.z, pk.sx + 20)) return;
      const bob = Math.sin(state.time * 0.35 + idx * 2.1) * 0.5;
      Mat4.compose(tempModelMat, [pk.x, pk.y + bob, pk.z], pk.rot, 0, 0, [pk.sx, pk.sy, pk.sz]);
      setModel(tempModelMat, [0.92, 1.0, 1.15, 1], 0.0);
      gl.drawElements(gl.TRIANGLES, world.mountainMesh.indexCount, gl.UNSIGNED_INT, 0);
    });

    setModel(identityMat, [1, 1, 1, 1], 1.0);
    for (const grp of world.instGroups) drawInstancedRange(gl, grp, c.zMin, c.zMax);
  }

  // Tiere und Boot liegen schon in Kamerakoordinaten der aktuellen Runde
  setOffset(0);
  for (const cd of creatureDraws) {
    setModel(cd.model, cd.tint, 0.0);
    gl.uniform4fv(u.uAnim, cd.anim);
    gl.bindVertexArray(cd.mesh.vao);
    gl.drawElements(gl.TRIANGLES, cd.mesh.indexCount, gl.UNSIGNED_INT, 0);
  }
  gl.uniform4f(u.uAnim, 0, 0, 0, 0);
  if (boat.mesh && boat.tex) {
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, boat.tex);
    gl.uniform1i(u.uBoatTex, 1);
    gl.activeTexture(gl.TEXTURE0);
    setModel(boat.model, [1, 1, 1, 1], 0.0);
    gl.bindVertexArray(boat.mesh.vao);
    gl.drawElements(gl.TRIANGLES, boat.mesh.indexCount, gl.UNSIGNED_INT, 0);
  }

  // Leuchtende Effekte, additiv
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.depthMask(false);

  const fu = progFx.u;
  gl.useProgram(progFx.prog);
  gl.uniformMatrix4fv(fu.uViewProj, false, vp);
  gl.uniform1f(fu.uTime, state.time);
  gl.uniform3fv(fu.uCamPos, cam);
  for (const c of copies) {
    if (!c.on) continue;
    offsetVec[2] = c.o;
    gl.uniform3fv(fu.uOffset, offsetVec);
    const near = (z, r) => z + r > c.zMin && z - r < c.zMax;

    gl.bindVertexArray(world.waterfallMesh.vao);
    for (const wf of world.waterfalls) {
      if (!near(wf.z, 10)) continue;
      let y = wf.y, sy = wf.sy;
      if (wf.isSkyFall) {
        const bob = Math.sin(state.time * 0.35 + wf.peakIdx * 2.1) * 0.5;
        y += bob;
        sy = Math.max(0.5, wf.sy + bob);
      }
      Mat4.compose(tempModelMat, [wf.x, y, wf.z], wf.rotY, 0, 0, [wf.sx, sy, wf.sz]);
      gl.uniformMatrix4fv(fu.uModel, false, tempModelMat);
      gl.uniform4f(fu.uTint, 0.35, 0.92, 1.0, 1.0);
      gl.drawElements(gl.TRIANGLES, world.waterfallMesh.indexCount, gl.UNSIGNED_INT, 0);
    }

    if (!pass.reflect) {
      gl.bindVertexArray(world.plungeRippleMesh.vao);
      for (const rp of world.plungeRipples) {
        if (!near(rp.z, 5)) continue;
        Mat4.compose(tempModelMat, [rp.x, rp.y, rp.z], 0, 0, 0, [rp.sx, 1.0, rp.sz]);
        gl.uniformMatrix4fv(fu.uModel, false, tempModelMat);
        gl.uniform4f(fu.uTint, 0.3, 0.92, 1.0, 1.0);
        gl.drawElements(gl.TRIANGLES, world.plungeRippleMesh.indexCount, gl.UNSIGNED_INT, 0);
      }
      for (const r of rippleDraws) {
        if (c.o !== 0) continue;
        Mat4.compose(tempModelMat, [r.x, 0.03, r.z], 0, 0, 0, [1.6, 1.0, 1.6]);
        gl.uniformMatrix4fv(fu.uModel, false, tempModelMat);
        gl.uniform4f(fu.uTint, 1, 1, 1, Math.max(0, Math.min(1, r.a)));
        gl.drawElements(gl.TRIANGLES, world.plungeRippleMesh.indexCount, gl.UNSIGNED_INT, 0);
      }
      gl.bindVertexArray(world.shaftMesh.vao);
      for (const sh of world.lightShafts) {
        if (!near(sh.z, 8)) continue;
        gl.uniformMatrix4fv(fu.uModel, false, sh.model);
        gl.uniform4fv(fu.uTint, sh.color);
        gl.drawElements(gl.TRIANGLES, world.shaftMesh.indexCount, gl.UNSIGNED_INT, 0);
      }
    }
  }

  // Leuchtpunkte am Boden
  const du = progGlowDots.u;
  gl.useProgram(progGlowDots.prog);
  gl.uniformMatrix4fv(du.uViewProj, false, vp);
  gl.uniform1f(du.uTime, state.time);
  gl.uniform3fv(du.uCamPos, cam);
  gl.uniform3fv(du.uRidePos, ridePos);
  gl.uniform1f(du.uPixelRatio, pixelRatio * (pass.reflect ? 0.5 : 1.0));
  gl.uniform1f(du.uMirror, pass.reflect ? 1.0 : 0.0);
  gl.bindVertexArray(world.dotVao);
  for (const c of copies) {
    if (!c.on) continue;
    offsetVec[2] = c.o;
    gl.uniform3fv(du.uOffset, offsetVec);
    const first = lowerIndex(world.dotZ, c.zMax);
    const last = lowerIndex(world.dotZ, c.zMin);
    if (last > first) gl.drawArrays(gl.POINTS, first, last - first);
  }

  // Glühwürmchen
  const pu = progParticles.u;
  gl.useProgram(progParticles.prog);
  gl.uniformMatrix4fv(pu.uViewProj, false, vp);
  gl.uniform1f(pu.uTime, state.time);
  gl.uniform3fv(pu.uCamPos, cam);
  gl.uniform3fv(pu.uRidePos, ridePos);
  gl.uniform1f(pu.uLoop, LOOP_LENGTH);
  gl.uniform1f(pu.uPixelRatio, pixelRatio * (pass.reflect ? 0.5 : 1.0));
  gl.bindVertexArray(world.particleVao);
  gl.drawArrays(gl.POINTS, 0, world.particleCount);

  gl.depthMask(true);
  gl.disable(gl.BLEND);
}

function fullscreenPass(fbo, w, h) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.viewport(0, 0, w, h);
  gl.bindVertexArray(quadVao);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function render(now) {
  const dt = Math.min((now - state.lastFrame) * 0.001, 0.05);
  state.lastFrame = now;
  if (state.running) {
    state.time += dt;
    state.travelDist += dt * 4.6;
  }

  const zMod = ((state.travelDist % LOOP_LENGTH) + LOOP_LENGTH) % LOOP_LENGTH;
  const zCur = -zMod;
  updateChapterLabel(zMod);

  // Boot folgt dem Fluss, pendelt leicht hin und her
  const t = state.time;
  const bx = riverCenterX(zCur) + Math.sin(t * 0.21) * 0.9;
  const heading = Math.atan2(riverSlopeX(zCur - 3.0) + Math.cos(t * 0.21) * 0.04, 1.0);
  placeBoat(bx, zCur, heading, t, camEye);
  ridePos[0] = bx; ridePos[1] = 1.2; ridePos[2] = zCur;
  updateCreatures(zCur, t);

  // Blick: sanftes Umherschauen, dazu Hinwenden zu Tieren und Sehenswürdigkeiten
  let tYaw = Math.sin(t * 0.11) * 0.55 + Math.sin(t * 0.27 + 1.3) * 0.25 + 0.12;
  let tPitch = 0.06 + Math.sin(t * 0.15 + 0.5) * 0.08;
  let best = null, bestScore = 0;
  const consider = (p) => {
    const dx = p.x - camEye[0], dy = p.y - camEye[1], dz = p.z - camEye[2];
    const dist = Math.hypot(dx, dz);
    if (dist < 4 || dist > 75) return;
    const rel = wrapAngle(Math.atan2(-dx, -dz) - heading);
    if (Math.abs(rel) > 1.5) return;
    const score = p.w / (1.0 + dist * 0.04) * (1.0 - Math.abs(rel) * 0.3);
    if (score > bestScore) { bestScore = score; best = { rel, pitch: Math.atan2(dy, dist) }; }
  };
  pois.forEach(consider);
  for (const p of staticPois) {
    const d = aheadDist(zCur, p.z);
    if (d > -5 && d < 80) consider({ x: p.x, y: p.y, z: zCur - d, w: p.w });
  }
  if (best) {
    tYaw = best.rel;
    tPitch = Math.max(-0.35, Math.min(0.75, best.pitch));
  }
  const ease = 1.0 - Math.exp(-dt * (best ? 1.3 : 0.6));
  gaze.yaw += wrapAngle(tYaw - gaze.yaw) * ease;
  gaze.pitch += (tPitch - gaze.pitch) * ease;
  // eigener Blick klingt nach 2,5 Sekunden ohne Bewegung wieder ab
  look.idle += dt;
  if (!look.dragging && look.idle > 2.5) {
    const k = 1.0 - Math.exp(-dt * 0.8);
    look.yaw -= look.yaw * k;
    look.pitch -= look.pitch * k;
  }
  const yaw = heading + gaze.yaw + look.yaw;
  const pitch = Math.max(-0.8, Math.min(1.0, gaze.pitch + look.pitch));
  camTarget[0] = camEye[0] - Math.sin(yaw) * Math.cos(pitch) * 10.0;
  camTarget[1] = camEye[1] + Math.sin(pitch) * 10.0;
  camTarget[2] = camEye[2] - Math.cos(yaw) * Math.cos(pitch) * 10.0;
  camMirror[0] = camEye[0];
  camMirror[1] = -camEye[1];
  camMirror[2] = camEye[2];

  const aspect = canvas.width / Math.max(canvas.height, 1);
  Mat4.perspective(projMat, ((aspect < 1 ? 74 : 62) * Math.PI) / 180, aspect, 0.1, FAR + 40.0);
  Mat4.lookAt(viewMat, camEye, camTarget, [0, 1, 0]);
  Mat4.multiply(viewProjMat, projMat, viewMat);
  Mat4.multiply(reflViewProj, viewProjMat, mirrorMat);
  updateCopies(zCur);

  gl.enable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);
  gl.clearColor(0.010, 0.026, 0.055, 1.0);

  // 1. Spiegelbild für den Fluss
  gl.bindFramebuffer(gl.FRAMEBUFFER, rt.reflFbo);
  gl.viewport(0, 0, rt.rw, rt.rh);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  drawScene({ reflect: true });

  // 2. Szene (mit Kantenglättung), danach auflösen
  gl.bindFramebuffer(gl.FRAMEBUFFER, rt.msFbo);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, rt.reflTex);
  drawScene({ reflect: false });
  if (rt.msFbo !== rt.sceneFbo) {
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, rt.msFbo);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, rt.sceneFbo);
    gl.blitFramebuffer(0, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height, gl.COLOR_BUFFER_BIT, gl.NEAREST);
  }
  gl.disable(gl.DEPTH_TEST);

  // 3. Bloom: verkleinern ...
  gl.useProgram(progBloomDown.prog);
  gl.activeTexture(gl.TEXTURE0);
  gl.uniform1i(progBloomDown.u.uTex, 0);
  let srcTex = rt.sceneTex, srcW = canvas.width, srcH = canvas.height;
  rt.bloom.forEach((lv, i) => {
    gl.bindTexture(gl.TEXTURE_2D, srcTex);
    gl.uniform2f(progBloomDown.u.uTexel, 1.0 / srcW, 1.0 / srcH);
    gl.uniform1f(progBloomDown.u.uPrefilter, i === 0 ? 1.0 : 0.0);
    fullscreenPass(lv.fbo, lv.w, lv.h);
    srcTex = lv.tex; srcW = lv.w; srcH = lv.h;
  });
  // ... und schrittweise wieder vergrößern, jede Stufe additiv auf die nächstgrößere
  gl.useProgram(progBloomUp.prog);
  gl.uniform1i(progBloomUp.u.uTex, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
  for (let i = rt.bloom.length - 1; i > 0; i--) {
    const src = rt.bloom[i], dst = rt.bloom[i - 1];
    gl.bindTexture(gl.TEXTURE_2D, src.tex);
    gl.uniform2f(progBloomUp.u.uTexel, 1.0 / src.w, 1.0 / src.h);
    gl.uniform1f(progBloomUp.u.uWeight, 0.9);
    fullscreenPass(dst.fbo, dst.w, dst.h);
  }
  gl.disable(gl.BLEND);

  // 4. Zusammensetzen, Tonemapping, Vignette
  gl.useProgram(progComposite.prog);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, rt.sceneTex);
  gl.uniform1i(progComposite.u.uSceneTex, 0);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, rt.bloom[0].tex);
  gl.uniform1i(progComposite.u.uBloomTex, 1);
  gl.uniform1f(progComposite.u.uTime, state.time);
  gl.uniform2f(progComposite.u.uScreen, canvas.width, canvas.height);
  fullscreenPass(null, canvas.width, canvas.height);
  gl.activeTexture(gl.TEXTURE0);

  gl.bindVertexArray(null);
  requestAnimationFrame(render);
}

requestAnimationFrame(render);
