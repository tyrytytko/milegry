/**
 * Maszyna stanów trenera rundy — czysty kod bez DOM (czas tylko z Clock).
 * Pilnuje: bieżącego zadania, drabiny podpowiedzi (Z-19), blokady po błędzie i bezczynności.
 * Co i gdzie narysować, decyduje warstwa wiążąca (coach.ts) przez `CoachView`.
 */
import type { Cancel, Clock } from '../types';
import type { MissOutcome } from './index';

/** Blokada odpowiedzi po błędzie (ms czasu gry) — chroni przed „wolnym waleniem” (Z-21). */
export const LOCK_MS = 700;
/**
 * Jaką część czasu bezczynności (`idleMs`) czekamy na początku rundy: pierwsze zadanie, dziecko jeszcze
 * nic nie zrobiło, więc może nie wiedzieć, co robić. Po pierwszym działaniu (także błędzie) obowiązuje
 * pełny czas — inaczej podpowiedź z bezczynności przychodziłaby tuż po 1. błędzie i przeskakiwała
 * szczebel poświaty (Z-19).
 */
export const FIRST_IDLE_PART = 0.5;

/** 'glow' = spokojna poświata obiektu pytania; 'hint' = wyraźna podpowiedź przy odpowiedzi. */
export type Cue = 'glow' | 'hint';

export interface CoachView<T> {
  /** Pokaż wskazówkę dla zadania (obie mogą być widoczne naraz). */
  show(cue: Cue, task: T): void;
  /** Schowaj wszystkie widoczne wskazówki. */
  hide(): void;
}

export interface CoachCore<T> {
  readonly locked: boolean;
  readonly done: boolean;
  setTask(task: T | null): void;
  /** Akcja dziecka (dowolna intencja) — zeruje licznik bezczynności. */
  activity(): void;
  miss(): MissOutcome;
  success(): void;
  /** Kończy rundę. true tylko za pierwszym razem. */
  finish(): boolean;
  destroy(): void;
}

/**
 * `idleMs` — bezczynność (ms czasu gry), po której pokazujemy podpowiedź obrazem; `null` = podpowiedź
 * z bezczynności wyłączona (drabina po błędach działa bez zmian).
 */
export function createCoachCore<T extends { key: string | number }>(
  clock: Clock,
  view: CoachView<T>,
  idleMs: number | null,
): CoachCore<T> {
  let task: T | null = null;
  /** Szczebel drabiny: 0 = bez błędów, 1 = poświata, 2 = podpowiedź (3 = „razem” zeruje do 0). */
  let step = 0;
  let lockedUntil = -Infinity;
  let tasksSeen = 0;
  /** Dziecko już coś zrobiło w tej rundzie (działanie, błąd albo sukces). */
  let acted = false;
  let done = false;
  let destroyed = false;
  let cancelIdle: Cancel = () => {};
  const shown = new Set<Cue>();

  const show = (cue: Cue) => {
    if (!task || shown.has(cue)) return;
    shown.add(cue);
    view.show(cue, task);
  };

  const hideAll = () => {
    if (shown.size === 0) return;
    shown.clear();
    view.hide();
  };

  const isLocked = () => done || clock.now < lockedUntil;

  const restartIdle = () => {
    cancelIdle();
    cancelIdle = () => {};
    if (!task || done || idleMs === null) return;
    cancelIdle = clock.after(tasksSeen === 1 && !acted ? idleMs * FIRST_IDLE_PART : idleMs, () => show('hint'));
  };

  /** Akcja dziecka: koniec „pierwszego czekania”, licznik bezczynności od zera. */
  const act = () => {
    acted = true;
    restartIdle();
  };

  return {
    get locked() {
      return isLocked();
    },
    get done() {
      return done;
    },

    setTask(next) {
      if (done) return;
      if (next && task && next.key === task.key) {
        task = next; // to samo zadanie — tylko świeże referencje do elementów
        return;
      }
      if (!next && !task) return;
      hideAll();
      step = 0;
      task = next;
      if (next) tasksSeen++;
      restartIdle();
    },

    activity() {
      if (!done) act();
    },

    miss() {
      if (!task || isLocked()) return 'ignored';
      lockedUntil = clock.now + LOCK_MS;
      act(); // błąd też jest działaniem: bezczynność liczy się od teraz
      step++;
      if (step === 1) {
        show('glow');
        return 'glow';
      }
      if (step === 2) {
        show('hint');
        return 'hint';
      }
      step = 0;
      hideAll();
      return 'together';
    },

    success() {
      if (done) return;
      step = 0;
      hideAll();
      act();
    },

    finish() {
      if (done) return false;
      done = true;
      hideAll();
      cancelIdle();
      return true;
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      done = true;
      cancelIdle();
      hideAll();
    },
  };
}
