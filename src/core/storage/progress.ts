import type { GameManifest } from '../types';
import type { Store } from './storage';

/** Postęp gry zapisywany przez rdzeń (gra go nie dotyka). */
export interface GameProgress {
  /** Ukończone poziomy (bez powtórzeń, rosnąco). */
  completed: number[];
  /** Poziom, od którego zacząć przy następnym wejściu. */
  lastLevel: number;
  /** Ostatnio wybrana skórka. */
  lastSkin: string;
}

const key = (gameId: string) => `progress:${gameId}`;

export function loadProgress(store: Store, manifest: GameManifest): GameProgress {
  const raw = store.get<Partial<GameProgress> | null>(key(manifest.id), null) ?? {};
  const maxLevel = manifest.levels;
  const completed = Array.isArray(raw.completed)
    ? [...new Set(raw.completed.filter((n) => Number.isInteger(n) && n >= 1 && n <= maxLevel))].sort((a, b) => a - b)
    : [];
  const lastLevel =
    typeof raw.lastLevel === 'number' && Number.isInteger(raw.lastLevel) && raw.lastLevel >= 1 && raw.lastLevel <= maxLevel
      ? raw.lastLevel
      : maxLevel > 0
        ? 1
        : 0;
  const skins = manifest.skins ?? [];
  const lastSkin =
    typeof raw.lastSkin === 'string' && skins.some((s) => s.id === raw.lastSkin) ? raw.lastSkin : (skins[0]?.id ?? '');
  return { completed, lastLevel, lastSkin };
}

export function saveProgress(store: Store, gameId: string, progress: GameProgress): void {
  store.set(key(gameId), progress);
}

/** Zapisuje ukończenie poziomu i ustawia następny poziom jako startowy. */
export function markCompleted(progress: GameProgress, level: number, totalLevels: number): GameProgress {
  const completed = level >= 1 ? [...new Set([...progress.completed, level])].sort((a, b) => a - b) : progress.completed;
  const lastLevel = level >= 1 && level < totalLevels ? level + 1 : progress.lastLevel;
  return { ...progress, completed, lastLevel };
}
