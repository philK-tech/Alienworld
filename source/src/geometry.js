// geometry.js: Geometrie-Builder und Upload auf die GPU
// --- Geometry Builder ---
// Vertex layout (12 floats per vertex):
// pos(3), normal(3), uv(2), extra(3: ao, glow/edge, sway/layer), matId(1)
function createGeometryBuilder() {
  return {
    positions: [],
    normals: [],
    uvs: [],
    extras: [],
    matIds: [],
    indices: [],
    pushVertex(px, py, pz, nx, ny, nz, u, v, e0 = 1.0, e1 = 0.0, e2 = 0.0, matId = 0) {
      this.positions.push(px, py, pz);
      this.normals.push(nx, ny, nz);
      this.uvs.push(u, v);
      this.extras.push(e0, e1, e2);
      this.matIds.push(matId);
    },
    pushTri(a, b, c) {
      this.indices.push(a, b, c);
    },
    pushQuad(a, b, c, d) {
      this.indices.push(a, b, c, a, c, d);
    },
    computeSmoothNormals() {
      const count = this.positions.length / 3;
      const acc = new Float32Array(count * 3);
      for (let i = 0; i < this.indices.length; i += 3) {
        const ia = this.indices[i], ib = this.indices[i + 1], ic = this.indices[i + 2];
        const ax = this.positions[ia * 3], ay = this.positions[ia * 3 + 1], az = this.positions[ia * 3 + 2];
        const bx = this.positions[ib * 3], by = this.positions[ib * 3 + 1], bz = this.positions[ib * 3 + 2];
        const cx = this.positions[ic * 3], cy = this.positions[ic * 3 + 1], cz = this.positions[ic * 3 + 2];
        const ux = bx - ax, uy = by - ay, uz = bz - az;
        const vx = cx - ax, vy = cy - ay, vz = cz - az;
        const nx = uy * vz - uz * vy;
        const ny = uz * vx - ux * vz;
        const nz = ux * vy - uy * vx;
        for (const idx of [ia, ib, ic]) {
          acc[idx * 3] += nx;
          acc[idx * 3 + 1] += ny;
          acc[idx * 3 + 2] += nz;
        }
      }
      for (let i = 0; i < count; i++) {
        let nx = acc[i * 3], ny = acc[i * 3 + 1], nz = acc[i * 3 + 2];
        const len = Math.hypot(nx, ny, nz) || 1.0;
        this.normals[i * 3] = nx / len;
        this.normals[i * 3 + 1] = ny / len;
        this.normals[i * 3 + 2] = nz / len;
      }
    },
    computeFacetedNormals() {
      // Unrolls indexed triangles into crisp faceted triangles for craggy rock strata
      const newPos = [], newNorm = [], newUv = [], newExt = [], newMat = [], newIdx = [];
      for (let i = 0; i < this.indices.length; i += 3) {
        const ia = this.indices[i], ib = this.indices[i + 1], ic = this.indices[i + 2];
        const ax = this.positions[ia * 3], ay = this.positions[ia * 3 + 1], az = this.positions[ia * 3 + 2];
        const bx = this.positions[ib * 3], by = this.positions[ib * 3 + 1], bz = this.positions[ib * 3 + 2];
        const cx = this.positions[ic * 3], cy = this.positions[ic * 3 + 1], cz = this.positions[ic * 3 + 2];
        const ux = bx - ax, uy = by - ay, uz = bz - az;
        const vx = cx - ax, vy = cy - ay, vz = cz - az;
        let nx = uy * vz - uz * vy;
        let ny = uz * vx - ux * vz;
        let nz = ux * vy - uy * vx;
        const len = Math.hypot(nx, ny, nz) || 1.0;
        nx /= len; ny /= len; nz /= len;
        for (const vIdx of [ia, ib, ic]) {
          const outIdx = newPos.length / 3;
          newPos.push(this.positions[vIdx * 3], this.positions[vIdx * 3 + 1], this.positions[vIdx * 3 + 2]);
          newNorm.push(nx, ny, nz);
          newUv.push(this.uvs[vIdx * 2], this.uvs[vIdx * 2 + 1]);
          newExt.push(this.extras[vIdx * 3], this.extras[vIdx * 3 + 1], this.extras[vIdx * 3 + 2]);
          newMat.push(this.matIds[vIdx]);
          newIdx.push(outIdx);
        }
      }
      this.positions = newPos;
      this.normals = newNorm;
      this.uvs = newUv;
      this.extras = newExt;
      this.matIds = newMat;
      this.indices = newIdx;
    }
  };
}

function uploadStaticMesh(glCtx, builder) {
  const vertCount = builder.positions.length / 3;
  const interleaved = new Float32Array(vertCount * 12);
  for (let i = 0; i < vertCount; i++) {
    const o = i * 12;
    interleaved[o + 0] = builder.positions[i * 3 + 0];
    interleaved[o + 1] = builder.positions[i * 3 + 1];
    interleaved[o + 2] = builder.positions[i * 3 + 2];
    interleaved[o + 3] = builder.normals[i * 3 + 0];
    interleaved[o + 4] = builder.normals[i * 3 + 1];
    interleaved[o + 5] = builder.normals[i * 3 + 2];
    interleaved[o + 6] = builder.uvs[i * 2 + 0];
    interleaved[o + 7] = builder.uvs[i * 2 + 1];
    interleaved[o + 8] = builder.extras[i * 3 + 0];
    interleaved[o + 9] = builder.extras[i * 3 + 1];
    interleaved[o + 10] = builder.extras[i * 3 + 2];
    interleaved[o + 11] = builder.matIds[i];
  }

  const vao = glCtx.createVertexArray();
  glCtx.bindVertexArray(vao);

  const vbo = glCtx.createBuffer();
  glCtx.bindBuffer(glCtx.ARRAY_BUFFER, vbo);
  glCtx.bufferData(glCtx.ARRAY_BUFFER, interleaved, glCtx.STATIC_DRAW);

  const stride = 12 * 4;
  glCtx.enableVertexAttribArray(0);
  glCtx.vertexAttribPointer(0, 3, glCtx.FLOAT, false, stride, 0);
  glCtx.enableVertexAttribArray(1);
  glCtx.vertexAttribPointer(1, 3, glCtx.FLOAT, false, stride, 12);
  glCtx.enableVertexAttribArray(2);
  glCtx.vertexAttribPointer(2, 2, glCtx.FLOAT, false, stride, 24);
  glCtx.enableVertexAttribArray(3);
  glCtx.vertexAttribPointer(3, 3, glCtx.FLOAT, false, stride, 32);
  glCtx.enableVertexAttribArray(4);
  glCtx.vertexAttribPointer(4, 1, glCtx.FLOAT, false, stride, 44);

  const ibo = glCtx.createBuffer();
  glCtx.bindBuffer(glCtx.ELEMENT_ARRAY_BUFFER, ibo);
  glCtx.bufferData(glCtx.ELEMENT_ARRAY_BUFFER, new Uint32Array(builder.indices), glCtx.STATIC_DRAW);

  glCtx.bindVertexArray(null);
  return { vao, indexCount: builder.indices.length };
}

// Instance buffer layout per instance:
// mat4 (16 floats) + tint vec4 (4 floats) = 20 floats
function uploadInstancedMesh(glCtx, builder, matsArray, tintsArray) {
  const base = uploadStaticMesh(glCtx, builder);
  const count = tintsArray.length / 4;
  const instData = new Float32Array(count * 20);
  for (let i = 0; i < count; i++) {
    instData.set(matsArray.subarray(i * 16, i * 16 + 16), i * 20);
    instData.set(tintsArray.subarray(i * 4, i * 4 + 4), i * 20 + 16);
  }

  glCtx.bindVertexArray(base.vao);
  const instBuf = glCtx.createBuffer();
  glCtx.bindBuffer(glCtx.ARRAY_BUFFER, instBuf);
  glCtx.bufferData(glCtx.ARRAY_BUFFER, instData, glCtx.STATIC_DRAW);

  const instStride = 20 * 4;
  for (let col = 0; col < 4; col++) {
    const loc = 5 + col;
    glCtx.enableVertexAttribArray(loc);
    glCtx.vertexAttribPointer(loc, 4, glCtx.FLOAT, false, instStride, col * 16);
    glCtx.vertexAttribDivisor(loc, 1);
  }
  glCtx.enableVertexAttribArray(9);
  glCtx.vertexAttribPointer(9, 4, glCtx.FLOAT, false, instStride, 64);
  glCtx.vertexAttribDivisor(9, 1);

  glCtx.bindVertexArray(null);
  return { vao: base.vao, indexCount: base.indexCount, instanceCount: count };
}
