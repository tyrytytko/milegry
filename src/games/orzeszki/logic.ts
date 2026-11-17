/**
 * „Liczymy orzeszki” — reguły gry. Czyste funkcje: bez DOM, bez Math.random, bez czasu.
 * Losowość wchodzi parametrem (Rng z ctx.rng), więc to samo ziarno w teście daje te same zadania.
 *
 * Polana to siatka 5 × 3 pól (pole = kwadrat, polana ma proporcje 5 : 3). Pozycje podajemy w procentach
 * polany, rozmiar elementu jako ułamek boku pola — widok nie musi nic przeliczać.
 */
import type { Rng } from '../../core/types';

/** Układ orzeszków: rząd, kostka do gry, ramka (rząd po 5, potem drugi) albo rozsypane. */
export type Layout = 'row' | 'dice' | 'frame' | 'scatter';

/** Orzeszek (liczymy go) albo liść (dystraktor — nie liczymy). */
export interface Item {
  kind: 'nut' | 'leaf';
  /** Środek elementu w % szerokości i wysokości polany. */
  x: number;
  y: number;
  /** Bok elementu jako ułamek boku pola siatki (≤ 0,78, żeby sąsiedzi się nie stykali). */
  size: number;
  /** Obrót w stopniach. */
  tilt: number;
}

/** Jedno zadanie: ile orzeszków leży na polanie? */
export interface Task {
  /** Poprawna odpowiedź = liczba elementów `nut`. */
  count: number;
  layout: Layout;
  items: Item[];
}

export interface LevelParams {
  /** Zakres odpowiedzi (włącznie). */
  min: number;
  max: number;
  layouts: readonly Layout[];
  /** Orzeszki różnej wielkości (pułapka percepcyjna: duży ≠ więcej). */
  mixedSizes: boolean;
  /** Najwięcej liści-dystraktorów na polanie (0 = brak). */
  leaves: number;
  /** Ile zadań w rundzie (Z-23: 5–10). */
  tasks: number;
  /** Cyfry na klawiaturze ekranowej (dotyk): tylko te, które mogą paść w odpowiedzi. */
  keys: number[];
}

const UP_TO_3 = [1, 2, 3];
const UP_TO_5 = [1, 2, 3, 4, 5];
const UP_TO_10 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

/** Poziomy numerowane od 1; `manifest.levels` = LEVELS.length. Poziom nie zależy od wieku (Z-39). */
export const LEVELS: readonly LevelParams[] = [
  { min: 1, max: 3, layouts: ['row'], mixedSizes: false, leaves: 0, tasks: 5, keys: UP_TO_3 },
  { min: 1, max: 5, layouts: ['row', 'dice'], mixedSizes: false, leaves: 0, tasks: 6, keys: UP_TO_5 },
  { min: 2, max: 5, layouts: ['scatter'], mixedSizes: true, leaves: 0, tasks: 6, keys: UP_TO_5 },
  { min: 3, max: 10, layouts: ['frame'], mixedSizes: false, leaves: 0, tasks: 7, keys: UP_TO_10 },
  { min: 4, max: 10, layouts: ['scatter'], mixedSizes: true, leaves: 4, tasks: 8, keys: UP_TO_10 },
];

/** Parametry poziomu; numer spoza zakresu (także 0 = „gra bez poziomów”) przycinamy do istniejącego. */
export function levelParams(level: number): LevelParams {
  const index = Math.min(Math.max(Math.round(level), 1), LEVELS.length) - 1;
  return LEVELS[index] as LevelParams;
}

/** Siatka polany: 5 kolumn × 3 rzędy; szerokość i wysokość pola w % polany. */
const COLS = 5;
const ROWS = 3;
export const CELL_X = 100 / COLS;
export const CELL_Y = 100 / ROWS;

export const NUT_SIZE = 0.74;
/** Rozmiary orzeszków na poziomach z `mixedSizes`. Najmniejszy ≥ ~36 px na telefonie 375 × 812 (polana ≈ 300 px). */
export const MIXED_SIZES = [0.62, 0.7, 0.78] as const;
/** Jaką część wolnego miejsca w polu (pole minus element) wolno wykorzystać na przesunięcie rozsypanego elementu. */
const SCATTER_SHARE = 0.8;

/**
 * Najdalsze przesunięcie rozsypanego elementu ze środka pola (w polach, w każdej osi). Element zostaje wewnątrz
 * własnego pola z zapasem (1 − SCATTER_SHARE) wolnego miejsca, więc dwa elementy w różnych polach nigdy się
 * nie stykają — niezależnie od wielkości — a mniejsze rozsypują się szerzej niż duże.
 */
export const jitterFor = (size: number): number => ((1 - size) / 2) * SCATTER_SHARE;

/** Ile milisekund trwa pojedyncze „zapalenie” orzeszka po dobrej odpowiedzi (== --mg-dur-base, Z-03). */
export const COUNT_ANIMATION_MS = 400;
/** Reakcja na dobrą odpowiedź musi się zmieścić w tym czasie (Z-20). */
export const COUNT_BUDGET_MS = 800;

/**
 * Odstęp w zapalaniu kolejnych orzeszków: najwyżej 60 ms, a przy wielu orzeszkach mniejszy, tak by cała reakcja
 * (ostatni orzeszek zaczyna się po (n − 1) krokach i trwa jeszcze COUNT_ANIMATION_MS) mieściła się w 800 ms.
 */
export function countStepMs(count: number): number {
  if (count <= 1) return 0;
  return Math.min(60, Math.floor((COUNT_BUDGET_MS - COUNT_ANIMATION_MS) / (count - 1)));
}

/** Pozycje w polach siatki (x, y), środek pola = połowa. */
type Spot = readonly [number, number];

const DICE: Record<number, Spot[]> = {
  1: [[2.5, 1.5]],
  2: [[1.5, 0.5], [3.5, 2.5]],
  3: [[1.5, 0.5], [2.5, 1.5], [3.5, 2.5]],
  4: [[1.5, 0.5], [3.5, 0.5], [1.5, 2.5], [3.5, 2.5]],
  5: [[1.5, 0.5], [3.5, 0.5], [2.5, 1.5], [1.5, 2.5], [3.5, 2.5]],
};

/** Pozycje orzeszków w uporządkowanych układach (rząd, kostka, ramka). */
function orderedSpots(layout: Layout, count: number, rng: Rng): Spot[] {
  if (layout === 'dice') {
    const spots = DICE[count] ?? [];
    return rng.chance(0.5) ? spots.map(([x, y]) => [COLS - x, y] as Spot) : spots;
  }
  if (layout === 'frame') {
    // Ramka: pięć w górnym rzędzie, reszta w dolnym, od lewej.
    return Array.from({ length: count }, (_, i) => [(i % 5) + 0.5, i < 5 ? 1 : 2] as Spot);
  }
  // Rząd: wyśrodkowany, jedno pole na orzeszek.
  return Array.from({ length: count }, (_, i) => [COLS / 2 + (i - (count - 1) / 2), 1.5] as Spot);
}

const rowOf = (cell: number) => Math.floor(cell / COLS);

/**
 * Pola dla rozsypanych orzeszków (pierwsze `count` z tasowanej listy), od 3 orzeszków wzwyż w co najmniej dwóch
 * rzędach — jeden rząd wyglądałby jak układ „w rzędzie”, a to osobna umiejętność (poziomy 1–2).
 */
function scatterCells(count: number, rng: Rng): number[] {
  const cells = rng.shuffle(Array.from({ length: COLS * ROWS }, (_, i) => i));
  if (count >= 3 && cells.slice(0, count).every((cell) => rowOf(cell) === rowOf(cells[0] as number))) {
    const other = cells.findIndex((cell, i) => i >= count && rowOf(cell) !== rowOf(cells[0] as number));
    [cells[count - 1], cells[other]] = [cells[other] as number, cells[count - 1] as number];
  }
  return cells;
}

/**
 * Rozmiary orzeszków. Gdy poziom miesza rozmiary, od 2 orzeszków wzwyż są co najmniej dwa różne —
 * inaczej zadanie nie byłoby pułapką „duży ≠ więcej”.
 */
function nutSizes(params: LevelParams, count: number, rng: Rng): number[] {
  if (!params.mixedSizes) return Array.from({ length: count }, () => NUT_SIZE);
  const sizes = Array.from({ length: count }, () => rng.pick(MIXED_SIZES) as number);
  if (count >= 2 && sizes.every((size) => size === sizes[0])) {
    sizes[count - 1] = rng.pick(MIXED_SIZES.filter((size) => size !== sizes[0]));
  }
  return sizes;
}

/** Jeden pełny układ polany: orzeszki (i liście) z pozycjami, wielkościami i obrotem. */
function createTask(params: LevelParams, count: number, rng: Rng): Task {
  const layout = rng.pick(params.layouts);
  const sizes = nutSizes(params, count, rng);
  const nuts: Item[] = [];
  const leaves: Item[] = [];
  if (layout === 'scatter') {
    const cells = scatterCells(count, rng);
    const leafCount = params.leaves > 0 ? rng.int(1, Math.min(params.leaves, cells.length - count)) : 0;
    /** Środek pola przesunięty losowo, ale tak, by element o rozmiarze `size` został w swoim polu. */
    const spot = (cell: number, size: number): Spot => {
      const jitter = jitterFor(size);
      return [
        (cell % COLS) + 0.5 + (rng.next() * 2 - 1) * jitter,
        rowOf(cell) + 0.5 + (rng.next() * 2 - 1) * jitter,
      ];
    };
    cells.slice(0, count).forEach((cell, i) => {
      const size = sizes[i] as number;
      const [x, y] = spot(cell, size);
      nuts.push({ kind: 'nut', x: x * CELL_X, y: y * CELL_Y, size, tilt: rng.int(-25, 25) });
    });
    cells.slice(count, count + leafCount).forEach((cell) => {
      const [x, y] = spot(cell, NUT_SIZE);
      leaves.push({ kind: 'leaf', x: x * CELL_X, y: y * CELL_Y, size: NUT_SIZE, tilt: rng.int(0, 359) });
    });
  } else {
    orderedSpots(layout, count, rng).forEach(([x, y], i) => {
      nuts.push({ kind: 'nut', x: x * CELL_X, y: y * CELL_Y, size: sizes[i] as number, tilt: 0 });
    });
  }
  return { count, layout, items: [...nuts, ...leaves] };
}

/**
 * Odpowiedzi całej rundy: kolejne różne; na poziomach do 10 raz pada „10” (odpowiedź z dwóch cyfr),
 * nigdy na samym początku rundy.
 */
function createCounts({ min, max, tasks }: LevelParams, rng: Rng): number[] {
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const ten = max === 10 ? rng.int(1, tasks - 1) : -1;
  const counts: number[] = [];
  for (let i = 0; i < tasks; i++) {
    if (i === ten) {
      counts.push(10);
      continue;
    }
    const banned = [counts[i - 1], ten >= 0 ? 10 : undefined]; // „10” pada tylko w wybranym miejscu
    counts.push(rng.pick(values.filter((value) => !banned.includes(value))));
  }
  return counts;
}

/** Zadania całej rundy dla poziomu. */
export function createTasks(level: number, rng: Rng): Task[] {
  const params = levelParams(level);
  return createCounts(params, rng).map((count) => createTask(params, count, rng));
}
