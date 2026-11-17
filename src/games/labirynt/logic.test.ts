import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/util/rng';
import {
  DIRECTIONS,
  LEVELS,
  adjacent,
  createMaze,
  createState,
  dirToward,
  findPath,
  isOpen,
  levelSpec,
  makeCode,
  nextStep,
  openGate,
  tryMove,
  wallPath,
} from './logic';
import { manifest } from './manifest';

const levelNumbers = LEVELS.map((_, i) => i + 1);
const maze = (level: number, seed = 1) => createMaze(level, createRng(seed));

describe('poziomy', () => {
  it('jest ich 20, manifest podaje tę samą liczbę', () => {
    expect(LEVELS).toHaveLength(20);
    expect(manifest.levels).toBe(LEVELS.length);
  });

  it('siatka rośnie od 3 × 3 i nie przekracza 9 × 6 (README, „Rozmiar siatki”)', () => {
    expect(LEVELS[0]).toMatchObject({ cols: 3, rows: 3 });
    LEVELS.forEach((spec, i) => {
      expect(spec.cols).toBeLessThanOrEqual(9);
      expect(spec.rows).toBeLessThanOrEqual(6);
      const prev = LEVELS[i - 1];
      if (prev) {
        expect(spec.cols).toBeGreaterThanOrEqual(prev.cols);
        expect(spec.rows).toBeGreaterThanOrEqual(prev.rows);
      }
    });
  });

  it('bramy: pierwsze poziomy bez bram, nie na każdym poziomie, kod od 1 cyfry do 5 na najwyższych', () => {
    expect(LEVELS.slice(0, 4).every((spec) => spec.gates === 0)).toBe(true);
    expect(LEVELS.slice(4).some((spec) => spec.gates === 0)).toBe(true);
    const gated = LEVELS.filter((spec) => spec.gates > 0);
    expect(gated[0]?.digits).toBe(1);
    expect(gated[gated.length - 1]?.digits).toBe(5);
    gated.forEach((spec, i) => {
      expect(spec.gates).toBeLessThanOrEqual(2);
      expect(spec.digits).toBeGreaterThanOrEqual(gated[i - 1]?.digits ?? 1);
      expect(spec.digits).toBeLessThanOrEqual(5);
    });
    LEVELS.filter((spec) => spec.gates === 0).forEach((spec) => expect(spec.digits).toBe(0));
  });

  it('levelSpec przycina numer poziomu do zakresu', () => {
    expect(levelSpec(0)).toBe(LEVELS[0]);
    expect(levelSpec(99)).toBe(LEVELS[19]);
    expect(levelSpec(Number.NaN)).toBe(LEVELS[0]);
  });
});

describe.each(levelNumbers)('labirynt poziomu %i', (level) => {
  const spec = LEVELS[level - 1]!;
  const m = maze(level);
  const path = findPath(m, m.start, m.goal);

  it('ten sam poziom = ten sam układ (bez względu na ziarno gry)', () => {
    const other = maze(level, 777);
    expect(other.open).toEqual(m.open);
    expect(other.goal).toBe(m.goal);
    expect(other.gates.map((g) => g.cell)).toEqual(m.gates.map((g) => g.cell));
  });

  it('ma rozmiar z LEVELS, start w lewym dolnym rogu i domek gdzie indziej', () => {
    expect(m.open).toHaveLength(spec.cols * spec.rows);
    expect(m.start).toBe((spec.rows - 1) * spec.cols);
    expect(m.goal).not.toBe(m.start);
  });

  it('ściany są spójne z obu stron i nie ma wyjść poza planszę', () => {
    m.open.forEach((_, cell) => {
      for (const dir of DIRECTIONS) {
        const other = adjacent(m, cell, dir);
        if (other < 0) expect(isOpen(m, cell, dir)).toBe(false);
        else expect(isOpen(m, cell, dir)).toBe(DIRECTIONS.some((back) => adjacent(m, other, back) === cell && isOpen(m, other, back)));
      }
    });
  });

  it('jest przechodni, każde pole jest osiągalne, a najkrótsza droga ma długość z LEVELS', () => {
    expect(path).not.toBeNull();
    expect(path!.length - 1).toBe(spec.path);
    m.open.forEach((_, cell) => expect(findPath(m, m.start, cell)).not.toBeNull());
  });

  it('pętle: dokładnie tyle dodatkowych przejść, ile w LEVELS', () => {
    const passages = m.open.reduce((sum, _, cell) => sum + DIRECTIONS.filter((dir) => isOpen(m, cell, dir)).length, 0) / 2;
    expect(passages).toBe(spec.cols * spec.rows - 1 + spec.loops);
  });

  it('bramy leżą na drodze do domku, w kolejności i nie da się ich ominąć; nie stoją na starcie, w domku ani obok siebie', () => {
    expect(m.gates).toHaveLength(spec.gates);
    const indexes = m.gates.map((gate) => path!.indexOf(gate.cell));
    indexes.forEach((index, i) => {
      expect(index).toBeGreaterThan(0);
      expect(index).toBeLessThan(path!.length - 1);
      expect(index).toBeGreaterThan((indexes[i - 1] ?? -1) + 1);
    });
    for (const gate of m.gates) expect(findPath(m, m.start, m.goal, gate.cell)).toBeNull();
  });

  it('kody mają długość z LEVELS, same cyfry, bez dwóch takich samych pod rząd', () => {
    for (let seed = 1; seed <= 20; seed++) {
      for (const gate of maze(level, seed).gates) {
        expect(gate.code).toMatch(new RegExp(`^\\d{${spec.digits}}$`));
        expect(gate.code).not.toMatch(/(\d)\1/);
      }
    }
  });

  it('idąc za podpowiedzią (nextStep) i otwierając bramy, jeżyk dochodzi do domku w `path` krokach', () => {
    const state = createState(maze(level));
    let steps = 0;
    let gates = 0;
    for (; steps < 200; steps++) {
      const dir = nextStep(state);
      if (!dir) break;
      const result = tryMove(state, dir);
      if (result.kind === 'gate') {
        expect(tryMove(state, dir).kind).toBe('gate'); // zamknięta brama nie przepuszcza
        openGate(state, result.gate);
        gates++;
      } else {
        expect(result.kind).toBe(state.pos === state.maze.goal ? 'goal' : 'step');
      }
    }
    expect(state.pos).toBe(state.maze.goal);
    expect(steps).toBe(spec.path);
    expect(gates).toBe(spec.gates);
  });

  it('ściana zatrzymuje jeżyka i niczego nie zmienia', () => {
    const state = createState(maze(level));
    for (const dir of DIRECTIONS.filter((d) => !isOpen(state.maze, state.pos, d))) {
      expect(tryMove(state, dir)).toEqual({ kind: 'wall' });
      expect(state.pos).toBe(state.maze.start);
    }
  });

  it('rysunek ścian: ramka i jedna kreska na każdą zamkniętą ścianę wewnętrzną', () => {
    const inner = spec.cols * (spec.rows - 1) + spec.rows * (spec.cols - 1);
    expect(wallPath(m).match(/M/g)).toHaveLength(1 + inner - (spec.cols * spec.rows - 1 + spec.loops));
  });
});

describe('trudność', () => {
  it('najkrótsza droga rośnie z każdym poziomem (o 1–2 kroki), od 4 do najwyżej 30 kroków', () => {
    const lengths = levelNumbers.map((level) => {
      const m = maze(level);
      return findPath(m, m.start, m.goal)!.length - 1;
    });
    expect(lengths[0]).toBe(4);
    lengths.forEach((length, i) => {
      if (i === 0) return;
      expect(length).toBeGreaterThan(lengths[i - 1]!);
      expect(length - lengths[i - 1]!).toBeLessThanOrEqual(2);
    });
    expect(lengths[19]).toBeLessThanOrEqual(30);
  });
});

describe('makeCode i dirToward', () => {
  it('kod jednocyfrowy nie jest zerem', () => {
    for (let seed = 1; seed <= 200; seed++) expect(makeCode(1, createRng(seed))).toMatch(/^[1-9]$/);
  });

  it('różne ziarna dają różne kody', () => {
    const codes = new Set(Array.from({ length: 20 }, (_, seed) => makeCode(5, createRng(seed + 1))));
    expect(codes.size).toBeGreaterThan(15);
  });

  it('stuknięcie wybiera kierunek dominującej osi, a stuknięcie w jeżyka nic nie robi', () => {
    expect(dirToward(50, 10, 20)).toBe('right');
    expect(dirToward(-50, 10, 20)).toBe('left');
    expect(dirToward(10, 50, 20)).toBe('down');
    expect(dirToward(10, -50, 20)).toBe('up');
    expect(dirToward(10, -15, 20)).toBeNull();
  });
});
