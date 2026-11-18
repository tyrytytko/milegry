import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/util/rng';
import {
  LEVELS,
  arrangeCards,
  createTasks,
  isDarkCell,
  levelParams,
  pairLabel,
  pairOf,
  parseEquation,
  promptOf,
  promptParts,
  solvedPyramid,
  targetLayout,
  missingCells,
  type Answer,
  type Equation,
  type Puzzle,
  type PyramidCell,
} from './logic';
import { manifest } from './manifest';

const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1);
const levelNumbers = LEVELS.map((_, i) => i + 1);

// ---------------------------------------------------------------------------
// Niezależne sprawdzenie odpowiedzi — test liczy sam, nie kodem gry.
// ---------------------------------------------------------------------------

/** Wartość jednej strony działania po wstawieniu `fill` w miejsce dziury (null). */
function sideValue(values: readonly (number | null)[], ops: readonly ('+' | '-')[], fill: number): number {
  const nums = values.map((v) => (v === null ? fill : v));
  let total = nums[0]!;
  ops.forEach((op, i) => {
    total = op === '+' ? total + nums[i + 1]! : total - nums[i + 1]!;
  });
  return total;
}

/** Czy liczba `card` wstawiona w dziurę daje prawdziwą równość. */
function equationHolds(eq: Equation, card: number): boolean {
  return sideValue(eq.left.values, eq.left.ops, card) === sideValue(eq.right.values, eq.right.ops, card);
}

/**
 * Piramidka po wstawieniu `card` w „?”: puste kółka ('blank') liczymy od dołu jako sumy dwóch kółek pod nimi.
 * Zwraca wszystkie liczby albo null, gdy pustego kółka nie da się policzyć (np. w dolnym rzędzie).
 */
function solvePyramid(rows: readonly (readonly PyramidCell[])[], card: number): number[][] | null {
  const filled: (number | 'blank')[][] = rows.map((row) => row.map((v) => (v === null ? card : v)));
  for (let r = filled.length - 1; r >= 0; r--) {
    for (let i = 0; i < filled[r]!.length; i++) {
      if (filled[r]![i] !== 'blank') continue;
      const a = filled[r + 1]?.[i];
      const b = filled[r + 1]?.[i + 1];
      if (typeof a !== 'number' || typeof b !== 'number') return null;
      filled[r]![i] = a + b;
    }
  }
  return filled as number[][];
}

/** Czy po wstawieniu `card` w „?” (i policzeniu pustych kółek) każde kółko piramidki jest sumą dwóch kółek pod nim. */
function pyramidHolds(rows: readonly (readonly PyramidCell[])[], card: number): boolean {
  const filled = solvePyramid(rows, card);
  if (!filled) return false;
  return filled.every((row, r) => r === filled.length - 1 || row.every((v, i) => v === filled[r + 1]![i]! + filled[r + 1]![i + 1]!));
}

/** Czy liczby tworzą ciąg o stałym kroku. */
function constantStep(values: readonly number[]): boolean {
  const step = values[1]! - values[0]!;
  return values.every((v, i) => i === 0 || v - values[i - 1]! === step);
}

/** Kroki ciągu: różnice kolejnych liczb. */
const stepsOf = (values: readonly number[]) => values.slice(1).map((v, i) => v - values[i]!);

/** Wzorcowe rosnące figury (rysowane w teście, nie kodem gry): trójkąt-schodki, kwadrat i krzyżyk wielkości `size`. */
function drawShape(outline: 'triangle' | 'square' | 'cross', size: number): string[] {
  switch (outline) {
    case 'triangle':
      return Array.from({ length: size }, (_, r) => '#'.repeat(r + 1) + '.'.repeat(size - r - 1));
    case 'square':
      return Array.from({ length: size }, () => '#'.repeat(size));
    case 'cross': {
      // Krzyżyk o ramionach długości `size`: kratka (2·size + 1) × (2·size + 1).
      const side = 2 * size + 1;
      return Array.from({ length: side }, (_, r) => (r === size ? '#'.repeat(side) : '.'.repeat(size) + '#' + '.'.repeat(size)));
    }
  }
}

/** Wielkość pierwszego układu, gdy trzy układy to kolejne figury `outline` (wielkości s, s+1, s+2); inaczej null. */
function shapeStart(outline: 'triangle' | 'square' | 'cross', stages: readonly (readonly string[])[]): number | null {
  for (let size = 1; size <= 10; size++) {
    if (stages.every((stage, i) => drawShape(outline, size + i).join('/') === stage.join('/'))) return size;
  }
  return null;
}

/** Wszystkie rozwiązania układu „A + A = 12, A + B = 10” w liczbach 0..max (litera → wartość). */
function solveLetters(sums: readonly { letters: readonly string[]; total: number }[], max: number): Map<string, number>[] {
  const letters = [...new Set(sums.flatMap((sum) => sum.letters))];
  const solutions: Map<string, number>[] = [];
  const assign = (i: number, values: Map<string, number>) => {
    if (i === letters.length) {
      if (sums.every((sum) => sum.letters.reduce((t, l) => t + values.get(l)!, 0) === sum.total)) solutions.push(new Map(values));
      return;
    }
    for (let v = 0; v <= max; v++) {
      values.set(letters[i]!, v);
      assign(i + 1, values);
    }
  };
  assign(0, new Map());
  return solutions;
}

/** Szachownica: ile brakuje pól ciemnych (wiersz + kolumna parzyste — lewy górny róg ciemny) i jasnych. */
function missingByColor(rows: readonly string[]): [number, number] {
  let dark = 0;
  let light = 0;
  rows.forEach((row, r) =>
    [...row].forEach((c, i) => {
      if (c !== '.') return;
      if ((r + i) % 2 === 0) dark++;
      else light++;
    }),
  );
  return [dark, light];
}

/** Wartość „a z1 b z2 c …” liczona od lewej (z = '+' albo '-'). */
function withSigns(numbers: readonly number[], signs: string): number {
  return numbers.slice(1).reduce((total, n, i) => (signs[i] === '+' ? total + n : total - n), numbers[0]!);
}

/** Słowo odczytane z kodu: każdą liczbę zamieniamy na literę z tabelki. */
function decode(legend: readonly { letter: string; value: number }[], code: readonly number[]): string {
  return code.map((n) => legend.find((pair) => pair.value === n)?.letter ?? '_').join('');
}

/** Wynik po każdym kroku działania „a z1 b z2 c …” liczonego od lewej (bez pierwszej liczby). */
function partialResults(numbers: readonly number[], signs: string): number[] {
  const results: number[] = [];
  numbers.slice(1).reduce((total, n, i) => {
    const next = signs[i] === '+' ? total + n : total - n;
    results.push(next);
    return next;
  }, numbers[0]!);
  return results;
}

/** Ile pól `#` ma układ figury. */
const cellsIn = (stage: readonly string[]) => stage.join('').split('').filter((c) => c === '#').length;

/** Czy układ `small` mieści się w `big` (wyrównane do lewego dolnego rogu) i wszystkie jego pola tam są. */
function containedBottomLeft(small: readonly string[], big: readonly string[]): boolean {
  const offset = big.length - small.length;
  if (offset < 0) return false;
  return small.every((row, r) => [...row].every((c, i) => c !== '#' || big[r + offset]![i] === '#'));
}

/** Czy karta jest dobrą odpowiedzią na zadanie — liczone wprost z danych zadania. */
function isRight(puzzle: Puzzle, card: Answer): boolean {
  switch (puzzle.kind) {
    case 'missing':
      return typeof card === 'number' && equationHolds(puzzle.equation, card);
    case 'dice':
      return puzzle.dice.reduce((sum, d) => sum + d, 0) === card;
    case 'sequence':
      // Kroki zmieniają się o tyle samo (stały krok: zmiana 0), także krok do następnej liczby.
      return typeof card === 'number' && constantStep(stepsOf([...puzzle.values, card]));
    case 'pyramid':
      return typeof card === 'number' && pyramidHolds(puzzle.rows, card);
    case 'tiles':
      return puzzle.rows.join('').split('').filter((c) => c === '.').length === card;
    case 'codeWord':
      return decode(puzzle.legend, puzzle.code) === card;
    case 'sameLetter':
      return typeof card === 'number' && card * puzzle.count === puzzle.total;
    case 'signs':
      return (
        typeof card === 'string' &&
        /^[+-]+$/.test(card) &&
        card.length === puzzle.numbers.length - 1 &&
        withSigns(puzzle.numbers, card) === puzzle.result
      );
    case 'target':
      // Suma trafień: każde trafienie jest warte tyle, ile pierścień, w którym leży.
      return puzzle.hits.reduce((sum, hit) => sum + hit, 0) === card;
    case 'growing': {
      if (puzzle.outline) {
        // Nazwana figura: czwarty układ to ta sama figura o jeden większa.
        const start = shapeStart(puzzle.outline, puzzle.stages);
        return start !== null && card === cellsIn(drawShape(puzzle.outline, start + 3));
      }
      // Następna figura rośnie o tyle samo pól, o ile rosły poprzednie.
      const [a, b, c] = puzzle.stages.map(cellsIn) as [number, number, number];
      return b - a === c - b && card === c + (c - b);
    }
    case 'codeSum':
      return [...puzzle.word].reduce((sum, ch) => sum + (puzzle.legend.find((pair) => pair.letter === ch)?.value ?? NaN), 0) === card;
    case 'twoLetters': {
      const solutions = solveLetters(puzzle.sums, 30);
      return solutions.length === 1 && solutions[0]!.get(puzzle.ask) === card;
    }
    case 'chess':
      return card === missingByColor(puzzle.rows).join(',');
  }
}

/** Wszystkie liczby widoczne w zadaniu (bez kart). */
function numbersShown(puzzle: Puzzle): number[] {
  switch (puzzle.kind) {
    case 'missing':
      return [...puzzle.equation.left.values, ...puzzle.equation.right.values].filter((v): v is number => v !== null);
    case 'dice':
      return [...puzzle.dice];
    case 'sequence':
      return [...puzzle.values];
    case 'pyramid':
      return puzzle.rows.flat().filter((v): v is number => typeof v === 'number');
    case 'tiles':
    case 'chess':
      return [];
    case 'codeWord':
      return [...puzzle.legend.map((pair) => pair.value), ...puzzle.code];
    case 'sameLetter':
      return [puzzle.total];
    case 'signs':
      return [...puzzle.numbers, puzzle.result];
    case 'target':
      return [...puzzle.rings, ...puzzle.hits];
    case 'growing':
      return puzzle.stages.map(cellsIn);
    case 'codeSum':
      return puzzle.legend.map((pair) => pair.value);
    case 'twoLetters':
      return puzzle.sums.map((sum) => sum.total);
  }
}

/** Liczby na karcie: liczba, para „ciemne,jasne” (szachownica) albo żadna (słowo, znaki). */
function cardNumbers(card: Answer): number[] {
  if (typeof card === 'number') return [card];
  return /^\d+,\d+$/.test(card) ? card.split(',').map(Number) : [];
}

const holesIn = (values: readonly (number | null | 'blank')[]) => values.filter((v) => v === null).length;

// ---------------------------------------------------------------------------

describe('poziomy', () => {
  it('runda ma 7 zadań (Z-23: 5–10), a pula poziomu wystarcza na rundę bez powtórzeń', () => {
    for (const level of LEVELS) {
      expect(level.roundSize).toBe(7);
      expect(level.pool.length).toBeGreaterThanOrEqual(level.roundSize);
    }
  });

  it('manifest.levels zgadza się z LEVELS', () => {
    expect(manifest.levels).toBe(LEVELS.length);
  });

  it('levelParams przycina numer poziomu do zakresu', () => {
    expect(levelParams(0)).toBe(LEVELS[0]);
    expect(levelParams(1)).toBe(LEVELS[0]);
    expect(levelParams(99)).toBe(LEVELS[LEVELS.length - 1]);
  });

  it('poziom 1: 17 zadań sześciu typów, zakres do 10', () => {
    const level = LEVELS[0]!;
    expect(level.max).toBe(10);
    expect(level.pool).toHaveLength(17);
    expect(new Set(level.pool.map((p) => p.kind))).toEqual(
      new Set(['missing', 'dice', 'sequence', 'pyramid', 'tiles', 'codeWord']),
    );
  });

  it('poziom 2: 17 zadań ośmiu typów, zakres do 20', () => {
    const level = LEVELS[1]!;
    expect(level.max).toBe(20);
    expect(level.pool).toHaveLength(17);
    expect(new Set(level.pool.map((p) => p.kind))).toEqual(
      new Set(['missing', 'pyramid', 'sameLetter', 'signs', 'target', 'growing', 'codeSum', 'tiles']),
    );
  });

  it('poziom 3: 16 zadań siedmiu typów, zakres do 30', () => {
    const level = LEVELS[2]!;
    expect(level.max).toBe(30);
    expect(level.pool).toHaveLength(16);
    expect(new Set(level.pool.map((p) => p.kind))).toEqual(
      new Set(['sequence', 'growing', 'pyramid', 'twoLetters', 'signs', 'target', 'chess']),
    );
  });

  it('pula całej gry: 50 zadań (17, 17, 16) na trzech poziomach', () => {
    expect(LEVELS.map((level) => level.pool.length)).toEqual([17, 17, 16]);
  });

  it('polecenia zgadzają się z tabelą typów', () => {
    const prompts = new Set(
      LEVELS.flatMap((level) =>
        level.pool.map((p) =>
          p.kind === 'sameLetter'
            ? `sameLetter: ${promptOf(p) === `Ile to ${p.letter}?`}`
            : p.kind === 'twoLetters'
              ? `twoLetters: ${promptOf(p) === `Ile to ${p.ask}?`}`
              : `${p.kind}: ${promptOf(p)}`,
        ),
      ),
    );
    expect(prompts).toEqual(
      new Set([
        'growing: Z ilu kółek będzie następny trójkąt?',
        'growing: Z ilu kółek będzie następny kwadrat?',
        'growing: Z ilu kwadratów będzie następny krzyżyk?',
        'twoLetters: true',
        'chess: Ile ciemnych i ile jasnych pól brakuje?',
        'target: Ile punktów zdobył strzelec?',
        'growing: Z ilu kółek będzie następna figura?',
        'growing: Z ilu kwadratów będzie następna figura?',
        'codeSum: Ile razem są warte litery?',
        'sameLetter: true',
        'signs: Jakie znaki pasują?',
        'missing: Jaka liczba pasuje?',
        'dice: Ile oczek jest razem?',
        'sequence: Jaka liczba będzie następna?',
        'pyramid: Jaka liczba pasuje?',
        'tiles: Ile cegieł brakuje?',
        'tiles: Ile płytek brakuje?',
        'codeWord: Jakie to słowo?',
      ]),
    );
  });

  it('polecenie w częściach: litera zadania jest osobną częścią (litera platformy, Z-35), tekst = polecenie dla czytnika', () => {
    for (const puzzle of LEVELS.flatMap((level) => level.pool)) {
      const parts = promptParts(puzzle);
      const letters = parts.filter((part) => typeof part !== 'string');
      // Złożone z powrotem (litera jako zwykły znak) daje dokładnie promptOf — to czyta czytnik ekranu.
      expect(parts.map((part) => (typeof part === 'string' ? part : part.letter)).join(''), puzzle.id).toBe(promptOf(puzzle));
      if (puzzle.kind === 'sameLetter' || puzzle.kind === 'twoLetters') {
        const letter = puzzle.kind === 'sameLetter' ? puzzle.letter : puzzle.ask;
        expect(parts, puzzle.id).toEqual(['Ile to ', { letter }, '?']);
        expect(letter, puzzle.id).toMatch(/^[A-Z]$/);
      } else {
        expect(letters, puzzle.id).toEqual([]);
      }
    }
  });
});

describe('solvedPyramid', () => {
  const pyramids = LEVELS.flatMap((level) => level.pool).flatMap((p) => (p.kind === 'pyramid' ? [p] : []));

  it.each(pyramids.map((p) => [p.id, p] as const))('%s: „?” = odpowiedź, liczby z zadania bez zmian, każde kółko = suma dwóch pod nim', (_, puzzle) => {
    const solved = solvedPyramid(puzzle.rows, puzzle.answer);
    expect(solved.map((row) => row.length)).toEqual(puzzle.rows.map((row) => row.length));
    puzzle.rows.forEach((row, r) =>
      row.forEach((cell, i) => {
        expect(typeof solved[r]![i]).toBe('number');
        if (cell === null) expect(solved[r]![i]).toBe(puzzle.answer);
        else if (cell !== 'blank') expect(solved[r]![i]).toBe(cell);
      }),
    );
    solved.forEach((row, r) => r === solved.length - 1 || row.forEach((v, i) => expect(v).toBe(solved[r + 1]![i]! + solved[r + 1]![i + 1]!)));
  });

  it('piramidka 1–2–3 z „?” na górze: góra = odpowiedź, środek policzony z dołu', () => {
    // 3, 5, 4 → 3 + 5 = 8, 5 + 4 = 9 → 8 + 9 = 17 (liczone ręcznie).
    expect(solvedPyramid([[null], ['blank', 'blank'], [3, 5, 4]], 17)).toEqual([[17], [8, 9], [3, 5, 4]]);
    // „?” w dolnym rzędzie: 9 = 5 + 4.
    expect(solvedPyramid([[9], [5, null]], 4)).toEqual([[9], [5, 4]]);
  });
});

describe('pairLabel — nazwa karty szachownicy dla czytnika', () => {
  /** Forma przymiotnika po liczbie, wypisana w teście ręcznie (polska odmiana: 1, 2–4, 22–24 → „ciemne”; 0, 5–21, 25–30 → „ciemnych”). */
  const FEW = new Set([1, 2, 3, 4, 22, 23, 24]);
  const expected = (n: number, few: string, many: string) => `${n} ${FEW.has(n) ? few : many}`;

  it.each([
    ['0,1', '0 ciemnych i 1 jasne'],
    ['1,0', '1 ciemne i 0 jasnych'],
    ['2,3', '2 ciemne i 3 jasne'],
    ['4,5', '4 ciemne i 5 jasnych'],
    ['5,4', '5 ciemnych i 4 jasne'],
    ['12,22', '12 ciemnych i 22 jasne'],
    ['22,12', '22 ciemne i 12 jasnych'],
  ])('%s → „%s”', (card, label) => {
    expect(pairLabel(card)).toBe(label);
  });

  it('każda liczba 0..30 dostaje formę z ręcznej tabelki', () => {
    for (let n = 0; n <= 30; n++) {
      expect(pairLabel(`${n},${n}`), String(n)).toBe(`${expected(n, 'ciemne', 'ciemnych')} i ${expected(n, 'jasne', 'jasnych')}`);
    }
  });

  it('karty szachownic z puli', () => {
    const cards = LEVELS.flatMap((level) => level.pool).flatMap((p) => (p.kind === 'chess' ? [...p.cards] : []));
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      const [dark, light] = card.split(',').map(Number) as [number, number];
      expect(pairLabel(card), card).toBe(`${expected(dark, 'ciemne', 'ciemnych')} i ${expected(light, 'jasne', 'jasnych')}`);
    }
    expect(pairLabel('3,5')).toBe('3 ciemne i 5 jasnych');
  });
});

describe('isDarkCell — kolor pola szachownicy', () => {
  it('lewy górny róg ciemny, pola na zmianę w rzędzie i w kolumnie', () => {
    for (let r = 0; r < 8; r++) {
      for (let k = 0; k < 8; k++) {
        // Liczone w teście inaczej niż w grze: ciemne, gdy rząd i kolumna są oba parzyste albo oba nieparzyste.
        const sameParity = (r % 2 === 0) === (k % 2 === 0);
        expect(isDarkCell(r, k), `${r},${k}`).toBe(sameParity);
      }
    }
    expect(isDarkCell(0, 0)).toBe(true);
    expect(isDarkCell(0, 1)).toBe(false);
    expect(isDarkCell(1, 0)).toBe(false);
  });
});

describe('parseEquation', () => {
  it('czyta zapis z jednym „?”', () => {
    expect(parseEquation('? + 3 = 7')).toEqual({
      left: { values: [null, 3], ops: ['+'] },
      right: { values: [7], ops: [] },
    });
  });

  it('rzuca błąd, gdy „?” nie ma albo jest więcej niż jeden', () => {
    expect(() => parseEquation('4 + 3 = 7')).toThrow();
    expect(() => parseEquation('? + ? = 8')).toThrow();
    expect(() => parseEquation('? + 3 = ?')).toThrow();
  });
});

describe('pula zadań', () => {
  describe.each(levelNumbers)('poziom %i', (levelNumber) => {
    const level = levelParams(levelNumber);

    it('identyfikatory zadań są unikalne', () => {
      const ids = level.pool.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('każde zadanie ma cztery różne karty i dokładnie jedną dobrą, zgodną z danymi zadania', () => {
      for (const puzzle of level.pool) {
        expect(puzzle.cards, puzzle.id).toHaveLength(4);
        expect(new Set<Answer>(puzzle.cards).size, puzzle.id).toBe(4);
        const right = (puzzle.cards as readonly Answer[]).filter((card) => isRight(puzzle, card));
        expect(right, puzzle.id).toEqual([puzzle.answer]);
      }
    });

    it('liczby w zadaniu i na kartach mieszczą się w zakresie poziomu (0..max)', () => {
      for (const puzzle of level.pool) {
        const onCards = (puzzle.cards as readonly Answer[]).flatMap(cardNumbers);
        for (const n of [...numbersShown(puzzle), ...onCards]) {
          expect(Number.isInteger(n), puzzle.id).toBe(true);
          expect(n, puzzle.id).toBeGreaterThanOrEqual(0);
          expect(n, puzzle.id).toBeLessThanOrEqual(level.max);
        }
      }
    });

    it('każde działanie ma dokładnie jedno „?”, a po każdej stronie działań jest o jedno mniej niż liczb', () => {
      for (const puzzle of level.pool) {
        if (puzzle.kind !== 'missing') continue;
        const { left, right } = puzzle.equation;
        for (const side of [left, right]) expect(side.ops.length, puzzle.id).toBe(side.values.length - 1);
        expect(holesIn([...left.values, ...right.values]), puzzle.id).toBe(1);
      }
    });

    it('piramidka: każdy rząd ma o jedno kółko więcej niż rząd nad nim, „?” jest dokładnie jedno', () => {
      for (const puzzle of level.pool) {
        if (puzzle.kind !== 'pyramid') continue;
        expect(puzzle.rows[0]!.length, puzzle.id).toBeGreaterThanOrEqual(1);
        puzzle.rows.forEach((row, r) => r === 0 || expect(row.length, puzzle.id).toBe(puzzle.rows[r - 1]!.length + 1));
        expect(puzzle.rows.length, puzzle.id).toBeGreaterThanOrEqual(2);
        expect(holesIn(puzzle.rows.flat()), puzzle.id).toBe(1);
      }
    });

    it('ciąg liczb: co najmniej 4 liczby; krok stały i niezerowy (poziomy 1–2) albo rosnący o tyle samo (poziom 3)', () => {
      for (const puzzle of level.pool) {
        if (puzzle.kind !== 'sequence') continue;
        expect(puzzle.values.length, puzzle.id).toBeGreaterThanOrEqual(4);
        const steps = stepsOf(puzzle.values);
        if (levelNumber < 3) {
          expect(constantStep(puzzle.values), puzzle.id).toBe(true);
          expect(steps[0], puzzle.id).not.toBe(0);
        } else {
          // Jedna rozsądna kontynuacja: co najmniej 4 kroki, każdy o tyle samo (≠ 0) większy od poprzedniego.
          expect(puzzle.values.length, puzzle.id).toBeGreaterThanOrEqual(5);
          expect(constantStep(steps), puzzle.id).toBe(true);
          expect(steps[1]! - steps[0]!, puzzle.id).not.toBe(0);
        }
      }
    });

    it('brakujące pola: prostokąt z płytek (mur: co drugi rząd przesunięty o pół cegły), co najmniej jedno pole brakuje', () => {
      for (const puzzle of level.pool) {
        if (puzzle.kind !== 'tiles') continue;
        const width = puzzle.rows[0]!.length;
        puzzle.rows.forEach((row, r) => {
          expect(row, puzzle.id).toMatch(/^[#.]+$/);
          const expected = puzzle.surface === 'wall' && r % 2 === 1 ? width - 1 : width;
          expect(row.length, puzzle.id).toBe(expected);
        });
        expect(puzzle.rows.join('').includes('.'), puzzle.id).toBe(true);
      }
    });

    it('kod literowy: litery tabelki WIELKIE i różne, liczby różne, każda liczba kodu jest w tabelce', () => {
      for (const puzzle of level.pool) {
        if (puzzle.kind !== 'codeWord') continue;
        const letters = puzzle.legend.map((pair) => pair.letter);
        const values = puzzle.legend.map((pair) => pair.value);
        for (const letter of letters) expect(letter, puzzle.id).toMatch(/^[A-Z]$/);
        expect(new Set(letters).size, puzzle.id).toBe(letters.length);
        expect(new Set(values).size, puzzle.id).toBe(values.length);
        for (const n of puzzle.code) expect(values, puzzle.id).toContain(n);
      }
    });

    it('karty-słowa: 3–4 WIELKIE litery z tabelki kodu (mieszczą się na karcie)', () => {
      for (const puzzle of level.pool) {
        if (puzzle.kind !== 'codeWord') continue;
        const letters = new Set(puzzle.legend.map((pair) => pair.letter));
        for (const word of puzzle.cards) {
          expect(word, puzzle.id).toMatch(/^[A-Z]{3,4}$/);
          for (const ch of word) expect(letters.has(ch), `${puzzle.id}: ${word}`).toBe(true);
        }
      }
    });

    it('ta sama litera: jedna WIELKA litera powtórzona 2–4 razy', () => {
      for (const puzzle of level.pool) {
        if (puzzle.kind !== 'sameLetter') continue;
        expect(puzzle.letter, puzzle.id).toMatch(/^[A-Z]$/);
        expect(puzzle.count, puzzle.id).toBeGreaterThanOrEqual(2);
        expect(puzzle.count, puzzle.id).toBeLessThanOrEqual(4);
      }
    });

    it('znaki: każda karta to zestaw znaków + i − na każde puste pole, karty tej samej długości', () => {
      for (const puzzle of level.pool) {
        if (puzzle.kind !== 'signs') continue;
        expect(puzzle.numbers.length, puzzle.id).toBeGreaterThanOrEqual(3);
        for (const card of puzzle.cards) expect(card, puzzle.id).toMatch(new RegExp(`^[+-]{${puzzle.numbers.length - 1}}$`));
      }
    });

    it('znaki: przy każdej karcie (nie tylko dobrej) wynik po każdym kroku i wynik końcowy mieszczą się w zakresie poziomu (0..max)', () => {
      for (const puzzle of level.pool) {
        if (puzzle.kind !== 'signs') continue;
        for (const card of puzzle.cards) {
          const partials = partialResults(puzzle.numbers, card);
          expect(partials, `${puzzle.id} ${card}`).toHaveLength(puzzle.numbers.length - 1);
          for (const partial of partials) {
            expect(partial, `${puzzle.id} ${card}`).toBeGreaterThanOrEqual(0);
            expect(partial, `${puzzle.id} ${card}`).toBeLessThanOrEqual(level.max);
          }
        }
      }
    });

    it('tarcza: pierścienie mają różne wartości rosnące ku środkowi, każde trafienie leży w którymś pierścieniu', () => {
      for (const puzzle of level.pool) {
        if (puzzle.kind !== 'target') continue;
        expect(puzzle.rings.length, puzzle.id).toBeGreaterThanOrEqual(2);
        puzzle.rings.forEach((value, i) => i === 0 || expect(value, puzzle.id).toBeGreaterThan(puzzle.rings[i - 1]!));
        for (const hit of puzzle.hits) expect(puzzle.rings, puzzle.id).toContain(hit);
      }
    });

    it('rosnące figury: trzy prostokątne układy kółek albo kwadratów', () => {
      for (const puzzle of level.pool) {
        if (puzzle.kind !== 'growing') continue;
        expect(['circle', 'square'], puzzle.id).toContain(puzzle.shape);
        expect(puzzle.stages, puzzle.id).toHaveLength(3);
        for (const stage of puzzle.stages) {
          for (const row of stage) {
            expect(row, puzzle.id).toMatch(/^[#.]+$/);
            expect(row.length, puzzle.id).toBe(stage[0]!.length);
          }
        }
      }
    });

    it('rosnące figury nazwane (trójkąt, kwadrat, krzyżyk): trzy kolejne wielkości tej samej figury', () => {
      for (const puzzle of level.pool) {
        if (puzzle.kind !== 'growing' || !puzzle.outline) continue;
        expect(shapeStart(puzzle.outline, puzzle.stages), puzzle.id).not.toBeNull();
      }
    });

    it('rosnące figury bez nazwy: każdy układ zawiera poprzedni i rośnie o tyle samo pól', () => {
      for (const puzzle of level.pool) {
        if (puzzle.kind !== 'growing' || puzzle.outline) continue;
        const counts = puzzle.stages.map(cellsIn);
        expect(counts[1]! - counts[0]!, puzzle.id).toBeGreaterThan(0);
        expect(counts[2]! - counts[1]!, puzzle.id).toBe(counts[1]! - counts[0]!);
        puzzle.stages.forEach((stage, i) => i === 0 || expect(containedBottomLeft(puzzle.stages[i - 1]!, stage), puzzle.id).toBe(true));
      }
    });

    it('kod „ile razem”: litery tabelki WIELKIE i różne, słowo z 2–4 liter tabelki', () => {
      for (const puzzle of level.pool) {
        if (puzzle.kind !== 'codeSum') continue;
        const letters = puzzle.legend.map((pair) => pair.letter);
        for (const letter of letters) expect(letter, puzzle.id).toMatch(/^[A-Z]$/);
        expect(new Set(letters).size, puzzle.id).toBe(letters.length);
        expect(puzzle.word, puzzle.id).toMatch(/^[A-Z]{2,4}$/);
        for (const ch of puzzle.word) expect(letters, puzzle.id).toContain(ch);
      }
    });

    it('dwie litery: WIELKIE litery, jedno rozwiązanie w 0..max, w jednym zapisie stoją obie litery', () => {
      for (const puzzle of level.pool) {
        if (puzzle.kind !== 'twoLetters') continue;
        const letters = new Set(puzzle.sums.flatMap((sum) => sum.letters));
        expect(letters.size, puzzle.id).toBe(2);
        for (const letter of letters) expect(letter, puzzle.id).toMatch(/^[A-Z]$/);
        expect(letters.has(puzzle.ask), puzzle.id).toBe(true);
        expect(puzzle.sums.some((sum) => new Set(sum.letters).size === 2), puzzle.id).toBe(true);
        const solutions = solveLetters(puzzle.sums, level.max);
        expect(solutions, puzzle.id).toHaveLength(1);
        expect(solutions[0]!.get(puzzle.ask), puzzle.id).toBe(puzzle.answer);
      }
    });

    it('szachownica: prostokąt pól, brakuje pól obu kolorów, karty to pary „ciemne,jasne”', () => {
      for (const puzzle of level.pool) {
        if (puzzle.kind !== 'chess') continue;
        for (const row of puzzle.rows) {
          expect(row, puzzle.id).toMatch(/^[#.]+$/);
          expect(row.length, puzzle.id).toBe(puzzle.rows[0]!.length);
        }
        const [dark, light] = missingByColor(puzzle.rows);
        expect(dark, puzzle.id).toBeGreaterThan(0);
        expect(light, puzzle.id).toBeGreaterThan(0);
        for (const card of puzzle.cards) {
          expect(card, puzzle.id).toMatch(/^\d+,\d+$/);
          expect(pairOf(card), puzzle.id).toEqual(card.split(',').map(Number));
        }
      }
    });
  });

  it('poziom 1: jedno działanie, 2–3 kostki po 1–6 oczek, ciągi co 1 albo co 2, piramidka z jednym dodawaniem, do 6 brakujących pól', () => {
    for (const puzzle of LEVELS[0]!.pool) {
      switch (puzzle.kind) {
        case 'missing':
          expect(puzzle.equation.left.ops.length + puzzle.equation.right.ops.length, puzzle.id).toBe(1);
          break;
        case 'dice':
          expect(puzzle.dice.length, puzzle.id).toBeGreaterThanOrEqual(2);
          expect(puzzle.dice.length, puzzle.id).toBeLessThanOrEqual(3);
          for (const d of puzzle.dice) {
            expect(d, puzzle.id).toBeGreaterThanOrEqual(1);
            expect(d, puzzle.id).toBeLessThanOrEqual(6);
          }
          break;
        case 'sequence':
          expect([1, 2], puzzle.id).toContain(Math.abs(puzzle.values[1]! - puzzle.values[0]!));
          break;
        case 'pyramid':
          expect(puzzle.rows, puzzle.id).toHaveLength(2);
          break;
        case 'tiles':
          expect(puzzle.answer, puzzle.id).toBeLessThanOrEqual(6);
          break;
        case 'codeWord':
          break;
        default:
          throw new Error(`Typ ${puzzle.kind} nie należy do poziomu 1 (${puzzle.id})`);
      }
    }
  });

  it('poziom 2: działania z liczbami po obu stronach „=”, piramidka z dwoma dodawaniami, znaki przy trzech liczbach, tarcza 2–3 trafienia, do 12 brakujących pól', () => {
    for (const puzzle of LEVELS[1]!.pool) {
      switch (puzzle.kind) {
        case 'missing':
          expect(puzzle.equation.left.values.length, puzzle.id).toBeGreaterThanOrEqual(2);
          expect(puzzle.equation.right.values.length, puzzle.id).toBeGreaterThanOrEqual(2);
          break;
        case 'pyramid':
          // Dwa kółka nad trzema: dwa dodawania obok siebie.
          expect(puzzle.rows.map((row) => row.length), puzzle.id).toEqual([2, 3]);
          break;
        case 'signs':
          expect(puzzle.numbers, puzzle.id).toHaveLength(3);
          // Wszystkie cztery zestawy dwóch znaków — dokładnie jeden pasuje (sprawdza test puli).
          expect([...puzzle.cards].sort(), puzzle.id).toEqual(['++', '+-', '-+', '--']);
          break;
        case 'target':
          expect(puzzle.hits.length, puzzle.id).toBeGreaterThanOrEqual(2);
          expect(puzzle.hits.length, puzzle.id).toBeLessThanOrEqual(3);
          expect(puzzle.rings, puzzle.id).toHaveLength(3);
          break;
        case 'tiles':
          expect(puzzle.answer, puzzle.id).toBeLessThanOrEqual(12);
          break;
        case 'sameLetter':
        case 'growing':
        case 'codeSum':
          break;
        default:
          throw new Error(`Typ ${puzzle.kind} nie należy do poziomu 2 (${puzzle.id})`);
      }
    }
  });

  it('poziom 3: piramidka 1–2–3 z „?” na górze, znaki przy czterech liczbach, tarcza 4–5 trafień, figury trójkąt/kwadrat/krzyżyk', () => {
    const level = LEVELS[2]!;
    const outlines = new Set<string>();
    for (const puzzle of level.pool) {
      switch (puzzle.kind) {
        case 'pyramid': {
          expect(puzzle.rows.map((row) => row.length), puzzle.id).toEqual([1, 2, 3]);
          expect(puzzle.rows[0], puzzle.id).toEqual([null]);
          // Środkowy rząd dziecko liczy samo (puste kółka); każda liczba po drodze mieści się w zakresie.
          expect(puzzle.rows[1], puzzle.id).toEqual(['blank', 'blank']);
          for (const n of solvePyramid(puzzle.rows, puzzle.answer)!.flat()) expect(n, puzzle.id).toBeLessThanOrEqual(level.max);
          break;
        }
        case 'signs':
          expect(puzzle.numbers, puzzle.id).toHaveLength(4);
          break;
        case 'target':
          expect(puzzle.hits.length, puzzle.id).toBeGreaterThanOrEqual(4);
          expect(puzzle.hits.length, puzzle.id).toBeLessThanOrEqual(5);
          break;
        case 'growing':
          expect(puzzle.outline, puzzle.id).toBeDefined();
          outlines.add(puzzle.outline!);
          break;
        case 'sequence':
        case 'twoLetters':
        case 'chess':
          break;
        default:
          throw new Error(`Typ ${puzzle.kind} nie należy do poziomu 3 (${puzzle.id})`);
      }
    }
    expect(outlines).toEqual(new Set(['triangle', 'square', 'cross']));
    // Co najmniej jedno zadanie „znaki” z dwoma minusami w odpowiedzi.
    expect(level.pool.some((p) => p.kind === 'signs' && [...p.answer].filter((ch) => ch === '-').length >= 2)).toBe(true);
  });
});

describe('tarcza: położenie liczb i kropek (targetLayout)', () => {
  /** Odstęp (jednostki viewBox), który test wymaga między kropką a brzegiem pasa, liczbą i inną kropką. */
  const GAP = 3;
  /** Pudełko liczby: szerokość cyfry i wysokość cyfr jako ułamek czcionki (Andika pogrubiona, z zapasem). */
  const DIGIT_W = 0.6;
  const DIGIT_H = 0.75;

  const poolCases = LEVELS.flatMap((level) => level.pool).flatMap((p) => (p.kind === 'target' ? [[p.id, p.rings, p.hits] as const] : []));
  const syntheticCases = [
    ['3 pierścienie, 5 w zewnętrznym', [1, 3, 5], [1, 1, 1, 1, 1]],
    ['3 pierścienie, 5 w środkowym', [1, 3, 5], [3, 3, 3, 3, 3]],
    ['3 pierścienie, 3 w środku', [2, 5, 10], [10, 10, 10]],
    ['3 pierścienie, wszędzie po trochu', [2, 5, 10], [10, 10, 5, 5, 2]],
    ['4 pierścienie, 5 w zewnętrznym', [2, 4, 6, 8], [2, 2, 2, 2, 2]],
    ['4 pierścienie, 5 w najwęższym', [2, 4, 6, 8], [6, 6, 6, 6, 6]],
    ['4 pierścienie, 2 w środku', [2, 4, 6, 8], [8, 8, 6, 4, 2]],
    ['5 pierścieni, 5 w ostatnim przed środkiem', [1, 2, 3, 4, 10], [4, 4, 4, 4, 4]],
    ['5 pierścieni, 2 w środku i po jednym', [1, 2, 3, 4, 10], [10, 10, 4, 3, 2]],
  ] as const;

  /** Odległość punktu od prostokąta (0, gdy w środku). */
  const toBox = (x: number, y: number, box: { x0: number; y0: number; x1: number; y1: number }) =>
    Math.hypot(Math.max(box.x0 - x, 0, x - box.x1), Math.max(box.y0 - y, 0, y - box.y1));

  it.each([...poolCases, ...syntheticCases])('%s', (_, rings, hits) => {
    const t = targetLayout(rings, hits);
    const last = rings.length - 1;
    expect(t.radii).toHaveLength(rings.length);
    t.radii.forEach((r, k) => k === 0 || expect(r).toBeLessThan(t.radii[k - 1]!));
    expect(t.center - t.radii[0]!).toBeGreaterThanOrEqual(0);
    expect(t.center + t.radii[0]!).toBeLessThanOrEqual(t.size);

    // Pudełka liczb pierścieni (liczone w teście z czcionki) leżą w swoim pasie.
    expect(t.labels).toHaveLength(rings.length);
    const boxes = t.labels.map((label, k) => {
      const w = (String(rings[k]).length * DIGIT_W * t.font) / 2;
      const h = (DIGIT_H * t.font) / 2;
      const box = { x0: label.x - w, x1: label.x + w, y0: label.y - h, y1: label.y + h };
      const corners = [
        [box.x0, box.y0],
        [box.x1, box.y0],
        [box.x0, box.y1],
        [box.x1, box.y1],
      ].map(([x, y]) => Math.hypot(x! - t.center, y! - t.center));
      expect(Math.max(...corners), `liczba ${rings[k]}`).toBeLessThanOrEqual(t.radii[k]! - GAP);
      if (k < last) expect(toBox(t.center, t.center, box), `liczba ${rings[k]}`).toBeGreaterThanOrEqual(t.radii[k + 1]! + GAP);
      return box;
    });

    expect(t.dots).toHaveLength(hits.length);
    t.dots.forEach((dot, i) => {
      const k = rings.indexOf(hits[i]!);
      const d = Math.hypot(dot.x - t.center, dot.y - t.center);
      // W pasie swojego pierścienia, z odstępem od obu brzegów.
      expect(d + dot.r, `kropka ${i}`).toBeLessThanOrEqual(t.radii[k]! - GAP);
      if (k < last) expect(d - dot.r, `kropka ${i}`).toBeGreaterThanOrEqual(t.radii[k + 1]! + GAP);
      // Nie nachodzi na żadną liczbę ani na inną kropkę.
      boxes.forEach((box, j) => expect(toBox(dot.x, dot.y, box), `kropka ${i}, liczba ${rings[j]}`).toBeGreaterThanOrEqual(dot.r + GAP));
      t.dots.forEach((other, j) => j <= i || expect(Math.hypot(dot.x - other.x, dot.y - other.y), `kropki ${i} i ${j}`).toBeGreaterThanOrEqual(dot.r + other.r + GAP));
      // Kropka jest wyraźna: co najmniej 9 jednostek promienia (średnica ≥ 18 z 328).
      expect(dot.r).toBeGreaterThanOrEqual(9);
    });
  });

  it('liczby pierścieni są duże także przy 4 pierścieniach (czcionka ≥ 36 z 328)', () => {
    expect(targetLayout([1, 3, 5], [5]).font).toBeGreaterThanOrEqual(36);
    expect(targetLayout([2, 4, 6, 8], [8, 6, 6, 4, 2]).font).toBeGreaterThanOrEqual(36);
  });
});

describe('brakujące pola w rzędach (opis dla czytnika ekranu)', () => {
  it('missingCells: numery brakujących pól w każdym rzędzie, liczone od 1', () => {
    expect(missingCells(['##.#', '#..#', '####'])).toEqual([[3], [2, 3], []]);
    expect(missingCells(['.....'])).toEqual([[1, 2, 3, 4, 5]]);
  });

  it.each(LEVELS.flatMap((level) => level.pool).flatMap((p) => (p.kind === 'tiles' || p.kind === 'chess' ? [[p.id, p] as const] : [])))(
    '%s: brakujących pól w rzędach jest razem tyle, ile kropek w zapisie',
    (_, puzzle) => {
      const dots = puzzle.rows.join('').split('').filter((ch) => ch === '.').length;
      expect(missingCells(puzzle.rows).flat()).toHaveLength(dots);
    },
  );
});

describe('createTasks', () => {
  describe.each(levelNumbers)('poziom %i', (levelNumber) => {
    const level = levelParams(levelNumber);
    const rounds = SEEDS.map((seed) => createTasks(levelNumber, createRng(seed)));

    it('runda ma 7 różnych zadań z puli poziomu, co najmniej 4 typów', () => {
      for (const tasks of rounds) {
        expect(tasks).toHaveLength(7);
        expect(new Set(tasks.map((t) => t.id)).size).toBe(7);
        for (const task of tasks) expect(level.pool).toContain(task);
        expect(new Set(tasks.map((t) => t.kind)).size).toBeGreaterThanOrEqual(4);
      }
    });

    it('różne ziarna dają różne zestawy zadań (nie tylko inną kolejność)', () => {
      const sets = new Set(rounds.map((tasks) => tasks.map((t) => t.id).sort().join(',')));
      expect(sets.size).toBeGreaterThan(1);
    });

    it('to samo ziarno daje tę samą rundę', () => {
      for (const seed of SEEDS.slice(0, 5)) {
        expect(createTasks(levelNumber, createRng(seed))).toEqual(createTasks(levelNumber, createRng(seed)));
      }
    });
  });
});

describe('arrangeCards', () => {
  const allPuzzles = LEVELS.flatMap((level) => level.pool);

  it.each(allPuzzles.map((p) => [p.id, p] as const))('%s: te same cztery karty, indeks dobrej wskazuje dobrą odpowiedź', (_, puzzle) => {
    for (const seed of SEEDS) {
      const { cards, answer } = arrangeCards(puzzle, createRng(seed));
      expect([...cards].sort()).toEqual([...puzzle.cards].sort());
      expect(cards[answer]).toBe(puzzle.answer);
    }
  });

  it.each(allPuzzles.map((p) => [p.id, p] as const))('%s: dobra karta bywa na każdym z czterech miejsc, karty nigdy nie leżą rosnąco', (_, puzzle) => {
    const places = new Set<number>();
    for (const seed of SEEDS) {
      const { cards, answer } = arrangeCards(puzzle, createRng(seed));
      const ascending = cards.every((c, i) => i === 0 || cards[i - 1]! < c);
      expect(ascending).toBe(false);
      places.add(answer);
    }
    expect(places).toEqual(new Set([0, 1, 2, 3]));
  });
});
