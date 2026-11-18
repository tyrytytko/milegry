/**
 * „Matematyczne zagadki” — reguły i pula zadań. Czyste funkcje: bez DOM, bez Math.random, bez czasu.
 * Losowość wchodzi parametrem (Rng z ctx.rng), więc to samo ziarno w teście daje tę samą rundę.
 *
 * Zadanie to dane (`Puzzle`), z których widok rysuje kartkę — każdy typ zadania ma swój `kind`,
 * swoje pola danych, polecenie w `promptOf` i rysunek w figures.ts. Karty odpowiedzi (cztery liczby,
 * słowa, zestawy znaków albo pary „ciemne,jasne”) i dobra odpowiedź są zapisane w zadaniu, a test sprawdza je,
 * licząc wynik z danych zadania. Na końcu pliku: geometria tarczy (`targetLayout`) — też czysta i przetestowana.
 */
import type { Rng } from '../../core/types';

/**
 * Treść karty odpowiedzi: liczba, słowo z WIELKICH liter (kod literowy), zestaw znaków z „+” i „-”
 * (zadanie „znaki”) albo para „ciemne,jasne” (szachownica); jak karta wygląda, zależy od typu zadania — `cardKind`.
 */
export type Answer = number | string;

export type Op = '+' | '-';

/** Jedna strona działania: liczby z działaniami między nimi; `null` = miejsce na „?”. */
export interface Side {
  values: readonly (number | null)[];
  /** Działania między kolejnymi liczbami — zawsze o jedno mniej niż `values`. */
  ops: readonly Op[];
}

/** Równość „lewa = prawa” z dokładnie jednym „?” po którejś stronie. */
export interface Equation {
  left: Side;
  right: Side;
}

interface PuzzleBase<A extends Answer = number> {
  /** Stały identyfikator zadania w puli (unikalny w poziomie). */
  id: string;
  /** Cztery różne karty odpowiedzi (kolejność na ekranie układa arrangeCards). */
  cards: readonly A[];
  /** Dobra odpowiedź — jedna z `cards`. */
  answer: A;
}

/** Brakująca liczba: działanie z „?”, np. „? + 3 = 7”. */
export interface MissingPuzzle extends PuzzleBase {
  kind: 'missing';
  equation: Equation;
}

/** Kostki: 2–3 kostki z oczkami, pytanie o sumę oczek. */
export interface DicePuzzle extends PuzzleBase {
  kind: 'dice';
  /** Oczka na kolejnych kostkach (1–6). */
  dice: readonly number[];
}

/**
 * Ciąg liczb; odpowiedź to następna liczba. Poziomy 1–2: stały krok. Poziom 3: rosnący krok — każdy krok
 * jest o tyle samo większy (albo mniejszy) od poprzedniego, np. 1, 2, 4, 7, 11 (kroki 1, 2, 3, 4).
 */
export interface SequencePuzzle extends PuzzleBase {
  kind: 'sequence';
  values: readonly number[];
}

/** Kółko piramidki: liczba, „?” (`null`) albo puste kółko do policzenia po drodze (`'blank'`). */
export type PyramidCell = number | null | 'blank';

/**
 * Piramidka dodawania: rzędy kółek od góry, każdy rząd ma o jedno kółko więcej niż rząd nad nim,
 * a każde kółko jest sumą dwóch kółek pod nim. Dokładnie jedno kółko to „?” (`null`); puste kółka
 * (`'blank'`, nigdy w dolnym rzędzie) dziecko liczy samo po drodze do „?”.
 * Kółko nad dwoma = jedno dodawanie: rzędy 1 i 2 kółek to jedno dodawanie, 2 i 3 — dwa obok siebie,
 * 1–2–3 z „?” na górze i pustym środkiem — trzy dodawania.
 */
export interface PyramidPuzzle extends PuzzleBase {
  kind: 'pyramid';
  rows: readonly (readonly PyramidCell[])[];
}

/** Piramidka z odpowiedzią w „?” i policzonymi pustymi kółkami (do pokazania rozwiązania). */
export function solvedPyramid(rows: readonly (readonly PyramidCell[])[], answer: number): number[][] {
  const out = rows.map((row) => row.map((v) => (v === null ? answer : v)));
  for (let r = out.length - 2; r >= 0; r--) {
    out[r] = out[r]!.map((v, i) => (v === 'blank' ? (out[r + 1]![i] as number) + (out[r + 1]![i + 1] as number) : v));
  }
  return out as number[][];
}

/**
 * Brakujące pola: mur z cegieł albo podłoga z płytek. Każdy rząd to napis: `#` = pole jest, `.` = pola
 * brakuje. Podłoga: wszystkie rzędy równej długości. Mur: co drugi rząd (1., 3.…) jest przesunięty
 * o pół cegły, ma o jedną całą cegłę mniej i połówki cegieł na obu końcach (połówki zawsze są).
 */
export interface TilesPuzzle extends PuzzleBase {
  kind: 'tiles';
  surface: 'wall' | 'floor';
  rows: readonly string[];
}

/** Para z tabelki kodu literowego: litera (WIELKA) = liczba. */
export interface LetterCode {
  letter: string;
  value: number;
}

/** Kod literowy „jakie to słowo”: tabelka litera = liczba i rząd liczb; odpowiedź to słowo. */
export interface CodeWordPuzzle extends PuzzleBase<string> {
  kind: 'codeWord';
  legend: readonly LetterCode[];
  code: readonly number[];
}

/** Ta sama litera: „A + A + A = 12” — litera (WIELKA) dodana `count` razy daje `total`; odpowiedź to wartość litery. */
export interface SameLetterPuzzle extends PuzzleBase {
  kind: 'sameLetter';
  letter: string;
  count: number;
  total: number;
}

/**
 * Znaki: „7 ? 5 ? 3 = 9” — między liczbami puste pola na znaki, liczone od lewej. Karta to zestaw
 * znaków na kolejne pola, zapisany napisem z „+” i „-” (np. „+-”); dokładnie jeden zestaw pasuje.
 */
export interface SignsPuzzle extends PuzzleBase<string> {
  kind: 'signs';
  numbers: readonly number[];
  result: number;
}

/**
 * Tarcza: pierścienie opisane liczbami (`rings` od zewnętrznego do środka, wartości rosną ku środkowi)
 * i trafienia — każde zapisane wartością pierścienia, w którym leży kropka. Odpowiedź to suma trafień.
 */
export interface TargetPuzzle extends PuzzleBase {
  kind: 'target';
  rings: readonly number[];
  hits: readonly number[];
}

/** Nazwana rosnąca figura (poziom 3): trójkąt-schodki, kwadrat albo krzyżyk. */
export type Outline = 'triangle' | 'square' | 'cross';

/**
 * Rosnące figury: trzy coraz większe układy kółek albo kwadratów. Układ to rzędy od góry zapisane
 * napisami (`#` = kółko/kwadrat, `.` = puste miejsce). Bez `outline` (poziom 2) każdy układ zawiera
 * poprzedni (od lewego dolnego rogu) i rośnie o tyle samo pól. Z `outline` (poziom 3) układy to trzy
 * kolejne wielkości tej figury: trójkąt-schodki (rzędy 1, 2, 3… pól), kwadrat, krzyżyk (ramiona 1, 2, 3…
 * pól od środka). Odpowiedź to liczba pól czwartego układu.
 */
export interface GrowingPuzzle extends PuzzleBase {
  kind: 'growing';
  shape: 'circle' | 'square';
  outline?: Outline;
  stages: readonly (readonly string[])[];
}

/** Kod literowy „ile razem”: tabelka litera = liczba i słowo; odpowiedź to suma wartości liter słowa. */
export interface CodeSumPuzzle extends PuzzleBase {
  kind: 'codeSum';
  legend: readonly LetterCode[];
  word: string;
}

/** Zapis „A + A + B = 14”: litery (WIELKIE) dodane do siebie i wynik. */
export interface LetterSum {
  letters: readonly string[];
  total: number;
}

/**
 * Dwie litery: kilka zapisów z dwiema literami, np. „A + A = 12” i „A + B = 10” (w co najmniej jednym
 * zapisie stoją obie litery); układ ma jedno rozwiązanie. Odpowiedź to wartość litery `ask`.
 */
export interface TwoLettersPuzzle extends PuzzleBase {
  kind: 'twoLetters';
  sums: readonly LetterSum[];
  ask: string;
}

/**
 * Szachownica z brakującymi polami: rzędy od góry (`#` = pole jest, `.` = brakuje). Pole w rzędzie r
 * i kolumnie k jest ciemne, gdy r + k jest parzyste (lewy górny róg ciemny). Karta to para
 * „ciemne,jasne” — ile brakuje pól ciemnych i ile jasnych (np. „5,4”).
 */
export interface ChessPuzzle extends PuzzleBase<string> {
  kind: 'chess';
  rows: readonly string[];
}

/**
 * Numery brakujących pól (`.`) w każdym rzędzie, liczone od 1 — dla muru, podłogi i szachownicy.
 * Z tego opis rysunku dla czytnika ekranu mówi, gdzie brakuje pól, tak żeby dało się zadanie rozwiązać.
 */
export const missingCells = (rows: readonly string[]): number[][] =>
  rows.map((row) => [...row].flatMap((ch, i) => (ch === '.' ? [i + 1] : [])));

/** Karta szachownicy „5,4” jako liczby [ciemne, jasne]. */
export function pairOf(card: string): [number, number] {
  const [dark = NaN, light = NaN] = card.split(',').map(Number);
  return [dark, light];
}

/** Czy pole szachownicy w rzędzie `row` i kolumnie `col` (od 0, od lewego górnego rogu) jest ciemne. */
export const isDarkCell = (row: number, col: number): boolean => (row + col) % 2 === 0;

/**
 * „5 ciemnych”, „3 ciemne”, „1 ciemne” — liczba z przymiotnikiem w formie pasującej do liczby
 * (`few` po 1, 2–4, 22–24…; `many` po 0, 5–21, 25–30…).
 */
export function countWith(n: number, few: string, many: string): string {
  const fewForm = n === 1 || (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14));
  return `${n} ${fewForm ? few : many}`;
}

/** Nazwa karty szachownicy dla czytnika ekranu, np. „5 ciemnych i 4 jasne”. */
export function pairLabel(card: string): string {
  const [dark, light] = pairOf(card);
  return `${countWith(dark, 'ciemne', 'ciemnych')} i ${countWith(light, 'jasne', 'jasnych')}`;
}

/** Zadanie z puli. Nowy typ zadania = nowy wariant tej unii (+ polecenie w promptOf i rysunek w figures.ts). */
export type Puzzle =
  | MissingPuzzle
  | DicePuzzle
  | SequencePuzzle
  | PyramidPuzzle
  | TilesPuzzle
  | CodeWordPuzzle
  | SameLetterPuzzle
  | SignsPuzzle
  | TargetPuzzle
  | GrowingPuzzle
  | CodeSumPuzzle
  | TwoLettersPuzzle
  | ChessPuzzle;

export type PuzzleKind = Puzzle['kind'];

/** „następny trójkąt” itd. — końcówka polecenia rosnących figur nazwanych. */
const OUTLINE_NEXT: Record<Outline, string> = { triangle: 'następny trójkąt', square: 'następny kwadrat', cross: 'następny krzyżyk' };

/** Część polecenia: zwykły tekst albo miejsce na literę zadania (widok wstawia tam literę platformy, Z-35). */
export type PromptPart = string | { letter: string };

/**
 * Polecenie w częściach — do pokazania na ekranie. Litera zadania („Ile to A?”) jest osobną częścią,
 * bo rysuje ją platforma (ctx.ui.letter), a nie zwykły tekst.
 */
export function promptParts(puzzle: Puzzle): PromptPart[] {
  switch (puzzle.kind) {
    case 'sameLetter':
      return ['Ile to ', { letter: puzzle.letter }, '?'];
    case 'twoLetters':
      return ['Ile to ', { letter: puzzle.ask }, '?'];
    default:
      return [promptOf(puzzle)];
  }
}

/** Polecenie nad zadaniem jako zwykły tekst (to czyta czytnik ekranu; jedno krótkie zdanie; wyjątek od Z-10 — README gry). */
export function promptOf(puzzle: Puzzle): string {
  switch (puzzle.kind) {
    case 'missing':
    case 'pyramid':
      return 'Jaka liczba pasuje?';
    case 'dice':
      return 'Ile oczek jest razem?';
    case 'sequence':
      return 'Jaka liczba będzie następna?';
    case 'tiles':
      return puzzle.surface === 'wall' ? 'Ile cegieł brakuje?' : 'Ile płytek brakuje?';
    case 'codeWord':
      return 'Jakie to słowo?';
    case 'sameLetter':
      return `Ile to ${puzzle.letter}?`;
    case 'twoLetters':
      return `Ile to ${puzzle.ask}?`;
    case 'chess':
      return 'Ile ciemnych i ile jasnych pól brakuje?';
    case 'signs':
      return 'Jakie znaki pasują?';
    case 'target':
      return 'Ile punktów zdobył strzelec?';
    case 'growing': {
      const cells = puzzle.shape === 'circle' ? 'kółek' : 'kwadratów';
      const next = puzzle.outline ? OUTLINE_NEXT[puzzle.outline] : 'następna figura';
      return `Z ilu ${cells} będzie ${next}?`;
    }
    case 'codeSum':
      return 'Ile razem są warte litery?';
  }
}

/** Jak wygląda karta odpowiedzi: liczba, słowo z liter platformy, zestaw znaków albo para „ciemne i jasne”. */
export type CardKind = 'number' | 'word' | 'signs' | 'pair';

export function cardKind(puzzle: Puzzle): CardKind {
  switch (puzzle.kind) {
    case 'codeWord':
      return 'word';
    case 'signs':
      return 'signs';
    case 'chess':
      return 'pair';
    default:
      return 'number';
  }
}

// ---------------------------------------------------------------------------
// Zapis zadań w puli
// ---------------------------------------------------------------------------

/** Strona działania z zapisu tekstowego, np. „? + 3” albo „7” („?” = miejsce na odpowiedź). */
function parseSide(text: string): Side {
  const tokens = text.trim().split(/\s+/);
  const values: (number | null)[] = [];
  const ops: Op[] = [];
  tokens.forEach((token, i) => {
    if (i % 2 === 1) {
      if (token !== '+' && token !== '-') throw new Error(`Nieznane działanie „${token}” w „${text}”`);
      ops.push(token);
    } else {
      const value = token === '?' ? null : Number(token);
      if (value !== null && !Number.isInteger(value)) throw new Error(`Nie liczba: „${token}” w „${text}”`);
      values.push(value);
    }
  });
  return { values, ops };
}

/** Równość z zapisu „? + 3 = 7” (spacje między liczbami i znakami; minus jako „-”; dokładnie jedno „?”). */
export function parseEquation(text: string): Equation {
  const [left, right, ...rest] = text.split('=');
  if (left === undefined || right === undefined || rest.length > 0) throw new Error(`Zły zapis równości: „${text}”`);
  const equation = { left: parseSide(left), right: parseSide(right) };
  const holes = [...equation.left.values, ...equation.right.values].filter((v) => v === null).length;
  if (holes !== 1) throw new Error(`Równość musi mieć dokładnie jedno „?”: „${text}”`);
  return equation;
}

const missing = (id: string, equation: string, cards: number[], answer: number): MissingPuzzle => ({
  kind: 'missing',
  id,
  equation: parseEquation(equation),
  cards,
  answer,
});

const dice = (id: string, pips: number[], cards: number[], answer: number): DicePuzzle => ({
  kind: 'dice',
  id,
  dice: pips,
  cards,
  answer,
});

const sequence = (id: string, values: number[], cards: number[], answer: number): SequencePuzzle => ({
  kind: 'sequence',
  id,
  values,
  cards,
  answer,
});

const pyramid = (id: string, rows: PyramidCell[][], cards: number[], answer: number): PyramidPuzzle => ({
  kind: 'pyramid',
  id,
  rows,
  cards,
  answer,
});

const tiles = (id: string, surface: TilesPuzzle['surface'], rows: string[], cards: number[], answer: number): TilesPuzzle => ({
  kind: 'tiles',
  id,
  surface,
  rows,
  cards,
  answer,
});

/** Tabelka kodu literowego z zapisu „L=1 A=2 S=3” (litery WIELKIE). */
const parseLegend = (legend: string): LetterCode[] =>
  legend.split(' ').map((pair) => {
    const [letter = '', value = ''] = pair.split('=');
    return { letter, value: Number(value) };
  });

const codeWord = (id: string, legend: string, code: number[], cards: string[], answer: string): CodeWordPuzzle => ({
  kind: 'codeWord',
  id,
  legend: parseLegend(legend),
  code,
  cards,
  answer,
});

const codeSum = (id: string, legend: string, word: string, cards: number[], answer: number): CodeSumPuzzle => ({
  kind: 'codeSum',
  id,
  legend: parseLegend(legend),
  word,
  cards,
  answer,
});

const target = (id: string, rings: number[], hits: number[], cards: number[], answer: number): TargetPuzzle => ({
  kind: 'target',
  id,
  rings,
  hits,
  cards,
  answer,
});

const growing = (id: string, shape: GrowingPuzzle['shape'], stages: string[][], cards: number[], answer: number): GrowingPuzzle => ({
  kind: 'growing',
  id,
  shape,
  stages,
  cards,
  answer,
});

/** Rosnąca figura nazwana (poziom 3): trzy kolejne wielkości trójkąta, kwadratu albo krzyżyka. */
const outlined = (id: string, outline: Outline, shape: GrowingPuzzle['shape'], stages: string[][], cards: number[], answer: number): GrowingPuzzle => ({
  kind: 'growing',
  id,
  shape,
  outline,
  stages,
  cards,
  answer,
});

/** Dwie litery z zapisów „A + A = 12” (litery WIELKIE, tylko dodawanie); `ask` — litera, o którą pytamy. */
const twoLetters = (id: string, sums: string[], ask: string, cards: number[], answer: number): TwoLettersPuzzle => ({
  kind: 'twoLetters',
  id,
  sums: sums.map((text) => {
    const [left = '', right = ''] = text.split('=');
    const letters = left.split('+').map((part) => part.trim());
    if (letters.some((l) => !/^[A-Z]$/.test(l))) throw new Error(`Zły zapis liter: „${text}”`);
    return { letters, total: Number(right) };
  }),
  ask,
  cards,
  answer,
});

const chess = (id: string, rows: string[], cards: string[], answer: string): ChessPuzzle => ({
  kind: 'chess',
  id,
  rows,
  cards,
  answer,
});

const sameLetter = (id: string, letter: string, count: number, total: number, cards: number[], answer: number): SameLetterPuzzle => ({
  kind: 'sameLetter',
  id,
  letter,
  count,
  total,
  cards,
  answer,
});

/** Znaki z zapisu „7 ? 5 ? 3 = 9” („?” = pole na znak między każdą parą liczb). */
const signs = (id: string, text: string, cards: string[], answer: string): SignsPuzzle => {
  const [left = '', right = ''] = text.split('=');
  const tokens = left.trim().split(/\s+/);
  const numbers = tokens.filter((_, i) => i % 2 === 0).map(Number);
  if (tokens.some((t, i) => (i % 2 === 1 ? t !== '?' : !Number.isInteger(Number(t))))) throw new Error(`Zły zapis znaków: „${text}”`);
  return { kind: 'signs', id, numbers, result: Number(right), cards, answer };
};

/** Cztery zestawy dwóch znaków — karty zadania „znaki” przy trzech liczbach. */
const TWO_SIGNS = ['++', '+-', '-+', '--'];

/** Szachownica 5 × 5 bez środka 3 × 3 i 6 × 6 z dziurą w kształcie schodków (lewy górny róg ciemny). */
const CHESS_FRAME = ['#####', '#...#', '#...#', '#...#', '#####'];
const CHESS_STAIRS = ['######', '#..###', '#...##', '##..##', '###.##', '######'];

// ---------------------------------------------------------------------------
// Poziomy
// ---------------------------------------------------------------------------

export interface LevelParams {
  /** Największa liczba w zadaniach i na kartach poziomu. */
  max: number;
  /** Ile zadań w rundzie (Z-23: 5–10). */
  roundSize: number;
  /** Zadania ułożone ręcznie; runda losuje z nich bez powtórzeń. */
  pool: readonly Puzzle[];
}

/** Poziomy numerowane od 1; `manifest.levels` = LEVELS.length. Poziom nie zależy od wieku (Z-39). */
export const LEVELS: readonly LevelParams[] = [
  {
    max: 10,
    roundSize: 7,
    pool: [
      missing('1-brak-a', '? + 3 = 7', [3, 4, 5, 6], 4),
      missing('1-brak-b', '2 + ? = 8', [5, 6, 7, 8], 6),
      missing('1-brak-c', '9 - ? = 5', [2, 3, 4, 5], 4),
      missing('1-brak-d', '? - 2 = 6', [6, 7, 8, 9], 8),
      missing('1-brak-e', '10 = 6 + ?', [2, 4, 6, 8], 4),
      dice('1-kostki-a', [2, 3], [4, 5, 6, 7], 5),
      dice('1-kostki-b', [6, 2], [6, 7, 8, 9], 8),
      dice('1-kostki-c', [1, 2, 3], [5, 6, 7, 8], 6),
      sequence('1-ciag-a', [1, 2, 3, 4], [4, 5, 6, 7], 5),
      sequence('1-ciag-b', [2, 4, 6, 8], [7, 8, 9, 10], 10),
      pyramid('1-piramidka-a', [[null], [3, 4]], [5, 6, 7, 8], 7),
      pyramid('1-piramidka-b', [[9], [5, null]], [3, 4, 5, 6], 4),
      tiles('1-pola-a', 'floor', ['##.#', '#..#', '####'], [2, 3, 4, 5], 3),
      tiles('1-pola-b', 'wall', ['###.', '..#', '#.##'], [3, 4, 5, 6], 4),
      codeWord('1-kod-a', 'S=1 L=2 A=3 K=4 O=5', [2, 3, 1], ['LAS', 'OSA', 'SOK', 'KOS'], 'LAS'),
      codeWord('1-kod-b', 'D=1 O=2 M=3 K=4 A=5', [3, 5, 4], ['MAK', 'DOM', 'KOD', 'OKO'], 'MAK'),
      codeWord('1-kod-c', 'M=1 A=2 T=3 K=4 O=5', [1, 2, 1, 2], ['MAMA', 'TATA', 'MATA', 'TAMA'], 'MAMA'),
    ],
  },
  {
    max: 20,
    roundSize: 7,
    pool: [
      missing('2-brak-a', '6 + 7 = ? + 5', [6, 7, 8, 9], 8),
      missing('2-brak-b', '9 + ? = 8 + 6', [4, 5, 6, 7], 5),
      missing('2-brak-c', '15 - 3 = 4 + ? + 2', [5, 6, 7, 8], 6),
      pyramid('2-piramidka-a', [[9, 11], [4, null, 6]], [4, 5, 6, 7], 5),
      pyramid('2-piramidka-b', [[null, 16], [7, 6, 10]], [12, 13, 14, 15], 13),
      sameLetter('2-litera-a', 'A', 3, 12, [3, 4, 5, 6], 4),
      sameLetter('2-litera-b', 'K', 4, 20, [4, 5, 6, 7], 5),
      // Karty to wszystkie cztery zestawy, więc liczby a ? b ? c spełniają a ≥ b + c i a + b + c ≤ 20:
      // przy każdej karcie wynik po drodze i na końcu mieści się w 0..20.
      signs('2-znaki-a', '9 ? 5 ? 3 = 11', TWO_SIGNS, '+-'),
      signs('2-znaki-b', '12 ? 4 ? 3 = 11', TWO_SIGNS, '-+'),
      signs('2-znaki-c', '10 ? 3 ? 6 = 19', TWO_SIGNS, '++'),
      target('2-tarcza-a', [1, 3, 5], [5, 3, 3], [9, 10, 11, 12], 11),
      target('2-tarcza-b', [2, 5, 10], [10, 2], [11, 12, 13, 14], 12),
      growing('2-figury-a', 'circle', [['#', '#'], ['##', '##'], ['###', '###']], [7, 8, 9, 10], 8),
      growing('2-figury-b', 'square', [['#'], ['#.', '##'], ['#..', '#..', '###']], [6, 7, 8, 9], 7),
      codeSum('2-kod-a', 'A=1 K=2 S=3 T=4 O=5', 'KOT', [9, 10, 11, 12], 11),
      codeSum('2-kod-b', 'T=1 L=2 A=3 O=4 K=6', 'OKO', [12, 13, 14, 15], 14),
      tiles('2-pola-a', 'floor', ['######', '#....#', '#....#', '###..#'], [9, 10, 11, 12], 10),
    ],
  },
  {
    max: 30,
    roundSize: 7,
    pool: [
      sequence('3-ciag-a', [1, 2, 4, 7, 11], [14, 15, 16, 17], 16),
      sequence('3-ciag-b', [1, 3, 6, 10, 15], [20, 21, 22, 23], 21),
      sequence('3-ciag-c', [30, 29, 27, 24, 20], [13, 14, 15, 16], 15),
      outlined('3-figury-trojkat', 'triangle', 'circle', [['#.', '##'], ['#..', '##.', '###'], ['#...', '##..', '###.', '####']], [13, 14, 15, 16], 15),
      outlined('3-figury-kwadrat', 'square', 'circle', [['##', '##'], ['###', '###', '###'], ['####', '####', '####', '####']], [23, 24, 25, 26], 25),
      outlined(
        '3-figury-krzyzyk',
        'cross',
        'square',
        [
          ['.#.', '###', '.#.'],
          ['..#..', '..#..', '#####', '..#..', '..#..'],
          ['...#...', '...#...', '...#...', '#######', '...#...', '...#...', '...#...'],
        ],
        [15, 16, 17, 18],
        17,
      ),
      pyramid('3-piramidka-a', [[null], ['blank', 'blank'], [3, 5, 4]], [15, 16, 17, 18], 17),
      pyramid('3-piramidka-b', [[null], ['blank', 'blank'], [4, 7, 5]], [21, 22, 23, 24], 23),
      twoLetters('3-litery-a', ['A + A = 12', 'A + B = 10'], 'B', [3, 4, 5, 6], 4),
      twoLetters('3-litery-b', ['K + K + K = 15', 'K + M + M = 21'], 'M', [7, 8, 9, 10], 8),
      signs('3-znaki-a', '12 ? 9 ? 5 ? 7 = 9', ['+--', '-+-', '-++', '++-'], '+--'),
      signs('3-znaki-b', '9 ? 7 ? 4 ? 8 = 20', ['+-+', '++-', '-++', '+++'], '+-+'),
      target('3-tarcza-a', [2, 4, 6, 8], [8, 6, 6, 4, 2], [24, 25, 26, 27], 26),
      target('3-tarcza-b', [1, 5, 10], [10, 5, 5, 1], [19, 20, 21, 22], 21),
      chess('3-szachy-a', CHESS_FRAME, ['5,4', '4,5', '5,5', '4,4'], '5,4'),
      chess('3-szachy-b', CHESS_STAIRS, ['3,5', '5,3', '4,4', '3,4'], '3,5'),
    ],
  },
];

/** Parametry poziomu; numer spoza zakresu (także 0 = „gra bez poziomów”) przycinamy do istniejącego. */
export function levelParams(level: number): LevelParams {
  const index = Math.min(Math.max(Math.round(level), 1), LEVELS.length) - 1;
  return LEVELS[index] as LevelParams;
}

// ---------------------------------------------------------------------------
// Runda i karty
// ---------------------------------------------------------------------------

/**
 * Zadania rundy: `roundSize` różnych zadań z puli poziomu. Typy bierzemy po kolei (po jednym zadaniu
 * z każdego typu, potem znowu), więc w rundzie jest tyle różnych typów, ile się da (przy ≥ 4 typach
 * w puli — co najmniej 4); na końcu kolejność jest mieszana.
 */
export function createTasks(level: number, rng: Rng): Puzzle[] {
  const { pool, roundSize } = levelParams(level);
  const byKind = new Map<PuzzleKind, Puzzle[]>();
  for (const puzzle of rng.shuffle(pool)) {
    const group = byKind.get(puzzle.kind) ?? [];
    group.push(puzzle);
    byKind.set(puzzle.kind, group);
  }
  const queues = rng.shuffle([...byKind.values()]);
  const picked: Puzzle[] = [];
  while (picked.length < roundSize && queues.some((queue) => queue.length > 0)) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next && picked.length < roundSize) picked.push(next);
    }
  }
  return rng.shuffle(picked);
}

/** Karty zadania w kolejności na ekranie i indeks dobrej karty. */
export interface CardLayout {
  cards: Answer[];
  answer: number;
}

const isAscending = (cards: readonly Answer[]) => cards.every((card, i) => i === 0 || cards[i - 1]! < card);

/**
 * Kolejność kart przy pokazaniu zadania: wymieszana i nigdy rosnąca (dziecko ma szukać, a nie
 * brać „kolejnej liczby”; słowa — nie alfabetycznie). Wołana przy każdym pokazaniu, więc zadanie,
 * które wraca, ma inny układ.
 */
export function arrangeCards(puzzle: Puzzle, rng: Rng): CardLayout {
  const all: readonly Answer[] = puzzle.cards;
  let cards = rng.shuffle(all);
  for (let attempt = 0; attempt < 8 && isAscending(cards); attempt++) cards = rng.shuffle(all);
  // Rzadki przypadek, gdy losowanie uparcie daje kolejność rosnącą: zamiana dwóch pierwszych kart.
  if (isAscending(cards)) cards = [cards[1]!, cards[0]!, ...cards.slice(2)];
  return { cards, answer: cards.indexOf(puzzle.answer) };
}

// ---------------------------------------------------------------------------
// Tarcza — położenie pierścieni, liczb i kropek (czysta geometria, rysuje figures.ts)
// ---------------------------------------------------------------------------

/** Położenie elementów tarczy w jednostkach viewBox (kwadrat `size` × `size`, środek w (`center`, `center`)). */
export interface TargetLayout {
  size: number;
  center: number;
  /** Promień zewnętrznego brzegu pierścienia k (0 = zewnętrzny, ostatni = środkowe koło). */
  radii: number[];
  /** Czcionka liczb pierścieni. */
  font: number;
  /** Środek liczby pierścienia k (liczby pierścieni u góry tarczy, liczba środka w środku, nad kropkami). */
  labels: { x: number; y: number }[];
  /** Środek kropki i jej zasięg razem z obwódką — w kolejności trafień. */
  dots: { x: number; y: number; r: number }[];
}

/**
 * Wymiary tarczy: promień zewnętrzny, odstęp od brzegu rysunku, odstęp kropki i liczby od brzegów pasa,
 * największa kropka (z obwódką) i czcionka. Szerokość i wysokość cyfry (ułamki czcionki) służą do
 * omijania liczb — z zapasem względem pogrubionego kroju platformy.
 */
const TARGET_GEOMETRY = { outer: 160, pad: 4, margin: 4, maxDot: 14, maxFont: 44, digitW: 0.62, digitH: 0.8 };

/**
 * Promień środkowego koła: przy 3 pierścieniach 66, przy 4 i więcej 44 — węższe środkowe koło daje
 * pasom pierścieni więcej miejsca, więc ich liczby są większe (czytelne na telefonie).
 */
const innerRadius = (count: number) => (count <= 3 ? 66 : 44);

/**
 * Przesunięcie kropek w pierścieniu k (ułamek odstępu między kropkami), żeby pojedyncze trafienia
 * w kolejnych pierścieniach nie stały w jednej linii.
 */
const RING_PHASE = [0.5, 0.3, 0.7, 0.4, 0.6];

/**
 * Tarcza dla pierścieni `rings` (od brzegu do środka) i trafień `hits` (wartości pierścieni). Pierścienie
 * mają równą szerokość; liczba pierścienia stoi u góry w połowie jego szerokości. Kropki pierścienia leżą
 * na jego środkowym okręgu, w równych odstępach na łuku omijającym liczbę u góry. Kropki środka stoją
 * łukiem w dolnej części koła, a liczba środka nad nimi. Mieści do 5 trafień w każdym pierścieniu
 * i do 3 w środku (przy 4–5 pierścieniach do 2) — pilnuje test.
 */
export function targetLayout(rings: readonly number[], hits: readonly number[]): TargetLayout {
  const { outer, pad, margin, maxDot, maxFont, digitW, digitH } = TARGET_GEOMETRY;
  const count = rings.length;
  const inner = innerRadius(count);
  const band = (outer - inner) / Math.max(count - 1, 1);
  const last = count - 1;
  const center = pad + outer;
  const radii = rings.map((_, k) => (k === last ? inner : outer - k * band));
  const dot = Math.min(maxDot, (band - 2 * margin) / 2);
  const font = Math.min(maxFont, (band - 2 * margin) / digitH);
  const halfWidth = (value: number) => (String(value).length * digitW * font) / 2;

  const perRing = rings.map((value) => hits.filter((hit) => hit === value).length);
  const used = rings.map(() => 0);
  const deg = Math.PI / 180;

  // Kropki środka: łuk wokół kierunku „w dół”, sąsiednie kropki z odstępem `margin`.
  const centerDistance = inner - margin - dot;
  const centerStep = 2 * Math.asin(Math.min(1, (dot + margin / 2) / centerDistance)) * 1.15;
  const centerAngle = (i: number) => 90 * deg + (i - (perRing[last]! - 1) / 2) * centerStep;
  // Liczba środka nad najwyższą kropką (albo w samym środku, gdy kropek jest mało).
  const highestDot = perRing[last]! > 0 ? Math.min(...Array.from({ length: perRing[last]! }, (_, i) => centerDistance * Math.sin(centerAngle(i)))) - dot : Infinity;
  const centerLabelY = Math.min(0, highestDot - margin - (digitH * font) / 2);

  const labels = rings.map((_, k) => ({ x: center, y: k === last ? center + centerLabelY : center - (radii[k]! - band / 2) }));

  const dots = hits.map((hit) => {
    const k = rings.indexOf(hit);
    const i = used[k]!++;
    if (k === last) {
      const a = centerAngle(i);
      return { x: center + centerDistance * Math.cos(a), y: center + centerDistance * Math.sin(a), r: dot };
    }
    const mid = radii[k]! - band / 2;
    // Łuk bez wycinka u góry, w którym stoi liczba pierścienia.
    const skip = Math.asin(Math.min(1, (halfWidth(rings[k]!) + dot + margin) / mid));
    const span = 2 * Math.PI - 2 * skip;
    const a = -90 * deg + skip + (span * (i + (RING_PHASE[k % RING_PHASE.length] ?? 0.5))) / perRing[k]!;
    return { x: center + mid * Math.cos(a), y: center + mid * Math.sin(a), r: dot };
  });

  return { size: 2 * center, center, radii, font, labels, dots };
}
