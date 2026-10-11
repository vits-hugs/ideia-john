'use strict';
// ---------------------------------------------------------------
// Cenários com rolagem vertical (tiles pré-renderizados + parallax)
// ---------------------------------------------------------------
function mulberry(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeTile(w, h, paint) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  return c;
}
function wrapY(h, y, f) { f(y); f(y - h); f(y + h); }
function blob(c, x, y, r, col0, col1) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col0); g.addColorStop(1, col1);
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
}

const Backgrounds = {
  // ---------------- Fase 1: Atlântico Sul ----------------
  ocean(w, h) {
    const R = mulberry(7);
    const base = makeTile(w, h, (c) => {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#0c3b78'); g.addColorStop(1, '#0c3b78');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 46; i++) {
        const x = R() * w, y = R() * h, r = 30 + R() * 80;
        wrapY(h, y, (yy) => blob(c, x, yy, r, 'rgba(40,130,210,.22)', 'rgba(40,130,210,0)'));
      }
      c.strokeStyle = 'rgba(255,255,255,.30)'; c.lineWidth = 1.5; c.lineCap = 'round';
      for (let i = 0; i < 280; i++) {
        const x = R() * w, y = R() * h, len = 8 + R() * 20;
        wrapY(h, y, (yy) => { c.beginPath(); c.moveTo(x, yy); c.quadraticCurveTo(x + len / 2, yy - 3, x + len, yy); c.stroke(); });
      }
    });
    const fog = makeTile(w, h, (c) => {
      for (let i = 0; i < 12; i++) {
        const x = R() * w, y = R() * h, r = 60 + R() * 90;
        wrapY(h, y, (yy) => blob(c, x, yy, r, 'rgba(255,255,255,.13)', 'rgba(255,255,255,0)'));
      }
    });
    return { base, fog, speed: 1.1, fogSpeed: 2.0 };
  },

  // ---------------- Fase 2: Monte Castello (Itália) ----------------
  mountain(w, h) {
    const R = mulberry(23);
    const base = makeTile(w, h, (c) => {
      c.fillStyle = '#41612c'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) {
        const x = R() * w, y = R() * h, r = 20 + R() * 60;
        const col = R() < 0.5 ? 'rgba(86,110,50,.35)' : 'rgba(70,52,34,.28)';
        wrapY(h, y, (yy) => blob(c, x, yy, r, col, 'rgba(0,0,0,0)'));
      }
      // cristas de montanha (sombra + luz)
      for (let i = 0; i < 8; i++) {
        const x = R() * w, y = R() * h, r = 40 + R() * 50;
        wrapY(h, y, (yy) => {
          blob(c, x + 14, yy + 10, r, 'rgba(20,20,10,.4)', 'rgba(0,0,0,0)');
          blob(c, x, yy, r * 0.8, 'rgba(150,130,100,.7)', 'rgba(110,95,70,0)');
          blob(c, x - 6, yy - 8, r * 0.3, 'rgba(255,255,255,.75)', 'rgba(255,255,255,0)');
        });
      }
      // estrada sinuosa
      c.strokeStyle = '#8d7d57'; c.lineWidth = 24; c.lineCap = 'round';
      for (const off of [0]) {
        c.beginPath();
        for (let y = -20; y <= h + 20; y += 8) {
          const x = w * 0.5 + Math.sin((y / h) * Math.PI * 4) * 80 + off;
          if (y === -20) c.moveTo(x, y); else c.lineTo(x, y);
        }
        c.stroke();
      }
      c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 2; c.setLineDash([10, 12]);
      c.beginPath();
      for (let y = -20; y <= h + 20; y += 8) {
        const x = w * 0.5 + Math.sin((y / h) * Math.PI * 4) * 80;
        if (y === -20) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.stroke(); c.setLineDash([]);
      // árvores
      for (let i = 0; i < 260; i++) {
        const x = R() * w, y = R() * h;
        const roadX = w * 0.5 + Math.sin((y / h) * Math.PI * 4) * 80;
        if (Math.abs(x - roadX) < 22) continue;
        wrapY(h, y, (yy) => { c.fillStyle = R() < 0.5 ? '#1f3d1a' : '#2a4d20'; c.beginPath(); c.arc(x, yy, 3 + R() * 4, 0, Math.PI * 2); c.fill(); });
      }
    });
    const fog = makeTile(w, h, (c) => {
      for (let i = 0; i < 10; i++) {
        const x = R() * w, y = R() * h, r = 70 + R() * 100;
        wrapY(h, y, (yy) => blob(c, x, yy, r, 'rgba(235,240,245,.16)', 'rgba(235,240,245,0)'));
      }
    });
    return { base, fog, speed: 1.4, fogSpeed: 2.4 };
  },

  // ---------------- Fase 3: Mar das Filipinas (Pacífico) ----------------
  pacific(w, h) {
    const R = mulberry(61);
    const base = makeTile(w, h, (c) => {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#0a7392'); g.addColorStop(1, '#0a7392');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 60; i++) {
        const x = R() * w, y = R() * h, r = 25 + R() * 70;
        wrapY(h, y, (yy) => blob(c, x, yy, r, 'rgba(60,200,200,.16)', 'rgba(60,200,200,0)'));
      }
      c.strokeStyle = 'rgba(255,255,255,.30)'; c.lineWidth = 1.5; c.lineCap = 'round';
      for (let i = 0; i < 220; i++) {
        const x = R() * w, y = R() * h, len = 8 + R() * 18;
        wrapY(h, y, (yy) => { c.beginPath(); c.moveTo(x, yy); c.quadraticCurveTo(x + len / 2, yy - 3, x + len, yy); c.stroke(); });
      }
      // ilhas
      for (let i = 0; i < 5; i++) {
        const x = 40 + R() * (w - 80), y = R() * h, r = 28 + R() * 34;
        const pts = [];
        for (let k = 0; k < 6; k++) pts.push([Math.cos(k) * r * (0.5 + R() * 0.6), Math.sin(k * 1.3) * r * (0.5 + R() * 0.7)]);
        wrapY(h, y, (yy) => {
          blob(c, x, yy, r * 1.9, 'rgba(160,240,230,.55)', 'rgba(160,240,230,0)');
          for (const [dx, dy] of pts) { c.fillStyle = '#e8d9a0'; c.beginPath(); c.arc(x + dx, yy + dy, r * 0.62, 0, Math.PI * 2); c.fill(); }
          for (const [dx, dy] of pts) { c.fillStyle = '#2f7d32'; c.beginPath(); c.arc(x + dx * 0.8, yy + dy * 0.8, r * 0.44, 0, Math.PI * 2); c.fill(); }
          c.fillStyle = '#1d5a22';
          for (let k = 0; k < 8; k++) { c.beginPath(); c.arc(x + (R() - 0.5) * r * 1.2, yy + (R() - 0.5) * r * 1.2, 2 + R() * 3, 0, Math.PI * 2); c.fill(); }
        });
      }
    });
    const fog = makeTile(w, h, (c) => {
      for (let i = 0; i < 10; i++) {
        const x = R() * w, y = R() * h, r = 60 + R() * 90;
        wrapY(h, y, (yy) => blob(c, x, yy, r, 'rgba(255,200,170,.17)', 'rgba(255,200,170,0)'));
      }
    });
    return { base, fog, speed: 1.2, fogSpeed: 2.1, tint: ['rgba(255,120,40,.30)', 'rgba(255,120,40,0)'] };
  },

  // ---------------- Fase 4: Berlim 1945 ----------------
  berlin(w, h) {
    const R = mulberry(97);
    const fires = [];
    const base = makeTile(w, h, (c) => {
      c.fillStyle = '#1c1514'; c.fillRect(0, 0, w, h);
      // ruas
      c.fillStyle = '#0e0a0a';
      for (let x = 0; x < w; x += 112) c.fillRect(x + 2, 0, 20, h);
      for (let y = 0; y < h; y += 152) c.fillRect(0, y + 2, w, 18);
      // quarteirões
      for (let bx = 0; bx < w; bx += 112) {
        for (let by = 0; by < h; by += 152) {
          for (let i = 0; i < 5; i++) {
            const x = bx + 26 + R() * 56, y = by + 24 + R() * 100, bw = 20 + R() * 34, bh = 18 + R() * 40;
            const ruin = R() < 0.4;
            c.fillStyle = ruin ? '#2a201d' : '#34292a';
            c.fillRect(x - bw / 2, y - bh / 2, bw, bh);
            c.fillStyle = ruin ? '#171110' : '#4a3b38';
            c.fillRect(x - bw / 2, y - bh / 2, bw, 3);
            if (ruin) { c.fillStyle = '#0d0909'; c.fillRect(x - bw / 4, y - bh / 4, bw / 2, bh / 2); }
          }
          if (R() < 0.45) fires.push([bx + 30 + R() * 56, by + 30 + R() * 90]);
        }
      }
      for (const [fx, fy] of fires) blob(c, fx, fy, 38, 'rgba(255,120,30,.38)', 'rgba(255,60,0,0)');
    });
    const fog = makeTile(w, h, (c) => {
      for (let i = 0; i < 14; i++) {
        const x = R() * w, y = R() * h, r = 60 + R() * 100;
        wrapY(h, y, (yy) => blob(c, x, yy, r, 'rgba(60,50,50,.30)', 'rgba(60,50,50,0)'));
      }
    });
    return { base, fog, speed: 1.5, fogSpeed: 2.6, fires, tint: ['rgba(180,20,10,.28)', 'rgba(60,0,0,.05)'], flicker: true };
  },
};

function makeBG(type, w, h) {
  const bg = Backgrounds[type](w, h);
  bg.w = w; bg.h = h; bg.y1 = 0; bg.y2 = 0;
  bg.update = function () {
    this.y1 = (this.y1 + this.speed) % this.h;
    this.y2 = (this.y2 + this.fogSpeed) % this.h;
  };
  bg.draw = function (c, time) {
    c.drawImage(this.base, 0, this.y1 - this.h);
    c.drawImage(this.base, 0, this.y1);
    if (this.fires) {
      c.save(); c.globalCompositeOperation = 'lighter';
      for (const [fx, fy] of this.fires) {
        const fl = 0.55 + 0.45 * Math.sin(time * 0.15 + fx * 0.3 + fy);
        for (const off of [-this.h, 0]) {
          const yy = fy + this.y1 + off;
          if (yy < -50 || yy > this.h + 50) continue;
          blob(c, fx, yy, 22 + fl * 8, 'rgba(255,170,60,' + (0.45 * fl).toFixed(2) + ')', 'rgba(255,80,0,0)');
        }
      }
      c.restore();
    }
    if (this.tint) {
      const g = c.createLinearGradient(0, 0, 0, this.h);
      g.addColorStop(0, this.tint[0]); g.addColorStop(1, this.tint[1]);
      c.fillStyle = g; c.fillRect(0, 0, this.w, this.h);
    }
    c.drawImage(this.fog, 0, this.y2 - this.h);
    c.drawImage(this.fog, 0, this.y2);
  };
  return bg;
}
