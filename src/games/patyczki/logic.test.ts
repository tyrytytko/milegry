import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/util/rng';
import {
  BUNDLE_GAP,
  FIELD_PADDING,
  LEVELS,
  PILE_PADDING,
  SIGN_SLOTS,
  answerDigits,
  bundles,
  createTasks,
  levelParams,
  levelSlots,
  symbolText,
  taskSlots,
  type Task,
} from './logic';
import { manifest } from './manifest';

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);
const levelNumbers = LEVELS.map((_, i) => i + 1);
const sameTask = (x: Task, y: Task) => x.op === y.op && x.a === y.a && x.b === y.b;

describe('bundles (grupy po 5)', () => {
  it('dzieli liczbę na piątki i resztę', () => {
    expect(bundles(0)).toEqual([]);
    expect(bundles(3)).toEqual([3]);
    expect(bundles(5)).toEqual([5]);
    expect(bundles(6)).toEqual([5, 1]);
    expect(bundles(10)).toEqual([5, 5]);
  });
});

describe('poziomy', () => {
  it('mają poprawne parametry: runda 5–8 zadań (Z-23), zakres w 1–10', () => {
    for (const p of LEVELS) {
      expect(p.tasks).toBeGreaterThanOrEqual(5);
      expect(p.tasks).toBeLessThanOrEqual(8);
      expect(p.from).toBeGreaterThanOrEqual(2);
      expect(p.to).toBeLessThanOrEqual(10);
      expect(p.from).toBeLessThan(p.to);
    }
  });

  it('zasięg: dodawanie do 3 → do 5 → do 10, a odejmowanie dopiero na końcu (Z-37)', () => {
    const ops = LEVELS.map((p) => p.op);
    expect(LEVELS[0]!.to).toBe(3);
    expect(levelParams(2).to).toBe(5);
    expect(LEVELS.filter((p) => p.op === 'add').pop()!.to).toBe(10);
    expect(ops.slice(ops.indexOf('sub')).every((o) => o === 'sub')).toBe(true);
    expect(ops.filter((o) => o === 'sub').length).toBeGreaterThanOrEqual(2);
  });

  it('zapis symboliczny (Z-37): bez niego na pierwszych poziomach, potem zawsze', () => {
    expect(LEVELS[0]!.symbol).toBe(false);
    expect(LEVELS[1]!.symbol).toBe(false);
    const first = LEVELS.findIndex((p) => p.symbol);
    expect(first).toBeGreaterThan(0);
    expect(LEVELS.slice(first).every((p) => p.symbol)).toBe(true);
  });

  it('add: zakres sumy rośnie; sub: zakres startu rośnie', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      if (LEVELS[i]!.op === LEVELS[i - 1]!.op) expect(LEVELS[i]!.to).toBeGreaterThanOrEqual(LEVELS[i - 1]!.to);
    }
  });

  it('levelParams przycina numer poziomu do zakresu', () => {
    expect(levelParams(0)).toBe(LEVELS[0]);
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

    it('daje tyle zadań, ile przewiduje poziom (5–8, Z-23), tego samego rodzaju', () => {
      for (const tasks of rounds) {
        expect(tasks).toHaveLength(params.tasks);
        for (const task of tasks) expect(task.op).toBe(params.op);
      }
    });

    it('odpowiedź zgadza się z obrazkiem (suma / reszta), składniki ≥ 1 (bez zera), całość w zakresie', () => {
      for (const task of rounds.flat()) {
        expect(task.a).toBeGreaterThanOrEqual(1);
        expect(task.b).toBeGreaterThanOrEqual(1);
        if (task.op === 'add') {
          expect(task.answer).toBe(task.a + task.b);
          expect(task.answer).toBeGreaterThanOrEqual(params.from);
          expect(task.answer).toBeLessThanOrEqual(params.to);
        } else {
          expect(task.answer).toBe(task.a - task.b);
          expect(task.answer).toBeGreaterThanOrEqual(1); // zostaje co najmniej jeden patyczek
          expect(task.a).toBeGreaterThanOrEqual(params.from);
          expect(task.a).toBeLessThanOrEqual(params.to);
        }
        expect(Number.isInteger(task.answer)).toBe(true);
      }
    });

    it('klawisze ekranowe obejmują wszystkie cyfry każdej odpowiedzi', () => {
      for (const task of rounds.flat()) {
        for (const digit of String(task.answer)) expect(params.keys).toContain(Number(digit));
      }
    });

    it('kolejne zadania różnią się i mają różne odpowiedzi', () => {
      for (const tasks of rounds) {
        tasks.slice(1).forEach((task, i) => {
          expect(sameTask(task, tasks[i]!)).toBe(false);
          expect(task.answer).not.toBe(tasks[i]!.answer);
        });
      }
    });

    it('answerDigits mówi, ile cyfr ma najdłuższa odpowiedź', () => {
      const longest = Math.max(...rounds.flat().map((task) => String(task.answer).length));
      expect(answerDigits(level)).toBeGreaterThanOrEqual(longest);
    });

    it('różne ziarna dają różne rundy (na 40 ziaren co najmniej 10 różnych; poziom 1 ma ich w ogóle tylko kilka)', () => {
      expect(new Set(rounds.map((tasks) => JSON.stringify(tasks))).size).toBeGreaterThanOrEqual(level === 1 ? 4 : 10);
    });

    if (level > 1) {
      it('zadanie nie powtarza się w rundzie (pula jest większa niż runda)', () => {
        for (const tasks of rounds) expect(new Set(tasks.map((t) => `${t.a}/${t.b}`)).size).toBe(tasks.length);
      });
    }
  });

  it('poziom 1 (tylko 3 zadania): padają wszystkie trzy, runda zaczyna się od sumy 3, „1+1” dokładnie 2 razy na 5', () => {
    for (const seed of SEEDS) {
      const names = createTasks(1, createRng(seed)).map((t) => `${t.a}+${t.b}`);
      expect(new Set(names)).toEqual(new Set(['1+1', '1+2', '2+1']));
      expect(names[0]).not.toBe('1+1');
      expect(names.filter((name) => name === '1+1')).toHaveLength(2);
    }
  });

  it('rundy nie otwiera odpowiedź, którą daje tylko jedno zadanie (poziom 2: „1+1”, poziom 6: „5 − 1”, poziom 8: „10 − 1”)', () => {
    for (const seed of SEEDS) {
      expect(createTasks(2, createRng(seed))[0]!.answer).not.toBe(2);
      expect(createTasks(6, createRng(seed))[0]!.answer).not.toBe(4);
      expect(createTasks(8, createRng(seed))[0]!.answer).not.toBe(9);
    }
  });

  it('każdy poziom ma co najmniej dwie różne odpowiedzi jednocyfrowe, w tym jedną z dwoma zadaniami (generator zawsze ma z czego wybrać)', () => {
    for (const p of LEVELS) {
      const answers = p.op === 'add' ? p.to - p.from + 1 - (p.to === 10 ? 1 : 0) : p.to - 1;
      expect(answers).toBeGreaterThanOrEqual(2);
      // Odpowiedź z co najmniej dwoma zadaniami: add — suma `to` (bez 10) ma `to` − 1 rozkładów; sub — wynik 1 daje
      // każde `a` z zakresu `from`…`to`.
      const sum = p.to === 10 ? 9 : p.to;
      expect(p.op === 'add' ? sum - 1 : p.to - p.from + 1).toBeGreaterThanOrEqual(2);
    }
  });

  it('na poziomie 5 odpowiedź „10” (dwie cyfry) pada raz w rundzie, nie na początku; gdzie indziej wcale', () => {
    expect(levelNumbers.map(answerDigits)).toEqual([1, 1, 1, 1, 2, 1, 1, 1]);
    for (const level of levelNumbers) {
      const withTen = level === 5;
      for (const seed of SEEDS) {
        const tasks = createTasks(level, createRng(seed));
        expect(tasks.filter((task) => task.answer === 10)).toHaveLength(withTen ? 1 : 0);
        expect(tasks[0]!.answer).not.toBe(10);
      }
    }
  });

  it('w rundzie pojawia się więcej niż jedna odpowiedź i (poza poziomem 1) więcej niż dwa różne zadania', () => {
    for (const level of levelNumbers) {
      const tasks = createTasks(level, createRng(5));
      expect(new Set(tasks.map((t) => t.answer)).size).toBeGreaterThanOrEqual(2);
      if (level > 1) expect(new Set(tasks.map((t) => `${t.a}/${t.b}`)).size).toBeGreaterThanOrEqual(3);
    }
  });

  it('to samo ziarno daje te same zadania', () => {
    for (const level of levelNumbers) {
      for (const seed of SEEDS) expect(createTasks(level, createRng(seed))).toEqual(createTasks(level, createRng(seed)));
    }
  });
});

describe('szerokość zadania w szczebelkach (taskSlots, levelSlots) — wartości policzone ręcznie', () => {
  const add = (a: number, b: number): Task => ({ op: 'add', a, b, answer: a + b });
  const sub = (a: number, b: number): Task => ({ op: 'sub', a, b, answer: a - b });

  it('stałe układu, na których opierają się rachunki poniżej (te same trafiają do CSS przez game.ts)', () => {
    expect([FIELD_PADDING, PILE_PADDING, SIGN_SLOTS, BUNDLE_GAP]).toEqual([1, 0.8, 2.2, 0.9]);
  });

  it('dodawanie: mata 1 + kupka (a + 0,8) + znak 2,2 + kupka (b + 0,8)', () => {
    expect(taskSlots(add(1, 1))).toBeCloseTo(6.8); // 1 + 1,8 + 2,2 + 1,8
    expect(taskSlots(add(2, 3))).toBeCloseTo(9.8); // 1 + 2,8 + 2,2 + 3,8
    expect(taskSlots(add(6, 4))).toBeCloseTo(15.7); // 1 + (6 + 0,9 + 0,8) + 2,2 + 4,8 — przerwa między piątkami
    expect(taskSlots(add(5, 5))).toBeCloseTo(14.8); // 1 + 5,8 + 2,2 + 5,8 — pełne piątki bez przerwy
  });

  it('odejmowanie: mata 1 + jedna kupka (zabrane patyczki nadal zajmują miejsce)', () => {
    expect(taskSlots(sub(5, 2))).toBeCloseTo(6.8); // 1 + 5 + 0,8
    expect(taskSlots(sub(10, 3))).toBeCloseTo(12.7); // 1 + 10 + 0,9 + 0,8
    expect(taskSlots(sub(10, 9))).toBeCloseTo(12.7); // szerokość nie zależy od tego, ile zabrano
  });

  it('levelSlots = najszersze zadanie poziomu', () => {
    expect(levelSlots(1)).toBeCloseTo(7.8); // 1 + 2 albo 2 + 1
    expect(levelSlots(4)).toBeCloseTo(13.7); // 7 + 1 albo 6 + 2
    expect(levelSlots(5)).toBeCloseTo(15.7); // 9 + 1, 6 + 4 …
    expect(levelSlots(8)).toBeCloseTo(12.7); // 10 patyczków w jednej kupce
  });
});

describe('symbolText', () => {
  it('zapis działania: „2 + 3 =” i „5 − 2 =” (znak minus, nie myślnik)', () => {
    expect(symbolText({ op: 'add', a: 2, b: 3, answer: 5 })).toBe('2 + 3 =');
    expect(symbolText({ op: 'sub', a: 5, b: 2, answer: 3 })).toBe('5 − 2 =');
  });
});
