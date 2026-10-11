'use strict';
// Inicialização: parâmetros de depuração opcionais
//   ?stage=2&diff=3&god=1  -> começa na fase 3, Lunático, invencível
(function boot() {
  const q = new URLSearchParams(location.search);
  if (q.has('diff')) G.diff = clamp(parseInt(q.get('diff'), 10) || 1, 0, DIFFS.length - 1);
  if (q.has('stage')) G.startStage = clamp(parseInt(q.get('stage'), 10) || 0, 0, Stages.length - 1);
  if (q.get('god') === '1') G.god = true;
  Sound.music(4, 'stage');
  if (q.has('stage') && q.get('start') === '1') newGame(G.startStage);
  requestAnimationFrame(loop);
})();
