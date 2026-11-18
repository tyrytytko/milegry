/**
 * Rysunki zadań na kartce — każdy typ zadania (`Puzzle['kind']`) ma tu swoją funkcję, która z danych
 * zadania buduje rysunek z miejscem na „?” i umie to miejsce wypełnić odpowiedzią. Kolory nadaje
 * style.css (z tokenów), tu tylko kształt. Litery (kod literowy) rysuje fabryka liter z game.ts
 * (ctx.ui.letter, Z-35), bo rysunki nie mają dostępu do ctx.
 */
import { h } from '../../core/util/dom';
import {
  countWith,
  isDarkCell,
  missingCells,
  pairLabel,
  pairOf,
  solvedPyramid,
  targetLayout,
  type ChessPuzzle,
  type CodeSumPuzzle,
  type CodeWordPuzzle,
  type DicePuzzle,
  type GrowingPuzzle,
  type LetterCode,
  type MissingPuzzle,
  type Op,
  type Puzzle,
  type PyramidPuzzle,
  type SameLetterPuzzle,
  type SequencePuzzle,
  type Side,
  type SignsPuzzle,
  type TargetPuzzle,
  type TilesPuzzle,
  type TwoLettersPuzzle,
} from './logic';

/** Litera zadania (WIELKA, krój wg ustawień rodzica) — z ctx.ui.letter w game.ts. */
export type LetterFactory = (char: string) => HTMLElement;

/** Rysunek zadania na kartce. */
export interface Figure {
  /** Cały rysunek — wstawiany do kartki; jego `aria-label` czyta czytnik ekranu zamiast rysunku. */
  el: HTMLElement;
  /** „?” zamienia się w odpowiedź, a opis dla czytnika dostaje odpowiedź zamiast „ile?” (po dobrej odpowiedzi i przy „zróbmy razem”). */
  reveal(): void;
}

const P = 'g-konkurs-matematyczny';
const SVG_NS = 'http://www.w3.org/2000/svg';

/** Znak działania na ekranie (minus jako „−”, nie łącznik) i jego nazwa dla czytnika ekranu. */
export const OP_TEXT: Record<Op, string> = { '+': '+', '-': '−' };
export const OP_WORD: Record<Op, string> = { '+': 'plus', '-': 'minus' };

const hole = () => h('span', { class: `${P}-hole` }, '?');
const token = (text: string, kind: 'num' | 'sign') => h('span', { class: `${P}-${kind}` }, text);

/**
 * Rząd rysunku, który musi zmieścić się w jednym wierszu kartki. Przybliżona szerokość rzędu w em
 * (liczby, znaki, litery, „?” i odstępy) idzie do --g-konkurs-matematyczny-fit, a style.css zmniejsza
 * czcionkę długiego rzędu, gdy kartka jest wąska (np. „15 − 3 = 4 + ? + 2” na telefonie w pionie).
 */
const EM = { digit: 0.61, comma: 0.33, sign: 0.65, letter: 0.85, hole: 1.75, gap: 0.25 };

/** Przybliżona szerokość rzędu w em (czcionki rzędu). */
function rowWidth(nodes: readonly HTMLElement[]): number {
  return nodes.reduce((sum, node) => {
    if (node.classList.contains(`${P}-hole`)) return sum + EM.hole;
    if (node.classList.contains(`${P}-letter-token`)) return sum + EM.letter;
    if (node.classList.contains(`${P}-sign`)) return sum + EM.sign;
    return sum + [...(node.textContent ?? '')].reduce((w, ch) => w + (ch === ',' ? EM.comma : EM.digit), 0);
  }, (nodes.length - 1) * EM.gap);
}

function fitRow(el: HTMLElement, nodes: readonly HTMLElement[]): void {
  fitWidth(el, rowWidth(nodes));
}

/**
 * Rząd we wnętrzu rysunku, który ma własną czcionkę rysunku (rząd „K + O + T = ?” pod tabelką kodu):
 * tak jak fitRow, ale mniejszą czcionkę dostaje tylko ten rząd (style.css: …-figure-row--fit).
 */
function fitInnerRow(row: HTMLElement, nodes: readonly HTMLElement[]): void {
  row.classList.add(`${P}-figure-row--fit`);
  row.style.setProperty(`--${P}-fit`, rowWidth(nodes).toFixed(2));
}

/** Rysunek o znanej szerokości w em (np. obrazek SVG obok „?”) — mniejsza czcionka, gdy nie mieści się na kartce. */
function fitWidth(el: HTMLElement, widthEm: number): void {
  el.classList.add(`${P}-figure--fit`);
  el.style.setProperty(`--${P}-fit`, widthEm.toFixed(2));
}

/**
 * Rysunek z opisem dla czytnika. `describe(null)` — opis przed rozwiązaniem (z „ile?”),
 * `describe(odpowiedź)` — po rozwiązaniu. `fill` wstawia odpowiedź w miejsce „?”.
 */
function makeFigure(el: HTMLElement, describe: (answer: string | null) => string, answer: string, fill: () => void): Figure {
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', describe(null));
  return {
    el,
    reveal() {
      fill();
      el.setAttribute('aria-label', describe(answer));
    },
  };
}

/** Rząd elementów z polem „?” na liczbę (wspólne dla działań, kostek, ciągów i pól). */
function numberFigure(children: HTMLElement[], holeEl: HTMLElement, answer: number, describe: (a: string | null) => string): Figure {
  const el = h('div', { class: `${P}-figure` }, children);
  return makeFigure(el, describe, String(answer), () => {
    holeEl.textContent = String(answer);
    holeEl.classList.add(`${P}-hole--filled`);
  });
}

/** Element SVG z klasą (bez kolorów — kolory w style.css). */
function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
  return node;
}

// --- brakująca liczba -------------------------------------------------------

function sideTokens(side: Side, holeEl: HTMLElement, holeWord: string): { nodes: HTMLElement[]; words: string[] } {
  const nodes: HTMLElement[] = [];
  const words: string[] = [];
  side.values.forEach((value, i) => {
    if (i > 0) {
      const op = side.ops[i - 1]!;
      nodes.push(token(OP_TEXT[op], 'sign'));
      words.push(OP_WORD[op]);
    }
    nodes.push(value === null ? holeEl : token(String(value), 'num'));
    words.push(value === null ? holeWord : String(value));
  });
  return { nodes, words };
}

function missingFigure(puzzle: MissingPuzzle): Figure {
  const holeEl = hole();
  const nodes = (holeWord: string) => {
    const left = sideTokens(puzzle.equation.left, holeEl, holeWord);
    const right = sideTokens(puzzle.equation.right, holeEl, holeWord);
    return { nodes: [...left.nodes, token('=', 'sign'), ...right.nodes], label: [...left.words, 'równa się', ...right.words].join(' ') };
  };
  const row = nodes('ile?').nodes;
  const figure = numberFigure(row, holeEl, puzzle.answer, (a) => nodes(a ?? 'ile?').label);
  fitRow(figure.el, row);
  return figure;
}

// --- kostki -----------------------------------------------------------------

/** Położenie oczek na kostce (siatka 3 × 3, współrzędne 0–2). */
const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
};

function dieSvg(pips: number): string {
  const dots = (PIPS[pips] ?? [])
    .map(([x, y]) => `<circle class="${P}-pip" cx="${26 + x * 24}" cy="${26 + y * 24}" r="9"/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><rect class="${P}-die-body" x="4" y="4" width="92" height="92" rx="16"/>${dots}</svg>`;
}

function diceFigure(puzzle: DicePuzzle): Figure {
  const holeEl = hole();
  const dice = puzzle.dice.map((pips) => {
    const die = h('span', { class: `${P}-die` });
    die.innerHTML = dieSvg(pips); // SVG z tego pliku, nie dane z zewnątrz
    return die;
  });
  return numberFigure(
    [...dice, token('=', 'sign'), holeEl],
    holeEl,
    puzzle.answer,
    (a) => `Kostki z oczkami: ${puzzle.dice.slice(0, -1).join(', ')} i ${puzzle.dice.at(-1)}. Razem: ${a ?? 'ile?'}`,
  );
}

// --- ciąg liczb -------------------------------------------------------------

function sequenceFigure(puzzle: SequencePuzzle): Figure {
  const holeEl = hole();
  // Przecinek przy liczbie („30,”), odstęp dopiero po nim — rząd jest węższy, więc liczby mogą być większe.
  const nodes = puzzle.values.map((value) => token(`${value},`, 'num'));
  const figure = numberFigure(
    [...nodes, holeEl],
    holeEl,
    puzzle.answer,
    (a) => `Liczby po kolei: ${puzzle.values.join(', ')}, ${a ?? 'ile?'}`,
  );
  // Długi ciąg (poziom 3: pięć liczb, część dwucyfrowa) dostaje mniejszą czcionkę na wąskiej kartce.
  fitRow(figure.el, [...nodes, holeEl]);
  return figure;
}

// --- piramidka dodawania ------------------------------------------------------

/**
 * Wymiary piramidki w jednostkach viewBox: kółko, odstęp między kółkami w rzędzie, odstęp rzędów
 * (przy trzech rzędach mniejszy, żeby kółka i liczby nie zmalały za bardzo).
 */
const PYR = { r: 40, gap: 16, rowGap: 40, tallRowGap: 26, pad: 4 };

function pyramidFigure(puzzle: PyramidPuzzle): Figure {
  const { r, gap, pad } = PYR;
  const tall = puzzle.rows.length > 2;
  const rowGap = tall ? PYR.tallRowGap : PYR.rowGap;
  const bottom = puzzle.rows.length - 1; // indeks dolnego rzędu
  const wide = puzzle.rows[bottom]!.length; // kółek w dolnym rzędzie
  const half = r + gap / 2; // pół kroku między środkami kółek w rzędzie
  const width = wide * 2 * r + (wide - 1) * gap + 2 * pad;
  const height = puzzle.rows.length * 2 * r + bottom * rowGap + 2 * pad;
  // Każdy rząd jest wyśrodkowany nad dolnym, więc kółko stoi dokładnie między dwoma kółkami pod nim.
  const center = (row: number, i: number) => ({
    x: pad + r + (wide - puzzle.rows[row]!.length + 2 * i) * half,
    y: pad + r + row * (2 * r + rowGap),
  });

  const picture = svg('svg', { viewBox: `0 0 ${width} ${height}`, 'aria-hidden': 'true', focusable: 'false', class: `${P}-pyramid` });
  // Kreski od każdego kółka do dwóch kółek pod nim („te dwa dodane dają to”).
  puzzle.rows.forEach((row, ri) => {
    if (ri === bottom) return;
    row.forEach((_, i) => {
      const top = center(ri, i);
      for (const child of [i, i + 1]) {
        const low = center(ri + 1, child);
        const dx = low.x - top.x;
        const dy = low.y - top.y;
        const len = Math.hypot(dx, dy);
        picture.append(
          svg('line', {
            class: `${P}-pyramid-link`,
            x1: top.x + (dx / len) * r,
            y1: top.y + (dy / len) * r,
            x2: low.x - (dx / len) * r,
            y2: low.y - (dy / len) * r,
          }),
        );
      }
    });
  });

  let holeRing: SVGCircleElement | null = null;
  // Napisy kółek do uzupełnienia po rozwiązaniu: „?” i puste kółka (te dostają policzone liczby).
  const toFill: { text: SVGTextElement; row: number; i: number }[] = [];
  puzzle.rows.forEach((row, ri) => {
    row.forEach((value, i) => {
      const { x, y } = center(ri, i);
      const ring = svg('circle', { class: `${P}-pyramid-cell`, cx: x, cy: y, r: r - 2 });
      const text = svg('text', { class: `${P}-pyramid-num`, x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central' });
      if (value === null) {
        text.textContent = '?';
        ring.classList.add(`${P}-pyramid-cell--hole`);
        holeRing = ring;
        toFill.push({ text, row: ri, i });
      } else if (value === 'blank') {
        // Puste kółko: ciągły obrys, bez liczby — dziecko liczy je po drodze (nie jest pytaniem).
        ring.classList.add(`${P}-pyramid-cell--blank`);
        toFill.push({ text, row: ri, i });
      } else {
        text.textContent = String(value);
      }
      picture.append(ring, text);
    });
  });

  const solved = solvedPyramid(puzzle.rows, puzzle.answer);
  const describe = (a: string | null) =>
    'Piramidka, każde kółko to suma dwóch kółek pod nim; ' +
    puzzle.rows
      .map((row, ri) => {
        const cells = row.map((v, i) => (v === null ? (a ?? 'ile?') : v === 'blank' ? (a === null ? 'puste' : String(solved[ri]![i])) : String(v)));
        return `rząd ${ri + 1}: ${cells.join(' i ')}`;
      })
      .join('; ');
  const box = h('span', { class: `${P}-pyramid-box${tall ? ` ${P}-pyramid-box--tall` : ''}` }, [picture]);
  const el = h('div', { class: `${P}-figure` }, [box]);
  return makeFigure(el, describe, String(puzzle.answer), () => {
    for (const { text, row, i } of toFill) text.replaceChildren(String(solved[row]![i]));
    (holeRing as SVGCircleElement | null)?.classList.add(`${P}-pyramid-cell--filled`);
  });
}

// --- brakujące pola -----------------------------------------------------------

/** Wymiary pól w jednostkach viewBox: płytka podłogi (kwadrat) i cegła muru (prostokąt 2 : 1). */
const TILE = { floor: { w: 40, h: 40 }, wall: { w: 50, h: 25 } };
/** Wysokość jednego rzędu pól w em — ta sama co w style.css (.g-konkurs-matematyczny-tiles-box). */
const TILE_ROW_EM = 1;
const STROKE = 3;

function tilesFigure(puzzle: TilesPuzzle): Figure {
  const { w, h: rowH } = TILE[puzzle.surface];
  const columns = puzzle.rows[0]!.length;
  const width = columns * w + STROKE;
  const height = puzzle.rows.length * rowH + STROKE;
  const picture = svg('svg', {
    viewBox: `0 0 ${width} ${height}`,
    'aria-hidden': 'true',
    focusable: 'false',
    class: `${P}-tiles ${P}-tiles--${puzzle.surface}`,
  });
  const o = STROKE / 2;
  const cell = (x: number, y: number, cw: number, missingCell: boolean) =>
    picture.append(
      svg('rect', {
        class: `${P}-tile${missingCell ? ` ${P}-tile--missing` : ''}`,
        x: o + x,
        y: o + y,
        width: cw,
        height: rowH,
      }),
    );

  puzzle.rows.forEach((row, ri) => {
    const y = ri * rowH;
    const shifted = puzzle.surface === 'wall' && ri % 2 === 1;
    // Mur: przesunięty rząd ma na obu końcach połówki cegieł (zawsze są).
    if (shifted) {
      cell(0, y, w / 2, false);
      cell(columns * w - w / 2, y, w / 2, false);
    }
    [...row].forEach((c, i) => cell((shifted ? w / 2 : 0) + i * w, y, w, c === '.'));
  });

  const holeEl = hole();
  // Opis dla czytnika ekranu pozwala rozwiązać zadanie: ile pól brakuje w każdym rzędzie.
  const perRow = missingCells(puzzle.rows).map((cells) => cells.length).join(', ');
  const what =
    puzzle.surface === 'wall'
      ? `Mur z cegieł, ${countWith(puzzle.rows.length, 'rzędy', 'rzędów')}. Brakujące cegły w kolejnych rzędach: ${perRow}`
      : `Podłoga z płytek, ${countWith(puzzle.rows.length, 'rzędy', 'rzędów')} po ${countWith(columns, 'płytki', 'płytek')}. Brakujące płytki w kolejnych rzędach: ${perRow}`;
  // Wysokość rysunku rośnie z liczbą rzędów, więc pole ma ten sam rozmiar w każdym zadaniu.
  const box = h('span', { class: `${P}-tiles-box`, style: `--${P}-rows: ${puzzle.rows.length}` }, [picture]);
  const figure = numberFigure([box, holeEl], holeEl, puzzle.answer, (a) => `${what}. Brakuje: ${a ?? 'ile?'}`);
  // Szeroki mur albo podłoga dostaje mniejszą czcionkę, gdy nie mieści się na kartce (wysokość w em jak w style.css).
  const heightEm = puzzle.rows.length * TILE_ROW_EM;
  fitWidth(figure.el, heightEm * (width / height) + EM.gap + EM.hole);
  return figure;
}

// --- kod literowy: jakie to słowo -----------------------------------------------

/** Tabelka kodu: w każdej kolumnie litera nad swoją liczbą. */
function legendEl(legend: readonly LetterCode[], letter: LetterFactory): HTMLElement {
  return h(
    'div',
    { class: `${P}-legend` },
    legend.map((pair) =>
      h('span', { class: `${P}-legend-pair` }, [
        h('span', { class: `${P}-legend-letter` }, [letter(pair.letter)]),
        h('span', { class: `${P}-legend-value` }, String(pair.value)),
      ]),
    ),
  );
}

const legendWords = (legend: readonly LetterCode[]) => legend.map((pair) => `${pair.letter} to ${pair.value}`).join(', ');

function codeWordFigure(puzzle: CodeWordPuzzle, letter: LetterFactory): Figure {
  const legend = legendEl(puzzle.legend, letter);
  // Rząd liczb do odczytania, a pod nim jedno szerokie pole „?”: po rozwiązaniu każda litera słowa
  // staje pod swoją liczbą. Pole ma od początku szerokość całego rzędu, więc układ nie skacze.
  const columns = `--${P}-code-length: ${puzzle.code.length}`;
  const holeEl = h('span', { class: `${P}-hole ${P}-code-hole`, style: columns }, '?');
  const code = h('div', { class: `${P}-code`, style: columns }, [
    ...puzzle.code.map((n) => h('span', { class: `${P}-code-num` }, String(n))),
    holeEl,
  ]);
  const el = h('div', { class: `${P}-figure ${P}-figure--code` }, [legend, code]);
  const describe = (a: string | null) =>
    `Kod: ${legendWords(puzzle.legend)}. ` +
    `Liczby: ${puzzle.code.join(', ')}. Słowo: ${a ?? 'jakie?'}`;
  return makeFigure(el, describe, puzzle.answer, () => {
    holeEl.replaceChildren(...[...puzzle.answer].map((ch) => h('span', { class: `${P}-code-letter` }, [letter(ch)])));
    holeEl.classList.add(`${P}-hole--filled`);
  });
}

// --- ta sama litera ------------------------------------------------------------

/** Litera zadania jako element rzędu (WIELKA, litera platformy). */
const letterToken = (char: string, letter: LetterFactory) => h('span', { class: `${P}-num ${P}-letter-token` }, [letter(char)]);

function sameLetterFigure(puzzle: SameLetterPuzzle, letter: LetterFactory): Figure {
  // Górny rząd: „A + A + A = 12”; pod nim „A = ?” — tu stanie wartość litery.
  const sum: HTMLElement[] = [];
  for (let i = 0; i < puzzle.count; i++) {
    if (i > 0) sum.push(token(OP_TEXT['+'], 'sign'));
    sum.push(letterToken(puzzle.letter, letter));
  }
  sum.push(token('=', 'sign'), token(String(puzzle.total), 'num'));
  const holeEl = hole();
  const ask = [letterToken(puzzle.letter, letter), token('=', 'sign'), holeEl];
  const el = h('div', { class: `${P}-figure ${P}-figure--letter` }, [
    h('span', { class: `${P}-figure-row` }, sum),
    h('span', { class: `${P}-figure-row` }, ask),
  ]);
  fitRow(el, sum);
  const words = Array.from({ length: puzzle.count }, () => puzzle.letter).join(' plus ');
  return makeFigure(el, (a) => `${words} równa się ${puzzle.total}. ${puzzle.letter} to ${a ?? 'ile?'}`, String(puzzle.answer), () => {
    holeEl.textContent = String(puzzle.answer);
    holeEl.classList.add(`${P}-hole--filled`);
  });
}

// --- znaki ---------------------------------------------------------------------

/** Zestaw znaków z karty („+-”) jako znaki działań. */
export const signsOf = (set: string): Op[] => [...set].map((ch) => (ch === '-' ? '-' : '+'));

/** Nazwa zestawu znaków dla czytnika ekranu, np. „plus, minus”. */
export const signsLabel = (set: string): string => signsOf(set).map((op) => OP_WORD[op]).join(', ');

function signsFigure(puzzle: SignsPuzzle): Figure {
  const holes = puzzle.numbers.slice(1).map(() => hole());
  const row = puzzle.numbers.flatMap((n, i) => (i === 0 ? [token(String(n), 'num')] : [holes[i - 1]!, token(String(n), 'num')]));
  row.push(token('=', 'sign'), token(String(puzzle.result), 'num'));
  const el = h('div', { class: `${P}-figure` }, row);
  fitRow(el, row);
  const answer = signsOf(puzzle.answer);
  const describe = (solved: string | null) =>
    puzzle.numbers.map((n, i) => (i === 0 ? String(n) : `${solved === null ? 'jaki znak?' : OP_WORD[answer[i - 1]!]} ${n}`)).join(' ') +
    ` równa się ${puzzle.result}`;
  return makeFigure(el, describe, puzzle.answer, () => {
    holes.forEach((holeEl, i) => {
      holeEl.textContent = OP_TEXT[answer[i]!];
      holeEl.classList.add(`${P}-hole--filled`);
    });
  });
}

// --- tarcza --------------------------------------------------------------------

/** Grubość jasnej obwódki kropki trafienia (jednostki viewBox; ta sama co stroke-width w style.css). */
const DOT_RIM = 4;

function targetFigure(puzzle: TargetPuzzle): Figure {
  // Położenie pierścieni, liczb i kropek liczy czysta funkcja targetLayout (logic.ts, przetestowana).
  const t = targetLayout(puzzle.rings, puzzle.hits);
  const last = puzzle.rings.length - 1;
  const picture = svg('svg', { viewBox: `0 0 ${t.size} ${t.size}`, 'aria-hidden': 'true', focusable: 'false', class: `${P}-target` });

  t.radii.forEach((r, k) => {
    picture.append(svg('circle', { class: `${P}-target-ring ${P}-target-ring--${k === last ? 'center' : k % 2 === 0 ? 'a' : 'b'}`, cx: t.center, cy: t.center, r }));
  });
  t.labels.forEach(({ x, y }, k) => {
    const text = svg('text', { class: `${P}-target-num`, x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': t.font.toFixed(1) });
    text.textContent = String(puzzle.rings[k]);
    picture.append(text);
  });
  for (const dot of t.dots) {
    picture.append(svg('circle', { class: `${P}-target-hit`, cx: dot.x.toFixed(1), cy: dot.y.toFixed(1), r: (dot.r - DOT_RIM / 2).toFixed(1) }));
  }

  const holeEl = hole();
  const box = h('span', { class: `${P}-target-box` }, [picture]);
  return numberFigure(
    [box, holeEl],
    holeEl,
    puzzle.answer,
    (a) => `Tarcza: od brzegu do środka pierścienie za ${puzzle.rings.join(', ')} punktów. Trafienia: ${puzzle.hits.join(', ')}. Razem: ${a ?? 'ile?'}`,
  );
}

// --- rosnące figury ----------------------------------------------------------------

/**
 * Wymiary rosnących figur w jednostkach viewBox: krok kratki, wielkość kółka i kwadratu (kwadraty prawie
 * się stykają, jak w krzyżyku z kartek; kółka mają wyraźną przerwę do liczenia), odstęp układów, podpis.
 * Rysunek jest zwykle ograniczony szerokością (krzyżyk: 15 kolumn), więc odstępy są małe.
 */
const GROW = { cell: 36, circle: 30, square: 34, gap: 24, label: 50, font: 36, pad: 4 };
/** Pole „?” w rzędzie podpisów (na miejscu podpisu czwartego układu): szerokość i wysokość w czcionkach podpisu. */
const GROW_HOLE = { w: 1.75, h: 1.3 };
/**
 * Wysokość rysunku rosnących figur w em — ta sama co w style.css (.g-konkurs-matematyczny-growing-box;
 * figury nazwane z poziomu 3 są wyższe — jak tarcza, w pionie 4,8 em).
 */
const GROW_HEIGHT_EM = { plain: 3.6, tall: 4.8 };
/** Podpis pod układem ma na ekranie co najmniej tyle em czcionki rysunku (wysokie układy: krzyżyk z 7 rzędów). */
const GROW_LABEL_EM = 0.7;

function growingFigure(puzzle: GrowingPuzzle): Figure {
  const { cell, gap, pad } = GROW;
  const shape = puzzle.shape === 'circle' ? GROW.circle : GROW.square;
  const heightEm = puzzle.outline ? GROW_HEIGHT_EM.tall : GROW_HEIGHT_EM.plain;
  const rows = Math.max(...puzzle.stages.map((stage) => stage.length));
  // Czcionka podpisu (jednostki viewBox) rośnie z liczbą rzędów, żeby na ekranie miała ≥ GROW_LABEL_EM:
  // font / height · heightEm = GROW_LABEL_EM, a height = rzędy + podpis (1,4 czcionki) + odstępy.
  const font = Math.max(GROW.font, (rows * cell + 2 * pad) / (heightEm / GROW_LABEL_EM - GROW.label / GROW.font));
  const label = (font * GROW.label) / GROW.font;
  const widths = puzzle.stages.map((stage) => stage[0]!.length * cell);
  const holeW = GROW_HOLE.w * font;
  const holeH = GROW_HOLE.h * font;
  // Za trzecim układem jeszcze odstęp i kolumna z polem „?” (w rzędzie podpisów, nad nim pusto — tam byłby czwarty układ).
  const width = widths.reduce((sum, w) => sum + w, 0) + puzzle.stages.length * gap + holeW + 2 * pad;
  const height = rows * cell + label + 2 * pad;
  const labelY = pad + rows * cell + label / 2 + 4;
  const picture = svg('svg', { viewBox: `0 0 ${width} ${height}`, 'aria-hidden': 'true', focusable: 'false', class: `${P}-growing` });
  const counts = puzzle.stages.map((stage) => stage.join('').split('').filter((ch) => ch === '#').length);

  let left = pad;
  puzzle.stages.forEach((stage, s) => {
    // Układy stoją na wspólnej linii (wyrównane do dołu), pod każdym podpis z liczbą pól.
    const top = pad + (rows - stage.length) * cell;
    stage.forEach((row, ri) => {
      [...row].forEach((ch, i) => {
        if (ch !== '#') return;
        const cx = left + i * cell + cell / 2;
        const cy = top + ri * cell + cell / 2;
        picture.append(
          puzzle.shape === 'circle'
            ? svg('circle', { class: `${P}-growing-cell`, cx, cy, r: shape / 2 })
            : svg('rect', { class: `${P}-growing-cell`, x: cx - shape / 2, y: cy - shape / 2, width: shape, height: shape, rx: 3 }),
        );
      });
    });
    const text = svg('text', { class: `${P}-growing-num`, x: left + widths[s]! / 2, y: labelY, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': font.toFixed(1) });
    text.textContent = String(counts[s]);
    picture.append(text);
    left += widths[s]! + gap;
  });

  // „?” jak w innych zadaniach: kreskowany obrys, po rozwiązaniu ciągły z liczbą (Z-15).
  const holeRect = svg('rect', { class: `${P}-growing-hole`, x: left, y: labelY - holeH / 2, width: holeW, height: holeH, rx: font / 3 });
  const holeText = svg('text', { class: `${P}-growing-num`, x: left + holeW / 2, y: labelY, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': font.toFixed(1) });
  holeText.textContent = '?';
  picture.append(holeRect, holeText);

  const box = h('span', { class: `${P}-growing-box${puzzle.outline ? ` ${P}-growing-box--tall` : ''}` }, [picture]);
  const el = h('div', { class: `${P}-figure` }, [box]);
  const what = puzzle.shape === 'circle' ? 'kółek' : 'kwadratów';
  const named = { triangle: 'trójkąty', square: 'kwadraty', cross: 'krzyżyki' } as const;
  const figures = puzzle.outline ? named[puzzle.outline] : 'figury';
  const figure = makeFigure(el, (a) => `Coraz większe ${figures} z ${what}: ${counts.join(', ')}. Następna: ${a ?? 'ile?'}`, String(puzzle.answer), () => {
    holeText.textContent = String(puzzle.answer);
    holeRect.classList.add(`${P}-growing-hole--filled`);
  });
  fitWidth(el, (width / height) * heightEm);
  return figure;
}

// --- kod literowy: ile razem ------------------------------------------------------

function codeSumFigure(puzzle: CodeSumPuzzle, letter: LetterFactory): Figure {
  // Tabelka kodu, pod nią słowo z plusami między literami i „= ?”.
  const holeEl = hole();
  const sum: HTMLElement[] = [];
  [...puzzle.word].forEach((ch, i) => {
    if (i > 0) sum.push(token(OP_TEXT['+'], 'sign'));
    sum.push(letterToken(ch, letter));
  });
  sum.push(token('=', 'sign'), holeEl);
  const row = h('span', { class: `${P}-figure-row` }, sum);
  // Długie słowo („K + O + T + A = ?”) dostaje mniejszą czcionkę rzędu na wąskiej kartce.
  fitInnerRow(row, sum);
  const el = h('div', { class: `${P}-figure ${P}-figure--code ${P}-figure--code-sum` }, [legendEl(puzzle.legend, letter), row]);
  const describe = (a: string | null) =>
    `Kod: ${legendWords(puzzle.legend)}. Słowo: ${[...puzzle.word].join(' ')}. Razem: ${a ?? 'ile?'}`;
  return makeFigure(el, describe, String(puzzle.answer), () => {
    holeEl.textContent = String(puzzle.answer);
    holeEl.classList.add(`${P}-hole--filled`);
  });
}

// --- dwie litery ---------------------------------------------------------------------

function twoLettersFigure(puzzle: TwoLettersPuzzle, letter: LetterFactory): Figure {
  // Zapisy jeden pod drugim („A + A = 12”, „A + B = 10”), na dole „B = ?” — tu stanie wartość litery.
  const rows = puzzle.sums.map((sum) => {
    const nodes: HTMLElement[] = [];
    sum.letters.forEach((ch, i) => {
      if (i > 0) nodes.push(token(OP_TEXT['+'], 'sign'));
      nodes.push(letterToken(ch, letter));
    });
    nodes.push(token('=', 'sign'), token(String(sum.total), 'num'));
    return nodes;
  });
  const holeEl = hole();
  const ask = [letterToken(puzzle.ask, letter), token('=', 'sign'), holeEl];
  const el = h('div', { class: `${P}-figure ${P}-figure--letter ${P}-figure--two-letters` }, [
    ...rows.map((nodes) => h('span', { class: `${P}-figure-row` }, nodes)),
    h('span', { class: `${P}-figure-row` }, ask),
  ]);
  const widest = rows.reduce((a, b) => (rowWidth(b) > rowWidth(a) ? b : a));
  fitRow(el, widest);
  const words = puzzle.sums.map((sum) => `${sum.letters.join(' plus ')} równa się ${sum.total}`).join('. ');
  return makeFigure(el, (a) => `${words}. ${puzzle.ask} to ${a ?? 'ile?'}`, String(puzzle.answer), () => {
    holeEl.textContent = String(puzzle.answer);
    holeEl.classList.add(`${P}-hole--filled`);
  });
}

// --- szachownica ------------------------------------------------------------------------

/** Mały kwadracik koloru pola (ciemny z paskami albo jasny) — przy liczbach na kartach i przy „?”. */
export const swatch = (tone: 'dark' | 'light') => h('span', { class: `${P}-swatch ${P}-swatch--${tone}`, 'aria-hidden': 'true' });

/** Pole szachownicy w jednostkach viewBox. */
const CHESS_CELL = 40;
/** Wysokość szachownicy w em i szerokość kolumny z dwoma „?” (kwadracik + pole „?” + odstęp) — do fitWidth. */
const CHESS_HEIGHT_EM = 4.8;
const CHESS_ASK_EM = 0.8 + 0.2 + EM.hole;

function chessFigure(puzzle: ChessPuzzle): Figure {
  const s = CHESS_CELL;
  const columns = puzzle.rows[0]!.length;
  const o = STROKE / 2;
  const picture = svg('svg', {
    viewBox: `0 0 ${columns * s + STROKE} ${puzzle.rows.length * s + STROKE}`,
    'aria-hidden': 'true',
    focusable: 'false',
    class: `${P}-chess`,
  });
  puzzle.rows.forEach((row, r) => {
    [...row].forEach((c, i) => {
      const x = o + i * s;
      const y = o + r * s;
      if (c === '.') {
        picture.append(svg('rect', { class: `${P}-chess-cell ${P}-chess-cell--missing`, x, y, width: s, height: s }));
        return;
      }
      const dark = isDarkCell(r, i);
      picture.append(svg('rect', { class: `${P}-chess-cell ${P}-chess-cell--${dark ? 'dark' : 'light'}`, x, y, width: s, height: s }));
      if (dark) {
        // Ciemne pole ma też jasne ukośne paski — różni się od jasnego wzorem, nie tylko kolorem (Z-15).
        const d = `M${x} ${y + s / 2}L${x + s / 2} ${y}M${x} ${y + s}L${x + s} ${y}M${x + s / 2} ${y + s}L${x + s} ${y + s / 2}`;
        picture.append(svg('path', { class: `${P}-chess-stripes`, d }));
      }
    });
  });

  const darkHole = hole();
  const lightHole = hole();
  const ask = h('span', { class: `${P}-chess-ask` }, [
    h('span', { class: `${P}-chess-ask-row` }, [swatch('dark'), darkHole]),
    h('span', { class: `${P}-chess-ask-row` }, [swatch('light'), lightHole]),
  ]);
  const box = h('span', { class: `${P}-chess-box` }, [picture]);
  const el = h('div', { class: `${P}-figure` }, [box, ask]);
  fitWidth(el, (CHESS_HEIGHT_EM * columns) / puzzle.rows.length + EM.gap + CHESS_ASK_EM);
  const [dark, light] = pairOf(puzzle.answer);
  // Opis dla czytnika ekranu pozwala rozwiązać zadanie: reguła kolorów i położenie każdego brakującego pola.
  const where = missingCells(puzzle.rows)
    .flatMap((cells, r) => (cells.length > 0 ? [`w rzędzie ${r + 1} pola ${cells.join(', ')}`] : []))
    .join('; ');
  const describe = (a: string | null) =>
    `Szachownica ${puzzle.rows.length} na ${columns}, pola ciemne i jasne na zmianę, w lewym górnym rogu ciemne. ` +
    `Brakujące pola, licząc od lewego górnego rogu: ${where}. ` +
    `Brakuje: ${a === null ? 'ile ciemnych i ile jasnych?' : pairLabel(a)}`;
  return makeFigure(el, describe, puzzle.answer, () => {
    darkHole.textContent = String(dark);
    lightHole.textContent = String(light);
    darkHole.classList.add(`${P}-hole--filled`);
    lightHole.classList.add(`${P}-hole--filled`);
  });
}

// ---------------------------------------------------------------------------

/** Rysunek zadania dowolnego typu. */
export function drawFigure(puzzle: Puzzle, letter: LetterFactory): Figure {
  switch (puzzle.kind) {
    case 'missing':
      return missingFigure(puzzle);
    case 'dice':
      return diceFigure(puzzle);
    case 'sequence':
      return sequenceFigure(puzzle);
    case 'pyramid':
      return pyramidFigure(puzzle);
    case 'tiles':
      return tilesFigure(puzzle);
    case 'codeWord':
      return codeWordFigure(puzzle, letter);
    case 'sameLetter':
      return sameLetterFigure(puzzle, letter);
    case 'signs':
      return signsFigure(puzzle);
    case 'target':
      return targetFigure(puzzle);
    case 'growing':
      return growingFigure(puzzle);
    case 'codeSum':
      return codeSumFigure(puzzle, letter);
    case 'twoLetters':
      return twoLettersFigure(puzzle, letter);
    case 'chess':
      return chessFigure(puzzle);
  }
}
