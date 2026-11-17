/**
 * „Labirynty z jeżykiem” — widok i sterowanie. Generator i reguły ruchu: logic.ts (czyste funkcje);
 * podpowiedź przy bezczynności, wpisywanie kodu bramy i koniec rundy: createCoach / createCodeEntry z rdzenia.
 *
 * Zadaniem trenera podczas chodzenia jest „bieżące pole → następny krok najkrótszej drogi” (nowe pole =
 * nowe zadanie), więc po chwili bezczynności podpowiedź wskazuje właściwą strzałkę. Chodzenie nie ma złych
 * odpowiedzi: ruch w ścianę to nie błąd (bez coach.miss), jeżyk tylko lekko się o nią opiera.
 */
import type { Direction, GameContext, GameInstance, GameModule } from '../../core/types';
import { art } from '../../core/art';
import { createCodeEntry, createCoach } from '../../core/round';
import type { CodeEntry } from '../../core/round';
import { h } from '../../core/util/dom';
import { adjacent, createMaze, createState, dirToward, nextStep, openGate, tryMove, wallPath } from './logic';
import type { Gate, Maze } from './logic';
import { gate as gateArt, house } from './sprites';
import './style.css';

/** Najkrótszy odstęp między krokami (ms czasu gry): jeden krok na naciśnięcie, bez „przelatywania” labiryntu. */
const STEP_MS = 180;
/** Tyle widać wpisany kod, zanim brama się otworzy (razem z otwarciem ≤ 800 ms, Z-20). */
const CODE_SHOWN_MS = 350;
const ARROW: Record<Direction, string> = { up: '↑', right: '→', down: '↓', left: '←' };
const STEP_X: Record<Direction, number> = { up: 0, right: 1, down: 0, left: -1 };
const STEP_Y: Record<Direction, number> = { up: -1, right: 0, down: 1, left: 0 };

function mount(ctx: GameContext): GameInstance {
  const coach = createCoach(ctx);
  let maze: Maze;
  try {
    maze = createMaze(ctx.level, ctx.rng);
  } catch (error) {
    ctx.fail(error);
    return { destroy: () => coach.destroy() };
  }
  const state = createState(maze);
  const touch = ctx.input.mode === 'touch';

  // --- Scena (stała, Z-02): plansza ze ścianami, domek, bramy; rusza się tylko jeżyk (Z-01) ---
  /** Element wielkości pola, ustawiony na polu `cell` (style.css liczy położenie z --x / --y). */
  const place = (el: HTMLElement, cell: number) => {
    el.style.setProperty('--x', String(cell % maze.cols));
    el.style.setProperty('--y', String(Math.floor(cell / maze.cols)));
    return el;
  };
  const tile = (cls: string, cell: number, svg = '') => {
    const el = h('span', { class: `g-labirynt-tile ${cls}`, 'aria-hidden': 'true' });
    el.innerHTML = svg;
    return place(el, cell);
  };

  const walls = h('span', { class: 'g-labirynt-walls', 'aria-hidden': 'true' });
  walls.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${maze.cols} ${maze.rows}"><path d="${wallPath(maze)}"/></svg>`;
  const home = tile('g-labirynt-home', maze.goal, house());
  const gateEls = new Map(maze.gates.map((gate) => [gate.cell, tile('g-labirynt-gate', gate.cell, gateArt())]));
  /** Kotwica podpowiedzi na klawiaturze: pole, na które prowadzi następny krok. */
  const next = tile('g-labirynt-next', maze.start);
  const hogBody = h('span', { class: 'g-labirynt-hog-body' });
  hogBody.innerHTML = art.hedgehog();
  const hog = place(h('span', { class: 'g-labirynt-tile g-labirynt-hog', role: 'img', 'aria-label': 'Jeżyk' }, [hogBody]), maze.start);
  const board = h('div', { class: 'g-labirynt-board', 'data-target': 'board' }, [walls, home, ...gateEls.values(), next, hog]);
  /** Zbliżenie na bramę: tabliczka z kodem i pole do wpisania (pokazywane tylko przy bramie). */
  const panel = h('div', { class: 'g-labirynt-panel', hidden: true });
  const scene = h('div', { class: 'g-labirynt-scene' }, [board, panel]);
  scene.style.setProperty('--cols', String(maze.cols));
  scene.style.setProperty('--rows', String(maze.rows));
  ctx.root.append(scene);

  const dpad = touch ? ctx.ui.dPad() : null;
  const arrowButton = (dir: Direction) => dpad?.el.querySelector<HTMLElement>(`.mg-dpad__${dir}`) ?? null;

  let busy = false;
  let entry: CodeEntry | null = null;

  /** Zadanie trenera: z bieżącego pola zrób następny krok. Dotyk: paluszek przy strzałce; klawiatura: klawisz na polu. */
  const updateTask = () => {
    const dir = nextStep(state);
    if (!dir || coach.done) return coach.setTask(null);
    place(next, adjacent(maze, state.pos, dir));
    coach.setTask({ key: `pole-${state.pos}-${state.opened.length}`, target: arrowButton(dir) ?? next, hintKey: ARROW[dir] });
  };

  const rest = () => {
    busy = true;
    ctx.clock.after(STEP_MS, () => (busy = false));
  };

  const walkTo = (cell: number) => {
    place(hog, cell);
    ctx.audio.play('step');
    rest();
    updateTask();
  };

  /** Ściana: jeżyk lekko się o nią opiera i wraca — bez dźwięku, bez drabiny błędów. */
  const lean = (dir: Direction) => {
    hogBody.style.setProperty('--lx', String(STEP_X[dir]));
    hogBody.style.setProperty('--ly', String(STEP_Y[dir]));
    hogBody.classList.remove('g-labirynt-lean');
    void hogBody.offsetWidth; // ponowne uruchomienie tej samej animacji
    hogBody.classList.add('g-labirynt-lean');
    rest();
  };

  const closePanel = (gate: Gate) => {
    entry?.destroy();
    entry = null;
    panel.hidden = true;
    panel.replaceChildren();
    dpad?.show();
    gateEls.get(gate.cell)?.classList.add('g-labirynt-gate--open');
    openGate(state, gate);
    ctx.audio.play('pop');
    walkTo(gate.cell);
  };

  /** Jeżyk stanął przed bramą: strzałki ustępują miejsca cyfrom, kod jest na tabliczce (Z-38). */
  const openPanel = (gate: Gate) => {
    dpad?.hide();
    const sign = h('div', { class: 'g-labirynt-sign', role: 'img', 'aria-label': `Kod bramy: ${[...gate.code].join(' ')}` });
    sign.append(...Array.from(gate.code, (digit) => h('span', { class: 'g-labirynt-digit' }, digit)));
    const picture = h('span', { class: 'g-labirynt-lock', 'aria-hidden': 'true' });
    picture.innerHTML = gateArt();
    entry = createCodeEntry(ctx, coach, {
      key: `brama-${gate.cell}`,
      code: gate.code,
      question: sign,
      onAnswer(outcome) {
        if (outcome !== 'right' && outcome !== 'together') return;
        entry?.stop();
        if (outcome === 'right') ctx.audio.play('good');
        ctx.clock.after(CODE_SHOWN_MS, () => closePanel(gate));
      },
    });
    panel.replaceChildren(picture, sign, entry.field);
    panel.hidden = false;
  };

  const move = (dir: Direction) => {
    if (busy || entry || coach.done) return;
    if (STEP_X[dir] !== 0) hog.classList.toggle('g-labirynt-hog--left', dir === 'left');
    const result = tryMove(state, dir);
    if (result.kind === 'wall') return lean(dir);
    if (result.kind === 'gate') return openPanel(result.gate);
    walkTo(state.pos);
    if (result.kind === 'goal') {
      home.classList.add('g-labirynt-home--reached');
      coach.finish({ icon: house() });
    }
  };

  ctx.input.on((intent) => {
    if (intent.type === 'move') return move(intent.dir);
    if (intent.type !== 'pointer' || intent.target !== 'board') return;
    // Stuknięcie planszy: krok w stronę stukniętego miejsca (sąsiednie pole albo dalej w tym kierunku).
    const rootBox = ctx.root.getBoundingClientRect();
    const box = hog.getBoundingClientRect();
    const dir = dirToward(intent.x - (box.left + box.width / 2 - rootBox.left), intent.y - (box.top + box.height / 2 - rootBox.top), box.width / 2);
    if (dir) move(dir);
  });

  updateTask();

  return {
    destroy() {
      entry?.destroy();
      coach.destroy();
    },
  };
}

const game: GameModule = { mount };
export default game;
