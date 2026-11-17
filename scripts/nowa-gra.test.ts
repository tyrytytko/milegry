import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AREAS, RESERVED_IDS } from '../src/core/registry';
import { checkGameFile, isGameSourceFile } from '../src/core/rules/gameRules';
// @ts-expect-error — skrypt narzędziowy bez typów
import { TEMPLATE_DIR, createGame, nextSteps, renderFile, validateId, validateTitleAndArea } from './nowa-gra.mjs';
// @ts-expect-error — skrypt narzędziowy bez typów
import { buildSteps } from './sprawdz-gre.mjs';

const AREA_IDS = AREAS.map((a) => a.id);
const STANDALONE_TEMPLATE_ID = /(?<![A-Za-z0-9])wzor(?![A-Za-z0-9])/;

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

let gamesDir: string;
beforeEach(() => {
  gamesDir = mkdtempSync(join(tmpdir(), 'milegry-nowa-gra-'));
});
afterEach(() => {
  rmSync(gamesDir, { recursive: true, force: true });
});

describe('validateId', () => {
  it('akceptuje poprawne id', () => {
    for (const id of ['proba', 'labirynt-lisa', 'gra2', '3d']) expect(validateId(id, RESERVED_IDS, gamesDir)).toEqual([]);
  });

  it('odrzuca zły format, brak id i zbyt długie id', () => {
    for (const id of ['Proba', 'pro_ba', 'próba', 'a--b', '-a', 'a-', 'a b', 'a/b', '..', '']) {
      expect(validateId(id, RESERVED_IDS, gamesDir), id).not.toEqual([]);
    }
    expect(validateId(undefined, RESERVED_IDS, gamesDir)).not.toEqual([]);
    expect(validateId('a'.repeat(41), RESERVED_IDS, gamesDir)).not.toEqual([]);
  });

  it('odrzuca id zarezerwowane przez platformę (RESERVED_IDS z registry.ts)', () => {
    for (const id of RESERVED_IDS) expect(validateId(id, RESERVED_IDS, gamesDir).join(' '), id).toMatch(/zarezerwowane/);
  });

  it('odrzuca id, którego folder już istnieje', () => {
    mkdirSync(join(gamesDir, 'zajete'));
    expect(validateId('zajete', RESERVED_IDS, gamesDir).join(' ')).toMatch(/już istnieje/);
  });
});

describe('validateTitleAndArea', () => {
  it('akceptuje tytuł i znany obszar', () => {
    expect(validateTitleAndArea('Znajdź kolor', 'logika', AREA_IDS)).toEqual([]);
  });

  it('odrzuca pusty, za długi i niebezpieczny tytuł oraz nieznany obszar', () => {
    expect(validateTitleAndArea('  ', 'logika', AREA_IDS)).not.toEqual([]);
    expect(validateTitleAndArea(undefined, 'logika', AREA_IDS)).not.toEqual([]);
    expect(validateTitleAndArea('x'.repeat(41), 'logika', AREA_IDS)).not.toEqual([]);
    expect(validateTitleAndArea('a */ b', 'logika', AREA_IDS)).not.toEqual([]);
    expect(validateTitleAndArea('a\nb', 'logika', AREA_IDS)).not.toEqual([]);
    expect(validateTitleAndArea('Gra', 'muzyka', AREA_IDS)).not.toEqual([]);
  });
});

describe('renderFile', () => {
  const opts = { id: 'kot', title: 'Kot', area: 'logika' };

  it('podmienia samodzielne słowo wzor (klasy, zmienne, keyframes), ale nie słowa je zawierające', () => {
    const css = '.g-wzor-card { --g-wzor-size: 1; animation: g-wzor-in 1s; } .g-wzor[data-skin=a] {}';
    expect(renderFile('style.css', css, opts)).toBe('.g-kot-card { --g-kot-size: 1; animation: g-kot-in 1s; } .g-kot[data-skin=a] {}');
    expect(renderFile('README.md', 'wzorzec i wzoru, ale -- wzor', opts)).toBe('wzorzec i wzoru, ale -- kot');
  });

  it('ucieka apostrof i ukośnik w tytule tylko w plikach .ts i nie interpretuje wzorców $', () => {
    const tricky = { id: 'kot', title: "Kot i 'pies' \\ $&", area: 'logika' };
    expect(renderFile('manifest.ts', "title: 'Taki sam kształt'", tricky)).toBe("title: 'Kot i \\'pies\\' \\\\ $&'");
    expect(renderFile('README.md', '# Taki sam kształt', tricky)).toBe("# Kot i 'pies' \\ $&");
  });

  it('podmienia obszar tylko w manifest.ts', () => {
    expect(renderFile('manifest.ts', "area: 'ksztalty',", opts)).toBe("area: 'logika',");
    expect(renderFile('README.md', "area: 'ksztalty'", opts)).toBe("area: 'ksztalty'");
  });
});

describe('createGame (kopia szablonu do katalogu tymczasowego)', () => {
  const spec = { id: 'kolorowe-kule', title: "Kolory i 'kule'", area: 'logika' };

  it('tworzy komplet plików szablonu z podmienionym id, tytułem i obszarem', () => {
    const created = createGame(spec, { gamesDir });
    const templateFiles = listFiles(TEMPLATE_DIR).map((f) => relative(TEMPLATE_DIR, f).replace(/\\/g, '/'));
    expect(created).toEqual([...templateFiles].sort());
    for (const required of ['manifest.ts', 'game.ts', 'logic.ts', 'logic.test.ts', 'style.css', 'README.md']) {
      expect(created).toContain(required);
    }

    const read = (file: string) => readFileSync(join(gamesDir, spec.id, file), 'utf8');
    const manifest = read('manifest.ts');
    expect(manifest).toContain(`id: '${spec.id}'`);
    expect(manifest).toContain("title: 'Kolory i \\'kule\\''");
    expect(manifest).toContain("area: 'logika'");
    expect(read('game.ts')).toContain(`g-${spec.id}-scene`);
    expect(read('style.css')).toContain(`@keyframes g-${spec.id}-in`);
    expect(read('README.md')).toContain(`npm run sprawdz-gre -- ${spec.id}`);

    for (const file of created) {
      const text = read(file);
      expect(text, `${file}: została stara nazwa`).not.toMatch(STANDALONE_TEMPLATE_ID);
      expect(text, `${file}: został stary tytuł`).not.toContain('Taki sam kształt');
    }
  });

  it('wynik przechodzi skaner reguł kodu (selektory .g-<id>…, importy, zakazy)', () => {
    const created = createGame(spec, { gamesDir });
    for (const file of created.filter(isGameSourceFile)) {
      const violations = checkGameFile(`${spec.id}/${file}`, readFileSync(join(gamesDir, spec.id, file), 'utf8'));
      expect(violations.map((v: { line: number; message: string }) => `${file}:${v.line} — ${v.message}`)).toEqual([]);
    }
  });

  it('zostawia obszar z szablonu, gdy nie podano innego', () => {
    createGame({ ...spec, area: 'ksztalty' }, { gamesDir });
    expect(readFileSync(join(gamesDir, spec.id, 'manifest.ts'), 'utf8')).toContain("area: 'ksztalty'");
  });

  it('po utworzeniu id jest zajęte', () => {
    createGame(spec, { gamesDir });
    expect(validateId(spec.id, RESERVED_IDS, gamesDir).join(' ')).toMatch(/już istnieje/);
  });
});

describe('teksty pomocnicze', () => {
  it('nextSteps wymienia komendy podglądu i sprawdzenia dla id', () => {
    const text = nextSteps('kot', ['manifest.ts']);
    expect(text).toContain('npm run sprawdz-gre -- kot');
    expect(text).toContain('http://localhost:5173/kot/');
    expect(text).toContain('PODMIEŃ');
  });

  it('sprawdz-gre: kroki to typy, testy gry i filtr skanera/manifestu dla tej gry', () => {
    const steps = buildSteps('kot-2');
    expect(steps).toHaveLength(3);
    expect(steps[1].args).toContain('src/games/kot-2/');
    const filter = new RegExp(steps[2].args[steps[2].args.indexOf('-t') + 1]);
    expect(filter.test('kod gier przestrzega reguł kot-2/game.ts')).toBe(true);
    expect(filter.test('rejestr gier gra kot-2 manifest jest poprawny')).toBe(true);
    expect(filter.test('kod gier przestrzega reguł super-kot-2/game.ts')).toBe(false);
    expect(filter.test('rejestr gier gra kot-22 manifest jest poprawny')).toBe(false);
  });
});
