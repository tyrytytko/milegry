/** Tyle zdarzenia wskaźnika, ile potrzeba do decyzji o wciśnięciu. */
type PressEvent = Pick<PointerEvent, 'isPrimary' | 'button'>;

/** Element, któremu wystarcza lista klas i nasłuch zdarzeń wskaźnika. */
export interface PressTarget {
  classList: { add(name: string): void; remove(name: string): void };
  addEventListener(type: string, listener: (event: PressEvent) => void): void;
}

/**
 * Stan „wciśnięty” (klasa `mg-pressed`) od dotknięcia do puszczenia. Klasa zamiast samego `:active`,
 * bo `:active` na dotyku w Safari pojawia się zawodnie. Palec zsunięty z elementu albo przejęty przez
 * przeglądarkę (pointerleave / pointercancel) też puszcza — element nie zostaje „wciśnięty”.
 * Sama zmiana wyglądu; nie przechwytuje wskaźnika ani nie zmienia kliknięcia.
 */
export function addPressFeedback(el: PressTarget): void {
  el.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button > 0) return;
    el.classList.add('mg-pressed');
  });
  const release = () => el.classList.remove('mg-pressed');
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
  el.addEventListener('pointerleave', release);
}
