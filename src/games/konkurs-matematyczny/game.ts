/**
 * „Matematyczne zagadki” — widok. Zadania i reguły są w logic.ts, rysunki zadań w figures.ts.
 * Rundą (kolejka zadań, drabina podpowiedzi po błędach, koniec rundy) zajmuje się runRound z rdzenia.
 *
 * Scena jest stała: kartka (polecenie u góry, rysunek zadania z „?” pośrodku) i rząd czterech kart.
 * Między zadaniami wymieniają się tylko polecenie, rysunek i karty (Z-02).
 */
import { art } from '../../core/art';
import { runRound, type RoundSpec } from '../../core/round';
import type { GameContext, GameModule } from '../../core/types';
import { h } from '../../core/util/dom';
import { OP_TEXT, drawFigure, signsLabel, signsOf, swatch, type LetterFactory } from './figures';
import { arrangeCards, cardKind, createTasks, pairLabel, pairOf, promptOf, promptParts, type Answer, type CardKind, type Puzzle } from './logic';
import './style.css'; // CSS gry ładuje tylko game.ts

/** Miejsca stałej sceny, w które każde zadanie wstawia swoją treść. */
interface Places {
  /** Kartka — obiekt pytania (poświata po 1. błędzie) i tło „dobrze” po rozwiązaniu. */
  sheet: HTMLElement;
  prompt: HTMLElement;
  figure: HTMLElement;
  choices: HTMLElement;
}

const P = 'g-konkurs-matematyczny';

/**
 * Litery zadania: zawsze WIELKIE (Z-35: start od wielkich drukowanych, jak na klawiszach), krój wg
 * ustawień rodzica. Rola 'main' nigdy nie daje null.
 */
const lettersOf = (ctx: GameContext): LetterFactory => (char) => ctx.ui.letter(char, { case: 'upper' }) as HTMLElement;

/**
 * Karta odpowiedzi: liczba, słowo z liter platformy, zestaw znaków albo para liczb szachownicy. Każda karta ma
 * `aria-label` równy swojej treści (liczba, słowo; zestaw znaków słowami: „plus, minus”; para: „5 ciemnych
 * i 4 jasne”), a jej widoczna zawartość jest ukryta przed czytnikiem. `longest` — długość najdłuższego słowa w zadaniu:
 * wszystkie karty-słowa zadania mają litery tej samej wielkości, dobranej tak, żeby najdłuższe słowo
 * zmieściło się w karcie.
 */
function card(value: Answer, kind: CardKind, letter: LetterFactory, longest: number): HTMLElement {
  const text = String(value);
  if (kind === 'word') {
    const word = h('span', { class: `${P}-fade ${P}-word`, 'aria-hidden': 'true' }, [...text].map((ch) => letter(ch)));
    return h('button', { class: `${P}-card ${P}-card--len${longest}`, type: 'button', 'aria-label': text }, [word]);
  }
  if (kind === 'signs') {
    // Znaki różnią się kształtem (+ i −), wszystkie w tym samym kolorze (Z-15). Trzy znaki — mniejsza czcionka.
    const signs = h('span', { class: `${P}-fade ${P}-signs`, 'aria-hidden': 'true' }, signsOf(text).map((op) => h('span', { class: `${P}-signs-glyph` }, OP_TEXT[op])));
    return h('button', { class: `${P}-card ${P}-card--signs${text.length}`, type: 'button', 'aria-label': signsLabel(text) }, [signs]);
  }
  if (kind === 'pair') {
    // Szachownica: dwie liczby, każda przy kwadraciku swojego pola (ciemny z paskami, jasny) — czytelne bez czytania.
    const [dark, light] = pairOf(text);
    const rows = h('span', { class: `${P}-fade ${P}-pair`, 'aria-hidden': 'true' }, [
      h('span', { class: `${P}-pair-row` }, [swatch('dark'), h('span', {}, String(dark))]),
      h('span', { class: `${P}-pair-row` }, [swatch('light'), h('span', {}, String(light))]),
    ]);
    return h('button', { class: `${P}-card ${P}-card--pair`, type: 'button', 'aria-label': pairLabel(text) }, [rows]);
  }
  return h('button', { class: `${P}-card`, type: 'button', 'aria-label': text }, [h('span', { class: `${P}-fade`, 'aria-hidden': 'true' }, text)]);
}

const spec: RoundSpec<Puzzle, Places> = {
  tasks: (ctx) => createTasks(ctx.level, ctx.rng),

  scene(ctx) {
    const prompt = h('p', { class: `${P}-prompt` });
    const figure = h('div', { class: `${P}-figure-slot` });
    // Kartka to grupa nazwana poleceniem (show ustawia aria-label) — czytnik ekranu czyta polecenie jako nazwę zadania.
    const sheet = h('div', { class: `${P}-sheet`, role: 'group' }, [prompt, figure]);
    const choices = h('div', { class: `${P}-choices` });
    ctx.root.append(h('div', { class: `${P}-scene` }, [sheet, choices]));
    return { sheet, prompt, figure, choices };
  },

  show(ctx, puzzle, { sheet, prompt, figure, choices }) {
    const letter = lettersOf(ctx);
    sheet.classList.remove(`${P}-solved`);
    // Nowe elementy wchodzą przenikaniem (style.css); kartka i tło stoją.
    // Polecenie na ekranie z częściami: litera zadania („Ile to A?”) jako litera platformy (Z-35). Czytnik
    // ekranu dostaje zwykły tekst polecenia jako nazwę kartki, bo litera platformy ma nazwę „litera A”.
    const shown = promptParts(puzzle).map((part) => (typeof part === 'string' ? part : h('span', { class: `${P}-prompt-letter` }, [letter(part.letter)])));
    prompt.replaceChildren(h('span', { class: `${P}-fade`, 'aria-hidden': 'true' }, shown));
    sheet.setAttribute('aria-label', promptOf(puzzle));
    const drawing = drawFigure(puzzle, letter);
    figure.replaceChildren(drawing.el);

    // Kolejność kart mieszana przy każdym pokazaniu — także gdy zadanie wraca po „zróbmy razem”.
    const layout = arrangeCards(puzzle, ctx.rng);
    const kind = cardKind(puzzle);
    const longest = Math.max(...layout.cards.map((value) => String(value).length));
    const cards = layout.cards.map((value) => card(value, kind, letter, longest));
    choices.replaceChildren(...cards);

    return {
      choose: cards, // ramka na strzałki + Spację i stuknięcie daje rdzeń (Z-32)
      correct: layout.answer,
      question: sheet, // 1. błąd: kartka spokojnie „oddycha” (Z-19)
      solved: () => {
        // ≤ 800 ms (Z-20): „?” zamienia się w odpowiedź, kartka zmienia tło na „dobrze”.
        drawing.reveal();
        sheet.classList.add(`${P}-solved`);
      },
    };
  },

  hero: () => art.squirrel(), // jeżyka na ekranie końca stawia rdzeń; obok niego wiewiórka (Z-16)
};

export default { mount: (ctx) => runRound(ctx, spec) } satisfies GameModule;
