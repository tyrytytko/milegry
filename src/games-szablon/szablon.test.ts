/**
 * Test szablonu gry (src/games-szablon/wzor): szablon nie jest w hubie ani w buildzie, ale musi spełniać te same
 * wymagania co gra z src/games — komplet plików, poprawny manifest, skaner reguł kodu. Dzięki temu „dodaj grę”
 * zawsze zaczyna się od poprawnego punktu startu. Gdy ten test nie przechodzi, popraw szablon.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { games, rawGameModulePaths, validateManifest } from '../core/registry';
import { checkGameFile, isGameSourceFile } from '../core/rules/gameRules';
import { manifest } from './wzor/manifest';

const TEMPLATE_ID = 'wzor';
const SZABLON_DIR = fileURLToPath(new URL('.', import.meta.url));
const TEMPLATE_DIR = join(SZABLON_DIR, TEMPLATE_ID);

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

const files = listFiles(TEMPLATE_DIR).map((f) => relative(TEMPLATE_DIR, f).replace(/\\/g, '/'));

describe('szablon gry (src/games-szablon/wzor)', () => {
  it('ma wymagane pliki: manifest.ts, game.ts, logic.ts, logic.test.ts, style.css, README.md', () => {
    for (const file of ['manifest.ts', 'game.ts', 'logic.ts', 'logic.test.ts', 'style.css', 'README.md']) {
      expect(existsSync(join(TEMPLATE_DIR, file)), `${TEMPLATE_ID}/${file}`).toBe(true);
    }
  });

  it('ma poprawny manifest (id = nazwa folderu)', () => {
    expect(validateManifest(manifest, TEMPLATE_ID)).toEqual([]);
  });

  it('game.ts eksportuje moduł gry z mount()', async () => {
    const game = (await import('./wzor/game')).default;
    expect(typeof game.mount).toBe('function');
  });

  it('nie jest widoczny w hubie ani w rejestrze (tylko src/games/*/ jest odkrywane)', () => {
    expect(games.some((g) => g.id === TEMPLATE_ID)).toBe(false);
    expect(rawGameModulePaths.some((p) => p.includes('games-szablon'))).toBe(false);
  });

  it('nie zostawia TODO — miejsca do podmiany mają jednolity znacznik PODMIEŃ', () => {
    for (const file of files) {
      expect(readFileSync(join(TEMPLATE_DIR, file), 'utf8'), file).not.toMatch(/TODO|FIXME|XXX/);
    }
  });

  describe.each(files.filter(isGameSourceFile))('skaner reguł: %s', (file) => {
    it('nie łamie zakazów', () => {
      const violations = checkGameFile(`${TEMPLATE_ID}/${file}`, readFileSync(join(TEMPLATE_DIR, file), 'utf8'));
      expect(violations.map((v) => `${v.file}:${v.line} — ${v.message}`)).toEqual([]);
    });
  });
});
