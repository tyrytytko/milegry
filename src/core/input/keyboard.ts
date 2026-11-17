import type { Intent } from '../types';
import { DIACRITICS } from '../util/letters';

const LATIN = /^[A-Z]$/;
const DIACRITIC_SET = new Set<string>(DIACRITICS);

/** Pola zdarzenia klawiatury potrzebne do mapowania (pozwala testować bez DOM). */
export interface KeyLike {
  key: string;
  /** KeyboardEvent.code — fizyczny klawisz (np. 'Numpad5'). */
  code?: string;
  repeat: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  /** true, gdy wciśnięty AltGr (KeyboardEvent.getModifierState('AltGraph')). */
  altGraph?: boolean;
}

/** Wynik mapowania: intencja, 'exit' (Escape — rdzeń liczy czas przytrzymania) albo null (ignoruj). */
export type KeyResult = Intent | 'exit' | null;

/** Zamienia znak na WIELKĄ literę (A–Z i polskie znaki) albo null. */
export function toLetter(key: string): string | null {
  if ([...key].length !== 1) return null;
  const upper = key.toLocaleUpperCase('pl-PL');
  if (LATIN.test(upper) || DIACRITIC_SET.has(upper)) return upper;
  return null;
}

/** Cyfra z klawisza: najpierw event.key, awaryjnie event.code klawiatury numerycznej (NumLock wyłączony). */
function toDigit(event: KeyLike): number | null {
  if (/^[0-9]$/.test(event.key)) return Number(event.key);
  const match = /^Numpad([0-9])$/.exec(event.code ?? '');
  return match ? Number(match[1]) : null;
}

/**
 * Mapuje zdarzenie klawiatury na intencję (czysta funkcja).
 *
 * - auto-repeat systemu (event.repeat) jest zawsze ignorowany — powolne powtarzanie ruchu robi rdzeń,
 * - kombinacje (Ctrl+C, Cmd+R, Alt+F4…) są ignorowane; wyjątek: AltGr/Option dające polski znak,
 * - litery wg event.key (układ klawiatury), zawsze wielkie; samo „A” nigdy nie daje „Ą”,
 * - cyfry wg event.key, awaryjnie wg event.code (Numpad0..9),
 * - Escape → 'exit' (rdzeń wymaga przytrzymania ≥ 1,5 s).
 */
export function mapKey(event: KeyLike): KeyResult {
  if (event.repeat || event.metaKey) return null;
  const { key } = event;

  const altGr = event.altGraph === true || (event.ctrlKey && event.altKey);
  if (event.ctrlKey || event.altKey) {
    // Z modyfikatorem przepuszczamy tylko polskie znaki (AltGr+A → 'ą', Option+A na Macu).
    const letter = toLetter(key);
    if ((altGr || event.altKey) && letter !== null && DIACRITIC_SET.has(letter)) {
      return { type: 'letter', value: letter };
    }
    return null;
  }

  // Klawiatura numeryczna bez NumLock zgłasza strzałki — po kodzie to nadal cyfra.
  const digit = toDigit(event);
  if (digit !== null) return { type: 'digit', value: digit };

  switch (key) {
    case 'Escape':
      return 'exit';
    case 'ArrowUp':
      return { type: 'move', dir: 'up' };
    case 'ArrowDown':
      return { type: 'move', dir: 'down' };
    case 'ArrowLeft':
      return { type: 'move', dir: 'left' };
    case 'ArrowRight':
      return { type: 'move', dir: 'right' };
    case 'Enter':
    case ' ':
      return { type: 'confirm' };
    case 'Backspace':
      return { type: 'erase' };
  }

  const letter = toLetter(key);
  if (letter !== null) return { type: 'letter', value: letter };
  return null;
}

/** Klawisze, którym w czasie gry blokujemy domyślne działanie przeglądarki (przewijanie, fokus, szukanie). */
export const GAME_BLOCKED_KEYS = new Set([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace', 'Tab', '/', "'"]);
