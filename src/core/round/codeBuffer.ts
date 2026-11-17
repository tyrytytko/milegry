/**
 * Bufor wpisywanego kodu (odpowiedź cyframi: '7', '10', '4271') — czysty kod.
 * Ocena następuje sama, gdy wpisano tyle cyfr, ile ma kod (bez Entera — dzieci 3–5 lat).
 */

/** 'typing' = jeszcze nie komplet; 'ignored' = komplet już oceniony, czekamy na clear. */
export type CodeVerdict = 'typing' | 'right' | 'wrong' | 'ignored';

export interface CodeBuffer {
  /** Wpisane cyfry. */
  readonly typed: string;
  /** Cyfra, którą trzeba wpisać teraz ('' gdy komplet). */
  readonly next: string;
  press(digit: number): CodeVerdict;
  /** Kasuje ostatnią cyfrę (nie działa na ocenionym komplecie). */
  erase(): void;
  clear(): void;
}

export function createCodeBuffer(code: string): CodeBuffer {
  if (!/^\d+$/.test(code)) throw new Error(`Odpowiedź cyframi musi zawierać same cyfry, a jest: "${code}"`);
  let typed = '';
  const full = () => typed.length >= code.length;

  return {
    get typed() {
      return typed;
    },
    get next() {
      return code.charAt(typed.length);
    },
    press(digit) {
      if (full()) return 'ignored';
      typed += String(digit);
      if (!full()) return 'typing';
      return typed === code ? 'right' : 'wrong';
    },
    erase() {
      if (!full()) typed = typed.slice(0, -1);
    },
    clear() {
      typed = '';
    },
  };
}
