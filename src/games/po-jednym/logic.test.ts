import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/util/rng';
import {
  APPLE_SIZE,
  CELL_X,
  CELL_Y,
  LEVELS,
  MIXED_SIZES,
  REPEAT_TAP_MS,
  TRAY_COLS,
  TRAY_ROWS,
  allFed,
  applesLabel,
  createChooseTasks,
  createTables,
  firstHungry,
  giveApple,
  isRepeatTap,
  levelParams,
  type Apple,
} from './logic';
import { manifest } from './manifest';

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);
const levelNumbers = LEVELS.map((_, i) => i + 1);
const dealLevels = levelNumbers.filter((level) => levelParams(level).mode === 'deal');
const chooseLevels = levelNumbers.filter((level) => levelParams(level).mode === 'choose');

describe('poziomy', () => {
  it('runda ma 5–10 zadań (Z-23), zakresy mają sens, najpierw rozdawanie, potem wybór', () => {
    for (const p of LEVELS) {
      expect(p.tasks).toBeGreaterThanOrEqual(5);
      expect(p.tasks).toBeLessThanOrEqual(10);
      expect(p.min).toBeGreaterThanOrEqual(1);
      expect(p.min).toBeLessThan(p.max);
      expect(p.max).toBeLessThanOrEqual(10);
    }
    const modes = LEVELS.map((p) => p.mode);
    expect(modes.lastIndexOf('deal')).toBeLessThan(modes.indexOf('choose'));
  });

  it('zakresy: do 3 → do 5 → do 10 (Z-37), cyfra dopiero po zbiorze', () => {
    expect(LEVELS[0]!.max).toBe(3);
    expect(Math.max(...LEVELS.map((p) => p.max))).toBe(10);
    for (let i = 1; i < LEVELS.length; i++) expect(LEVELS[i]!.max).toBeGreaterThanOrEqual(LEVELS[i - 1]!.max);
    const prompts = LEVELS.flatMap((p) => (p.mode === 'choose' ? [p.prompt] : []));
    expect(prompts.indexOf('hedgehogs')).toBeLessThan(prompts.indexOf('digit'));
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

describe('rozdawanie: createTables', () => {
  describe.each(dealLevels)('poziom %i', (level) => {
    const params = levelParams(level);
    const rounds = SEEDS.map((seed) => createTables(level, createRng(seed)));

    it('daje tyle stolików, ile przewiduje poziom; jeżyki w zakresie poziomu', () => {
      for (const tables of rounds) {
        expect(tables).toHaveLength(params.tasks);
        for (const t of tables) {
          expect(t.hedgehogs).toBeGreaterThanOrEqual(params.min);
          expect(t.hedgehogs).toBeLessThanOrEqual(params.max);
        }
      }
    });

    it('jabłek nigdy nie brakuje: tyle samo albo o jedno więcej (gdy poziom na to pozwala)', () => {
      for (const t of rounds.flat()) {
        const extra = t.apples - t.hedgehogs;
        expect(extra === 0 || (params.mode === 'deal' && params.extra && extra === 1)).toBe(true);
      }
    });

    it('kolejne stoliki mają inną liczbę jeżyków', () => {
      for (const tables of rounds) tables.slice(1).forEach((t, i) => expect(t.hedgehogs).not.toBe(tables[i]!.hedgehogs));
    });

    if (params.mode === 'deal' && params.extra) {
      it('w każdej rundzie jest stolik z jabłkiem „za dużo” i stolik „tyle samo”', () => {
        for (const tables of rounds) {
          expect(tables.some((t) => t.apples > t.hedgehogs)).toBe(true);
          expect(tables.some((t) => t.apples === t.hedgehogs)).toBe(true);
        }
      });
    }
  });

  it('poziom wyboru nie ma stolików do rozdawania', () => {
    expect(() => createTables(chooseLevels[0]!, createRng(1))).toThrow();
  });

  it('to samo ziarno daje te same stoliki', () => {
    for (const level of dealLevels) expect(createTables(level, createRng(5))).toEqual(createTables(level, createRng(5)));
  });
});

describe('rozdawanie: giveApple, firstHungry, allFed', () => {
  it('głodny jeżyk dostaje jabłko; stan wejściowy się nie zmienia', () => {
    const fed = [false, true, false];
    const out = giveApple(fed, 2);
    expect(out).toEqual({ result: 'given', fed: [false, true, true] });
    expect(fed).toEqual([false, true, false]);
  });

  it('jeżyk z jabłkiem nie dostaje drugiego (każdemu po jednym)', () => {
    expect(giveApple([true, false], 0)).toEqual({ result: 'already', fed: [true, false] });
  });

  it('indeks spoza stolika to błąd gry', () => {
    expect(() => giveApple([false], 1)).toThrow();
    expect(() => giveApple([false], -1)).toThrow();
  });

  it('firstHungry wskazuje pierwszego głodnego od lewej, allFed — koniec stolika', () => {
    expect(firstHungry([true, false, false])).toBe(1);
    expect(firstHungry([true, true])).toBe(-1);
    expect(allFed([true, true])).toBe(true);
    expect(allFed([true, false])).toBe(false);
  });
});

describe('rozdawanie: isRepeatTap (podwójne stuknięcie to nie błąd)', () => {
  it('ponowne stuknięcie jeżyka, który przed chwilą dostał jabłko, jest pomijane', () => {
    expect(isRepeatTap({ index: 1, at: 1000 }, 1, 1000)).toBe(true);
    expect(isRepeatTap({ index: 1, at: 1000 }, 1, 1000 + REPEAT_TAP_MS - 1)).toBe(true);
  });

  it('jeżyk nakarmiony dawno temu, inny jeżyk albo brak podania — zwykła ocena', () => {
    expect(isRepeatTap({ index: 1, at: 1000 }, 1, 1000 + REPEAT_TAP_MS)).toBe(false);
    expect(isRepeatTap({ index: 1, at: 1000 }, 0, 1000)).toBe(false);
    expect(isRepeatTap(null, 0, 0)).toBe(false);
  });

  it('okno obejmuje lot jabłka (--mg-dur-base 400 ms), ale nie dłużej niż ok. sekundę', () => {
    expect(REPEAT_TAP_MS).toBeGreaterThanOrEqual(400);
    expect(REPEAT_TAP_MS).toBeLessThanOrEqual(1000);
  });
});

/** Pudełko jabłka w jednostkach pól tacki. */
const box = (a: Apple) => ({ x: a.x / CELL_X, y: a.y / CELL_Y, r: a.size / 2 });

describe('wybór: createChooseTasks', () => {
  describe.each(chooseLevels)('poziom %i', (level) => {
    const params = levelParams(level);
    const rounds = SEEDS.map((seed) => createChooseTasks(level, createRng(seed)));
    const tasks = rounds.flat();

    const options = params.mode === 'choose' ? params.options : 0;

    it('daje tyle zadań, ile przewiduje poziom; 2–3 tacki, jedna poprawna', () => {
      expect(options).toBeGreaterThanOrEqual(2);
      expect(options).toBeLessThanOrEqual(3);
      for (const round of rounds) expect(round).toHaveLength(params.tasks);
      for (const task of tasks) {
        expect(task.trays).toHaveLength(options);
        expect(task.trays[task.answer]!.count).toBe(task.count);
        expect(new Set(task.trays.map((t) => t.count)).size).toBe(options);
        expect(task.count).toBeGreaterThanOrEqual(params.min);
        expect(task.count).toBeLessThanOrEqual(params.max);
        if (params.mode === 'choose') expect(task.prompt).toBe(params.prompt);
      }
    });

    it('zmyłki są z zakresu poziomu i blisko odpowiedzi (różnica ≤ 3)', () => {
      for (const task of tasks) {
        for (const tray of task.trays) {
          expect(tray.count).toBeGreaterThanOrEqual(params.min);
          expect(tray.count).toBeLessThanOrEqual(params.max);
          expect(Math.abs(tray.count - task.count)).toBeLessThanOrEqual(3);
        }
      }
    });

    it('obrazek zgadza się z liczbą: tyle jabłek, ile mówi tacka; jabłka w tacce i się nie stykają', () => {
      for (const tray of tasks.flatMap((t) => t.trays)) {
        expect(tray.apples).toHaveLength(tray.count);
        const boxes = tray.apples.map(box);
        for (const b of boxes) {
          expect(b.x - b.r).toBeGreaterThanOrEqual(0);
          expect(b.x + b.r).toBeLessThanOrEqual(TRAY_COLS);
          expect(b.y - b.r).toBeGreaterThanOrEqual(0);
          expect(b.y + b.r).toBeLessThanOrEqual(TRAY_ROWS);
        }
        boxes.forEach((a, i) =>
          boxes.slice(i + 1).forEach((b) => {
            const apart = Math.abs(a.x - b.x) >= a.r + b.r || Math.abs(a.y - b.y) >= a.r + b.r;
            expect(apart).toBe(true);
          }),
        );
      }
    });

    it('wielkość nie zdradza liczby („duży ≠ więcej”)', () => {
      for (const task of tasks) {
        const sizes = task.trays.map((t) => t.apples[0]!.size);
        for (const tray of task.trays) expect(new Set(tray.apples.map((a) => a.size)).size).toBe(1);
        if (params.mode === 'choose' && params.mixedSizes) {
          expect(new Set(sizes).size).toBe(options);
          const most = task.trays.reduce((a, b) => (b.count > a.count ? b : a));
          expect(most.apples[0]!.size).not.toBe(Math.max(...sizes));
          for (const s of sizes) expect(MIXED_SIZES).toContain(s);
        } else {
          for (const s of sizes) expect(s).toBe(APPLE_SIZE);
        }
      }
    });

    it('rozsypane od 3 jabłek leżą w obu rzędach (inny układ niż rząd jeżyków)', () => {
      for (const tray of tasks.flatMap((t) => t.trays)) {
        if (tray.layout !== 'scatter' || tray.count < 3) continue;
        expect(new Set(tray.apples.map((a) => Math.floor(a.y / CELL_Y))).size).toBe(2);
      }
    });

    const layouts: readonly string[] = params.mode === 'choose' ? params.layouts : [];
    const trays = tasks.flatMap((t) => t.trays);

    it('rząd: jabłka w jednym rzędzie na środku tacki, pole przy polu, wyśrodkowane', () => {
      if (layouts.includes('row')) expect(trays.some((t) => t.layout === 'row')).toBe(true);
      for (const tray of trays) {
        if (tray.layout !== 'row') continue;
        const cols = tray.apples.map((a) => a.x / CELL_X - 0.5);
        for (const a of tray.apples) expect(a.y).toBeCloseTo(CELL_Y, 9);
        cols.slice(1).forEach((c, i) => expect(c - cols[i]!).toBeCloseTo(1, 9));
        expect(cols.reduce((s, c) => s + c, 0) / cols.length).toBeCloseTo((TRAY_COLS - 1) / 2, 9);
      }
    });

    it('ramka: najpierw pięć u góry od lewej, reszta w dolnym rzędzie od lewej', () => {
      if (layouts.includes('frame')) expect(trays.some((t) => t.layout === 'frame' && t.count > TRAY_COLS)).toBe(true);
      for (const tray of trays) {
        if (tray.layout !== 'frame') continue;
        tray.apples.forEach((a, i) => {
          expect(a.x).toBeCloseTo(((i % TRAY_COLS) + 0.5) * CELL_X, 9);
          expect(a.y).toBeCloseTo((Math.floor(i / TRAY_COLS) + 0.5) * CELL_Y, 9);
        });
      }
    });

    it('kolejne zadania mają inną odpowiedź, a miejsce poprawnej tacki się zmienia', () => {
      for (const round of rounds) round.slice(1).forEach((t, i) => expect(t.count).not.toBe(round[i]!.count));
      expect(new Set(tasks.map((t) => t.answer)).size).toBe(options);
    });
  });

  it('poziom rozdawania nie ma zadań wyboru', () => {
    expect(() => createChooseTasks(dealLevels[0]!, createRng(1))).toThrow();
  });

  it('to samo ziarno daje te same zadania, inne ziarno — inne', () => {
    for (const level of chooseLevels) {
      expect(createChooseTasks(level, createRng(7))).toEqual(createChooseTasks(level, createRng(7)));
      expect(createChooseTasks(level, createRng(7))).not.toEqual(createChooseTasks(level, createRng(8)));
    }
  });
});

describe('applesLabel', () => {
  it('odmienia „jabłko” po polsku', () => {
    expect(applesLabel(1)).toBe('1 jabłko');
    expect(applesLabel(3)).toBe('3 jabłka');
    expect(applesLabel(5)).toBe('5 jabłek');
    expect(applesLabel(10)).toBe('10 jabłek');
  });
});
