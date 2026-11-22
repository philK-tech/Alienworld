// shaders.js: GLSL-Shader und Programmerstellung
// --- Shaders ---
// Gemeinsamer GLSL-Code: Rauschen, leuchtende Punktmuster, Himmel und Nebel.
// Wird vor die Fragment-Shader gehängt, die ihn brauchen.
const GLSL_COMMON = `
float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}
float hash31(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
             mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 4; i++) {
    v += a * vnoise(p);
    p = rot * p * 2.04;
    a *= 0.5;
  }
  return v;
}

// Leuchtpunkte: in jeder Zelle eines Gitters sitzt mit Wahrscheinlichkeit 'keep' ein runder Punkt.
// Werden die Punkte kleiner als ein Pixel, wird statt dessen ihr Mittelwert gezeigt (kein Flimmern).
// .x = Helligkeit, .y = Zufallswert der Zelle (für Farbvariation)
vec2 dotField(vec2 p, float r, float keep) {
  vec2 c = floor(p);
  vec2 f = fract(p);
  float h = hash21(c);
  vec2 o = vec2(hash21(c + 17.1), hash21(c + 31.7)) * 0.5 + 0.25;
  float rr = r * (0.55 + 0.9 * hash21(c + 5.3));
  float d = length(f - o);
  float on = step(1.0 - keep, h);
  float dotv = on * smoothstep(rr, rr * 0.2, d);
  float fw = length(fwidth(p));
  float avg = keep * 3.14159 * r * r * 0.45;
  return vec2(mix(dotv, avg, smoothstep(r * 0.6, r * 2.2, fw)), hash21(c + 9.7));
}

// Farbe der Biolumineszenz: überwiegend Türkis und Blau, selten Violett
vec3 bioColor(float h) {
  vec3 c = mix(vec3(0.05, 0.75, 1.0), vec3(0.10, 0.35, 1.0), smoothstep(0.35, 0.75, h));
  return mix(c, vec3(0.75, 0.25, 1.0), step(0.9, h));
}

const vec3 GIANT_DIR = vec3(-0.337, 0.379, -0.862);
const vec3 MOON_DIR = vec3(-0.43, 0.55, -0.72);

// Dunst am Horizont, heller in Richtung des Gasriesen
vec3 skyHaze(vec3 dir) {
  float g = max(dot(dir, GIANT_DIR), 0.0);
  vec3 c = vec3(0.010, 0.026, 0.055);
  c += vec3(0.020, 0.055, 0.10) * pow(g, 6.0);
  return c;
}

vec3 skyColor(vec3 dir, float t) {
  float elev = clamp(dir.y, 0.0, 1.0);
  vec3 sky = mix(skyHaze(dir), vec3(0.002, 0.005, 0.016), pow(elev, 0.5));

  // Milchstraßenband
  vec3 bandN = normalize(vec3(0.5, 0.25, 0.83));
  float band = exp(-pow(dot(dir, bandN) * 4.5, 2.0));
  float neb = fbm(dir.xz * 5.0 / (dir.y + 0.4) + 3.0);
  sky += vec3(0.020, 0.030, 0.060) * band * (0.4 + neb) * smoothstep(0.02, 0.3, elev);

  // Sterne: Zellen auf der Himmelskugel, unterschiedliche Größe und Helligkeit
  for (int k = 0; k < 2; k++) {
    float sc = k == 0 ? 180.0 : 420.0;
    vec3 sp = dir * sc;
    vec3 cell = floor(sp);
    float h = hash31(cell);
    float thresh = k == 0 ? 0.985 : 0.965;
    if (h > thresh) {
      vec3 o = vec3(hash31(cell + 3.1), hash31(cell + 7.7), hash31(cell + 1.9)) * 0.6 + 0.2;
      float d = length(fract(sp) - o);
      float tw = 0.6 + 0.4 * sin(t * (1.5 + h * 3.0) + h * 80.0);
      float bright = (h - thresh) / (1.0 - thresh);
      vec3 sc2 = mix(vec3(0.7, 0.85, 1.0), vec3(1.0, 0.9, 0.8), hash31(cell + 5.0));
      sky += sc2 * smoothstep(0.32, 0.0, d) * tw * (k == 0 ? 2.5 : 0.9) * bright * smoothstep(0.03, 0.2, elev);
    }
  }

  // Gasriese mit Bändern, Wirbeln und Atmosphärensaum
  float cosA = dot(dir, GIANT_DIR);
  float ang = acos(clamp(cosA, -1.0, 1.0));
  float R = 0.22;
  if (ang < R * 1.25) {
    vec3 up = vec3(0.0, 1.0, 0.0);
    vec3 ax = normalize(cross(GIANT_DIR, up));
    vec3 ay = cross(ax, GIANT_DIR);
    vec2 q = vec2(dot(dir, ax), dot(dir, ay)) / R;
    float r2 = dot(q, q);
    if (r2 < 1.0) {
      vec3 n = vec3(q, sqrt(1.0 - r2));
      float lat = n.y * 0.92 + n.x * 0.25;
      float turb = fbm(vec2(lat * 9.0, n.x * 3.0) + vec2(t * 0.004, 0.0));
      float bands = 0.5 + 0.5 * sin(lat * 26.0 + turb * 4.5);
      vec3 col = mix(vec3(0.03, 0.10, 0.24), vec3(0.14, 0.38, 0.58), bands);
      col = mix(col, vec3(0.45, 0.70, 0.85), smoothstep(0.75, 0.95, turb) * 0.35);
      float spot = exp(-dot(q - vec2(0.3, -0.25), q - vec2(0.3, -0.25)) * 60.0);
      col = mix(col, vec3(0.6, 0.85, 1.0), spot * 0.6);
      // Beleuchtung durch die ferne Sonne: Sichel mit weichem Terminator
      float lit = smoothstep(-0.25, 0.6, dot(n, normalize(vec3(0.75, 0.35, 0.55))));
      float limb = pow(n.z, 0.35);
      sky = mix(sky, col * (0.04 + 0.6 * lit) * limb * 0.8, smoothstep(1.0, 0.985, r2));
    }
    float rim = exp(-abs(sqrt(r2) - 1.0) * 18.0) * smoothstep(-0.3, 0.6, q.x * 0.7 + q.y * 0.3);
    sky += vec3(0.15, 0.4, 0.8) * rim * 0.5;
  }
  sky += vec3(0.04, 0.10, 0.2) * pow(max(cosA, 0.0), 40.0) * 0.6;

  // Zwei kleine Monde
  vec3 m1Dir = normalize(vec3(-0.62, 0.30, -0.72));
  float m1 = smoothstep(0.016, 0.012, acos(clamp(dot(dir, m1Dir), -1.0, 1.0)));
  sky += vec3(0.75, 0.88, 1.0) * m1 * 2.2 + vec3(0.1, 0.2, 0.35) * pow(max(dot(dir, m1Dir), 0.0), 800.0);
  vec3 m2Dir = normalize(vec3(-0.12, 0.52, -0.84));
  float m2 = smoothstep(0.010, 0.007, acos(clamp(dot(dir, m2Dir), -1.0, 1.0)));
  sky += vec3(0.9, 0.82, 1.0) * m2 * 1.8;
  return sky;
}

// Höhennebel: dicht über dem Wasser und am Boden, dünn in der Höhe, mit treibenden Schwaden
vec3 applyFog(vec3 col, vec3 wp, vec3 camPos, float t) {
  vec3 d = wp - camPos;
  float dist = length(d);
  vec3 dir = d / max(dist, 1e-3);
  float fall = 0.075;
  float h0 = camPos.y;
  float dy = d.y;
  float k = abs(dy) > 0.01 ? (1.0 - exp(-fall * dy)) / (fall * dy) : 1.0;
  float swirl = 0.55 + 0.9 * vnoise(wp.xz * 0.045 + vec2(t * 0.03, -t * 0.02));
  float dens = 0.0105 * exp(-fall * (h0 - 0.5)) * swirl;
  float f = 1.0 - exp(-dens * max(dist - 4.0, 0.0) * k);
  // tief liegender Nebel nimmt das türkise Leuchten des Waldbodens auf
  vec3 fc = skyHaze(dir) + vec3(0.0, 0.020, 0.028) * exp(-max(wp.y, 0.0) * 0.25);
  return mix(col, fc, clamp(f, 0.0, 0.97));
}
`;

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
uniform vec3 uOffset;
uniform vec4 uAnim;

out vec3 vWorldPos;
out vec3 vLocalPos;
out vec3 vNormal;
out vec2 vUv;
out vec3 vExtra;
out vec4 vTint;
out float vMatId;
out float vSeed;

void main() {
  mat4 modelMat = uModel;
  vec4 tint = uTint;
  if (uInstanced > 0.5) {
    modelMat = mat4(aInstCol0, aInstCol1, aInstCol2, aInstCol3);
    tint = aInstTint;
  }

  vec3 p = aPos;
  int matId = int(aMatId + 0.5);
  vec3 origin = modelMat[3].xyz;

  // Wind in Blättern, Ranken und Lianen
  if (matId == 6 || matId == 7 || matId == 8 || matId == 10 || matId == 12 || matId == 13 || matId == 14 || matId == 16) {
    float phase = origin.x * 0.37 + origin.z * 0.29 + uTime * 1.1;
    float amt = aExtra.z * 0.06;
    if (matId == 12) amt = 0.08 + aUv.y * 0.14;
    if (matId == 14 || matId == 16) amt = (aExtra.z - 1.0) * (matId == 16 ? 0.05 : 0.09);
    p.x += sin(phase + aPos.y * 2.0) * amt;
    p.z += cos(phase * 0.83 + 1.1 + aPos.y * 1.7) * amt * 0.75;
  }

  vec3 nrm = aNormal;
  if (matId == 21) {
    // Gleiter: Flügelschlag, außen stärker
    float flap = sin(uTime * 3.4 + uAnim.x) * 0.6 + sin(uTime * 1.1 + uAnim.x) * 0.15;
    p.y += flap * pow(aExtra.z, 1.3) * 0.75;
  } else if (matId == 22) {
    // Springfisch: Schwanzschlag
    p.x += sin(uTime * 16.0 + uAnim.x - aExtra.z * 5.0) * 0.09 * aExtra.z;
  } else if (matId == 23 && aExtra.z > 0.5) {
    // Langhals: Hals und Kopf drehen sich um das Halsgelenk (uAnim.y = Winkel)
    vec3 pivot = vec3(0.0, 2.65, -1.45);
    float c = cos(uAnim.y), s = sin(uAnim.y);
    vec3 r = p - pivot;
    p = pivot + vec3(r.x, r.y * c - r.z * s, r.y * s + r.z * c);
    nrm = vec3(nrm.x, nrm.y * c - nrm.z * s, nrm.y * s + nrm.z * c);
  }

  vec4 wp = modelMat * vec4(p, 1.0);
  vLocalPos = wp.xyz;
  vWorldPos = wp.xyz + uOffset;
  vNormal = normalize(mat3(modelMat) * nrm);
  vUv = aUv;
  vExtra = aExtra;
  vTint = tint;
  vMatId = aMatId;
  vSeed = fract(origin.x * 0.137 + origin.z * 0.071);
  gl_Position = uViewProj * vec4(vWorldPos, 1.0);
}`;

const FS_OPAQUE = `#version 300 es
precision highp float;

in vec3 vWorldPos;
in vec3 vLocalPos;
in vec3 vNormal;
in vec2 vUv;
in vec3 vExtra;
in vec4 vTint;
in float vMatId;
in float vSeed;

out vec4 fragColor;

uniform float uTime;
uniform vec3 uCamPos;
uniform vec3 uRidePos;
uniform float uClip;
uniform sampler2D uReflTex;
uniform sampler2D uBoatTex;
uniform vec4 uBoat;      // x, z, Kurswinkel, 1 = Boot vorhanden
uniform vec2 uBoatScale; // Skalierung des Bootsmodells in x und z
uniform vec2 uScreen;
` + GLSL_COMMON + `

void main() {
  int matId = int(vMatId + 0.5);
  if (uClip > 0.5 && vWorldPos.y < -0.03) discard;

  if (matId == 99) {
    vec3 dir = normalize(vWorldPos - uCamPos);
    fragColor = vec4(skyColor(dir, uTime), 1.0);
    return;
  }

  vec3 lp = vLocalPos;
  float t = uTime;
  // Reaktion auf das vorbeifahrende Boot: alles Leuchtende in der Nähe flammt auf
  float rideD = length((vWorldPos - uRidePos) * vec3(1.0, 0.6, 1.0));
  float react = 1.0 + 2.2 * exp(-rideD * 0.16) * (0.75 + 0.25 * sin(t * 3.0 - rideD * 0.8));
  if (matId >= 20) react = 1.0;
  // langsame Lichtwellen, die durch den Wald laufen
  float wave = 0.75 + 0.35 * sin(lp.z * 0.09 + lp.x * 0.05 + t * 0.9);

  if (matId == 1) {
    // Fluss: dunkler Spiegel mit Reflexionen, treibendem Plankton und leuchtendem Ufersaum
    // Im Inneren des Boots gibt es kein Wasser (der Rumpfboden liegt unter der Wasserlinie)
    if (uBoat.w > 0.5) {
      vec2 d = vWorldPos.xz - uBoat.xy;
      float sy = sin(uBoat.z), cy = cos(uBoat.z);
      float bz = dot(d, vec2(sy, cy)) / uBoatScale.y;
      float bx = dot(d, vec2(cy, -sy)) / uBoatScale.x;
      if (abs(bz) < 0.82 && abs(bx) < 0.28 * (1.0 - bz * bz)) discard;
    }
    vec2 q = lp.xz;
    vec2 flow = vec2(0.0, t * 0.55);
    float e = 0.15;
    float h0 = vnoise(q * 0.9 + flow) * 0.6 + vnoise(q * 2.3 + flow * 1.7 + 4.0) * 0.3 + vnoise(q * 6.0 + flow * 2.5) * 0.1;
    float hx = vnoise((q + vec2(e, 0.0)) * 0.9 + flow) * 0.6 + vnoise((q + vec2(e, 0.0)) * 2.3 + flow * 1.7 + 4.0) * 0.3 + vnoise((q + vec2(e, 0.0)) * 6.0 + flow * 2.5) * 0.1;
    float hz = vnoise((q + vec2(0.0, e)) * 0.9 + flow) * 0.6 + vnoise((q + vec2(0.0, e)) * 2.3 + flow * 1.7 + 4.0) * 0.3 + vnoise((q + vec2(0.0, e)) * 6.0 + flow * 2.5) * 0.1;
    vec3 N = normalize(vec3(-(hx - h0) / e * 0.22, 1.0, -(hz - h0) / e * 0.22));
    vec3 V = normalize(uCamPos - vWorldPos);
    float fres = 0.04 + 0.96 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
    vec2 suv = gl_FragCoord.xy / uScreen + N.xz * vec2(0.035, 0.05);
    vec3 refl = texture(uReflTex, clamp(suv, vec2(0.001), vec2(0.999))).rgb;
    vec3 deep = vec3(0.002, 0.010, 0.016);
    vec3 col = mix(deep, refl, 0.35 + 0.6 * fres);

    // Plankton, das mit der Strömung treibt
    vec2 pd = dotField(q * 1.4 + vec2(0.0, t * 0.8), 0.1, 0.12);
    col += bioColor(pd.y * 0.7) * pd.x * (0.8 + 0.6 * sin(t * 2.0 + pd.y * 40.0)) * 0.8 * react;
    // Ufersaum
    float shore = vExtra.x;
    float foam = smoothstep(0.25, 0.95, shore) * (0.5 + 0.5 * vnoise(q * 3.0 + flow * 2.0));
    col += vec3(0.05, 0.55, 0.75) * foam * 0.18 * wave * react;
    // Mondglanz
    vec3 H = normalize(MOON_DIR + V);
    col += vec3(0.4, 0.6, 0.9) * pow(max(dot(N, H), 0.0), 220.0) * 1.5;
    col = applyFog(col, vWorldPos, uCamPos, t);
    fragColor = vec4(clamp(col, vec3(0.0), vec3(30.0)), 1.0);
    return;
  }

  vec3 N = normalize(vNormal);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(uCamPos - vWorldPos);
  float ao = vExtra.x;
  float glowMask = vExtra.y;

  // Feine Oberflächenstruktur aus Rauschen (Triplanar)
  vec3 bl = abs(N);
  bl /= max(bl.x + bl.y + bl.z, 0.001);
  float nXY = fbm(lp.xy * 1.3), nXZ = fbm(lp.xz * 1.3), nYZ = fbm(lp.yz * 1.3);
  float tex = nYZ * bl.x + nXZ * bl.y + nXY * bl.z;
  float fine = fbm(lp.xz * 5.1 + lp.yy * 3.7);

  vec3 base = vec3(0.02);
  vec3 emissive = vec3(0.0);
  float rough = 0.6;
  float wet = 0.0;

  if (matId == 0) {
    // Waldboden: Moos mit Leuchtpunkten, nasser Fels am Wasser
    float moss = smoothstep(0.25, 0.75, N.y) * smoothstep(-0.4, 0.2, lp.y);
    vec3 rock = vec3(0.012, 0.016, 0.026) * (0.6 + 0.8 * fine);
    vec3 mossCol = mix(vec3(0.010, 0.030, 0.026), vec3(0.020, 0.055, 0.040), tex);
    base = mix(rock, mossCol, moss);
    wet = 1.0 - smoothstep(-0.2, 0.6, lp.y);
    float patchM = smoothstep(0.38, 0.68, fbm(lp.xz * 0.22 + 7.0));
    vec2 d1 = dotField(lp.xz * 2.4, 0.16, 0.45);
    vec2 d2 = dotField(lp.xz * 7.0 + 3.0, 0.2, 0.35);
    float dots = (d1.x * 1.2 + d2.x * 0.7) * patchM * moss * (0.25 + glowMask);
    emissive += bioColor(d1.y) * dots * 1.6;
    // flächiges Moosleuchten unter dichten Stellen
    emissive += vec3(0.0, 0.05, 0.06) * patchM * moss * glowMask * 0.6;
  } else if (matId == 2) {
    // Fels: dunkler Schiefer mit Schichtung, Moospolster oben, Flechtenpunkte
    float strata = 0.5 + 0.5 * sin(lp.y * 3.6 + tex * 5.0 + fine * 1.5);
    base = mix(vec3(0.010, 0.014, 0.024), vec3(0.030, 0.040, 0.058), strata * tex) * vTint.rgb;
    float moss = smoothstep(0.45, 0.85, N.y + (fine - 0.5) * 0.4);
    base = mix(base, vec3(0.012, 0.040, 0.035) * (0.7 + 0.6 * fine), moss);
    vec2 dp = abs(N.y) > 0.6 ? lp.xz : (abs(N.x) > abs(N.z) ? lp.zy : lp.xy);
    vec2 d1 = dotField(dp * 3.0, 0.17, 0.3);
    float lichen = smoothstep(0.45, 0.7, fbm(dp * 0.5 + 2.0));
    emissive += bioColor(d1.y) * d1.x * (moss * 1.4 + lichen * 0.5) * 1.3;
    emissive += vec3(0.05, 0.4, 0.6) * glowMask * smoothstep(0.62, 0.8, fine) * 0.25;
    wet = 1.0 - smoothstep(0.0, 2.0, lp.y);
  } else if (matId == 5) {
    // Baumstamm: dunkle, gerippte Rinde mit Reihen leuchtender Punkte
    float ridges = 0.5 + 0.5 * sin(vUv.x * 55.0 + fbm(vec2(vUv.x * 8.0, vUv.y * 2.0)) * 6.0);
    base = mix(vec3(0.012, 0.010, 0.018), vec3(0.035, 0.030, 0.045), ridges * (0.5 + tex));
    vec2 d1 = dotField(vec2(vUv.x * 16.0, vUv.y * 9.0 + vSeed * 10.0), 0.24, 0.5);
    float band = smoothstep(0.3, 0.7, sin(vUv.y * 1.6 + vUv.x * 3.14159 + vSeed * 6.0) * 0.5 + 0.5);
    float lower = 1.0 - smoothstep(0.5, 3.5, vUv.y);
    emissive += mix(vTint.rgb, bioColor(d1.y), 0.5) * d1.x * (band * 0.8 + lower * 0.6) * 2.0;
    rough = 0.8;
  } else if (matId == 6) {
    // Blätterdach: dunkle Blätter, Unterseite mit leuchtenden Punkten und Blattrand
    float edge = 1.0 - abs(vUv.x * 2.0 - 1.0);
    float midrib = exp(-abs(vUv.x - 0.5) * 30.0);
    base = mix(vec3(0.008, 0.030, 0.030), vec3(0.020, 0.060, 0.050), vUv.y * tex);
    vec2 d1 = dotField(vec2(vUv.x * 6.0, vUv.y * 14.0 + vSeed * 20.0), 0.22, 0.35);
    float under = smoothstep(0.2, -0.4, N.y) * 0.7 + 0.3;
    emissive += vTint.rgb * (d1.x * 1.3 * under + midrib * 0.12 + smoothstep(0.12, 0.0, edge) * 0.25) * smoothstep(0.1, 0.5, vUv.y);
    wet = 0.5;
  } else if (matId == 14 || matId == 16) {
    // Lianen: leuchtende Perlen entlang der Ranke, zur Spitze hin heller
    float beads = smoothstep(0.8, 0.98, sin(vUv.y * 1.3) * 0.5 + 0.5);
    float tip = vExtra.y;
    vec3 c = matId == 16 ? vec3(0.1, 0.8, 1.0) : mix(vTint.rgb, vec3(0.1, 0.8, 1.0), 0.4);
    base = vec3(0.01, 0.03, 0.03);
    emissive += c * (0.03 + beads * 0.35 + tip * tip * 0.9);
  } else if (matId == 7) {
    // Farne: Mittelrippe und Blattrand leuchten
    float midrib = exp(-abs(vUv.x - 0.5) * 18.0);
    float edge = exp(-min(vUv.x, 1.0 - vUv.x) * 16.0);
    base = vec3(0.010, 0.040, 0.036);
    emissive += vTint.rgb * (midrib * 0.9 + edge * 0.5) * (0.3 + 0.7 * vUv.y) * (0.3 + glowMask);
  } else if (matId == 8) {
    base = vec3(0.01, 0.035, 0.035);
    emissive += vTint.rgb * glowMask * glowMask * 1.3;
  } else if (matId == 9) {
    base = vec3(0.02, 0.05, 0.08);
    float rings = 0.6 + 0.4 * sin(vUv.y * 30.0);
    emissive += vTint.rgb * (0.12 + glowMask * 0.8 * rings);
  } else if (matId == 10) {
    // goldene Blüten
    base = vec3(0.05, 0.02, 0.02);
    emissive += vTint.rgb * (0.2 + glowMask * 1.4);
  } else if (matId == 11) {
    // Pilze: gepunkteter Hut, Lamellen leuchten
    vec2 d1 = dotField(vUv * vec2(14.0, 6.0), 0.25, 0.6);
    base = vec3(0.03, 0.02, 0.05) * (0.6 + tex);
    emissive += vTint.rgb * (glowMask * 0.08 + d1.x * 1.2 + smoothstep(0.2, -0.6, N.y) * 0.6);
  } else if (matId == 12) {
    // schwebende Quallen
    base = vec3(0.02, 0.04, 0.07);
    float fres2 = pow(1.0 - abs(dot(N, V)), 2.0);
    emissive += vTint.rgb * (0.15 + glowMask * 0.6 + fres2 * 0.9);
  } else if (matId == 13) {
    // Großblättrige Pflanzen: Adern und Ränder leuchten
    float mid = exp(-abs(vUv.x - 0.5) * 26.0);
    float lat = abs(fract((vUv.y - abs(vUv.x - 0.5) * 0.9) * 9.0) - 0.5);
    float veins = smoothstep(0.06, 0.0, lat) * smoothstep(0.02, 0.1, abs(vUv.x - 0.5));
    float edge = exp(-min(vUv.x, 1.0 - vUv.x) * 22.0);
    base = mix(vec3(0.006, 0.030, 0.034), vec3(0.016, 0.060, 0.055), tex);
    float on = vUv.y < 0.0 ? 0.15 : 1.0;
    emissive += vTint.rgb * (mid * 1.0 + veins * 0.55 + edge * 0.45) * on * (0.4 + 0.6 * smoothstep(0.0, 0.4, vUv.y));
    wet = 0.6;
  } else if (matId == 20) {
    // Boot: Holz aus der Textur, die türkisen Einlagen leuchten
    vec3 tc = texture(uBoatTex, vUv).rgb;
    vec3 lin = pow(tc, vec3(2.2));
    base = lin * 2.2;
    float cyan = smoothstep(0.06, 0.22, min(tc.g, tc.b) - tc.r);
    emissive += vec3(0.1, 0.85, 1.0) * cyan * 2.5 * (0.85 + 0.15 * sin(t * 1.3 + vUv.y * 20.0));
    // Widerschein der leuchtenden Umgebung auf dem Holz
    emissive += lin * vec3(0.30, 0.55, 0.62) * (0.55 + 0.45 * N.y);
    wet = 0.45;
  } else if (matId == 21) {
    // Gleiter: dunkle Haut, leuchtende Flügelkanten und Punkte
    float edge = smoothstep(0.82, 1.0, vUv.y) + smoothstep(0.9, 1.0, vUv.x);
    vec2 d1 = dotField(vUv * vec2(10.0, 4.0), 0.25, 0.55);
    base = vec3(0.02, 0.02, 0.05);
    emissive += vTint.rgb * (edge * 1.4 + d1.x * 1.6 * glowMask + 0.05);
  } else if (matId == 22) {
    // Springfisch: leuchtendes Seitenband
    float side = exp(-pow((vUv.x - 0.25) * 10.0, 2.0)) + exp(-pow((vUv.x - 0.75) * 10.0, 2.0));
    base = vec3(0.03, 0.05, 0.08);
    emissive += vTint.rgb * (side * 1.6 + glowMask * 0.9 + 0.08);
    wet = 1.0;
  } else if (matId == 23) {
    // Langhals: dunkle, fein gemusterte Haut, Leuchtflecken auf dem Rücken, leuchtende Augen und Fühler
    vec2 d1 = dotField(vUv * vec2(14.0, 18.0), 0.28, 0.6);
    float stripes = smoothstep(0.7, 0.95, sin(vUv.y * 40.0 + vUv.x * 6.0) * 0.5 + 0.5);
    base = mix(vec3(0.020, 0.025, 0.045), vec3(0.04, 0.05, 0.08), fine);
    emissive += vTint.rgb * (d1.x * glowMask * 1.8 + stripes * 0.03 + max(glowMask - 1.0, 0.0) * 1.2);
    wet = 0.2;
  }

  // Beleuchtung: kühles Licht des Gasriesen, Himmel, Widerschein des leuchtenden Bodens
  float nDotL = max(dot(N, MOON_DIR), 0.0);
  float hemi = N.y * 0.5 + 0.5;
  vec3 ambient = mix(vec3(0.010, 0.030, 0.035), vec3(0.018, 0.036, 0.070), hemi) * ao;
  vec3 moon = vec3(0.16, 0.26, 0.45) * nDotL * ao;
  vec3 H = normalize(MOON_DIR + V);
  float specPow = mix(18.0, 90.0, wet);
  float spec = pow(max(dot(N, H), 0.0), specPow) * (0.04 + wet * 0.5);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 4.0) * 0.12;
  vec3 col = base * (ambient + moon) * 2.2;
  col += vec3(0.25, 0.45, 0.8) * spec * ao;
  col += vec3(0.05, 0.12, 0.22) * rim * ao;
  col += emissive * wave * react * (0.85 + 0.15 * sin(t * 1.7 + vSeed * 30.0));
  col = applyFog(col, vWorldPos, uCamPos, t);
  fragColor = vec4(clamp(col, vec3(0.0), vec3(30.0)), 1.0);
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
uniform vec3 uOffset;

out vec3 vWorldPos;
out vec3 vNormal;
out vec2 vUv;
out vec3 vExtra;
out vec4 vTint;
out float vMatId;

void main() {
  vec4 wp = uModel * vec4(aPos, 1.0);
  wp.xyz += uOffset;
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
` + GLSL_COMMON + `

void main() {
  int matId = int(vMatId + 0.5);
  float d = length(vWorldPos - uCamPos);
  float distFade = exp(-max(d - 25.0, 0.0) * 0.012);

  if (matId == 4) {
    // Wasserfall aus feinen Strähnen
    float edgeFade = vExtra.x;
    float layerBoost = vExtra.y;
    float warp = (vnoise(vec2(vUv.x * 7.0, vUv.y * 2.5 - uTime * 2.4)) - 0.5) * 0.18;
    float s1 = vnoise(vec2((vUv.x + warp) * 26.0, vUv.y * 4.5 - uTime * 4.8));
    float s2 = vnoise(vec2((vUv.x - warp * 0.7) * 52.0 + 4.3, vUv.y * 8.0 - uTime * 7.6));
    float filaments = pow(clamp(s1 * 0.55 + s2 * 0.45, 0.0, 1.0), 2.2);
    float vNorm = clamp(vUv.y / 3.0, 0.0, 1.0);
    float crest = (1.0 - smoothstep(0.0, 0.12, vNorm)) * 0.4;
    float splash = smoothstep(0.8, 1.0, vNorm) * 0.8;
    vec3 waterCol = mix(vec3(0.06, 0.40, 0.75), vec3(0.65, 0.92, 1.0), clamp(filaments * 1.3 + splash * 0.5, 0.0, 1.0));
    float alpha = edgeFade * (0.12 + 0.6 * filaments + crest + splash) * distFade;
    fragColor = vec4(waterCol * layerBoost * alpha * 0.9, alpha);
  } else if (matId == 15) {
    // Ringwellen im Becken unter dem Wasserfall
    float distR = 1.0 - vExtra.x;
    float rings = 0.5 + 0.5 * sin(distR * 28.0 - uTime * 5.2);
    float ringLine = pow(rings, 4.0) * smoothstep(0.0, 0.18, distR) * smoothstep(1.0, 0.25, distR);
    float coreMist = exp(-distR * 4.5) * 0.5;
    vec3 col = mix(vec3(0.10, 0.65, 0.9), vec3(0.6, 0.9, 1.0), coreMist);
    float alpha = (ringLine * 0.4 + coreMist) * distFade * vTint.a;
    fragColor = vec4(col * alpha, alpha);
  } else {
    // dünne Lichtstrahlen des Gasriesen durch das Blätterdach
    vec3 N = normalize(vNormal);
    vec3 V = normalize(uCamPos - vWorldPos);
    float viewFade = pow(abs(dot(N, V)), 2.0);
    float verticalFade = sin(clamp(vUv.y, 0.0, 1.0) * 3.14159) * smoothstep(0.0, 0.4, vUv.y);
    float shimmer = 0.6 + 0.4 * vnoise(vec2(vUv.x * 10.0 + uTime * 0.15, vUv.y * 3.0 - uTime * 0.1));
    float alpha = viewFade * verticalFade * shimmer * 0.035 * distFade;
    fragColor = vec4(vTint.rgb * alpha, alpha);
  }
}`;

// Glühwürmchen und schwebende Samen um die Kamera herum
const VS_PARTICLES = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aSeed;
layout(location = 1) in vec3 aColor;
layout(location = 2) in float aSize;

uniform mat4 uViewProj;
uniform float uTime;
uniform vec3 uCamPos;
uniform vec3 uRidePos;
uniform float uPixelRatio;
uniform float uLoop;

out vec3 vColor;
out float vAlpha;

float riverX(float z) {
  float k = 6.2831853 / uLoop;
  return sin(z * k * 2.0) * 7.5 + cos(z * k) * 4.2 + sin(z * k * 3.0 + 1.3) * 1.6;
}

void main() {
  float t = uTime * (0.25 + aSeed.z * 0.35) + aSeed.x * 37.0;
  float zWrap = mod(aSeed.y * 140.0 - uTime * (0.6 + aSeed.z * 1.2), 140.0);
  float z = uRidePos.z + 20.0 - zWrap;
  float spread = 2.0 + aSeed.z * 12.0;
  float x = riverX(z) + (fract(aSeed.x * 7.31) * 2.0 - 1.0) * spread + sin(t * 1.3 + aSeed.x * 20.0) * 1.2;
  float y = 0.5 + fract(aSeed.x * 13.7) * 7.0 + sin(t * 0.9) * 0.5;

  vec4 wp = vec4(x, y, z, 1.0);
  float dist = length(wp.xyz - uCamPos);
  float fade = exp(-max(dist - 10.0, 0.0) * 0.03) * smoothstep(0.5, 3.0, dist);
  float blink = smoothstep(0.2, 0.9, sin(uTime * (0.8 + aSeed.z) + aSeed.y * 80.0) * 0.5 + 0.5);

  vColor = aColor;
  vAlpha = fade * (0.15 + 0.85 * blink);
  gl_Position = uViewProj * wp;
  gl_PointSize = clamp((aSize * uPixelRatio * 22.0) / max(dist, 1.5), 1.0, 10.0);
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
  float core = exp(-r2 * 7.0);
  fragColor = vec4(vColor * core * vAlpha * 3.0, 0.0);
}`;

// Leuchtpunkte am Waldboden (fest platziert, pulsieren und reagieren auf das Boot)
const VS_GLOWDOTS = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aColor;
layout(location = 2) in float aSize;

uniform mat4 uViewProj;
uniform float uTime;
uniform vec3 uCamPos;
uniform vec3 uRidePos;
uniform vec3 uOffset;
uniform float uPixelRatio;
uniform float uMirror;

out vec3 vColor;

void main() {
  vec3 wp = aPos + uOffset;
  if (uMirror > 0.5 && wp.y < 0.0) wp.y = -1000.0;
  float dist = length(wp - uCamPos);
  float rideD = length((wp - uRidePos) * vec3(1.0, 0.6, 1.0));
  float react = 1.0 + 1.0 * exp(-rideD * 0.18);
  float seed = fract(aPos.x * 0.731 + aPos.z * 0.317);
  float pulse = 0.55 + 0.45 * sin(uTime * (0.7 + seed * 1.3) + seed * 50.0 + aPos.z * 0.08);
  float fade = exp(-max(dist - 20.0, 0.0) * 0.025);
  vColor = aColor * pulse * react * fade;
  gl_Position = uViewProj * vec4(wp, 1.0);
  gl_PointSize = clamp(aSize * uPixelRatio * 7.0 / max(dist, 1.0), 1.0, 5.0);
}`;

const FS_GLOWDOTS = `#version 300 es
precision highp float;
in vec3 vColor;
out vec4 fragColor;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(p, p);
  if (r2 > 1.0) discard;
  fragColor = vec4(vColor * exp(-r2 * 4.0) * 0.35, 0.0);
}`;

const VS_QUAD = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

// Bloom, Schritt 1: Verkleinern (13 Abtastungen); beim ersten Schritt mit weicher Schwelle
const FS_BLOOM_DOWN = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform float uPrefilter;

vec3 s(vec2 o) { return texture(uTex, vUv + o * uTexel).rgb; }

void main() {
  vec3 a = s(vec2(-2.0, 2.0)), b = s(vec2(0.0, 2.0)), c = s(vec2(2.0, 2.0));
  vec3 d = s(vec2(-2.0, 0.0)), e = s(vec2(0.0, 0.0)), f = s(vec2(2.0, 0.0));
  vec3 g = s(vec2(-2.0, -2.0)), h = s(vec2(0.0, -2.0)), i = s(vec2(2.0, -2.0));
  vec3 j = s(vec2(-1.0, 1.0)), k = s(vec2(1.0, 1.0)), l = s(vec2(-1.0, -1.0)), m = s(vec2(1.0, -1.0));
  vec3 col = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
  if (uPrefilter > 0.5) {
    // ungültige Werte (NaN/Inf) dürfen nicht in den Bloom geraten
    if (any(isnan(col)) || any(isinf(col))) col = vec3(0.0);
    col = min(col, vec3(12.0));
    float br = max(col.r, max(col.g, col.b));
    float knee = 0.25, thr = 0.35;
    float soft = clamp(br - thr + knee, 0.0, 2.0 * knee);
    soft = soft * soft / (4.0 * knee + 1e-4);
    col *= max(soft, br - thr) / max(br, 1e-4);
  }
  fragColor = vec4(col, 1.0);
}`;

// Bloom, Schritt 2: Vergrößern mit Zeltfilter, wird additiv auf die größere Stufe gelegt
const FS_BLOOM_UP = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform float uWeight;

vec3 s(vec2 o) { return texture(uTex, vUv + o * uTexel).rgb; }

void main() {
  vec3 col = s(vec2(0.0)) * 4.0;
  col += (s(vec2(-1.0, 0.0)) + s(vec2(1.0, 0.0)) + s(vec2(0.0, -1.0)) + s(vec2(0.0, 1.0))) * 2.0;
  col += s(vec2(-1.0, -1.0)) + s(vec2(1.0, -1.0)) + s(vec2(-1.0, 1.0)) + s(vec2(1.0, 1.0));
  fragColor = vec4(col / 16.0 * uWeight, 1.0);
}`;

const FS_COMPOSITE = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uSceneTex;
uniform sampler2D uBloomTex;
uniform float uTime;
uniform vec2 uScreen;

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  vec3 sceneCol = texture(uSceneTex, vUv).rgb;
  if (any(isnan(sceneCol))) sceneCol = vec3(0.0);
  vec3 bloom = texture(uBloomTex, vUv).rgb;
  vec3 hdr = sceneCol + bloom * 0.55;
  hdr *= 1.6;
  // kühle Schatten, leicht türkise Mitten
  float lum = dot(hdr, vec3(0.2126, 0.7152, 0.0722));
  hdr = mix(hdr, hdr * vec3(0.85, 1.0, 1.15), smoothstep(0.2, 0.0, lum) * 0.5);
  vec3 ldr = aces(hdr);
  ldr = pow(ldr, vec3(1.0 / 2.2));
  vec2 c = vUv - 0.5;
  ldr *= 1.0 - dot(c, c) * 0.55;
  // Dithering gegen Farbstufen in den dunklen Verläufen
  float n = fract(sin(dot(gl_FragCoord.xy + fract(uTime) * 61.0, vec2(12.9898, 78.233))) * 43758.5453);
  ldr += (n - 0.5) / 255.0;
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
  // Uniform-Positionen einmal abfragen und am Programm merken
  const u = {};
  const n = glCtx.getProgramParameter(prog, glCtx.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const name = glCtx.getActiveUniform(prog, i).name.replace(/\[0\]$/, "");
    u[name] = glCtx.getUniformLocation(prog, name);
  }
  return { prog, u };
}

let progOpaque, progFx, progParticles, progGlowDots, progBloomDown, progBloomUp, progComposite;
try {
  progOpaque = createProgram(gl, VS_WORLD, FS_OPAQUE);
  progFx = createProgram(gl, VS_FX, FS_FX);
  progParticles = createProgram(gl, VS_PARTICLES, FS_PARTICLES);
  progGlowDots = createProgram(gl, VS_GLOWDOTS, FS_GLOWDOTS);
  progBloomDown = createProgram(gl, VS_QUAD, FS_BLOOM_DOWN);
  progBloomUp = createProgram(gl, VS_QUAD, FS_BLOOM_UP);
  progComposite = createProgram(gl, VS_QUAD, FS_COMPOSITE);
} catch (e) {
  showError(e.message);
  return;
}
