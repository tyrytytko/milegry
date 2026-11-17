/**
 * „Literki bliźniaczki” — reguły gry. Czyste funkcje: bez DOM, bez Math.random, bez czasu.
 * Tabela poziomów i pary mylące: README gry; ich niezależna kopia jest w logic.test.ts.
 * Litery trzymamy jako WIELKIE (jak Intent.value); wielkość i krój na ekranie wynikają z `forms`.
 */
import type { LetterCase, LetterScript, Rng } from '../../core/types';
import { ALPHABET } from '../../core/util/letters';

/** pd — wzór pisany, żołędzie drukowane; dp — odwrotnie. */
export type Direction = 'pd' | 'dp';
/** upper — wielkie obu krojów; lower — małe obu krojów; bridge — mała pisana ↔ WIELKA drukowana. */
export type LevelCase = 'upper' | 'lower' | 'bridge';

export interface LevelDef {
  case: LevelCase;
  /** Litery-cele poziomu. */
  targets: readonly string[];
  /** Dodatkowe litery tylko na zmyłki (pary mylące spoza zestawu celów). */
  extraDistractors: readonly string[];
  /** Ile żołędzi do wyboru. */
  options: 2 | 3 | 4;
  /**
   * true — mała „bliźniaczka” wzoru w kroju żołędzi widoczna od początku (podpowiedź „stała”); false — tylko drabina
   * rdzenia (poziomy „po chwili” i „po błędzie” nie mają własnej podpowiedzi).
   */
  constantHint: boolean;
  /** mix — zadania na przemian: 1., 3., … pd; 2., 4., … dp. */
  direction: Direction | 'mix';
}

/** Jedno zadanie: do wzoru `target` wybierz żołądź z tą samą literą. */
export interface Task {
  target: string;
  /** Litery na żołędziach w kolejności na ekranie (różne). */
  options: string[];
  /** Indeks w `options` litery równej `target`. */
  answer: number;
  direction: Direction;
}

export interface LetterForm {
  script: LetterScript;
  case: LetterCase;
}

/** Zadań w rundzie (Z-23). */
export const ROUND_TASKS = 8;

const L = (s: string): readonly string[] => s.split(' ');
const lvl = (c: LevelCase, targets: readonly string[], options: 2 | 3 | 4, constantHint: boolean, direction: Direction | 'mix', extra = ''): LevelDef => ({
  case: c,
  targets,
  extraDistractors: extra ? L(extra) : [],
  options,
  constantHint,
  direction,
});

/** Poziomy wg tabeli w specyfikacji (6.2). `manifest.levels` = LEVELS.length. */
export const LEVELS: readonly LevelDef[] = [
  lvl('upper', L('O C S U Z P'), 2, true, 'pd'),
  lvl('upper', L('B D R W T I F'), 2, true, 'pd'),
  lvl('upper', L('O C S U Z P B D R W T I F'), 3, false, 'pd'),
  lvl('upper', L('A E M N'), 2, true, 'pd'),
  lvl('upper', L('H K L Ł'), 2, true, 'pd'),
  lvl('upper', L('G Y J'), 3, true, 'pd', 'T I U'),
  lvl('upper', L('A E M N H K L Ł G Y J'), 3, false, 'pd'),
  lvl('upper', ALPHABET, 4, false, 'mix'),
  lvl('lower', L('O C A D E I U'), 2, true, 'pd'),
  lvl('lower', L('L T H K M N J Y G'), 3, false, 'pd'),
  lvl('lower', L('B P F W Ł'), 2, true, 'pd'),
  lvl('lower', L('R S Z'), 3, true, 'pd', 'N C'),
  lvl('lower', ALPHABET, 4, false, 'mix'),
  lvl('bridge', L('O C U W Z K P Y I J T'), 3, false, 'pd'),
  lvl('bridge', L('A B D E F G H L M N R S'), 3, true, 'pd'),
  lvl('bridge', ALPHABET, 4, false, 'mix'),
];

/**
 * Pary (grupy) łatwe do pomylenia, ze specyfikacji 2.4 — to pary liter PISANYCH (wielkich albo małych). Most (`bridge`)
 * zawsze pokazuje małą pisaną (jako wzór w `pd`, jako żołędzie w `dp`), więc w obu kierunkach bierze tabelę małych.
 */
export const CONFUSABLE: Record<'upper' | 'lower', readonly (readonly string[])[]> = {
  upper: ['T F I J', 'G Y J', 'M N', 'U Y', 'L Ł', 'C E', 'H K', 'O Ó', 'Z Ź Ż', 'S Ś'].map(L),
  lower: ['M N', 'N P', 'U W', 'U Y', 'G Y J', 'L Ł T', 'B L', 'A O D', 'R Z S', 'C E', 'I J'].map(L),
};

/** Definicja poziomu; numer spoza zakresu przycinamy do istniejącego. */
export function levelDef(level: number): LevelDef {
  const index = Math.min(Math.max(Math.round(level), 1), LEVELS.length) - 1;
  return LEVELS[index] as LevelDef;
}

/**
 * Czy na żołędziach tego poziomu pojawiają się MAŁE litery (w którymkolwiek zadaniu). Pisane małe mają pętle nad i pod
 * linią (f, g, j, y) — żołądź musi być wyższy, a ponieważ scena stoi przez całą rundę (Z-02), wysokość jest stała
 * na poziom, nie na zadanie.
 */
export function hasLowerChoices(def: LevelDef): boolean {
  return def.case === 'lower' || (def.case === 'bridge' && def.direction === 'mix');
}

/** Wszystkie litery, które mogą trafić na żołędzie: cele + dodatkowe zmyłki. */
export function pool(def: LevelDef): string[] {
  return [...new Set([...def.targets, ...def.extraDistractors])];
}

/** Krój i wielkość wzoru (`pattern`) oraz liter na żołędziach (`choice`). */
export function forms(levelCase: LevelCase, direction: Direction): { pattern: LetterForm; choice: LetterForm } {
  const cursive: LetterCase = levelCase === 'upper' ? 'upper' : 'lower';
  const print: LetterCase = levelCase === 'lower' ? 'lower' : 'upper';
  const c: LetterForm = { script: 'cursive', case: cursive };
  const p: LetterForm = { script: 'print', case: print };
  return direction === 'pd' ? { pattern: c, choice: p } : { pattern: p, choice: c };
}

/** Kolejność liter-celów: zestaw ≤ 8 — kolejne przetasowane „okrążenia” zestawu; większy — 8 różnych. */
function pickTargets(targets: readonly string[], rng: Rng): string[] {
  if (targets.length > ROUND_TASKS) return rng.shuffle(targets).slice(0, ROUND_TASKS);
  const result: string[] = [];
  while (result.length < ROUND_TASKS) {
    const lap = rng.shuffle(targets);
    // Bez tej samej litery w dwóch kolejnych zadaniach (na styku okrążeń).
    if (lap[0] === result[result.length - 1]) [lap[0], lap[1]] = [lap[1] as string, lap[0] as string];
    result.push(...lap);
  }
  return result.slice(0, ROUND_TASKS);
}

/** Zmyłki: różne od celu i od siebie; co najmniej jedna z par mylących, jeśli taka jest w puli. */
function pickDecoys(target: string, def: LevelDef, rng: Rng): string[] {
  const table = CONFUSABLE[def.case === 'upper' ? 'upper' : 'lower'];
  const others = pool(def).filter((l) => l !== target);
  const near = others.filter((l) => table.some((g) => g.includes(target) && g.includes(l)));
  const first = near.length > 0 ? [rng.pick(near)] : [];
  const rest = rng.shuffle(others.filter((l) => !first.includes(l)));
  return [...first, ...rest].slice(0, def.options - 1);
}

/** Zadania całej rundy dla poziomu (dokładnie ROUND_TASKS). */
export function createTasks(level: number, rng: Rng): Task[] {
  const def = levelDef(level);
  const places: number[] = [];
  return pickTargets(def.targets, rng).map((target, i) => {
    // Miejsce poprawnego żołędzia: losowe, ale nie 4 razy z rzędu to samo.
    const last = places.slice(-3);
    const blocked = last.length === 3 && last.every((p) => p === last[0]) ? last[0] : -1;
    const free = Array.from({ length: def.options }, (_, p) => p).filter((p) => p !== blocked);
    const answer = rng.pick(free);
    places.push(answer);
    const options = rng.shuffle(pickDecoys(target, def, rng));
    options.splice(answer, 0, target);
    const direction: Direction = def.direction === 'mix' ? (i % 2 === 0 ? 'pd' : 'dp') : def.direction;
    return { target, options, answer, direction };
  });
}
