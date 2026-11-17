/**
 * Generator nowej gry: kopiuje szablon src/games-szablon/wzor/ do src/games/<id>/ i podmienia id, tytuł i obszar.
 *
 *   npm run nowa-gra -- <id> "<Tytuł>" [obszar]
 *   npm run nowa-gra -- kolory "Znajdź kolor" logika
 *
 * - id: małe litery a-z, cyfry, pojedyncze myślniki; nie może być zarezerwowane (RESERVED_IDS z src/core/registry.ts)
 *   ani zajęte (folder src/games/<id> nie może istnieć),
 * - obszar: litery | liczby | ksztalty | logika | pamiec (domyślnie ksztalty, jak w szablonie).
 *
 * Podmiana jest tekstowa: samodzielne słowo `wzor` (także w `.g-wzor-…`, `--g-wzor-…`, nazwach @keyframes) → id,
 * „Taki sam kształt” → tytuł, `area: 'ksztalty'` w manifest.ts → obszar. Bez zależności zewnętrznych.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const TEMPLATE_DIR = join(ROOT, 'src', 'games-szablon', 'wzor');
export const GAMES_DIR = join(ROOT, 'src', 'games');

/** Wartości z szablonu, które generator podmienia. */
export const TEMPLATE_ID = 'wzor';
export const TEMPLATE_TITLE = 'Taki sam kształt';
export const TEMPLATE_AREA = 'ksztalty';

/** Ta sama reguła, co w validateManifest (src/core/registry.ts). */
const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_ID_LENGTH = 40;
const MAX_TITLE_LENGTH = 40;
/** Samodzielne słowo: `g-wzor-card` i `'wzor'` pasują, `wzorzec` nie. */
const ID_WORD = new RegExp(`(?<![A-Za-z0-9])${TEMPLATE_ID}(?![A-Za-z0-9])`, 'g');

/** Zwraca listę problemów z id (pusta = OK). `gamesDir` pozwala testom użyć katalogu tymczasowego. */
export function validateId(id, reservedIds, gamesDir = GAMES_DIR) {
  if (typeof id !== 'string' || id === '') return ['Podaj id gry, np. kolory.'];
  const errors = [];
  if (!ID_PATTERN.test(id)) {
    errors.push(`Id "${id}" jest niepoprawne: tylko małe litery a-z (bez polskich znaków), cyfry i pojedyncze myślniki, np. "labirynt-lisa".`);
  }
  if (id.length > MAX_ID_LENGTH) errors.push(`Id jest za długie (maksymalnie ${MAX_ID_LENGTH} znaków).`);
  if (reservedIds.includes(id)) {
    errors.push(`Id "${id}" jest zarezerwowane przez platformę (zajęte: ${reservedIds.join(', ')}). Wybierz inne.`);
  }
  if (existsSync(join(gamesDir, id))) errors.push(`Folder src/games/${id} już istnieje — wybierz inne id albo usuń ten folder.`);
  return errors;
}

/** Zwraca listę problemów z tytułem i obszarem (pusta = OK). */
export function validateTitleAndArea(title, area, areaIds) {
  const errors = [];
  if (typeof title !== 'string' || title.trim() === '') errors.push('Podaj tytuł gry w cudzysłowie, np. "Znajdź kolor".');
  else if (title.trim().length > MAX_TITLE_LENGTH) errors.push(`Tytuł jest za długi (maksymalnie ${MAX_TITLE_LENGTH} znaków).`);
  else if (/[\u0000-\u001f]|\*\//.test(title)) errors.push('Tytuł nie może zawierać znaków sterujących ani ciągu "*/".');
  if (!areaIds.includes(area)) errors.push(`Nieznany obszar "${area}". Dozwolone: ${areaIds.join(', ')}.`);
  return errors;
}

/** Zawartość jednego pliku szablonu po podmianie. Pliki .ts dostają tytuł ucieczkowany do napisu w apostrofach. */
export function renderFile(fileName, content, { id, title, area }) {
  const text = fileName.endsWith('.ts') ? title.replace(/\\/g, '\\\\').replace(/'/g, "\\'") : title;
  let out = content.replace(ID_WORD, () => id).split(TEMPLATE_TITLE).join(text);
  if (fileName === 'manifest.ts') out = out.replace(`area: '${TEMPLATE_AREA}'`, () => `area: '${area}'`);
  return out;
}

function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

/**
 * Kopiuje szablon do `<gamesDir>/<id>/`. Nie sprawdza id (patrz validateId) — to robi wywołujący.
 * Zwraca ścieżki utworzonych plików względem folderu gry.
 */
export function createGame({ id, title, area }, { templateDir = TEMPLATE_DIR, gamesDir = GAMES_DIR } = {}) {
  const target = join(gamesDir, id);
  const created = [];
  for (const file of listFiles(templateDir)) {
    const rel = relative(templateDir, file);
    const out = join(target, rel);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, renderFile(rel.split(/[\\/]/).pop(), readFileSync(file, 'utf8'), { id, title: title.trim(), area }));
    created.push(rel.replace(/\\/g, '/'));
  }
  return created.sort();
}

/** Tekst „co dalej” po utworzeniu gry. */
export function nextSteps(id, files) {
  return [
    `Gotowe! Utworzono src/games/${id}/ (${files.length} plików: ${files.join(', ')}).`,
    '',
    'Co dalej:',
    `  1. Znajdź miejsca do podmiany: szukaj tekstu PODMIEŃ w folderze src/games/${id}/`,
    `     (w manifest.ts: opis dla rodzica, ikona kafelka, skórki, kolejność w hubie; w README.md: opis gry).`,
    `  2. Zasady i poziomy: src/games/${id}/logic.ts. Najpierw zmień test w logic.test.ts, potem kod.`,
    `  3. Wygląd sceny: game.ts (stała scena + treść jednego zadania) i style.css (tylko tokeny var(--mg-…)).`,
    '  4. Podgląd w przeglądarce:  npm run dev  →  http://localhost:5173/' + id + '/',
    '     Przejdź rundę strzałkami i Spacją, potem dotykiem (widok 375 × 812).',
    `  5. Szybkie sprawdzenie tej gry:  npm run sprawdz-gre -- ${id}`,
    '  6. Przed commitem (tylko za zgodą rodzica):  npm run check',
  ].join('\n');
}

async function loadRegistry() {
  const { runnerImport } = await import('vite');
  const { module } = await runnerImport(join(ROOT, 'src/core/registry.ts'), {
    configFile: join(ROOT, 'vite.config.ts'),
    logLevel: 'error',
  });
  return { reservedIds: module.RESERVED_IDS, areaIds: module.AREAS.map((a) => a.id) };
}

async function main(args) {
  const [id, title, area = TEMPLATE_AREA] = args;
  if (args.length < 2 || args.length > 3) {
    console.error('Użycie:  npm run nowa-gra -- <id> "<Tytuł>" [obszar]\nPrzykład:  npm run nowa-gra -- kolory "Znajdź kolor" logika');
    return 1;
  }
  let registry;
  try {
    registry = await loadRegistry();
  } catch (error) {
    console.error(`Nie udało się wczytać src/core/registry.ts (lista zarezerwowanych id):\n${error instanceof Error ? error.message : error}`);
    return 1;
  }
  const errors = [...validateId(id, registry.reservedIds), ...validateTitleAndArea(title, area, registry.areaIds)];
  if (errors.length > 0) {
    console.error(errors.map((e) => `Błąd: ${e}`).join('\n'));
    return 1;
  }
  const files = createGame({ id, title, area });
  console.log(nextSteps(id, files));
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
