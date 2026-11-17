import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/util/rng';
import { LEVELS, createTasks, levelParams, type Task } from './logic';
import { manifest } from './manifest';

const SEEDS = Array.from({ length: 30 }, (_, i) => i + 1);
const levelNumbers = LEVELS.map((_, i) => i + 1);

describe('poziomy', () => {
  it('mają poprawne parametry: runda 5–10 zadań (Z-23), opcje nie przekraczają liczby kształtów', () => {
    for (const p of LEVELS) {
      expect(new Set(p.shapes).size).toBe(p.shapes.length);
      expect(p.options).toBeGreaterThanOrEqual(2);
      expect(p.options).toBeLessThanOrEqual(p.shapes.length);
      expect(p.tasks).toBeGreaterThanOrEqual(5);
      expect(p.tasks).toBeLessThanOrEqual(10);
    }
  });

  it('trudność rośnie: kolejny poziom nie ma mniej kształtów, opcji ani zadań', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      const prev = LEVELS[i - 1]!;
      const cur = LEVELS[i]!;
      expect(cur.shapes.length).toBeGreaterThanOrEqual(prev.shapes.length);
      expect(cur.options).toBeGreaterThanOrEqual(prev.options);
      expect(cur.tasks).toBeGreaterThanOrEqual(prev.tasks);
    }
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

    it('daje tyle zadań, ile przewiduje poziom (5–10, Z-23)', () => {
      for (const tasks of rounds) {
        expect(tasks).toHaveLength(params.tasks);
        expect(tasks.length).toBeGreaterThanOrEqual(5);
        expect(tasks.length).toBeLessThanOrEqual(10);
      }
    });

    it('każde zadanie ma poprawną odpowiedź wśród opcji', () => {
      for (const task of rounds.flat()) {
        expect(task.options).toHaveLength(params.options);
        expect(Number.isInteger(task.answer)).toBe(true);
        expect(task.answer).toBeGreaterThanOrEqual(0);
        expect(task.answer).toBeLessThan(task.options.length);
        expect(task.options[task.answer]).toBe(task.target);
      }
    });

    it('opcje się nie powtarzają (jedna dobra odpowiedź) i pochodzą z kształtów poziomu', () => {
      for (const task of rounds.flat()) {
        expect(new Set(task.options).size).toBe(task.options.length);
        for (const shape of [task.target, ...task.options]) expect(params.shapes).toContain(shape);
      }
    });

    it('wzór nie powtarza się w dwóch kolejnych zadaniach', () => {
      for (const tasks of rounds) {
        tasks.slice(1).forEach((task, i) => expect(task.target).not.toBe(tasks[i]!.target));
      }
    });

    it('miejsce poprawnej karty się zmienia (nie jest zawsze to samo)', () => {
      const places = new Set(rounds.flat().map((task: Task) => task.answer));
      expect(places.size).toBeGreaterThan(1);
    });
  });

  it('to samo ziarno daje te same zadania, inne ziarno — inne', () => {
    for (const level of levelNumbers) {
      expect(createTasks(level, createRng(7))).toEqual(createTasks(level, createRng(7)));
      expect(createTasks(level, createRng(7))).not.toEqual(createTasks(level, createRng(8)));
    }
  });
});
