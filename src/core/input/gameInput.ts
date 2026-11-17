import type { Direction, GameInput, InputMode, Intent, IntentHandler } from '../types';
import type { InputHub, InputSink } from './inputHub';

export interface GameInputController extends GameInput {
  /** Przekazuje intencję grze (używają tego kontrolki ekranowe). Działa tylko, gdy gra jest na wierzchu. */
  emit(intent: Intent): void;
  /** Czy przytrzymanie ruchu ma się powtarzać. */
  readonly moveRepeat: boolean;
  /**
   * Przytrzymany przycisk dPad: powtarza ruch co MOVE_REPEAT_MS czasu rzeczywistego (ten sam mechanizm
   * co przytrzymana strzałka), jeśli gra włączyła powtarzanie. Pierwszy ruch wysyła `emit`. Zwraca stop.
   */
  repeatMove(dir: Direction): () => void;
  destroy(): void;
}

export interface GameInputOptions {
  hub: InputHub;
  mode: InputMode;
  root: HTMLElement;
  /** Escape przytrzymany ≥ 1,5 s. */
  onExit: () => void;
  /** Escape właśnie wciśnięty / puszczony (animacja pierścienia na domku). */
  onExitHold: (holding: boolean) => void;
}

/** Dotyk o dużej powierzchni (dłoń, nadgarstek) ignorujemy. */
const PALM_SIZE_PX = 40;

/**
 * Wejście jednej sesji gry: subskrybenci gry, tap w elementy z data-target wewnątrz root
 * (tylko pierwszy palec), klawiatura z InputHub.
 *
 * Dotyk nie ma strażnika tempa (Z-21): odpada tylko drugi palec i dłoń. Szybkie stukanie jednym
 * palcem jest nieodróżnialne od prób dziecka — przed waleniem w ekran chroni warstwa rundy
 * (krótka blokada odpowiedzi po błędzie).
 */
export function createGameInput(options: GameInputOptions): GameInputController {
  const { hub, mode, root } = options;
  let handlers: IntentHandler[] = [];
  let moveRepeat = false;
  let destroyed = false;
  let activePointer: number | null = null;

  const dispatch = (intent: Intent) => {
    for (const handler of handlers.slice()) {
      try {
        handler(intent);
      } catch (error) {
        console.error('[input] błąd w obsłudze intencji:', error);
      }
    }
  };

  const sink: InputSink = {
    onIntent: dispatch,
    exitMode: 'hold',
    onExit: options.onExit,
    onExitHold: options.onExitHold,
    moveRepeat: () => moveRepeat,
    captureKeys: true,
  };
  const removeSink = hub.push(sink);

  // Tap w element z data-target → intencja pointer. Reakcja na pointerdown (natychmiastowa,
  // ważna przy ruchomych obiektach). Liczy się tylko pierwszy palec, do jego podniesienia.
  const onPointerDown = (event: PointerEvent) => {
    if (event.button > 0 || !hub.isTop(sink)) return;
    // Nowy pierwszy kontakt: poprzednie na pewno się skończyły (nawet jeśli przeglądarka zgubiła ich koniec).
    if (event.isPrimary) activePointer = null;
    if (activePointer !== null && activePointer !== event.pointerId) return;
    if (event.pointerType === 'touch' && event.width > PALM_SIZE_PX && event.height > PALM_SIZE_PX) return;
    activePointer = event.pointerId;
    const hit = (event.target as Element | null)?.closest?.('[data-target]');
    if (!hit || !root.contains(hit)) return;
    const rect = root.getBoundingClientRect();
    dispatch({
      type: 'pointer',
      target: hit.getAttribute('data-target') ?? '',
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };
  const onPointerEnd = (event: PointerEvent) => {
    if (event.pointerId === activePointer) activePointer = null;
  };
  root.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerEnd);
  window.addEventListener('pointercancel', onPointerEnd);

  return {
    mode,
    on(handler) {
      if (destroyed) return () => {};
      handlers.push(handler);
      return () => {
        handlers = handlers.filter((h) => h !== handler);
      };
    },
    setMoveRepeat(enabled) {
      moveRepeat = enabled;
    },
    get moveRepeat() {
      return moveRepeat;
    },
    emit(intent) {
      if (!destroyed && hub.isTop(sink)) dispatch(intent);
    },
    repeatMove(dir) {
      return destroyed ? () => {} : hub.repeatMove(sink, dir);
    },
    destroy() {
      destroyed = true;
      handlers = [];
      removeSink();
      root.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerEnd);
      window.removeEventListener('pointercancel', onPointerEnd);
    },
  };
}
