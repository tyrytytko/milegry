/** Grafika gry (tekst SVG, kolory wyłącznie z tokenów palety): domek jeżyka, brama z kłódką, ikona kafelka. */

const svg = (body: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" class="mg-art" aria-hidden="true" focusable="false">${body}</svg>`;

/** Domek — cel labiryntu i bohater ekranu końca rundy. */
export const house = (): string =>
  svg(
    '<rect x="22" y="46" width="56" height="44" rx="6" style="fill:var(--mg-honey)"/>' +
      '<path d="M50 10 L90 48 Q92 52 87 52 H13 Q8 52 10 48 Z" style="fill:var(--mg-chestnut)"/>' +
      '<path d="M41 90 V68 Q41 58 50 58 Q59 58 59 68 V90 Z" style="fill:var(--mg-art-trunk)"/>' +
      '<circle cx="54" cy="76" r="2.4" style="fill:var(--mg-honey)"/>',
  );

/** Zamknięta brama: deski i kłódka z dziurką. */
export const gate = (): string =>
  svg(
    [14, 32, 50, 68].map((x) => `<rect x="${x}" y="14" width="16" height="74" rx="6" style="fill:var(--mg-chestnut)"/>`).join('') +
      '<rect x="8" y="28" width="84" height="10" rx="5" style="fill:var(--mg-art-trunk)"/>' +
      '<rect x="8" y="66" width="84" height="10" rx="5" style="fill:var(--mg-art-trunk)"/>' +
      '<path d="M40 50 V43 Q40 33 50 33 Q60 33 60 43 V50" style="fill:none;stroke:var(--mg-ink);stroke-width:5"/>' +
      '<rect x="33" y="46" width="34" height="26" rx="6" style="fill:var(--mg-honey);stroke:var(--mg-ink);stroke-width:3"/>' +
      '<circle cx="50" cy="57" r="4" style="fill:var(--mg-ink)"/><rect x="48" y="58" width="4" height="9" rx="2" style="fill:var(--mg-ink)"/>',
  );

/** Ikona kafelka w hubie: kawałek labiryntu z domkiem. */
export const tileIcon = (): string =>
  svg(
    '<rect x="8" y="8" width="84" height="84" rx="12" style="fill:var(--mg-surface);stroke:var(--mg-moss-dark);stroke-width:7"/>' +
      '<path d="M36 8 V40 H62 M64 92 V66 H36 M8 64 H22" style="fill:none;stroke:var(--mg-moss-dark);stroke-width:7;stroke-linecap:round;stroke-linejoin:round"/>' +
      '<path d="M78 16 L92 30 H64 Z" style="fill:var(--mg-chestnut)"/><rect x="68" y="30" width="20" height="16" rx="3" style="fill:var(--mg-honey)"/>' +
      '<circle cx="24" cy="78" r="9" style="fill:var(--mg-art-hedgehog)"/>',
  );
