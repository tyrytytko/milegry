/**
 * Szybki sygnał dla jednej gry (bez budowania całego projektu):
 *
 *   npm run sprawdz-gre -- <id>
 *
 * 1. typy — `tsc --noEmit` dla całego projektu (kompilator nie liczy błędów per gra),
 * 2. testy gry — vitest dla src/games/<id>/,
 * 3. skaner reguł i manifest — istniejące testy globalne (gameRules.test.ts, registry.test.ts) z filtrem na tę grę.
 *
 * Każdy krok działa niezależnie, na końcu jest podsumowanie. Kod wyjścia 1, gdy którykolwiek krok zawiódł.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TSC = join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
const VITEST = join(ROOT, 'node_modules', 'vitest', 'vitest.mjs');

/** Znacznik miejsc w szablonie, które autor gry ma jeszcze podmienić. */
const TODO_MARK = 'PODMIEŃ';

/** Kroki sprawdzenia dla gry `id`. Filtry -t dopasowują nazwy testów z gameRules.test.ts i registry.test.ts. */
export function buildSteps(id) {
  const only = `( ${id}/)|(gra ${id} )`;
  return [
    { name: 'Typy (tsc, cały projekt)', args: [TSC, '--noEmit'] },
    { name: `Testy gry (src/games/${id}/)`, args: [VITEST, 'run', `src/games/${id}/`] },
    {
      name: 'Skaner reguł kodu i walidacja manifestu',
      args: [VITEST, 'run', 'src/core/rules/gameRules.test.ts', 'src/core/registry.test.ts', '-t', only],
    },
  ];
}

/** Ile miejsc oznaczonych PODMIEŃ zostało w plikach gry. */
export function countTodoMarks(gameDir) {
  const walk = (dir) =>
    readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      return statSync(full).isDirectory() ? walk(full) : [full];
    });
  return walk(gameDir).reduce((sum, file) => sum + (readFileSync(file, 'utf8').split(TODO_MARK).length - 1), 0);
}

function main(args) {
  const [id] = args;
  if (args.length !== 1 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
    console.error('Użycie:  npm run sprawdz-gre -- <id>\nPrzykład:  npm run sprawdz-gre -- literki');
    return 1;
  }
  const gameDir = join(ROOT, 'src', 'games', id);
  if (!existsSync(gameDir)) {
    console.error(`Nie ma gry "${id}": brak folderu src/games/${id}. Utwórz ją:  npm run nowa-gra -- ${id} "Tytuł"`);
    return 1;
  }

  const results = [];
  for (const step of buildSteps(id)) {
    console.log(`\n=== ${step.name} ===`);
    const run = spawnSync(process.execPath, step.args, { cwd: ROOT, stdio: 'inherit' });
    results.push({ name: step.name, ok: run.status === 0 });
  }

  console.log(`\n=== Podsumowanie: ${id} ===`);
  for (const { name, ok } of results) console.log(`  ${ok ? 'OK    ' : 'BŁĄD  '} ${name}`);
  const todo = countTodoMarks(gameDir);
  if (todo > 0) console.log(`\nUwaga: w src/games/${id}/ zostało ${todo} miejsc oznaczonych ${TODO_MARK} (szukaj tekstu ${TODO_MARK} w tym folderze).`);
  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.log('\nTypecheck obejmuje cały projekt, więc błąd w cudzym pliku też go zatrzyma — sprawdź ścieżki w komunikatach.');
    return 1;
  }
  console.log('\nWszystko zielone. Pełny komplet przed commitem:  npm run check');
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv.slice(2));
}
