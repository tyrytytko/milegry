/**
 * Strażnik klawiatury (Z-21) — czysta logika z czasem podawanym z zewnątrz.
 *
 * Rdzeń wstrzymuje „odpowiedzi” (litery, cyfry, Spacja/Enter, Backspace) na MASH_WINDOW_MS, zanim
 * przekaże je grze. Każda reguła walenia patrzy tylko na to samo okno, więc w chwili wykrycia
 * wszystkie odpowiedzi z tej serii wciąż czekają i są odrzucane w całości.
 *
 * Łapie:
 * - odbicie: ten sam klawisz w < DEBOUNCE_MS od jego ostatniego PRZYJĘTEGO naciśnięcia („drżący palec”);
 *   stukanie w strzałkę co ~250 ms (labirynt) przechodzi w całości,
 * - walenie dłonią: ≥ 3 różne klawisze w < 300 ms (szybciej niż ok. 7 różnych klawiszy/s),
 * - bębnienie: ≥ 4 naciśnięcia (także tych samych klawiszy) w < 300 ms,
 * - po waleniu blokada trwa, dopóki nie minie CALM_MS spokoju.
 *
 * Świadomie NIE łapie:
 * - „wolnego walenia” (ok. 4–6 różnych klawiszy/s) — na poziomie wejścia nie da się go odróżnić
 *   od prób dziecka; chroni przed nim warstwa rundy krótką blokadą odpowiedzi po błędzie,
 * - spokojnego błądzenia strzałkami — ruch nie jest wstrzymywany (gra musi reagować od razu);
 *   gra z celem osiąganym ruchem sama decyduje, czy ograniczyć tempo kroków,
 * - dotyku — tu działa tylko reguła pierwszego palca i dłoni (gameInput).
 */

/** Ten sam klawisz szybciej niż to od ostatniego przyjętego naciśnięcia → odbicie. */
export const DEBOUNCE_MS = 200;
/** Okno wykrywania walenia. Tyle samo rdzeń wstrzymuje odpowiedzi — nie skracaj jednego bez drugiego. */
export const MASH_WINDOW_MS = 300;
/** Tyle różnych klawiszy w oknie = walenie dłonią. */
const MASH_DISTINCT = 3;
/** Tyle naciśnięć w oknie = bębnienie. */
const MASH_PRESSES = 4;
/** Blokada po waleniu trwa, dopóki nie minie tyle spokoju. */
export const CALM_MS = 700;

/** 'ok' = przepuść, 'debounced' = zignoruj tylko to naciśnięcie, 'mash' = walenie: odrzuć też oczekujące. */
export type GuardVerdict = 'ok' | 'debounced' | 'mash';

export interface KeyGuard {
  press(key: string, time: number): GuardVerdict;
  /** Czy w chwili `time` trwa blokada po waleniu. */
  isBlocked(time: number): boolean;
}

export function createKeyGuard(): KeyGuard {
  let recent: { key: string; time: number }[] = [];
  const lastAccepted = new Map<string, number>();
  let blockedUntil = -Infinity;

  return {
    press(key, time) {
      recent.push({ key, time });
      recent = recent.filter((p) => time - p.time < MASH_WINDOW_MS);
      const distinct = new Set(recent.map((p) => p.key)).size;

      if (distinct >= MASH_DISTINCT || recent.length >= MASH_PRESSES || time < blockedUntil) {
        blockedUntil = time + CALM_MS;
        return 'mash';
      }
      const previous = lastAccepted.get(key);
      if (previous !== undefined && time - previous < DEBOUNCE_MS) return 'debounced';
      lastAccepted.set(key, time);
      return 'ok';
    },
    isBlocked(time) {
      return time < blockedUntil;
    },
  };
}
