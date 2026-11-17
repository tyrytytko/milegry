/**
 * „Labirynty z jeżykiem” — poziomy, generator labiryntu i reguły ruchu. Czyste funkcje, bez DOM.
 *
 * Układ labiryntu zależy TYLKO od numeru poziomu (własne ziarno), więc ten sam poziom to zawsze ten sam
 * labirynt — dziecko może wrócić do znanego. Losowe (z `rng` gry) są jedynie cyfry kodów na bramach.
 */
import type { Direction, Rng } from '../../core/types';
import { createRng } from '../../core/util/rng';

export interface LevelSpec {
  cols: number;
  rows: number;
  /** Długość najkrótszej drogi start → domek (w krokach). */
  path: number;
  /** Liczba bram z kodem na drodze. */
  gates: number;
  /** Liczba cyfr kodu każdej bramy. */
  digits: number;
  /** Dodatkowe przejścia (pętle): więcej niż jedna droga w bocznych częściach labiryntu. */
  loops: number;
}

const level = (cols: number, rows: number, path: number, gates = 0, digits = 0, loops = 0): LevelSpec => ({ cols, rows, path, gates, digits, loops });

/** 20 poziomów. Największa siatka to 9 × 6 pól — dlaczego nie 10 × 10: README, „Rozmiar siatki”. */
export const LEVELS: LevelSpec[] = [
  level(3, 3, 4),
  level(3, 3, 6),
  level(4, 3, 7),
  level(4, 4, 8),
  level(5, 4, 9, 1, 1),
  level(5, 4, 10, 1, 1),
  level(5, 5, 11, 1, 2),
  level(6, 5, 12, 1, 2),
  level(6, 5, 13),
  level(7, 5, 14, 2, 2),
  level(7, 5, 15, 2, 2),
  level(7, 6, 16, 1, 3),
  level(8, 6, 17, 2, 3, 2),
  level(8, 6, 18, 0, 0, 3),
  level(8, 6, 19, 2, 3, 3),
  level(9, 6, 20, 1, 4, 3),
  level(9, 6, 21, 2, 4, 4),
  level(9, 6, 22, 2, 4, 4),
  level(9, 6, 24, 1, 5, 4),
  level(9, 6, 26, 2, 5, 4),
];

/** Parametry poziomu; numer spoza zakresu jest przycinany. */
export function levelSpec(levelNumber: number): LevelSpec {
  const index = Math.min(LEVELS.length, Math.max(1, Math.round(levelNumber) || 1)) - 1;
  return LEVELS[index] as LevelSpec;
}

export interface Gate {
  cell: number;
  /** Kod z cyfr, np. '37' — widoczny na tabliczce przy bramie (Z-38). */
  code: string;
}

export interface Maze {
  cols: number;
  rows: number;
  /** Dla każdego pola maska otwartych przejść (BIT[kierunek]). Pole = y * cols + x. */
  open: number[];
  start: number;
  goal: number;
  /** Bramy w kolejności od startu do domku. */
  gates: Gate[];
}

export const DIRECTIONS: Direction[] = ['up', 'right', 'down', 'left'];
const BIT: Record<Direction, number> = { up: 1, right: 2, down: 4, left: 8 };
const BACK: Record<Direction, Direction> = { up: 'down', right: 'left', down: 'up', left: 'right' };
const DX: Record<Direction, number> = { up: 0, right: 1, down: 0, left: -1 };
const DY: Record<Direction, number> = { up: -1, right: 0, down: 1, left: 0 };

/** Sąsiednie pole siatki w danym kierunku (bez patrzenia na ściany) albo -1 poza siatką. */
export function adjacent(maze: Pick<Maze, 'cols' | 'rows'>, cell: number, dir: Direction): number {
  const x = (cell % maze.cols) + DX[dir];
  const y = Math.floor(cell / maze.cols) + DY[dir];
  return x < 0 || y < 0 || x >= maze.cols || y >= maze.rows ? -1 : y * maze.cols + x;
}

/** Czy z pola da się przejść w danym kierunku (nie ma ściany). */
export const isOpen = (maze: Maze, cell: number, dir: Direction): boolean => ((maze.open[cell] ?? 0) & BIT[dir]) !== 0;

function setPassage(maze: Maze, cell: number, dir: Direction, passable: boolean): void {
  const other = adjacent(maze, cell, dir);
  if (other < 0) return;
  const set = (index: number, bit: number) => {
    maze.open[index] = passable ? (maze.open[index] ?? 0) | bit : (maze.open[index] ?? 0) & ~bit;
  };
  set(cell, BIT[dir]);
  set(other, BIT[BACK[dir]]);
}

/** Najkrótsza droga (lista pól od `from` do `to` włącznie) albo null. `blocked` — pole, przez które nie wolno iść. */
export function findPath(maze: Maze, from: number, to: number, blocked = -1): number[] | null {
  const prev = new Map<number, number>([[from, from]]);
  const queue = [from];
  for (let i = 0; i < queue.length; i++) {
    const cell = queue[i] as number;
    if (cell === to) {
      const path = [to];
      while (path[0] !== from) path.unshift(prev.get(path[0] as number) as number);
      return path;
    }
    for (const dir of DIRECTIONS) {
      const next = adjacent(maze, cell, dir);
      if (next < 0 || next === blocked || prev.has(next) || !isOpen(maze, cell, dir)) continue;
      prev.set(next, cell);
      queue.push(next);
    }
  }
  return null;
}

/** Drzewo korytarzy (każde pole osiągalne, dokładnie jedna droga między polami) — błądzenie w głąb z nawrotami. */
function carve(spec: LevelSpec, rng: Rng): Maze {
  const maze: Maze = {
    cols: spec.cols,
    rows: spec.rows,
    open: new Array<number>(spec.cols * spec.rows).fill(0),
    start: (spec.rows - 1) * spec.cols,
    goal: 0,
    gates: [],
  };
  const seen = new Set([maze.start]);
  const stack = [maze.start];
  while (stack.length > 0) {
    const cell = stack[stack.length - 1] as number;
    const dir = rng.shuffle(DIRECTIONS).find((d) => adjacent(maze, cell, d) >= 0 && !seen.has(adjacent(maze, cell, d)));
    if (!dir) {
      stack.pop();
      continue;
    }
    const next = adjacent(maze, cell, dir);
    setPassage(maze, cell, dir, true);
    seen.add(next);
    stack.push(next);
  }
  return maze;
}

const ATTEMPTS = 400;

/**
 * Układ poziomu (bez kodów): start w lewym dolnym rogu, domek w ślepym zaułku odległym dokładnie o
 * `spec.path` kroków, bramy równo rozłożone NA drodze do domku, na końcu pętle. Pętla jest przyjmowana
 * tylko wtedy, gdy nie skraca drogi i nie pozwala ominąć żadnej bramy.
 */
export function generateLayout(spec: LevelSpec, rng: Rng): Maze {
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const maze = carve(spec, rng);
    const exits = (cell: number) => DIRECTIONS.filter((dir) => isOpen(maze, cell, dir)).length;
    const goal = maze.open.findIndex(
      (_, cell) => cell !== maze.start && exits(cell) === 1 && (findPath(maze, maze.start, cell)?.length ?? 0) - 1 === spec.path,
    );
    if (goal < 0) continue;
    maze.goal = goal;
    const path = findPath(maze, maze.start, goal) as number[];
    const cells = Array.from({ length: spec.gates }, (_, i) => path[Math.round((spec.path * (i + 1)) / (spec.gates + 1))] as number);
    maze.gates = cells.map((cell) => ({ cell, code: '' }));

    let loops = 0;
    const walls = rng.shuffle(maze.open.flatMap((_, cell) => (['right', 'down'] as Direction[]).map((dir) => ({ cell, dir }))));
    for (const { cell, dir } of walls) {
      if (loops >= spec.loops) break;
      if (adjacent(maze, cell, dir) < 0 || isOpen(maze, cell, dir)) continue;
      setPassage(maze, cell, dir, true);
      const stillLong = (findPath(maze, maze.start, goal)?.length ?? 0) - 1 === spec.path;
      const gatesHold = cells.every((gate) => findPath(maze, maze.start, goal, gate) === null);
      if (stillLong && gatesHold) loops++;
      else setPassage(maze, cell, dir, false);
    }
    if (loops === spec.loops) return maze;
  }
  throw new Error(`labirynt: nie udało się ułożyć poziomu ${spec.cols}×${spec.rows} z drogą ${spec.path}`);
}

/** Kod bramy: `length` cyfr, sąsiednie cyfry różne (to samo dwa razy pod rząd myli się z drżącym palcem). */
export function makeCode(length: number, rng: Rng): string {
  let code = '';
  while (code.length < length) {
    const digit = String(rng.int(length === 1 ? 1 : 0, 9));
    if (digit !== code.slice(-1)) code += digit;
  }
  return code;
}

/** Labirynt poziomu: układ zawsze ten sam (ziarno = numer poziomu), kody bram losowane z `rng`. */
export function createMaze(levelNumber: number, rng: Rng): Maze {
  const spec = levelSpec(levelNumber);
  const maze = generateLayout(spec, createRng(LEVELS.indexOf(spec) + 1));
  for (const gate of maze.gates) gate.code = makeCode(spec.digits, rng);
  return maze;
}

// ---------------------------------------------------------------------------
// Ruch
// ---------------------------------------------------------------------------

export interface State {
  maze: Maze;
  /** Pole, na którym stoi jeżyk. */
  pos: number;
  /** Pola otwartych już bram. */
  opened: number[];
}

export const createState = (maze: Maze): State => ({ maze, pos: maze.start, opened: [] });

export type MoveResult =
  /** Ściana albo brzeg planszy: jeżyk stoi. To nie jest błąd dziecka. */
  | { kind: 'wall' }
  /** Zamknięta brama: jeżyk stoi przed nią, czas wpisać kod. */
  | { kind: 'gate'; gate: Gate }
  | { kind: 'step' }
  /** Jeżyk wszedł do domku — koniec rundy. */
  | { kind: 'goal' };

/** Jeden krok jeżyka w danym kierunku. */
export function tryMove(state: State, dir: Direction): MoveResult {
  if (!isOpen(state.maze, state.pos, dir)) return { kind: 'wall' };
  const next = adjacent(state.maze, state.pos, dir);
  const gate = state.maze.gates.find((g) => g.cell === next && !state.opened.includes(next));
  if (gate) return { kind: 'gate', gate };
  state.pos = next;
  return { kind: next === state.maze.goal ? 'goal' : 'step' };
}

/** Otwiera bramę, przed którą stoi jeżyk, i wprowadza go na jej pole. */
export function openGate(state: State, gate: Gate): void {
  if (!state.opened.includes(gate.cell)) state.opened.push(gate.cell);
  state.pos = gate.cell;
}

/** Kierunek następnego kroku najkrótszej drogi do domku (bramy liczą się jak przejścia); null w domku. */
export function nextStep(state: State): Direction | null {
  const next = findPath(state.maze, state.pos, state.maze.goal)?.[1];
  return DIRECTIONS.find((dir) => isOpen(state.maze, state.pos, dir) && adjacent(state.maze, state.pos, dir) === next) ?? null;
}

/** Kierunek stuknięcia względem jeżyka (dx, dy w px); null, gdy stuknięto w samego jeżyka (bliżej niż `dead`). */
export function dirToward(dx: number, dy: number, dead: number): Direction | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < dead) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

/** Ściany jako ścieżka SVG w jednostkach pól (viewBox 0 0 cols rows): ramka i ściany wewnętrzne. */
export function wallPath(maze: Maze): string {
  let d = `M0 0H${maze.cols}V${maze.rows}H0Z`;
  maze.open.forEach((_, cell) => {
    const x = cell % maze.cols;
    const y = Math.floor(cell / maze.cols);
    if (x < maze.cols - 1 && !isOpen(maze, cell, 'right')) d += `M${x + 1} ${y}v1`;
    if (y < maze.rows - 1 && !isOpen(maze, cell, 'down')) d += `M${x} ${y + 1}h1`;
  });
  return d;
}
