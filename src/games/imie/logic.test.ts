import { describe, expect, it } from 'vitest';
import { BASE_ALPHABET, DIACRITICS, baseLetter } from '../../core/util/letters';
import { createRng } from '../../core/util/rng';
import { LEVELS, MAX_COLS, MAX_LETTERS, WORDS, createRound, lapsFor, layout, levelDef, parseName, pickWord, roundWords, type Round, type Task } from './logic';
import { manifest } from './manifest';

const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);
const levelNumbers = LEVELS.map((_, i) => i + 1);
const NAMES = [
  '', 'OLA', 'ANNA', 'ADAM', 'ŁUKASZ', 'JAN-PAWEŁ', 'ANNA MARIA', 'ED', 'A', 'ALEKSANDRA', 'MAKSYMILIAN', 'Żaneta', 'XAVIER',
  'KONSTANTYNA-WILHELMINA', 'ABCDEFGHIJKMNOPRSTUW', 'ŁABCDEFGHIJKMNOPRSTU', 'ŁŻĄ', 'Ż', 'LECH-ŁUCJA',
];
const lettersOf = (cells: readonly string[]) => cells.filter((c) => c !== ' ' && c !== '-');
/** Litery słowa, do którego należy zadanie. */
const wordLetters = (round: Round, task: Task) => round.words[task.word]?.letters ?? [];

describe('parseName — normalizacja imienia', () => {
  it('puste i bez liter → brak komórek', () => {
    for (const raw of ['', '   ', '-', ' - - ', '123', '!?']) expect(parseName(raw)).toEqual([]);
    expect(parseName(undefined)).toEqual([]);
    expect(parseName(42)).toEqual([]);
  });

  it('małe litery i diakrytyki → WIELKIE z polskimi znakami', () => {
    expect(parseName('ola')).toEqual(['O', 'L', 'A']);
    expect(parseName('Łukasz')).toEqual(['Ł', 'U', 'K', 'A', 'S', 'Z']);
    expect(parseName('zażółć gęślą jaźń')).toEqual([...'ZAŻÓŁĆ GĘŚLĄ JAŹŃ']);
  });

  it('powtórzone litery zostają na swoich miejscach', () => {
    expect(parseName('Anna')).toEqual(['A', 'N', 'N', 'A']);
  });

  it('spacje i myślniki to pojedyncze stałe odstępy, nigdy na brzegach; inne znaki znikają', () => {
    expect(parseName('  Anna   Maria ')).toEqual([...'ANNA MARIA']);
    expect(parseName('Jan-Paweł')).toEqual([...'JAN-PAWEŁ']);
    expect(parseName('-Jan - Paweł-')).toEqual([...'JAN-PAWEŁ']);
    expect(parseName('O1l.a!')).toEqual(['O', 'L', 'A']);
    expect(parseName('Zoë')).toEqual(['Z', 'O']);
  });

  it('bardzo długie imię jest przycinane do MAX_LETTERS liter i nie kończy się odstępem', () => {
    const cells = parseName('abcdefghij klmnoprstu wyz');
    expect(lettersOf(cells)).toHaveLength(MAX_LETTERS);
    expect(cells[cells.length - 1]).toBe('U');
    expect(lettersOf(parseName('a'.repeat(500)))).toHaveLength(MAX_LETTERS);
  });
});

describe('słowa domyślne (bez imienia)', () => {
  it('są krótkie, bez diakrytyków (Z-31) i bez odstępów', () => {
    expect(WORDS.length).toBeGreaterThanOrEqual(4);
    for (const word of WORDS) {
      expect(word.length).toBeGreaterThanOrEqual(3);
      expect(word.length).toBeLessThanOrEqual(5);
      for (const ch of word) expect(BASE_ALPHABET).toContain(ch);
    }
  });

  it('pickWord: imię wygrywa; bez imienia kolejne poziomy i rundy biorą kolejne słowa', () => {
    expect(pickWord('Ola', 1, 0)).toBe('Ola');
    expect(pickWord('', 1, 0)).toBe(WORDS[0]);
    expect(pickWord('', 2, 0)).toBe(WORDS[1]);
    expect(pickWord('', 1, 1)).toBe(WORDS[1]);
    expect(pickWord(' - ', 1, WORDS.length)).toBe(WORDS[0]);
    expect(pickWord('', 1, -3)).toBe(WORDS[0]);
    expect(pickWord('', 1, Number.NaN)).toBe(WORDS[0]);
  });

  it('roundWords: krótkie imię powtarzamy, żeby runda miała ≥ 5 zadań; długie układamy raz', () => {
    expect(roundWords('Ola', 1, 0)).toEqual(['Ola', 'Ola']);
    expect(roundWords('A', 1, 0)).toHaveLength(5);
    expect(roundWords('Aleksandra', 1, 3)).toEqual(['Aleksandra']);
  });

  it('roundWords: bez imienia runda to różne słowa — żadne nie powtarza się w rundzie ani w rundzie obok', () => {
    for (const level of levelNumbers) {
      for (let turn = 0; turn < 2 * WORDS.length; turn++) {
        const words = roundWords('', level, turn);
        expect(new Set(words).size).toBe(words.length);
        expect(words.length).toBeGreaterThanOrEqual(2);
        const count = words.join('').length;
        expect(count).toBeGreaterThanOrEqual(5);
        expect(count).toBeLessThanOrEqual(10);
        for (const next of roundWords('', level, turn + 1)) expect(words).not.toContain(next);
      }
    }
    expect(roundWords('', 1, 0)).toEqual([WORDS[0], WORDS[1]]);
    expect(roundWords('', 1, 1)).toEqual([WORDS[2], WORDS[3]]);
    expect(roundWords('', 1, Number.NaN)).toEqual([WORDS[0], WORDS[1]]);
  });
});

describe('poziomy i układ', () => {
  it('manifest.levels zgadza się z LEVELS; levelDef przycina numer', () => {
    expect(manifest.levels).toBe(LEVELS.length);
    expect(levelDef(0)).toBe(LEVELS[0]);
    expect(levelDef(99)).toBe(LEVELS[LEVELS.length - 1]);
  });

  it('poziom 1 ma stały wzór i same litery słowa; ostatni nie ma stałego wzoru', () => {
    expect(LEVELS[0]).toMatchObject({ pattern: 'steady', decoys: 0, ghost: true });
    expect(LEVELS[LEVELS.length - 1]?.pattern).toBe('hidden');
    for (const def of LEVELS) expect(def.keys).toBeLessThanOrEqual(6); // dwa rzędy po 3 przyciski na telefonie
  });

  it('lapsFor: krótkie słowa układamy kilka razy, żeby runda miała ≥ 5 zadań (Z-23)', () => {
    expect([1, 2, 3, 4, 5, 6, 10, 11, 20].map(lapsFor)).toEqual([5, 3, 2, 2, 1, 1, 1, 1, 1]);
  });

  /** Rzędy jako tekst ('·' — odstęp schowany) do czytelnych porównań. */
  const rowsOf = (name: string, max: number) => {
    const cells = parseName(name);
    const { cols, rows, places } = layout(cells, max);
    const grid: string[] = Array.from({ length: rows }, () => '');
    places.forEach((p, i) => {
      if (p) grid[p.row - 1] = `${grid[p.row - 1] ?? ''}${cells[i] ?? ''}`;
    });
    return { cols, grid, hidden: places.filter((p) => p === null).length };
  };

  it('layout: jedno słowo — rzędy ≤ max i wyrównane', () => {
    expect(rowsOf('DOM', 5)).toEqual({ cols: 3, grid: ['DOM'], hidden: 0 });
    expect(rowsOf('ALEKSANDRA', 5)).toEqual({ cols: 5, grid: ['ALEKS', 'ANDRA'], hidden: 0 });
    expect(rowsOf('ALEKSANDRA', MAX_COLS.wide)).toEqual({ cols: 10, grid: ['ALEKSANDRA'], hidden: 0 });
    expect(rowsOf('MAKSYMILIAN', 5)).toEqual({ cols: 4, grid: ['MAKS', 'YMIL', 'IAN'], hidden: 0 });
    expect(rowsOf('MAKSYMILIAN', 10)).toEqual({ cols: 6, grid: ['MAKSYM', 'ILIAN'], hidden: 0 });
    expect(rowsOf('ŁUKASZ', 5)).toEqual({ cols: 3, grid: ['ŁUK', 'ASZ'], hidden: 0 });
  });

  it('layout: części imienia nie dzielą się między rzędy, odstęp zostaje na końcu rzędu', () => {
    expect(rowsOf('JAN-PAWEŁ', 5)).toEqual({ cols: 5, grid: ['JAN-', 'PAWEŁ'], hidden: 0 });
    expect(rowsOf('JAN-PAWEŁ', 10)).toEqual({ cols: 9, grid: ['JAN-PAWEŁ'], hidden: 0 });
    expect(rowsOf('ANNA MARIA', 5)).toEqual({ cols: 5, grid: ['ANNA ', 'MARIA'], hidden: 0 });
    expect(rowsOf('ANNA MARIA', 10)).toEqual({ cols: 10, grid: ['ANNA MARIA'], hidden: 0 });
    expect(rowsOf('EWA MARIA', 5)).toEqual({ cols: 5, grid: ['EWA ', 'MARIA'], hidden: 0 });
    expect(rowsOf('ADAM-EWA', 10)).toEqual({ cols: 8, grid: ['ADAM-EWA'], hidden: 0 });
    // Odstęp, który nie mieści się na końcu pełnego rzędu, jest chowany.
    expect(rowsOf('MARIA EWA', 5)).toEqual({ cols: 5, grid: ['MARIA', 'EWA'], hidden: 1 });
  });

  it('layout: każda litera ma miejsce, miejsca się nie powtarzają i mieszczą w cols × rows', () => {
    for (const name of NAMES) {
      for (const max of [MAX_COLS.narrow, MAX_COLS.wide]) {
        const cells = parseName(name);
        const { cols, rows, places } = layout(cells, max);
        expect(cols).toBeLessThanOrEqual(max);
        const seen = new Set<string>();
        places.forEach((p, i) => {
          if (cells[i] !== ' ' && cells[i] !== '-') expect(p).not.toBeNull();
          if (!p) return;
          expect(p.col).toBeLessThanOrEqual(cols);
          expect(p.row).toBeLessThanOrEqual(rows);
          seen.add(`${p.row}:${p.col}`);
        });
        expect(seen.size).toBe(places.filter(Boolean).length);
        // Kolejność czytania zachowana.
        const order = places.filter(Boolean).map((p) => (p as { row: number; col: number }).row * 100 + (p as { col: number }).col);
        expect(order).toEqual([...order].sort((a, b) => a - b));
      }
    }
  });
});

describe('createRound', () => {
  describe.each(levelNumbers)('poziom %i', (level) => {
    const def = levelDef(level);
    const rounds = NAMES.flatMap((name) => SEEDS.map((seed) => ({ name, round: createRound(name, level, 0, createRng(seed)) })));

    it('liczba zadań: 5–10, a przy słowie dłuższym niż 10 liter — jedno ułożenie', () => {
      for (const { round } of rounds) {
        const n = round.words[0]?.letters.length ?? 0;
        const count = round.tasks.length;
        if (round.words.length === 1) expect(count % n).toBe(0); // całe ułożenia
        if (n <= 10) {
          expect(count).toBeGreaterThanOrEqual(5);
          expect(count).toBeLessThanOrEqual(10);
        } else expect(count).toBe(n);
      }
    });

    it('zadania idą po kolei przez litery słowa; lapStart tylko na pierwszej literze', () => {
      for (const { round } of rounds) {
        round.tasks.forEach((task, i) => {
          const prev = round.tasks[i - 1];
          const lastOfWord = prev ? prev.pos === wordLetters(round, prev).length - 1 : true;
          expect(task.pos).toBe(lastOfWord ? 0 : (prev?.pos ?? 0) + 1);
          if (!lastOfWord) expect(task.word).toBe(prev?.word);
          expect(task.letter).toBe(wordLetters(round, task)[task.pos]);
          expect(task.lapStart).toBe(task.pos === 0);
        });
        const last = round.tasks[round.tasks.length - 1] as Task;
        expect(last.pos).toBe(wordLetters(round, last).length - 1);
        for (const word of round.words) expect(word.letters).toEqual(lettersOf(word.cells));
      }
    });

    it('zestaw klawiszy zawsze zawiera poprawną literę, nie ma powtórzeń i mieści się w limicie', () => {
      for (const { round } of rounds) {
        for (const task of round.tasks) {
          expect(task.keys).toContain(task.letter);
          expect(new Set(task.keys).size).toBe(task.keys.length);
          expect(task.keys.length).toBeLessThanOrEqual(def.keys);
        }
      }
    });

    it('zmyłki nie są literami słowa ani ich wersjami bez ogonka; jest ich tyle, ile chce poziom', () => {
      for (const { round } of rounds) {
        for (const task of round.tasks) {
          const own = new Set(wordLetters(round, task));
          const bases = new Set(wordLetters(round, task).map(baseLetter));
          const decoys = task.keys.filter((k) => !own.has(k));
          expect(decoys).toHaveLength(def.decoys);
          for (const d of decoys) {
            expect(BASE_ALPHABET).toContain(d);
            expect(bases.has(d)).toBe(false);
          }
        }
      }
    });

    it('gdy litery słowa mieszczą się na przyciskach, zestaw i kolejność są stałe dla tego słowa', () => {
      for (const { round } of rounds) {
        round.words.forEach((word, w) => {
          const own = new Set(word.letters);
          if (own.size > def.keys - def.decoys) return;
          const tasks = round.tasks.filter((t) => t.word === w);
          for (const task of tasks) expect(task.keys).toEqual(tasks[0]?.keys);
          expect(new Set(tasks[0]?.keys.filter((k) => own.has(k))).size).toBe(own.size);
        });
      }
    });

    it('litera z ogonkiem ma wybór dla klawiatury: ona sama, litera bez ogonka i trzecia inna', () => {
      for (const { round } of rounds) {
        for (const task of round.tasks) {
          if (!DIACRITICS.includes(task.letter)) {
            expect(task.choices).toBeNull();
            continue;
          }
          expect(task.choices).toHaveLength(3);
          expect(new Set(task.choices).size).toBe(3);
          expect(task.choices).toContain(task.letter);
          expect(task.choices).toContain(baseLetter(task.letter));
          const third = task.choices?.filter((c) => c !== task.letter && c !== baseLetter(task.letter)) ?? [];
          expect(third).toHaveLength(1);
          expect(baseLetter(third[0] as string)).not.toBe(baseLetter(task.letter));
        }
      }
    });

    it('kafelki to trzy różne pojedyncze litery — klawisz litery wybiera każdy jednoznacznie', () => {
      const SINGLE = /^[A-ZĄĆĘŁŃÓŚŹŻ]$/u;
      for (const { round } of rounds) {
        for (const task of round.tasks) {
          if (!task.choices) continue;
          for (const ch of task.choices) expect(ch).toMatch(SINGLE);
          expect(new Set(task.choices.map((c) => c.toLocaleLowerCase('pl'))).size).toBe(3);
          const third = task.choices.find((c) => c !== task.letter && c !== baseLetter(task.letter));
          expect(third).toBeDefined();
          expect([task.letter, baseLetter(task.letter)]).not.toContain(third);
        }
      }
    });
  });

  it('ŁUCJA: przy „Ł” kafelki „Ł”, „L” i trzecia litera spoza pary Ł/L', () => {
    for (const seed of SEEDS) {
      const task = createRound('Łucja', 1, 0, createRng(seed)).tasks[0];
      expect(task?.letter).toBe('Ł');
      expect([...(task?.choices ?? [])].sort()).toEqual(expect.arrayContaining(['L', 'Ł']));
      const third = task?.choices?.filter((c) => c !== 'Ł' && c !== 'L') ?? [];
      expect(third).toHaveLength(1);
      expect(['Ł', 'L']).not.toContain(third[0]);
    }
  });

  it('bez imienia układa słowo domyślne, z imieniem — imię', () => {
    const text = (round: Round) => round.tasks.map((t) => t.letter).join('');
    expect(text(createRound('', 1, 0, createRng(1)))).toBe(`${WORDS[0]}${WORDS[1]}`);
    expect(text(createRound('', 1, 2, createRng(1)))).toBe(`${WORDS[4]}${WORDS[5]}`);
    expect(createRound('', 1, 0, createRng(1)).words.map((w) => w.letters.join(''))).toEqual([WORDS[0], WORDS[1]]);
    const named = createRound('ola', 3, 2, createRng(1));
    expect(text(named)).toBe('OLAOLA');
    expect(named.words).toHaveLength(1); // to samo imię = jedno słowo, układane kilka razy
    expect(named.tasks.map((t) => t.word)).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it('liczba zadań w rundzie dla imion 1–10 liter (Z-23), wprost', () => {
    const counts = ['A', 'ED', 'OLA', 'ADAM', 'EWELA', 'ŁUKASZ', 'ALEKSANDRA'].map((n) => createRound(n, 1, 0, createRng(1)).tasks.length);
    expect(counts).toEqual([5, 6, 6, 8, 5, 6, 10]);
  });

  it('powtórzona litera (ANNA) to jeden przycisk i dwa zadania', () => {
    const round = createRound('Anna', 2, 0, createRng(3));
    expect(round.tasks.map((t) => t.letter).join('')).toBe('ANNAANNA');
    expect([...(round.tasks[0]?.keys ?? [])].sort()).toEqual(['A', 'N']);
  });

  it('odstępy są w komórkach, ale nie w zadaniach', () => {
    const round = createRound('Jan-Paweł', 1, 0, createRng(1));
    expect(round.words[0]?.cells.join('')).toBe('JAN-PAWEŁ');
    expect(round.tasks.map((t) => t.letter).join('')).toBe('JANPAWEŁ');
  });

  it('to samo ziarno daje tę samą rundę', () => {
    for (const level of levelNumbers) {
      expect(createRound('Aleksandra', level, 0, createRng(7))).toEqual(createRound('Aleksandra', level, 0, createRng(7)));
    }
  });
});
