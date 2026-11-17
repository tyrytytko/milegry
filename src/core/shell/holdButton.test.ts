import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHoldButton } from './holdButton';

type Listener = (event: unknown) => void;

/** Minimalny element: tyle DOM, ile potrzebuje przycisk (środowisko testów to node). */
class FakeElement {
  innerHTML = '';
  style = { setProperty() {} };
  classList = { add() {}, remove() {}, toggle() {} };
  listeners = new Map<string, Listener[]>();
  setAttribute() {}
  append() {}
  setPointerCapture() {}
  addEventListener(type: string, fn: Listener) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
  }
  fire(type: string, event: unknown) {
    this.listeners.get(type)?.forEach((fn) => fn(event));
  }
}

const press = { button: 0, isPrimary: true, pointerId: 1, preventDefault() {} };

describe('createHoldButton', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('document', { createElement: () => new FakeElement() });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('działa po przytrzymaniu', () => {
    const onActivate = vi.fn();
    const button = createHoldButton({ label: 'Do domu', content: '', holdMs: 2000, onActivate });
    (button.el as unknown as FakeElement).fire('pointerdown', press);
    vi.advanceTimersByTime(2000);
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('po destroy() trwające przytrzymanie niczego nie uruchamia', () => {
    const onActivate = vi.fn();
    const button = createHoldButton({ label: 'Do domu', content: '', holdMs: 2000, onActivate });
    (button.el as unknown as FakeElement).fire('pointerdown', press);
    button.destroy();
    vi.advanceTimersByTime(5000);
    expect(onActivate).not.toHaveBeenCalled();
  });
});
