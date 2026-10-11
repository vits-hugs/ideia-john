'use strict';
// ---------------------------------------------------------------
// Áudio procedural (WebAudio): efeitos + música chiptune por fase
// ---------------------------------------------------------------
const Sound = (function () {
  let ac = null, master = null, muted = false;
  let timer = null, nextT = 0, step = 0, theme = null, mode = 'stage';
  const last = {};

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function rng(seed) { let a = seed; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = muted ? 0 : 0.32;
      master.connect(ac.destination);
    } catch (e) { ac = null; }
  }

  function tone(f, d, type, v, slide, delay) {
    if (!ac) return;
    const t = ac.currentTime + (delay || 0);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + d);
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + d + 0.03);
  }

  function noise(d, v, delay, cutoff) {
    if (!ac) return;
    const t = ac.currentTime + (delay || 0);
    const n = Math.max(1, Math.floor(ac.sampleRate * d));
    const buf = ac.createBuffer(1, n, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(); src.buffer = buf;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff || 3000;
    const g = ac.createGain();
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
  }

  function limited(key, ms, fn) {
    return function () {
      if (!ac) return;
      const n = performance.now();
      if (n - (last[key] || 0) < ms) return;
      last[key] = n; fn();
    };
  }

  const sfx = {
    shoot: limited('shoot', 60, () => tone(920, 0.04, 'square', 0.018, 520)),
    hit: limited('hit', 50, () => tone(180, 0.03, 'square', 0.03)),
    graze: limited('graze', 40, () => tone(2200, 0.03, 'triangle', 0.025)),
    kill: limited('kill', 30, () => { noise(0.18, 0.12, 0, 2500); tone(260, 0.16, 'square', 0.06, 70); }),
    item: limited('item', 30, () => tone(1100, 0.07, 'sine', 0.05, 1700)),
    bomb: () => { noise(0.9, 0.22, 0, 1800); tone(120, 0.9, 'sawtooth', 0.12, 35); tone(60, 1.2, 'sine', 0.2, 30); },
    die: () => { noise(0.5, 0.2, 0, 1500); tone(440, 0.6, 'sawtooth', 0.12, 50); },
    phase: () => { noise(0.5, 0.18, 0, 4000); tone(300, 0.4, 'square', 0.08, 80); },
    spell: () => { [392, 523, 659, 784].forEach((f, i) => tone(f, 0.16, 'square', 0.07, null, i * 0.07)); },
    capture: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, 'triangle', 0.09, null, i * 0.06)); },
    clear: () => { [392, 494, 587, 784, 988].forEach((f, i) => tone(f, 0.25, 'square', 0.07, null, i * 0.1)); },
    select: () => tone(700, 0.06, 'square', 0.05, 900),
    ok: () => { tone(600, 0.08, 'square', 0.06); tone(900, 0.1, 'square', 0.06, null, 0.07); },
    extend: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.12, 'triangle', 0.08, null, i * 0.07)); },
    warn: limited('warn', 200, () => tone(1000, 0.05, 'square', 0.04)),
  };

  // --- música -----------------------------------------------------
  const THEMES = [
    { name: 'Atlântico', bpm: 126, root: 45, scale: [0, 2, 3, 5, 7, 8, 10], seed: 11, prog: [0, 5, 3, 4] },
    { name: 'Monte Castello', bpm: 134, root: 50, scale: [0, 1, 3, 5, 7, 8, 10], seed: 29, prog: [0, 3, 4, 5] },
    { name: 'Pacífico', bpm: 142, root: 52, scale: [0, 1, 5, 7, 8], seed: 47, prog: [0, 2, 3, 2] },
    { name: 'Berlim', bpm: 150, root: 48, scale: [0, 2, 3, 5, 7, 8, 11], seed: 83, prog: [0, 5, 6, 4] },
    { name: 'Título', bpm: 100, root: 52, scale: [0, 2, 3, 5, 7, 8, 10], seed: 5, prog: [0, 3, 5, 4] },
  ];
  THEMES.forEach((t) => {
    const r = rng(t.seed);
    t.lead = []; let deg = 4;
    for (let i = 0; i < 32; i++) {
      deg = Math.max(0, Math.min(t.scale.length * 2 - 1, deg + Math.floor(r() * 5) - 2));
      t.lead.push(r() < 0.72 ? deg : -1);
    }
  });

  function degToMidi(t, deg, oct) {
    const n = t.scale.length;
    return t.root + 12 * (oct + Math.floor(deg / n)) + t.scale[((deg % n) + n) % n];
  }

  function scheduleStep(t, when, s) {
    const bar = Math.floor(s / 8) % t.prog.length;
    const rootDeg = t.prog[bar];
    const boss = mode === 'boss';
    const sd = 60 / (t.bpm * (boss ? 1.12 : 1)) / 2;
    const dur = sd * 0.9;
    // baixo
    if (s % 2 === 0 || boss) {
      const m = degToMidi(t, rootDeg, 0);
      toneAt(mtof(m + (s % 4 === 2 ? 7 : 0)), dur, 'triangle', 0.1, when);
    }
    // bumbo / chimbal
    if (s % 4 === 0) { toneAt(120, 0.12, 'sine', 0.2, when, 40); }
    if (s % 2 === 1) noiseAt(0.04, 0.035, when, 7000);
    if (boss && s % 4 === 2) noiseAt(0.1, 0.06, when, 3500);
    // melodia
    const L = t.lead[s % 32];
    if (L >= 0) toneAt(mtof(degToMidi(t, L + rootDeg, 2)), dur * 1.4, 'square', boss ? 0.032 : 0.026, when);
    if (boss && s % 2 === 0) toneAt(mtof(degToMidi(t, rootDeg + (s % 8) , 3)), dur * 0.7, 'square', 0.014, when);
    return sd;
  }
  function toneAt(f, d, type, v, when, slide) {
    if (!ac) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, when);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, when + d);
    g.gain.setValueAtTime(v, when); g.gain.exponentialRampToValueAtTime(0.0001, when + d);
    o.connect(g); g.connect(master); o.start(when); o.stop(when + d + 0.03);
  }
  function noiseAt(d, v, when, cutoff) {
    if (!ac) return;
    const n = Math.max(1, Math.floor(ac.sampleRate * d));
    const buf = ac.createBuffer(1, n, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(); src.buffer = buf;
    const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = cutoff;
    const g = ac.createGain(); g.gain.setValueAtTime(v, when); g.gain.exponentialRampToValueAtTime(0.0001, when + d);
    src.connect(f); f.connect(g); g.connect(master); src.start(when);
  }

  function pump() {
    if (!ac || !theme) return;
    if (nextT < ac.currentTime) nextT = ac.currentTime + 0.05;
    while (nextT < ac.currentTime + 0.25) {
      const sd = scheduleStep(theme, nextT, step);
      nextT += sd; step++;
    }
  }

  function music(idx, m) {
    mode = m || 'stage';
    theme = idx == null ? null : THEMES[idx];
    if (idx == null) { if (timer) { clearInterval(timer); timer = null; } return; }
    step = 0;
    if (ac) nextT = ac.currentTime + 0.1;
    if (!timer) timer = setInterval(pump, 40);
  }
  function setMode(m) { mode = m; }

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.32;
    return muted;
  }

  return { init, sfx, music, setMode, toggleMute, get muted() { return muted; }, THEMES };
})();
