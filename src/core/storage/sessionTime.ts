/**
 * Łagodny koniec sesji (Z-25) — czysta logika. Liczymy czas aktywnej gry (zegar gry nie stoi);
 * po przerwie dłuższej niż NEW_SESSION_AFTER_MS zaczyna się nowa sesja.
 * Limit działa wyłącznie między rundami: rdzeń sprawdza go przed startem każdej rundy (także po „Brawo!”)
 * i przed wejściem do gry.
 */

export const SESSION_KEY = 'session';
/** Po tylu ms bez gry liczymy od nowa. */
export const NEW_SESSION_AFTER_MS = 30 * 60 * 1000;

export interface SessionTime {
  /** Suma aktywnej gry w ms. */
  playedMs: number;
  /** Kiedy ostatnio coś się działo (Date.now()). */
  lastActiveAt: number;
}

export const EMPTY_SESSION: SessionTime = { playedMs: 0, lastActiveAt: 0 };

/** Sanityzacja zapisu. */
export function parseSession(raw: unknown): SessionTime {
  const r = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);
  return { playedMs: num(r.playedMs), lastActiveAt: num(r.lastActiveAt) };
}

/** Sesja trwa, gdy ostatnia aktywność była niedawno; znacznik z przyszłości (przestawiony zegar) to nowa sesja. */
const isOngoing = (session: SessionTime, now: number): boolean => {
  const idle = now - session.lastActiveAt;
  return idle >= 0 && idle <= NEW_SESSION_AFTER_MS;
};

/** Dolicza `ms` aktywnej gry w chwili `now`; po długiej przerwie zaczyna nową sesję. */
export function addPlayTime(session: SessionTime, ms: number, now: number): SessionTime {
  const added = Number.isFinite(ms) ? Math.max(0, ms) : 0;
  return { playedMs: (isOngoing(session, now) ? session.playedMs : 0) + added, lastActiveAt: now };
}

/** Ile ms gry naliczyła bieżąca sesja w chwili `now`; po długiej przerwie (nowa sesja) 0. */
export function sessionPlayedMs(session: SessionTime, now: number): number {
  return isOngoing(session, now) ? session.playedMs : 0;
}

/** Czy czas na odpoczynek. limitMinutes = 0 → nigdy. */
export function isSessionOver(session: SessionTime, limitMinutes: number, now: number): boolean {
  if (limitMinutes <= 0) return false;
  return sessionPlayedMs(session, now) >= limitMinutes * 60 * 1000;
}
