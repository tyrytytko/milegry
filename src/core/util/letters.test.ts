import { describe, expect, it } from 'vitest';
import {
  ALPHABET,
  BASE_ALPHABET,
  DIACRITICS,
  baseLetter,
  normalizeLetter,
  resolveLetterForm,
  toCase,
} from './letters';

describe('alfabet', () => {
  it('ma 32 litery, 9 diakrytyków i 23 bazowe', () => {
    expect(ALPHABET).toHaveLength(32);
    expect(DIACRITICS).toHaveLength(9);
    expect(BASE_ALPHABET).toHaveLength(23);
    expect(new Set(ALPHABET).size).toBe(32);
  });
});

describe('toCase / normalizeLetter / baseLetter', () => {
  it('poprawnie zmienia wielkość polskich liter', () => {
    expect(toCase('Ż', 'lower')).toBe('ż');
    expect(toCase('ł', 'upper')).toBe('Ł');
    expect(normalizeLetter('ś')).toBe('Ś');
    expect(baseLetter('ó')).toBe('O');
    expect(baseLetter('M')).toBe('M');
  });
});

describe('resolveLetterForm', () => {
  it('print: tylko forma główna drukowana', () => {
    expect(resolveLetterForm({ letterScript: 'print', letterCase: 'upper' }, 'main')).toEqual({ script: 'print', case: 'upper' });
    expect(resolveLetterForm({ letterScript: 'print', letterCase: 'upper' }, 'companion')).toBeNull();
  });

  it('both: drukowana zadanie, pisana towarzysz', () => {
    expect(resolveLetterForm({ letterScript: 'both', letterCase: 'lower' }, 'main')).toEqual({ script: 'print', case: 'lower' });
    expect(resolveLetterForm({ letterScript: 'both', letterCase: 'lower' }, 'companion')).toEqual({ script: 'cursive', case: 'lower' });
  });

  it('cursive: pisana zadanie, drukowana towarzysz', () => {
    expect(resolveLetterForm({ letterScript: 'cursive', letterCase: 'upper' }, 'main')?.script).toBe('cursive');
    expect(resolveLetterForm({ letterScript: 'cursive', letterCase: 'upper' }, 'companion')?.script).toBe('print');
  });
});
