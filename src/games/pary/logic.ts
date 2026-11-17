/**
 * „Pary pod liśćmi” — reguły gry. Czyste funkcje: bez DOM, bez Math.random, bez czasu.
 * Plansza (karty, odkrycia, dopasowania), dobór par, warunek końca i układ kart na ekranie.
 */
import type { Rng } from '../../core/types';

/** Obrazki z core/art (bez jeżyka — to przewodnik platformy, Z-16, i bez liścia — to przykrywka). */
export const PICTURES = ['squirrel', 'chick', 'fish', 'egg', 'chestnut', 'acorn', 'burr', 'tree'] as const;
export type Picture = (typeof PICTURES)[number];

/** Litery bez polskich znaków (Z-31); wielka i mała mają być rozpoznawalną parą. */
export const LETTERS = ['A', 'E', 'M', 'O', 'T', 'L', 'K', 'D'] as const;

/** Co leży pod liściem. */
export type Face =
  | { type: 'picture'; id: Picture }
  | { type: 'letter'; char: string; case: 'upper' | 'lower' }
  | { type: 'digit'; n: number }
  | { type: 'set'; n: number };

export interface Card {
  /** Numer pary na planszy — dwie karty o tym samym numerze tworzą parę. */
  pair: number;
  face: Face;
}

/** Wariant par: obrazek–obrazek, WIELKA–mała litera, cyfra–tyle samo żołędzi (do 5, Z-37). */
export type Kind = 'picture' | 'letters' | 'numbers';

export interface LevelParams {
  kind: Kind;
  /** Par na jednej planszy (2–8). Na małym ekranie gra może ich dać mniej (fitPairs). */
  pairs: number;
  /** Plansz w rundzie: razem 5–10 par do znalezienia (Z-23). */
  boards: number;
}

/** Poziomy numerowane od 1; `manifest.levels` = LEVELS.length. Poziom nie zależy od wieku (Z-39). */
export const LEVELS: readonly LevelParams[] = [
  { kind: 'picture', pairs: 2, boards: 3 },
  { kind: 'picture', pairs: 3, boards: 2 },
  { kind: 'picture', pairs: 4, boards: 2 },
  { kind: 'picture', pairs: 6, boards: 1 },
  { kind: 'picture', pairs: 8, boards: 1 },
  { kind: 'letters', pairs: 4, boards: 2 },
  // 4 pary na planszy (nie 5): większe karty, więc 5 żołędzi jest czytelne; dwie plansze obejmują 1–5.
  { kind: 'numbers', pairs: 4, boards: 2 },
];

export function levelParams(level: number): LevelParams {
  const index = Math.min(Math.max(Math.round(level), 1), LEVELS.length) - 1;
  return LEVELS[index] as LevelParams;
}

/** Bierze `count` elementów puli, w miarę możliwości innych niż na poprzedniej planszy. */
function pickFresh<T>(pool: readonly T[], count: number, used: Set<unknown>, rng: Rng): T[] {
  const fresh = rng.shuffle(pool.filter((x) => !used.has(x)));
  const rest = rng.shuffle(pool.filter((x) => used.has(x)));
  const picked = [...fresh, ...rest].slice(0, count);
  used.clear();
  picked.forEach((x) => used.add(x));
  return picked;
}

/**
 * Plansze całej rundy; `pairs` = liczba par na planszy (po ewentualnym przycięciu do ekranu).
 * Gdy po przycięciu par byłoby w rundzie mniej niż 5, gra dokłada planszę (Z-23).
 */
export function createBoards(level: number, pairs: number, rng: Rng): Card[][] {
  const { kind, boards: planned } = levelParams(level);
  const boards = Math.max(planned, Math.ceil(5 / pairs));
  const used = new Set<unknown>();
  return Array.from({ length: boards }, () => {
    let cards: Card[];
    if (kind === 'picture') {
      cards = pickFresh(PICTURES, pairs, used, rng).flatMap((id, pair) => [0, 1].map(() => ({ pair, face: { type: 'picture', id } as Face })));
    } else if (kind === 'letters') {
      cards = pickFresh(LETTERS, pairs, used, rng).flatMap((char, pair) => [
        { pair, face: { type: 'letter', char, case: 'upper' } as Face },
        { pair, face: { type: 'letter', char, case: 'lower' } as Face },
      ]);
    } else {
      const numbers = pickFresh([1, 2, 3, 4, 5], Math.min(pairs, 5), used, rng);
      cards = numbers.flatMap((n, pair) => [
        { pair, face: { type: 'digit', n } as Face },
        { pair, face: { type: 'set', n } as Face },
      ]);
    }
    return rng.shuffle(cards);
  });
}

// ---------------------------------------------------------------------------
// Stan planszy
// ---------------------------------------------------------------------------

export interface BoardState {
  cards: Card[];
  /** Odkryte w tym ruchu (0–2 indeksy, w kolejności odkrycia). */
  open: number[];
  matched: boolean[];
  /** Karta była już odkryta przez dziecko w którymś z poprzednich ruchów. */
  seen: boolean[];
}

export type FlipResult =
  | { kind: 'ignored' }
  | { kind: 'first' }
  | { kind: 'match'; a: number; b: number }
  /**
   * `slip` = „pomyłka pamięci”: dziecko widziało już parę pierwszej karty i drugą kartę, a mimo to
   * wybrało złą. Odkrycie nowej, niewidzianej karty to zwykła gra, nie pomyłka.
   */
  | { kind: 'mismatch'; a: number; b: number; slip: boolean };

export function createState(cards: Card[]): BoardState {
  return { cards, open: [], matched: cards.map(() => false), seen: cards.map(() => false) };
}

export function partnerOf(state: Pick<BoardState, 'cards'>, i: number): number {
  return state.cards.findIndex((c, k) => k !== i && c.pair === state.cards[i]?.pair);
}

/** Odkrycie karty. Przy dwóch odkrytych kartach nic się nie odkrywa, aż gra je zakryje (closeOpen). */
export function flip(state: BoardState, i: number): FlipResult {
  if (!state.cards[i] || state.matched[i] || state.open.includes(i) || state.open.length >= 2) return { kind: 'ignored' };
  const a = state.open[0];
  if (a === undefined) {
    state.open.push(i);
    return { kind: 'first' };
  }
  const slip = state.seen[partnerOf(state, a)] === true && state.seen[i] === true;
  state.seen[a] = state.seen[i] = true;
  if (state.cards[a]?.pair === state.cards[i]?.pair) {
    state.matched[a] = state.matched[i] = true;
    state.open = [];
    return { kind: 'match', a, b: i };
  }
  state.open.push(i);
  return { kind: 'mismatch', a, b: i, slip };
}

/** Zakrywa odkryte (nietrafione) karty; zwraca ich indeksy. */
export function closeOpen(state: BoardState): number[] {
  const closed = state.open;
  closed.forEach((i) => (state.seen[i] = true));
  state.open = [];
  return closed;
}

/** „Zróbmy razem” (Z-19): pierwsza odkryta karta dostaje swoją parę. Zwraca indeks pary. */
export function solveTogether(state: BoardState): number {
  const a = state.open[0] ?? state.matched.findIndex((m) => !m);
  const b = partnerOf(state, a);
  state.matched[a] = state.matched[b] = true;
  state.seen[a] = state.seen[b] = true;
  state.open = state.open.filter((i) => i !== a && i !== b);
  return b;
}

/**
 * Liść, który warto teraz odkryć (cel podpowiedzi): przy jednej odkrytej karcie — jej para; bez odkrytych —
 * karta z pary, której oba miejsca dziecko już widziało; inaczej pierwsza niewidziana karta.
 */
export function suggest(state: BoardState): number {
  const first = state.open[0];
  if (first !== undefined) return partnerOf(state, first);
  const free = state.cards.map((_, i) => i).filter((i) => !state.matched[i]);
  return (
    free.find((i) => state.seen[i] && state.seen[partnerOf(state, i)]) ?? free.find((i) => !state.seen[i]) ?? free[0] ?? 0
  );
}

export const matchedCount = (state: BoardState) => state.matched.filter(Boolean).length / 2;
export const isCleared = (state: BoardState) => state.matched.every(Boolean);

// ---------------------------------------------------------------------------
// Układ: karty ≥ 80 px (--mg-touch-min) z odstępem 16 px (--mg-touch-gap), Z-33
// ---------------------------------------------------------------------------

export const CARD_MIN = 80;
export const CARD_GAP = 16;
/** Większe karty nie pomagają, a na dużym ekranie rozrzucają planszę. */
export const CARD_MAX = 160;

export interface Layout {
  cols: number;
  rows: number;
  /** Bok karty w px. */
  size: number;
}

/**
 * Siatka z największymi kartami, jaka mieści `count` kart w w × h px; null, gdy karty byłyby < `min` px.
 * Mniejsze `min` tylko po obróceniu ekranu w trakcie rundy (game.ts) — cała plansza ma zostać widoczna.
 */
export function bestLayout(count: number, w: number, h: number, min = CARD_MIN): Layout | null {
  let best: Layout | null = null;
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const size = Math.floor(Math.min(CARD_MAX, (w - (cols - 1) * CARD_GAP) / cols, (h - (rows - 1) * CARD_GAP) / rows));
    if (size < min) continue;
    const empty = cols * rows - count;
    if (!best || size > best.size || (size === best.size && empty < best.cols * best.rows - count)) best = { cols, rows, size };
  }
  return best;
}

/** Najwięcej par (≤ wanted, ≥ 2), które mieszczą się na ekranie. Bez wymiarów (0) — bez przycinania. */
export function fitPairs(wanted: number, w: number, h: number): number {
  if (w <= 0 || h <= 0) return wanted;
  for (let p = wanted; p > 2; p--) if (bestLayout(p * 2, w, h)) return p;
  return Math.min(wanted, 2);
}
