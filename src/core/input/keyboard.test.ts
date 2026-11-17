import { describe, expect, it } from 'vitest';
import { mapKey, toLetter, type KeyLike } from './keyboard';

function key(k: string, extra: Partial<KeyLike> = {}): KeyLike {
  return { key: k, repeat: false, ctrlKey: false, altKey: false, metaKey: false, ...extra };
}

describe('mapKey', () => {
  it('litery → WIELKIE litery (CapsLock bez znaczenia)', () => {
    expect(mapKey(key('a'))).toEqual({ type: 'letter', value: 'A' });
    expect(mapKey(key('Z'))).toEqual({ type: 'letter', value: 'Z' });
  });

  it('polskie znaki z AltGr (Windows: ctrl+alt) i Option (Mac)', () => {
    expect(mapKey(key('ą', { ctrlKey: true, altKey: true, altGraph: true }))).toEqual({ type: 'letter', value: 'Ą' });
    expect(mapKey(key('ż', { ctrlKey: true, altKey: true }))).toEqual({ type: 'letter', value: 'Ż' });
    expect(mapKey(key('ł', { altKey: true }))).toEqual({ type: 'letter', value: 'Ł' });
  });

  it('samo „A” nie daje „Ą”', () => {
    expect(mapKey(key('a'))).not.toEqual({ type: 'letter', value: 'Ą' });
    expect(mapKey(key('a', { altKey: true }))).toBeNull();
  });

  it('cyfry z górnego rzędu i z klawiatury numerycznej (także bez NumLock, po event.code)', () => {
    expect(mapKey(key('7', { code: 'Digit7' }))).toEqual({ type: 'digit', value: 7 });
    expect(mapKey(key('0', { code: 'Numpad0' }))).toEqual({ type: 'digit', value: 0 });
    expect(mapKey(key('ArrowUp', { code: 'Numpad8' }))).toEqual({ type: 'digit', value: 8 });
    expect(mapKey(key('Home', { code: 'Numpad7' }))).toEqual({ type: 'digit', value: 7 });
  });

  it('strzałki, Spacja, Enter, Backspace, Escape', () => {
    expect(mapKey(key('ArrowLeft', { code: 'ArrowLeft' }))).toEqual({ type: 'move', dir: 'left' });
    expect(mapKey(key('ArrowUp'))).toEqual({ type: 'move', dir: 'up' });
    expect(mapKey(key('Enter'))).toEqual({ type: 'confirm' });
    expect(mapKey(key(' '))).toEqual({ type: 'confirm' });
    expect(mapKey(key('Backspace'))).toEqual({ type: 'erase' });
    expect(mapKey(key('Escape'))).toBe('exit');
  });

  it('ignoruje auto-repeat systemu dla wszystkich klawiszy', () => {
    for (const k of ['a', '5', 'Enter', 'ArrowDown', 'Escape', 'Backspace']) {
      expect(mapKey(key(k, { repeat: true }))).toBeNull();
    }
  });

  it('ignoruje kombinacje systemowe', () => {
    expect(mapKey(key('c', { ctrlKey: true }))).toBeNull();
    expect(mapKey(key('r', { metaKey: true }))).toBeNull();
    expect(mapKey(key('F4', { altKey: true }))).toBeNull();
    expect(mapKey(key('Enter', { ctrlKey: true }))).toBeNull();
    expect(mapKey(key('1', { ctrlKey: true }))).toBeNull();
  });

  it('ignoruje klawisze specjalne i znaki spoza alfabetu', () => {
    for (const k of ['Shift', 'Control', 'Alt', 'AltGraph', 'Tab', 'F5', 'CapsLock', 'Dead', 'Unidentified', 'Meta', 'ß', 'é', ',', '/']) {
      expect(mapKey(key(k))).toBeNull();
    }
  });
});

describe('toLetter', () => {
  it('rozpoznaje litery i polskie znaki', () => {
    expect(toLetter('ź')).toBe('Ź');
    expect(toLetter('q')).toBe('Q');
    expect(toLetter('ab')).toBeNull();
    expect(toLetter('1')).toBeNull();
  });
});
