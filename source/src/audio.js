// audio.js: Optionale Klangkulisse (Web Audio)
// --- Optional Web Audio ---
let audioCtx = null, masterGain = null, audioEnabled = false;
function initAudio() {
  if (audioCtx) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  audioCtx = new Ctx();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.0;
  masterGain.connect(audioCtx.destination);

  // Soft filtered pink/brown noise for river & waterfall ambiance
  const bufSize = audioCtx.sampleRate * 3;
  const noiseBuf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  let lastOut = 0.0;
  for (let i = 0; i < bufSize; i++) {
    const white = Math.random() * 2 - 1;
    lastOut = (lastOut + 0.025 * white) / 1.025;
    data[i] = lastOut * 2.8;
  }
  const noiseSrc = audioCtx.createBufferSource();
  noiseSrc.buffer = noiseBuf;
  noiseSrc.loop = true;

  const filter = audioCtx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 420;
  filter.Q.value = 0.65;

  const waterGain = audioCtx.createGain();
  waterGain.gain.value = 0.35;

  noiseSrc.connect(filter);
  filter.connect(waterGain);
  waterGain.connect(masterGain);
  noiseSrc.start();

  // Gentle ambient drone
  const osc = audioCtx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = 110.0;
  const oscGain = audioCtx.createGain();
  oscGain.gain.value = 0.06;
  osc.connect(oscGain);
  oscGain.connect(masterGain);
  osc.start();
}

function setAudio(enabled) {
  audioEnabled = enabled;
  if (enabled) {
    initAudio();
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    if (masterGain && audioCtx) masterGain.gain.setTargetAtTime(0.45, audioCtx.currentTime, 0.25);
    btnAudio.textContent = "Ton An";
    btnAudio.classList.remove("muted");
  } else {
    if (masterGain && audioCtx) masterGain.gain.setTargetAtTime(0.0, audioCtx.currentTime, 0.15);
    btnAudio.textContent = "Ton Aus";
    btnAudio.classList.add("muted");
  }
}

// Wolfsgeheul: zwei leicht verstimmte Töne, die auf- und absteigen, mit Vibrato und Echo
function playHowl() {
  if (!audioCtx || !audioEnabled) return;
  const now = audioCtx.currentTime;
  const out = audioCtx.createGain();
  out.gain.setValueAtTime(0.0, now);
  out.gain.linearRampToValueAtTime(0.16, now + 0.4);
  out.gain.setValueAtTime(0.16, now + 2.2);
  out.gain.linearRampToValueAtTime(0.0, now + 3.4);
  const lp = audioCtx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 1400;
  const echo = audioCtx.createDelay(1.0);
  echo.delayTime.value = 0.42;
  const fb = audioCtx.createGain();
  fb.gain.value = 0.35;
  out.connect(lp);
  lp.connect(masterGain);
  lp.connect(echo);
  echo.connect(fb);
  fb.connect(echo);
  echo.connect(masterGain);
  const vib = audioCtx.createOscillator();
  vib.frequency.value = 5.5;
  const vibGain = audioCtx.createGain();
  vibGain.gain.value = 9;
  vib.connect(vibGain);
  for (const det of [0, 7]) {
    const o = audioCtx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(330 + det, now);
    o.frequency.exponentialRampToValueAtTime(560 + det, now + 0.9);
    o.frequency.setValueAtTime(560 + det, now + 2.0);
    o.frequency.exponentialRampToValueAtTime(380 + det, now + 3.4);
    vibGain.connect(o.frequency);
    o.connect(out);
    o.start(now);
    o.stop(now + 3.6);
  }
  vib.start(now);
  vib.stop(now + 3.6);
}
