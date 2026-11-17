/**
 * „Literki bliźniaczki” — widok. Wiewiórka trzyma liść z literą-wzorem w jednym kroju, niżej żołędzie
 * z literami w drugim kroju; dziecko wybiera żołądź z tą samą literą. Zasady i zadania: logic.ts.
 * Rundą (kolejka, drabina podpowiedzi, „zróbmy razem”, koniec rundy) zajmuje się runRound z rdzenia.
 */
import { art } from '../../core/art';
import { runRound, type RoundSpec } from '../../core/round';
import type { GameContext, GameModule } from '../../core/types';
import { h } from '../../core/util/dom';
import { createTasks, forms, hasLowerChoices, levelDef, type LetterForm, type Task } from './logic';
import './style.css';

const C = 'g-literki-blizniaczki';

/** Miejsca stałej sceny, w które każde zadanie wstawia swoją treść. */
interface Places {
  leaf: HTMLElement;
  pattern: HTMLElement;
  twin: HTMLElement;
  acorns: HTMLElement;
}

/**
 * Wkłada do miejsca literę w wymuszonej formie (gra nie zależy od ustawienia kroju rodzica) i zapisuje
 * na miejscu krój, którym ui.letter faktycznie ją narysował — style.css wyrównuje po nim wysokość liter.
 */
function put(ctx: GameContext, slot: HTMLElement, ch: string, form: LetterForm): HTMLElement {
  const el = ctx.ui.letter(ch, { script: form.script, case: form.case }) as HTMLElement; // z `script` nigdy null
  slot.dataset.script = el.dataset.script;
  slot.dataset.case = el.dataset.case;
  slot.replaceChildren(el);
  return slot;
}

const spec: RoundSpec<Task, Places> = {
  tasks: (ctx) => createTasks(ctx.level, ctx.rng),

  // Gra zawsze pokazuje pismo pisane: runda czeka na ten krój. Gdy się nie wczyta, rdzeń w ogóle nie startuje rundy
  // (console.error, bez zaliczenia poziomu) — zamiast zadań trywialnych z identycznymi drukowanymi literami.
  cursive: true,

  // Stała scena (Z-02): wiewiórka z liściem i rządek na żołędzie.
  scene(ctx) {
    const squirrel = h('div', { class: `${C}-squirrel`, 'aria-hidden': 'true' });
    squirrel.innerHTML = art.squirrel();
    const pattern = h('div', { class: `${C}-pattern ${C}-slot` });
    const twin = h('div', { class: `${C}-twin ${C}-slot`, 'aria-hidden': 'true' });
    const leaf = h('div', { class: `${C}-leaf` }, [pattern, twin]);
    const def = levelDef(ctx.level);
    const acorns = h('div', { class: `${C}-acorns`, 'data-count': def.options, 'data-tall': hasLowerChoices(def) ? 'true' : null });
    ctx.root.append(h('div', { class: `${C}-scene` }, [h('div', { class: `${C}-stage` }, [squirrel, leaf]), acorns]));
    return { leaf, pattern, twin, acorns };
  },

  // Treść jednego zadania: nowy wzór na liściu i nowe żołędzie (wchodzą przenikaniem); scena stoi.
  show(ctx, task, { leaf, pattern, twin, acorns }) {
    const def = levelDef(ctx.level);
    const form = forms(def.case, task.direction);
    put(ctx, pattern, task.target, form.pattern);
    // Poziom z podpowiedzią „stała”: przy wzorze mała bliźniaczka w kroju żołędzi (bezbłędny start).
    if (def.constantHint) put(ctx, twin, task.target, form.choice);
    else twin.replaceChildren();
    leaf.classList.remove(`${C}-pair`);
    acorns.classList.remove(`${C}-done`);
    const items = task.options.map((ch) =>
      h('button', { class: `${C}-acorn`, type: 'button' }, [
        h('span', { class: `${C}-cap`, 'aria-hidden': 'true' }),
        put(ctx, h('span', { class: `${C}-nut ${C}-slot` }), ch, form.choice),
      ]),
    );
    acorns.replaceChildren(...items);
    return {
      choose: items,
      correct: task.answer,
      question: leaf, // 1. błąd: liść ze wzorem „oddycha” poświatą — popatrz jeszcze raz na literę
      // Klawisz litery wybiera żołądź z tą literą (Z-32: litera jest treścią zadania). Wielkość bez znaczenia.
      letters: task.options,
      // Trafienie (Z-20): obie formy litery stają obok siebie na liściu, pozostałe żołędzie przygasają.
      solved: () => {
        put(ctx, twin, task.target, form.choice);
        leaf.classList.add(`${C}-pair`);
        items[task.answer]?.classList.add(`${C}-solved`);
        acorns.classList.add(`${C}-done`);
      },
    };
  },

  hero: () => art.squirrel(),
};

export default { mount: (ctx) => runRound(ctx, spec) } satisfies GameModule;
