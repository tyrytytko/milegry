/**
 * „Kształtowe okienka” — widok. Reguły i zadania są w logic.ts, grafika kształtów w shapes.ts.
 * Domek wiewiórki ma okienka; obok czeka okiennica (obiekt pytania). Dziecko wskazuje okienko, do którego
 * okiennica pasuje. Rundą (kolejka, drabina podpowiedzi, koniec rundy) zajmuje się runRound z rdzenia.
 */
import { art } from '../../core/art';
import { runRound, type RoundSpec } from '../../core/round';
import type { GameModule } from '../../core/types';
import { h } from '../../core/util/dom';
import { createTasks, levelParams, type Shape, type Task } from './logic';
import { shapeSvg } from './shapes';
import './style.css';

/** Nazwy dla czytników ekranu (nie są widoczne — Z-10: nic do czytania). */
const NAMES: Record<Shape, string> = {
  circle: 'koło',
  oval: 'owal',
  square: 'kwadrat',
  diamond: 'romb',
  rect: 'prostokąt leżący',
  'rect-tall': 'prostokąt stojący',
  triangle: 'trójkąt',
  'triangle-down': 'trójkąt do góry nogami',
  star: 'gwiazdka',
  heart: 'serce',
};

/** Wkłada kształt do elementu (SVG to tekst z shapes.ts, nie dane z zewnątrz). */
const withShape = <E extends HTMLElement>(el: E, shape: Shape): E => {
  el.innerHTML = shapeSvg(shape);
  return el;
};

const spec: RoundSpec<Task, { wall: HTMLElement; shutter: HTMLElement }> = {
  tasks: (ctx) => createTasks(ctx.level, ctx.rng),

  // Domek, wiewiórka i kafelek okiennicy stoją przez całą rundę (Z-02).
  scene(ctx) {
    const wall = h('div', { class: 'g-okienka-wall' });
    const shutter = h('div', { class: 'g-okienka-shutter' });
    const squirrel = h('div', { class: 'g-okienka-squirrel' });
    squirrel.innerHTML = art.squirrel();
    const house = h('div', { class: 'g-okienka-house' }, [h('div', { class: 'g-okienka-roof' }), wall]);
    const yard = h('div', { class: 'g-okienka-yard' }, [squirrel, shutter]);
    ctx.root.append(h('div', { class: 'g-okienka-scene', 'data-count': levelParams(ctx.level).windows }, [house, yard]));
    return { wall, shutter };
  },

  // Zadanie wymienia tylko okienka i kształt okiennicy (nowe kształty wchodzą przenikaniem — style.css).
  show(_ctx, task, { wall, shutter }) {
    const windows = task.windows.map((shape) =>
      withShape(h('button', { class: 'g-okienka-window', type: 'button', 'aria-label': NAMES[shape] }), shape),
    );
    wall.replaceChildren(...windows);
    withShape(shutter, task.shutter).classList.remove('g-okienka-used');
    return {
      choose: windows,
      correct: task.answer,
      question: shutter, // 1. błąd: okiennica „oddycha” poświatą — patrz, jaki ma kształt
      solved: () => {
        windows[task.answer]?.classList.add('g-okienka-closed'); // okiennica zamyka pasujące okienko (Z-20)
        shutter.classList.add('g-okienka-used');
      },
    };
  },

  hero: () => art.squirrel(),
};

export default { mount: (ctx) => runRound(ctx, spec) } satisfies GameModule;
