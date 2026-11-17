/**
 * „Taki sam kształt” — reguły gry. Czyste funkcje: bez DOM, bez Math.random, bez czasu.
 * Losowość wchodzi parametrem (Rng z ctx.rng), więc to samo ziarno w teście daje te same zadania.
 */
import type { Rng } from '../../core/types';

export type Shape = 'circle' | 'square' | 'triangle' | 'diamond' | 'star' | 'heart';

/** Jedno zadanie: do wzoru `target` dopasuj taki sam kształt spośród `options`. */
export interface Task {
  target: Shape;
  /** Karty do wyboru w kolejności na ekranie; kształty się nie powtarzają. */
  options: Shape[];
  /** Indeks w `options` kształtu równego `target`. */
  answer: number;
}

/** Parametry poziomu. Trudność rośnie liczbą kształtów, liczbą opcji i długością rundy (Z-23: 5–10 zadań). */
export interface LevelParams {
  /** Kształty, z których losujemy wzory i zmyłki. */
  shapes: readonly Shape[];
  /** Ile kart do wyboru (≥ 2, nie więcej niż kształtów). */
  options: number;
  /** Ile zadań w rundzie. */
  tasks: number;
}

/** Poziomy numerowane od 1; `manifest.levels` = LEVELS.length. Poziom nie zależy od wieku (Z-39). */
export const LEVELS: readonly LevelParams[] = [
  { shapes: ['circle', 'square', 'triangle'], options: 2, tasks: 5 },
  { shapes: ['circle', 'square', 'triangle', 'star'], options: 3, tasks: 6 },
  { shapes: ['circle', 'square', 'triangle', 'star', 'diamond', 'heart'], options: 4, tasks: 8 },
];

/** Parametry poziomu; numer spoza zakresu (także 0 = „gra bez poziomów”) przycinamy do istniejącego. */
export function levelParams(level: number): LevelParams {
  const index = Math.min(Math.max(Math.round(level), 1), LEVELS.length) - 1;
  return LEVELS[index] as LevelParams;
}

/** Zadania całej rundy dla poziomu. Kolejne zadania nigdy nie mają tego samego wzoru. */
export function createTasks(level: number, rng: Rng): Task[] {
  const { shapes, options, tasks } = levelParams(level);
  const result: Task[] = [];
  let previous: Shape | undefined;
  for (let i = 0; i < tasks; i++) {
    const target = rng.pick(shapes.filter((shape) => shape !== previous));
    const decoys = rng.shuffle(shapes.filter((shape) => shape !== target)).slice(0, options - 1);
    const choices = rng.shuffle([target, ...decoys]);
    result.push({ target, options: choices, answer: choices.indexOf(target) });
    previous = target;
  }
  return result;
}
