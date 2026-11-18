/**
 * Tylko dla testów warstwy rundy: GameContext bez DOM, z ręcznym zegarem i atrapą ctx.ui.
 * Elementy to zwykłe obiekty z drzewem dzieci (append/remove/replaceChildren jak w DOM), więc
 * test widzi, czy podpowiedź nadal jest w elemencie, a nie tylko, że ją kiedyś wywołano.
 */
import { vi } from 'vitest';
import { createClock, TEMPO_SCALE } from '../clock';
import type { FocusGridOptions, GameContext, HintDelay, HintOptions, InputMode, Intent, Tempo } from '../types';

/** Najprostszy „element”: atrybuty, rodzic, dzieci i tekst (tyle używa h() i rdzeń rundy). */
class FakeNode {
  attrs = new Map<string, string>();
  children: FakeNode[] = [];
  parent: FakeNode | null = null;
  text = '';
  constructor(label = '') {
    if (label) this.attrs.set('aria-label', label);
  }
  getAttribute(name: string) {
    return this.attrs.get(name) ?? null;
  }
  setAttribute(name: string, value: string) {
    this.attrs.set(name, value);
  }
  append(...nodes: (FakeNode | string)[]) {
    for (const node of nodes) {
      if (typeof node === 'string') {
        this.text += node;
        continue;
      }
      node.remove();
      node.parent = this;
      this.children.push(node);
    }
  }
  remove() {
    if (!this.parent) return;
    this.parent.children = this.parent.children.filter((child) => child !== this);
    this.parent = null;
  }
  replaceChildren(...nodes: (FakeNode | string)[]) {
    for (const child of this.children) child.parent = null;
    this.children = [];
    this.text = '';
    this.append(...nodes);
  }
  set textContent(value: string) {
    this.replaceChildren(value);
  }
  get textContent(): string {
    return this.text + this.children.map((child) => child.textContent).join('');
  }
  /** Obsługuje tylko '[aria-label]' (tyle potrzebuje runRound). */
  querySelector(selector: string): FakeNode | null {
    for (const child of this.children) {
      if (selector === '[aria-label]' && child.attrs.has('aria-label')) return child;
      const deeper = child.querySelector(selector);
      if (deeper) return deeper;
    }
    return null;
  }
}

export const fakeEl = (label = ''): HTMLElement => new FakeNode(label) as unknown as HTMLElement;

/** Napisy podpowiedzi (atrapa ui.hint), które są teraz w elemencie — np. ['key:3'], ['glow']. */
export const hintsIn = (el: HTMLElement): string[] =>
  (el as unknown as FakeNode).children.flatMap((child) => child.attrs.get('data-hint') ?? []);

/** Atrapa kontrolki ekranowej: przyciski z aria-label jak w ctx.ui. */
function fakeControl(labels: string[]) {
  const control = {
    el: { children: labels.map((label) => fakeEl(label)) } as unknown as HTMLElement,
    hidden: false,
    destroyed: false,
    show: () => (control.hidden = false),
    hide: () => (control.hidden = true),
    destroy: () => (control.destroyed = true),
  };
  return control;
}

export function fakeCtx(mode: InputMode = 'keyboard', tempo: Tempo = 'medium', hintDelay: HintDelay = 'medium') {
  // h() z core/util/dom tworzy elementy przez document — w testach (środowisko node) to atrapa.
  vi.stubGlobal('document', { createElement: () => new FakeNode() });
  const clock = createClock(TEMPO_SCALE[tempo]);
  const handlers = new Set<(intent: Intent) => void>();
  const grids: { options: FocusGridOptions; enabled: boolean; destroyed: boolean; focused: number }[] = [];
  const hides: ReturnType<typeof vi.fn>[] = [];
  let endCelebrate = () => {};

  const ui = {
    // Jak ctx.ui.hint: dokłada dziecko na końcu celu, hide je usuwa.
    hint: vi.fn((options: HintOptions) => {
      const el = new FakeNode();
      el.setAttribute('data-hint', options.kind === 'glow' ? 'glow' : `key:${options.key ?? ''}`);
      (options.target as unknown as FakeNode).append(el);
      const hide = vi.fn(() => el.remove());
      hides.push(hide);
      return { hide };
    }),
    wobble: vi.fn(),
    celebrate: vi.fn(() => new Promise<void>((resolve) => (endCelebrate = resolve))),
    focusGrid: vi.fn((options: FocusGridOptions) => {
      const grid = { options, enabled: true, destroyed: false, focused: -1 };
      grids.push(grid);
      return {
        index: 0,
        focus: (i: number) => (grid.focused = i),
        setItems: () => {},
        setEnabled: (on: boolean) => (grid.enabled = on),
        destroy: () => (grid.destroyed = true),
      };
    }),
    numPad: vi.fn((options: { digits?: number[]; erase?: boolean } = {}) =>
      fakeControl((options.digits ?? [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]).map(String)),
    ),
    letterKeys: vi.fn((letters: string[]) => fakeControl(letters)),
    lettersReady: vi.fn(() => Promise.resolve(true)),
  };
  const ctx = {
    root: fakeEl(),
    level: 1,
    settings: { tempo, hintDelay },
    input: {
      mode,
      on: (handler: (intent: Intent) => void) => {
        handlers.add(handler);
        return () => handlers.delete(handler);
      },
      setMoveRepeat: () => {},
    },
    audio: { play: vi.fn() },
    ui,
    clock,
    complete: vi.fn(),
    fail: vi.fn(),
  };

  return {
    ctx: ctx as unknown as GameContext,
    ui,
    grids,
    /** Funkcje hide() kolejnych podpowiedzi (w kolejności ui.hint). */
    hides,
    complete: ctx.complete,
    fail: ctx.fail,
    play: ctx.audio.play,
    emit: (intent: Intent) => handlers.forEach((handler) => handler(intent)),
    /** Listki ui.celebrate opadły. */
    endCelebrate: () => endCelebrate(),
    /** Przesuwa czas rzeczywisty o `ms` (przy tempie średnim = czas gry). */
    advance(ms: number) {
      for (let left = ms; left > 0; left -= 50) clock.tick(Math.min(50, left));
    },
  };
}

/** Pozwala dokończyć się obietnicom (start rundy, finish). */
export const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
