import type { InputHub } from '../input/inputHub';
import { createFocusGrid } from '../ui/focusGrid';
import { icons } from '../ui/icons';
import { h } from '../util/dom';

export interface SheetOptions {
  /** Tytuł (widoczny i dla czytników ekranu). */
  title: string;
  /** Treść okna. */
  content: HTMLElement;
  /** Elementy do nawigacji strzałkami (przyciski w treści). */
  focusItems: HTMLElement[];
  /** Indeks początkowo zaznaczonego elementu. */
  initial?: number;
  /** Czy pokazać przycisk zamknięcia i zamykać kliknięciem w tło. Domyślnie true. */
  closable?: boolean;
  /** Co robi Escape. Domyślnie: zamyka (gdy closable). */
  onExit?: () => void;
  /** 'press' (domyślnie) = Escape działa od razu; 'hold' = po przytrzymaniu 1,5 s (wyjście z gry). */
  exitMode?: 'press' | 'hold';
  onExitHold?: (holding: boolean) => void;
  onClose?: () => void;
  className?: string;
}

export interface Sheet {
  close(): void;
}

let sheetCounter = 0;

/**
 * Spokojne okno na środku ekranu (wybór poziomu, skórki, ekran nagrody).
 * Przejmuje klawiaturę (strzałki + Enter), gra pod spodem nie dostaje naciśnięć.
 */
export function openSheet(host: HTMLElement, hub: InputHub, options: SheetOptions): Sheet {
  const closable = options.closable ?? true;
  const titleId = `mg-sheet-title-${++sheetCounter}`;
  const panel = h('div', { class: `mg-sheet__panel ${options.className ?? ''}`.trim() }, [
    h('h2', { class: 'mg-sheet__title', id: titleId }, options.title),
    options.content,
  ]);
  const backdrop = h('div', { class: 'mg-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId }, [panel]);

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    removeSink();
    grid.destroy();
    // Zamykane okno nie przyjmuje już kliknięć (np. drugie „Dalej” w trakcie znikania).
    backdrop.inert = true;
    backdrop.classList.add('mg-sheet--closing');
    // Okno znika po czasie animacji z CSS (.mg-sheet--closing), nie po osobnej liczbie.
    const fadeMs = (parseFloat(getComputedStyle(backdrop).animationDuration) || 0) * 1000;
    setTimeout(() => backdrop.remove(), fadeMs + 50);
    options.onClose?.();
  };

  if (closable) {
    const closeBtn = h('button', { type: 'button', class: 'mg-btn mg-btn--quiet mg-sheet__close', 'aria-label': 'Zamknij' });
    closeBtn.innerHTML = icons.close;
    closeBtn.addEventListener('click', close);
    panel.prepend(closeBtn);
    backdrop.addEventListener('pointerdown', (event) => {
      if (event.target === backdrop) close();
    });
  }

  const grid = createFocusGrid({
    items: options.focusItems,
    initial: options.initial ?? 0,
    domFocus: true,
    pointer: false,
    onSelect: (_i, el) => el.click(),
  });

  const removeSink = hub.push({
    exitMode: options.exitMode ?? 'press',
    onExitHold: options.onExitHold,
    onIntent: (intent) => {
      grid.handle(intent);
    },
    onExit: () => {
      if (options.onExit) options.onExit();
      else if (closable) close();
    },
  });

  host.append(backdrop);
  // Fokus po wstawieniu do DOM.
  grid.focus(options.initial ?? 0);
  return { close };
}
