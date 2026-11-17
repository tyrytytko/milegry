/**
 * „Spadające literki” — widok i sterowanie. Reguły gry: logic.ts (czyste funkcje); podpowiedzi,
 * drabina Z-19 i koniec rundy: createCoach z rdzenia. Rozmiary sceny: style.css (jednostki kontenera).
 */
import type { GameContext, GameInstance, GameModule, Hint } from '../../core/types';
import { art } from '../../core/art';
import { createCoach } from '../../core/round';
import { h } from '../../core/util/dom';
import { createState, isComplete, keyLabel, pressLetter, solveTogether, step, tapItem, target } from './logic';
import type { HitResult, Item } from './logic';
import './style.css';

/** Wygląd skórki. Mechanika jest wspólna. */
interface SkinLook {
  closed: () => string;
  open: () => string;
  /** Bąbelki płyną w górę, reszta spada. */
  rises: boolean;
  /** Ćwierk przy otwarciu (kurczaczki). */
  chirp: boolean;
  /** Bohater ekranu końca rundy. */
  hero: () => string;
  /** Statyczne dekoracje na brzegach sceny (Z-13); położenie w style.css. */
  decor: string[];
}

const SKINS: Record<string, SkinLook> = {
  kurczaczki: { closed: art.egg, open: () => art.chick({ shell: true }), hero: art.chick, rises: false, chirp: true, decor: [art.leaf({ rotate: -30 })] },
  rybki: { closed: art.bubble, open: art.fish, hero: art.fish, rises: true, chirp: false, decor: [art.leaf({ rotate: -10 }), art.leaf({ rotate: 15 })] },
  kasztany: { closed: art.chestnutBurr, open: art.chestnut, hero: art.chestnut, rises: false, chirp: false, decor: [art.tree(), art.tree()] },
};

const ITEM = 'item-';
/** Ćwierk chwilę po „pyk” pękającej skorupki (sam dźwięk, bez animacji). */
const CHIRP_DELAY_MS = 250;
/** Zapas, gdyby animacja odejścia się nie skończyła (animacje wyłączone) — kilka razy dłuższy od niej. */
const LEAVE_FALLBACK_MS = 3000;

type ItemView = { el: HTMLElement; face: HTMLElement; printHint: HTMLElement | null; keyHint: Hint | null };

const svgBox = (cls: string, svg: string) => {
  const el = h('span', { class: cls });
  el.innerHTML = svg;
  return el;
};

function mount(ctx: GameContext): GameInstance {
  const look = SKINS[ctx.skin] ?? (SKINS.kurczaczki as SkinLook);
  const touch = ctx.input.mode === 'touch';
  const cursiveMain = ctx.settings.letterScript === 'cursive';
  const coach = createCoach(ctx);

  // --- Scena: tło, dekoracje na brzegach, tor; w dotyku u góry jeżyk z kartą-wzorem ---
  const width = ctx.root.clientWidth;
  const state = createState(ctx.level, width < 520 ? 3 : width < 900 ? 4 : 5, ctx.reducedMotion);
  const track = h('div', { class: 'g-literki-track' });
  track.style.setProperty('--lanes', String(state.lanes));
  const card = h('div', { class: 'g-literki-card' });
  ctx.root.append(
    h('div', { class: `g-literki-scene${look.rises ? ' g-literki-scene--rises' : ''}${touch ? ' g-literki-scene--card' : ''}` }, [
      // Ziemia przed dekoracjami: dekoracje stoją na niej, a nie są przez nią zasłonięte.
      h('div', { class: 'g-literki-ground', 'aria-hidden': 'true' }),
      h('div', { class: 'g-literki-decor', 'aria-hidden': 'true' }, look.decor.map((svg) => svgBox('g-literki-deco', svg))),
      touch && h('div', { class: 'g-literki-model' }, [svgBox('g-literki-hog', art.hedgehog()), card]),
      track,
    ]),
  );

  // --- Widok przedmiotów ---
  const views = new Map<number, ItemView>();

  const removeAfterAnimation = (el: HTMLElement) => {
    el.addEventListener('animationend', (event) => event.target === el && el.remove());
    ctx.clock.after(LEAVE_FALLBACK_MS, () => el.remove());
  };

  const createView = (item: Item) => {
    const face = h('div', { class: 'g-literki-face' }, [ctx.ui.letter(item.letter)]);
    const el = h('div', { class: 'g-literki-item', 'data-target': ITEM + item.id }, [svgBox('g-literki-sprite', look.closed()), face]);
    el.style.setProperty('--lane', String(item.lane));
    views.set(item.id, { el, face, printHint: null, keyHint: null });
    track.append(el);
  };

  const openView = (item: Item) => {
    const view = views.get(item.id);
    if (!view) return;
    view.el.classList.add('g-literki-item--open');
    view.el.querySelector('.g-literki-sprite')!.innerHTML = look.open();
    // Forma towarzysząca (np. pisana w trybie „both”) — chwilę widać obie formy naraz.
    const companion = ctx.ui.letter(item.letter, { role: 'companion' });
    const old = view.face.firstElementChild as HTMLElement | null;
    if (companion && old) {
      old.classList.add('g-literki-letter-out');
      removeAfterAnimation(old);
      companion.classList.add('g-literki-letter-in');
      view.face.append(companion);
    }
    view.printHint?.remove();
    view.keyHint?.hide();
  };

  const leaveView = (item: Item) => {
    const view = views.get(item.id);
    if (!view) return;
    views.delete(item.id);
    view.el.classList.add('g-literki-item--leaving');
    view.el.removeAttribute('data-target');
    removeAfterAnimation(view.el);
  };

  /**
   * Klawiatura: stuknięcie przedmiotu niczego nie zalicza (zadaniem jest znaleźć klawisz, Z-21),
   * tylko pokazuje nad nim klawisz z jego literą — do otwarcia przedmiotu.
   */
  const showKeyHint = (item: Item | undefined) => {
    const view = item && item.stage === 'closed' ? views.get(item.id) : undefined;
    if (!item || !view || view.keyHint) return;
    view.keyHint = ctx.ui.hint({ target: view.el, kind: 'key', key: keyLabel(item.letter) });
  };

  /** Tryb „pisane”: mała drukowana litera obok przedmiotu (1. szczebel drabiny). */
  const showPrintHint = (item: Item) => {
    const view = views.get(item.id);
    if (!view || view.printHint) return;
    view.printHint = h('span', { class: 'g-literki-printhint', 'aria-hidden': 'true' }, [ctx.ui.letter(item.letter, { script: 'print' })]);
    view.el.append(view.printHint);
  };

  // --- Karta-wzór (dotyk): ta sama litera co zadanie, w kroju „towarzyszącym” (w „both” pisana) ---
  let cardFor = -1;
  const updateCard = (goal: Item | null) => {
    if (!touch || (goal?.id ?? -1) === cardFor) return;
    cardFor = goal?.id ?? -1;
    const letter = goal && (ctx.ui.letter(goal.letter, { role: 'companion' }) ?? ctx.ui.letter(goal.letter));
    card.replaceChildren(...(letter ? [letter] : []));
  };

  // --- Akcje dziecka ---
  const react = (result: HitResult, tapped?: HTMLElement) => {
    if (result.kind === 'none') return;
    if (result.kind === 'miss') {
      const goal = target(state);
      const outcome = coach.miss(tapped);
      if (outcome === 'glow' && cursiveMain && goal) showPrintHint(goal);
      if (outcome === 'together') react(solveTogether(state)); // gra sama otwiera zadanie
      return;
    }
    if (result.kind === 'open') {
      coach.success(); // zebranie innego, już otwartego zwierzątka nie rozwiązuje bieżącego zadania
      openView(result.item);
      ctx.audio.play('pop');
      if (look.chirp) ctx.clock.after(CHIRP_DELAY_MS, () => ctx.audio.play('chirp'));
    } else {
      ctx.audio.play('good');
      leaveView(result.item);
    }
    if (isComplete(state)) coach.finish({ icon: look.hero() });
  };

  ctx.input.on((intent) => {
    if (coach.done || coach.locked) return;
    if (intent.type === 'letter') {
      react(pressLetter(state, intent.value));
    } else if (intent.type === 'pointer' && intent.target.startsWith(ITEM)) {
      const id = Number(intent.target.slice(ITEM.length));
      if (touch) react(tapItem(state, id), views.get(id)?.el);
      else showKeyHint(state.items.find((i) => i.id === id));
    }
  });

  // --- Pętla gry ---
  const loop = (dt: number) => {
    if (coach.done) return;
    const events = step(state, dt, ctx.rng);
    events.spawned.forEach(createView);
    events.landed.forEach(() => ctx.audio.play('step'));
    events.left.forEach(leaveView);
    for (const item of state.items) {
      views.get(item.id)?.el.style.setProperty('--p', (look.rises ? 1 - item.y : item.y).toFixed(4));
    }
    const goal = target(state);
    const el = goal && views.get(goal.id)?.el;
    updateCard(goal);
    coach.setTask(goal && el ? { key: goal.id, target: el, hintKey: keyLabel(goal.letter), question: touch ? card : el } : null);
    if (events.left.length > 0 && isComplete(state)) coach.finish({ icon: look.hero() });
  };

  let stopLoop = () => {};
  void ctx.ui.lettersReady().then(() => {
    if (!coach.done) stopLoop = ctx.clock.frame(loop);
  });

  return {
    destroy() {
      stopLoop();
      coach.destroy();
    },
  };
}

const game: GameModule = { mount };
export default game;
