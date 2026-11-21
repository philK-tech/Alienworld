// math.js: Mathe, Noise, Flussverlauf und Mat4
// --- Math & Noise Utilities ---
const LOOP_LENGTH = 360.0;

function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
function lerp(a, b, t) { return a + (b - a) * t; }
function smoothstep(e0, e1, x) {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3.0 - 2.0 * t);
}
function hash2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
function vnoise2(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3.0 - 2.0 * fx);
  const uy = fy * fy * (3.0 - 2.0 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}
function fbm2(x, y, octaves = 4) {
  let val = 0.0, amp = 0.5, freq = 1.0, norm = 0.0;
  for (let i = 0; i < octaves; i++) {
    val += amp * vnoise2(x * freq, y * freq);
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return val / norm;
}

// Winding river spline along negative Z
function riverCenterX(z) {
  return Math.sin(z * 0.022) * 7.5 + Math.cos(z * 0.009) * 4.2;
}
function riverSlopeX(z) {
  const eps = 0.5;
  return (riverCenterX(z + eps) - riverCenterX(z - eps)) / (2.0 * eps);
}
function riverHalfWidth(z) {
  return 5.4 + Math.sin(z * 0.035 + 1.1) * 1.4;
}

// Mat4 helpers (column-major)
const Mat4 = {
  create() {
    const m = new Float32Array(16);
    m[0] = m[5] = m[10] = m[15] = 1;
    return m;
  },
  multiply(out, a, b) {
    const o = out === a || out === b ? new Float32Array(16) : out;
    for (let c = 0; c < 4; c++) {
      const b0 = b[c * 4 + 0], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
      o[c * 4 + 0] = a[0] * b0 + a[4] * b1 + a[8]  * b2 + a[12] * b3;
      o[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9]  * b2 + a[13] * b3;
      o[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
      o[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
    }
    if (out !== o) out.set(o);
    return out;
  },
  perspective(out, fovRad, aspect, near, far) {
    const f = 1.0 / Math.tan(fovRad * 0.5);
    const nf = 1.0 / (near - far);
    out.fill(0);
    out[0] = f / aspect;
    out[5] = f;
    out[10] = (far + near) * nf;
    out[11] = -1.0;
    out[14] = 2.0 * far * near * nf;
    return out;
  },
  lookAt(out, eye, target, up) {
    let zx = eye[0] - target[0], zy = eye[1] - target[1], zz = eye[2] - target[2];
    let zl = Math.hypot(zx, zy, zz) || 1;
    zx /= zl; zy /= zl; zz /= zl;

    let xx = up[1] * zz - up[2] * zy;
    let xy = up[2] * zx - up[0] * zz;
    let xz = up[0] * zy - up[1] * zx;
    let xl = Math.hypot(xx, xy, xz) || 1;
    xx /= xl; xy /= xl; xz /= xl;

    const yx = zy * xz - zz * xy;
    const yy = zz * xx - zx * xz;
    const yz = zx * xy - zy * xx;

    out[0] = xx; out[4] = xy; out[8]  = xz; out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
    out[1] = yx; out[5] = yy; out[9]  = yz; out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
    out[2] = zx; out[6] = zy; out[10] = zz; out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
    out[3] = 0;  out[7] = 0;  out[11] = 0;  out[15] = 1;
    return out;
  },
  compose(out, pos, rotY, rotX, rotZ, scale) {
    const cy = Math.cos(rotY), sy = Math.sin(rotY);
    const cx = Math.cos(rotX), sx = Math.sin(rotX);
    const cz = Math.cos(rotZ), sz = Math.sin(rotZ);

    // R = Ry * Rx * Rz
    const r00 = cy * cz + sy * sx * sz;
    const r01 = -cy * sz + sy * sx * cz;
    const r02 = sy * cx;

    const r10 = cx * sz;
    const r11 = cx * cz;
    const r12 = -sx;

    const r20 = -sy * cz + cy * sx * sz;
    const r21 = sy * sz + cy * sx * cz;
    const r22 = cy * cx;

    const sxS = scale[0], syS = scale[1], szS = scale[2];
    out[0] = r00 * sxS; out[4] = r01 * syS; out[8]  = r02 * szS; out[12] = pos[0];
    out[1] = r10 * sxS; out[5] = r11 * syS; out[9]  = r12 * szS; out[13] = pos[1];
    out[2] = r20 * sxS; out[6] = r21 * syS; out[10] = r22 * szS; out[14] = pos[2];
    out[3] = 0;         out[7] = 0;         out[11] = 0;         out[15] = 1;
    return out;
  }
};
