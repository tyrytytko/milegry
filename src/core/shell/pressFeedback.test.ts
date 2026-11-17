import { describe, expect, it } from 'vitest';
import { addPressFeedback } from './pressFeedback';

type PressEvent = { button: number; isPrimary: boolean };
type Listener = (event: PressEvent) => void;

/** Minimalny element: lista klas i nasłuch zdarzeń (środowisko testów to node). */
class FakeElement {
  classes = new Set<string>();
  classList = {
    add: (c: string) => void this.classes.add(c),
    remove: (c: string) => void this.classes.delete(c),
  };
  listeners = new Map<string, Listener[]>();
  addEventListener(type: string, fn: Listener) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
  }
  fire(type: string, event: PressEvent = { button: 0, isPrimary: true }) {
    this.listeners.get(type)?.forEach((fn) => fn(event));
  }
}

const down = { button: 0, isPrimary: true };

function setup() {
  const el = new FakeElement();
  addPressFeedback(el);
  return el;
}

describe('addPressFeedback', () => {
  it('dotknięcie wciska element', () => {
    const el = setup();
    el.fire('pointerdown', down);
    expect(el.classes.has('mg-pressed')).toBe(true);
  });

  it.each(['pointerup', 'pointercancel', 'pointerleave'])('%s puszcza element', (type) => {
    const el = setup();
    el.fire('pointerdown', down);
    el.fire(type);
    expect(el.classes.has('mg-pressed')).toBe(false);
  });

  it('drugi palec i prawy przycisk myszy nie wciskają', () => {
    const el = setup();
    el.fire('pointerdown', { button: 0, isPrimary: false });
    el.fire('pointerdown', { button: 2, isPrimary: true });
    expect(el.classes.has('mg-pressed')).toBe(false);
  });
});
