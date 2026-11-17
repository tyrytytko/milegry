import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/util/rng';
import {
  CELL_X,
  CELL_Y,
  COUNT_ANIMATION_MS,
  COUNT_BUDGET_MS,
  LEVELS,
  MIXED_SIZES,
  NUT_SIZE,
  countStepMs,
  createTasks,
  jitterFor,
  levelParams,
  type Task,
} from './logic';
import { manifest } from './manifest';

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);
const levelNumbers = LEVELS.map((_, i) => i + 1);

const nuts = (task: Task) => task.items.filter((item) => item.kind === 'nut');
const leaves = (task: Task) => task.items.filter((item) => item.kind === 'leaf');

describe('poziomy', () => {
  it('mają poprawne parametry: runda 5–8 zadań (Z-23), zakres w 1–10, układy z listy', () => {
    for (const p of LEVELS) {
      expect(p.min).toBeGreaterThanOrEqual(1);
      expect(p.max).toBeLessThanOrEqual(10);
      expect(p.min).toBeLessThan(p.max);
      expect(p.tasks).toBeGreaterThanOrEqual(5);
      expect(p.tasks).toBeLessThanOrEqual(8);
      expect(p.layouts.length).toBeGreaterThan(0);
    }
  });

  it('trudność rośnie: zakres i liczba zadań nie maleją', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i]!.max).toBeGreaterThanOrEqual(LEVELS[i - 1]!.max);
      expect(LEVELS[i]!.tasks).toBeGreaterThanOrEqual(LEVELS[i - 1]!.tasks);
    }
  });

  it('klawisze ekranowe obejmują wszystkie cyfry każdej odpowiedzi z zakresu', () => {
    for (const p of LEVELS) {
      for (let n = p.min; n <= p.max; n++) {
        for (const digit of String(n)) expect(p.keys).toContain(Number(digit));
      }
    }
  });

  it('zasięg poziomów: do 3, do 5 i do 10 (w tym 10 jako odpowiedź dwucyfrowa)', () => {
    expect(LEVELS[0]!.max).toBe(3);
    expect(Math.max(...LEVELS.map((p) => p.max))).toBe(10);
    expect(levelNumbers.some((l) => levelParams(l).max === 5)).toBe(true);
  });

  it('levelParams przycina numer poziomu do zakresu', () => {
    expect(levelParams(0)).toBe(LEVELS[0]);
    expect(levelParams(1)).toBe(LEVELS[0]);
    expect(levelParams(LEVELS.length)).toBe(LEVELS[LEVELS.length - 1]);
    expect(levelParams(99)).toBe(LEVELS[LEVELS.length - 1]);
  });

  it('manifest.levels zgadza się z LEVELS', () => {
    expect(manifest.levels).toBe(LEVELS.length);
  });
});

describe('createTasks', () => {
  describe.each(levelNumbers)('poziom %i', (level) => {
    const params = levelParams(level);
    const rounds = SEEDS.map((seed) => createTasks(level, createRng(seed)));

    it('daje tyle zadań, ile przewiduje poziom (5–8, Z-23)', () => {
      for (const tasks of rounds) expect(tasks).toHaveLength(params.tasks);
    });

    it('odpowiedź (liczba orzeszków) jest w zakresie poziomu i zgadza się z obrazkiem', () => {
      for (const task of rounds.flat()) {
        expect(Number.isInteger(task.count)).toBe(true);
        expect(task.count).toBeGreaterThanOrEqual(params.min);
        expect(task.count).toBeLessThanOrEqual(params.max);
        expect(nuts(task)).toHaveLength(task.count);
      }
    });

    it('układ pochodzi z listy poziomu, a kostka i ramka dostają tylko pasujące liczby', () => {
      for (const task of rounds.flat()) {
        expect(params.layouts).toContain(task.layout);
        if (task.layout === 'dice') expect(task.count).toBeLessThanOrEqual(5);
      }
    });

    it('wszystko mieści się w polanie, a elementy się nie nakładają', () => {
      for (const task of rounds.flat()) {
        for (const a of task.items) {
          expect(a.x).toBeGreaterThan(0);
          expect(a.x).toBeLessThan(100);
          expect(a.y).toBeGreaterThan(0);
          expect(a.y).toBeLessThan(100);
        }
        task.items.forEach((a, i) =>
          task.items.slice(i + 1).forEach((b) => {
            const dist = Math.hypot((a.x - b.x) / CELL_X, (a.y - b.y) / CELL_Y);
            expect(dist).toBeGreaterThanOrEqual((a.size + b.size) / 2);
          }),
        );
      }
    });

    it('liście-dystraktory tylko tam, gdzie poziom je przewiduje (1–4 na polanie); liczymy wyłącznie orzeszki', () => {
      for (const task of rounds.flat()) {
        if (params.leaves === 0) expect(leaves(task)).toHaveLength(0);
        else {
          expect(leaves(task).length).toBeGreaterThanOrEqual(1);
          expect(leaves(task).length).toBeLessThanOrEqual(params.leaves);
        }
      }
    });

    it('wielkości orzeszków różnią się tylko tam, gdzie poziom to przewiduje', () => {
      const sizes = new Set(rounds.flat().flatMap((task) => nuts(task).map((n) => n.size)));
      if (params.mixedSizes) expect(sizes.size).toBeGreaterThan(1);
      else expect(sizes.size).toBe(1);
    });

    if (params.mixedSizes) {
      it('pułapka „duży ≠ więcej”: w każdym zadaniu od 2 orzeszków są co najmniej dwa różne rozmiary', () => {
        for (const task of rounds.flat()) {
          if (task.count >= 2) expect(new Set(nuts(task).map((n) => n.size)).size).toBeGreaterThanOrEqual(2);
        }
      });
    }

    it('rozsypane elementy zostają we własnych polach siatki (nie stykają się, niezależnie od rozmiaru)', () => {
      for (const task of rounds.flat()) {
        if (task.layout !== 'scatter') continue;
        for (const item of task.items) {
          const gx = item.x / CELL_X;
          const gy = item.y / CELL_Y;
          const reach = jitterFor(item.size) + 1e-9;
          expect(Math.abs(gx - (Math.floor(gx) + 0.5))).toBeLessThanOrEqual(reach);
          expect(Math.abs(gy - (Math.floor(gy) + 0.5))).toBeLessThanOrEqual(reach);
        }
      }
    });

    it('kolejne zadania mają różne odpowiedzi', () => {
      for (const tasks of rounds) tasks.slice(1).forEach((task, i) => expect(task.count).not.toBe(tasks[i]!.count));
    });
  });

  it('na poziomach do 10 odpowiedź „10” (dwie cyfry) pada w rundzie dokładnie raz i nie na początku; gdzie indziej wcale', () => {
    for (const level of levelNumbers) {
      const withTen = levelParams(level).max === 10;
      for (const seed of SEEDS) {
        const tasks = createTasks(level, createRng(seed));
        expect(tasks.filter((task) => task.count === 10)).toHaveLength(withTen ? 1 : 0);
        expect(tasks[0]!.count).not.toBe(10);
      }
    }
  });

  it('układ w rzędzie leży w jednym rzędzie, a ramka ma najwyżej 5 w górnym rzędzie', () => {
    for (const level of levelNumbers) {
      for (const task of createTasks(level, createRng(3))) {
        if (task.layout === 'row') expect(new Set(task.items.map((i) => i.y)).size).toBe(1);
        if (task.layout === 'frame') {
          const top = Math.min(...task.items.map((i) => i.y));
          expect(task.items.filter((i) => i.y === top).length).toBe(Math.min(task.count, 5));
        }
      }
    }
  });

  it('rozsypane orzeszki (od 3 wzwyż) zawsze leżą w co najmniej dwóch rzędach polany — gwarancja generatora, nie ziarna', () => {
    for (const level of levelNumbers.filter((l) => levelParams(l).layouts.includes('scatter'))) {
      for (const seed of SEEDS) {
        for (const task of createTasks(level, createRng(seed))) {
          if (task.layout === 'scatter' && task.count >= 3) {
            expect(new Set(nuts(task).map((n) => Math.floor(n.y / CELL_Y))).size).toBeGreaterThanOrEqual(2);
          }
        }
      }
    }
  });

  it('to samo ziarno daje te same zadania, inne ziarno — inne', () => {
    for (const level of levelNumbers) {
      expect(createTasks(level, createRng(7))).toEqual(createTasks(level, createRng(7)));
      expect(createTasks(level, createRng(7))).not.toEqual(createTasks(level, createRng(8)));
    }
  });
});

describe('rozmiary i odstępy', () => {
  it('rozmiar elementu + zapas na przesunięcie mieści się w polu siatki (1 = bok pola)', () => {
    for (const size of [...MIXED_SIZES, NUT_SIZE]) expect(size + 2 * jitterFor(size)).toBeLessThanOrEqual(1);
  });

  it('najmniejszy orzeszek ma ≥ 36 px przy polanie ok. 300 px (telefon 375 × 812, Z-14: czytelność)', () => {
    const polanaPx = 300;
    expect(Math.min(...MIXED_SIZES) * (polanaPx / 5)).toBeGreaterThanOrEqual(36);
  });
});

describe('reakcja na dobrą odpowiedź (Z-20)', () => {
  it('zapalanie orzeszków po kolei mieści się w 800 ms dla każdej liczby orzeszków', () => {
    for (let count = 1; count <= 10; count++) {
      const total = (count - 1) * countStepMs(count) + COUNT_ANIMATION_MS;
      expect(total).toBeLessThanOrEqual(COUNT_BUDGET_MS);
    }
  });

  it('krok nie przekracza 60 ms i nie rośnie z liczbą orzeszków', () => {
    for (let count = 1; count <= 10; count++) {
      expect(countStepMs(count)).toBeLessThanOrEqual(60);
      if (count > 2) expect(countStepMs(count)).toBeLessThanOrEqual(countStepMs(count - 1));
    }
    expect(countStepMs(10)).toBeGreaterThan(0); // nadal „po kolei”, a nie wszystkie naraz
  });
});
