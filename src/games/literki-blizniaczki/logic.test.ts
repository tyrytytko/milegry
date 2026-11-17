import { describe, expect, it } from 'vitest';
import { ALPHABET, DIACRITICS } from '../../core/util/letters';
import { createRng } from '../../core/util/rng';
import { CONFUSABLE, LEVELS, ROUND_TASKS, createTasks, forms, hasLowerChoices, levelDef, pool, type Task } from './logic';
import { manifest } from './manifest';

const SEEDS = Array.from({ length: 50 }, (_, i) => i + 1);
const levelNumbers = LEVELS.map((_, i) => i + 1);
const split = (s: string) => s.split(' ');
const ALL = split('A Ą B C Ć D E Ę F G H I J K L Ł M N Ń O Ó P R S Ś T U W Y Z Ź Ż');

/** Tabela poziomów (jak w README gry) — zapisana ręcznie, niezależnie od logic.ts. */
const SPEC: [string, string[], number, string, string][] = [
  ['upper', split('O C S U Z P'), 2, 'stala', 'pd'],
  ['upper', split('B D R W T I F'), 2, 'stala', 'pd'],
  ['upper', split('O C S U Z P B D R W T I F'), 3, 'po-chwili', 'pd'],
  ['upper', split('A E M N'), 2, 'stala', 'pd'],
  ['upper', split('H K L Ł'), 2, 'stala', 'pd'],
  ['upper', split('G Y J'), 3, 'stala', 'pd'],
  ['upper', split('A E M N H K L Ł G Y J'), 3, 'po-chwili', 'pd'],
  ['upper', ALL, 4, 'po-bledzie', 'mix'],
  ['lower', split('O C A D E I U'), 2, 'stala', 'pd'],
  ['lower', split('L T H K M N J Y G'), 3, 'po-chwili', 'pd'],
  ['lower', split('B P F W Ł'), 2, 'stala', 'pd'],
  ['lower', split('R S Z'), 3, 'stala', 'pd'],
  ['lower', ALL, 4, 'po-bledzie', 'mix'],
  ['bridge', split('O C U W Z K P Y I J T'), 3, 'po-chwili', 'pd'],
  ['bridge', split('A B D E F G H L M N R S'), 3, 'stala', 'pd'],
  ['bridge', ALL, 4, 'po-bledzie', 'mix'],
];

/** Pary liter pisanych łatwych do pomylenia — zapisane ręcznie, niezależnie od logic.ts. */
const SPEC_CONFUSABLE = {
  upper: ['T F I J', 'G Y J', 'M N', 'U Y', 'L Ł', 'C E', 'H K', 'O Ó', 'Z Ź Ż', 'S Ś'].map(split),
  lower: ['M N', 'N P', 'U W', 'U Y', 'G Y J', 'L Ł T', 'B L', 'A O D', 'R Z S', 'C E', 'I J'].map(split),
};

describe('poziomy', () => {
  it('jest 16 poziomów dokładnie według tabeli ze specyfikacji', () => {
    expect(LEVELS).toHaveLength(16);
    LEVELS.forEach((def, i) => {
      const [letterCase, targets, options, hint, direction] = SPEC[i]!;
      expect({ case: def.case, targets: [...def.targets], options: def.options, constantHint: def.constantHint, direction: def.direction }).toEqual({
        case: letterCase,
        targets,
        options,
        constantHint: hint === 'stala', // pozostałe tryby (po-chwili, po-bledzie) = sama drabina rdzenia
        direction,
      });
    });
  });

  it('dodatkowe zmyłki: poziom 6 — T, I, U; poziom 12 — n, c; pozostałe bez', () => {
    LEVELS.forEach((def, i) => {
      const expected = i === 5 ? ['T', 'I', 'U'] : i === 11 ? ['N', 'C'] : [];
      expect([...def.extraDistractors]).toEqual(expected);
    });
  });

  it('wszystkie litery (cele, zmyłki, pary mylące) należą do alfabetu i się nie powtarzają', () => {
    expect(ALL).toEqual([...ALPHABET]);
    for (const def of LEVELS) {
      expect(new Set(def.targets).size).toBe(def.targets.length);
      for (const l of pool(def)) expect(ALPHABET).toContain(l);
      expect(def.options).toBeLessThanOrEqual(pool(def).length);
    }
    for (const groups of Object.values(CONFUSABLE)) for (const g of groups) for (const l of g) expect(ALPHABET).toContain(l);
  });

  it('litery ze znakami diakrytycznymi tylko na poziomach 8, 13 i 16 (wśród celów)', () => {
    LEVELS.forEach((def, i) => {
      const hasDiacritic = def.targets.some((l) => DIACRITICS.includes(l) && l !== 'Ł');
      expect(hasDiacritic).toBe([8, 13, 16].includes(i + 1));
    });
  });

  it('tabela par mylących w logic.ts = tabela ze specyfikacji 2.4', () => {
    expect(CONFUSABLE).toEqual(SPEC_CONFUSABLE);
  });

  it('małe litery na żołędziach (wyższy żołądź): poziomy 9–13 i most z mieszanym kierunkiem (16)', () => {
    expect(levelNumbers.filter((n) => hasLowerChoices(levelDef(n)))).toEqual([9, 10, 11, 12, 13, 16]);
  });

  it('levelDef przycina numer poziomu do zakresu; manifest.levels = LEVELS.length', () => {
    expect(levelDef(0)).toBe(LEVELS[0]);
    expect(levelDef(99)).toBe(LEVELS[15]);
    expect(manifest.levels).toBe(LEVELS.length);
  });
});

describe('forms — krój i wielkość wzoru oraz żołędzi', () => {
  it('wzór i odpowiedzi zawsze w różnych krojach; pd = wzór pisany', () => {
    for (const c of ['upper', 'lower', 'bridge'] as const) {
      for (const d of ['pd', 'dp'] as const) {
        const f = forms(c, d);
        expect(f.pattern.script).not.toBe(f.choice.script);
        expect(f.pattern.script).toBe(d === 'pd' ? 'cursive' : 'print');
      }
    }
  });

  it('wielkość: W — obie wielkie, M — obie małe, most — pisana mała i WIELKA drukowana', () => {
    expect(forms('upper', 'pd')).toEqual({ pattern: { script: 'cursive', case: 'upper' }, choice: { script: 'print', case: 'upper' } });
    expect(forms('lower', 'dp')).toEqual({ pattern: { script: 'print', case: 'lower' }, choice: { script: 'cursive', case: 'lower' } });
    expect(forms('bridge', 'pd')).toEqual({ pattern: { script: 'cursive', case: 'lower' }, choice: { script: 'print', case: 'upper' } });
    expect(forms('bridge', 'dp')).toEqual({ pattern: { script: 'print', case: 'upper' }, choice: { script: 'cursive', case: 'lower' } });
  });
});

describe('createTasks', () => {
  describe.each(levelNumbers)('poziom %i', (level) => {
    const def = levelDef(level);
    const rounds = SEEDS.map((seed) => createTasks(level, createRng(seed)));

    it('runda ma 8 zadań (Z-23)', () => {
      for (const tasks of rounds) expect(tasks).toHaveLength(ROUND_TASKS);
      expect(ROUND_TASKS).toBe(8);
    });

    it('każde zadanie ma dokładnie jedną poprawną odpowiedź; zmyłki to inne litery z puli poziomu', () => {
      for (const task of rounds.flat()) {
        expect(task.options).toHaveLength(def.options);
        expect(new Set(task.options).size).toBe(task.options.length);
        expect(task.options.filter((l) => l === task.target)).toHaveLength(1);
        expect(task.options[task.answer]).toBe(task.target);
        expect(def.targets).toContain(task.target);
        for (const l of task.options) expect(pool(def)).toContain(l);
      }
    });

    it('cel nie powtarza się w dwóch kolejnych zadaniach', () => {
      for (const tasks of rounds) tasks.slice(1).forEach((t, i) => expect(t.target).not.toBe(tasks[i]!.target));
    });

    it('pokrycie: zestaw ≤ 8 liter — każda litera co najmniej raz; > 8 — 8 różnych liter', () => {
      for (const tasks of rounds) {
        const targets = new Set(tasks.map((t) => t.target));
        expect(targets.size).toBe(Math.min(def.targets.length, ROUND_TASKS));
      }
    });

    it('co najmniej jedna zmyłka z par mylących, gdy taka jest w puli', () => {
      // Most bierze tabelę małych liter pisanych (zob. komentarz przy CONFUSABLE).
      const table = SPEC_CONFUSABLE[def.case === 'upper' ? 'upper' : 'lower'];
      for (const task of rounds.flat()) {
        const near = new Set(table.filter((g) => g.includes(task.target)).flat());
        near.delete(task.target);
        if (pool(def).some((l) => near.has(l))) expect(task.options.some((l) => near.has(l))).toBe(true);
      }
    });

    it('miejsce poprawnego żołędzia: najwyżej 3 razy z rzędu to samo i zmienia się między rundami', () => {
      for (const tasks of rounds) {
        for (let i = 3; i < tasks.length; i++) {
          const run = tasks.slice(i - 3, i + 1).map((t) => t.answer);
          expect(new Set(run).size).toBeGreaterThan(1);
        }
      }
      expect(new Set(rounds.flat().map((t: Task) => t.answer)).size).toBe(def.options);
    });

    it('kierunek: pd na stałe albo (mix) na przemian pd, dp', () => {
      for (const tasks of rounds) {
        tasks.forEach((t, i) => expect(t.direction).toBe(def.direction === 'mix' ? (i % 2 === 0 ? 'pd' : 'dp') : 'pd'));
      }
    });
  });

  it('poziom 6: każda z liter G, Y, J występuje 2–3 razy', () => {
    for (const seed of SEEDS) {
      const counts = new Map<string, number>();
      for (const t of createTasks(6, createRng(seed))) counts.set(t.target, (counts.get(t.target) ?? 0) + 1);
      for (const l of ['G', 'Y', 'J']) {
        expect(counts.get(l)).toBeGreaterThanOrEqual(2);
        expect(counts.get(l)).toBeLessThanOrEqual(3);
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
