'use strict';
// ---------------------------------------------------------------
// GUERRA DAS BOLAS — motor do bullet hell vertical
// ---------------------------------------------------------------
const W = 768, H = 640;
const PX = 16, PY = 16, PW = 448, PH = 608;      // área de jogo
const TAU = Math.PI * 2;
const FONT = '"Trebuchet MS","Segoe UI",Arial,sans-serif';
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');

const DIFFS = [
  { name: 'Fácil', c: 0.6, s: 0.85, hp: 0.85 },
  { name: 'Normal', c: 1, s: 1, hp: 1 },
  { name: 'Difícil', c: 1.35, s: 1.1, hp: 1.1 },
  { name: 'Lunático', c: 1.7, s: 1.2, hp: 1.2 },
];
const COLORS = {
  red: '#ff4545', blue: '#4a90ff', green: '#4aff7a', yellow: '#ffe84a', purple: '#c45cff',
  cyan: '#4af0ff', pink: '#ff7ad2', white: '#f4f4f4', orange: '#ffa040',
};

// ---------------------------------------------------------------
// Entrada (teclado + toque)
// ---------------------------------------------------------------
const KEYMAP = {
  left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
  shot: ['KeyZ', 'Space'], bomb: ['KeyX'], focus: ['ShiftLeft', 'ShiftRight'],
  confirm: ['KeyZ', 'Enter', 'Space', 'Tap'], cancel: ['KeyX', 'Escape'],
  pause: ['Escape', 'KeyP'], skip: ['ControlLeft', 'ControlRight'],
  mute: ['KeyM'], restart: ['KeyR'], quit: ['KeyQ'],
};
const keys = {};
let edge = {};
const touch = {};
let touchEdge = {};
const Input = {
  held(a) { return KEYMAP[a].some((k) => keys[k]) || !!touch[a]; },
  hit(a) { return KEYMAP[a].some((k) => edge[k]) || !!touchEdge[a]; },
};
const GAMEKEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyZ', 'KeyX', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'Escape', 'Enter']);
addEventListener('keydown', (e) => {
  if (GAMEKEYS.has(e.code)) e.preventDefault();
  if (!e.repeat) edge[e.code] = true;
  keys[e.code] = true;
  Sound.init();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; if (G.scene === 'play' && !G.paused) G.paused = true; });

let drag = null;
cv.addEventListener('pointerdown', (e) => {
  Sound.init();
  edge.Tap = true;
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
  touch.shot = true;
  try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
});
cv.addEventListener('pointermove', (e) => {
  if (!drag || drag.id !== e.pointerId) return;
  const k = cv.width / cv.clientWidth;
  if (G.scene === 'play' && G.player && !G.paused) {
    const sens = Input.held('focus') ? 0.5 : 1;
    G.player.x = clamp(G.player.x + (e.clientX - drag.x) * k * sens, 12, PW - 12);
    G.player.y = clamp(G.player.y + (e.clientY - drag.y) * k * sens, 20, PH - 16);
  }
  drag.x = e.clientX; drag.y = e.clientY;
});
const endDrag = (e) => { if (drag && drag.id === e.pointerId) { drag = null; touch.shot = false; } };
cv.addEventListener('pointerup', endDrag);
cv.addEventListener('pointercancel', endDrag);
function bindTouchButton(id, action, hold) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); Sound.init(); touchEdge[action] = true; if (hold) touch[action] = true; });
  const up = (e) => { e.preventDefault(); if (hold) touch[action] = false; };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', up);
}
bindTouchButton('btnBomb', 'bomb', false);
bindTouchButton('btnFocus', 'focus', true);
bindTouchButton('btnPause', 'pause', false);

// ---------------------------------------------------------------
// Corrotinas (scripts de fase, inimigos e padrões de boss)
// ---------------------------------------------------------------
class Co {
  constructor(gen) { this.gen = gen; this.w = 0; this.cond = null; this.done = false; }
  step() {
    if (this.done) return;
    if (this.cond) { if (!this.cond()) return; this.cond = null; }
    if (this.w > 0) { this.w--; return; }
    for (let guard = 0; guard < 64; guard++) {
      const r = this.gen.next();
      if (r.done) { this.done = true; return; }
      const v = r.value;
      if (typeof v === 'number') { this.w = Math.max(0, Math.round(v) - 1); return; }
      if (typeof v === 'function') { if (!v()) { this.cond = v; return; } continue; }
      return;
    }
  }
}

// ---------------------------------------------------------------
// Sprites de balas
// ---------------------------------------------------------------
const BulletSprites = {};
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}
function bulletSprite(kind, color, r) {
  const key = kind + color + r;
  if (BulletSprites[key]) return BulletSprites[key];
  const col = COLORS[color] || color;
  const L = kind === 'needle' ? r * 3.4 : kind === 'rice' ? r * 1.7 : r;
  const size = Math.ceil(Math.max(L, r) * 2 + 8);
  const c0 = document.createElement('canvas');
  c0.width = c0.height = size;
  const c = c0.getContext('2d');
  c.translate(size / 2, size / 2);
  if (kind === 'orb') {
    const glow = c.createRadialGradient(0, 0, r * 0.6, 0, 0, r + 3);
    glow.addColorStop(0, col); glow.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalAlpha = 0.45; c.fillStyle = glow; c.beginPath(); c.arc(0, 0, r + 3, 0, TAU); c.fill(); c.globalAlpha = 1;
    const g = c.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, '#fff'); g.addColorStop(0.5, '#fff'); g.addColorStop(0.68, col); g.addColorStop(1, shade(col, 0.6));
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 1; c.stroke();
  } else {
    // rice / needle: elipse alongada apontando para +x
    const rx = L, ry = kind === 'needle' ? r * 0.55 : r * 0.7;
    c.globalAlpha = 0.4; c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, rx + 2, ry + 2, 0, 0, TAU); c.fill(); c.globalAlpha = 1;
    const g = c.createLinearGradient(0, -ry, 0, ry);
    g.addColorStop(0, shade(col, 0.7)); g.addColorStop(0.5, '#fff'); g.addColorStop(1, shade(col, 0.7));
    c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); c.fill();
    c.strokeStyle = col; c.lineWidth = 1.2; c.stroke();
  }
  c0.half = size / 2;
  BulletSprites[key] = c0;
  return c0;
}

// ---------------------------------------------------------------
// Estado do jogo
// ---------------------------------------------------------------
const ActorProto = {
  moveTo(x, y, ease) { this.tx = x; this.ty = y; if (ease) this.ease = ease; },
};
const EXTENDS = [2000000, 5000000, 10000000, 20000000];
const ITEM_NAMES = ['P', 'PB', 'pt', 'B', 'UP'];

const G = {
  scene: 'title', sub: 'run', t: 0, diff: 1, startStage: 0, menuSel: 0, paused: false,
  score: 0, hi: 0, lives: 3, bombs: 3, power: 200, graze: 0, continues: 3, stageIdx: 0, extIdx: 0,
  bullets: [], pshots: [], enemies: [], items: [], parts: [], pops: [],
  boss: null, bossDone: false, co: null, bg: null, stageT: 0, clearT: 0, banner: 0,
  shake: 0, flash: 0, bombRing: null, spellBanner: null, dlg: null, player: null,
  god: false, resultT: 0, bonusInfo: null, endT: 0, overT: 0, titleBalls: [],
};
try { G.hi = parseInt(localStorage.getItem('guerraBolasHi') || '0', 10) || 0; } catch (e) { /* ok */ }

const D = () => DIFFS[G.diff];
G.rand = (a, b) => a + Math.random() * (b - a);
G.cnt = (n) => Math.max(1, Math.round(n * D().c));
G.per = (n) => Math.max(1, Math.round(n / D().c));
G.aim = (x, y) => Math.atan2(G.player.y - y, G.player.x - x);

G.bullet = function (x, y, ang, spd, o) {
  if (G.bullets.length > 3600) return null;
  o = o || {};
  const s = o.raw ? spd : spd * D().s;
  const kind = o.kind || 'orb';
  const r = o.r || 4;
  const b = {
    x, y, ang, spd: s, vx: Math.cos(ang) * s, vy: Math.sin(ang) * s, r, kind, color: o.color || 'red',
    t: 0, grazed: false, dead: false, acc: o.acc || 0, turn: o.turn || 0, max: o.max || 99, min: o.min || 0,
    fn: o.fn || null, hr: kind === 'orb' ? r * 0.8 : kind === 'rice' ? r * 0.7 : r * 0.55,
  };
  b.spr = bulletSprite(kind, b.color, r);
  G.bullets.push(b);
  return b;
};
G.fan = function (x, y, n, spread, ang, spd, o) {
  n = (o && o.exact) ? n : G.cnt(n);
  if (n === 1) return G.bullet(x, y, ang, spd, o);
  for (let i = 0; i < n; i++) G.bullet(x, y, ang + (i - (n - 1) / 2) * (spread / (n - 1)), spd, o);
};
G.ring = function (x, y, n, a0, spd, o) {
  n = (o && o.exact) ? n : G.cnt(n);
  for (let i = 0; i < n; i++) G.bullet(x, y, a0 + (i * TAU) / n, spd, o);
};
G.enemy = function (o, gen) {
  const e = Object.create(ActorProto);
  Object.assign(e, {
    x: o.x, y: o.y, vx: 0, vy: 0, r: o.r || 13, hp: (o.hp || 6) * D().hp, flag: o.flag || 'alemanha', acc: o.acc || 'steel',
    t: 0, gone: false, flash: 0, score: o.score || 300, drops: o.drops || null, tx: undefined, ty: undefined, ease: 0.05,
    co: null, big: !!o.big, mood: 'angry',
  });
  e.maxhp = e.hp; e.hr = e.r * 0.85;
  if (gen) e.co = new Co(gen(e));
  G.enemies.push(e);
  return e;
};
G.cobegin = function (gen) { if (G.boss) G.boss.kids.push(new Co(gen)); };
G.spawnBoss = function () {
  const def = Stages[G.stageIdx].boss;
  const b = Object.create(ActorProto);
  Object.assign(b, {
    def, x: PW / 2, y: -60, tx: PW / 2, ty: 110, ease: 0.045, r: def.r || 30, hr: (def.r || 30) * 0.9,
    state: 'enter', t: 0, pi: -1, ph: null, hp: 1, maxhp: 1, timer: 0, invuln: 0, flash: 0, co: null, kids: [], capOK: true,
  });
  G.boss = b; G.bossDone = false;
  Sound.setMode('boss');
};

function addScore(n) {
  G.score += n;
  if (G.score > G.hi) G.hi = G.score;
  while (G.extIdx < EXTENDS.length && G.score >= EXTENDS[G.extIdx]) {
    G.extIdx++; G.lives++; Sound.sfx.extend();
    pop(PW / 2, PH / 2, 'Vida extra!', '#7dff9a');
  }
}
function saveHi() { try { localStorage.setItem('guerraBolasHi', String(G.hi)); } catch (e) { /* ok */ } }

// ---------------------------------------------------------------
// Efeitos
// ---------------------------------------------------------------
function burst(x, y, n, color, spd, life, size) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, s = (0.3 + Math.random()) * (spd || 3);
    G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: (life || 30) * (0.6 + Math.random() * 0.6), max: life || 30, size: size || 3, color: color || '#ffd070', type: 'spark' });
  }
}
function ringFx(x, y, r0, dr, life, color, lw) { G.parts.push({ x, y, r: r0, dr, life, max: life, color, lw: lw || 3, type: 'ring' }); }
function pop(x, y, text, color) { G.pops.push({ x, y, text, color: color || '#fff', t: 0 }); }

// ---------------------------------------------------------------
// Itens
// ---------------------------------------------------------------
function spawnItem(x, y, type, vx) {
  G.items.push({ x, y, vx: vx === undefined ? (Math.random() - 0.5) * 2 : vx, vy: -3.2 - Math.random() * 1.2, type, magnet: false });
}
function dropItems(x, y, o) {
  if (!o) return;
  for (let i = 0; i < (o.P || 0); i++) spawnItem(x + (Math.random() - 0.5) * 24, y + (Math.random() - 0.5) * 12, 'P');
  for (let i = 0; i < (o.pt || 0); i++) spawnItem(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 12, 'pt');
  for (let i = 0; i < (o.PB || 0); i++) spawnItem(x, y, 'PB');
  for (let i = 0; i < (o.B || 0); i++) spawnItem(x, y, 'B');
  for (let i = 0; i < (o.UP || 0); i++) spawnItem(x, y, 'UP');
}
function collectAll() { for (const it of G.items) it.magnet = true; }

// ---------------------------------------------------------------
// Jogador
// ---------------------------------------------------------------
const OPT_FLAGS = ['eua', 'reinoUnido', 'franca', 'urss'];
function newPlayer() {
  return {
    x: PW / 2, y: PH - 70, inv: 120, deathT: -1, respawn: 0, cd: 0, cd2: 0, bombT: 0, focus: false, t: 0,
    opt: [{ x: PW / 2, y: PH - 70 }, { x: PW / 2, y: PH - 70 }, { x: PW / 2, y: PH - 70 }, { x: PW / 2, y: PH - 70 }],
  };
}

function updatePlayer() {
  const p = G.player;
  p.t++;
  if (p.respawn > 0) {
    p.respawn--;
    if (p.respawn === 0) { p.x = PW / 2; p.y = PH - 70; p.inv = 170; }
    return;
  }
  const focus = Input.held('focus');
  p.focus = focus;
  let dx = (Input.held('right') ? 1 : 0) - (Input.held('left') ? 1 : 0);
  let dy = (Input.held('down') ? 1 : 0) - (Input.held('up') ? 1 : 0);
  if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
  const sp = focus ? 2.1 : 4.4;
  p.x = clamp(p.x + dx * sp, 12, PW - 12);
  p.y = clamp(p.y + dy * sp, 20, PH - 16);

  // posição das opções (aliados)
  const lvl = Math.floor(G.power / 100);
  const tgt = focus
    ? [[-18, -14], [18, -14], [-34, -4], [34, -4]]
    : [[-30, 6], [30, 6], [-52, 24], [52, 24]];
  for (let i = 0; i < 4; i++) {
    const o = p.opt[i];
    o.x += (p.x + tgt[i][0] - o.x) * 0.25;
    o.y += (p.y + tgt[i][1] - o.y) * 0.25;
  }

  // tiro
  const canShoot = G.sub !== 'dialog' && p.deathT < 0 && G.scene === 'play';
  if (p.cd > 0) p.cd--;
  if (p.cd2 > 0) p.cd2--;
  if (canShoot && Input.held('shot')) {
    if (p.cd <= 0) {
      p.cd = 4;
      const dmg = 1.5;
      G.pshots.push({ x: p.x - 6, y: p.y - 10, vx: 0, vy: -15, dmg, kind: 0 });
      G.pshots.push({ x: p.x + 6, y: p.y - 10, vx: 0, vy: -15, dmg, kind: 0 });
      Sound.sfx.shoot();
    }
    if (p.cd2 <= 0 && lvl > 0) {
      p.cd2 = 6;
      for (let i = 0; i < lvl; i++) {
        const o = p.opt[i];
        const side = i % 2 ? 1 : -1;
        const vx = focus ? 0 : side * (i < 2 ? 1.2 : 2.6);
        G.pshots.push({ x: o.x, y: o.y - 6, vx, vy: -15, dmg: 0.9, kind: 1 });
      }
    }
  }

  // bomba
  if (Input.hit('bomb') && G.sub !== 'dialog' && p.bombT <= 0 && G.bombs > 0) useBomb();
  if (p.deathT >= 0) { p.deathT--; if (p.deathT < 0) playerDie(); }
  if (p.inv > 0) p.inv--;
}

function useBomb() {
  const p = G.player;
  G.bombs--; p.bombT = 190; p.inv = Math.max(p.inv, 240); p.deathT = -1;
  if (G.boss && G.boss.state === 'fight') G.boss.capOK = false;
  G.bombRing = { x: p.x, y: p.y, r: 0 };
  G.shake = 14; G.flash = 0.7;
  collectAll();
  Sound.sfx.bomb();
  pop(p.x, p.y - 40, 'Operação Dia D!', '#ffe27a');
}

function updateBomb() {
  const p = G.player;
  if (p.bombT <= 0) { G.bombRing = null; return; }
  p.bombT--;
  const ring = G.bombRing;
  ring.x = p.x; ring.y = p.y;
  ring.r = Math.min(ring.r + 8, 560);
  const r2 = ring.r * ring.r;
  for (const b of G.bullets) {
    const dx = b.x - ring.x, dy = b.y - ring.y;
    if (dx * dx + dy * dy < r2) { b.dead = true; if (Math.random() < 0.15) burst(b.x, b.y, 1, '#fff', 1.5, 14, 2); }
  }
  for (const e of G.enemies) {
    const dx = e.x - ring.x, dy = e.y - ring.y;
    if (dx * dx + dy * dy < (ring.r + 20) * (ring.r + 20)) { e.hp -= 3; e.flash = 4; }
  }
  const b = G.boss;
  if (b && b.state === 'fight' && b.invuln <= 0) {
    const dx = b.x - ring.x, dy = b.y - ring.y;
    if (dx * dx + dy * dy < (ring.r + 20) * (ring.r + 20)) hitBoss(1.6, true);
  }
}

function playerHit() {
  const p = G.player;
  if (G.god || p.inv > 0 || p.deathT >= 0 || p.respawn > 0) return;
  p.deathT = 8;     // janela de "deathbomb"
}

function playerDie() {
  const p = G.player;
  G.lives--;
  burst(p.x, p.y, 40, '#9dff9a', 5, 40, 3);
  ringFx(p.x, p.y, 4, 5, 30, '#ffffff', 4);
  Sound.sfx.die();
  G.shake = 18;
  clearBullets(false);
  if (G.boss && G.boss.state === 'fight') G.boss.capOK = false;
  const lost = Math.min(G.power, 100);
  G.power -= lost;
  for (let i = 0; i < 4; i++) spawnItem(p.x + (Math.random() - 0.5) * 60, p.y - 20, 'P');
  G.bombs = Math.max(G.bombs, 3);
  if (G.lives < 0) {
    G.scene = 'gameover'; G.overT = 0; saveHi(); Sound.music(null);
    return;
  }
  p.respawn = 50;
  p.x = PW / 2; p.y = PH + 40;
}

function clearBullets(toScore) {
  let n = 0;
  for (const b of G.bullets) {
    if (b.dead) continue;
    b.dead = true; n++;
    if (toScore && n % 5 === 0) burst(b.x, b.y, 1, COLORS[b.color] || '#fff', 1.2, 18, 2);
  }
  if (toScore && n) addScore(Math.min(n, 400) * 10);
}

// ---------------------------------------------------------------
// Chefes
// ---------------------------------------------------------------
function startPhase(i) {
  const b = G.boss;
  const ph = b.def.phases[i];
  b.pi = i; b.ph = ph;
  b.maxhp = b.hp = ph.hp * D().hp;
  b.timer = ph.time * 60;
  b.invuln = 70; b.capOK = true; b.co = null; b.kids = [];
  clearBullets(true);
  if (ph.spell) { G.spellBanner = { t: 0, name: ph.name }; Sound.sfx.spell(); }
  else G.spellBanner = null;
}

function hitBoss(d, fromBomb) {
  const b = G.boss;
  if (!b || b.state !== 'fight' || b.invuln > 0) return;
  b.hp -= d; b.flash = 3;
  if (!fromBomb) addScore(10);
  if (b.hp <= 0) endPhase(true);
}

function endPhase(captured) {
  const b = G.boss, ph = b.ph;
  clearBullets(true);
  b.co = null; b.kids = [];
  burst(b.x, b.y, 40, '#fff2b0', 6, 40, 3);
  ringFx(b.x, b.y, 10, 9, 36, '#ffffff', 5);
  Sound.sfx.phase();
  G.shake = 12; G.flash = 0.35;
  dropItems(b.x, b.y, { P: 3, pt: 8 });
  if (ph.spell) {
    if (captured && b.capOK) {
      const bonus = Math.round(ph.bonus * (0.5 + 0.5 * (b.timer / (ph.time * 60))));
      addScore(bonus);
      pop(PW / 2, 200, 'Carta Capturada!  +' + bonus, '#ffe27a');
      Sound.sfx.capture();
      spawnItem(b.x, b.y, 'B');
    } else {
      pop(PW / 2, 200, 'Carta falhou...', '#9aa7c7');
    }
  }
  G.spellBanner = null;
  if (b.pi + 1 < b.def.phases.length) startPhase(b.pi + 1);
  else { b.state = 'dying'; b.t = 0; b.ph = null; }
}

function updateBoss() {
  const b = G.boss;
  if (!b) return;
  b.t++;
  b.x += (b.tx - b.x) * b.ease; b.y += (b.ty - b.y) * b.ease;
  if (b.flash > 0) b.flash--;
  if (b.state === 'enter') {
    if (b.t >= 80) {
      b.state = 'talk';
      startDialog(b.def.dialog, () => { b.state = 'fight'; startPhase(0); });
    }
  } else if (b.state === 'fight') {
    if (b.invuln > 0) {
      b.invuln--;
      if (b.invuln === 0 && b.ph) b.co = new Co(b.ph.pattern(b));
    } else {
      if (b.co) b.co.step();
      for (const k of b.kids) k.step();
      b.timer--;
      if (b.timer <= 0) endPhase(false);
      else if (b.timer < 600 && b.timer % 60 === 0) Sound.sfx.warn();
    }
  } else if (b.state === 'dying') {
    if (b.t % 4 === 0) burst(b.x + (Math.random() - 0.5) * 50, b.y + (Math.random() - 0.5) * 50, 8, '#ffcf70', 4, 30, 3);
    if (b.t % 14 === 0) { ringFx(b.x + (Math.random() - 0.5) * 40, b.y + (Math.random() - 0.5) * 40, 4, 4, 24, '#ffffff', 3); Sound.sfx.kill(); }
    G.shake = 5;
    if (b.t >= 110) {
      burst(b.x, b.y, 90, '#fff2b0', 8, 60, 4);
      ringFx(b.x, b.y, 10, 14, 50, '#ffffff', 7);
      Sound.sfx.bomb();
      dropItems(b.x, b.y, { P: 5, pt: 16, UP: G.stageIdx === Stages.length - 1 ? 0 : 1 });
      addScore(100000 * (G.stageIdx + 1));
      G.shake = 22; G.flash = 0.8;
      collectAll();
      G.boss = null; G.bossDone = true;
    }
  }
}

// ---------------------------------------------------------------
// Diálogos
// ---------------------------------------------------------------
function startDialog(lines, cb) {
  G.sub = 'dialog';
  G.dlg = { lines, i: 0, t: 0, cb };
  clearBullets(false);
}
function updateDialog() {
  const d = G.dlg;
  d.t++;
  if ((Input.hit('confirm') && d.t > 8) || (Input.held('skip') && d.t > 8 && d.t % 6 === 0)) {
    d.i++; d.t = 0;
    Sound.sfx.select();
    if (d.i >= d.lines.length) { G.sub = 'run'; G.dlg = null; d.cb && d.cb(); }
  }
}

// ---------------------------------------------------------------
// Atualização de entidades
// ---------------------------------------------------------------
function updateEnemies() {
  for (const e of G.enemies) {
    e.t++;
    if (e.flash > 0) e.flash--;
    if (e.co) e.co.step();
    if (e.tx !== undefined) { e.x += (e.tx - e.x) * e.ease; e.y += (e.ty - e.y) * e.ease; }
    e.x += e.vx; e.y += e.vy;
    if (e.hp <= 0) { killEnemy(e); continue; }
    if (e.t > 60 && (e.y < -90 || e.y > PH + 90 || e.x < -90 || e.x > PW + 90)) e.gone = true;
  }
  let w = 0;
  for (let i = 0; i < G.enemies.length; i++) { const e = G.enemies[i]; if (!e.gone) G.enemies[w++] = e; }
  G.enemies.length = w;
}

function killEnemy(e) {
  e.gone = true;
  addScore(e.score);
  burst(e.x, e.y, e.big ? 36 : 14, e.big ? '#ffd27a' : '#ffffff', e.big ? 5 : 3.5, 28, 3);
  ringFx(e.x, e.y, 4, e.big ? 5 : 3, 20, '#ffffff', 3);
  Sound.sfx.kill();
  if (e.big) { G.shake = 8; clearBullets(true); }
  dropItems(e.x, e.y, e.drops || { P: Math.random() < 0.55 ? 1 : 0, pt: Math.random() < 0.6 ? 1 : 0 });
}

function updateBullets() {
  const bs = G.bullets;
  const p = G.player;
  for (let i = 0; i < bs.length; i++) {
    const b = bs[i];
    if (b.dead) continue;
    b.t++;
    if (b.fn) b.fn(b);
    if (b.turn || b.acc) {
      b.ang += b.turn;
      if (b.acc) b.spd = clamp(b.spd + b.acc, b.min, b.max);
      b.vx = Math.cos(b.ang) * b.spd; b.vy = Math.sin(b.ang) * b.spd;
    }
    b.x += b.vx; b.y += b.vy;
    if (b.x < -40 || b.x > PW + 40 || b.y < -40 || b.y > PH + 40) b.dead = true;
  }
  // colisão / graze
  if (p.respawn <= 0 && p.deathT < 0) {
    const px = p.x, py = p.y;
    for (let i = 0; i < bs.length; i++) {
      const b = bs[i];
      if (b.dead) continue;
      const dx = b.x - px, dy = b.y - py;
      const d2 = dx * dx + dy * dy;
      const hr = b.hr + 2.4;
      if (d2 < hr * hr) {
        if (p.inv <= 0 && !G.god) { playerHit(); if (p.deathT >= 0) break; }
      } else if (!b.grazed) {
        const gr = b.r + 15;
        if (d2 < gr * gr) {
          b.grazed = true; G.graze++; addScore(300);
          Sound.sfx.graze();
          G.parts.push({ x: (b.x + px) / 2, y: (b.y + py) / 2, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, life: 12, max: 12, size: 2, color: '#fff', type: 'spark' });
        }
      }
    }
    // contato com inimigos
    if (p.inv <= 0) {
      for (const e of G.enemies) {
        const dx = e.x - px, dy = e.y - py, rr = e.hr + 3;
        if (dx * dx + dy * dy < rr * rr) { playerHit(); break; }
      }
      const bo = G.boss;
      if (bo && bo.state === 'fight' && bo.invuln <= 0) {
        const dx = bo.x - px, dy = bo.y - py, rr = bo.hr + 3;
        if (dx * dx + dy * dy < rr * rr) playerHit();
      }
    }
  }
  let w = 0;
  for (let i = 0; i < bs.length; i++) { const b = bs[i]; if (!b.dead) bs[w++] = b; }
  bs.length = w;
}

function updatePShots() {
  const ps = G.pshots;
  const boss = G.boss && G.boss.state === 'fight' ? G.boss : null;
  for (const s of ps) {
    s.x += s.vx; s.y += s.vy;
    if (s.y < -20 || s.x < -20 || s.x > PW + 20) { s.dead = true; continue; }
    for (const e of G.enemies) {
      const dx = e.x - s.x, dy = e.y - s.y, rr = e.hr + 5;
      if (e.y > -5 && dx * dx + dy * dy < rr * rr) {
        e.hp -= s.dmg; e.flash = 3; s.dead = true;
        Sound.sfx.hit();
        G.parts.push({ x: s.x, y: s.y, vx: (Math.random() - 0.5) * 3, vy: Math.random() * 2, life: 10, max: 10, size: 2, color: '#fff3b0', type: 'spark' });
        break;
      }
    }
    if (!s.dead && boss) {
      const dx = boss.x - s.x, dy = boss.y - s.y, rr = boss.hr + 5;
      if (dx * dx + dy * dy < rr * rr) {
        s.dead = true;
        hitBoss(s.dmg, false);
        Sound.sfx.hit();
        G.parts.push({ x: s.x, y: s.y, vx: (Math.random() - 0.5) * 3, vy: Math.random() * 2, life: 10, max: 10, size: 2, color: '#fff3b0', type: 'spark' });
      }
    }
  }
  let w = 0;
  for (let i = 0; i < ps.length; i++) { const s = ps[i]; if (!s.dead) ps[w++] = s; }
  ps.length = w;
}

function updateItems() {
  const p = G.player;
  const alive = p.respawn <= 0;
  for (const it of G.items) {
    if (alive && (p.y < 150 && G.sub !== 'dialog')) it.magnet = true;
    if (it.magnet && alive) {
      const dx = p.x - it.x, dy = p.y - it.y, d = Math.hypot(dx, dy) || 1;
      it.x += (dx / d) * 11; it.y += (dy / d) * 11;
    } else {
      it.vy = Math.min(it.vy + 0.07, 2.2);
      it.x += it.vx; it.y += it.vy; it.vx *= 0.97;
    }
    if (alive && Math.abs(it.x - p.x) < 20 && Math.abs(it.y - p.y) < 20) {
      it.dead = true;
      collectItem(it);
    } else if (it.y > PH + 20) it.dead = true;
  }
  let w = 0;
  for (let i = 0; i < G.items.length; i++) { const it = G.items[i]; if (!it.dead) G.items[w++] = it; }
  G.items.length = w;
}

function collectItem(it) {
  Sound.sfx.item();
  if (it.type === 'P' || it.type === 'PB') {
    const add = it.type === 'P' ? 8 : 100;
    if (G.power >= 400) addScore(it.type === 'P' ? 1000 : 10000);
    else {
      const before = Math.floor(G.power / 100);
      G.power = Math.min(400, G.power + add);
      if (Math.floor(G.power / 100) > before) { Sound.sfx.ok(); pop(G.player.x, G.player.y - 30, 'Poder ' + Math.floor(G.power / 100), '#ff9a9a'); }
    }
    addScore(100);
  } else if (it.type === 'pt') {
    const v = Math.round(clamp(12000 - it.y * 14, 3000, 12000) / 100) * 100;
    addScore(v);
    if (G.player.y < 150) pop(it.x, it.y, String(v), '#8fd0ff');
  } else if (it.type === 'B') {
    G.bombs = Math.min(6, G.bombs + 1); pop(it.x, it.y - 10, 'Bomba +1', '#9dff9a');
  } else if (it.type === 'UP') {
    G.lives = Math.min(8, G.lives + 1); Sound.sfx.extend(); pop(it.x, it.y - 10, 'Vida +1', '#7dff9a');
  }
}

function updateParts() {
  for (const q of G.parts) {
    q.life--;
    if (q.type === 'ring') q.r += q.dr;
    else { q.x += q.vx; q.y += q.vy; q.vx *= 0.96; q.vy *= 0.96; }
  }
  let w = 0;
  for (let i = 0; i < G.parts.length; i++) { const q = G.parts[i]; if (q.life > 0) G.parts[w++] = q; }
  G.parts.length = w;
  for (const q of G.pops) { q.t++; q.y -= 0.35; }
  G.pops = G.pops.filter((q) => q.t < 70);
  if (G.shake > 0) G.shake *= 0.88;
  if (G.flash > 0) G.flash -= 0.03;
  if (G.spellBanner) G.spellBanner.t++;
}

// ---------------------------------------------------------------
// Fluxo de cenas
// ---------------------------------------------------------------
function resetStage(idx) {
  G.stageIdx = idx;
  const st = Stages[idx];
  G.bullets.length = 0; G.pshots.length = 0; G.enemies.length = 0; G.items.length = 0; G.parts.length = 0; G.pops.length = 0;
  G.boss = null; G.bossDone = false; G.sub = 'run'; G.dlg = null; G.spellBanner = null; G.bombRing = null;
  G.stageT = 0; G.clearT = 0; G.banner = 0; G.shake = 0; G.flash = 0; G.paused = false;
  G.bg = makeBG(st.bg, PW, PH);
  G.co = new Co(st.script());
  G.player = newPlayer();
  G.scene = 'play';
  Sound.music(st.music, 'stage');
}

function newGame(stage) {
  G.score = 0; G.lives = 3; G.bombs = 3; G.power = 200; G.graze = 0; G.continues = 3; G.extIdx = 0;
  resetStage(stage);
}

function stageClear() {
  const bonusStage = 200000 * (G.stageIdx + 1);
  const bonusLife = Math.max(0, G.lives) * 100000;
  const bonusBomb = G.bombs * 30000;
  const bonusGraze = G.graze * 50;
  G.bonusInfo = { stage: bonusStage, life: bonusLife, bomb: bonusBomb, graze: bonusGraze, total: bonusStage + bonusLife + bonusBomb + bonusGraze };
  addScore(G.bonusInfo.total);
  saveHi();
  G.scene = 'stageclear'; G.resultT = 0; G.pshots.length = 0;
  Sound.sfx.clear();
}

function updateTitle() {
  if (G.titleBalls.length === 0) {
    const fl = ['brasil', 'eua', 'reinoUnido', 'franca', 'urss', 'polonia', 'alemanha', 'italia', 'japao', 'hungria'];
    const ac = ['pilot', 'olive', 'olive', 'olive', 'olive', 'olive', 'steel', 'bersa', 'hachimaki', 'steel'];
    fl.forEach((f, i) => G.titleBalls.push({ f, ac: ac[i], x: 60 + Math.random() * (W - 120), y: 80 + Math.random() * (H - 160), vx: (Math.random() - 0.5) * 1.6, vy: (Math.random() - 0.5) * 1.6, r: 20 + Math.random() * 14 }));
  }
  for (const b of G.titleBalls) {
    b.x += b.vx; b.y += b.vy;
    if (b.x < b.r || b.x > W - b.r) b.vx *= -1;
    if (b.y < b.r || b.y > H - b.r) b.vy *= -1;
  }
  const n = 3;
  if (Input.hit('up')) { G.menuSel = (G.menuSel + n - 1) % n; Sound.sfx.select(); }
  if (Input.hit('down')) { G.menuSel = (G.menuSel + 1) % n; Sound.sfx.select(); }
  const dir = (Input.hit('right') ? 1 : 0) - (Input.hit('left') ? 1 : 0);
  if (dir) {
    if (G.menuSel === 1) { G.diff = (G.diff + dir + DIFFS.length) % DIFFS.length; Sound.sfx.select(); }
    if (G.menuSel === 2) { G.startStage = (G.startStage + dir + Stages.length) % Stages.length; Sound.sfx.select(); }
  }
  if (Input.hit('confirm')) {
    Sound.sfx.ok();
    if (G.menuSel === 0) newGame(G.startStage);
    else if (G.menuSel === 1) G.diff = (G.diff + 1) % DIFFS.length;
    else G.startStage = (G.startStage + 1) % Stages.length;
  }
}

function update() {
  G.t++;
  if (Input.hit('mute')) Sound.toggleMute();
  switch (G.scene) {
    case 'title': updateTitle(); break;
    case 'play': updatePlay(); break;
    case 'stageclear':
      G.resultT++;
      if (G.resultT > 60 && Input.hit('confirm')) {
        Sound.sfx.ok();
        if (G.stageIdx + 1 >= Stages.length) { G.scene = 'ending'; G.endT = 0; Sound.music(4, 'stage'); }
        else { G.bombs = Math.max(G.bombs, 3); resetStage(G.stageIdx + 1); }
      }
      break;
    case 'gameover':
      G.overT++;
      if (G.overT > 40) {
        if (Input.hit('confirm') && G.continues > 0) {
          G.continues--; G.score = 0; G.lives = 3; G.bombs = 3; G.power = Math.max(G.power, 200); G.extIdx = 0;
          Sound.sfx.ok(); resetStage(G.stageIdx);
        } else if (Input.hit('cancel') || (Input.hit('confirm') && G.continues <= 0)) {
          G.scene = 'title'; Sound.music(4, 'stage');
        }
      }
      break;
    case 'ending':
      G.endT++;
      if (G.endT > 120 && Input.hit('confirm')) { saveHi(); G.scene = 'title'; Sound.music(4, 'stage'); }
      break;
    default: break;
  }
  edge = {}; touchEdge = {};
}

function updatePlay() {
  if (Input.hit('pause')) { G.paused = !G.paused; Sound.sfx.select(); return; }
  if (G.paused) {
    if (Input.hit('confirm')) G.paused = false;
    if (Input.hit('restart')) { resetStage(G.stageIdx); G.score = 0; G.lives = 3; G.bombs = 3; G.power = 200; G.extIdx = 0; }
    if (Input.hit('quit')) { G.scene = 'title'; G.paused = false; Sound.music(4, 'stage'); }
    return;
  }
  G.stageT++;
  G.bg.update();
  if (G.sub === 'dialog') updateDialog();
  updatePlayer();
  if (G.sub === 'run') G.co.step();
  updateEnemies();
  updateBoss();
  updateBullets();
  updatePShots();
  updateBomb();
  updateItems();
  updateParts();
  if (G.banner < 400) G.banner++;
  if (G.sub === 'run' && G.co.done && !G.boss) { G.sub = 'clear'; G.clearT = 0; clearBullets(true); collectAll(); }
  if (G.sub === 'clear') {
    G.clearT++;
    if (G.clearT > 150) stageClear();
  }
}

// ---------------------------------------------------------------
// Desenho
// ---------------------------------------------------------------
function txt(s, x, y, size, col, align, o) {
  o = o || {};
  ctx.font = (o.weight || 'bold') + ' ' + size + 'px ' + FONT;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = o.base || 'alphabetic';
  if (o.stroke) { ctx.lineWidth = o.sw || 3; ctx.strokeStyle = o.stroke; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = col || '#fff';
  ctx.fillText(s, x, y);
}
function rrect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
function wrapLines(s, maxW, size) {
  ctx.font = 'bold ' + size + 'px ' + FONT;
  const words = s.split(' '), lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawWallpaper() {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#10162b'); g.addColorStop(1, '#1b0f1f');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,.035)'; ctx.lineWidth = 1;
  for (let x = -H; x < W; x += 28) { ctx.beginPath(); ctx.moveTo(x + (G.t * 0.3) % 28, 0); ctx.lineTo(x + H + (G.t * 0.3) % 28, H); ctx.stroke(); }
}

function drawItem(it) {
  const t = it.type;
  if (t === 'UP') { drawBall(ctx, 'brasil', 8, 'pilot', it.x, it.y, it.x, it.y + 20, 'calm'); return; }
  const col = { P: '#ff4a4a', PB: '#ff4a4a', pt: '#4aa8ff', B: '#33d17a' }[t];
  const s = t === 'PB' ? 11 : 8;
  ctx.fillStyle = col; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
  rrect(it.x - s, it.y - s, s * 2, s * 2, 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff';
  if (t === 'pt') { ctx.beginPath(); ctx.moveTo(it.x, it.y - 5); ctx.lineTo(it.x + 4, it.y); ctx.lineTo(it.x, it.y + 5); ctx.lineTo(it.x - 4, it.y); ctx.closePath(); ctx.fill(); }
  else txt(t === 'PB' ? 'P' : t, it.x, it.y + 4, t === 'PB' ? 14 : 11, '#fff', 'center');
}

function drawPlayer() {
  const p = G.player;
  if (p.respawn > 0) return;
  const lvl = Math.floor(G.power / 100);
  // círculo mágico em foco
  if (p.focus) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(G.t * 0.04);
    ctx.strokeStyle = 'rgba(180,255,200,.55)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 7]);
    ctx.beginPath(); ctx.arc(0, 0, 24, 0, TAU); ctx.stroke(); ctx.restore(); ctx.setLineDash([]);
  }
  for (let i = 0; i < lvl; i++) { const o = p.opt[i]; drawBall(ctx, OPT_FLAGS[i], 7, 'none', o.x, o.y, o.x, o.y - 30, 'calm'); }
  const blink = p.inv > 0 && p.bombT <= 0 && Math.floor(G.t / 3) % 2 === 0;
  if (!blink) {
    drawBall(ctx, 'brasil', 13, 'pilot', p.x, p.y, p.x, p.y - 40, 'angry');
  }
  if (p.focus || p.deathT >= 0) {
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#ff2a2a'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(p.x, p.y, 3.4, 0, TAU); ctx.fill(); ctx.stroke();
  }
}

function drawEnemy(e) {
  drawBall(ctx, e.flag, e.r, e.acc, e.x, e.y, G.player.x, G.player.y, 'angry');
  if (e.flash > 0) {
    ctx.save(); ctx.globalAlpha = 0.45; ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, TAU); ctx.fill(); ctx.restore();
  }
  if (e.big) {
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(e.x - 22, e.y - e.r - 12, 44, 5);
    ctx.fillStyle = '#ff6a6a'; ctx.fillRect(e.x - 21, e.y - e.r - 11, 42 * clamp(e.hp / e.maxhp, 0, 1), 3);
  }
}

function drawBoss() {
  const b = G.boss;
  if (!b) return;
  const spell = b.ph && b.ph.spell;
  // aura / círculo mágico
  if (b.state === 'fight' || b.state === 'talk' || b.state === 'enter') {
    const col = spell ? '255,120,210' : '120,190,255';
    const pulse = 1 + Math.sin(G.t * 0.08) * 0.05;
    const g = ctx.createRadialGradient(b.x, b.y, b.r * 0.4, b.x, b.y, b.r * 2.6 * pulse);
    g.addColorStop(0, 'rgba(' + col + ',.38)'); g.addColorStop(1, 'rgba(' + col + ',0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 2.6 * pulse, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(b.x, b.y);
    ctx.strokeStyle = 'rgba(' + col + ',.7)'; ctx.lineWidth = 1.5;
    ctx.rotate(G.t * 0.02); ctx.setLineDash([8, 9]); ctx.beginPath(); ctx.arc(0, 0, b.r + 22, 0, TAU); ctx.stroke();
    ctx.rotate(-G.t * 0.045); ctx.setLineDash([3, 10]); ctx.beginPath(); ctx.arc(0, 0, b.r + 34, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    if (spell) {
      ctx.rotate(G.t * 0.03);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = (i * TAU) / 6; ctx.lineTo(Math.cos(a) * (b.r + 28), Math.sin(a) * (b.r + 28)); }
      ctx.closePath(); ctx.stroke();
    }
    ctx.restore();
  }
  const flashing = b.state === 'dying' && Math.floor(b.t / 3) % 2 === 0;
  drawBall(ctx, b.def.flag, b.r, b.def.acc, b.x, b.y, G.player.x, G.player.y, 'angry');
  if (b.flash > 0 || flashing) {
    ctx.save(); ctx.globalAlpha = 0.4; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill(); ctx.restore();
  }
}

function drawBossUI() {
  const b = G.boss;
  if (!b || b.state !== 'fight') return;
  // barra de vida
  const x0 = 64, x1 = PW - 14, y = 12;
  ctx.fillStyle = 'rgba(0,0,0,.6)'; rrect(x0 - 2, y - 2, x1 - x0 + 4, 10, 5); ctx.fill();
  const frac = clamp(b.hp / b.maxhp, 0, 1);
  const spell = b.ph && b.ph.spell;
  ctx.fillStyle = spell ? '#ff6ad0' : '#ff5a5a';
  rrect(x0, y, (x1 - x0) * frac, 6, 3); ctx.fill();
  // fases restantes
  for (let i = 0; i < b.def.phases.length; i++) {
    const done = i < b.pi, cur = i === b.pi;
    ctx.fillStyle = done ? 'rgba(255,255,255,.18)' : cur ? '#ffe27a' : '#ffffff';
    ctx.beginPath(); ctx.arc(14 + i * 11, y + 3, cur ? 4 : 3, 0, TAU); ctx.fill();
  }
  // nome
  txt(b.def.name, 10, 34, 12, '#fff', 'left', { stroke: '#000', sw: 3 });
  // timer
  const sec = Math.max(0, Math.ceil(b.timer / 60));
  txt(String(sec), PW - 12, 40, 22, sec <= 10 ? '#ff6a6a' : '#ffffff', 'right', { stroke: '#000', sw: 4 });
  // spell
  if (spell && G.spellBanner) {
    const sb = G.spellBanner;
    if (sb.t < 70) {
      const a = sb.t < 10 ? sb.t / 10 : sb.t > 55 ? (70 - sb.t) / 15 : 1;
      ctx.save(); ctx.globalAlpha = clamp(a, 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, PH / 2 - 52, PW, 78);
      txt('CARTA DE GUERRA', PW / 2, PH / 2 - 24, 14, '#ffb0e8', 'center');
      txt(sb.name, PW / 2, PH / 2 + 10, 28, '#ffffff', 'center', { stroke: '#a0105f', sw: 5 });
      ctx.restore();
    }
    const bonus = b.capOK ? Math.round(b.ph.bonus * (0.5 + 0.5 * (b.timer / (b.ph.time * 60)))) : 0;
    txt(sb.name, PW - 12, 62, 14, '#ffc2ee', 'right', { stroke: '#000', sw: 3 });
    txt(b.capOK ? 'Bônus ' + bonus : 'Bônus falhou', PW - 12, 80, 12, b.capOK ? '#ffe27a' : '#8c93ad', 'right', { stroke: '#000', sw: 3 });
  }
}

function drawDialog() {
  const d = G.dlg, line = d.lines[d.i];
  const st = Stages[G.stageIdx];
  const boss = st.boss;
  const bx = PW - 84, by = PH - 188;
  const speakerP = line.who === 'p';
  ctx.save();
  ctx.globalAlpha = speakerP ? 0.4 : 1;
  drawBall(ctx, boss.flag, boss.r, boss.acc, bx, by, 60, by + 40, 'angry', 2.2);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = speakerP ? 1 : 0.4;
  drawBall(ctx, 'brasil', 13, 'pilot', 78, by + 6, PW - 100, by, 'angry', 3.4);
  ctx.restore();
  const x = 16, y = PH - 108, w = PW - 32, h = 92;
  ctx.fillStyle = 'rgba(6,8,18,.86)'; rrect(x, y, w, h, 12); ctx.fill();
  ctx.strokeStyle = speakerP ? '#7dff9a' : '#ff8a8a'; ctx.lineWidth = 2; ctx.stroke();
  txt(speakerP ? 'Brasil' : boss.name.split(' — ')[0], x + 14, y + 22, 14, speakerP ? '#7dff9a' : '#ff9a9a');
  const lines = wrapLines(line.text, w - 30, 15);
  lines.forEach((l, i) => txt(l, x + 14, y + 44 + i * 20, 15, '#fff'));
  if (Math.floor(G.t / 20) % 2 === 0) txt('▼ Z', x + w - 14, y + h - 10, 11, '#9fb0d8', 'right');
}

function drawBulletsAndRest() {
  for (const b of G.bullets) {
    const s = b.spr;
    if (b.kind === 'orb') ctx.drawImage(s, b.x - s.half, b.y - s.half);
    else {
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.ang);
      ctx.drawImage(s, -s.half, -s.half); ctx.restore();
    }
  }
}

function drawPlayfield() {
  const sx = G.shake > 0.3 ? (Math.random() - 0.5) * G.shake : 0;
  const sy = G.shake > 0.3 ? (Math.random() - 0.5) * G.shake : 0;
  ctx.save();
  ctx.translate(PX, PY);
  ctx.beginPath(); ctx.rect(0, 0, PW, PH); ctx.clip();
  ctx.translate(sx, sy);
  G.bg.draw(ctx, G.t);
  for (const it of G.items) drawItem(it);
  for (const e of G.enemies) drawEnemy(e);
  drawBoss();
  // tiros do jogador
  for (const s of G.pshots) {
    if (s.kind === 0) { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(s.x - 2, s.y - 9, 4, 16); ctx.fillStyle = 'rgba(120,255,160,.55)'; ctx.fillRect(s.x - 3.5, s.y - 9, 7, 16); }
    else { ctx.fillStyle = 'rgba(255,230,120,.8)'; ctx.beginPath(); ctx.ellipse(s.x, s.y, 3, 8, 0, 0, TAU); ctx.fill(); }
  }
  drawPlayer();
  drawBulletsAndRest();
  // efeitos
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const q of G.parts) {
    const a = clamp(q.life / q.max, 0, 1);
    if (q.type === 'ring') { ctx.globalAlpha = a; ctx.strokeStyle = q.color; ctx.lineWidth = q.lw * a; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, TAU); ctx.stroke(); }
    else { ctx.globalAlpha = a; ctx.fillStyle = q.color; ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (0.4 + a * 0.6), 0, TAU); ctx.fill(); }
  }
  ctx.restore();
  // bomba
  if (G.bombRing) {
    const r = G.bombRing, p = G.player;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(r.x, r.y, Math.max(0, r.r - 50), r.x, r.y, r.r + 4);
    g.addColorStop(0, 'rgba(255,230,120,0)'); g.addColorStop(0.85, 'rgba(255,230,120,.35)'); g.addColorStop(1, 'rgba(255,255,255,.7)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(r.x, r.y, r.r + 4, 0, TAU); ctx.fill();
    ctx.restore();
    const flags = ['eua', 'reinoUnido', 'franca', 'urss', 'polonia', 'brasil', 'eua', 'franca'];
    for (let i = 0; i < flags.length; i++) {
      const a = G.t * 0.07 + (i * TAU) / flags.length, rad = Math.min(r.r * 0.55, 140);
      drawBall(ctx, flags[i], 11, 'olive', p.x + Math.cos(a) * rad, p.y + Math.sin(a) * rad, p.x, p.y, 'angry');
    }
  }
  drawBossUI();
  for (const q of G.pops) {
    ctx.save(); ctx.globalAlpha = clamp(1 - q.t / 70, 0, 1);
    txt(q.text, clamp(q.x, 60, PW - 60), q.y, 14, q.color, 'center', { stroke: '#000', sw: 3 });
    ctx.restore();
  }
  if (G.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + clamp(G.flash, 0, 1) + ')'; ctx.fillRect(0, 0, PW, PH); }
  // banner da fase
  if (G.banner < 190 && G.scene === 'play') {
    const t = G.banner, a = t < 20 ? t / 20 : t > 160 ? (190 - t) / 30 : 1;
    const st = Stages[G.stageIdx];
    ctx.save(); ctx.globalAlpha = clamp(a, 0, 1);
    txt('FASE ' + (G.stageIdx + 1), PW / 2, 190, 44, '#fff', 'center', { stroke: '#000', sw: 6 });
    txt(st.name, PW / 2, 228, 24, '#ffe27a', 'center', { stroke: '#000', sw: 5 });
    txt(st.year, PW / 2, 254, 16, '#cfd8ff', 'center', { stroke: '#000', sw: 4 });
    ctx.restore();
  }
  if (G.sub === 'dialog' && G.dlg) drawDialog();
  ctx.restore();
  // moldura
  ctx.strokeStyle = '#46527f'; ctx.lineWidth = 3; ctx.strokeRect(PX - 1.5, PY - 1.5, PW + 3, PH + 3);
}

function drawHUD() {
  const x0 = PX + PW + 24, w = W - x0 - 16;
  ctx.fillStyle = 'rgba(8,10,20,.84)'; rrect(PX + PW + 12, PY, W - (PX + PW + 12) - 12, PH, 14); ctx.fill();
  ctx.strokeStyle = '#2f3a63'; ctx.lineWidth = 2; ctx.stroke();
  txt('GUERRA DAS BOLAS', x0 + w / 2, PY + 34, 20, '#ffe27a', 'center', { stroke: '#000', sw: 4 });
  txt('Bullet Hell · 2ª Guerra Mundial', x0 + w / 2, PY + 52, 11, '#9fb0d8', 'center');
  let y = PY + 86;
  const row = (label, val, col) => { txt(label, x0, y, 12, '#8d9bc4'); txt(val, x0 + w, y + 22, 22, col || '#fff', 'right'); y += 52; };
  row('RECORDE', String(G.hi).padStart(9, '0'), '#ffd27a');
  row('PONTOS', String(G.score).padStart(9, '0'), '#ffffff');
  // vidas
  txt('JOGADOR', x0, y, 12, '#8d9bc4');
  for (let i = 0; i < Math.max(0, G.lives); i++) drawBall(ctx, 'brasil', 9, 'none', x0 + 11 + i * 25, y + 22, x0 + 11 + i * 25, y + 60, 'calm');
  y += 50;
  txt('BOMBAS', x0, y, 12, '#8d9bc4');
  ctx.fillStyle = '#5dff8e'; ctx.strokeStyle = '#0a3c1a'; ctx.lineWidth = 1.5;
  for (let i = 0; i < G.bombs; i++) { star(ctx, x0 + 11 + i * 25, y + 20, 10, 0); ctx.stroke(); }
  y += 50;
  txt('PODER', x0, y, 12, '#8d9bc4');
  txt(G.power >= 400 ? 'MAX' : (G.power / 100).toFixed(2), x0 + w, y, 14, G.power >= 400 ? '#ffe27a' : '#fff', 'right');
  ctx.fillStyle = '#1b2036'; rrect(x0, y + 8, w, 10, 5); ctx.fill();
  const g = ctx.createLinearGradient(x0, 0, x0 + w, 0); g.addColorStop(0, '#ff5a5a'); g.addColorStop(1, '#ffd25a');
  ctx.fillStyle = g; rrect(x0, y + 8, Math.max(6, w * G.power / 400), 10, 5); ctx.fill();
  y += 42;
  txt('GRAZE', x0, y, 12, '#8d9bc4'); txt(String(G.graze), x0 + w, y, 16, '#fff', 'right'); y += 28;
  txt('DIFICULDADE', x0, y, 12, '#8d9bc4'); txt(DIFFS[G.diff].name, x0 + w, y, 16, ['#7dff9a', '#9fd0ff', '#ffb36b', '#ff6a8a'][G.diff], 'right'); y += 28;
  if (G.scene !== 'title') { txt('FASE', x0, y, 12, '#8d9bc4'); txt((G.stageIdx + 1) + '/' + Stages.length, x0 + w, y, 16, '#fff', 'right'); }
  // rodapé
  const fy = PY + PH - 70;
  txt('Setas mover · Z atirar', x0, fy, 11, '#8d9bc4');
  txt('X bomba · Shift foco', x0, fy + 16, 11, '#8d9bc4');
  txt('P pausa · M som', x0, fy + 32, 11, '#8d9bc4');
}

function drawTitle() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0e2d62'); g.addColorStop(0.6, '#14234a'); g.addColorStop(1, '#2a1230');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // raios
  ctx.save(); ctx.translate(W / 2, 250); ctx.rotate(G.t * 0.002);
  for (let i = 0; i < 18; i++) { ctx.rotate(TAU / 18); ctx.fillStyle = 'rgba(255,255,255,.035)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(900, -50); ctx.lineTo(900, 50); ctx.fill(); }
  ctx.restore();
  for (const b of G.titleBalls) drawBall(ctx, b.f, b.r, b.ac, b.x, b.y, W / 2, 300, 'angry');
  ctx.fillStyle = 'rgba(5,8,20,.55)'; rrect(110, 80, W - 220, 150, 20); ctx.fill();
  txt('GUERRA DAS BOLAS', W / 2, 160, 62, '#ffe27a', 'center', { stroke: '#2a1000', sw: 9 });
  txt('Bullet Hell vertical · Segunda Guerra Mundial', W / 2, 200, 20, '#e6ecff', 'center', { stroke: '#000', sw: 4 });
  ctx.fillStyle = 'rgba(5,8,20,.7)'; rrect(W / 2 - 230, 290, 460, 200, 16); ctx.fill();
  const items = [
    ['INICIAR JOGO', ''],
    ['Dificuldade', '◄  ' + DIFFS[G.diff].name + '  ►'],
    ['Fase inicial', '◄  ' + (G.startStage + 1) + ' — ' + Stages[G.startStage].name + '  ►'],
  ];
  items.forEach((it, i) => {
    const sel = G.menuSel === i, y = 338 + i * 56;
    if (sel) { ctx.fillStyle = 'rgba(255,226,122,.16)'; rrect(W / 2 - 215, y - 30, 430, 46, 10); ctx.fill(); }
    txt(it[0], W / 2 - 195, y, sel ? 26 : 22, sel ? '#ffe27a' : '#cfd8ff', 'left');
    if (it[1]) txt(it[1], W / 2 + 205, y, 17, sel ? '#fff' : '#9fb0d8', 'right');
  });
  txt('Recorde: ' + String(G.hi).padStart(9, '0'), W / 2, 530, 18, '#ffd27a', 'center');
  txt('Setas: mover/escolher · Z: confirmar/atirar · X: bomba · Shift: foco (mostra a hitbox)', W / 2, 568, 13, '#9fb0d8', 'center');
  txt('P: pausar · M: som · Ctrl: pular diálogo · No celular: arraste para mover', W / 2, 588, 13, '#9fb0d8', 'center');
  if (Math.floor(G.t / 30) % 2 === 0) txt('Pressione Z ou toque para começar', W / 2, 620, 16, '#ffffff', 'center');
}

function drawOverlayPanel(title, lines, footer) {
  ctx.save(); ctx.translate(PX, PY);
  ctx.fillStyle = 'rgba(4,6,16,.78)'; ctx.fillRect(0, 0, PW, PH);
  txt(title, PW / 2, 150, 36, '#ffe27a', 'center', { stroke: '#000', sw: 6 });
  lines.forEach((l, i) => txt(l[0], PW / 2, 215 + i * 34, l[2] || 18, l[1] || '#fff', 'center'));
  if (footer && Math.floor(G.t / 25) % 2 === 0) txt(footer, PW / 2, PH - 70, 16, '#cfd8ff', 'center');
  ctx.restore();
}

function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (G.scene === 'title') { drawTitle(); return; }
  drawWallpaper();
  if (G.scene === 'play' || G.scene === 'stageclear' || G.scene === 'gameover') {
    drawPlayfield();
    drawHUD();
  }
  if (G.scene === 'play' && G.paused) {
    drawOverlayPanel('PAUSADO', [['Z / Esc — continuar', '#fff'], ['R — reiniciar do começo da fase', '#cfd8ff', 15], ['Q — voltar ao título', '#cfd8ff', 15]], '');
  }
  if (G.scene === 'stageclear') {
    const bi = G.bonusInfo, st = Stages[G.stageIdx];
    drawOverlayPanel('FASE ' + (G.stageIdx + 1) + ' COMPLETA!', [
      [st.name + ' — ' + st.year, '#cfd8ff', 16],
      ['Bônus da fase: ' + bi.stage, '#fff'],
      ['Vidas restantes: ' + bi.life, '#fff'],
      ['Bombas restantes: ' + bi.bomb, '#fff'],
      ['Graze (' + G.graze + '): ' + bi.graze, '#fff'],
      ['TOTAL: ' + bi.total, '#ffe27a', 24],
    ], G.resultT > 60 ? 'Pressione Z para continuar' : '');
  }
  if (G.scene === 'gameover') {
    drawOverlayPanel('FIM DE JOGO', [
      ['A cobra não fumou desta vez...', '#cfd8ff', 16],
      ['Pontos: ' + G.score, '#fff'],
      [G.continues > 0 ? 'Z — continuar (' + G.continues + ' restantes, zera pontos)' : 'Sem continues', '#9dff9a', 16],
      ['X — voltar ao título', '#cfd8ff', 16],
    ], '');
  }
  if (G.scene === 'ending') drawEnding();
}

function drawEnding() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0e2d62'); g.addColorStop(1, '#3a1a3e');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const flags = ['brasil', 'eua', 'reinoUnido', 'franca', 'urss', 'polonia'];
  flags.forEach((f, i) => {
    const x = 80 + i * 118, y = 545 - Math.abs(Math.sin(G.t * 0.07 + i)) * 50;
    drawBall(ctx, f, 34, f === 'brasil' ? 'pilot' : 'olive', x, y, W / 2, 300, 'calm');
  });
  txt('VITÓRIA — 1945', W / 2, 120, 54, '#ffe27a', 'center', { stroke: '#2a1000', sw: 8 });
  const lines = [
    'Berlim caiu. A guerra na Europa acabou.',
    'A cobra fumou — e fumou bonito!',
    '',
    'Pontuação final: ' + G.score,
    'Recorde: ' + G.hi,
    'Graze total: ' + G.graze,
    '',
    'Obrigado por jogar!',
  ];
  lines.forEach((l, i) => txt(l, W / 2, 200 + i * 32, i === 3 ? 26 : 20, i === 3 ? '#fff' : '#e6ecff', 'center', { stroke: '#000', sw: 4 }));
  if (G.endT > 120 && Math.floor(G.t / 30) % 2 === 0) txt('Pressione Z para voltar ao título', W / 2, 600, 16, '#fff', 'center');
}

// ---------------------------------------------------------------
// Loop principal
// ---------------------------------------------------------------
let lastT = 0, acc = 0;
function loop(now) {
  if (!lastT) lastT = now;
  acc += Math.min(100, now - lastT); lastT = now;
  let steps = 0;
  while (acc >= 1000 / 60 && steps < 5) { update(); acc -= 1000 / 60; steps++; }
  draw();
  requestAnimationFrame(loop);
}
