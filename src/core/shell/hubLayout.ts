/**
 * Układ huba: jedna siatka wszystkich gier na jednym ekranie (bez DOM, testowane w hubLayout.test.ts).
 * Widok (hub.ts) przekazuje wynik do CSS przez zmienne `--mg-hub-*`, więc wymiary są tylko tutaj.
 */

/** Stałe układu w px. Odstępy odpowiadają tokenom z tokens.css (w nawiasach). */
export const HUB_LAYOUT = {
  /** Margines z lewej i prawej (--mg-space). */
  pad: 16,
  /** Margines nad nagłówkiem (--mg-space-s). */
  padTop: 8,
  /** Odstęp między kafelkami (--mg-touch-gap, Z-33). */
  gap: 16,
  /** Odstęp między nagłówkiem a siatką (--mg-space): przycisk „Dla rodziców” ≥ 16 px od kafelków (Z-33). */
  headerGap: 16,
  /** Pas przy dolnej krawędzi bez elementów interaktywnych (--mg-edge-safe, Z-33). */
  edgeSafe: 40,
  /**
   * Tytuł pod obrazkiem: odstęp 4 px (--mg-space-xs) + dwa wiersze --mg-font-size-s z interlinią 1,2
   * (1rem = 18 px, bo <html> ma --mg-font-size) = 4 + 43,2, w górę do 48.
   */
  titleHeight: 48,
  /**
   * Najwęższy kafelek, pod którym dwuwierszowy tytuł jest czytelny: najdłuższe słowo dzisiejszych
   * tytułów („Kształtowe”) ma w tym piśmie 99 px. Węższy kafelek → same obrazki, w obu orientacjach
   * (PRD platforma-hub-mobilny, sekcja 4, „Tytuły tylko tam, gdzie się mieszczą”).
   * Gra z dłuższym słowem w tytule wymaga podniesienia progu.
   */
  titleMinTile: 100,
  /**
   * Bok przycisku „Dla rodziców” (--mg-frame-btn, Z-33). Stoi w prawym górnym rogu pasa nagłówka,
   * więc nagłówek (jeżyk, napis, przycisk) ma tę wysokość w pionie i w poziomie.
   */
  parents: 80,
  /** Najmniejszy kafelek (Z-33: cel ≥ 80 px). */
  minTile: 80,
  /** Największy kafelek — na dużym monitorze obrazki nie rosną bez końca. */
  maxTile: 280,
} as const;

/**
 * Bezpieczne marginesy ekranu w px: pas zasłonięty wycięciem na aparat, zaokrąglonym rogiem albo paskiem
 * systemu (w przeglądarce `env(safe-area-inset-*)`; na ekranie bez wycięcia wszystkie są zerowe).
 */
export interface SafeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const NO_INSETS: SafeInsets = { top: 0, right: 0, bottom: 0, left: 0 };

export interface HubLayout {
  orientation: 'portrait' | 'landscape';
  columns: number;
  rows: number;
  /** Bok kwadratowego obrazka kafelka w px (całe piksele). */
  tile: number;
  headerHeight: number;
  /** Czy pod obrazkami widać tytuły; false → same obrazki, tytuł tylko w etykiecie dla czytników. */
  titles: boolean;
  /** Czy siatka mieści się na ekranie bez przewijania; false → kafelek ma minimum, a hub się przewija. */
  fits: boolean;
}

/**
 * Liczba kolumn: w pionie 3, w poziomie 5 (do 9 gier) albo 6 (10–12 gier, układ 6 × 2) —
 * ten sam układ na każdym urządzeniu. Nigdy więcej kolumn niż gier.
 */
function columnsFor(count: number, landscape: boolean): number {
  const columns = landscape ? (count <= 9 ? 5 : 6) : 3;
  return Math.max(1, Math.min(count, columns));
}

/**
 * Liczba kolumn i rozmiar kafelka dla `count` gier na ekranie `width` × `height` (px).
 * Bezpieczne marginesy `safe` dochodzą z boków i z góry do zwykłych odstępów; z dołu pas przy krawędzi
 * (`edgeSafe`) już odsuwa siatkę od paska systemu, więc liczy się większy z nich, nie suma.
 */
export function computeHubLayout(count: number, width: number, height: number, safe: SafeInsets = NO_INSETS): HubLayout {
  const L = HUB_LAYOUT;
  const landscape = width > height;
  const columns = columnsFor(count, landscape);
  const rows = Math.max(1, Math.ceil(count / columns));
  const headerHeight = L.parents;

  const byWidth = (width - safe.left - safe.right - 2 * L.pad - (columns - 1) * L.gap) / columns;
  const gridHeight = height - safe.top - L.padTop - headerHeight - L.headerGap - Math.max(L.edgeSafe, safe.bottom);
  const bestTile = (titleHeight: number) => {
    const byHeight = (gridHeight - (rows - 1) * L.gap) / rows - titleHeight;
    return Math.floor(Math.min(byWidth, byHeight, L.maxTile));
  };

  // Najpierw z tytułami; gdy kafelek wyjdzie za wąski na tytuł (próg jest wyższy niż minTile, więc
  // obejmuje też kafelek poniżej 80 px), liczymy bez nich.
  const withTitles = bestTile(L.titleHeight);
  const titles = withTitles >= Math.max(L.titleMinTile, L.minTile);
  const best = titles ? withTitles : bestTile(0);
  const fits = best >= L.minTile;

  return {
    orientation: landscape ? 'landscape' : 'portrait',
    columns,
    rows,
    tile: fits ? best : L.minTile,
    headerHeight,
    titles,
    fits,
  };
}
