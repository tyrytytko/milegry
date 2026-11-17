import { lastInput } from '../input/inputHub';
import type { Direction, FocusGrid, FocusGridOptions, Intent } from '../types';

export interface FocusGridController extends FocusGrid {
  /** Obsługuje intencję. Zwraca true, jeśli ją zużył. */
  handle(intent: Intent): boolean;
}

export interface FocusGridInternalOptions extends FocusGridOptions {
  /** Przenosić też prawdziwy fokus DOM (dla linków/przycisków powłoki). Domyślnie false. */
  domFocus?: boolean;
}

/** Środek elementu i jego rozmiar (bez rozmiaru — punkt). */
interface Box {
  x: number;
  y: number;
  w?: number;
  h?: number;
}

function boxOf(el: HTMLElement): Box {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
}

/**
 * Najbliższy sąsiad w kierunku `dir` wg położenia na ekranie (dla columns: 'auto').
 * W bok — tylko elementy z tego samego rzędu (nachodzące w pionie). W górę/w dół — najpierw elementy
 * nachodzące w poziomie, a gdy ich brak, najbliższy z rzędu całkiem nad/pod. Nic w kierunku — -1.
 */
export function nearestInDirection(from: Box, candidates: Box[], dir: Direction): number {
  const sideways = dir === 'left' || dir === 'right';
  const extent = (b: Box) => (sideways ? (b.h ?? 0) : (b.w ?? 0)) / 2;
  const depth = (b: Box) => (sideways ? (b.w ?? 0) : (b.h ?? 0)) / 2;
  let best = -1;
  let bestScore = Infinity;
  let bestOverlaps = false;
  candidates.forEach((c, i) => {
    const dx = c.x - from.x;
    const dy = c.y - from.y;
    const primary = dir === 'left' ? -dx : dir === 'right' ? dx : dir === 'up' ? -dy : dy;
    const secondary = sideways ? Math.abs(dy) : Math.abs(dx);
    if (primary <= 1) return; // nie w tym kierunku
    const overlaps = secondary <= extent(from) + extent(c);
    if (!overlaps && (sideways || primary < depth(from) + depth(c))) return;
    const score = primary + secondary * 2;
    if ((overlaps && !bestOverlaps) || (overlaps === bestOverlaps && score < bestScore)) {
      bestScore = score;
      bestOverlaps = overlaps;
      best = i;
    }
  });
  return best;
}

/** Następny indeks w siatce o stałej liczbie kolumn. Zwraca -1, gdy nie da się ruszyć. */
export function nextIndexInColumns(index: number, count: number, columns: number, dir: Direction, wrap: boolean): number {
  if (count === 0) return -1;
  const cols = Math.max(1, Math.floor(columns));
  const row = Math.floor(index / cols);
  const col = index % cols;
  const rows = Math.ceil(count / cols);
  let next = -1;
  switch (dir) {
    case 'left':
      if (col > 0) next = index - 1;
      else if (wrap) next = Math.min(count - 1, row * cols + cols - 1);
      break;
    case 'right':
      if (col < cols - 1 && index + 1 < count) next = index + 1;
      else if (wrap) next = row * cols;
      break;
    case 'up':
      if (row > 0) next = index - cols;
      else if (wrap) next = Math.min(count - 1, (rows - 1) * cols + col);
      break;
    case 'down':
      if (row < rows - 1) next = Math.min(count - 1, index + cols);
      else if (wrap) next = col;
      break;
  }
  return next;
}

let gridCount = 0;

export function createFocusGrid(options: FocusGridInternalOptions): FocusGridController {
  const { columns = 'auto', wrap = false, digits = false, pointer = true, domFocus = false } = options;
  let items: HTMLElement[] = [];
  let index = -1;
  let enabled = true;

  // Ramka (.mg-focused) jest widoczna tylko po nawigacji klawiaturą — strzałka, Spacja/Enter
  // (CSS: [data-last-input='keyboard'], patrz lastInput); klawisz litery czy cyfry jej nie odsłania.
  function render(): void {
    items.forEach((el, i) => el.classList.toggle('mg-focused', i === index));
    if (domFocus) items[index]?.focus({ preventScroll: true });
  }

  function scrollToCurrent(): void {
    if (domFocus) items[index]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }

  function focus(i: number): void {
    if (items.length === 0) {
      index = -1;
      return;
    }
    const clamped = Math.max(0, Math.min(items.length - 1, i));
    const changed = clamped !== index;
    index = clamped;
    render();
    if (changed) options.onFocus?.(index, items[index] as HTMLElement);
  }

  function select(i: number): void {
    if (!enabled || !items[i]) return;
    focus(i);
    options.onSelect(i, items[i] as HTMLElement);
  }

  // Wybór wskaźnikiem idzie kanałem wejścia gry (intencja pointer z data-target): tylko pierwszy palec,
  // liczony jako aktywność dziecka. Elementom bez data-target nadajemy własny.
  const targetPrefix = `mg-grid-${++gridCount}-`;
  function bindPointer(): void {
    if (!pointer || domFocus) return;
    items.forEach((el, i) => {
      if (!el.getAttribute('data-target')) el.setAttribute('data-target', `${targetPrefix}${i}`);
    });
  }

  function unbindPointer(): void {
    items.forEach((el) => {
      if (el.getAttribute('data-target')?.startsWith(targetPrefix)) el.removeAttribute('data-target');
    });
  }

  function setItems(next: HTMLElement[], nextIndex = index): void {
    items.forEach((el) => el.classList.remove('mg-focused'));
    unbindPointer();
    items = next.slice();
    index = -1;
    bindPointer();
    if (items.length > 0) focus(nextIndex < 0 ? 0 : nextIndex);
  }

  function move(dir: Direction): void {
    if (items.length === 0) return;
    if (index < 0) return focus(0);
    let next: number;
    if (columns === 'auto') {
      const from = boxOf(items[index] as HTMLElement);
      next = nearestInDirection(
        from,
        items.map((el, i) => (i === index ? { x: Infinity, y: Infinity } : boxOf(el))),
        dir,
      );
      if (next < 0 && wrap && (dir === 'left' || dir === 'right')) next = dir === 'right' ? 0 : items.length - 1;
    } else {
      next = nextIndexInColumns(index, items.length, columns, dir, wrap);
    }
    if (next >= 0) focus(next);
  }

  // Z-32: ramka startuje na środku, jeśli gra nie wskaże inaczej.
  setItems(options.items, options.initial ?? Math.floor((options.items.length - 1) / 2));

  return {
    get index() {
      return index;
    },
    focus,
    setItems,
    setEnabled(value) {
      enabled = value;
    },
    handle(intent) {
      if (!enabled || items.length === 0) return false;
      // Pierwsza strzałka albo Spacja/Enter po tapnięciu/kliknięciu (albo na starcie, także po samych
      // literach) tylko odsłania ramkę tam, gdzie stoi — na środku w nowym zadaniu (Z-32); dopiero
      // następne naciśnięcie ją przesuwa lub wybiera.
      const hidden = lastInput() !== 'keyboard';
      switch (intent.type) {
        case 'move':
          if (!hidden) move(intent.dir);
          scrollToCurrent();
          return true;
        case 'confirm':
          if (hidden) scrollToCurrent();
          else if (index >= 0) select(index);
          return true;
        case 'digit':
          if (!digits || intent.value < 1 || intent.value > items.length) return false;
          select(intent.value - 1);
          return true;
        case 'pointer': {
          if (!pointer || domFocus) return false;
          const i = items.findIndex((el) => el.getAttribute('data-target') === intent.target);
          if (i < 0) return false;
          select(i);
          return true;
        }
        default:
          return false;
      }
    },
    destroy() {
      unbindPointer();
      items.forEach((el) => el.classList.remove('mg-focused'));
      items = [];
      index = -1;
    },
  };
}
