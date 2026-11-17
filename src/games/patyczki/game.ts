/**
 * „Patyczki jeżyka” — widok. Reguły i zadania są w logic.ts. Dodawanie: dwie kupki patyczków i znak „+”;
 * odejmowanie: jedna kupka, w której ostatnie patyczki są „zabrane” (przekreślone i blade). Dziecko liczy i wpisuje
 * cyfrę (wariant `digits` w runRound): pole odpowiedzi, klawisze cyfr i klawiaturę ekranową dokłada rdzeń.
 */
import { art } from '../../core/art';
import { runRound, type RoundSpec } from '../../core/round';
import type { GameModule } from '../../core/types';
import { h } from '../../core/util/dom';
import { sticksIcon } from './icon';
import {
  BUNDLE_GAP,
  FIELD_PADDING,
  PILE_PADDING,
  SIGN_SLOTS,
  answerDigits,
  bundles,
  createTasks,
  levelParams,
  levelSlots,
  symbolText,
  type Task,
} from './logic';
import './style.css';

interface Places {
  /** Obiekt pytania: podłoże z kupkami + wiersz z jeżykiem i zapisem; rdzeń dokłada na końcu pole odpowiedzi. */
  plot: HTMLElement;
  /** Podłoże: tu wchodzą kupki zadania. */
  field: HTMLElement;
  /** Zapis działania („2 + 3 =”) — pusty na poziomach bez symbolu. */
  symbol: HTMLElement;
}

/** Kupka patyczków w piątkach; ostatnie `taken` patyczków jest „zabranych” (obrys, blado, przekreślenie — nie sam kolor, Z-15). */
const pile = (count: number, taken = 0, name = ''): HTMLElement => {
  let index = 0;
  const groups = bundles(count).map((size) =>
    h('span', { class: 'g-patyczki-bundle' }, Array.from({ length: size }, () =>
      h('span', { class: `g-patyczki-stick${index++ >= count - taken ? ' g-patyczki-ghost' : ''}` }))),
  );
  return h('span', { class: `g-patyczki-pile ${name}` }, groups);
};

const spec: RoundSpec<Task, Places> = {
  tasks: (ctx) => createTasks(ctx.level, ctx.rng),

  // Stała scena (Z-02): podłoże, jeżyk i miejsce na zapis stoją przez całą rundę; wymienia się tylko treść.
  scene(ctx) {
    const field = h('div', { class: 'g-patyczki-field', role: 'img', 'aria-label': 'Patyczki jeżyka' });
    const hedgehog = h('span', { class: 'g-patyczki-hedgehog' });
    hedgehog.innerHTML = art.hedgehog();
    const symbol = h('span', { class: 'g-patyczki-symbol' });
    const plot = h('div', { class: 'g-patyczki-plot' }, [field, h('div', { class: 'g-patyczki-eq' }, [hedgehog, symbol])]);
    const classes = ['g-patyczki-scene', ctx.input.mode === 'touch' && 'g-patyczki-touch', answerDigits(ctx.level) > 1 && 'g-patyczki-two'];
    // Liczby układu (w szczebelkach) idą do CSS z logic.ts — jedno źródło; mata ma stałą szerokość `slots` na cały poziom.
    const layout = {
      slots: levelSlots(ctx.level),
      'bundle-gap': BUNDLE_GAP,
      'pile-pad': PILE_PADDING,
      sign: SIGN_SLOTS,
      'field-pad': FIELD_PADDING,
    };
    const style = Object.entries(layout).map(([name, value]) => `--g-patyczki-${name}:${value}`).join(';');
    const scene = h('div', { class: classes.filter(Boolean).join(' '), style }, [plot]);
    ctx.root.append(scene);
    return { plot, field, symbol };
  },

  show(ctx, task, { plot, field, symbol }) {
    const first = pile(task.a, task.op === 'sub' ? task.b : 0, 'g-patyczki-first');
    const second = task.op === 'add' ? pile(task.b, 0, 'g-patyczki-second') : null;
    field.classList.remove('g-patyczki-solved');
    field.replaceChildren(...(second ? [first, h('span', { class: 'g-patyczki-sign' }), second] : [first]));
    symbol.textContent = levelParams(ctx.level).symbol ? symbolText(task) : '';
    return {
      digits: task.answer,
      keys: levelParams(ctx.level).keys, // klawiatura ekranowa tylko z cyframi tego poziomu
      question: plot, // 1. błąd: scena „oddycha” poświatą; pole odpowiedzi trafia na koniec `plot`
      solved: () => {
        // Dodawanie: druga kupka dosuwa się do pierwszej (jeden ruchomy obiekt, Z-01), znak gaśnie. Odejmowanie:
        // zabrane patyczki znikają (przenikanie). W obu przypadkach kupki zmieniają tło na „dobrze”.
        // Długość dosunięcia liczy CSS (szerokość znaku w szczebelkach), bez pomiarów w kodzie.
        field.classList.add('g-patyczki-solved');
      },
    };
  },

  hero: sticksIcon, // jeżyka na ekranie końca stawia rdzeń; bohater obok to patyczki (Z-16)
};

export default { mount: (ctx) => runRound(ctx, spec) } satisfies GameModule;
