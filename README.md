# Guerra das Bolas — Bullet Hell da 2ª Guerra Mundial

Bullet hell de rolagem vertical inspirado em **Touhou**, só que com **country balls**.
Você controla o **Brasil** (a cobra vai fumar!) contra o Eixo, em 4 fases, cada uma com
mid-boss e um **boss que é uma country ball**, com cartas de guerra (spell cards) e diálogos.

Jogo em HTML5 Canvas puro: sem dependências, sem imagens e sem arquivos de áudio
(sprites, cenários, efeitos sonoros e músicas são gerados por código).

## Como jogar

Abra o `index.html` no navegador. Se preferir um servidor local:

```bash
python3 -m http.server 8000
# depois abra http://localhost:8000
```

### Controles

| Ação | Teclado |
| --- | --- |
| Mover | Setas ou WASD |
| Atirar | `Z` (segure) ou `Espaço` |
| Foco (anda devagar e mostra a hitbox) | `Shift` |
| Bomba — *Operação Dia D* | `X` |
| Pausar | `P` ou `Esc` |
| Pular diálogo | `Ctrl` (ou `Z` para avançar) |
| Mudo | `M` |

No celular: arraste o dedo na tela para mover (atira sozinho) e use os botões FOCO/BOMBA.

## Fases

| Fase | Cenário | Mid-boss | Boss | Cartas de guerra |
| --- | --- | --- | --- | --- |
| 1 | Atlântico Sul, 1942 | Hungria | **Alemanha** — Lobo do Atlântico | Matilha de Lobos, Tempestade de Aço |
| 2 | Monte Castello, Itália, 1944 | Romênia | **Itália** — Mestre da Montanha | Fortaleza do Monte, Espaguete Infinito |
| 3 | Mar das Filipinas, 1944 (licença poética) | Tailândia | **Japão** — Samurai do Pacífico | Cerejeiras em Chamas, Tufão do Pacífico |
| 4 | Berlim, 1945 | Bulgária | **Alemanha** — Fúria de Berlim | Inferno de Panzers, Luftwaffe em Peso, Crepúsculo dos Deuses |

Cada boss tem várias fases de vida (barra no topo, bolinhas = fases restantes) e um limite de tempo.
Nas cartas de guerra, capturar sem morrer nem usar bomba dá bônus de pontos (que cai com o tempo)
e uma bomba extra.

## Mecânicas

- **Poder** (itens `P`): de 0 a 4, cada nível libera um aliado (EUA, Reino Unido, França, URSS) que atira junto.
  Sem foco os aliados abrem o leque; com foco os tiros ficam concentrados.
- **Graze**: passar raspando em balas dá pontos.
- **Deathbomb**: ao ser atingido você tem uma pequena janela (~8 frames) para soltar a bomba e se salvar.
- **Auto-coleta**: suba acima do meio da tela para puxar todos os itens.
- **Vida extra** em 2M, 5M, 10M e 20M pontos; boss derrotado pode soltar `1UP`.
- **Dificuldades**: Fácil, Normal, Difícil e Lunático (mais balas e mais rápidas).
- **Continues**: 3 por partida (zeram a pontuação).
- O recorde fica salvo no `localStorage` do navegador.

## Estrutura

```
index.html        página + canvas + botões de toque
style.css         layout responsivo
js/flags.js       bandeiras e sprites das country balls (corpo, olhos, capacetes)
js/audio.js       efeitos sonoros e música chiptune procedurais (WebAudio)
js/bg.js          cenários com rolagem e parallax, um por fase
js/game.js        motor: entrada, jogador, tiros, bomba, graze, itens, bosses, HUD, cenas
js/stages.js      scripts das fases, mid-bosses, diálogos e todos os padrões de balas dos bosses
js/main.js        inicialização e parâmetros de depuração
```

### Criando uma fase nova

Adicione um objeto em `Stages` (`js/stages.js`) com `name`, `year`, `bg`, `music`, um `*script()` e um `boss`.
Os scripts usam corrotinas (`yield 30` espera 30 frames) e a API de `G`: `G.enemy`, `G.bullet`, `G.fan`, `G.ring`, `G.aim`, `G.cnt`...
Cada fase do boss é `{ name, hp, time, spell, bonus, pattern: function* (b) { ... } }`.

### Depuração

Parâmetros na URL: `?stage=3&diff=3&god=1&start=1` começa direto na fase 4, no Lunático, invencível.

## Nota histórica

Fantasia com humor de country ball, sem compromisso com precisão histórica. O Brasil de fato enviou a FEB à Itália
(Monte Castello) e teve o lema "a cobra vai fumar"; a fase do Pacífico é licença poética. A Alemanha usa a bandeira
atual (preto, vermelho e dourado), sem símbolos nazistas.
