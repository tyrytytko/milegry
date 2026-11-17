/**
 * „Literki z imienia” — reguły gry. Czyste funkcje: bez DOM, bez Math.random, bez czasu.
 * Metoda odimienna: pierwsze litery dziecko poznaje z własnego imienia. Litery trzymamy jako WIELKIE
 * (jak Intent.value); wielkość i krój na ekranie wybiera rodzic (ctx.ui.letter).
 */
import type { Rng } from '../../core/types';
import { BASE_ALPHABET, DIACRITICS, baseLetter, normalizeLetter } from '../../core/util/letters';

export interface LevelDef {
  /** Wzór nad kratkami: steady — stoi cały czas; fade — znika po chwili, wraca po błędzie; hidden — tylko po błędzie. */
  pattern: 'steady' | 'fade' | 'hidden';
  /** Litera wzoru nad bieżącą kratką jest wyróżniona. */
  marker: boolean;
  /** W bieżącej kratce widać blady „duch” litery. */
  ghost: boolean;
  /** Najwięcej przycisków z literami na dotyku (razem ze zmyłkami). */
  keys: number;
  /** Ile przycisków to litery spoza słowa. */
  decoys: number;
}

/** `manifest.levels` = LEVELS.length. */
export const LEVELS: readonly LevelDef[] = [
  { pattern: 'steady', marker: true, ghost: true, keys: 3, decoys: 0 },
  { pattern: 'steady', marker: true, ghost: false, keys: 6, decoys: 0 },
  { pattern: 'steady', marker: false, ghost: false, keys: 6, decoys: 2 },
  { pattern: 'fade', marker: false, ghost: false, keys: 6, decoys: 2 },
  { pattern: 'hidden', marker: false, ghost: false, keys: 6, decoys: 2 },
];

/** Słowa układane, gdy rodzic nie wpisał imienia: krótkie, bliskie dziecku, bez diakrytyków (Z-31). */
export const WORDS: readonly string[] = ['MAMA', 'TATA', 'DOM', 'KOT', 'LAS', 'OKO'];

/** Najwięcej liter w słowie (panel rodzica dopuszcza 20 znaków). */
export const MAX_LETTERS = 20;
/** Po ilu ms czasu gry wzór przygasa na poziomie „fade”. */
export const FADE_MS = 3000;

const LETTER = /^[A-ZĄĆĘŁŃÓŚŹŻ]$/;

/** Jedno zadanie: wskaż literę na miejscu `pos`. */
export interface Task {
  /** Które słowo rundy układamy (indeks w `Round.words`). */
  word: number;
  /** Numer litery w słowie (od 0; odstępy się nie liczą). */
  pos: number;
  letter: string;
  /** Pierwsza litera kolejnego ułożenia słowa — kratki zaczynają puste. */
  lapStart: boolean;
  /** Litery na przyciskach ekranowych (dotyk), różne, zawsze z `letter`. */
  keys: string[];
  /**
   * Tylko litera z ogonkiem: trzy różne litery kafelków na klawiaturze — ona sama, jej wersja bez ogonka
   * i trzecia inna. Wybór strzałkami + Spacją albo klawiszem litery z kafelka; AltGr niewymagany (Z-31).
   */
  choices: string[] | null;
}

export interface Word {
  /** Komórki na ekranie: litery oraz stałe odstępy ' ' i '-'. */
  cells: string[];
  /** Same litery słowa, po kolei. */
  letters: string[];
}

export interface Round {
  /** Różne słowa rundy: imię to jedno słowo (układane raz albo kilka razy), słowa domyślne — kilka różnych. */
  words: Word[];
  tasks: Task[];
}

/** Definicja poziomu; numer spoza zakresu przycinamy do istniejącego. */
export function levelDef(level: number): LevelDef {
  const index = Math.min(Math.max(Math.round(level) || 1, 1), LEVELS.length) - 1;
  return LEVELS[index] as LevelDef;
}

/**
 * Imię → komórki: WIELKIE litery (także Q, V, X i polskie znaki) oraz pojedyncze odstępy ' ' albo '-' między
 * częściami („ANNA MARIA”, „JAN-PAWEŁ”). Inne znaki znikają, odstępów nie ma na brzegach, liter jest ≤ MAX_LETTERS.
 */
export function parseName(raw: unknown): string[] {
  if (typeof raw !== 'string') return [];
  const cells: string[] = [];
  let gap = '';
  let count = 0;
  for (const ch of raw) {
    const upper = normalizeLetter(ch);
    if (LETTER.test(upper)) {
      if (count === MAX_LETTERS) break;
      if (gap && cells.length > 0) cells.push(gap);
      gap = '';
      cells.push(upper);
      count++;
    } else if (ch === '-') gap = '-';
    else if (/\s/.test(ch)) gap ||= ' ';
  }
  return cells;
}

/** Co układamy: imię z ustawień, a bez niego słowo z listy — numer `index` licząc od słowa poziomu. */
export function pickWord(name: unknown, level: number, index: number): string {
  if (typeof name === 'string' && parseName(name).length > 0) return name;
  const shift = Number.isFinite(index) && index > 0 ? Math.floor(index) : 0;
  const start = Math.max(Math.round(level) || 1, 1) - 1;
  return WORDS[(start + shift) % WORDS.length] as string;
}

/** Ile razy układamy imię w rundzie: tyle, żeby wyszło ≥ 5 zadań (Z-23); długie imię — raz. */
export function lapsFor(letters: number): number {
  return Math.max(1, Math.ceil(5 / Math.max(letters, 1)));
}

/** Słów domyślnych w rundzie: tyle wystarcza na ≥ 5 zadań (Z-23), bo każde ma ≥ 3 litery (test). */
const WORDS_PER_ROUND = 2;

/**
 * Kolejne ułożenia w rundzie `turn`: krótkie imię powtarzamy (dziecko układa własne imię), a słów domyślnych
 * nie — bez imienia runda to różne słowa z listy, inne niż w rundzie obok.
 */
export function roundWords(name: unknown, level: number, turn: number): string[] {
  if (typeof name === 'string') {
    const letters = parseName(name).filter((c) => LETTER.test(c)).length;
    if (letters > 0) return Array.from({ length: lapsFor(letters) }, () => name);
  }
  const first = (Number.isFinite(turn) && turn > 0 ? Math.floor(turn) : 0) * WORDS_PER_ROUND;
  return Array.from({ length: WORDS_PER_ROUND }, (_, i) => pickWord(null, level, first + i));
}

/** Komórek w rzędzie najwyżej: wąska scena (pion) i szeroka (poziom). */
export const MAX_COLS = { narrow: 5, wide: 10 } as const;

/** Miejsce komórki w siatce (od 1); null — odstęp, który nie zmieścił się na końcu rzędu (nie rysujemy go). */
export type Place = { row: number; col: number } | null;

/**
 * Układ komórek w rzędach po ≤ `max`: części imienia („JAN”, „PAWEŁ”) nie dzielimy między rzędy, jeśli się
 * mieszczą; odstęp zostaje na końcu rzędu („JAN-” / „PAWEŁ”). Część dłuższą niż `max` dzielimy na równe kawałki.
 */
export function layout(cells: readonly string[], max: number): { cols: number; rows: number; places: Place[] } {
  const lines: number[][] = [];
  const places: Place[] = cells.map(() => null);
  let word: number[] = [];
  const flush = (gap: number | null) => {
    let line = lines[lines.length - 1];
    if (word.length > max) {
      const per = Math.ceil(word.length / Math.ceil(word.length / max));
      for (let i = 0; i < word.length; i += per) lines.push((line = word.slice(i, i + per)));
    } else if (word.length > 0) {
      if (!line || line.length + word.length > max) lines.push((line = []));
      line.push(...word);
    }
    if (gap !== null && line && line.length < max) line.push(gap);
    word = [];
  };
  cells.forEach((c, i) => (c === ' ' || c === '-' ? flush(i) : word.push(i)));
  flush(null);
  lines.forEach((line, r) => line.forEach((i, c) => (places[i] = { row: r + 1, col: c + 1 })));
  return { cols: Math.max(1, ...lines.map((l) => l.length)), rows: Math.max(1, lines.length), places };
}

/** Runda dla imienia (albo słowa domyślnego), poziomu i numeru rundy `turn`. */
export function createRound(name: unknown, level: number, turn: number, rng: Rng): Round {
  const def = levelDef(level);
  // Przyciski i zmyłki ustalamy raz na słowo — powtarzane imię ma je te same w każdym ułożeniu.
  const plan = (text: string) => {
    const cells = parseName(text);
    const letters = cells.filter((c) => LETTER.test(c));
    const own = [...new Set(letters)];
    // Zmyłki: litery bez ogonków, których nie ma w słowie — także nie „L” przy „Ł” (zbyt podobne na start).
    const bases = new Set(letters.map(baseLetter));
    const outside = rng.shuffle(BASE_ALPHABET.filter((l) => !bases.has(l)));
    const decoys = outside.slice(0, def.decoys);
    const room = def.keys - decoys.length;
    // Litery słowa mieszczą się na przyciskach → jeden zestaw na całe słowo (przyciski stoją w miejscu, Z-02).
    const fixed = own.length <= room ? rng.shuffle([...own, ...decoys]) : null;
    return { cells, letters, own, decoys, spare: outside[def.decoys] as string, room, fixed };
  };

  const texts: string[] = [];
  const plans: ReturnType<typeof plan>[] = [];
  const tasks: Task[] = [];
  for (const text of roundWords(name, level, turn)) {
    let word = texts.indexOf(text);
    if (word < 0) {
      word = texts.push(text) - 1;
      plans.push(plan(text));
    }
    const { letters, own, decoys, spare, room, fixed } = plans[word] as ReturnType<typeof plan>;
    letters.forEach((letter, pos) => {
      const others = rng.shuffle(own.filter((l) => l !== letter));
      const keys = fixed ?? rng.shuffle([letter, ...others.slice(0, room - 1), ...decoys]);
      let choices: string[] | null = null;
      if (DIACRITICS.includes(letter)) {
        const base = baseLetter(letter);
        const third = others.find((l) => baseLetter(l) !== base) ?? spare;
        choices = rng.shuffle([letter, base, third]);
      }
      tasks.push({ word, pos, letter, lapStart: pos === 0, keys, choices });
    });
  }
  return { words: plans.map(({ cells, letters }) => ({ cells, letters })), tasks };
}
