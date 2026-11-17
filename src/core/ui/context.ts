import type { InputMode, Settings, Ui } from '../types';
import type { GameInputController } from '../input/gameInput';

export interface UiDeps {
  input: GameInputController;
  /** Scena gry (ctx.root). */
  root: HTMLElement;
  /** Pas kontrolek obok albo pod sceną (miejsce numPad/dPad/letterKeys). */
  dock: HTMLElement;
  mode: InputMode;
  reducedMotion: boolean;
  settings: Readonly<Settings>;
}

export interface UiController extends Ui {
  /** Sprząta wszystkie kontrolki i efekty (wołane przez rdzeń po zakończeniu gry). */
  destroyAll(): void;
}

/** Wspólny kontekst modułów Ui: zależności i rejestr sprzątania. */
export interface UiContext {
  deps: UiDeps;
  /** Rejestruje sprzątanie; zwraca idempotentny anulator. */
  track(fn: () => void): () => void;
  /** Wykonuje wszystkie zarejestrowane sprzątania. */
  destroyAll(): void;
}

export function createUiContext(deps: UiDeps): UiContext {
  const cleanups = new Set<() => void>();

  function track(fn: () => void): () => void {
    cleanups.add(fn);
    return () => {
      if (cleanups.delete(fn)) fn();
    };
  }

  function destroyAll(): void {
    for (const fn of [...cleanups]) {
      cleanups.delete(fn);
      try {
        fn();
      } catch (error) {
        console.error('[ui] błąd przy sprzątaniu:', error);
      }
    }
  }

  return { deps, track, destroyAll };
}
