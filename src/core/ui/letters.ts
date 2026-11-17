import type { LetterOptions, Ui } from '../types';
import { h } from '../util/dom';
import { normalizeLetter, resolveLetterForm, toCase } from '../util/letters';
import type { UiContext } from './context';

const CURSIVE_FAMILY = 'MG Pisane';
const FONT_TIMEOUT_MS = 3000;

/** Element litery „do nauki” w podanej formie (bez czytania ustawień). */
export function letterElement(char: string, script: 'print' | 'cursive', letterCase: 'upper' | 'lower'): HTMLElement {
  const glyph = toCase(char, letterCase);
  return h(
    'span',
    {
      class: 'mg-letter',
      'data-script': script,
      'data-case': letterCase,
      lang: 'pl',
      role: 'img',
      'aria-label': `${letterCase === 'lower' ? 'mała litera' : 'litera'} ${normalizeLetter(char)}`,
    },
    glyph,
  );
}

/** Czy krój pisany jest wczytany (bez niego przeglądarka narysowałaby literę obcym krojem). */
function cursiveFontLoaded(): boolean {
  if (typeof document === 'undefined' || !document.fonts) return false;
  let loaded = false;
  document.fonts.forEach((face) => {
    if (face.status === 'loaded' && face.family.replace(/["']/g, '') === CURSIVE_FAMILY) loaded = true;
  });
  return loaded;
}

/**
 * Wczytuje kroje liter (pisany tylko, gdy potrzebny). Nie czeka dłużej niż 3 s.
 * Zwraca false, gdy potrzebny krój pisany nie jest gotowy (błąd albo przekroczony czas).
 */
export async function loadLetterFonts(cursive: boolean): Promise<boolean> {
  if (typeof document === 'undefined' || !document.fonts) return !cursive;
  const loads: Promise<unknown>[] = [document.fonts.load('400 1em "Andika"', 'AĄaąŻż')];
  if (cursive) loads.push(document.fonts.load(`400 1em "${CURSIVE_FAMILY}"`, 'AĄaąŻż'));
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, FONT_TIMEOUT_MS);
  });
  await Promise.race([Promise.all(loads).catch(() => undefined), timeout]);
  clearTimeout(timer);
  return !cursive || cursiveFontLoaded();
}

export function createLetters({ deps }: UiContext): Pick<Ui, 'letter' | 'lettersReady'> {
  return {
    letter(char: string, options: LetterOptions = {}) {
      // Bez wczytanego kroju pisanego zachowujemy się jak przy „tylko drukowane”.
      const cursiveOk = cursiveFontLoaded();
      const settings = cursiveOk ? deps.settings : { ...deps.settings, letterScript: 'print' as const };
      const form = resolveLetterForm(settings, options.role ?? 'main');
      if (!form && options.script === undefined) return null;
      const wanted = options.script ?? form?.script ?? 'print';
      const script = wanted === 'cursive' && !cursiveOk ? 'print' : wanted;
      return letterElement(char, script, options.case ?? form?.case ?? deps.settings.letterCase);
    },

    lettersReady(options = {}) {
      return loadLetterFonts(options.cursive === true || deps.settings.letterScript !== 'print');
    },
  };
}
