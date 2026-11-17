import { EXIT_HOLD_MS } from '../input/inputHub';
import { h } from '../util/dom';

export interface HoldButtonOptions {
  label: string;
  /** Treść przycisku (ikona SVG i/lub tekst jako HTML z kodu). */
  content: string;
  /** Czas przytrzymania w ms (domyślnie 1,5 s — Z-28). */
  holdMs?: number;
  className?: string;
  onActivate: () => void;
}

export interface HoldButton {
  readonly el: HTMLButtonElement;
  /** Animuje pierścień z zewnątrz (np. podczas przytrzymania Escape). */
  showHolding(holding: boolean): void;
  /** Kasuje trwające przytrzymanie (woła się przy zamykaniu widoku). */
  destroy(): void;
}

/**
 * Przycisk wymagający świadomego działania: palcem/myszą trzeba go przytrzymać, a pierścień
 * wokół ikony powoli się wypełnia. Z klawiatury (Tab + Enter) działa od razu — to świadomy wybór
 * dorosłego. Krótkie stuknięcie pokazuje dyskretną wskazówkę „przytrzymaj”.
 */
export function createHoldButton(options: HoldButtonOptions): HoldButton {
  const holdMs = options.holdMs ?? EXIT_HOLD_MS;
  const btn = h('button', {
    type: 'button',
    class: `mg-hold ${options.className ?? ''}`.trim(),
    'aria-label': `${options.label} (przytrzymaj)`,
    title: `${options.label} — przytrzymaj`,
  });
  btn.innerHTML = `<span class="mg-hold__ring" aria-hidden="true"></span><span class="mg-hold__content">${options.content}</span><span class="mg-hold__tip" aria-hidden="true">przytrzymaj</span>`;

  let timer: ReturnType<typeof setTimeout> | undefined;
  let tipTimer: ReturnType<typeof setTimeout> | undefined;
  let ringTimer: ReturnType<typeof setInterval> | undefined;

  // Pierścień rysuje CSS z --mg-hold-p (0..1). Wartość ustawiamy stąd co ~30 ms, bo animowanie
  // zmiennej CSS (@property) nie działa w starszych przeglądarkach.
  const setHolding = (holding: boolean) => {
    clearInterval(ringTimer);
    btn.classList.toggle('mg-holding', holding);
    btn.style.setProperty('--mg-hold-p', '0');
    if (!holding) return;
    const heldSince = Date.now();
    ringTimer = setInterval(() => {
      const p = Math.min(1, (Date.now() - heldSince) / holdMs);
      btn.style.setProperty('--mg-hold-p', p.toFixed(3));
      if (p >= 1) clearInterval(ringTimer);
    }, 30);
  };

  const reset = () => {
    clearTimeout(timer);
    timer = undefined;
    setHolding(false);
  };

  btn.addEventListener('pointerdown', (event) => {
    if (event.button > 0 || !event.isPrimary) return;
    event.preventDefault();
    setHolding(true);
    btn.classList.remove('mg-hold--tip');
    btn.setPointerCapture?.(event.pointerId);
    timer = setTimeout(() => {
      timer = undefined;
      setHolding(false);
      options.onActivate();
    }, holdMs);
  });

  const release = () => {
    if (timer !== undefined) {
      // Za krótko — pokaż podpowiedź „przytrzymaj”.
      btn.classList.add('mg-hold--tip');
      clearTimeout(tipTimer);
      tipTimer = setTimeout(() => btn.classList.remove('mg-hold--tip'), 1600);
    }
    reset();
  };
  btn.addEventListener('pointerup', release);
  btn.addEventListener('pointercancel', reset);
  btn.addEventListener('lostpointercapture', reset);

  // Klik z klawiatury (Enter/spacja na fokusie) ma detail === 0 → działa od razu.
  btn.addEventListener('click', (event) => {
    event.preventDefault();
    if (event.detail === 0) options.onActivate();
  });

  return {
    el: btn,
    showHolding(holding) {
      setHolding(holding);
    },
    destroy() {
      reset();
      clearTimeout(tipTimer);
    },
  };
}
