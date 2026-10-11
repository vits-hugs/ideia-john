'use strict';
// ---------------------------------------------------------------
// FASES: scripts de inimigos, mid-bosses, diálogos e bosses
// (todas as "cartas de guerra" dos bosses estão aqui)
// ---------------------------------------------------------------
const rnd = (a, b) => G.rand(a, b);
const sp = (s) => s * DIFFS[G.diff].s;
function setVel(b, ang, spd) { b.ang = ang; b.spd = spd; b.vx = Math.cos(ang) * spd; b.vy = Math.sin(ang) * spd; }

// -------- comportamentos de inimigos comuns --------
function* seq(n, gap, fn) { for (let i = 0; i < n; i++) { fn(i); yield gap; } }

function flyer(side, y0, col, spd) {
  return function* (e) {
    e.vx = (side < 0 ? 1 : -1) * (spd || 2.1);
    const every = G.per(50);
    for (;;) {
      e.y = y0 + Math.sin(e.t * 0.06) * 38;
      if (e.t % every === 20) G.bullet(e.x, e.y, G.aim(e.x, e.y), 3.1, { color: col || 'red', r: 4 });
      yield 1;
    }
  };
}
function diver(col, stopY) {
  return function* (e) {
    e.vy = 2.6;
    while (e.y < (stopY || 150)) yield 1;
    e.vy = 0;
    for (let i = 0; i < 2; i++) { G.fan(e.x, e.y, 5, 0.9, G.aim(e.x, e.y), 3.2, { kind: 'rice', color: col || 'red' }); yield 24; }
    e.vy = -2.2;
  };
}
function hover(x, y, col, shots) {
  return function* (e) {
    e.moveTo(x, y, 0.05); yield 50;
    for (let i = 0; i < (shots || 4); i++) {
      G.ring(e.x, e.y, 14, rnd(0, TAU), 2.0, { color: col || 'blue', r: 4 }); yield 22;
      G.fan(e.x, e.y, 3, 0.5, G.aim(e.x, e.y), 3.4, { kind: 'rice', color: 'red' }); yield 40;
    }
    e.tx = undefined; e.vy = -2.5;
  };
}
function spinner(x, y, col) {
  return function* (e) {
    e.moveTo(x, y, 0.05); yield 40;
    let a = 0;
    for (let i = 0; i < 70; i++) {
      G.bullet(e.x, e.y, a, 2.4, { color: col || 'cyan', r: 3 });
      G.bullet(e.x, e.y, a + Math.PI, 2.4, { color: col || 'cyan', r: 3 });
      a += 0.33; yield G.per(4);
    }
    e.tx = undefined; e.vy = -2.5;
  };
}
function sniper(x, y, col) {
  return function* (e) {
    e.moveTo(x, y, 0.06); yield 45;
    for (let i = 0; i < 4; i++) {
      for (let k = 0; k < 3; k++) { G.bullet(e.x, e.y, G.aim(e.x, e.y), 4.0, { kind: 'needle', color: col || 'white', r: 3 }); yield 7; }
      yield 40;
    }
    e.tx = undefined; e.vy = -2.5;
  };
}
function kamikaze() {
  return function* (e) {
    e.vy = 1.6; yield 38;
    const a = G.aim(e.x, e.y);
    e.vx = Math.cos(a) * 4.3; e.vy = Math.sin(a) * 4.3;
    G.ring(e.x, e.y, 8, rnd(0, TAU), 2.0, { color: 'pink', r: 3 });
  };
}
function tank(col) {
  return function* (e) {
    e.vy = 0.8;
    for (let i = 0; i < 6; i++) { G.fan(e.x, e.y, 7, 1.5, G.aim(e.x, e.y), 2.7, { r: 5, color: col || 'orange' }); yield 55; }
  };
}
// mid-boss genérico (inimigo grande que muda de posição e atira)
function midboss(c1, c2) {
  return function* (e) {
    e.moveTo(PW / 2, 110, 0.04); yield 70;
    for (let cyc = 0; cyc < 7; cyc++) {
      e.moveTo(rnd(110, PW - 110), rnd(80, 150), 0.05);
      const n = 22;
      for (let i = 0; i < n; i++) G.bullet(e.x, e.y, (i * TAU) / G.cnt(n) , 2.2, { color: i % 2 ? c1 : c2, r: 4 });
      G.ring(e.x, e.y, 20, cyc * 0.2, 2.2, { color: c1, r: 4 });
      yield 28;
      G.fan(e.x, e.y, 7, 1.2, G.aim(e.x, e.y), 3.4, { kind: 'rice', color: c2 });
      yield 28;
      G.fan(e.x, e.y, 7, 1.6, G.aim(e.x, e.y), 2.6, { kind: 'rice', color: c1 });
      yield 70;
    }
    e.tx = undefined; e.vy = -2.2;
  };
}

const AX = { flag: 'alemanha', acc: 'steel' };
const IT = { flag: 'italia', acc: 'bersa' };
const JP = { flag: 'japao', acc: 'tan' };
const AX4 = { flag: 'alemanha', acc: 'steel' };

// ---------------------------------------------------------------
const Stages = [
  // =================== FASE 1 ===================
  {
    name: 'Atlântico Sul', year: '1942', bg: 'ocean', music: 0,
    *script() {
      yield 100;
      yield* seq(6, 24, () => G.enemy({ x: -20, y: 60, hp: 5, ...AX }, flyer(-1, 70, 'red')));
      yield 150;
      yield* seq(6, 24, () => G.enemy({ x: PW + 20, y: 90, hp: 5, ...AX }, flyer(1, 100, 'red')));
      yield 170;
      yield* seq(5, 16, (i) => G.enemy({ x: 60 + i * 82, y: -20, hp: 8, ...AX }, diver('red', 150)));
      yield 150;
      G.enemy({ x: 110, y: -30, hp: 40, r: 16, ...AX }, hover(110, 120, 'blue', 4));
      G.enemy({ x: PW - 110, y: -30, hp: 40, r: 16, ...AX }, hover(PW - 110, 120, 'blue', 4));
      yield 380;
      for (let i = 0; i < 5; i++) {
        G.enemy({ x: -20, y: 60 + i * 12, hp: 5, ...AX }, flyer(-1, 60 + i * 12, 'cyan', 2.6));
        G.enemy({ x: PW + 20, y: 140 + i * 12, hp: 5, ...AX }, flyer(1, 140 + i * 12, 'cyan', 2.6));
        yield 26;
      }
      yield 200;
      // mid-boss: Hungria
      const m = G.enemy({ x: PW / 2, y: -40, hp: 420, r: 24, flag: 'hungria', acc: 'olive', big: true, score: 5000, drops: { P: 4, pt: 8 } }, midboss('blue', 'cyan'));
      yield () => m.gone;
      yield 100;
      G.enemy({ x: 90, y: -30, hp: 30, ...AX }, spinner(90, 110, 'cyan'));
      G.enemy({ x: PW / 2, y: -30, hp: 30, ...AX }, spinner(PW / 2, 160, 'blue'));
      G.enemy({ x: PW - 90, y: -30, hp: 30, ...AX }, spinner(PW - 90, 110, 'cyan'));
      yield 330;
      yield* seq(7, 14, (i) => G.enemy({ x: 40 + i * 62, y: -20, hp: 8, ...AX }, diver('red', 120 + (i % 2) * 60)));
      yield 140;
      yield* seq(8, 20, (i) => G.enemy({ x: i % 2 ? PW + 20 : -20, y: 70 + i * 14, hp: 5, ...AX }, flyer(i % 2 ? 1 : -1, 80 + i * 14, 'red', 2.4)));
      yield 260;
      yield 90;
      G.spawnBoss();
      yield () => G.bossDone;
    },
    boss: {
      name: 'Alemanha — Lobo do Atlântico', flag: 'alemanha', acc: 'navy', r: 30,
      dialog: [
        { who: 'b', text: 'Achtung! Quem é essa bolinha verde-amarela no meu Atlântico?' },
        { who: 'p', text: 'Vocês afundaram os nossos navios! O Brasil não vai mais ficar de fora.' },
        { who: 'b', text: 'Ha! É mais fácil uma cobra fumar do que o Brasil entrar na guerra!' },
        { who: 'p', text: 'Então prepara o cachimbo, porque a cobra vai fumar!' },
      ],
      phases: [
        {
          name: null, hp: 800, time: 40, spell: false,
          pattern: function* (b) {
            let a = 0;
            for (;;) {
              b.moveTo(rnd(120, PW - 120), rnd(70, 130));
              for (let k = 0; k < 3; k++) { G.fan(b.x, b.y, 7, 1.1, G.aim(b.x, b.y), 3.2, { kind: 'rice', color: 'red' }); yield 25; }
              G.ring(b.x, b.y, 22, a, 1.9, { color: 'blue' }); a += 0.13;
              yield 50;
            }
          },
        },
        {
          name: 'Matilha de Lobos', hp: 1200, time: 50, spell: true, bonus: 300000,
          pattern: function* (b) {
            b.moveTo(PW / 2, 110); yield 40;
            let a = 0, dir = 1, f = 0;
            const em = G.per(5), arms = Math.max(2, G.cnt(4));
            for (;;) {
              if (f % em === 0) {
                for (let k = 0; k < arms; k++) G.bullet(b.x, b.y, a + (k * TAU) / arms, 2.3, { color: k % 2 ? 'cyan' : 'blue' });
                a += 0.19 * dir;
              }
              if (f % 200 === 199) dir *= -1;
              if (f % G.per(70) === 0) G.fan(b.x, b.y, 5, 0.8, G.aim(b.x, b.y), 3.6, { kind: 'rice', color: 'red' });
              f++; yield 1;
            }
          },
        },
        {
          name: null, hp: 900, time: 40, spell: false,
          pattern: function* (b) {
            const torp = (t) => {
              if (t.t === 55) { G.ring(t.x, t.y, 10, rnd(0, TAU), 2.0, { color: 'cyan', r: 3 }); t.dead = true; }
            };
            for (;;) {
              b.moveTo(rnd(110, PW - 110), rnd(70, 120)); yield 20;
              G.fan(b.x, b.y, 3, 0.9, G.aim(b.x, b.y), 1.7, { r: 10, color: 'green', fn: torp });
              yield 30;
              G.ring(b.x, b.y, 16, rnd(0, TAU), 2.2, { color: 'yellow', r: 3 });
              yield 60;
            }
          },
        },
        {
          name: 'Tempestade de Aço', hp: 1500, time: 55, spell: true, bonus: 350000,
          pattern: function* (b) {
            b.moveTo(PW / 2, 90); yield 40;
            let gx = PW / 2, n = 0;
            for (;;) {
              gx = clamp(gx + rnd(-80, 80), 70, PW - 70);
              for (let x = 10; x < PW; x += 22) { if (Math.abs(x - gx) < 48) continue; G.bullet(x, -8, TAU / 4, 2.1, { color: 'red' }); }
              n++;
              if (n % 3 === 0) G.ring(b.x, b.y, 16, rnd(0, TAU), 1.8, { color: 'cyan', r: 3 });
              yield G.per(34);
            }
          },
        },
      ],
    },
  },

  // =================== FASE 2 ===================
  {
    name: 'Monte Castello', year: '1944 · Itália', bg: 'mountain', music: 1,
    *script() {
      yield 100;
      yield* seq(6, 22, (i) => G.enemy({ x: 60 + i * 66, y: -20, hp: 7, ...IT }, diver('green', 130 + (i % 2) * 40)));
      yield 150;
      G.enemy({ x: 100, y: -30, hp: 24, ...IT }, sniper(100, 90, 'white'));
      G.enemy({ x: PW - 100, y: -30, hp: 24, ...IT }, sniper(PW - 100, 150, 'white'));
      yield 320;
      yield* seq(8, 20, (i) => G.enemy({ x: i % 2 ? PW + 20 : -20, y: 60 + i * 10, hp: 6, ...IT }, flyer(i % 2 ? 1 : -1, 70 + i * 10, 'green', 2.5)));
      yield 220;
      G.enemy({ x: PW / 2, y: -30, hp: 70, r: 18, ...IT }, hover(PW / 2, 130, 'red', 5));
      yield 330;
      yield* seq(6, 30, (i) => G.enemy({ x: 50 + i * 70, y: -20, hp: 8, ...IT }, diver('red', 110 + (i % 3) * 40)));
      yield 240;
      const m = G.enemy({ x: PW / 2, y: -40, hp: 520, r: 24, flag: 'romenia', acc: 'olive', big: true, score: 6000, drops: { P: 4, pt: 8 } }, midboss('green', 'red'));
      yield () => m.gone;
      yield 100;
      G.enemy({ x: 80, y: -30, hp: 34, ...IT }, spinner(80, 120, 'green'));
      G.enemy({ x: PW - 80, y: -30, hp: 34, ...IT }, spinner(PW - 80, 120, 'red'));
      yield 160;
      G.enemy({ x: PW / 2, y: -30, hp: 34, ...IT }, spinner(PW / 2, 190, 'white'));
      yield 300;
      yield* seq(10, 14, (i) => G.enemy({ x: i % 2 ? PW + 20 : -20, y: 100 + (i % 5) * 28, hp: 6, ...IT }, flyer(i % 2 ? 1 : -1, 100 + (i % 5) * 28, 'white', 3.0)));
      yield 280;
      yield 80;
      G.spawnBoss();
      yield () => G.bossDone;
    },
    boss: {
      name: 'Itália — Mestre da Montanha', flag: 'italia', acc: 'bersa', r: 30,
      dialog: [
        { who: 'b', text: 'Mamma mia! Monte Castello é nosso, bambino!' },
        { who: 'p', text: 'Aqui é a FEB! Vim buscar esse morro e não saio sem ele.' },
        { who: 'b', text: 'Vai ter que passar pela minha defesa... e pela minha massa!' },
      ],
      phases: [
        {
          name: null, hp: 950, time: 40, spell: false,
          pattern: function* (b) {
            let a = 0;
            for (;;) {
              b.moveTo(rnd(130, PW - 130), rnd(70, 120));
              const n = G.cnt(24);
              for (let i = 0; i < n; i++) G.bullet(b.x, b.y, a + (i * TAU) / n, 1.0, { color: i % 2 ? 'green' : 'red', acc: 0.02, max: 3.2 });
              a += 0.21; yield 20;
              G.fan(b.x, b.y, 3, 0.5, G.aim(b.x, b.y), 3.6, { kind: 'rice', color: 'white' });
              yield 70;
            }
          },
        },
        {
          name: 'Fortaleza do Monte', hp: 1400, time: 55, spell: true, bonus: 400000,
          pattern: function* (b) {
            b.moveTo(PW / 2, 120); yield 40;
            let a = 0, e = 0, f = 0;
            const em = G.per(7), n = Math.max(3, G.cnt(5));
            const stopTurn = (q) => { if (q.t > 70) q.turn = 0; };
            for (;;) {
              if (f % em === 0) {
                const s = e % 2 ? 1 : -1;
                for (let i = 0; i < n; i++) G.bullet(b.x, b.y, a + (i * TAU) / n, 2.6, { color: i % 2 ? 'pink' : 'red', turn: 0.016 * s, fn: stopTurn });
                a += 0.37; e++;
              }
              f++; yield 1;
            }
          },
        },
        {
          name: null, hp: 1000, time: 40, spell: false,
          pattern: function* (b) {
            b.moveTo(PW / 2, 90); yield 40;
            let n = 0;
            for (;;) {
              const x = rnd(30, PW - 30), ey = rnd(160, 380);
              G.bullet(x, -10, TAU / 4, 2.6, {
                r: 9, color: 'orange',
                fn: (q) => { if (q.y > ey) { G.ring(q.x, q.y, 12, rnd(0, TAU), 2.0, { color: 'yellow', r: 3 }); burst(q.x, q.y, 6, '#ffb060', 3, 16, 2); q.dead = true; } },
              });
              n++;
              if (n % 4 === 0) G.fan(b.x, b.y, 5, 0.8, G.aim(b.x, b.y), 3.2, { kind: 'rice', color: 'red' });
              yield G.per(18);
            }
          },
        },
        {
          name: 'Espaguete Infinito', hp: 1700, time: 60, spell: true, bonus: 450000,
          pattern: function* (b) {
            b.moveTo(PW / 2, 110); yield 40;
            let a = 0, f = 0;
            const cols = ['green', 'white', 'red'], em = G.per(3);
            for (;;) {
              if (f % em === 0) {
                for (let k = 0; k < 3; k++) {
                  const ph = k * 2;
                  G.bullet(b.x, b.y, a + (k * TAU) / 3, 2.2, { color: cols[k], fn: (q) => { q.turn = Math.sin(q.t * 0.09 + ph) * 0.045; } });
                }
                a += 0.045;
              }
              f++; yield 1;
            }
          },
        },
      ],
    },
  },

  // =================== FASE 3 ===================
  {
    name: 'Mar das Filipinas', year: '1944 · licença poética', bg: 'pacific', music: 2,
    *script() {
      yield 100;
      yield* seq(6, 20, (i) => G.enemy({ x: 50 + i * 70, y: -20, hp: 6, ...JP }, kamikaze()));
      yield 170;
      yield* seq(8, 18, (i) => G.enemy({ x: i % 2 ? PW + 20 : -20, y: 60 + i * 10, hp: 6, ...JP }, flyer(i % 2 ? 1 : -1, 70 + i * 10, 'pink', 2.8)));
      yield 220;
      G.enemy({ x: 100, y: -30, hp: 26, ...JP }, sniper(100, 100, 'pink'));
      G.enemy({ x: PW - 100, y: -30, hp: 26, ...JP }, sniper(PW - 100, 100, 'pink'));
      G.enemy({ x: PW / 2, y: -30, hp: 26, ...JP }, sniper(PW / 2, 170, 'white'));
      yield 360;
      yield* seq(10, 12, (i) => G.enemy({ x: 30 + (i * 41) % (PW - 60), y: -20, hp: 5, ...JP }, kamikaze()));
      yield 200;
      G.enemy({ x: 120, y: -30, hp: 60, r: 17, ...JP }, hover(120, 120, 'pink', 5));
      G.enemy({ x: PW - 120, y: -30, hp: 60, r: 17, ...JP }, hover(PW - 120, 120, 'white', 5));
      yield 380;
      const m = G.enemy({ x: PW / 2, y: -40, hp: 600, r: 24, flag: 'tailandia', acc: 'tan', big: true, score: 7000, drops: { P: 4, pt: 8 } }, midboss('pink', 'white'));
      yield () => m.gone;
      yield 100;
      yield* seq(8, 16, (i) => G.enemy({ x: i % 2 ? PW + 20 : -20, y: 90 + (i % 4) * 30, hp: 6, ...JP }, flyer(i % 2 ? 1 : -1, 90 + (i % 4) * 30, 'white', 3.2)));
      yield 200;
      yield* seq(12, 10, (i) => G.enemy({ x: 20 + ((i * 53) % (PW - 40)), y: -20, hp: 5, ...JP }, kamikaze()));
      yield 150;
      G.enemy({ x: 90, y: -30, hp: 34, ...JP }, spinner(90, 130, 'pink'));
      G.enemy({ x: PW - 90, y: -30, hp: 34, ...JP }, spinner(PW - 90, 130, 'pink'));
      yield 320;
      yield 70;
      G.spawnBoss();
      yield () => G.bossDone;
    },
    boss: {
      name: 'Japão — Samurai do Pacífico', flag: 'japao', acc: 'hachimaki', r: 30,
      dialog: [
        { who: 'b', text: 'Forasteiro... este mar pertence ao Império do Sol Nascente.' },
        { who: 'p', text: 'O Brasil vai aonde a liberdade precisar, camarada!' },
        { who: 'b', text: 'Então mostre sua honra neste duelo!' },
      ],
      phases: [
        {
          name: null, hp: 1100, time: 40, spell: false,
          pattern: function* (b) {
            for (;;) {
              b.moveTo(rnd(110, PW - 110), rnd(70, 150)); yield 30;
              const a = G.aim(b.x, b.y);
              for (let i = 0; i < 5; i++) G.bullet(b.x, b.y, a, 3.0 + i * 0.6, { kind: 'rice', color: 'white' });
              yield 8;
              G.fan(b.x, b.y, 9, 1.6, G.aim(b.x, b.y), 2.8, { kind: 'rice', color: 'red' });
              yield 40;
              G.ring(b.x, b.y, 20, rnd(0, TAU), 1.8, { color: 'pink' });
              yield 50;
            }
          },
        },
        {
          name: 'Cerejeiras em Chamas', hp: 1600, time: 55, spell: true, bonus: 500000,
          pattern: function* (b) {
            b.moveTo(PW / 2, 80); yield 40;
            let f = 0;
            const em = G.per(6);
            for (;;) {
              if (f % em === 0) {
                const ph = rnd(0, TAU);
                G.bullet(rnd(0, PW), -8, TAU / 4, rnd(1.2, 2.0), { color: 'pink', fn: (q) => { q.x += Math.sin(q.t * 0.06 + ph) * 1.1; } });
              }
              if (f % G.per(100) === 50) {
                G.ring(b.x, b.y, 28, rnd(0, TAU), 1.6, { color: 'pink', r: 4 });
                G.ring(b.x, b.y, 28, rnd(0, TAU), 2.3, { color: 'white', r: 3 });
              }
              if (f % 240 === 239) b.moveTo(rnd(120, PW - 120), rnd(70, 120));
              f++; yield 1;
            }
          },
        },
        {
          name: null, hp: 1200, time: 40, spell: false,
          pattern: function* (b) {
            b.moveTo(PW / 2, 110); yield 40;
            let f = 0;
            const em = G.per(5);
            for (;;) {
              if (f % em === 0) {
                const ang = TAU / 4 + Math.sin(f * 0.009) * 0.95;
                G.fan(b.x, b.y, 5, 0.5, ang, 3.0, { color: Math.floor(f / em) % 2 ? 'white' : 'red' });
              }
              if (f % 60 === 0) G.ring(b.x, b.y, 10, f * 0.1, 1.7, { color: 'blue', r: 3 });
              if (f % 180 === 179) b.moveTo(rnd(120, PW - 120), rnd(80, 140));
              f++; yield 1;
            }
          },
        },
        {
          name: 'Tufão do Pacífico', hp: 1900, time: 60, spell: true, bonus: 550000,
          pattern: function* (b) {
            b.moveTo(PW / 2, 120); yield 40;
            let a = 0, f = 0;
            const em = G.per(5), arms = Math.max(2, G.cnt(3));
            const frozen = (q) => { if (q.t === 80) { q.acc = 0; setVel(q, G.aim(q.x, q.y), sp(3.4)); } };
            for (;;) {
              if (f % em === 0) {
                for (let k = 0; k < arms; k++) G.bullet(b.x, b.y, a + (k * TAU) / arms, 2.0 + Math.sin(f * 0.01) * 0.5, { color: 'cyan' });
                a += 0.17;
              }
              if (f % G.per(110) === 0) {
                const n = G.cnt(14);
                for (let i = 0; i < n; i++) G.bullet(b.x, b.y, (TAU * i) / n + rnd(0, 0.2), 2.6, { r: 7, color: 'white', acc: -0.065, min: 0, fn: frozen });
              }
              f++; yield 1;
            }
          },
        },
      ],
    },
  },

  // =================== FASE 4 ===================
  {
    name: 'Berlim', year: '1945', bg: 'berlin', music: 3,
    *script() {
      yield 100;
      G.enemy({ x: 90, y: -30, hp: 70, r: 18, ...AX4 }, tank('orange'));
      G.enemy({ x: PW - 90, y: -30, hp: 70, r: 18, ...AX4 }, tank('orange'));
      yield 160;
      yield* seq(8, 18, (i) => G.enemy({ x: i % 2 ? PW + 20 : -20, y: 70 + i * 10, hp: 6, ...AX4 }, flyer(i % 2 ? 1 : -1, 80 + i * 10, 'red', 2.8)));
      yield 220;
      yield* seq(6, 14, (i) => G.enemy({ x: 40 + i * 74, y: -20, hp: 10, ...AX4 }, diver('red', 130)));
      yield 140;
      G.enemy({ x: PW / 2, y: -30, hp: 80, r: 18, ...AX4 }, tank('yellow'));
      yield 100;
      G.enemy({ x: 100, y: -30, hp: 30, ...AX4 }, sniper(100, 110, 'white'));
      G.enemy({ x: PW - 100, y: -30, hp: 30, ...AX4 }, sniper(PW - 100, 110, 'white'));
      yield 340;
      const m = G.enemy({ x: PW / 2, y: -40, hp: 700, r: 24, flag: 'bulgaria', acc: 'steel', big: true, score: 8000, drops: { P: 4, pt: 8 } }, midboss('red', 'yellow'));
      yield () => m.gone;
      yield 100;
      yield* seq(10, 12, (i) => G.enemy({ x: i % 2 ? PW + 20 : -20, y: 100 + (i % 5) * 24, hp: 6, ...AX4 }, flyer(i % 2 ? 1 : -1, 100 + (i % 5) * 24, 'yellow', 3.2)));
      yield 220;
      G.enemy({ x: 80, y: -30, hp: 40, ...AX4 }, spinner(80, 130, 'red'));
      G.enemy({ x: PW - 80, y: -30, hp: 40, ...AX4 }, spinner(PW - 80, 130, 'red'));
      G.enemy({ x: PW / 2, y: -30, hp: 40, ...AX4 }, spinner(PW / 2, 200, 'yellow'));
      yield 330;
      G.enemy({ x: 110, y: -30, hp: 80, r: 18, ...AX4 }, tank('orange'));
      G.enemy({ x: PW - 110, y: -30, hp: 80, r: 18, ...AX4 }, tank('orange'));
      yield* seq(6, 30, (i) => G.enemy({ x: 50 + i * 70, y: -20, hp: 10, ...AX4 }, diver('red', 110 + (i % 2) * 50)));
      yield 300;
      yield 80;
      G.spawnBoss();
      yield () => G.bossDone;
    },
    boss: {
      name: 'Alemanha — Fúria de Berlim', flag: 'alemanha', acc: 'steel', r: 32,
      dialog: [
        { who: 'b', text: 'Nein! Berlim não vai cair!' },
        { who: 'p', text: 'A cobra já fumou. Agora é só apagar o cigarro!' },
        { who: 'b', text: 'Então encare o meu último ataque... Crepúsculo dos Deuses!' },
      ],
      phases: [
        {
          name: null, hp: 1100, time: 40, spell: false,
          pattern: function* (b) {
            let a = 0;
            for (;;) {
              b.moveTo(rnd(120, PW - 120), rnd(70, 120));
              G.fan(b.x, b.y, 5, 0.7, G.aim(b.x, b.y), 3.4, { kind: 'rice', color: 'red' }); yield 18;
              G.ring(b.x, b.y, 26, a, 2.0, { color: 'blue' }); a += 0.1; yield 18;
              G.fan(b.x, b.y, 7, 1.2, G.aim(b.x, b.y), 3.0, { kind: 'needle', color: 'yellow', r: 3 }); yield 50;
            }
          },
        },
        {
          name: 'Inferno de Panzers', hp: 1800, time: 60, spell: true, bonus: 700000,
          pattern: function* (b) {
            b.moveTo(PW / 2, 100); yield 40;
            let f = 0, side = -1;
            for (;;) {
              if (f % G.per(100) === 0) {
                side = -side;
                const gap = Math.floor(rnd(0, 8));
                for (let i = 0; i < 10; i++) {
                  if (i === gap || i === gap + 1) continue;
                  G.bullet(side < 0 ? -10 : PW + 10, 130 + i * 46, side < 0 ? 0 : Math.PI, 3.0, { r: 9, color: 'orange' });
                }
              }
              if (f % G.per(40) === 0) G.fan(b.x, b.y, 7, 1.0, G.aim(b.x, b.y), 3.0, { kind: 'rice', color: 'red' });
              if (f % G.per(120) === 60) G.ring(b.x, b.y, 14, rnd(0, TAU), 1.8, { color: 'yellow', r: 3 });
              f++; yield 1;
            }
          },
        },
        {
          name: 'Luftwaffe em Peso', hp: 1800, time: 60, spell: true, bonus: 800000,
          pattern: function* (b) {
            b.moveTo(PW / 2, 80); yield 40;
            const ys = [140, 230, 320, 200, 280, 170];
            const plane = function* (dir, y) {
              let x = dir < 0 ? -20 : PW + 20;
              for (let i = 0; x > -30 && x < PW + 30; i++) {
                x += dir * 4.0;
                if (i % 5 === 0) G.fan(x, y, 3, 0.5, TAU / 4, 2.4, { color: 'red', exact: true });
                yield 1;
              }
            };
            let t = 0;
            for (;;) {
              G.cobegin(plane(t % 2 ? 1 : -1, ys[t % ys.length]));
              if (t % G.cnt(2) === 0) G.ring(b.x, b.y, 16, rnd(0, TAU), 1.8, { color: 'purple' });
              t++;
              yield G.per(80);
            }
          },
        },
        {
          name: null, hp: 1200, time: 40, spell: false,
          pattern: function* (b) {
            b.moveTo(PW / 2, 110);
            let a = 0, f = 0;
            const em = G.per(6), arms = G.cnt(6);
            for (;;) {
              if (f % em === 0) {
                for (let k = 0; k < arms; k++) G.bullet(b.x, b.y, a + (k * TAU) / arms, 2.0, { color: k % 2 ? 'red' : 'yellow' });
                a += 0.12;
              }
              if (f % G.per(150) === 0) G.fan(b.x, b.y, 5, 0.8, G.aim(b.x, b.y), 3.6, { kind: 'rice', color: 'white' });
              if (f % 120 === 119) b.moveTo(rnd(120, PW - 120), rnd(80, 130));
              f++; yield 1;
            }
          },
        },
        {
          name: 'Crepúsculo dos Deuses', hp: 2400, time: 85, spell: true, bonus: 1000000,
          pattern: function* (b) {
            b.moveTo(PW / 2, 110); yield 60;
            let f = 0, a = 0;
            const em = G.per(5), arms = Math.max(3, G.cnt(3));
            for (;;) {
              if (f % em === 0) {
                for (let k = 0; k < arms; k++) G.bullet(b.x, b.y, a + (k * TAU) / arms, 1.4, { color: k % 2 ? 'red' : 'yellow', acc: 0.012, max: 3.0 });
                a += 0.21 * (Math.floor(f / 300) % 2 ? -1 : 1);
              }
              if (f % G.per(150) === 0) {
                const n = G.cnt(40), base = (f / 150) * 0.1;
                for (let i = 0; i < n; i++) G.bullet(b.x, b.y, base + (TAU * i) / n, i % 2 ? 1.4 : 2.0, { color: i % 2 ? 'blue' : 'white' });
              }
              if (f % G.per(45) === 0) G.fan(b.x, b.y, 3, 0.35, G.aim(b.x, b.y), 3.8, { kind: 'rice', color: 'purple' });
              if (f % 360 === 359) b.moveTo(rnd(130, PW - 130), rnd(80, 140));
              f++; yield 1;
            }
          },
        },
      ],
    },
  },
];
