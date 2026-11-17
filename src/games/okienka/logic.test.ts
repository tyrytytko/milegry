import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/util/rng';
import { LEVELS, SHAPES, TWINS, createTasks, levelParams, type Shape } from './logic';
import { manifest } from './manifest';
import { houseIcon, shapeSvg } from './shapes';

const SEEDS = Array.from({ length: 30 }, (_, i) => i + 1);
const levelNumbers = LEVELS.map((_, i) => i + 1);

/**
 * Bliźniaki zapisane na sztywno, niezależnie od `TWINS` z logic.ts — to specyfikacja gry (różnica tylko
 * obrotem albo proporcją). Romb jest zmyłką dla kwadratu świadomie: okiennica pasuje do otworu bez obracania.
 */
const EXPECTED_TWINS: Record<Shape, Shape[]> = {
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

describe('kształty i bliźniaki', () => {
  it('tabela bliźniaków zgadza się ze specyfikacją (np. bliźniakiem trójkąta jest trójkąt do góry nogami)', () => {
    for (const shape of SHAPES) expect([...TWINS[shape]].sort()).toEqual([...EXPECTED_TWINS[shape]].sort());
    expect(TWINS.triangle).toEqual(['triangle-down']);
  });

  it('bliźniaki są wzajemne i nie wskazują samego siebie', () => {
    for (const shape of SHAPES) {
      for (const twin of TWINS[shape]) {
        expect(twin).not.toBe(shape);
        expect(TWINS[twin]).toContain(shape);
      }
    }
  });
});

describe('grafika kształtów (shapes.ts)', () => {
  it('każdy kształt ma niepustą grafikę SVG, różną od grafik wszystkich pozostałych', () => {
    const graphics = SHAPES.map((shape) => shapeSvg(shape));
    for (const graphic of graphics) {
      expect(graphic.startsWith('<svg')).toBe(true);
      expect(graphic).toMatch(/<(circle|ellipse|rect|path)[ />]/); // jest co narysować, nie tylko pusta ramka SVG
    }
    expect(new Set(graphics).size).toBe(SHAPES.length);
  });

  it('ikona kafelka (domek) jest niepustym SVG', () => {
    expect(houseIcon()).toMatch(/^<svg[\s\S]*<\/svg>$/);
  });
});

describe('poziomy', () => {
  it('mają poprawne parametry: runda 5–8 zadań (Z-23), okienek nie więcej niż kształtów', () => {
    for (const p of LEVELS) {
      expect(new Set(p.shapes).size).toBe(p.shapes.length);
      expect(p.windows).toBeGreaterThanOrEqual(2);
      expect(p.windows).toBeLessThanOrEqual(p.shapes.length);
      expect(p.tasks).toBeGreaterThanOrEqual(5);
      expect(p.tasks).toBeLessThanOrEqual(8);
    }
  });

  it('trudność rośnie: kolejny poziom nie ma mniej okienek ani zadań', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i]!.windows).toBeGreaterThanOrEqual(LEVELS[i - 1]!.windows);
      expect(LEVELS[i]!.tasks).toBeGreaterThanOrEqual(LEVELS[i - 1]!.tasks);
    }
  });

  it('poziom 1 jest najłatwiejszy: najmniej okienek i najmniej kształtów', () => {
    for (const p of LEVELS) {
      expect(LEVELS[0]!.windows).toBeLessThanOrEqual(p.windows);
      expect(LEVELS[0]!.shapes.length).toBeLessThanOrEqual(p.shapes.length);
    }
  });

  it('ostatni poziom: okienka różnią się od okiennicy tylko obrotem lub proporcją', () => {
    expect(LEVELS[LEVELS.length - 1]!.twins).toBe(true);
  });

  it('numer poziomu spoza zakresu (także 0 = gra bez poziomów) daje zadania najbliższego istniejącego poziomu', () => {
    const last = LEVELS.length;
    expect(createTasks(0, createRng(4))).toEqual(createTasks(1, createRng(4)));
    expect(createTasks(-3, createRng(4))).toEqual(createTasks(1, createRng(4)));
    expect(createTasks(last + 5, createRng(4))).toEqual(createTasks(last, createRng(4)));
  });

  it('manifest.levels zgadza się z LEVELS', () => {
    expect(manifest.levels).toBe(LEVELS.length);
  });
});

describe('createTasks', () => {
  describe.each(levelNumbers)('poziom %i', (level) => {
    const params = levelParams(level);
    const rounds = SEEDS.map((seed) => createTasks(level, createRng(seed)));

    it('daje tyle zadań, ile przewiduje poziom', () => {
      for (const tasks of rounds) expect(tasks).toHaveLength(params.tasks);
    });

    it('każde zadanie ma dokładnie jedno pasujące okienko', () => {
      for (const task of rounds.flat()) {
        expect(task.windows).toHaveLength(params.windows);
        expect(new Set(task.windows).size).toBe(task.windows.length);
        expect(task.windows[task.answer]).toBe(task.shutter);
        for (const shape of task.windows) expect(params.shapes).toContain(shape);
      }
    });

    it('okiennica nie powtarza się w dwóch kolejnych zadaniach', () => {
      for (const tasks of rounds) {
        tasks.slice(1).forEach((task, i) => expect(task.shutter).not.toBe(tasks[i]!.shutter));
      }
    });

    it('pasujące okienko pojawia się w każdym miejscu domku', () => {
      const places = new Set(rounds.flat().map((task) => task.answer));
      for (let place = 0; place < params.windows; place++) expect(places).toContain(place);
    });

    if (params.twins) {
      it('wśród okienek jest bliźniak okiennicy (obrót lub proporcja)', () => {
        for (const task of rounds.flat()) {
          expect(task.windows.some((shape) => EXPECTED_TWINS[task.shutter].includes(shape))).toBe(true);
        }
      });
    }
  });

  it('to samo ziarno daje te same zadania, inne ziarno — inne', () => {
    for (const level of levelNumbers) {
      expect(createTasks(level, createRng(7))).toEqual(createTasks(level, createRng(7)));
      expect(createTasks(level, createRng(7))).not.toEqual(createTasks(level, createRng(8)));
    }
  });
});
