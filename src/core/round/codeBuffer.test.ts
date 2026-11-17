import { describe, expect, it } from 'vitest';
import { createCodeBuffer } from './codeBuffer';

describe('createCodeBuffer', () => {
  it('jedna cyfra: jedno naciśnięcie = odpowiedź', () => {
    expect(createCodeBuffer('7').press(7)).toBe('right');
    expect(createCodeBuffer('7').press(3)).toBe('wrong');
  });

  it('kilka cyfr: ocena dopiero przy komplecie, bez Entera', () => {
    const buffer = createCodeBuffer('4271');
    expect(buffer.next).toBe('4');
    expect(buffer.press(4)).toBe('typing');
    expect(buffer.press(2)).toBe('typing');
    expect(buffer.press(7)).toBe('typing');
    expect(buffer.typed).toBe('427');
    expect(buffer.next).toBe('1');
    expect(buffer.press(1)).toBe('right');
  });

  it('zły komplet zostaje widoczny do clear; potem od nowa', () => {
    const buffer = createCodeBuffer('10');
    buffer.press(1);
    expect(buffer.press(1)).toBe('wrong');
    expect(buffer.typed).toBe('11');
    expect(buffer.press(0)).toBe('ignored');
    buffer.erase(); // komplet już oceniony — nie kasujemy
    expect(buffer.typed).toBe('11');
    buffer.clear();
    expect(buffer.typed).toBe('');
    expect(buffer.next).toBe('1');
  });

  it('cofanie kasuje ostatnią cyfrę; na pustym nic nie robi', () => {
    const buffer = createCodeBuffer('123');
    buffer.erase();
    buffer.press(1);
    buffer.press(5);
    buffer.erase();
    expect(buffer.typed).toBe('1');
    expect(buffer.press(2)).toBe('typing');
    expect(buffer.press(3)).toBe('right');
  });

  it('kod musi składać się z cyfr', () => {
    expect(() => createCodeBuffer('')).toThrow();
    expect(() => createCodeBuffer('1a')).toThrow();
    expect(() => createCodeBuffer('-3')).toThrow();
  });
});
