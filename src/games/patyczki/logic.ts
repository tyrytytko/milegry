/**
 * „Patyczki jeżyka” — reguły gry. Czyste funkcje: bez DOM, bez Math.random, bez czasu.
 * Losowość wchodzi parametrem (Rng z ctx.rng), więc to samo ziarno w teście daje te same zadania.
 *
 * Dodawanie: dwie kupki (a i b) rozdzielone znakiem „+”, dziecko liczy wszystkie i wpisuje sumę.
 * Odejmowanie: jedna kupka a patyczków, z których b ostatnich jest „zabranych” (przekreślone, blade);
 * dziecko liczy te, które zostały. Składniki i wynik są ≥ 1 — zera (0 patyczków) w grze nie ma.
 */
import type { Rng } from '../../core/types';

export type Op = 'add' | 'sub';

/** Jedno zadanie. add: a + b = answer. sub: było a, zabrano b, zostało answer. */
export interface Task {
  op: Op;
  a: number;
  b: number;
  answer: number;
}

export interface LevelParams {
  op: Op;
  /** Zakres sumy (add) albo liczby patyczków na początku (sub), włącznie. */
  from: number;
  to: number;
  /** Zapis „2 + 3 =” pod patyczkami (Z-37: symbol dopiero obok konkretu, od poziomu 3). */
  symbol: boolean;
  /** Ile zadań w rundzie (Z-23: 5–10). */
  tasks: number;
  /** Cyfry na klawiaturze ekranowej (dotyk): tylko te, które mogą paść w odpowiedzi. */
  keys: number[];
}

const upTo = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
const UP_TO_10 = [...upTo(9), 0];

/** Poziomy numerowane od 1; `manifest.levels` = LEVELS.length. Poziom nie zależy od wieku (Z-39). */
export const LEVELS: readonly LevelParams[] = [
  { op: 'add', from: 2, to: 3, symbol: false, tasks: 5, keys: upTo(3) },
  { op: 'add', from: 2, to: 5, symbol: false, tasks: 6, keys: upTo(5) },
  { op: 'add', from: 3, to: 5, symbol: true, tasks: 6, keys: upTo(5) },
  { op: 'add', from: 4, to: 8, symbol: true, tasks: 7, keys: upTo(8) },
  { op: 'add', from: 5, to: 10, symbol: true, tasks: 8, keys: UP_TO_10 },
  { op: 'sub', from: 3, to: 5, symbol: true, tasks: 6, keys: upTo(4) },
  { op: 'sub', from: 5, to: 8, symbol: true, tasks: 7, keys: upTo(7) },
  { op: 'sub', from: 6, to: 10, symbol: true, tasks: 8, keys: upTo(9) },
];

/** Parametry poziomu; numer spoza zakresu (także 0 = „gra bez poziomów”) przycinamy do istniejącego. */
export function levelParams(level: number): LevelParams {
  const index = Math.min(Math.max(Math.round(level), 1), LEVELS.length) - 1;
  return LEVELS[index] as LevelParams;
}

/** Poziom z sumą do 10 — jedyny, na którym odpowiedź „10” (dwie cyfry) może paść. */
const hasTen = (p: LevelParams) => p.op === 'add' && p.to === 10;

/** Ile cyfr ma najdłuższa odpowiedź poziomu (widok rezerwuje miejsce na pole odpowiedzi). */
export const answerDigits = (level: number): number => (hasTen(levelParams(level)) ? 2 : 1);

/** Patyczki układamy w piątki (jak na liczydle): 7 → [5, 2]; kolejne grupy są wyraźnie rozsunięte. */
export function bundles(count: number): number[] {
  const result: number[] = [];
  for (let left = count; left > 0; left -= 5) result.push(Math.min(left, 5));
  return result;
}

/** Zapis działania pod patyczkami: „2 + 3 =” albo „5 − 2 =” (U+2212, nie myślnik). */
export const symbolText = (task: Task): string => `${task.a} ${task.op === 'add' ? '+' : '−'} ${task.b} =`;

// --- Szerokość zadania w „szczebelkach” (jeden patyczek = 1 szczebelek) ---
// Jedno źródło liczb układu: game.ts przekazuje je do style.css jako zmienne --g-patyczki-… (tak jak --g-patyczki-slots),
// więc szerokość liczona tutaj i szerokość narysowana nie mogą się rozjechać.
/** Odstęp między piątkami, w szczebelkach. */
export const BUNDLE_GAP = 0.9;
/** Wypełnienie kupki po obu stronach razem. */
export const PILE_PADDING = 0.8;
/** Znak „+” z odstępami. */
export const SIGN_SLOTS = 2.2;
/** Wypełnienie podłoża (maty) po obu stronach razem. */
export const FIELD_PADDING = 1;

const pileSlots = (count: number) => count + (bundles(count).length - 1) * BUNDLE_GAP + PILE_PADDING;

/** Ile szczebelków zajmuje zadanie w rzędzie (suma szerokości kupek, znaku i podłoża). */
export const taskSlots = (task: Task): number =>
  FIELD_PADDING + (task.op === 'add' ? pileSlots(task.a) + SIGN_SLOTS + pileSlots(task.b) : pileSlots(task.a));

/** Wszystkie możliwe zadania poziomu. */
function pool(p: LevelParams): Task[] {
  const tasks: Task[] = [];
  for (let n = p.from; n <= p.to; n++) {
    for (let a = 1; a < n; a++) {
      tasks.push(p.op === 'add' ? { op: 'add', a, b: n - a, answer: n } : { op: 'sub', a: n, b: a, answer: n - a });
    }
  }
  return tasks;
}

/** Najszersze zadanie poziomu — z niego widok liczy stały rozmiar patyczków i stałą szerokość maty na cały poziom. */
export const levelSlots = (level: number): number => Math.max(...pool(levelParams(level)).map(taskSlots));

/**
 * Zadania całej rundy. Kolejne zadanie ma zawsze inną odpowiedź niż poprzednie (więc i samo jest inne), a spośród
 * pasujących losujemy to, które padło dotąd najmniej razy — póki wśród pasujących jest zadanie jeszcze niewidziane,
 * żadne nie wraca. Od poziomu 2 takie zawsze jest (pula jest dużo większa niż runda), więc zadania w rundzie się nie
 * powtarzają (pilnuje tego test).
 * Rundy nie otwiera odpowiedź, którą daje tylko jedno zadanie puli (np. „1+1”). Poziom 1 ma trzy zadania
 * (1+1, 1+2, 2+1) i dwie odpowiedzi (2, 3), które muszą padać na zmianę: zaczynając od 3, „1+1” pada 2 razy na 5,
 * a nie 3.
 * Na poziomie z sumą 10 pada ona dokładnie raz, nigdy na początku (to nowa trudność: dwie cyfry odpowiedzi).
 */
export function createTasks(level: number, rng: Rng): Task[] {
  const p = levelParams(level);
  const all = pool(p);
  const tens = hasTen(p) ? all.filter((t) => t.answer === 10) : [];
  const normal = all.filter((t) => t.answer !== 10 || !hasTen(p));
  const variants = (answer: number) => normal.filter((t) => t.answer === answer).length;
  const tenAt = tens.length > 0 ? rng.int(1, p.tasks - 1) : -1;
  const used = new Map<Task, number>();
  const tasks: Task[] = [];
  for (let i = 0; i < p.tasks; i++) {
    if (i === tenAt) {
      tasks.push(rng.pick(tens));
      continue;
    }
    const prev = tasks[i - 1];
    // Każdy poziom ma co najmniej dwie różne odpowiedzi, w tym jedną z dwoma zadaniami (pilnuje tego test),
    // więc lista pasujących nigdy nie jest pusta.
    const fitting = rng
      .shuffle(normal)
      .filter((t) => (prev ? t.answer !== prev.answer : variants(t.answer) > 1));
    const next = fitting.reduce((best, t) => ((used.get(t) ?? 0) < (used.get(best) ?? 0) ? t : best));
    used.set(next, (used.get(next) ?? 0) + 1);
    tasks.push(next);
  }
  return tasks;
}
