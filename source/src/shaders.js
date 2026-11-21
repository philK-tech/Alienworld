// shaders.js: GLSL-Shader und Programmerstellung
// --- Shaders ---
const VS_WORLD = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aUv;
layout(location = 3) in vec3 aExtra;
layout(location = 4) in float aMatId;

layout(location = 5) in vec4 aInstCol0;
layout(location = 6) in vec4 aInstCol1;
layout(location = 7) in vec4 aInstCol2;
layout(location = 8) in vec4 aInstCol3;
layout(location = 9) in vec4 aInstTint;

uniform mat4 uViewProj;
uniform mat4 uModel;
uniform vec4 uTint;
uniform float uTime;
uniform float uInstanced;

out vec3 vWorldPos;
out vec3 vNormal;
out vec2 vUv;
out vec3 vExtra;
out vec4 vTint;
out float vMatId;

void main() {
  mat4 modelMat = uModel;
  vec4 tint = uTint;
  if (uInstanced > 0.5) {
    modelMat = mat4(aInstCol0, aInstCol1, aInstCol2, aInstCol3);
    tint = aInstTint;
  }

  vec3 p = aPos;
  int matId = int(aMatId + 0.5);

  // Gentle breeze & bioluminescent sway on flora/tendrils
  if (matId == 6 || matId == 7 || matId == 8 || matId == 10 || matId == 12) {
    vec3 wpBase = (modelMat * vec4(p, 1.0)).xyz;
    float phase = wpBase.x * 0.37 + wpBase.z * 0.29 + uTime * 1.35;
    float swayAmt = (matId == 12) ? (0.08 + aUv.y * 0.14) : (aExtra.z * 0.08);
    p.x += sin(phase) * swayAmt;
    p.z += cos(phase * 0.83 + 1.1) * swayAmt * 0.75;
  }

  vec4 worldPosition = modelMat * vec4(p, 1.0);
  vWorldPos = worldPosition.xyz;
  vNormal = normalize(mat3(modelMat) * aNormal);
  vUv = aUv;
  vExtra = aExtra;
  vTint = tint;
  vMatId = aMatId;

  gl_Position = uViewProj * worldPosition;
}`;

const FS_OPAQUE = `#version 300 es
precision highp float;

in vec3 vWorldPos;
in vec3 vNormal;
in vec2 vUv;
in vec3 vExtra;
in vec4 vTint;
in float vMatId;

out vec4 fragColor;

uniform float uTime;
uniform vec3 uCamPos;

float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 4; i++) {
    v += a * vnoise(p);
    p = rot * p * 2.04;
    a *= 0.5;
  }
  return v;
}

vec3 applyNightFog(vec3 col, vec3 wp) {
  float dist = length(wp - uCamPos);
  float fog = 1.0 - exp(-max(dist - 12.0, 0.0) * 0.0145);
  vec3 fogCol = vec3(0.014, 0.032, 0.068);
  return mix(col, fogCol, clamp(fog, 0.0, 0.92));
}

void main() {
  int matId = int(vMatId + 0.5);

  // Sky dome with Polyphemus gas giant, two moons & crisp starfield
  if (matId == 99) {
    vec3 dir = normalize(vWorldPos - uCamPos);
    float elev = clamp(dir.y, 0.0, 1.0);
    vec3 zenith = vec3(0.010, 0.022, 0.056);
    vec3 horizon = vec3(0.035, 0.085, 0.155);
    vec3 sky = mix(horizon, zenith, pow(elev, 0.65));

    // Nebula / mist band
    float mist = fbm(dir.xz * 3.2 + vec2(uTime * 0.008, 0.0));
    sky += vec3(0.02, 0.07, 0.13) * mist * smoothstep(0.05, 0.65, elev);

    // Stars
    vec2 starCell = floor(dir.xz / max(dir.y + 0.25, 0.15) * 140.0);
    float sRand = hash21(starCell);
    if (sRand > 0.994 && elev > 0.12) {
      float tw = 0.65 + 0.35 * sin(uTime * 2.2 + sRand * 90.0);
      sky += vec3(0.75, 0.92, 1.0) * tw * smoothstep(0.12, 0.45, elev);
    }

    // Polyphemus gas giant
    vec3 polyDir = normalize(vec3(-0.34, 0.42, -0.84));
    float pAng = acos(clamp(dot(dir, polyDir), -1.0, 1.0));
    if (pAng < 0.21) {
      float pDisc = 1.0 - smoothstep(0.175, 0.21, pAng);
      float bands = 0.5 + 0.5 * sin((dir.y - polyDir.y) * 58.0 + fbm(dir.xy * 18.0) * 3.5);
      vec3 polyCol = mix(vec3(0.06, 0.18, 0.34), vec3(0.18, 0.48, 0.68), bands);
      float litSide = clamp(dot(normalize(dir - polyDir * 0.8), normalize(vec3(0.6, 0.5, -0.5))) * 0.5 + 0.5, 0.15, 1.0);
      sky = mix(sky, polyCol * litSide, pDisc * 0.85);
    }

    // Two smaller moons
    vec3 m1Dir = normalize(vec3(-0.56, 0.33, -0.76));
    float m1 = 1.0 - smoothstep(0.022, 0.032, acos(clamp(dot(dir, m1Dir), -1.0, 1.0)));
    sky += vec3(0.55, 0.92, 1.0) * m1 * 1.4;

    vec3 m2Dir = normalize(vec3(-0.46, 0.48, -0.75));
    float m2 = 1.0 - smoothstep(0.013, 0.020, acos(clamp(dot(dir, m2Dir), -1.0, 1.0)));
    sky += vec3(0.85, 0.78, 1.0) * m2 * 1.1;

    fragColor = vec4(sky, 1.0);
    return;
  }

  // River water surface
  if (matId == 1) {
    vec3 N = normalize(vec3(0.0, 1.0, 0.0));
    float w1 = vnoise(vec2(vWorldPos.x * 2.4, vWorldPos.z * 1.1 + uTime * 1.65));
    float w2 = vnoise(vec2(vWorldPos.x * 5.2 + 3.1, vWorldPos.z * 2.6 + uTime * 2.9));
    float h = (w1 * 0.6 + w2 * 0.4) - 0.5;
    N = normalize(vec3(h * 0.18, 1.0, (w2 - 0.5) * 0.22));

    vec3 V = normalize(uCamPos - vWorldPos);
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.6);
    vec3 deepWater = vec3(0.008, 0.026, 0.056);
    vec3 bioShimmer = vec3(0.04, 0.48, 0.62) * smoothstep(0.58, 0.85, w1 + w2 * 0.45);
    vec3 violetBounce = vec3(0.26, 0.09, 0.44) * (0.35 + 0.35 * sin(vWorldPos.z * 0.06 + vWorldPos.x * 0.2));

    vec3 moonDir = normalize(vec3(0.28, 0.72, -0.63));
    vec3 H = normalize(moonDir + V);
    float spec = pow(max(dot(N, H), 0.0), 64.0) * 0.55;

    vec3 col = mix(deepWater, vec3(0.08, 0.26, 0.42), fresnel * 0.65) + bioShimmer + violetBounce * 0.32 + vec3(0.5, 0.85, 1.0) * spec;
    col *= mix(0.35, 1.0, vExtra.x);
    col = applyNightFog(col, vWorldPos);
    fragColor = vec4(max(col, vec3(0.0)), 1.0);
    return;
  }

  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCamPos - vWorldPos);
  float ao = vExtra.x;
  float glowMask = vExtra.y;

  float detailXY = fbm(vWorldPos.xy * 1.35);
  float detailXZ = fbm(vWorldPos.xz * 1.45);
  float fineDetail = fbm(vWorldPos.xz * 4.6 + vWorldPos.yy * 3.1);
  vec3 blend = abs(N);
  blend /= max(blend.x + blend.y + blend.z, 0.001);
  float texDetail = detailXZ * blend.y + (detailXY * 0.5 + detailXZ * 0.5) * (blend.x + blend.z);

  vec3 bumpPerturb = vec3(
    fbm(vWorldPos.yz * 3.6) - 0.5,
    fineDetail - 0.5,
    fbm(vWorldPos.xy * 3.6) - 0.5
  ) * 0.24;
  N = normalize(N + bumpPerturb);

  vec3 moonDir = normalize(vec3(0.28, 0.72, -0.63));
  float nDotL = max(dot(N, moonDir), 0.0);
  float hemi = N.y * 0.5 + 0.5;
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);

  float wetness = 1.0 - smoothstep(0.0, 2.2, vWorldPos.y);
  vec3 H = normalize(moonDir + V);
  float spec = pow(max(dot(N, H), 0.0), 32.0) * wetness * 0.42;

  float shoreLight = exp(-abs(vWorldPos.y - 0.35) * 1.1) * (0.45 + 0.55 * sin(vWorldPos.z * 0.25 + vWorldPos.x * 0.3));
  vec3 bounceColor = mix(vec3(0.05, 0.45, 0.55), vec3(0.36, 0.14, 0.52), 0.5 + 0.5 * sin(vWorldPos.z * 0.05));

  vec3 baseCol = vec3(0.02, 0.04, 0.07);
  vec3 emissive = vec3(0.0);

  if (matId == 0) {
    // Valley terrain & mossy banks
    float slope = clamp(N.y, 0.0, 1.0);
    vec3 wetRock = vec3(0.014, 0.026, 0.052) * (0.65 + 0.7 * fineDetail);
    vec3 deepMoss = vec3(0.014, 0.072, 0.088) * (0.6 + 0.8 * texDetail);
    baseCol = mix(wetRock, deepMoss, smoothstep(0.45, 0.88, slope) * smoothstep(-0.1, 0.5, vWorldPos.y));
    float vein = smoothstep(0.66, 0.78, fbm(vWorldPos.xz * 1.8)) * glowMask;
    emissive += vec3(0.08, 0.88, 0.86) * vein * 1.2;
  } else if (matId == 2) {
    // Jagged layered rock cliffs, waterfall housings, stone arch & floating mountains
    float strata = 0.5 + 0.5 * sin(vWorldPos.y * 4.2 + texDetail * 5.0 + fineDetail * 1.8);
    vec3 darkSlate = mix(vec3(0.016, 0.030, 0.062), vec3(0.042, 0.074, 0.132), strata * texDetail);
    vec3 topMoss = vec3(0.018, 0.095, 0.105) * (0.75 + 0.5 * fineDetail);
    baseCol = mix(darkSlate, topMoss, smoothstep(0.52, 0.88, N.y) * 0.82) * vTint.rgb;
    baseCol *= (1.0 - wetness * 0.25);
    float crevice = smoothstep(0.58, 0.84, fineDetail) * glowMask;
    emissive += mix(vec3(0.08, 0.85, 0.95), vec3(0.62, 0.26, 0.98), 0.35 + 0.35 * sin(vWorldPos.y * 1.4)) * crevice * 1.1;
  } else if (matId == 5 || matId == 6) {
    // Jungle trees & glowing willow tendrils
    baseCol = mix(vec3(0.022, 0.036, 0.065), vec3(0.025, 0.085, 0.105), detailXZ) * vTint.rgb;
    emissive += vTint.rgb * glowMask * (0.75 + 0.35 * sin(uTime * 2.0 + vWorldPos.y * 2.5));
  } else if (matId == 7 || matId == 8 || matId == 9 || matId == 10 || matId == 11 || matId == 12) {
    // Bioluminescent flora: ferns, reeds, glow buds, golden blossoms, mushrooms & canopy jellyfish
    baseCol = vec3(0.02, 0.05, 0.08) * vTint.rgb;
    float pulse = 0.82 + 0.25 * sin(uTime * 1.8 + vWorldPos.x * 0.7 + vWorldPos.z * 0.5);
    emissive += vTint.rgb * (0.35 + glowMask * 1.15) * pulse;
  }

  vec3 ambient = mix(vec3(0.012, 0.024, 0.052), vec3(0.036, 0.082, 0.145), hemi) * ao;
  vec3 diffuse = vec3(0.15, 0.28, 0.46) * nDotL * ao;
  vec3 lit = baseCol * (ambient + diffuse + bounceColor * shoreLight * 0.42);
  lit += vec3(0.28, 0.65, 0.88) * spec * ao;
  lit += vec3(0.14, 0.38, 0.58) * rim * 0.18 * ao;
  lit += emissive;
  lit = applyNightFog(lit, vWorldPos);
  fragColor = vec4(max(lit, vec3(0.0)), 1.0);
}`;

const VS_FX = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aUv;
layout(location = 3) in vec3 aExtra;
layout(location = 4) in float aMatId;

uniform mat4 uViewProj;
uniform mat4 uModel;
uniform vec4 uTint;

out vec3 vWorldPos;
out vec3 vNormal;
out vec2 vUv;
out vec3 vExtra;
out vec4 vTint;
out float vMatId;

void main() {
  vec4 wp = uModel * vec4(aPos, 1.0);
  vWorldPos = wp.xyz;
  vNormal = normalize(mat3(uModel) * aNormal);
  vUv = aUv;
  vExtra = aExtra;
  vTint = uTint;
  vMatId = aMatId;
  gl_Position = uViewProj * wp;
}`;

const FS_FX = `#version 300 es
precision highp float;

in vec3 vWorldPos;
in vec3 vNormal;
in vec2 vUv;
in vec3 vExtra;
in vec4 vTint;
in float vMatId;

out vec4 fragColor;

uniform float uTime;
uniform vec3 uCamPos;

float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

void main() {
  int matId = int(vMatId + 0.5);
  float d = length(vWorldPos - uCamPos);
  float distFade = exp(-max(d - 22.0, 0.0) * 0.014);

  if (matId == 4) {
    // Multi-strand waterfall ribbons
    float edgeFade = vExtra.x;
    float layerBoost = vExtra.y;
    float warp = (vnoise(vec2(vUv.x * 7.0, vUv.y * 2.5 - uTime * 2.4)) - 0.5) * 0.18;
    float s1 = vnoise(vec2((vUv.x + warp) * 22.0, vUv.y * 4.5 - uTime * 4.8));
    float s2 = vnoise(vec2((vUv.x - warp * 0.7) * 42.0 + 4.3, vUv.y * 8.0 - uTime * 7.6));
    float filaments = pow(clamp(s1 * 0.55 + s2 * 0.45, 0.0, 1.0), 1.65);
    float vNorm = clamp(vUv.y / 3.0, 0.0, 1.0);
    float crestGlow = (1.0 - smoothstep(0.0, 0.14, vNorm)) * 0.65;
    float splashGlow = smoothstep(0.76, 1.0, vNorm) * 1.15;

    vec3 deepCyan = vec3(0.08, 0.64, 0.94);
    vec3 brightFoam = vec3(0.78, 0.99, 1.0);
    vec3 waterCol = mix(deepCyan, brightFoam, clamp(filaments * 1.25 + splashGlow * 0.6, 0.0, 1.0));
    float alpha = edgeFade * (0.28 + 0.68 * filaments + crestGlow + splashGlow) * distFade;
    fragColor = vec4(waterCol * (1.15 + filaments * 0.95) * layerBoost * alpha, alpha);
  } else if (matId == 15) {
    // Plunge-pool concentric ripples
    float distR = 1.0 - vExtra.x;
    float rings = 0.5 + 0.5 * sin(distR * 28.0 - uTime * 5.2);
    float ringLine = pow(rings, 3.0) * smoothstep(0.0, 0.18, distR) * smoothstep(1.0, 0.25, distR);
    float coreMist = exp(-distR * 4.2) * 0.75;
    vec3 col = mix(vec3(0.14, 0.88, 0.96), vec3(0.72, 0.98, 1.0), coreMist);
    float alpha = (ringLine * 0.65 + coreMist) * distFade;
    fragColor = vec4(col * 1.35 * alpha, alpha);
  } else {
    // Volumetric light shafts
    vec3 N = normalize(vNormal);
    vec3 V = normalize(uCamPos - vWorldPos);
    float viewFade = pow(abs(dot(N, V)), 1.65);
    float verticalFade = sin(clamp(vUv.y, 0.0, 1.0) * 3.14159);
    float shimmer = 0.75 + 0.25 * vnoise(vec2(vUv.x * 8.0 + uTime * 0.15, vUv.y * 3.0));
    float alpha = viewFade * verticalFade * shimmer * 0.12 * distFade;
    fragColor = vec4(vTint.rgb * alpha * 1.35, alpha);
  }
}`;

const VS_PARTICLES = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aSeed;
layout(location = 1) in vec3 aColor;
layout(location = 2) in float aSize;

uniform mat4 uViewProj;
uniform float uTime;
uniform vec3 uCamPos;
uniform float uPixelRatio;

out vec3 vColor;
out float vAlpha;

void main() {
  float t = uTime * (0.35 + aSeed.z * 0.45) + aSeed.x * 37.0;
  float zWrap = mod(aSeed.y * 360.0 - uTime * (1.8 + aSeed.z * 2.2), 360.0);
  float z = uCamPos.z + 24.0 - zWrap;
  float cx = sin(z * 0.022) * 7.5 + cos(z * 0.009) * 4.2;
  float x = cx + sin(t * 1.3 + aSeed.x * 20.0) * (3.5 + aSeed.z * 7.5);
  float y = 0.4 + fract(aSeed.x * 13.7 + sin(t) * 0.15) * 6.5;

  vec4 wp = vec4(x, y, z, 1.0);
  float dist = length(wp.xyz - uCamPos);
  float fade = exp(-max(dist - 8.0, 0.0) * 0.022);
  float twinkle = 0.55 + 0.45 * sin(uTime * 3.2 + aSeed.y * 80.0);

  vColor = aColor;
  vAlpha = fade * twinkle * 0.85;
  gl_Position = uViewProj * wp;
  gl_PointSize = clamp((aSize * uPixelRatio * 28.0) / max(dist, 1.5), 1.5, 14.0);
}`;

const FS_PARTICLES = `#version 300 es
precision highp float;

in vec3 vColor;
in float vAlpha;
out vec4 fragColor;

void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(p, p);
  if (r2 > 1.0) discard;
  float soft = pow(1.0 - r2, 2.2);
  fragColor = vec4(vColor * soft * vAlpha * 1.5, soft * vAlpha);
}`;

const VS_QUAD = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FS_BLOOM = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uSceneTex;
uniform vec2 uTexelSize;

void main() {
  vec3 sum = vec3(0.0);
  float weights[5];
  weights[0] = 0.227027;
  weights[1] = 0.1945946;
  weights[2] = 0.1216216;
  weights[3] = 0.054054;
  weights[4] = 0.016216;

  vec3 c0 = max(texture(uSceneTex, vUv).rgb - vec3(0.45), vec3(0.0));
  sum += c0 * weights[0];
  for (int i = 1; i < 5; i++) {
    vec2 off = vec2(float(i)) * uTexelSize * 2.2;
    vec3 cp = max(texture(uSceneTex, clamp(vUv + off, 0.001, 0.999)).rgb - vec3(0.45), vec3(0.0));
    vec3 cn = max(texture(uSceneTex, clamp(vUv - off, 0.001, 0.999)).rgb - vec3(0.45), vec3(0.0));
    sum += (cp + cn) * weights[i];
  }
  fragColor = vec4(sum * 1.15, 1.0);
}`;

const FS_COMPOSITE = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uSceneTex;
uniform sampler2D uBloomTex;

vec3 acesToneMap(vec3 x) {
  float a = 2.51;
  float b = 0.03;
  float c = 2.43;
  float d = 0.59;
  float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main() {
  vec3 sceneCol = texture(uSceneTex, vUv).rgb;
  vec3 bloomCol = texture(uBloomTex, vUv).rgb;
  vec3 hdr = sceneCol + bloomCol * 0.42;
  vec3 ldr = acesToneMap(hdr);
  ldr = pow(max(ldr, vec3(0.0)), vec3(1.0 / 2.2));
  fragColor = vec4(ldr, 1.0);
}`;

function compileShader(glCtx, type, src) {
  const sh = glCtx.createShader(type);
  glCtx.shaderSource(sh, src);
  glCtx.compileShader(sh);
  if (!glCtx.getShaderParameter(sh, glCtx.COMPILE_STATUS)) {
    const log = glCtx.getShaderInfoLog(sh);
    glCtx.deleteShader(sh);
    throw new Error("Shader-Fehler: " + log);
  }
  return sh;
}

function createProgram(glCtx, vsSrc, fsSrc) {
  const vs = compileShader(glCtx, glCtx.VERTEX_SHADER, vsSrc);
  const fs = compileShader(glCtx, glCtx.FRAGMENT_SHADER, fsSrc);
  const prog = glCtx.createProgram();
  glCtx.attachShader(prog, vs);
  glCtx.attachShader(prog, fs);
  glCtx.linkProgram(prog);
  if (!glCtx.getProgramParameter(prog, glCtx.LINK_STATUS)) {
    const log = glCtx.getProgramInfoLog(prog);
    glCtx.deleteProgram(prog);
    throw new Error("Program-Link-Fehler: " + log);
  }
  return prog;
}

let progOpaque, progFx, progParticles, progBloom, progComposite;
try {
  progOpaque = createProgram(gl, VS_WORLD, FS_OPAQUE);
  progFx = createProgram(gl, VS_FX, FS_FX);
  progParticles = createProgram(gl, VS_PARTICLES, FS_PARTICLES);
  progBloom = createProgram(gl, VS_QUAD, FS_BLOOM);
  progComposite = createProgram(gl, VS_QUAD, FS_COMPOSITE);
} catch (e) {
  showError(e.message);
  return;
}
