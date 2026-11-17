import { describe, expect, it, vi } from 'vitest';
import { createCoach } from './coach';
import { createCodeEntry } from './codeEntry';
import { LOCK_MS } from './coachCore';
import { fakeCtx, fakeEl, hintsIn } from './fakeCtx';

/** Brama z kodem jak w labiryncie: createCoach + createCodeEntry. */
function gate(code: string, mode: 'keyboard' | 'touch' = 'keyboard') {
  const f = fakeCtx(mode);
  const coach = createCoach(f.ctx);
  const onAnswer = vi.fn();
  const question = fakeEl();
  const entry = createCodeEntry(f.ctx, coach, { key: 'brama', code, question, onAnswer });
  const type = (digits: string) => [...digits].forEach((d) => f.emit({ type: 'digit', value: Number(d) }));
  return { ...f, coach, entry, onAnswer, question, type };
}

describe('createCodeEntry', () => {
  it('ocenia sam przy komplecie cyfr i pokazuje wpisane cyfry w polu', () => {
    const g = gate('4271');
    g.type('427');
    expect(g.entry.field.textContent).toBe('427');
    expect(g.onAnswer).not.toHaveBeenCalled();
    g.type('1');
    expect(g.onAnswer).toHaveBeenCalledWith('right');
    g.type('5'); // komplet oceniony — nic więcej nie wchodzi
    expect(g.entry.field.textContent).toBe('4271');
  });

  it('błąd: trener sam liczy błąd i blokuje cyfry; pole czyści się, gdy mija blokada', () => {
    const g = gate('42');
    g.type('41');
    expect(g.onAnswer).toHaveBeenLastCalledWith('glow');
    expect(g.ui.wobble).toHaveBeenCalledWith(g.entry.field);
    g.type('4');
    expect(g.entry.field.textContent).toBe('41');
    g.advance(LOCK_MS);
    expect(g.entry.field.textContent).toBe('');
    g.type('42');
    expect(g.onAnswer).toHaveBeenLastCalledWith('right');
  });

  it('podpowiedź z klawiszem następnej cyfry nad polem; 1. błąd podświetla pytanie', () => {
    const g = gate('42');
    g.type('11');
    expect(hintsIn(g.question)).toEqual(['glow']);
    g.advance(LOCK_MS);
    g.type('11');
    expect(g.onAnswer).toHaveBeenLastCalledWith('hint');
    expect(g.ui.hint).toHaveBeenLastCalledWith({ target: g.entry.field, key: '4' });
  });

  it('podpowiedź nad polem przetrwa wpisywanie i czyszczenie pola; idzie za bieżącą cyfrą', () => {
    const g = gate('42');
    g.type('11');
    g.advance(LOCK_MS);
    g.type('11'); // 2. błąd → klawisz „4” nad polem
    expect(hintsIn(g.entry.field)).toEqual(['key:4']);
    g.advance(LOCK_MS); // pole się czyści
    expect(hintsIn(g.entry.field)).toEqual(['key:4']);
    g.type('4');
    expect(hintsIn(g.entry.field)).toEqual(['key:2']);
  });

  it('zła cyfra w środku kodu: podpowiedź wskazuje „cofnij”, nie dalszą cyfrę kodu', () => {
    const g = gate('42');
    g.type('11');
    g.advance(LOCK_MS);
    g.type('11'); // 2. błąd → klawisz nad polem
    g.advance(LOCK_MS);
    g.type('1');
    expect(hintsIn(g.entry.field)).toEqual(['key:⌫']);
    g.emit({ type: 'erase' });
    expect(hintsIn(g.entry.field)).toEqual(['key:4']);
  });

  it('dotyk: po złej cyfrze paluszek przy „Cofnij”, po cofnięciu przy właściwej cyfrze', () => {
    const g = gate('83', 'touch');
    const keys = g.ui.numPad.mock.results[0]!.value.el.children as HTMLElement[];
    keys.push(fakeEl('Cofnij'));
    g.type('1');
    g.advance(60_000); // bezczynność → paluszek
    expect(g.ui.hint).toHaveBeenLastCalledWith(expect.objectContaining({ target: keys.at(-1) }));
    g.emit({ type: 'erase' });
    expect(g.ui.hint).toHaveBeenLastCalledWith(expect.objectContaining({ target: keys.find((k) => k.getAttribute('aria-label') === '8') }));
  });

  it('3. błąd: „zróbmy razem” — pole pokazuje poprawny kod i już nic nie przyjmuje', () => {
    const g = gate('42');
    for (let i = 0; i < 3; i++) {
      g.type('11');
      g.advance(LOCK_MS);
    }
    expect(g.onAnswer).toHaveBeenLastCalledWith('together');
    expect(g.entry.field.textContent).toBe('42');
    g.type('1');
    g.entry.stop();
    expect(g.entry.field.textContent).toBe('42');
  });

  it('cyfry odpowiedzi spoza keys: czytelny błąd (także na klawiaturze)', () => {
    const f = fakeCtx();
    const coach = createCoach(f.ctx);
    expect(() => createCodeEntry(f.ctx, coach, { key: 1, code: 4, keys: [1, 2, 3], onAnswer: () => {} })).toThrow(/cyfry 4/);
  });

  it('dotyk: numPad z „cofnij”; destroy usuwa numPad i przestaje słuchać', () => {
    const g = gate('42', 'touch');
    expect(g.ui.numPad).toHaveBeenCalledWith({ digits: undefined, erase: true });
    g.type('4');
    g.emit({ type: 'erase' });
    expect(g.entry.field.textContent).toBe('');
    g.type('4');
    g.entry.destroy();
    expect(g.ui.numPad.mock.results[0]!.value.destroyed).toBe(true);
    expect(g.entry.field.textContent).toBe(''); // nieukończony kod znika
    g.type('2');
    expect(g.onAnswer).not.toHaveBeenCalled();
    expect(() => g.entry.destroy()).not.toThrow();
  });
});
