/**
 * Grafika kształtów: czysty tekst SVG, bez DOM. Osobny plik, bo używają go game.ts i manifest.ts
 * (ikona kafelka), a manifest nie może importować game.ts — to leniwy chunk gry.
 * Kształt nie ma tu koloru: w grze wszystkie kształty koloruje jednakowo style.css, więc dopasowuje
 * się je wyłącznie kształtem, nie kolorem (Z-15).
 */
import type { Shape } from './logic';

const BODIES: Record<Shape, string> = {
  circle: '<circle cx="50" cy="50" r="40"/>',
  square: '<rect x="12" y="12" width="76" height="76" rx="8"/>',
  triangle: '<path d="M50 10 L92 86 L8 86 Z"/>',
  diamond: '<path d="M50 6 L92 50 L50 94 L8 50 Z"/>',
  star: '<path d="M50 9 L61.2 38.6 L92.8 40.1 L68.1 59.9 L76.5 90.4 L50 73 L23.5 90.4 L31.9 59.9 L7.2 40.1 L38.8 38.6 Z"/>',
  heart: '<path d="M50 88 C10 58 6 30 28 20 C40 15 48 22 50 30 C52 22 60 15 72 20 C94 30 90 58 50 88 Z"/>',
};

/** Nazwy dla czytników ekranu (aria-label kart; na ekranie nic do czytania — Z-10). */
export const SHAPE_NAMES: Record<Shape, string> = {
  circle: 'koło',
  square: 'kwadrat',
  triangle: 'trójkąt',
  diamond: 'romb',
  star: 'gwiazdka',
  heart: 'serce',
};

const svg = (body: string, style = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false"${style}>${body}</svg>`;

/** Inline SVG kształtu bez koloru (kolor nadaje style.css); wypełnia element nadrzędny. */
export function shapeSvg(shape: Shape): string {
  return svg(BODIES[shape]);
}

/** Ikona kafelka w hubie — CSS gry tam nie działa, więc kolory są wpisane (tylko z tokenów). */
export function tileIcon(): string {
  return svg(BODIES.star, ' style="fill:var(--mg-honey);stroke:var(--mg-ink);stroke-width:3;stroke-linejoin:round"');
}
