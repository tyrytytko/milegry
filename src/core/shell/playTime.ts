import type { GameStorage } from '../types';
import { addPlayTime, EMPTY_SESSION, isSessionOver, parseSession, sessionPlayedMs, SESSION_KEY } from '../storage/sessionTime';

/** Co ile ms doliczonej gry zapisujemy na dysk (poza zapisami na żądanie: koniec rundy, wyjście, ukrycie karty). */
export const SAVE_EVERY_MS = 15_000;

/** Wiersz dla rodzica o naliczonym czasie sesji (nie dnia). */
export function sessionTimeText(ms: number): string {
  return ms < 60_000 ? 'W tej sesji: mniej niż minuta' : `W tej sesji: ok. ${Math.round(ms / 60_000)} min`;
}

/** Czas sesji w pamięci; do magazynu trafia rzadko, a nie przy każdym tyknięciu zegara. */
export function createPlayTime(store: GameStorage) {
  let session = parseSession(store.get(SESSION_KEY, EMPTY_SESSION));
  let unsavedMs = 0;

  function flush(): void {
    if (unsavedMs === 0) return;
    unsavedMs = 0;
    store.set(SESSION_KEY, session);
  }

  return {
    record(ms: number, now: number): void {
      session = addPlayTime(session, ms, now);
      unsavedMs += Number.isFinite(ms) ? Math.max(0, ms) : 0;
      if (unsavedMs >= SAVE_EVERY_MS) flush();
    },
    flush,
    reset(): void {
      session = EMPTY_SESSION;
      unsavedMs = 0;
      store.set(SESSION_KEY, session);
    },
    isOver: (limitMinutes: number, now: number): boolean => isSessionOver(session, limitMinutes, now),
    /** Naliczony czas gry bieżącej sesji (z niezapisanym); po długiej przerwie 0. */
    elapsedMs: (now: number): number => sessionPlayedMs(session, now),
  };
}
