/**
 * Grafika kształtów: czysty tekst SVG, bez DOM. Osobny plik, bo używają go game.ts i manifest.ts
 * (ikona kafelka), a manifest nie może importować game.ts — to leniwy chunk gry.
 * W grze kolory nadaje style.css (wszystkie okienka i okiennice tego samego koloru — różni je
 * tylko kształt, Z-15); kolor wpisany tutaj służy tylko ikonie kafelka, której CSS gry nie obejmuje.
 */
import type { Shape } from './logic';

const BODIES: Record<Shape, string> = {
  circle: '<circle cx="50" cy="50" r="40"/>',
  oval: '<ellipse cx="50" cy="50" rx="45" ry="26"/>',
  square: '<rect x="14" y="14" width="72" height="72" rx="3"/>',
  diamond: '<path d="M50 4 L96 50 L50 96 L4 50 Z"/>',
  rect: '<rect x="6" y="29" width="88" height="42" rx="3"/>',
  'rect-tall': '<rect x="29" y="6" width="42" height="88" rx="3"/>',
  triangle: '<path d="M50 10 L92 86 L8 86 Z"/>',
  'triangle-down': '<path d="M50 90 L92 14 L8 14 Z"/>',
  star: '<path d="M50 9 L61.2 38.6 L92.8 40.1 L68.1 59.9 L76.5 90.4 L50 73 L23.5 90.4 L31.9 59.9 L7.2 40.1 L38.8 38.6 Z"/>',
  heart: '<path d="M50 88 C10 58 6 30 28 20 C40 15 48 22 50 30 C52 22 60 15 72 20 C94 30 90 58 50 88 Z"/>',
};

const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">${body}</svg>`;

/** Inline SVG kształtu (bez koloru — nadaje go CSS gry); wypełnia element nadrzędny. */
export function shapeSvg(shape: Shape): string {
  return svg(BODIES[shape]);
}

/** Ikona kafelka w hubie: domek z okrągłym i trójkątnym okienkiem (kolory inline z tokenów). */
export function houseIcon(): string {
  const line = 'stroke:var(--mg-ink);stroke-width:3;stroke-linejoin:round';
  return svg(
    `<path d="M10 44 L50 10 L90 44 Z" style="fill:var(--mg-chestnut);${line}"/>` +
      `<rect x="18" y="42" width="64" height="50" rx="4" style="fill:var(--mg-sand);${line}"/>` +
      `<circle cx="36" cy="64" r="10" style="fill:var(--mg-mist);${line}"/>` +
      `<path d="M64 54 L75 74 L53 74 Z" style="fill:var(--mg-honey);${line}"/>`,
  );
}
