/**
 * Czysta logika liter (bez DOM): alfabet polski, wielkość liter, wybór kroju wg ustawień.
 * Używają jej rdzeń (ui.letter) i gry literowe.
 */
import type { LetterCase, LetterRole, LetterScript, LetterScriptSetting } from '../types';

/** 32 wielkie litery polskiego alfabetu w kolejności alfabetycznej (bez Q, V, X). */
export const ALPHABET: readonly string[] = [
  'A', 'Ą', 'B', 'C', 'Ć', 'D', 'E', 'Ę', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'Ł',
  'M', 'N', 'Ń', 'O', 'Ó', 'P', 'R', 'S', 'Ś', 'T', 'U', 'W', 'Y', 'Z', 'Ź', 'Ż',
];

/** Litery ze znakami diakrytycznymi (na klawiaturze wymagają AltGr). */
export const DIACRITICS: readonly string[] = ['Ą', 'Ć', 'Ę', 'Ł', 'Ń', 'Ó', 'Ś', 'Ź', 'Ż'];

/** Polski alfabet bez diakrytyków (23 litery). */
export const BASE_ALPHABET: readonly string[] = ALPHABET.filter((l) => !DIACRITICS.includes(l));

/** Litera bazowa dla diakrytyku: 'Ł' → 'L'. Dla innych liter zwraca ją samą. */
export function baseLetter(letter: string): string {
  const map: Record<string, string> = { Ą: 'A', Ć: 'C', Ę: 'E', Ł: 'L', Ń: 'N', Ó: 'O', Ś: 'S', Ź: 'Z', Ż: 'Z' };
  const upper = normalizeLetter(letter);
  return map[upper] ?? upper;
}

/** Dowolna postać → wielka litera (zgodna z Intent.value). */
export function normalizeLetter(ch: string): string {
  return ch.toLocaleUpperCase('pl-PL');
}

/** Ustawia wielkość znaku (poprawnie dla polskich liter; nie używaj CSS text-transform). */
export function toCase(ch: string, letterCase: LetterCase): string {
  return letterCase === 'upper' ? ch.toLocaleUpperCase('pl-PL') : ch.toLocaleLowerCase('pl-PL');
}

export interface LetterForm {
  script: LetterScript;
  case: LetterCase;
}

/**
 * Jaką postać litery pokazać dla danej roli przy danych ustawieniach. null = nie pokazuj towarzysza.
 *
 * | letterScript | main    | companion |
 * |--------------|---------|-----------|
 * | print        | print   | null      |
 * | both         | print   | cursive   |
 * | cursive      | cursive | print     |
 */
export function resolveLetterForm(
  settings: { letterScript: LetterScriptSetting; letterCase: LetterCase },
  role: LetterRole,
): LetterForm | null {
  const c = settings.letterCase;
  switch (settings.letterScript) {
    case 'print':
      return role === 'main' ? { script: 'print', case: c } : null;
    case 'both':
      return { script: role === 'main' ? 'print' : 'cursive', case: c };
    case 'cursive':
      return { script: role === 'main' ? 'cursive' : 'print', case: c };
  }
}
