/**
 * „Każdemu po jednym” — reguły gry. Czyste funkcje: bez DOM, bez Math.random, bez czasu.
 * Losowość wchodzi parametrem (Rng z ctx.rng), więc to samo ziarno w teście daje te same zadania.
 *
 * Dwa tryby wybierane poziomem:
 * - `deal` — rozdawanie: jeżyki czekają przy stoliku, dziecko daje każdemu po jednym jabłku (1:1);
 * - `choose` — wybór: która tacka ma tyle jabłek, ile jest jeżyków / ile mówi cyfra (zbiór ↔ zbiór, zbiór ↔ cyfra).
 *
 * Tacka to siatka 5 × 2 pól (pole = kwadrat, tacka ma proporcje 5 : 2). Pozycje jabłek w procentach tacki,
 * rozmiar jako ułamek boku pola — widok nie musi nic przeliczać.
 */
import type { Rng } from '../../core/types';

export interface DealLevel {
  mode: 'deal';
  /** Ile jeżyków przy stoliku (włącznie). */
  min: number;
  max: number;
  /** Czy w koszyku bywa jedno jabłko więcej niż jeżyków (zostaje, gdy każdy już ma). */
  extra: boolean;
  /** Ile stolików w rundzie (Z-23: 5–10). */
  tasks: number;
}

/** Obiekt pytania w trybie wyboru: rząd jeżyków albo kafelek z cyfrą. */
export type Prompt = 'hedgehogs' | 'digit';
/** Układ jabłek na tacce: rząd, ramka (pięć u góry, reszta niżej) albo rozsypane. */
export type Layout = 'row' | 'frame' | 'scatter';

export interface ChooseLevel {
  mode: 'choose';
  prompt: Prompt;
  /** Zakres liczebności tacek (włącznie). */
  min: number;
  max: number;
  layouts: readonly Layout[];
  /** Ile tacek do wyboru (2–3). */
  options: number;
  /** Tacki z jabłkami różnej wielkości (pułapka „duży ≠ więcej”). */
  mixedSizes: boolean;
  tasks: number;
}

export type LevelParams = DealLevel | ChooseLevel;

/** Poziomy numerowane od 1; `manifest.levels` = LEVELS.length. Poziom nie zależy od wieku (Z-39). */
export const LEVELS: readonly LevelParams[] = [
  { mode: 'deal', min: 2, max: 3, extra: false, tasks: 5 },
  { mode: 'deal', min: 3, max: 5, extra: true, tasks: 5 },
  { mode: 'choose', prompt: 'hedgehogs', min: 2, max: 5, layouts: ['scatter'], options: 3, mixedSizes: false, tasks: 6 },
  { mode: 'choose', prompt: 'digit', min: 1, max: 5, layouts: ['row', 'scatter'], options: 3, mixedSizes: false, tasks: 6 },
  { mode: 'choose', prompt: 'digit', min: 3, max: 10, layouts: ['frame', 'scatter'], options: 3, mixedSizes: true, tasks: 7 },
];

/** Parametry poziomu; numer spoza zakresu (także 0 = „gra bez poziomów”) przycinamy do istniejącego. */
export function levelParams(level: number): LevelParams {
  const index = Math.min(Math.max(Math.round(level), 1), LEVELS.length) - 1;
  return LEVELS[index] as LevelParams;
}

/** Liczby kolejnych zadań: z zakresu, dwie kolejne nigdy takie same. */
function createCounts(min: number, max: number, tasks: number, rng: Rng): number[] {
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const counts: number[] = [];
  for (let i = 0; i < tasks; i++) counts.push(rng.pick(values.filter((v) => v !== counts[i - 1])));
  return counts;
}

// ---------------------------------------------------------------------------
// Rozdawanie
// ---------------------------------------------------------------------------

/** Jeden stolik: ilu jeżyków czeka i ile jabłek leży w koszyku (nigdy mniej niż jeżyków — nie da się „przegrać”). */
export interface Table {
  hedgehogs: number;
  apples: number;
}

export function createTables(level: number, rng: Rng): Table[] {
  const params = levelParams(level);
  if (params.mode !== 'deal') throw new Error(`poziom ${level} nie jest poziomem rozdawania`);
  const counts = createCounts(params.min, params.max, params.tasks, rng);
  // Na poziomie z `extra` mniej więcej co drugi stolik ma jabłko „za dużo”, ale nigdy pierwszy i nie wszystkie.
  const extra = params.extra ? new Set(rng.shuffle(counts.map((_, i) => i).slice(1)).slice(0, 2)) : new Set<number>();
  return counts.map((hedgehogs, i) => ({ hedgehogs, apples: hedgehogs + (extra.has(i) ? 1 : 0) }));
}

/** Dać jabłko jeżykowi `index`. `already` = ten jeżyk już ma jabłko (łagodny błąd: każdemu po jednym). */
export function giveApple(fed: readonly boolean[], index: number): { result: 'given' | 'already'; fed: boolean[] } {
  if (!Number.isInteger(index) || index < 0 || index >= fed.length) throw new RangeError(`nie ma jeżyka ${index}`);
  if (fed[index]) return { result: 'already', fed: fed.slice() };
  const next = fed.slice();
  next[index] = true;
  return { result: 'given', fed: next };
}

/** Pierwszy od lewej jeżyk bez jabłka (tu wskazuje podpowiedź); -1 = każdy już ma. */
export const firstHungry = (fed: readonly boolean[]): number => fed.indexOf(false);

export const allFed = (fed: readonly boolean[]): boolean => fed.every(Boolean);

/** Ile ms czasu gry po podaniu jabłka ponowne stuknięcie tego samego jeżyka to jeszcze podwójne stuknięcie. */
export const REPEAT_TAP_MS = 700;

/**
 * Czy stuknięcie jeżyka `index` w chwili `now` to powtórka podania sprzed chwili (`last`) — gra je pomija,
 * bez błędu (Z-17). Jeżyk nakarmiony dawniej ocenia się zwykle („każdemu po jednym”).
 */
export const isRepeatTap = (last: { index: number; at: number } | null, index: number, now: number): boolean =>
  last !== null && last.index === index && now - last.at < REPEAT_TAP_MS;

// ---------------------------------------------------------------------------
// Wybór tacki
// ---------------------------------------------------------------------------

export const TRAY_COLS = 5;
export const TRAY_ROWS = 2;
export const CELL_X = 100 / TRAY_COLS;
export const CELL_Y = 100 / TRAY_ROWS;
/** Jabłko na tacce jako ułamek boku pola. */
export const APPLE_SIZE = 0.78;
/** Rozmiary na poziomie z `mixedSizes` — każda tacka inny (najmniejszy ≥ 36 px przy polu ≥ 55 px: telefon 360 × 640 w pionie). */
export const MIXED_SIZES = [0.66, 0.78, 0.9] as const;
/** Jaką część wolnego miejsca w polu wolno wykorzystać na przesunięcie rozsypanego jabłka. */
const SCATTER_SHARE = 0.8;

export interface Apple {
  /** Środek jabłka w % szerokości i wysokości tacki. */
  x: number;
  y: number;
  /** Bok jabłka jako ułamek boku pola. */
  size: number;
}

export interface Tray {
  count: number;
  layout: Layout;
  apples: Apple[];
}

export interface ChooseTask {
  prompt: Prompt;
  /** Ile jeżyków / jaka cyfra = liczebność poprawnej tacki. */
  count: number;
  /** Tacki w kolejności na ekranie (liczebności różne). */
  trays: Tray[];
  /** Indeks poprawnej tacki. */
  answer: number;
}

/** Pola (kolumna, rząd) jabłek w układzie; rozsypane od 3 jabłek zawsze w obu rzędach. */
function cellsFor(layout: Layout, count: number, rng: Rng): number[] {
  if (layout === 'scatter') {
    const cells = rng.shuffle(Array.from({ length: TRAY_COLS * TRAY_ROWS }, (_, i) => i));
    const row = (cell: number) => Math.floor(cell / TRAY_COLS);
    if (count >= 3 && cells.slice(0, count).every((c) => row(c) === row(cells[0] as number))) {
      const other = cells.findIndex((c, i) => i >= count && row(c) !== row(cells[0] as number));
      [cells[count - 1], cells[other]] = [cells[other] as number, cells[count - 1] as number];
    }
    return cells.slice(0, count);
  }
  return Array.from({ length: count }, (_, i) => i); // ramka: pola po kolei (rząd wyśrodkowuje createTray)
}

function createTray(count: number, layout: Layout, size: number, rng: Rng): Tray {
  const used: Layout = layout === 'row' && count > TRAY_COLS ? 'frame' : layout;
  const jitter = used === 'scatter' ? ((1 - size) / 2) * SCATTER_SHARE : 0;
  const apples = cellsFor(used, count, rng).map((cell, i) => {
    const col = used === 'row' ? TRAY_COLS / 2 + (i - (count - 1) / 2) - 0.5 : cell % TRAY_COLS;
    const row = used === 'row' ? 0.5 : Math.floor(cell / TRAY_COLS);
    return {
      x: (col + 0.5 + (rng.next() * 2 - 1) * jitter) * CELL_X,
      y: (row + 0.5 + (rng.next() * 2 - 1) * jitter) * CELL_Y,
      size,
    };
  });
  return { count, layout: used, apples };
}

/** Rozmiary jabłek tacek (różne); przy `mixedSizes` najliczniejsza tacka nigdy nie ma największych jabłek. */
function traySizes(params: ChooseLevel, counts: number[], rng: Rng): number[] {
  if (!params.mixedSizes) return counts.map(() => APPLE_SIZE);
  const sizes: number[] = rng.shuffle(MIXED_SIZES).slice(0, counts.length);
  const most = counts.indexOf(Math.max(...counts));
  const least = counts.indexOf(Math.min(...counts));
  if (sizes[most] === Math.max(...sizes)) [sizes[most], sizes[least]] = [sizes[least] as number, sizes[most] as number];
  return sizes;
}

export function createChooseTasks(level: number, rng: Rng): ChooseTask[] {
  const params = levelParams(level);
  if (params.mode !== 'choose') throw new Error(`poziom ${level} nie jest poziomem wyboru`);
  return createCounts(params.min, params.max, params.tasks, rng).map((count) => {
    // Zmyłki: z zakresu poziomu, blisko odpowiedzi (różnica ≤ 3) — trzeba porównać, a nie zgadnąć „na oko”.
    const near = Array.from({ length: params.max - params.min + 1 }, (_, i) => params.min + i).filter(
      (v) => v !== count && Math.abs(v - count) <= 3,
    );
    const counts = rng.shuffle([count, ...rng.shuffle(near).slice(0, params.options - 1)]);
    const sizes = traySizes(params, counts, rng);
    const trays = counts.map((n, i) => createTray(n, rng.pick(params.layouts), sizes[i] as number, rng));
    return { prompt: params.prompt, count, trays, answer: counts.indexOf(count) };
  });
}

/** Nazwa tacki dla czytników ekranu (na ekranie nic do czytania — Z-10). */
export function applesLabel(n: number): string {
  const few = n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14);
  return `${n} ${n === 1 ? 'jabłko' : few ? 'jabłka' : 'jabłek'}`;
}
