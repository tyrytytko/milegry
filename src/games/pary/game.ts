/**
 * „Pary pod liśćmi” — widok i sterowanie. Na polanie leżą liście, pod każdym obrazek (litera, cyfra,
 * żołędzie). Dziecko odkrywa dwa: para zostaje odkryta, nietrafione liście po chwili spokojnie wracają.
 * Reguły planszy i układ: logic.ts; grafika kart: faces.ts.
 *
 * Trener (createCoach) — mapowanie memory na drabinę Z-19:
 * - zwykłe nietrafienie (odkrycie nowej karty) to normalny przebieg gry: bez coach.miss, bez kołysania;
 * - coach.miss tylko przy „pomyłce pamięci” (logic.ts → slip: dziecko widziało już obie karty, które
 *   powinno było połączyć). Drabina: 1. poświata pierwszej karty, 2. paluszek przy liściu z jej parą,
 *   3. „zróbmy razem” — gra sama odkrywa parę. Każda znaleziona para zeruje drabinę (coach.success);
 * - bezczynność: paluszek przy liściu wartym odkrycia (logic.ts → suggest);
 * - koniec rundy: coach.finish po ostatniej planszy.
 */
import { art } from '../../core/art';
import { createCoach } from '../../core/round';
import type { FocusGrid, GameContext, GameInstance, GameModule } from '../../core/types';
import { h } from '../../core/util/dom';
import { coverSvg, faceEl, faceName } from './faces';
import { CARD_MIN, bestLayout, closeOpen, createBoards, createState, fitPairs, flip, isCleared, levelParams, matchedCount, solveTogether, suggest } from './logic';
import './style.css';

const C = 'g-pary';
const TARGET = 'lisc-';
/** Nietrafiona para leży odkryta tyle ms czasu gry (tempo „żwawe” 1,35×: ≈ 1,56 s; spokojne: 3 s). */
const CLOSE_MS = 2100;
/** Chwila po ostatniej parze planszy, zanim przyjdą nowe liście (ms czasu gry). */
const NEXT_BOARD_MS = 1200;
/** Margines sceny wokół planszy i pas przy dolnej krawędzi — te same wartości co w style.css (--mg-space-s, --mg-edge-safe). */
const PAD = 8;
const EDGE = 40;

function mount(ctx: GameContext): GameInstance {
  const params = levelParams(ctx.level);
  const coach = createCoach(ctx);
  const grid = h('div', { class: `${C}-grid` });
  ctx.root.append(h('div', { class: `${C}-scene` }, [grid]));

  /** Miejsce na karty w px. */
  const space = () => ({ w: ctx.root.clientWidth - 2 * PAD, h: ctx.root.clientHeight - PAD - EDGE });
  const start = space();
  // Na małym ekranie mniej par, żeby karty miały ≥ 80 px z odstępem 16 px (Z-33). Liczbę par ustalamy raz na rundę.
  const boards = createBoards(ctx.level, fitPairs(params.pairs, start.w, start.h), ctx.rng);

  let boardNo = 0;
  let state = createState([]);
  let cards: HTMLElement[] = [];
  let focus: FocusGrid | null = null;
  /** Wejście wstrzymane: dwie nietrafione karty leżą odkryte albo zmienia się plansza. */
  let busy = true;
  let destroyed = false;
  let cancelTimer = () => {};

  // --- Układ: siatka z największymi kartami, które się mieszczą (także po obróceniu ekranu) ---
  const layout = () => {
    const { w, h: hgt } = space();
    // Po obróceniu ekranu w trakcie rundy karty mogą się nie zmieścić w 80 px — wtedy mniejsze, ale cała plansza widoczna.
    const fit = bestLayout(cards.length, w, hgt) ?? bestLayout(cards.length, w, hgt, 1) ?? { cols: 1, size: CARD_MIN };
    grid.style.setProperty('--g-pary-cols', String(fit.cols));
    grid.style.setProperty('--g-pary-card', `${fit.size}px`);
  };
  const resize = new ResizeObserver(layout);
  resize.observe(ctx.root);

  // --- Widok kart ---
  const setOpen = (i: number, open: boolean) => {
    const card = state.cards[i];
    const el = cards[i];
    if (!card || !el) return;
    el.classList.toggle(`${C}-open`, open);
    el.setAttribute('aria-label', open ? faceName(card.face) : `liść ${i + 1}`);
  };

  const hold = (on: boolean) => {
    busy = on;
    focus?.setEnabled(!on);
  };

  /** Mówi trenerowi, który liść warto odkryć. Ten sam klucz aż do następnej pary — drabina rośnie przez kolejne ruchy. */
  const tell = () => {
    const target = cards[suggest(state)];
    if (busy || coach.done || !target) return;
    const open = state.open[0];
    coach.setTask({ key: `${boardNo}-${matchedCount(state)}`, target, question: open === undefined ? undefined : cards[open] });
  };

  /** Para znaleziona (albo pokazana „razem”): zostaje odkryta; po ostatniej — następna plansza albo koniec rundy. */
  const settle = (pair: number[]) => {
    pair.forEach((k) => {
      setOpen(k, true);
      cards[k]?.classList.add(`${C}-matched`);
    });
    if (!isCleared(state)) return tell();
    hold(true);
    if (++boardNo >= boards.length) return coach.finish({ icon: art.chick() });
    cancelTimer = ctx.clock.after(NEXT_BOARD_MS, deal);
  };

  const choose = (i: number) => {
    if (busy || coach.done || coach.locked) return;
    const result = flip(state, i);
    if (result.kind === 'ignored') return; // dopasowana albo już odkryta karta — nic się nie dzieje
    setOpen(i, true);
    if (result.kind === 'first') {
      ctx.audio.play('pop');
      return tell();
    }
    if (result.kind === 'match') {
      coach.success();
      ctx.audio.play('good');
      return settle([result.a, result.b]);
    }
    // Nietrafiona para: wejście czeka, aż liście wrócą (Z-21) — szybkie stukanie nie odkrywa więcej kart.
    ctx.audio.play('pop');
    hold(true);
    // Po „zróbmy razem” w state.open zostaje tylko karta b — timer poniżej zakryje właśnie ją.
    if (result.slip && coach.miss(cards[result.b]) === 'together') settle([result.a, solveTogether(state)]);
    cancelTimer = ctx.clock.after(CLOSE_MS, () => {
      closeOpen(state).forEach((k) => setOpen(k, false));
      hold(false);
      tell();
    });
  };

  /** Nowa plansza: nowe liście w tych samych miejscach sceny (Z-02 — tło stoi). */
  const deal = () => {
    state = createState(boards[boardNo] ?? []);
    cards = state.cards.map((card, i) => {
      const leaf = h('span', { class: `${C}-leaf`, 'aria-hidden': 'true' });
      leaf.innerHTML = coverSvg(i); // SVG z core/art
      return h('div', { class: `${C}-card`, role: 'button', 'aria-label': `liść ${i + 1}`, 'data-target': `${TARGET}${i}` }, [
        faceEl(ctx, card.face),
        leaf,
      ]);
    });
    grid.replaceChildren(...cards);
    layout();
    const middle = Math.floor((cards.length - 1) / 2); // Z-32: ramka startuje na środku
    if (focus) focus.setItems(cards, middle);
    else focus = ctx.ui.focusGrid({ items: cards, initial: middle, pointer: false, onSelect: (i) => choose(i) });
    hold(false);
    tell();
  };

  // Stuknięcie liścia przez ctx.input (data-target), nie przez focusGrid: liczy się tylko pierwszy palec,
  // a trener widzi stuknięcie jako działanie dziecka (licznik bezczynności od zera).
  ctx.input.on((intent) => {
    if (intent.type !== 'pointer' || !intent.target.startsWith(TARGET)) return;
    const i = Number(intent.target.slice(TARGET.length));
    if (!busy) focus?.focus(i);
    choose(i);
  });

  void ctx.ui.lettersReady().then(() => {
    if (!destroyed) deal();
  });

  return {
    destroy() {
      destroyed = true;
      cancelTimer();
      resize.disconnect();
      coach.destroy();
    },
  };
}

const game: GameModule = { mount };
export default game;
