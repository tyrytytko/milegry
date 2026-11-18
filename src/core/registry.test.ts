/**
 * Test globalny: waliduje wszystkie gry w src/games/.
 * Gdy dodajesz grę i ten test nie przechodzi — popraw swoją grę, nie test.
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import type { GameManifest } from './types';
import {
  folderOf,
  games,
  isVisibleForAge,
  loadManifestModules,
  rawGameModulePaths,
  rawManifestModules,
  validateManifest,
  visibleGames,
} from './registry';

const GAMES_DIR = fileURLToPath(new URL('../games', import.meta.url));
const gameFolders = existsSync(GAMES_DIR)
  ? readdirSync(GAMES_DIR).filter((name) => statSync(join(GAMES_DIR, name)).isDirectory())
  : [];

describe('rejestr gier', () => {
  it('istnieje co najmniej jedna gra', () => {
    expect(games.length).toBeGreaterThan(0);
  });

  it('każdy folder gry jest poprawną grą (żadna nie została pominięta)', () => {
    expect(games.map((g) => g.id).sort()).toEqual([...gameFolders].sort());
  });

  describe.each(gameFolders)('gra %s', (folder) => {
    const dir = join(GAMES_DIR, folder);
    const manifestEntry = Object.entries(rawManifestModules).find(([path]) => folderOf(path) === folder);

    it('ma wymagane pliki: manifest.ts, game.ts, logic.ts, logic.test.ts, README.md', () => {
      for (const file of ['manifest.ts', 'game.ts', 'logic.ts', 'logic.test.ts', 'README.md']) {
        expect(existsSync(join(dir, file)), `${folder}/${file}`).toBe(true);
      }
      expect(rawGameModulePaths.some((p) => folderOf(p) === folder)).toBe(true);
    });

    it('manifest jest poprawny', () => {
      expect(manifestEntry, `${folder}/manifest.ts musi eksportować "manifest"`).toBeDefined();
      expect(validateManifest(manifestEntry?.[1].manifest, folder)).toEqual([]);
    });
  });
});

describe('widoczność gry w hubie według wieku dziecka', () => {
  const withAge = (age: [number, number]) => ({ age });

  it('gra od 3 lat jest widoczna w obu przedziałach', () => {
    expect(isVisibleForAge(withAge([3, 5]), '3-5')).toBe(true);
    expect(isVisibleForAge(withAge([3, 5]), '5-7')).toBe(true);
  });

  it('gra od 6 lat jest widoczna tylko w „5–7”', () => {
    expect(isVisibleForAge(withAge([6, 7]), '3-5')).toBe(false);
    expect(isVisibleForAge(withAge([6, 7]), '5-7')).toBe(true);
  });

  it('granica: dolny wiek równy górnej granicy przedziału jest widoczny', () => {
    expect(isVisibleForAge(withAge([5, 7]), '3-5')).toBe(true);
    expect(isVisibleForAge(withAge([8, 10]), '5-7')).toBe(false);
  });

  it('visibleGames zachowuje kolejność listy', () => {
    const list = [
      { id: 'a', age: [3, 5] as [number, number] },
      { id: 'b', age: [6, 7] as [number, number] },
      { id: 'c', age: [3, 7] as [number, number] },
    ];
    expect(visibleGames(list, '3-5').map((g) => g.id)).toEqual(['a', 'c']);
    expect(visibleGames(list, '5-7').map((g) => g.id)).toEqual(['a', 'b', 'c']);
  });

  it('prawdziwe manifesty: w „3–5” widać 9 gier dla młodszych i żadnej gry od 6 lat', () => {
    // Lista nie rośnie z nowymi grami: gra spoza niej musi tylko mieć dolną granicę wieku ≤ 5.
    const shown = visibleGames(games, '3-5');
    expect(shown.map((g) => g.id)).toEqual(
      expect.arrayContaining([
        'imie',
        'labirynt',
        'literki',
        'literki-blizniaczki',
        'okienka',
        'orzeszki',
        'pary',
        'patyczki',
        'po-jednym',
      ]),
    );
    expect(shown.filter((g) => g.age[0] > 5)).toEqual([]);
    expect(games.filter((g) => g.age[0] <= 5 && !shown.includes(g))).toEqual([]);
  });
});

describe('validateManifest', () => {
  const good = {
    id: 'x-gra',
    title: 'X',
    description: 'Opis.',
    area: 'logika',
    input: ['keyboard', 'touch'],
    age: [3, 5],
    icon: '<svg viewBox="0 0 1 1"></svg>',
    levels: 3,
    order: 1,
  };

  it('akceptuje poprawny manifest', () => {
    expect(validateManifest(good, 'x-gra')).toEqual([]);
  });

  it('wykrywa typowe błędy', () => {
    expect(validateManifest({ ...good, id: 'inna' }, 'x-gra')).not.toEqual([]);
    expect(validateManifest({ ...good, area: 'muzyka' }, 'x-gra')).not.toEqual([]);
    expect(validateManifest({ ...good, input: [] }, 'x-gra')).not.toEqual([]);
    expect(validateManifest({ ...good, age: [5, 3] }, 'x-gra')).not.toEqual([]);
    expect(validateManifest({ ...good, icon: 'kot.png' }, 'x-gra')).not.toEqual([]);
    expect(validateManifest({ ...good, levels: 2.5 }, 'x-gra')).not.toEqual([]);
    expect(validateManifest({ ...good, skins: [{ id: 'a', title: 'A' }, { id: 'a', title: 'B' }] }, 'x-gra')).not.toEqual([]);
    expect(validateManifest({ ...good, hardLevels: { keyboard: [4] } }, 'x-gra')).not.toEqual([]);
    expect(validateManifest({ ...good, id: 'rodzice' }, 'rodzice')).not.toEqual([]);
    expect(validateManifest({ ...good, id: 'licencje' }, 'licencje')).not.toEqual([]);
    expect(validateManifest(undefined, 'x-gra')).not.toEqual([]);
  });
});

describe('loadManifestModules', () => {
  it('manifest, którego nie da się załadować, jest pomijany z komunikatem, reszta zostaje', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const ok = { manifest: { id: 'dobra' } as GameManifest };
    const loaded = await loadManifestModules({
      '../games/dobra/manifest.ts': () => Promise.resolve(ok),
      '../games/zepsuta/manifest.ts': () => Promise.reject(new Error('Failed to resolve import "./brak"')),
    });
    expect(loaded).toEqual({ '../games/dobra/manifest.ts': ok });
    expect(error).toHaveBeenCalledOnce();
    expect(String(error.mock.calls[0]?.[0])).toContain('"zepsuta"');
    error.mockRestore();
  });
});
