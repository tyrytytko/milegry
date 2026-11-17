/**
 * „Kształtowe okienka” — reguły gry. Czyste funkcje: bez DOM, bez Math.random, bez czasu.
 * Losowość wchodzi parametrem (Rng z ctx.rng), więc to samo ziarno w teście daje te same zadania.
 */
import type { Rng } from '../../core/types';

export const SHAPES = [
  'circle',
  'oval',
  'square',
  'diamond',
  'rect',
  'rect-tall',
  'triangle',
  'triangle-down',
  'star',
  'heart',
] as const;
export type Shape = (typeof SHAPES)[number];

/**
 * Bliźniaki: kształty, które różnią się tylko obrotem (trójkąt ↔ trójkąt do góry nogami, kwadrat ↔ romb,
 * prostokąt leżący ↔ stojący) albo proporcją (koło ↔ owal, kwadrat ↔ prostokąt). Zmyłki ostatniego poziomu.
 */
export const TWINS: Record<Shape, readonly Shape[]> = {
  circle: ['oval'],
  oval: ['circle'],
  square: ['diamond', 'rect'],
  diamond: ['square'],
  rect: ['rect-tall', 'square'],
  'rect-tall': ['rect'],
  triangle: ['triangle-down'],
  'triangle-down': ['triangle'],
  star: [],
  heart: [],
};

/** Jedno zadanie: okiennicę `shutter` dopasuj do jednego z okienek domku. */
export interface Task {
  shutter: Shape;
  /** Okienka domku w kolejności na ekranie; kształty się nie powtarzają. */
  windows: Shape[];
  /** Indeks w `windows` okienka, do którego pasuje okiennica. */
  answer: number;
}

export interface LevelParams {
  /** Kształty, z których losujemy okiennice i zmyłki. */
  shapes: readonly Shape[];
  /** Ile okienek ma domek (≥ 2). */
  windows: number;
  /** Ile zadań w rundzie (5–8, Z-23). */
  tasks: number;
  /** Zmyłki to najpierw bliźniaki okiennicy (różnica tylko obrotem lub proporcją). */
  twins?: boolean;
}

const BASIC: readonly Shape[] = ['circle', 'square', 'triangle'];

/** Poziomy numerowane od 1; `manifest.levels` = LEVELS.length. Poziom nie zależy od wieku (Z-39). */
export const LEVELS: readonly LevelParams[] = [
  { shapes: BASIC, windows: 2, tasks: 5 },
  { shapes: BASIC, windows: 3, tasks: 6 },
  { shapes: [...BASIC, 'rect', 'oval'], windows: 4, tasks: 6 },
  { shapes: SHAPES, windows: 4, tasks: 7 },
  { shapes: SHAPES.filter((shape) => TWINS[shape].length > 0), windows: 4, tasks: 8, twins: true },
];

/** Parametry poziomu; numer spoza zakresu (także 0 = „gra bez poziomów”) przycinamy do istniejącego. */
export function levelParams(level: number): LevelParams {
  const index = Math.min(Math.max(Math.round(level), 1), LEVELS.length) - 1;
  return LEVELS[index] as LevelParams;
}

/** Zadania całej rundy dla poziomu. Kolejne zadania nigdy nie mają tej samej okiennicy. */
export function createTasks(level: number, rng: Rng): Task[] {
  const { shapes, windows, tasks, twins } = levelParams(level);
  const result: Task[] = [];
  let previous: Shape | undefined;
  for (let i = 0; i < tasks; i++) {
    const shutter = rng.pick(shapes.filter((shape) => shape !== previous));
    const others = rng.shuffle(shapes.filter((shape) => shape !== shutter));
    const first = twins ? others.filter((shape) => TWINS[shutter].includes(shape)) : [];
    const decoys = [...first, ...others.filter((shape) => !first.includes(shape))].slice(0, windows - 1);
    const order = rng.shuffle([shutter, ...decoys]);
    result.push({ shutter, windows: order, answer: order.indexOf(shutter) });
    previous = shutter;
  }
  return result;
}
