import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInputHub, type InputHub } from '../input/inputHub';
import type { Direction } from '../types';
import { createFocusGrid, nearestInDirection, nextIndexInColumns, type FocusGridController } from './focusGrid';

describe('nextIndexInColumns', () => {
  // Siatka 3 kolumny, 7 elementów:
  // 0 1 2
  // 3 4 5
  // 6
  it('porusza się w obrębie siatki', () => {
    expect(nextIndexInColumns(4, 7, 3, 'left', false)).toBe(3);
    expect(nextIndexInColumns(4, 7, 3, 'right', false)).toBe(5);
    expect(nextIndexInColumns(4, 7, 3, 'up', false)).toBe(1);
    expect(nextIndexInColumns(1, 7, 3, 'down', false)).toBe(4);
  });

  it('zatrzymuje się na krawędziach bez wrap', () => {
    expect(nextIndexInColumns(3, 7, 3, 'left', false)).toBe(-1);
    expect(nextIndexInColumns(2, 7, 3, 'right', false)).toBe(-1);
    expect(nextIndexInColumns(1, 7, 3, 'up', false)).toBe(-1);
    expect(nextIndexInColumns(6, 7, 3, 'right', false)).toBe(-1);
  });

  it('w dół z niepełnego wiersza trafia na ostatni element', () => {
    expect(nextIndexInColumns(5, 7, 3, 'down', false)).toBe(6);
  });

  it('zawija, gdy wrap', () => {
    expect(nextIndexInColumns(3, 7, 3, 'left', true)).toBe(5);
    expect(nextIndexInColumns(5, 7, 3, 'right', true)).toBe(3);
    expect(nextIndexInColumns(0, 7, 3, 'up', true)).toBe(6);
    expect(nextIndexInColumns(2, 7, 3, 'down', true)).toBe(5);
  });
});

describe('nearestInDirection', () => {
  const grid = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 0, y: 100 },
    { x: 100, y: 100 },
  ];
  it('wybiera sąsiada w kierunku', () => {
    expect(nearestInDirection({ x: 0, y: 0 }, grid.slice(1), 'right')).toBe(0);
    expect(nearestInDirection({ x: 0, y: 0 }, grid.slice(1), 'down')).toBe(1);
    expect(nearestInDirection({ x: 0, y: 0 }, grid.slice(1), 'left')).toBe(-1);
  });

  // Hub 1024 × 768: sekcje obszarów zawijane w rzędy, kafelki 220 px różnej wysokości (223/253).
  const box = (left: number, top: number, h: number) => ({ x: left + 110, y: top + h / 2, w: 220, h });
  const hub = {
    literki: box(159, 176, 223),
    blizniaczki: box(395, 176, 223),
    imie: box(631, 176, 223),
    orzeszki: box(37, 488, 253),
    patyczki: box(273, 488, 253),
    poJednym: box(509, 488, 253),
    okienka: box(753, 488, 253),
    labirynt: box(273, 829, 253),
    pary: box(517, 829, 223),
  };
  const names = Object.keys(hub) as (keyof typeof hub)[];
  const go = (from: keyof typeof hub, dir: Direction) => {
    const others = names.filter((n) => n !== from);
    return others[nearestInDirection(hub[from], others.map((n) => hub[n]), dir)] ?? null;
  };

  it('w dół nie przesuwa w bok do wyższego kafelka w tym samym rzędzie', () => {
    expect(go('pary', 'down')).toBeNull();
  });

  it('w lewo i w prawo zostaje w rzędzie', () => {
    expect(go('literki', 'left')).toBeNull();
    expect(go('labirynt', 'left')).toBeNull();
    expect(go('imie', 'right')).toBeNull();
    expect(go('labirynt', 'right')).toBe('pary');
    expect(go('patyczki', 'left')).toBe('orzeszki');
  });

  it('w górę i w dół idzie do rzędu obok, najpierw do kafelka nad/pod', () => {
    expect(go('literki', 'down')).toBe('patyczki');
    expect(go('imie', 'down')).toBe('poJednym');
    expect(go('okienka', 'up')).toBe('imie');
    expect(go('pary', 'up')).toBe('poJednym');
    // Pod „Okienkami” nic nie leży — najbliższy kafelek z rzędu niżej.
    expect(go('okienka', 'down')).toBe('pary');
  });
});

// Minimalne atrapy (testy chodzą w node): okno do zdarzeń, <html> z dataset, elementy z klasami.
class FakeItem extends EventTarget {
  classes = new Set<string>();
  attrs = new Map<string, string>();
  getAttribute = (name: string) => this.attrs.get(name) ?? null;
  setAttribute = (name: string, value: string) => void this.attrs.set(name, value);
  removeAttribute = (name: string) => void this.attrs.delete(name);
  classList = {
    toggle: (name: string, on: boolean) => (on ? this.classes.add(name) : this.classes.delete(name)),
    remove: (name: string) => this.classes.delete(name),
  };
}

describe('focusGrid z hubem wejścia: ramka tylko po klawiaturze', () => {
  let win: EventTarget;
  let root: { dataset: Record<string, string> };
  let hub: InputHub;
  let grid: FocusGridController;
  let items: FakeItem[];
  const selected: number[] = [];

  const key = (k: string) => win.dispatchEvent(Object.assign(new Event('keydown'), { key: k, code: k, getModifierState: () => false }));
  /** Tap tak, jak widzi go gra: pointerdown (hub wejścia) i intencja pointer z data-target elementu. */
  const tapItem = (i: number) => {
    win.dispatchEvent(Object.assign(new Event('pointerdown'), { pointerType: 'touch' }));
    grid.handle({ type: 'pointer', target: items[i]?.getAttribute('data-target') ?? '', x: 0, y: 0 });
  };
  const makeItems = () => Array.from({ length: 3 }, () => new FakeItem());
  /** Ramka jest widoczna, gdy element ma klasę, a CSS ją pokazuje ([data-last-input='keyboard']). */
  const framed = () => items.filter((el) => el.classes.has('mg-focused') && root.dataset.lastInput === 'keyboard');

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance'] });
    win = new EventTarget();
    root = { dataset: {} };
    vi.stubGlobal('window', win);
    vi.stubGlobal('document', { documentElement: root });
    for (const name of ['HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement', 'HTMLButtonElement', 'HTMLAnchorElement']) {
      vi.stubGlobal(name, class {});
    }
    hub = createInputHub();
    items = makeItems();
    selected.length = 0;
    grid = createFocusGrid({
      items: items as unknown as HTMLElement[],
      columns: 3,
      onSelect: (i) => selected.push(i),
    });
    hub.push({ onIntent: (intent) => void grid.handle(intent), captureKeys: true });
  });

  afterEach(() => {
    hub.destroy();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('na starcie bez ramki; pierwsza strzałka odsłania ją na środku, druga przesuwa', () => {
    expect(framed()).toEqual([]);
    key('ArrowRight');
    expect(framed()).toEqual([items[1]]);
    vi.advanceTimersByTime(400);
    key('ArrowRight');
    expect(framed()).toEqual([items[2]]);
  });

  it('klawisz litery nie odsłania ramki; potem pierwsza strzałka odsłania ją na środku', () => {
    key('k');
    vi.advanceTimersByTime(400);
    expect(framed()).toEqual([]);
    key('ArrowLeft');
    expect(framed()).toEqual([items[1]]);
  });

  it('pierwsza Spacja tylko odsłania ramkę, także po klawiszu litery', () => {
    key('k');
    vi.advanceTimersByTime(400);
    key(' ');
    vi.advanceTimersByTime(400);
    expect(selected).toEqual([]);
    expect(framed()).toEqual([items[1]]);
    key(' ');
    vi.advanceTimersByTime(400);
    expect(selected).toEqual([1]);
  });

  it('widoczna ramka zostaje po klawiszu litery', () => {
    key('ArrowRight');
    vi.advanceTimersByTime(400);
    key('k');
    vi.advanceTimersByTime(400);
    expect(framed()).toEqual([items[1]]);
  });

  it('pierwszy Enter tylko odsłania ramkę, niczego nie wybiera', () => {
    key('Enter');
    vi.advanceTimersByTime(400);
    expect(selected).toEqual([]);
    expect(framed()).toEqual([items[1]]);
  });

  it('wybór wskaźnikiem nie zostawia ramki, także po zmianie zadania; strzałka ją przywraca', () => {
    key('ArrowRight');
    expect(framed()).toHaveLength(1);
    tapItem(0);
    expect(selected).toEqual([0]);
    expect(framed()).toEqual([]);

    items = makeItems();
    grid.setItems(items as unknown as HTMLElement[], 1);
    expect(framed()).toEqual([]);

    vi.advanceTimersByTime(400);
    key('ArrowLeft');
    expect(framed()).toEqual([items[1]]);
  });

  it('wybiera tylko przez intencję pointer, nie przez surowy click (np. drugiego palca)', () => {
    items[2]?.dispatchEvent(new Event('click'));
    expect(selected).toEqual([]);
    tapItem(2);
    expect(selected).toEqual([2]);
    expect(grid.handle({ type: 'pointer', target: 'cos-innego', x: 0, y: 0 })).toBe(false);
  });

  it('zachowuje data-target nadany przez grę i sprząta własne', () => {
    const own = makeItems();
    own[0]?.setAttribute('data-target', 'karta-a');
    grid.setItems(own as unknown as HTMLElement[]);
    expect(own[0]?.getAttribute('data-target')).toBe('karta-a');
    expect(items[1]?.getAttribute('data-target')).toBeNull();
    grid.handle({ type: 'pointer', target: 'karta-a', x: 0, y: 0 });
    expect(selected).toEqual([0]);
    grid.destroy();
    expect(own[0]?.getAttribute('data-target')).toBe('karta-a');
    expect(own[1]?.getAttribute('data-target')).toBeNull();
  });

  it('stan „klawiatura” przetrwa setItems', () => {
    key('ArrowRight');
    items = makeItems();
    grid.setItems(items as unknown as HTMLElement[], 1);
    expect(framed()).toEqual([items[1]]);
  });
});
