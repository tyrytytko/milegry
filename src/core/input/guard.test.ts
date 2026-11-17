import { describe, expect, it } from 'vitest';
import { CALM_MS, createKeyGuard } from './guard';

describe('createKeyGuard', () => {
  it('przepuszcza spokojne naciśnięcia', () => {
    const g = createKeyGuard();
    expect(g.press('KeyA', 0)).toBe('ok');
    expect(g.press('KeyB', 600)).toBe('ok');
    expect(g.press('KeyC', 1200)).toBe('ok');
  });

  it('odbicie: ten sam klawisz tuż po przyjętym naciśnięciu jest ignorowany', () => {
    const g = createKeyGuard();
    expect(g.press('KeyA', 0)).toBe('ok');
    expect(g.press('KeyA', 150)).toBe('debounced');
    expect(g.press('KeyA', 500)).toBe('ok');
  });

  it('odbicie liczy się od ostatniego PRZYJĘTEGO naciśnięcia, nie od odrzuconego', () => {
    const g = createKeyGuard();
    expect(g.press('ArrowRight', 0)).toBe('ok');
    expect(g.press('ArrowRight', 150)).toBe('debounced');
    expect(g.press('ArrowRight', 300)).toBe('ok');
  });

  it('stukanie w strzałkę co 250 ms przechodzi w całości', () => {
    const g = createKeyGuard();
    for (let t = 0; t < 5000; t += 250) expect(g.press('ArrowRight', t)).toBe('ok');
  });

  it('3 różne klawisze w < 300 ms → walenie', () => {
    const g = createKeyGuard();
    expect(g.press('KeyA', 0)).toBe('ok');
    expect(g.press('KeyS', 80)).toBe('ok');
    expect(g.press('KeyD', 160)).toBe('mash');
    expect(g.isBlocked(400)).toBe(true);
  });

  it('4 naciśnięcia w < 300 ms (bębnienie dwoma klawiszami) → walenie', () => {
    const g = createKeyGuard();
    expect([0, 70, 140, 210].map((t, i) => g.press(i % 2 ? 'KeyS' : 'KeyA', t))).toEqual(['ok', 'ok', 'debounced', 'mash']);
  });

  it('blokada trwa, dopóki walenie trwa, i mija po chwili spokoju', () => {
    const g = createKeyGuard();
    g.press('KeyA', 0);
    g.press('KeyS', 50);
    g.press('KeyD', 100); // walenie
    expect(g.press('KeyF', 600)).toBe('mash'); // jeszcze w blokadzie → przedłuża
    expect(g.isBlocked(600 + CALM_MS - 1)).toBe(true);
    expect(g.isBlocked(600 + CALM_MS)).toBe(false);
    expect(g.press('KeyG', 600 + CALM_MS)).toBe('ok');
  });

  it('pierwsze naciśnięcie po waleniu i spokoju się liczy (walenie z blokady nie jest liczone dalej)', () => {
    const g = createKeyGuard();
    const keys = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyJ', 'KeyK'];
    let last = 0;
    for (let t = 0; t <= 500; t += 60) {
      g.press(keys[(t / 60) % keys.length] as string, t);
      last = t;
    }
    expect(g.press('KeyL', last + CALM_MS + 10)).toBe('ok');
  });
});
