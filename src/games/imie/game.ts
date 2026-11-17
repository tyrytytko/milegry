/**
 * „Literki z imienia” — widok. Dziecko układa imię (albo słowo domyślne) litera po literze: nad każdą kratką
 * stoi litera wzoru, zadanie = wskaż literę do bieżącej kratki. Reguły i zadania: logic.ts. Kolejkę, drabinę
 * podpowiedzi, „zróbmy razem”, przyciski liter na dotyku i koniec rundy robi runRound z rdzenia.
 */
import { art } from '../../core/art';
import { runRound, type RoundSpec } from '../../core/round';
import type { Cancel, GameContext, GameModule } from '../../core/types';
import { h } from '../../core/util/dom';
import { FADE_MS, MAX_COLS, createRound, layout, levelDef, parseName, type Place, type Task, type Word } from './logic';
import './style.css';

const C = 'g-imie';

/**
 * Miejsca stałej sceny: siatka par [litera wzoru + kratka] i rząd kafelków wyboru (klawiatura, litery z ogonkiem).
 * `pairs` to pary słowa, które teraz stoi w siatce (`word`); przy kolejnym słowie rundy siatka dostaje nowe.
 */
interface Places {
  scene: HTMLElement;
  grid: HTMLElement;
  pairs: { model: HTMLElement; slot: HTMLElement }[];
  word: number;
  choices: HTMLElement;
}

function createSpec(ctx: GameContext): RoundSpec<Task, Places> {
  // Bez imienia kolejna runda bierze kolejne słowo — numer rundy pamięta zapis gry.
  const turn = Number(ctx.storage.get<unknown>('turn', 0)) || 0;
  if (parseName(ctx.settings.childName).length === 0) ctx.storage.set('turn', (turn + 1) % 600);
  const def = levelDef(ctx.level);
  const round = createRound(ctx.settings.childName, ctx.level, turn, ctx.rng);
  const keyboard = ctx.input.mode === 'keyboard';
  const letter = (ch: string) => ctx.ui.letter(ch) as HTMLElement; // rola 'main' nigdy nie daje null
  const seen = new Set<Task>();
  let stopFade: Cancel = () => {};

  // Wstawia do siatki słowo zadania. `fresh` = początek ułożenia: kratki puste. Bez niego (zadanie wraca
  // po „zróbmy razem”, a w siatce stało już inne słowo) pozostałe kratki są ułożone, jak je dziecko zostawiło.
  const place = (places: Places, task: Task, fresh: boolean) => {
    const word = round.words[task.word] as Word;
    // Miejsce w siatce dla sceny wąskiej (n) i szerokiej (w); odstęp bez miejsca chowamy (style.css).
    const narrow = layout(word.cells, MAX_COLS.narrow);
    const wide = layout(word.cells, MAX_COLS.wide);
    const at = (p: Place, k: string) => (p ? `--${k}r:${p.row};--${k}c:${p.col};` : `--${k}d:none;`);
    const pairs: Places['pairs'] = [];
    const cells = word.cells.map((ch, i) => {
      const style = at(narrow.places[i] ?? null, 'n') + at(wide.places[i] ?? null, 'w');
      if (ch === ' ' || ch === '-') return h('span', { class: `${C}-gap`, 'data-dash': ch === '-' || null, style });
      const filled = !fresh && pairs.length !== task.pos;
      const slot = h('span', { class: filled ? `${C}-slot ${C}-filled` : `${C}-slot` }, filled ? [letter(ch)] : []);
      const pair = { model: h('span', { class: `${C}-model` }, [letter(ch)]), slot };
      pairs.push(pair);
      return h('div', { class: `${C}-pair`, style }, [pair.model, pair.slot]);
    });
    const size = { nc: narrow.cols, nr: narrow.rows, wc: wide.cols, wr: wide.rows };
    for (const [k, v] of Object.entries(size)) places.scene.style.setProperty(`--g-imie-${k}`, String(v));
    places.grid.replaceChildren(...cells);
    places.pairs = pairs;
    places.word = task.word;
  };

  return {
    tasks: () => round.tasks,

    // Stała scena (Z-02): wzór i kratki stoją, dopóki układamy to samo słowo; odstępy imienia („ANNA MARIA”)
    // to puste komórki. Siatkę wypełnia show — pierwsze zadanie wstawia swoje słowo.
    scene() {
      const grid = h('div', { class: `${C}-grid` });
      const choices = h('div', { class: `${C}-choices` });
      // Rząd kafelków rezerwujemy raz na rundę (tylko klawiatura i słowo z ogonkami), żeby scena nie skakała.
      const tiles = keyboard && round.tasks.some((t) => t.choices);
      const scene = h('div', { class: `${C}-scene`, 'data-mode': ctx.input.mode, 'data-tiles': tiles || null }, [grid, choices]);
      ctx.root.append(scene);
      return { scene, grid, pairs: [], word: -1, choices };
    },

    show(_ctx, task, places) {
      stopFade();
      const first = !seen.has(task); // zadanie po „zróbmy razem” wraca: wtedy opróżniamy tylko jego kratkę
      seen.add(task);
      if (places.word !== task.word) place(places, task, first);
      const { grid, pairs, choices } = places;
      pairs.forEach(({ model, slot }, i) => {
        if ((task.lapStart && first) || i === task.pos) {
          slot.classList.remove(`${C}-filled`);
          slot.replaceChildren();
        }
        model.classList.toggle(`${C}-now`, def.marker && i === task.pos);
        slot.classList.toggle(`${C}-next`, i === task.pos);
      });
      const { model, slot } = pairs[task.pos] as Places['pairs'][number];
      if (def.ghost) slot.append(h('span', { class: `${C}-ghost` }, [letter(task.letter)]));
      grid.classList.remove(`${C}-done`);
      // Wzór: 'fade' — przygasa po chwili w każdym zadaniu; 'hidden' — widać go chwilę tylko na starcie ułożenia
      // (bez tego słowa domyślnego nie da się odgadnąć); wraca, gdy rdzeń pokaże podpowiedź (style.css).
      const peek = def.pattern === 'fade' || (def.pattern === 'hidden' && task.lapStart && first);
      grid.classList.toggle(`${C}-faded`, def.pattern === 'hidden' && !peek);
      if (peek) stopFade = ctx.clock.after(FADE_MS, () => grid.classList.add(`${C}-faded`));

      // Trafienie (Z-20): litera wskakuje do kratki; po ostatniej całe słowo „stoi”.
      const solved = () => {
        stopFade();
        slot.replaceChildren(letter(task.letter));
        slot.classList.replace(`${C}-next`, `${C}-filled`);
        if (pairs.every((p) => p.slot.classList.contains(`${C}-filled`))) grid.classList.add(`${C}-done`);
      };
      // Pytanie = litera wzoru nad kratką: 1. błąd ją rozświetla, na klawiaturze nad nią staje klawisz-podpowiedź.
      if (keyboard && task.choices) {
        // Litera z ogonkiem na klawiaturze: AltGr niewymagany (Z-31) — trzy kafelki, ramka na strzałkach + Spacja.
        // Litery kafelków (Z-32: litera to treść zadania) dają też odpowiedź klawiszem: „L” przy „Ł” to łagodny
        // błąd z drabiną, a „Ł” z AltGr zalicza. Kafelki są różnymi literami (test w logic.test.ts).
        const tiles = task.choices.map((ch) => h('button', { class: `${C}-tile`, type: 'button' }, [letter(ch)]));
        choices.replaceChildren(...tiles);
        return { choose: tiles, correct: task.choices.indexOf(task.letter), question: model, letters: task.choices, solved };
      }
      choices.replaceChildren();
      return { letter: task.letter, keys: task.keys, question: model, solved };
    },

    hero: () => art.chestnut(),
  };
}

export default { mount: (ctx) => runRound(ctx, createSpec(ctx)) } satisfies GameModule;
