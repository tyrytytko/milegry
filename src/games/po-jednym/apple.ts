/**
 * Jabłko — prosty sprite gry (w core/art go nie ma). Czysty tekst SVG, bez DOM. Osobny plik, bo używają go
 * game.ts i manifest.ts (ikona kafelka), a manifest nie może importować game.ts — to leniwy chunk gry.
 * W grze jabłko nie ma własnych kolorów: części mają klasy, kolor nadaje style.css (tokeny). Ikona kafelka
 * i bohater ekranu końca rundy stoją poza sceną gry, gdzie CSS gry nie działa — tam kolory są w atrybucie style
 * (też wyłącznie tokeny).
 */
import { art } from '../../core/art';

type Part = 'body' | 'stem' | 'leaf' | 'shine';

const PARTS: [Part, string][] = [
  ['body', '<path d="M50 30 C40 22 16 22 13 46 C10 68 26 92 42 92 C46 92 48 89 50 89 C52 89 54 92 58 92 C74 92 90 68 87 46 C84 22 60 22 50 30 Z"/>'],
  ['stem', '<path d="M50 32 C50 24 52 16 56 9"/>'],
  ['leaf', '<path d="M55 21 C60 9 76 7 82 13 C74 22 63 25 55 21 Z"/>'],
  ['shine', '<ellipse cx="30" cy="48" rx="5" ry="11" transform="rotate(18 30 48)"/>'],
];

const INLINE: Record<Part, string> = {
  body: 'fill:color-mix(in srgb, var(--mg-rosehip) 80%, var(--mg-honey))',
  stem: 'fill:none;stroke:var(--mg-art-trunk);stroke-width:5;stroke-linecap:round',
  leaf: 'fill:var(--mg-moss)',
  shine: 'fill:var(--mg-art-highlight);opacity:0.5',
};

/** Ciało jabłka: części w <g> z klasą (kolor z style.css) albo z kolorami w style (poza sceną gry). */
const body = (inline: boolean) =>
  PARTS.map(([part, svg]) => `<g class="g-po-jednym-apple-${part}"${inline ? ` style="${INLINE[part]}"` : ''}>${svg}</g>`).join('');

const svg = (inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">${inner}</svg>`;

/** Jabłko w scenie gry (kolory z style.css); wypełnia element nadrzędny. */
export const appleSvg = (): string => svg(body(false));

/** Jabłko z kolorami w style — bohater ekranu końca rundy. */
export const appleIcon = (): string => svg(body(true));

/** Ikona kafelka w hubie: jeżyk i jabłko. */
export const tileIcon = (): string =>
  svg(`<g transform="translate(0 6) scale(0.82)">${art.hedgehog()}</g><g transform="translate(60 56) scale(0.4)">${body(true)}</g>`);
