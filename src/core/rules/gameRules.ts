/**
 * Reguły kodu gier (docs/ARCHITEKTURA.md, „Zasady dla kodu gier”; docs/ZASADY-DESIGNU.md) jako czyste funkcje.
 * Używa ich test globalny gameRules.test.ts, który skanuje src/games/**.
 *
 * To linter typowych pomyłek, nie bariera bezpieczeństwa: wyrażenia regularne po usunięciu komentarzy
 * (i, zależnie od reguły, zawartości napisów). Każde naruszenie ma mówić, co zrobić zamiast.
 */

export interface Violation {
  file: string;
  line: number;
  message: string;
}

/** Widok kodu: `bare` — bez komentarzy i bez zawartości napisów; `keep` — bez komentarzy, napisy zostają; `decl` (CSS) — jak bare, bez selektorów i url(…). */
type View = 'bare' | 'keep' | 'decl';

interface Rule {
  pattern: RegExp;
  message: string;
  view?: View;
}

/** Moduły rdzenia, które gra może importować (poza testami). Resztę daje ctx. */
export const ALLOWED_CORE_IMPORTS = ['core/types', 'core/round', 'core/art', 'core/util/dom', 'core/util/letters', 'core/util/rng'];

/** Moduły rdzenia dozwolone w logice (logic.ts, logic/**) — bez DOM. */
export const LOGIC_CORE_IMPORTS = ['core/types', 'core/util/letters', 'core/util/rng'];

const CODE_FILE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
const TEST_FILE = /\.(test|spec)\.[a-z]+$/;
const LOGIC_FILE = /(^|\/)logic(\.[a-z]+$|\/)/;

/** Czy plik z folderu gry jest skanowany (kod i CSS; testy są pomijane). */
export function isGameSourceFile(relPath: string): boolean {
  return (CODE_FILE.test(relPath) && !TEST_FILE.test(relPath)) || relPath.endsWith('.css');
}

/** Reguły dla kodu gier (.ts/.js/.mjs poza testami). */
const CODE_RULES: Rule[] = [
  {
    pattern: /\b(setTimeout|setInterval|requestAnimationFrame|requestIdleCallback|clearTimeout|clearInterval|cancelAnimationFrame)\b/,
    message: 'zamiast timerów i requestAnimationFrame użyj ctx.clock (after / every / frame) — rdzeń sprząta, pauzuje i skaluje tempo',
  },
  {
    pattern: /\.\s*addEventListener\s*\(\s*['"`]key|\.\s*onkey\w+\s*=(?!=)/,
    message: 'nie nasłuchuj klawiatury — użyj ctx.input.on(intent => …)',
    view: 'keep',
  },
  {
    pattern:
      /\b(window|document)(\s*\.\s*(body|documentElement))?\s*\.\s*(addEventListener\s*\(\s*['"`](pointer|mouse|touch|click|dblclick|wheel|contextmenu)|on(pointer|mouse|touch|click|dblclick|wheel|contextmenu)\w*\s*=(?!=))/,
    message: 'nie nasłuchuj wskaźnika na window/document — użyj ctx.input (data-target) albo zdarzeń na własnych elementach sceny',
    view: 'keep',
  },
  {
    pattern: /\b(localStorage|sessionStorage|indexedDB|openDatabase|cookieStore)\b|\bdocument\s*\.\s*cookie\b/,
    message: 'zamiast localStorage/sessionStorage/cookies użyj ctx.storage',
  },
  {
    pattern: /\b(AudioContext|webkitAudioContext|OfflineAudioContext|HTMLAudioElement)\b|\bnew\s+Audio\s*\(|createElement\s*\(\s*['"`](audio|video)\b/,
    message: 'zamiast własnego dźwięku użyj ctx.audio',
    view: 'keep',
  },
  {
    pattern: /\b(speechSynthesis|SpeechSynthesisUtterance|SpeechRecognition|webkitSpeechRecognition)\b/,
    message: 'gry nie używają syntezatora ani rozpoznawania mowy',
  },
  {
    pattern:
      /\bfontFamily\b|font-family|\.style\s*\.\s*font\b|setProperty\s*\(\s*['"`]font|\bFontFace\b|\bdocument\s*\.\s*fonts\b|['"`][^'"`\n]*\b(Playwrite|Andika|MG Pisane)\b/,
    message: 'gra nie ustawia kroju pisma — litery tylko przez ctx.ui.letter(...) (Z-35)',
    view: 'keep',
  },
  {
    pattern: /\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bEventSource\b|\bnavigator\s*\.\s*sendBeacon\b/,
    message: 'zero zapytań sieciowych w grze (Z-26)',
  },
  {
    pattern:
      /https?:\/\/(?!www\.w3\.org\/)|\bwindow\s*\.\s*open\s*\(|\b(window|document|globalThis|self)\s*\.\s*location\b|\blocation\s*\.\s*(href|assign|replace|reload)\b|\bhistory\s*\.\s*(pushState|replaceState)\b/,
    message: 'zero linków zewnętrznych, zasobów z sieci i własnej nawigacji (Z-26) — nawigacją zajmuje się rdzeń',
    view: 'keep',
  },
  {
    pattern: /\bDate\s*\.\s*now\b|\bperformance\s*\.\s*now\b|(^|[^.\w])Date\s*\(\s*\)/,
    message: 'czas tylko przez ctx.clock (dla czasu gry) — bez Date.now / performance.now / new Date()',
  },
  {
    pattern: /\bMath\s*\.\s*random\b|\bcrypto\s*\.\s*(getRandomValues|randomUUID)\b/,
    message: 'zamiast Math.random użyj ctx.rng (w logic.ts: przyjmij Rng jako parametr)',
  },
];

/** Dodatkowe reguły dla logiki (logic.ts, logic/**) — ma być czysta, bez DOM. */
const LOGIC_RULES: Rule[] = [
  {
    pattern: /\b(document|window|navigator)\s*\.|\bglobalThis\b|\bHTML\w*Element\b|\bSVG\w*Element\b/,
    message: 'logika nie może używać DOM (document/window/elementy) — przenieś to do game.ts',
  },
];

/** Nazwane kolory CSS (poza transparent i currentColor, które są dozwolone). */
const NAMED_COLORS = (
  'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue ' +
  'chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey ' +
  'darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray ' +
  'darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen ' +
  'fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender ' +
  'lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey ' +
  'lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen ' +
  'magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen ' +
  'mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange ' +
  'orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple ' +
  'rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue ' +
  'slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen'
).replace(/ /g, '|');

/** Reguły dla style.css gier (selektory i nazwy @keyframes sprawdza checkCssSelectors). */
const CSS_RULES: Rule[] = [
  {
    pattern: /#[0-9a-fA-F]{3,8}\b/,
    message: 'kolory tylko z tokenów: var(--mg-…), bez własnych hexów',
    view: 'decl',
  },
  {
    pattern: /(?<![\w-])(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|device-cmyk)\s*\(/,
    message: 'kolory tylko z tokenów: var(--mg-…), bez rgb()/hsl()/color() (dozwolone też currentColor i transparent)',
    view: 'decl',
  },
  {
    pattern: new RegExp(`(?<![\\w#.-])(${NAMED_COLORS})(?![\\w(-])`),
    message: 'kolory tylko z tokenów: var(--mg-…), bez nazw kolorów (red, white…); dozwolone currentColor i transparent',
    view: 'decl',
  },
  {
    pattern: /(?<![\w.-])(\d+\.?\d*|\.\d+)m?s(?![\w-])/,
    message: 'czasy animacji i przejść tylko z tokenów: var(--mg-dur-fast | base | slow) (Z-03), bez wpisanych liczb',
    view: 'decl',
  },
  {
    pattern: /border(-[a-z]+)*-radius\s*:[^;{}]*?(?<![\w.-])(\d+\.?\d*|\.\d+)(px|rem|em)\b/,
    message: 'promienie tylko z tokenów: var(--mg-radius-s | radius | radius-l | radius-round) albo procenty',
    view: 'decl',
  },
  {
    pattern: /(?<![\w-])font(-family)?\s*:/,
    message: 'gra nie ustawia kroju pisma (font / font-family) — litery tylko przez ctx.ui.letter (Z-35)',
    view: 'decl',
  },
  {
    pattern: /@font-face|@import/,
    message: 'bez własnych fontów i @import w CSS gry — CSS gry importuje tylko game.ts',
  },
  {
    pattern: /url\(\s*['"]?\s*(https?:)?\/\/|https?:\/\/(?!www\.w3\.org\/)/,
    message: 'zero zasobów z sieci w CSS gry (Z-26)',
    view: 'keep',
  },
];

/**
 * Usuwa komentarze (zachowując numerację linii i długość tekstu). `keepStrings: false` dodatkowo
 * zamienia zawartość napisów na spacje; w literałach szablonowych wyrażenia `${…}` zostają jako kod.
 * `ts: false` = CSS (bez komentarzy `//`, bez backticków).
 */
function mask(source: string, ts: boolean, keepStrings: boolean): string {
  const out = source.split('');
  const n = source.length;
  const blank = (from: number, to: number) => {
    for (let k = from; k < to; k++) if (out[k] !== '\n') out[k] = ' ';
  };
  const quoted = (start: number, quote: string): number => {
    let j = start + 1;
    while (j < n && source[j] !== quote && source[j] !== '\n') j += source[j] === '\\' ? 2 : 1;
    j = Math.min(j, n);
    if (!keepStrings) blank(start + 1, j);
    return source[j] === quote ? j + 1 : j;
  };
  const template = (start: number): number => {
    let j = start + 1;
    while (j < n && source[j] !== '`') {
      if (source[j] === '\\') {
        if (!keepStrings) blank(j, Math.min(j + 2, n));
        j += 2;
      } else if (source[j] === '$' && source[j + 1] === '{') {
        j = code(j + 2, true) + 1;
      } else {
        if (!keepStrings) blank(j, j + 1);
        j++;
      }
    }
    return j + 1;
  };
  /** Skanuje kod od `start`; w trybie `nested` kończy na pasującym `}` i zwraca jego indeks. */
  const code = (start: number, nested: boolean): number => {
    let i = start;
    let depth = 0;
    while (i < n) {
      const c = source[i];
      const d = source[i + 1];
      if (c === '/' && d === '*') {
        const close = source.indexOf('*/', i + 2);
        const end = close < 0 ? n : close + 2;
        blank(i, end);
        i = end;
      } else if (ts && c === '/' && d === '/') {
        const nl = source.indexOf('\n', i);
        const end = nl < 0 ? n : nl;
        blank(i, end);
        i = end;
      } else if (c === '"' || c === "'") {
        i = quoted(i, c);
      } else if (ts && c === '`') {
        i = template(i);
      } else if (nested && c === '{') {
        depth++;
        i++;
      } else if (nested && c === '}') {
        if (depth === 0) return i;
        depth--;
        i++;
      } else {
        i++;
      }
    }
    return n;
  };
  code(0, false);
  return out.join('');
}

/** Usuwa komentarze, zachowując numerację linii. */
export function stripComments(source: string, css = false): string {
  return mask(source, !css, true);
}

const lineOf = (text: string, index: number): number => text.slice(0, index).split('\n').length;

function applyRules(file: string, views: Partial<Record<View, string>>, rules: Rule[]): Violation[] {
  const violations: Violation[] = [];
  const seen = new Set<string>();
  for (const rule of rules) {
    const text = views[rule.view ?? 'bare'] ?? '';
    for (const match of text.matchAll(new RegExp(rule.pattern, `g${rule.pattern.flags}`))) {
      const line = lineOf(text, match.index);
      const key = `${line}|${rule.message}`;
      if (seen.has(key)) continue;
      seen.add(key);
      violations.push({ file, line, message: rule.message });
    }
  }
  return violations;
}

/** Ścieżka względna `spec` z pliku w katalogu `dir` (względem src/games) jako segmenty; wyjście ponad src/games daje '..'. */
function resolveRelative(dir: string, spec: string): string[] {
  const parts = dir.split('/').filter(Boolean);
  for (const seg of spec.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg !== '..') parts.push(seg);
    else if (parts.length > 0 && parts[parts.length - 1] !== '..') parts.pop();
    else parts.push('..');
  }
  return parts;
}

/** Importy: tylko własny folder gry i dozwolone moduły rdzenia (w logice jeszcze węższa lista). */
function checkImports(file: string, keep: string, gameId: string, isLogic: boolean): Violation[] {
  const violations: Violation[] = [];
  const dir = file.split('/').slice(0, -1).join('/');
  const specifier = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)(['"`])([^'"`\n]*)\1/g;
  for (const match of keep.matchAll(specifier)) {
    const spec = match[2] ?? '';
    const line = lineOf(keep, match.index);
    const add = (message: string) => violations.push({ file, line, message });

    if (/^(https?:)?\/\//.test(spec)) {
      add(`import z sieci (${spec}) — zero zasobów z sieci w grze (Z-26)`);
    } else if (!spec.startsWith('.')) {
      add(`import "${spec}" — gra importuje tylko pliki własnego folderu i dozwolone moduły rdzenia (ścieżki względne)`);
    } else {
      const parts = resolveRelative(dir, spec);
      if (parts[0] === '..' && parts[1] === 'core') {
        const corePath = parts
          .slice(1)
          .join('/')
          .replace(/\.(ts|js|mjs)$/, '')
          .replace(/\/index$/, '');
        const allowed = isLogic ? LOGIC_CORE_IMPORTS : ALLOWED_CORE_IMPORTS;
        if (!allowed.includes(corePath)) {
          add(
            isLogic
              ? `niedozwolony import z rdzenia w logice: ${corePath} (dozwolone: ${allowed.join(', ')}; DOM i resztę rdzenia daje game.ts przez ctx)`
              : `niedozwolony import z rdzenia: ${corePath} (dozwolone: ${allowed.join(', ')}; resztę daje ctx)`,
          );
        }
      } else if (parts[0] === '..') {
        add(`import "${spec}" wychodzi poza folder gry i src/core — gra importuje tylko własny folder i dozwolone moduły rdzenia`);
      } else if (parts[0] !== gameId) {
        add(`gra nie może importować z innych gier (${spec}) — wspólny kod idzie do src/core albo zostaje w grze`);
      } else if (isLogic && /^game(\.[a-z]+)?$/.test(parts[parts.length - 1] ?? '')) {
        add('logika nie może importować game.ts (widoku z DOM) — zależność ma iść w drugą stronę');
      }
    }
  }
  return violations;
}

/** Dzieli listę selektorów po przecinkach spoza nawiasów; zwraca tekst i przesunięcie w `list`. */
function splitSelectors(list: string): { text: string; offset: number }[] {
  const parts: { text: string; offset: number }[] = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i <= list.length; i++) {
    const c = list[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    if ((c === ',' && depth === 0) || i === list.length) {
      const raw = list.slice(from, i);
      parts.push({ text: raw.trim(), offset: from + raw.length - raw.trimStart().length });
      from = i + 1;
    }
  }
  return parts.filter((p) => p.text !== '');
}

const KEYFRAME_STEP = /^(from|to|\d+(\.\d+)?%)(\s*,\s*(from|to|\d+(\.\d+)?%))*$/i;

/**
 * Selektory CSS gry: każdy zaczyna się od .g-<id> (albo `&` w zagnieżdżeniu), a klasy w nim to .g-<id>… lub rdzeniowe .mg-….
 * Zwraca też widok `decl` (CSS bez selektorów i url(…)) dla reguł deklaracji.
 */
function checkCssSelectors(file: string, bare: string, gameId: string): { violations: Violation[]; decl: string } {
  const violations: Violation[] = [];
  const decl = bare.split('');
  const own = new RegExp(`^g-${gameId}(?![A-Za-z0-9_])`);
  const startsOwn = new RegExp(`^(&|\\.g-${gameId}(?![A-Za-z0-9_]))`);

  for (const match of bare.matchAll(/(?<=^|[;{}])([^;{}@]*)\{/g)) {
    const prelude = match[1] ?? '';
    const start = match.index;
    for (let k = start; k < start + prelude.length; k++) if (decl[k] !== '\n') decl[k] = ' ';
    if (KEYFRAME_STEP.test(prelude.trim())) continue;

    for (const { text, offset } of splitSelectors(prelude)) {
      const line = lineOf(bare, start + offset);
      if (!startsOwn.test(text)) {
        violations.push({
          file,
          line,
          message: `selektor „${text}” musi zaczynać się od .g-${gameId} — style gry nie mogą dotykać :root, html, body, * ani samodzielnych klas rdzenia (.mg-…); napisz np. .g-${gameId} ${text}`,
        });
        continue;
      }
      for (const cls of text.matchAll(/(?<![\w-])\.(-?[_a-zA-Z][\w-]*)/g)) {
        const name = cls[1] ?? '';
        if (!own.test(name) && !/^mg-[\w-]+$/.test(name)) {
          violations.push({ file, line, message: `klasa .${name} musi mieć prefiks .g-${gameId}-` });
        }
      }
    }
  }

  for (const match of bare.matchAll(/@(?:-\w+-)?keyframes\s+([^\s{]+)/g)) {
    if (!new RegExp(`^g-${gameId}-[\\w-]+$`).test(match[1] ?? '')) {
      violations.push({ file, line: lineOf(bare, match.index), message: `nazwa @keyframes „${match[1]}” musi zaczynać się od g-${gameId}-` });
    }
  }
  return { violations, decl: decl.join('').replace(/\burl\([^)]*\)/g, (m) => m.replace(/[^\n]/g, ' ')) };
}

/**
 * Sprawdza jeden plik gry. `relPath` = ścieżka względem src/games, np. 'literki/game.ts'.
 * Skanuje .ts/.js/.mjs (i warianty) oraz .css; testy (*.test.*) i inne typy plików są pomijane.
 */
export function checkGameFile(relPath: string, source: string): Violation[] {
  const file = relPath.replace(/\\/g, '/');
  const gameId = file.split('/')[0] ?? '';
  if (!isGameSourceFile(file)) return [];

  if (file.endsWith('.css')) {
    const bare = mask(source, false, false);
    const { violations, decl } = checkCssSelectors(file, bare, gameId);
    const rules = applyRules(file, { bare, decl, keep: mask(source, false, true) }, CSS_RULES);
    return [...violations, ...rules].sort((a, b) => a.line - b.line);
  }

  const views = { bare: mask(source, true, false), keep: mask(source, true, true) };
  const isLogic = LOGIC_FILE.test(file.slice(gameId.length + 1));
  const violations = [
    ...applyRules(file, views, isLogic ? [...CODE_RULES, ...LOGIC_RULES] : CODE_RULES),
    ...checkImports(file, views.keep, gameId, isLogic),
  ];
  return violations.sort((a, b) => a.line - b.line);
}
