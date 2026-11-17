/**
 * „Taki sam kształt” — widok. Reguły i zadania są w logic.ts, grafika kształtów w shapes.ts.
 * Rundą (kolejka zadań, drabina podpowiedzi po błędach, koniec rundy) zajmuje się runRound z rdzenia.
 */
import { art } from '../../core/art';
import { runRound, type RoundSpec } from '../../core/round';
import type { GameModule } from '../../core/types';
import { h } from '../../core/util/dom';
import { createTasks, levelParams, type Shape, type Task } from './logic';
import { SHAPE_NAMES, shapeSvg } from './shapes';
import './style.css'; // CSS gry ładuje tylko game.ts

/** Wkłada kształt do elementu (SVG to tekst z shapes.ts, nie dane z zewnątrz). */
const withShape = <E extends HTMLElement>(el: E, shape: Shape): E => {
  el.innerHTML = shapeSvg(shape);
  return el;
};

/** Miejsca stałej sceny, w które każde zadanie wstawia swoją treść. */
interface Places {
  question: HTMLElement;
  choices: HTMLElement;
}

const spec: RoundSpec<Task, Places> = {
  // Zadania całej rundy (5–10, Z-23). Rdzeń pokazuje je po jednym; zadanie rozwiązane „razem” wraca raz na koniec.
  tasks: (ctx) => createTasks(ctx.level, ctx.rng),

  // Stała scena (Z-02), budowana RAZ: tło, kafelek wzoru i miejsce na karty. Zwraca miejsca na treść zadania.
  scene(ctx) {
    const question = h('div', { class: 'g-wzor-question' });
    const choices = h('div', { class: 'g-wzor-choices', 'data-count': levelParams(ctx.level).options });
    ctx.root.append(h('div', { class: 'g-wzor-scene' }, [question, choices]));
    return { question, choices };
  },

  // Treść JEDNEGO zadania: nowy kształt we wzorze i nowe karty (wchodzą przenikaniem — style.css); tło stoi.
  show(_ctx, task, { question, choices }) {
    withShape(question, task.target);
    const cards = task.options.map((shape) =>
      withShape(h('button', { class: 'g-wzor-card', type: 'button', 'aria-label': SHAPE_NAMES[shape] }), shape),
    );
    choices.replaceChildren(...cards);
    return {
      choose: cards, // elementy do wyboru: rdzeń daje ramkę na strzałki + Spację oraz stuknięcie (Z-32)
      correct: task.answer, // indeks poprawnej karty w `choose`
      question, // obiekt pytania: po 1. błędzie „oddycha” poświatą (Z-19); błąd kołysze wybraną kartę (Z-18)
      solved: () => cards[task.answer]?.classList.add('g-wzor-solved'), // reakcja sceny, ≤ 800 ms (Z-20)
    };
  },

  // Bohater ekranu końca rundy (inline SVG); rdzeń stawia go obok jeżyka, więc to ma być inna postać niż jeżyk.
  hero: () => art.chick(),
};

// Rdzeń woła mount raz na rundę; runRound zwraca instancję ze sprzątaniem, więc destroy jest gotowe.
export default { mount: (ctx) => runRound(ctx, spec) } satisfies GameModule;
