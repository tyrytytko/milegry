/**
 * „Liczymy orzeszki” — widok. Reguły i zadania są w logic.ts. Na polanie leżą orzeszki (czasem też liście,
 * których nie liczymy); dziecko wpisuje cyfrę „ile jest?”. Pierwsza gra z odpowiedzią cyframi (DigitsView):
 * pole odpowiedzi, klawisze cyfr i klawiaturę ekranową dokłada rdzeń (runRound).
 */
import { art } from '../../core/art';
import { runRound, type RoundSpec } from '../../core/round';
import type { GameModule } from '../../core/types';
import { h } from '../../core/util/dom';
import { CELL_X, countStepMs, createTasks, levelParams, type Item, type Task } from './logic';
import './style.css';

interface Places {
  /** Obiekt pytania: polana + wiewiórka; rdzeń dokłada na końcu pole odpowiedzi i podpowiedzi. */
  plot: HTMLElement;
  /** Polana: tu wchodzą orzeszki zadania. */
  clearing: HTMLElement;
}

/** Jeden element polany: orzeszek albo liść, ustawiony procentami polany (zob. logic.ts). */
const itemEl = (item: Item, index: number): HTMLElement => {
  const el = h('span', {
    class: `g-orzeszki-item g-orzeszki-${item.kind}`,
    style: `left:${item.x}%;top:${item.y}%;width:${item.size * CELL_X}%;transform:translate(-50%,-50%) rotate(${item.tilt}deg)`,
  });
  el.innerHTML = item.kind === 'nut' ? art.acorn() : art.leaf({ tone: index % 2 ? 'ochre' : 'sage' });
  return el;
};

const spec: RoundSpec<Task, Places> = {
  tasks: (ctx) => createTasks(ctx.level, ctx.rng),

  // Stała scena (Z-02): polana i wiewiórka stoją przez całą rundę.
  scene(ctx) {
    const clearing = h('div', { class: 'g-orzeszki-clearing', role: 'img', 'aria-label': 'Polana z orzeszkami' });
    const squirrel = h('div', { class: 'g-orzeszki-squirrel' });
    squirrel.innerHTML = art.squirrel();
    const plot = h('div', { class: 'g-orzeszki-plot' }, [clearing, squirrel]);
    const touch = ctx.input.mode === 'touch' ? ' g-orzeszki-touch' : '';
    ctx.root.append(h('div', { class: `g-orzeszki-scene${touch}` }, [plot]));
    return { plot, clearing };
  },

  show(ctx, task, { plot, clearing }) {
    const items = task.items.map(itemEl);
    clearing.replaceChildren(...items);
    return {
      digits: task.count,
      keys: levelParams(ctx.level).keys, // klawiatura ekranowa tylko z cyframi tego poziomu
      question: plot, // 1. błąd: polana „oddycha” poświatą; pole odpowiedzi trafia na koniec `plot`
      solved: () => {
        // Orzeszki zapalają się po kolei od lewej — to samo „liczenie” widać na polanie. Krok maleje z liczbą
        // orzeszków, żeby całość zmieściła się w 800 ms (Z-20, logic.ts → countStepMs).
        const nuts = items.filter((_, i) => task.items[i]?.kind === 'nut');
        const step = countStepMs(nuts.length);
        nuts.sort((a, b) => a.offsetLeft - b.offsetLeft).forEach((el, i) => {
          el.style.setProperty('--g-orzeszki-delay', `${i * step}ms`);
          el.classList.add('g-orzeszki-counted');
        });
      },
    };
  },

  hero: () => art.squirrel(),
};

export default { mount: (ctx) => runRound(ctx, spec) } satisfies GameModule;
