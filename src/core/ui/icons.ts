/** Proste ikony interfejsu (linia w kolorze currentColor). viewBox 0 0 48 48. */

const icon = (body: string) =>
  `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const icons = {
  home: icon('<path d="M8 23 L24 9 L40 23"/><path d="M13 20 V38 H35 V20"/><path d="M21 38 V29 H27 V38"/>'),
  up: icon('<path d="M12 30 L24 18 L36 30"/>'),
  down: icon('<path d="M12 18 L24 30 L36 18"/>'),
  left: icon('<path d="M30 12 L18 24 L30 36"/>'),
  right: icon('<path d="M18 12 L30 24 L18 36"/>'),
  check: icon('<path d="M11 25 L20 34 L37 15"/>'),
  erase: icon('<path d="M18 13 H38 V35 H18 L8 24 Z"/><path d="M24 20 L32 28 M32 20 L24 28"/>'),
  next: icon('<path d="M10 24 H36"/><path d="M26 14 L36 24 L26 34"/>'),
  again: icon('<path d="M36 24 A12 12 0 1 1 30 13.6"/><path d="M30 6 V14 H38"/>'),
  keyboard: icon(
    '<rect x="5" y="13" width="38" height="24" rx="5"/><path d="M12 21 H13 M19 21 H20 M26 21 H27 M33 21 H34 M15 29 H33" stroke-width="4"/>',
  ),
  touch: icon(
    '<path d="M20 26 V11 A3.5 3.5 0 0 1 27 11 V24"/><path d="M27 22 A3.5 3.5 0 0 1 34 22 V26 A3.5 3.5 0 0 1 40 26 V31 C40 38 35 43 28 43 H25 C20 43 17 40 14 36 L9 29 A3.5 3.5 0 0 1 14 25 L20 30"/>',
  ),
  close: icon('<path d="M14 14 L34 34 M34 14 L14 34"/>'),
  parents: icon('<circle cx="17" cy="14" r="5"/><circle cx="33" cy="17" r="4"/><path d="M8 40 C8 30 12 24 17 24 C22 24 26 30 26 40"/><path d="M26 40 C26 32 29 27 33 27 C37 27 40 32 40 40"/>'),
  levels: icon('<path d="M8 38 H18 V28 H28 V18 H40"/>'),
};
