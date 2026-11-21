// renderer.js: Fullscreen-Quad, Render-Targets und Canvas-Größe
// Fullscreen quad for post-processing
const quadVao = gl.createVertexArray();
gl.bindVertexArray(quadVao);
const quadBuf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
gl.bindVertexArray(null);

// Offscreen render targets
let rtWidth = 0, rtHeight = 0;
let sceneTex = null, sceneDepth = null, sceneFbo = null;
let bloomTex = null, bloomFbo = null;

function ensureRenderTargets(w, h) {
  if (w === rtWidth && h === rtHeight) return;
  rtWidth = w;
  rtHeight = h;

  if (sceneTex) gl.deleteTexture(sceneTex);
  if (sceneDepth) gl.deleteRenderbuffer(sceneDepth);
  if (sceneFbo) gl.deleteFramebuffer(sceneFbo);
  if (bloomTex) gl.deleteTexture(bloomTex);
  if (bloomFbo) gl.deleteFramebuffer(bloomFbo);

  sceneTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, sceneTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  sceneDepth = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, sceneDepth);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);

  sceneFbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, sceneFbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sceneTex, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, sceneDepth);

  const bw = Math.max(1, Math.floor(w / 2));
  const bh = Math.max(1, Math.floor(h / 2));

  bloomTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, bloomTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, bw, bh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  bloomFbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, bloomFbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, bloomTex, 0);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
  const w = Math.max(320, Math.floor(window.innerWidth * dpr));
  const h = Math.max(200, Math.floor(window.innerHeight * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ensureRenderTargets(canvas.width, canvas.height);
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();
