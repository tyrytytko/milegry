import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameInputController } from '../input/gameInput';
import type { Settings } from '../types';
import { createUi, loadLetterFonts, type UiController } from './index';

// Minimalny DOM: testy chodzą w środowisku node (bez jsdom).
class FakeEl extends EventTarget {
  readonly tag: string;
  parent: FakeEl | null = null;
  children: FakeEl[] = [];
  attrs = new Map<string, string>();
  classes = new Set<string>();
  style: Record<string, unknown> = {
    setProperty(this: Record<string, unknown>, name: string, value: string) {
      this[name] = value;
    },
  };
  hidden = false;
  innerHTML = '';
  offsetWidth = 0;
  rect = { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
  classList = {
    add: (...names: string[]) => names.forEach((n) => this.classes.add(n)),
    remove: (...names: string[]) => names.forEach((n) => this.classes.delete(n)),
    contains: (name: string) => this.classes.has(name),
    toggle: (name: string, force?: boolean) => {
      const on = force ?? !this.classes.has(name);
      if (on) this.classes.add(name);
      else this.classes.delete(name);
      return on;
    },
  };
  constructor(tag = 'div') {
    super();
    this.tag = tag;
  }
  setAttribute(name: string, value: string) {
    this.attrs.set(name, value);
    if (name === 'class') value.split(/\s+/).filter(Boolean).forEach((c) => this.classes.add(c));
  }
  getAttribute(name: string) {
    return this.attrs.get(name) ?? null;
  }
  append(...nodes: (FakeEl | string)[]) {
    for (const node of nodes) {
      if (typeof node === 'string') continue;
      node.remove();
      node.parent = this;
      this.children.push(node);
    }
  }
  replaceChildren(...nodes: FakeEl[]) {
    [...this.children].forEach((c) => c.remove());
    this.append(...nodes);
  }
  remove() {
    if (!this.parent) return;
    this.parent.children = this.parent.children.filter((c) => c !== this);
    this.parent = null;
  }
  contains(node: FakeEl | null): boolean {
    for (let n = node; n; n = n.parent) if (n === this) return true;
    return false;
  }
  closest(selector: string): FakeEl | null {
    const attr = /^\[([\w-]+)\]$/.exec(selector)?.[1];
    for (let n: FakeEl | null = this; n; n = n.parent) if (attr && n.attrs.has(attr)) return n;
    return null;
  }
  querySelectorAll(selector: string): FakeEl[] {
    const attr = /^\[([\w-]+)\]$/.exec(selector)?.[1];
    const out: FakeEl[] = [];
    const walk = (el: FakeEl) =>
      el.children.forEach((c) => {
        if (attr && c.attrs.has(attr)) out.push(c);
        walk(c);
      });
    walk(this);
    return out;
  }
  getBoundingClientRect() {
    return this.rect;
  }
  setPointerCapture() {}
}

const el = () => new FakeEl() as unknown as HTMLElement & FakeEl;

function pointer(type: string, init: { id?: number; x?: number; y?: number; primary?: boolean } = {}): Event {
  return Object.assign(new Event(type), {
    pointerId: init.id ?? 1,
    isPrimary: init.primary ?? true,
    button: 0,
    clientX: init.x ?? 0,
    clientY: init.y ?? 0,
    preventDefault() {},
  });
}

const animationEnd = (animationName: string) => Object.assign(new Event('animationend'), { animationName });

let elementUnder: FakeEl | null = null;
let fontFaces: { family: string; status: string }[] = [];
let fontsLoad: () => Promise<unknown> = () => Promise.resolve([]);

beforeEach(() => {
  elementUnder = null;
  fontFaces = [];
  fontsLoad = () => Promise.resolve([]);
  vi.stubGlobal('HTMLElement', FakeEl);
  vi.stubGlobal('document', {
    createElement: (tag: string) => new FakeEl(tag),
    elementFromPoint: () => elementUnder,
    fonts: {
      forEach: (fn: (face: { family: string; status: string }) => void) => fontFaces.forEach(fn),
      load: () => fontsLoad(),
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function setup(settings: Partial<Settings> = {}) {
  const stopRepeat = vi.fn();
  const input = {
    emit: vi.fn(),
    repeatMove: vi.fn(() => stopRepeat),
    on: vi.fn(() => () => {}),
  } as unknown as GameInputController & { emit: ReturnType<typeof vi.fn>; repeatMove: ReturnType<typeof vi.fn> };
  const root = el();
  const dock = el();
  const ui: UiController = createUi({
    input,
    root,
    dock,
    mode: 'touch',
    reducedMotion: false,
    settings: { letterScript: 'print', letterCase: 'upper', ...settings } as Settings,
  });
  return { ui, input, root, dock, stopRepeat };
}

describe('kontrolki ekranowe', () => {
  it('przytrzymany przycisk dPad: jeden ruch od razu, powtarzanie przez input, stop po puszczeniu', () => {
    const { ui, input, stopRepeat } = setup();
    const pad = ui.dPad() as unknown as { el: FakeEl };
    const up = pad.el.children[0] as FakeEl;
    up.dispatchEvent(pointer('pointerdown'));
    expect(input.emit).toHaveBeenCalledWith({ type: 'move', dir: 'up' });
    expect(input.emit).toHaveBeenCalledTimes(1);
    expect(input.repeatMove).toHaveBeenCalledWith('up');
    expect(up.classes.has('mg-pressed')).toBe(true);
    up.dispatchEvent(pointer('pointerup'));
    expect(stopRepeat).toHaveBeenCalledTimes(1);
    expect(up.classes.has('mg-pressed')).toBe(false);
  });

  it('zniszczenie albo schowanie kontrolki w trakcie trzymania zatrzymuje powtarzanie', () => {
    const { ui, stopRepeat } = setup();
    const pad = ui.dPad();
    ((pad.el as unknown as FakeEl).children[1] as FakeEl).dispatchEvent(pointer('pointerdown'));
    pad.hide();
    expect(stopRepeat).toHaveBeenCalledTimes(1);

    const other = ui.dPad();
    ((other.el as unknown as FakeEl).children[1] as FakeEl).dispatchEvent(pointer('pointerdown'));
    other.destroy();
    expect(stopRepeat).toHaveBeenCalledTimes(2);
  });

  it('drugi palec nie wysyła intencji', () => {
    const { ui, input } = setup();
    const pad = ui.numPad() as unknown as { el: FakeEl };
    (pad.el.children[0] as FakeEl).dispatchEvent(pointer('pointerdown', { id: 1 }));
    (pad.el.children[1] as FakeEl).dispatchEvent(pointer('pointerdown', { id: 2, primary: false }));
    expect(input.emit).toHaveBeenCalledTimes(1);
  });

  it('numPad z własnymi cyframi nie wymusza rzędu „cofnij” i „OK”', () => {
    const { ui } = setup();
    const pad = ui.numPad({ digits: [1, 2, 3], erase: true, confirm: true }) as unknown as { el: FakeEl };
    const classes = pad.el.children.flatMap((c) => [...c.classes]);
    expect(classes).not.toContain('mg-numpad__erase');
    expect(classes).not.toContain('mg-numpad__ok');
    const standard = ui.numPad({ erase: true }) as unknown as { el: FakeEl };
    expect(standard.el.children.flatMap((c) => [...c.classes])).toContain('mg-numpad__erase');
  });
});

describe('celebrate', () => {
  it('warstwa znika po końcu animacji wszystkich listków', () => {
    const { ui, root } = setup();
    ui.celebrate({ count: 3 });
    const layer = root.children[0] as FakeEl;
    expect(layer.children).toHaveLength(3);
    layer.dispatchEvent(animationEnd('mg-celebrate-float'));
    layer.dispatchEvent(animationEnd('mg-celebrate-float'));
    expect(root.children).toHaveLength(1);
    layer.dispatchEvent(animationEnd('mg-celebrate-float'));
    expect(root.children).toHaveLength(0);
  });

  it('obietnica rozwiązuje się dopiero po opadnięciu listków (albo zastąpieniu efektu)', async () => {
    const { ui, root } = setup();
    let landed = false;
    void ui.celebrate({ count: 1 }).then(() => (landed = true));
    await Promise.resolve();
    expect(landed).toBe(false);
    (root.children[0] as FakeEl).dispatchEvent(animationEnd('mg-celebrate-float'));
    await Promise.resolve();
    expect(landed).toBe(true);

    let replaced = false;
    void ui.celebrate().then(() => (replaced = true));
    void ui.celebrate();
    await Promise.resolve();
    expect(replaced).toBe(true);
  });

  it('kolejne wywołanie zastępuje trwający efekt (≤ 12 listków naraz)', () => {
    const { ui, root } = setup();
    ui.celebrate({ count: 12 });
    ui.celebrate({ count: 12 });
    expect(root.children).toHaveLength(1);
    expect((root.children[0] as FakeEl).children).toHaveLength(12);
  });

  it('niepoprawna liczba listków daje domyślne 6', () => {
    const { ui, root } = setup();
    ui.celebrate({ count: Number.NaN });
    expect((root.children[0] as FakeEl).children).toHaveLength(6);
  });
});

describe('wobble', () => {
  it('dodaje klasę i zdejmuje ją po końcu własnej animacji', () => {
    const { ui } = setup();
    const target = el();
    ui.wobble(target);
    expect(target.classes.has('mg-wobble')).toBe(true);
    target.dispatchEvent(animationEnd('g-gra-pulse'));
    expect(target.classes.has('mg-wobble')).toBe(true);
    target.dispatchEvent(animationEnd('mg-wobble'));
    expect(target.classes.has('mg-wobble')).toBe(false);
  });

  it('ponowne wywołanie nie zostawia starych nasłuchów; destroyAll sprząta klasę', () => {
    const { ui } = setup();
    const target = el();
    const remove = vi.spyOn(target, 'removeEventListener');
    ui.wobble(target);
    ui.wobble(target);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(target.classes.has('mg-wobble')).toBe(true);
    ui.destroyAll();
    expect(target.classes.has('mg-wobble')).toBe(false);
  });
});

describe('litery i kroje', () => {
  it('bez wczytanego kroju pisanego litera jest drukowana, a towarzysząca znika', () => {
    const { ui } = setup({ letterScript: 'cursive' });
    expect((ui.letter('a') as unknown as FakeEl).getAttribute('data-script')).toBe('print');
    expect((ui.letter('a', { script: 'cursive' }) as unknown as FakeEl).getAttribute('data-script')).toBe('print');
    const both = setup({ letterScript: 'both' }).ui;
    expect(both.letter('a', { role: 'companion' })).toBeNull();
  });

  it('z wczytanym krojem pisanym litera jest pisana', () => {
    fontFaces = [{ family: '"MG Pisane"', status: 'loaded' }];
    const { ui } = setup({ letterScript: 'cursive' });
    expect((ui.letter('a') as unknown as FakeEl).getAttribute('data-script')).toBe('cursive');
  });

  it('lettersReady: false, gdy krój pisany się nie wczytał; zegar oczekiwania sprzątnięty', async () => {
    vi.useFakeTimers();
    fontsLoad = () => Promise.reject(new Error('404'));
    await expect(setup({ letterScript: 'both' }).ui.lettersReady()).resolves.toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    await expect(loadLetterFonts(false)).resolves.toBe(true);
  });

  it('lettersReady: true, gdy krój pisany jest gotowy', async () => {
    fontsLoad = () => {
      fontFaces = [{ family: 'MG Pisane', status: 'loaded' }];
      return Promise.resolve([]);
    };
    await expect(setup().ui.lettersReady({ cursive: true })).resolves.toBe(true);
  });
});
