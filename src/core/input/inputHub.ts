import type { Direction, InputMode, Intent, Settings } from '../types';
import { createKeyGuard, MASH_WINDOW_MS } from './guard';
import { GAME_BLOCKED_KEYS, mapKey, type KeyResult } from './keyboard';

/** Czas przytrzymania Escape (i domku w ramce), po którym gra się zamyka (Z-28). */
export const EXIT_HOLD_MS = 1500;
/**
 * Powolne powtarzanie ruchu przy przytrzymanej strzałce lub przycisku dPad (gdy gra je włączy).
 * Czas rzeczywisty, niezależny od tempa gry (kontrakt: GameInput.setMoveRepeat).
 */
export const MOVE_REPEAT_MS = 380;

/**
 * Odbiorca wejścia. Rdzeń trzyma stos odbiorców: klawiatura trafia tylko do wierzchniego
 * (np. gra → nad nią okno wyboru poziomu). Gdy otwarte jest okno, gra nie dostaje naciśnięć.
 */
export interface InputSink {
  onIntent(intent: Intent): void;
  /** Escape: 'press' = od razu (okna, panel rodzica), 'hold' = po przytrzymaniu EXIT_HOLD_MS (gra). */
  exitMode?: 'press' | 'hold';
  onExit?(): void;
  /** Informacja o trwającym przytrzymaniu Escape (np. do animacji pierścienia na domku). */
  onExitHold?(holding: boolean): void;
  /** Czy przytrzymana strzałka ma powoli powtarzać ruch. */
  moveRepeat?(): boolean;
  /** Tryb gry: blokuj domyślne działanie Spacji, strzałek, Backspace, Tab, „/” i „'”. */
  captureKeys?: boolean;
}

export interface InputHub {
  /** Dodaje odbiorcę na wierzch stosu. Zwraca funkcję usuwającą. */
  push(sink: InputSink): () => void;
  /** Czy odbiorca jest na wierzchu (tylko wtedy kontrolki ekranowe przekazują mu intencje). */
  isTop(sink: InputSink): boolean;
  /**
   * Powtarza ruch odbiorcy co MOVE_REPEAT_MS (przytrzymany przycisk dPad) — tym samym mechanizmem
   * co przytrzymana strzałka. Działa tylko, gdy odbiorca włączył powtarzanie i jest na wierzchu;
   * pierwszy ruch wysyła wywołujący. Zwraca funkcję zatrzymującą.
   */
  repeatMove(sink: InputSink, dir: Direction): () => void;
  /** Rejestruje callback wywoływany przy każdym geście użytkownika (np. odblokowanie dźwięku). */
  onGesture(fn: () => void): void;
  destroy(): void;
}

/** Autodetekcja: główny wskaźnik „gruby” (palec) → dotyk, inaczej klawiatura. */
export function detectMode(): InputMode {
  try {
    return window.matchMedia('(pointer: coarse)').matches ? 'touch' : 'keyboard';
  } catch {
    return 'keyboard';
  }
}

export function resolveMode(setting: Settings['inputMode']): InputMode {
  return setting === 'auto' ? detectMode() : setting;
}

/** Ustawia atrybut data-input na <html> (rozstrzygnięty tryb sterowania). */
export function applyModeToDocument(mode: InputMode): void {
  document.documentElement.dataset.input = mode;
}

/**
 * Czym dziecko steruje w tej chwili: atrybut data-last-input na <html>, ustawiany przez hub wejścia.
 * 'keyboard' ustawiają tylko klawisze nawigacji (NAV_KEYS; Tab — gdy przenosi fokus przeglądarki),
 * 'pointer' — tap/klik. Od 'keyboard' zależy widoczność ramki focusGrid i obrysu fokusu (CSS), więc
 * litera, cyfra czy przypadkowy klawisz go nie ustawiają: odpowiedź symbolem nie może odsłonić ramki
 * na elemencie, którego dziecko nie wybrało.
 */
export type LastInput = 'keyboard' | 'pointer';

const rootElement = () => (typeof document === 'undefined' ? undefined : document.documentElement);

export function lastInput(): LastInput | undefined {
  return rootElement()?.dataset.lastInput as LastInput | undefined;
}

function setLastInput(value: LastInput): void {
  const root = rootElement();
  if (root && root.dataset.lastInput !== value) root.dataset.lastInput = value;
}

/** Klawisze nawigacji, które przełączają na 'keyboard' (Tab osobno — patrz onKeyDown). */
const NAV_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' ']);

function isFormField(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

function isActivatable(target: EventTarget | null): boolean {
  return target instanceof HTMLButtonElement || target instanceof HTMLAnchorElement;
}

/** Intencje-„odpowiedzi” wstrzymywane na chwilę przez strażnika walenia w klawiaturę. */
const isAnswer = (intent: Intent) => intent.type !== 'move' && intent.type !== 'pointer';

/**
 * Czy zablokować domyślne działanie przeglądarki:
 * - klawisz coś znaczy dla odbiorcy (intencja albo Escape) → tak,
 * - klawisz z GAME_BLOCKED_KEYS bez modyfikatorów (przewijanie, szybkie szukanie, auto-repeat
 *   strzałek) → tak, z wyjątkiem Tab poza grą (tam służy do nawigacji po przyciskach).
 */
function shouldPrevent(event: KeyboardEvent, sink: InputSink, result: KeyResult): boolean {
  if (result !== null) return true;
  const plain = !event.ctrlKey && !event.metaKey && !event.altKey;
  return plain && GAME_BLOCKED_KEYS.has(event.key) && (sink.captureKeys === true || event.key !== 'Tab');
}

export function createInputHub(): InputHub {
  const stack: InputSink[] = [];
  const gestureFns: (() => void)[] = [];
  const guard = createKeyGuard();
  const top = () => stack[stack.length - 1];

  // Odpowiedzi czekające na decyzję strażnika.
  let pending: { sink: InputSink; timer: ReturnType<typeof setTimeout> }[] = [];
  const dropPending = (sink?: InputSink) => {
    pending = pending.filter((p) => {
      if (sink && p.sink !== sink) return true;
      clearTimeout(p.timer);
      return false;
    });
  };

  // Przytrzymanie Escape.
  let exitTimer: ReturnType<typeof setTimeout> | undefined;
  let exitSink: InputSink | null = null;
  const cancelExitHold = () => {
    clearTimeout(exitTimer);
    exitTimer = undefined;
    exitSink?.onExitHold?.(false);
    exitSink = null;
  };

  // Powolne powtarzanie ruchu (strzałka albo dPad — jedno naraz). `key` = klawisz, którego puszczenie je kończy.
  let repeat: { timer: ReturnType<typeof setInterval>; key: string | null } | null = null;
  const stopRepeat = () => {
    if (repeat) clearInterval(repeat.timer);
    repeat = null;
  };
  const startRepeat = (sink: InputSink, dir: Direction, key: string | null) => {
    stopRepeat();
    if (top() !== sink || !sink.moveRepeat?.()) return () => {};
    const entry = {
      key,
      timer: setInterval(() => {
        if (top() !== sink || guard.isBlocked(performance.now())) return stopRepeat();
        sink.onIntent({ type: 'move', dir });
      }, MOVE_REPEAT_MS),
    };
    repeat = entry;
    return () => {
      if (repeat === entry) stopRepeat();
    };
  };

  const deliver = (sink: InputSink, intent: Intent) => {
    if (top() === sink) sink.onIntent(intent);
  };

  const onGestureEvent = () => gestureFns.forEach((fn) => fn());
  const onPointerDown = () => {
    setLastInput('pointer');
    onGestureEvent();
  };

  const startExit = (sink: InputSink) => {
    if (sink.exitMode !== 'hold') return sink.onExit?.();
    if (exitTimer !== undefined) return;
    exitSink = sink;
    sink.onExitHold?.(true);
    exitTimer = setTimeout(() => {
      exitTimer = undefined;
      exitSink = null;
      if (top() === sink) sink.onExit?.();
    }, EXIT_HOLD_MS);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    onGestureEvent();
    // Odpowiedź czeka na strażnika: tryb „klawiatura” zapisujemy dopiero po jej doręczeniu, żeby
    // focusGrid wiedział, że to pierwsze naciśnięcie (tylko odsłania ramkę, niczego nie wybiera).
    // Tab w grze jest zablokowany (nic nie robi), poza grą przenosi fokus przycisków i linków.
    const waiting = handleKey(event);
    const nav = NAV_KEYS.has(event.key) || (event.key === 'Tab' && top()?.captureKeys !== true);
    if (!waiting && nav) setLastInput('keyboard');
  };

  /** Zwraca true, gdy odpowiedź czeka na decyzję strażnika. */
  const handleKey = (event: KeyboardEvent): boolean => {
    if (event.isComposing || isFormField(event.target)) return false;
    const sink = top();
    if (!sink) return false;
    if (!sink.captureKeys && isActivatable(event.target)) {
      // Enter na przycisku lub linku poza grą: zostawiamy przeglądarce (Tab + Enter), Spację na przycisku też.
      if (event.key === 'Enter' || (event.key === ' ' && event.target instanceof HTMLButtonElement)) return false;
      // Link nie reaguje na Spację (przewinąłby stronę) — Spacja działa jak Enter (Z-31).
      if (event.key === ' ') {
        event.preventDefault();
        if (!event.repeat) (event.target as HTMLAnchorElement).click();
        return false;
      }
    }

    const result = mapKey({
      key: event.key,
      code: event.code,
      repeat: event.repeat,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      altGraph: event.getModifierState?.('AltGraph') ?? false,
    });
    if (shouldPrevent(event, sink, result)) event.preventDefault();
    if (result === null) return false;
    // Escape omija strażnika: rodzic zawsze wyjdzie.
    if (result === 'exit') {
      startExit(sink);
      return false;
    }

    const verdict = guard.press(event.code || event.key, performance.now());
    if (verdict === 'mash') {
      dropPending();
      stopRepeat();
      return false;
    }
    if (verdict === 'debounced') return false;

    if (isAnswer(result)) {
      const timer = setTimeout(() => {
        pending = pending.filter((p) => p.timer !== timer);
        deliver(sink, result);
        if (result.type === 'confirm') setLastInput('keyboard');
      }, MASH_WINDOW_MS);
      pending.push({ sink, timer });
      return true;
    }

    deliver(sink, result);
    if (result.type === 'move') startRepeat(sink, result.dir, event.key);
    return false;
  };

  const onKeyUp = (event: KeyboardEvent) => {
    if (event.key === 'Escape') cancelExitHold();
    if (repeat?.key === event.key) stopRepeat();
  };

  const onBlur = () => {
    cancelExitHold();
    stopRepeat();
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  window.addEventListener('pointerdown', onPointerDown, true);

  return {
    push(sink) {
      stack.push(sink);
      cancelExitHold();
      stopRepeat();
      return () => {
        const index = stack.lastIndexOf(sink);
        if (index >= 0) stack.splice(index, 1);
        if (exitSink === sink) cancelExitHold();
        dropPending(sink);
        stopRepeat();
      };
    },
    isTop: (sink) => top() === sink,
    repeatMove: (sink, dir) => startRepeat(sink, dir, null),
    onGesture(fn) {
      gestureFns.push(fn);
    },
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('pointerdown', onPointerDown, true);
      dropPending();
      cancelExitHold();
      stopRepeat();
      stack.length = 0;
    },
  };
}
