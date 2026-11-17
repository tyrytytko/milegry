/**
 * Po `vite build`: przygotowuje dist/ do wgrania na zwykły hosting (Apache, bez reguł przepisywania).
 *
 * - dist/<id>/index.html dla każdej gry i dist/rodzice/index.html — prawdziwe pliki z własnym
 *   <title> i <meta name="description">, więc adresy /<id>/ działają po wejściu wprost,
 * - dist/404.html (aplikacja przekieruje nieznany adres do huba),
 * - dist/.htaccess (brak cache dla HTML, typy MIME, kompresja, strona 404),
 * - dist/assets/.htaccess (pliki z hashem w nazwie: cache na rok, immutable),
 * - dist/licencje/ (teksty licencji OFL krojów pisma).
 *
 * Adres bazowy z MILEGRY_BASE (jak w vite.config.ts), np. MILEGRY_BASE=/gry/.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runnerImport } from 'vite';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

const escapeHtml = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Podmienia <title> i <meta name="description"> w szablonie; brak któregoś znacznika to błąd budowania. */
export function withMeta(html, title, description) {
  const titleTag = /<title>[\s\S]*?<\/title>/;
  const descriptionTag = /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/;
  if (!titleTag.test(html)) throw new Error('postbuild: w index.html brak <title>');
  if (!descriptionTag.test(html)) {
    throw new Error('postbuild: w index.html brak <meta name="description" content="…" /> w oczekiwanej postaci');
  }
  return html
    .replace(titleTag, `<title>${escapeHtml(title)}</title>`)
    .replace(descriptionTag, `<meta name="description" content="${escapeHtml(description)}" />`);
}

/** Katalogi tworzone przez build muszą być na liście zarezerwowanych id gier (src/core/registry.ts). */
export function assertReserved(reservedIds, buildDirs) {
  const missing = buildDirs.filter((dir) => !reservedIds.includes(dir));
  if (missing.length > 0) {
    throw new Error(`postbuild: RESERVED_IDS w src/core/registry.ts musi zawierać katalogi budowania: ${missing.join(', ')}`);
  }
}

/**
 * Content-Security-Policy: strona pobiera wszystko tylko z własnego adresu (Z-26, zero zapytań sieciowych).
 * Poluzowania (sprawdzone w kodzie i w dist/):
 * - style-src-attr 'unsafe-inline' — rysunki SVG wstawiane przez innerHTML mają atrybuty style="fill:var(--mg-…)"
 *   (src/core/art, sprites/shapes gier, po-jednym/apple.ts). Zmiany przez el.style.* (CSSOM) CSP nie blokuje.
 * - style-src 'self' 'unsafe-inline' — zapas dla przeglądarek bez style-src-attr/-elem (np. Safari < 15.4):
 *   bez niego nie widziałyby rysunków. Nowsze przeglądarki biorą style-src-elem 'self' (żadnych <style>).
 * Bez data:/blob: — w dist/ nie ma obrazków ani krojów w data:, a dźwięk powstaje w Web Audio.
 */
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "style-src-elem 'self'",
  "style-src-attr 'unsafe-inline'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

/** Treść dist/.htaccess dla adresu bazowego `base` (np. "/" albo "/gry/"). */
export function htaccess(base) {
  return `# Miłe Gry — wygenerowane przez scripts/postbuild.mjs
ErrorDocument 404 ${base}404.html

AddType font/woff2 .woff2
AddType image/svg+xml .svg
AddType text/plain .txt
AddDefaultCharset utf-8
AddCharset utf-8 .html .js .css .txt

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/plain application/javascript text/javascript image/svg+xml
</IfModule>

# HTML zawsze świeży (wskazuje na aktualne pliki z hashem).
# CSP: wszystko tylko z własnego adresu (zero zapytań sieciowych, Z-26).
<IfModule mod_headers.c>
  <FilesMatch "\\.(html|htm)$">
    Header set Cache-Control "no-cache, must-revalidate"
  </FilesMatch>
  Header set X-Content-Type-Options "nosniff"
  Header set Referrer-Policy "no-referrer"
  Header set Content-Security-Policy "${CSP}"
</IfModule>
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/html "access plus 0 seconds"
</IfModule>
`;
}

function writePage(relDir, html) {
  const dir = join(DIST, relDir);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
}

async function main() {
  const indexPath = join(DIST, 'index.html');
  if (!existsSync(indexPath)) throw new Error('Brak dist/index.html — najpierw uruchom vite build.');
  const template = readFileSync(indexPath, 'utf8');
  const appTitle = /<title>([\s\S]*?)<\/title>/.exec(template)?.[1];
  if (!appTitle) throw new Error('postbuild: w index.html brak <title>');

  // Router i rejestr gier ładujemy przez Vite (TypeScript + import.meta.glob) — to samo źródło, co aplikacja.
  const load = async (file) =>
    (await runnerImport(join(ROOT, file), { configFile: join(ROOT, 'vite.config.ts'), logLevel: 'error' })).module;
  const { normalizeBase, PARENTS_SEGMENT } = await load('src/core/router.ts');
  const { games, RESERVED_IDS } = await load('src/core/registry.ts');
  const base = normalizeBase(process.env.MILEGRY_BASE ?? '/');
  assertReserved(RESERVED_IDS, [PARENTS_SEGMENT, 'assets', 'licencje']);

  for (const game of games) {
    if (RESERVED_IDS.includes(game.id)) throw new Error(`postbuild: id gry "${game.id}" jest zarezerwowane`);
    writePage(game.id, withMeta(template, `${game.title} — ${appTitle}`, game.description));
  }
  writePage(PARENTS_SEGMENT, withMeta(template, `Dla rodziców — ${appTitle}`, 'Ustawienia Miłych Gier dla rodziców.'));
  writeFileSync(join(DIST, '404.html'), template);

  // --- .htaccess ---
  writeFileSync(join(DIST, '.htaccess'), htaccess(base));
  writeFileSync(
    join(DIST, 'assets', '.htaccess'),
    `# Pliki z hashem w nazwie — niezmienne, cache na rok.
<IfModule mod_headers.c>
  Header set Cache-Control "public, max-age=31536000, immutable"
</IfModule>
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresDefault "access plus 1 year"
</IfModule>
`,
  );

  // --- Licencje krojów (OFL wymaga dołączenia noty i tekstu licencji) ---
  const licDir = join(DIST, 'licencje');
  mkdirSync(licDir, { recursive: true });
  const fonts = [
    {
      pkg: '@fontsource/andika',
      file: 'andika-OFL.txt',
      name: 'Andika — SIL International',
      copyright: 'Andika: Copyright (c) 2004-2022 SIL International (https://software.sil.org/andika/).',
    },
    {
      pkg: '@fontsource/playwrite-pl',
      file: 'playwrite-pl-OFL.txt',
      name: 'Playwrite PL — The Playwrite Project Authors (TypeTogether)',
      copyright: 'Playwrite PL: Copyright 2023 The Playwrite Project Authors (https://github.com/TypeTogether/Playwrite).',
    },
  ];
  for (const font of fonts) {
    const license = readFileSync(join(ROOT, 'node_modules', font.pkg, 'LICENSE'), 'utf8');
    writeFileSync(join(licDir, font.file), `${font.copyright}

${license}`);
  }
  writeFileSync(
    join(licDir, 'README.txt'),
    `Kroje pisma używane w Miłych Grach (pliki WOFF2 z paczek Fontsource, podzbiory latin i latin-ext):\n\n${fonts
      .map((f) => `- ${f.name}: SIL Open Font License 1.1, tekst licencji: ${f.file}`)
      .join('\n')}\n`,
  );

  console.log(`postbuild: ${games.length} gier (${games.map((g) => g.id).join(', ')}), base ${base}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error('postbuild: błąd', error);
    process.exit(1);
  });
}
