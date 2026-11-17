/** Ikona gry (kafelek w hubie i bohater ekranu końca rundy): kilka patyczków na mchu, kolory z tokenów palety. */
export const sticksIcon = (): string => {
  const stick = (x: number) =>
    `<rect x="${x}" y="22" width="9" height="56" rx="4.5" style="fill:var(--mg-art-trunk)"/>`;
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" class="mg-art" aria-hidden="true" focusable="false">' +
    '<rect x="8" y="64" width="84" height="16" rx="8" style="fill:var(--mg-art-burr)"/>' +
    [22, 36, 50, 64].map(stick).join('') +
    '<rect x="14" y="48" width="72" height="6" rx="3" style="fill:var(--mg-art-chestnut-light)"/>' +
    '</svg>'
  );
};
