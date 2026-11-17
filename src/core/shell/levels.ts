import type { GameManifest, InputMode } from '../types';

/**
 * Poziom, na który prowadzi „Dalej” po ukończeniu `level`: następny, który w danym trybie
 * sterowania nie jest oznaczony jako „trudniejszy” (manifest.hardLevels). Trudniejsze poziomy
 * są dostępne tylko z wyboru poziomu (Z-31, Z-39). null = nie ma dokąd iść dalej.
 */
export function nextLevel(manifest: GameManifest, level: number, mode: InputMode): number | null {
  const hard = manifest.hardLevels?.[mode] ?? [];
  for (let n = level + 1; n <= manifest.levels; n++) {
    if (!hard.includes(n)) return n;
  }
  return null;
}

/**
 * Poziom i obrazki z adresu gry (`/<id>/?poziom=5&obrazki=<skórka>`): ułatwienie dla testów
 * i dla rodzica (link do poziomu). Wartość spoza zakresu albo nieznana skórka jest pomijana
 * (gra zachowuje się domyślnie). Samo odczytanie niczego nie zapisuje.
 */
export function startFromQuery(search: string, manifest: GameManifest): { level?: number; skin?: string } {
  const params = new URLSearchParams(search);
  const result: { level?: number; skin?: string } = {};
  const level = params.get('poziom');
  if (level !== null && /^\d{1,4}$/.test(level)) {
    const n = Number(level);
    if (n >= 1 && n <= manifest.levels) result.level = n;
  }
  const skin = params.get('obrazki');
  if (skin !== null && manifest.skins?.some((s) => s.id === skin)) result.skin = skin;
  return result;
}
