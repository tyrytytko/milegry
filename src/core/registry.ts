import type { Area, GameManifest, GameModule } from './types';
import { PARENTS_SEGMENT } from './router';

/**
 * Odkrywanie gier: każdy folder src/games/<id>/ z manifest.ts i game.ts jest grą.
 * Manifesty ładujemy przy starcie, każdy osobno: zepsuty manifest jednej gry (np. błędny import)
 * usuwa z huba tylko tę grę, reszta działa. game.ts — leniwie, dopiero po wejściu do gry
 * (osobny plik JS i CSS dla każdej gry).
 */
const manifestLoaders = import.meta.glob<{ manifest: GameManifest }>('../games/*/manifest.ts');
const gameModules = import.meta.glob<{ default: GameModule }>('../games/*/game.ts');

export const AREAS: { id: Area; title: string }[] = [
  { id: 'litery', title: 'Litery' },
  { id: 'liczby', title: 'Liczby' },
  { id: 'ksztalty', title: 'Kształty' },
  { id: 'logika', title: 'Logika' },
  { id: 'pamiec', title: 'Pamięć' },
];

/** Adresy zajęte przez rdzeń/build — gra nie może mieć takiego id. */
export const RESERVED_IDS = [PARENTS_SEGMENT, 'assets', 'licencje', 'index', 'src', 'public'];

/** Wyciąga nazwę folderu gry ze ścieżki modułu: '../games/literki/manifest.ts' → 'literki'. */
export function folderOf(path: string): string {
  const match = /\/games\/([^/]+)\//.exec(path);
  return match?.[1] ?? '';
}

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

/** Sprawdza manifest. Zwraca listę problemów (pusta = OK). */
export function validateManifest(manifest: unknown, folder: string): string[] {
  const errors: string[] = [];
  if (!manifest || typeof manifest !== 'object') return [`${folder}: brak eksportu "manifest"`];
  const m = manifest as Partial<GameManifest>;
  const where = `${folder}/manifest.ts`;

  if (m.id !== folder) errors.push(`${where}: id "${String(m.id)}" musi być równe nazwie folderu "${folder}"`);
  if (!isNonEmptyString(m.id) || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(m.id)) {
    errors.push(`${where}: id może zawierać tylko małe litery a-z, cyfry i pojedyncze myślniki`);
  }
  if (isNonEmptyString(m.id) && RESERVED_IDS.includes(m.id)) errors.push(`${where}: id "${m.id}" jest zarezerwowane`);
  if (!isNonEmptyString(m.title)) errors.push(`${where}: brak title`);
  if (!isNonEmptyString(m.description)) errors.push(`${where}: brak description`);
  if (!AREAS.some((a) => a.id === m.area)) {
    errors.push(`${where}: area musi być jednym z: ${AREAS.map((a) => a.id).join(', ')}`);
  }
  if (
    !Array.isArray(m.input) ||
    m.input.length === 0 ||
    m.input.some((i) => i !== 'keyboard' && i !== 'touch') ||
    new Set(m.input).size !== m.input.length
  ) {
    errors.push(`${where}: input musi być niepustą listą z 'keyboard' i/lub 'touch'`);
  }
  if (
    !Array.isArray(m.age) ||
    m.age.length !== 2 ||
    !m.age.every((a) => Number.isInteger(a) && a >= 2 && a <= 10) ||
    m.age[0] > m.age[1]
  ) {
    errors.push(`${where}: age musi być [od, do], liczby całkowite 2..10, od <= do`);
  }
  if (!isNonEmptyString(m.icon) || !m.icon.trim().startsWith('<svg')) errors.push(`${where}: icon musi być inline SVG`);
  if (typeof m.levels !== 'number' || !Number.isInteger(m.levels) || m.levels < 0 || m.levels > 100) {
    errors.push(`${where}: levels musi być liczbą całkowitą 0..100`);
  }
  if (typeof m.order !== 'number' || !Number.isFinite(m.order)) errors.push(`${where}: brak order (liczba)`);

  if (m.skins !== undefined) {
    if (!Array.isArray(m.skins) || m.skins.length === 0) {
      errors.push(`${where}: skins, jeśli podane, musi być niepustą listą`);
    } else {
      const ids = m.skins.map((s) => s?.id);
      if (m.skins.some((s) => !s || !isNonEmptyString(s.id) || !/^[a-z0-9-]+$/.test(s.id) || !isNonEmptyString(s.title))) {
        errors.push(`${where}: każda skórka musi mieć id [a-z0-9-] i title`);
      }
      if (new Set(ids).size !== ids.length) errors.push(`${where}: id skórek muszą być unikalne`);
    }
  }

  if (m.hardLevels !== undefined) {
    for (const [mode, list] of Object.entries(m.hardLevels)) {
      if (mode !== 'keyboard' && mode !== 'touch') errors.push(`${where}: hardLevels — nieznany tryb "${mode}"`);
      if (!Array.isArray(list) || list.some((n) => !Number.isInteger(n) || n < 1 || n > (m.levels ?? 0))) {
        errors.push(`${where}: hardLevels.${mode} musi zawierać numery istniejących poziomów`);
      }
    }
  }
  return errors;
}

/** Ładuje wszystkie manifesty; ten, którego nie da się załadować, jest pomijany z komunikatem. */
export async function loadManifestModules(
  loaders: Record<string, () => Promise<{ manifest: GameManifest }>>,
): Promise<Record<string, { manifest: GameManifest }>> {
  const entries = Object.entries(loaders);
  const results = await Promise.allSettled(entries.map(([, load]) => load()));
  const loaded: Record<string, { manifest: GameManifest }> = {};
  results.forEach((result, i) => {
    const path = entries[i]![0];
    if (result.status === 'fulfilled') loaded[path] = result.value;
    else console.error(`[registry] gra "${folderOf(path)}" pominięta: nie da się załadować manifest.ts:`, result.reason);
  });
  return loaded;
}

const manifestModules = await loadManifestModules(manifestLoaders);

function collectGames(): GameManifest[] {
  const list: GameManifest[] = [];
  for (const [path, mod] of Object.entries(manifestModules)) {
    const folder = folderOf(path);
    const errors = validateManifest(mod.manifest, folder);
    const hasGame = Object.keys(gameModules).some((p) => folderOf(p) === folder);
    if (!hasGame) errors.push(`${folder}: brak pliku game.ts`);
    if (errors.length > 0) {
      console.error(`[registry] gra "${folder}" pominięta:\n- ${errors.join('\n- ')}`);
      continue;
    }
    list.push(mod.manifest);
  }
  return list.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'pl'));
}

/** Poprawne gry, posortowane po `order`. */
export const games: readonly GameManifest[] = collectGames();

export function findGame(id: string): GameManifest | undefined {
  return games.find((g) => g.id === id);
}

/** Ładuje moduł gry (leniwy chunk). */
export async function loadGame(id: string): Promise<GameModule> {
  const entry = Object.entries(gameModules).find(([path]) => folderOf(path) === id);
  if (!entry) throw new Error(`Nie ma gry "${id}"`);
  const mod = await entry[1]();
  return mod.default;
}

/** Surowe dane do testów (ścieżka modułu → załadowany manifest). */
export const rawManifestModules = manifestModules;
export const rawGameModulePaths = Object.keys(gameModules);
