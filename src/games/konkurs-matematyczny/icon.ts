/**
 * Ikona kafelka w hubie: kartka z dwiema kostkami. CSS gry w hubie nie działa, więc kolory są wpisane
 * (tylko z tokenów palety). Osobny plik, bo manifest nie może importować game.ts — to leniwy chunk gry.
 */
const die = (x: number, y: number, pips: [number, number][]) =>
  `<rect x="${x}" y="${y}" width="30" height="30" rx="6" style="fill:var(--mg-surface);stroke:var(--mg-ink);stroke-width:2.5"/>` +
  pips.map(([px, py]) => `<circle cx="${x + px}" cy="${y + py}" r="3.2" style="fill:var(--mg-ink)"/>`).join('');

export const tileIcon = (): string =>
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" class="mg-art" aria-hidden="true" focusable="false">' +
  '<rect x="12" y="16" width="76" height="68" rx="8" style="fill:var(--mg-sage-light);stroke:var(--mg-moss);stroke-width:3"/>' +
  die(20, 35, [[8, 8], [22, 22]]) +
  die(50, 35, [[8, 8], [15, 15], [22, 22]]) +
  '</svg>';
