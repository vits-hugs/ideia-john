'use strict';
// ---------------------------------------------------------------
// Bandeiras e sprites de country balls (tudo desenhado em canvas)
// ---------------------------------------------------------------
const Flags = {};

function bands(c, r, colors, vertical, weights) {
  const w = weights || colors.map(() => 1);
  const total = w.reduce((a, b) => a + b, 0);
  let pos = -r;
  for (let i = 0; i < colors.length; i++) {
    const size = (2 * r * w[i]) / total;
    c.fillStyle = colors[i];
    if (vertical) c.fillRect(pos, -r, size + 1, 2 * r);
    else c.fillRect(-r, pos, 2 * r, size + 1);
    pos += size;
  }
}

function star(c, x, y, R, rot) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 ? R * 0.42 : R;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
  c.fill();
}

// Eixo
Flags.alemanha = (c, r) => bands(c, r, ['#111111', '#d11a1a', '#ffcc00'], false);
Flags.italia = (c, r) => bands(c, r, ['#14a04b', '#f4f4f4', '#d6212b'], true);
Flags.japao = (c, r) => {
  c.fillStyle = '#f7f7f7'; c.fillRect(-r, -r, 2 * r, 2 * r);
  c.fillStyle = '#c8102e'; c.beginPath(); c.arc(0, 0, r * 0.5, 0, Math.PI * 2); c.fill();
};
Flags.hungria = (c, r) => bands(c, r, ['#cd2a3e', '#f4f4f4', '#436f4d'], false);
Flags.romenia = (c, r) => bands(c, r, ['#002b7f', '#fcd116', '#ce1126'], true);
Flags.tailandia = (c, r) => bands(c, r, ['#a51931', '#f4f5f8', '#2d2a4a', '#f4f5f8', '#a51931'], false, [1, 1, 2, 1, 1]);
Flags.bulgaria = (c, r) => bands(c, r, ['#f4f4f4', '#00966e', '#d62612'], false);

// Aliados
Flags.brasil = (c, r) => {
  c.fillStyle = '#1fa34a'; c.fillRect(-r, -r, 2 * r, 2 * r);
  c.fillStyle = '#ffd400';
  c.beginPath(); c.moveTo(0, -r * 0.78); c.lineTo(r * 0.88, 0); c.lineTo(0, r * 0.78); c.lineTo(-r * 0.88, 0); c.closePath(); c.fill();
  c.fillStyle = '#1b3f9e'; c.beginPath(); c.arc(0, 0, r * 0.42, 0, Math.PI * 2); c.fill();
  c.save(); c.beginPath(); c.arc(0, 0, r * 0.42, 0, Math.PI * 2); c.clip();
  c.strokeStyle = '#f4f4f4'; c.lineWidth = r * 0.1; c.beginPath(); c.arc(-r * 0.1, r * 0.75, r * 0.95, Math.PI * 1.22, Math.PI * 1.78); c.stroke();
  c.restore();
};
Flags.eua = (c, r) => {
  const sh = (2 * r) / 13;
  for (let i = 0; i < 13; i++) { c.fillStyle = i % 2 ? '#f4f4f4' : '#b22234'; c.fillRect(-r, -r + sh * i, 2 * r, sh + 1); }
  c.fillStyle = '#3c3b6e'; c.fillRect(-r, -r, r * 1.05, sh * 7);
  c.fillStyle = '#f4f4f4';
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) { c.beginPath(); c.arc(-r * 0.82 + x * r * 0.38, -r * 0.8 + y * r * 0.38, r * 0.06, 0, Math.PI * 2); c.fill(); }
};
Flags.reinoUnido = (c, r) => {
  c.fillStyle = '#1f3a93'; c.fillRect(-r, -r, 2 * r, 2 * r);
  c.lineCap = 'butt';
  c.strokeStyle = '#f4f4f4'; c.lineWidth = r * 0.36;
  c.beginPath(); c.moveTo(-r, -r); c.lineTo(r, r); c.moveTo(r, -r); c.lineTo(-r, r); c.stroke();
  c.strokeStyle = '#c8102e'; c.lineWidth = r * 0.12;
  c.beginPath(); c.moveTo(-r, -r); c.lineTo(r, r); c.moveTo(r, -r); c.lineTo(-r, r); c.stroke();
  c.strokeStyle = '#f4f4f4'; c.lineWidth = r * 0.55;
  c.beginPath(); c.moveTo(-r, 0); c.lineTo(r, 0); c.moveTo(0, -r); c.lineTo(0, r); c.stroke();
  c.strokeStyle = '#c8102e'; c.lineWidth = r * 0.32;
  c.beginPath(); c.moveTo(-r, 0); c.lineTo(r, 0); c.moveTo(0, -r); c.lineTo(0, r); c.stroke();
};
Flags.franca = (c, r) => bands(c, r, ['#1c3d99', '#f4f4f4', '#d91f26'], true);
Flags.urss = (c, r) => {
  c.fillStyle = '#cc0000'; c.fillRect(-r, -r, 2 * r, 2 * r);
  c.fillStyle = '#ffd700'; star(c, -r * 0.45, -r * 0.45, r * 0.3, 0);
};
Flags.polonia = (c, r) => bands(c, r, ['#f4f4f4', '#dc143c'], false);

// ---------------------------------------------------------------
// Acessórios (capacetes, bonés etc.)
// ---------------------------------------------------------------
function helmet(c, r, fill, rim) {
  c.beginPath();
  c.moveTo(-r * 1.08, -r * 0.08);
  c.quadraticCurveTo(-r * 1.08, -r * 1.28, 0, -r * 1.28);
  c.quadraticCurveTo(r * 1.08, -r * 1.28, r * 1.08, -r * 0.08);
  c.quadraticCurveTo(0, -r * 0.34, -r * 1.08, -r * 0.08);
  c.closePath();
  c.fillStyle = fill; c.fill();
  c.lineWidth = Math.max(1.5, r * 0.08); c.strokeStyle = '#161616'; c.stroke();
  c.strokeStyle = rim; c.lineWidth = Math.max(1, r * 0.05);
  c.beginPath(); c.moveTo(-r * 0.7, -r * 0.7); c.quadraticCurveTo(-r * 0.2, -r * 1.1, r * 0.3, -r * 1.05); c.stroke();
}

function drawAcc(c, r, acc) {
  if (!acc || acc === 'none') return;
  if (acc === 'steel') helmet(c, r, '#58636e', 'rgba(255,255,255,.35)');
  else if (acc === 'olive') helmet(c, r, '#5d6b3a', 'rgba(255,255,255,.3)');
  else if (acc === 'tan') helmet(c, r, '#b49a5e', 'rgba(255,255,255,.35)');
  else if (acc === 'bersa') {
    helmet(c, r, '#4c5a30', 'rgba(255,255,255,.3)');
    c.strokeStyle = '#111'; c.lineWidth = Math.max(1.5, r * 0.07);
    for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(r * 0.7, -r * 0.95); c.quadraticCurveTo(r * 1.5, -r * (1.0 + i * 0.12), r * 1.35, -r * (0.2 + i * 0.18)); c.stroke(); }
  } else if (acc === 'navy') {
    // quepe de oficial
    c.fillStyle = '#1d2c52'; c.beginPath(); c.moveTo(-r * 1.0, -r * 0.35); c.quadraticCurveTo(-r * 0.9, -r * 1.25, 0, -r * 1.25); c.quadraticCurveTo(r * 0.9, -r * 1.25, r * 1.0, -r * 0.35); c.closePath(); c.fill();
    c.lineWidth = Math.max(1.5, r * 0.08); c.strokeStyle = '#161616'; c.stroke();
    c.fillStyle = '#10182e'; c.beginPath(); c.ellipse(0, -r * 0.35, r * 1.12, r * 0.2, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = '#e6c34a'; c.beginPath(); c.arc(0, -r * 0.72, r * 0.13, 0, Math.PI * 2); c.fill();
  } else if (acc === 'pilot') {
    c.fillStyle = '#6b4a2b';
    c.beginPath(); c.moveTo(-r * 1.04, -r * 0.1); c.quadraticCurveTo(-r * 1.04, -r * 1.2, 0, -r * 1.2); c.quadraticCurveTo(r * 1.04, -r * 1.2, r * 1.04, -r * 0.1); c.quadraticCurveTo(0, -r * 0.5, -r * 1.04, -r * 0.1); c.closePath(); c.fill();
    c.lineWidth = Math.max(1.5, r * 0.08); c.strokeStyle = '#161616'; c.stroke();
    c.fillStyle = '#9fd8ff';
    for (const s of [-1, 1]) { c.beginPath(); c.arc(s * r * 0.38, -r * 0.6, r * 0.22, 0, Math.PI * 2); c.fill(); c.stroke(); }
    c.strokeStyle = '#222'; c.lineWidth = r * 0.07; c.beginPath(); c.moveTo(-r * 0.16, -r * 0.6); c.lineTo(r * 0.16, -r * 0.6); c.stroke();
  } else if (acc === 'hachimaki') {
    c.save(); c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.clip();
    c.fillStyle = '#f4f4f4'; c.fillRect(-r, -r * 0.82, 2 * r, r * 0.3);
    c.fillStyle = '#c8102e'; c.beginPath(); c.arc(0, -r * 0.67, r * 0.12, 0, Math.PI * 2); c.fill();
    c.restore();
    c.strokeStyle = '#f4f4f4'; c.lineWidth = r * 0.12;
    c.beginPath(); c.moveTo(r * 0.95, -r * 0.65); c.quadraticCurveTo(r * 1.5, -r * 0.5, r * 1.45, -r * 0.05); c.stroke();
    c.beginPath(); c.moveTo(r * 0.95, -r * 0.65); c.quadraticCurveTo(r * 1.45, -r * 0.8, r * 1.65, -r * 0.4); c.stroke();
  }
}

// ---------------------------------------------------------------
// Sprites de bolas com cache + olhos desenhados ao vivo
// ---------------------------------------------------------------
const BallSprites = {};
function ballSprite(flag, r, acc) {
  const key = flag + '|' + r + '|' + (acc || '');
  if (BallSprites[key]) return BallSprites[key];
  const pad = Math.ceil(r * 0.7) + 6;
  const size = Math.ceil(r * 2 + pad * 2);
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const c = cv.getContext('2d');
  c.translate(size / 2, size / 2);
  c.save();
  c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.clip();
  (Flags[flag] || Flags.brasil)(c, r);
  const g = c.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05);
  g.addColorStop(0, 'rgba(255,255,255,.30)');
  g.addColorStop(0.55, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(0,0,0,.40)');
  c.fillStyle = g; c.fillRect(-r, -r, 2 * r, 2 * r);
  c.restore();
  c.lineWidth = Math.max(1.5, r * 0.09); c.strokeStyle = '#161616';
  c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke();
  drawAcc(c, r, acc);
  cv.half = size / 2;
  BallSprites[key] = cv;
  return cv;
}

function drawEyes(c, x, y, r, tx, ty, mood) {
  const ex = r * 0.3, ey = r * 0.02, ew = r * 0.2, eh = r * 0.27;
  const ang = Math.atan2(ty - y, tx - x);
  const k = Math.min(1, Math.hypot(tx - x, ty - y) / 160);
  const px = Math.cos(ang) * ew * 0.5 * k, py = Math.sin(ang) * eh * 0.5 * k;
  const lw = Math.max(1, r * 0.06);
  for (const s of [-1, 1]) {
    c.fillStyle = '#fff'; c.strokeStyle = '#111'; c.lineWidth = lw;
    c.beginPath(); c.ellipse(x + s * ex, y + ey, ew, eh, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = '#111';
    c.beginPath(); c.arc(x + s * ex + px, y + ey + py, ew * 0.52, 0, Math.PI * 2); c.fill();
    if (mood === 'angry') {
      c.strokeStyle = '#111'; c.lineWidth = Math.max(1.5, r * 0.11);
      c.beginPath(); c.moveTo(x + s * (ex + ew * 1.2), y + ey - eh * 1.35); c.lineTo(x + s * (ex - ew * 1.1), y + ey - eh * 0.6); c.stroke();
    }
  }
}

// desenha uma bola completa (sprite + olhos) com escala opcional
function drawBall(c, flag, r, acc, x, y, tx, ty, mood, scale) {
  const sc = scale || 1;
  const s = ballSprite(flag, r, acc);
  c.drawImage(s, x - s.half * sc, y - s.half * sc, s.width * sc, s.height * sc);
  drawEyes(c, x, y, r * sc, tx === undefined ? x : tx, ty === undefined ? y : ty, mood);
}
