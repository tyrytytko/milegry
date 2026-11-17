import type { Cancel, Clock, Tempo } from './types';

/** Mnożniki tempa z panelu rodzica. */
export const TEMPO_SCALE: Record<Tempo, number> = {
  calm: 0.7,
  medium: 1,
  lively: 1.35,
};

/** Najdłuższy krok czasu w jednej klatce (ms czasu rzeczywistego) — chroni przed skokami po powrocie do karty. */
export const MAX_FRAME_MS = 100;

interface Timer {
  due: number;
  interval: number | null;
  fn: () => void;
  cancelled: boolean;
}

type FrameFn = (dt: number, now: number) => void;

/** Zegar z ręcznym sterowaniem — rdzeń „tyka” nim z requestAnimationFrame, testy ręcznie. */
export interface ClockController extends Clock {
  /** Przesuwa czas o `realDtMs` ms czasu rzeczywistego (gdy nie ma pauzy). */
  tick(realDtMs: number): void;
  /** Pauza z podanego powodu (np. 'hidden', 'overlay'). Zegar stoi, dopóki jest jakikolwiek powód. */
  pause(reason: string): void;
  resume(reason: string): void;
  readonly paused: boolean;
  /** Mnożnik tempa: calm 0.7, medium 1, lively 1.35. */
  readonly scale: number;
  /** Anuluje wszystkie timery i pętle. Po tym zegar nic już nie wywoła. */
  destroy(): void;
}

function safeCall(fn: () => void): void {
  try {
    fn();
  } catch (error) {
    console.error('[clock] błąd w callbacku gry:', error);
  }
}

export function createClock(scale = 1): ClockController {
  let now = 0;
  let destroyed = false;
  const pauseReasons = new Set<string>();
  let timers: Timer[] = [];
  let frames: { fn: FrameFn; cancelled: boolean }[] = [];

  function addTimer(ms: number, fn: () => void, repeat: boolean): Cancel {
    if (destroyed) return () => {};
    const delay = Math.max(repeat ? 16 : 0, ms);
    const timer: Timer = { due: now + delay, interval: repeat ? delay : null, fn, cancelled: false };
    timers.push(timer);
    return () => {
      timer.cancelled = true;
    };
  }

  function tick(realDtMs: number): void {
    if (destroyed || pauseReasons.size > 0) return;
    const dt = Math.min(Math.max(realDtMs, 0), MAX_FRAME_MS) * scale;
    now += dt;

    // Należne timery w kolejności terminów (kopia, bo callback może dodawać nowe i anulować inne).
    const due = timers.filter((t) => t.due <= now).sort((a, b) => a.due - b.due);
    for (const timer of due) {
      if (timer.cancelled) continue;
      if (timer.interval === null) {
        timer.cancelled = true;
      } else {
        timer.due += timer.interval;
        if (timer.due <= now) timer.due = now + timer.interval; // bez serii nadrabiania
      }
      safeCall(timer.fn);
      if (destroyed) return;
    }
    timers = timers.filter((t) => !t.cancelled);

    for (const frame of frames.slice()) {
      if (frame.cancelled) continue;
      safeCall(() => frame.fn(dt, now));
      if (destroyed) return;
    }
    frames = frames.filter((f) => !f.cancelled);
  }

  return {
    every: (ms, fn) => addTimer(ms, fn, true),
    after: (ms, fn) => addTimer(ms, fn, false),
    frame(fn) {
      if (destroyed) return () => {};
      const entry = { fn, cancelled: false };
      frames.push(entry);
      return () => {
        entry.cancelled = true;
      };
    },
    wait(ms) {
      return new Promise<void>((resolve) => {
        addTimer(ms, resolve, false);
      });
    },
    get now() {
      return now;
    },
    scale,
    tick,
    pause(reason) {
      pauseReasons.add(reason);
    },
    resume(reason) {
      pauseReasons.delete(reason);
    },
    get paused() {
      return pauseReasons.size > 0;
    },
    destroy() {
      destroyed = true;
      timers = [];
      frames = [];
    },
  };
}

/** Co ile ms zapasowy timer sprawdza, czy klatki przychodzą (patrz driveClock). */
export const FALLBACK_TICK_MS = 50;

/**
 * Napędza zegar z requestAnimationFrame i pauzuje go, gdy karta jest ukryta albo okno traci fokus.
 * Gdy klatki nie przychodzą, a karta nie jest ukryta (schowany panel podglądu w narzędziach:
 * `visibilityState` = 'visible', a rAF stoi), czas uzupełnia zapasowy timer co FALLBACK_TICK_MS —
 * czas gry płynie normalnie. Gdy rAF działa, timer nic nie robi. Przy ukrytej karcie zegar stoi (pauza).
 * Zwraca funkcję zatrzymującą napęd (nie niszczy zegara).
 */
export function driveClock(clock: ClockController): Cancel {
  let last = performance.now();
  let rafId = 0;
  let running = true;

  const step = (time: number) => {
    if (time <= last) return;
    clock.tick(time - last);
    last = time;
  };

  const loop = (time: number) => {
    if (!running) return;
    step(time);
    rafId = requestAnimationFrame(loop);
  };

  const fallback = setInterval(() => {
    const time = performance.now();
    if (time - last >= FALLBACK_TICK_MS) step(time);
  }, FALLBACK_TICK_MS);

  const onVisibility = () => {
    if (document.hidden) {
      clock.pause('hidden');
    } else {
      last = performance.now();
      clock.resume('hidden');
    }
  };

  // Utrata fokusu okna (dziecko kliknęło gdzieś obok, przełączyło okno) też pauzuje grę.
  const onBlur = () => clock.pause('blur');
  const onFocus = () => {
    last = performance.now();
    clock.resume('blur');
  };

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('blur', onBlur);
  window.addEventListener('focus', onFocus);
  onVisibility();
  rafId = requestAnimationFrame(loop);

  return () => {
    running = false;
    cancelAnimationFrame(rafId);
    clearInterval(fallback);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('focus', onFocus);
  };
}
