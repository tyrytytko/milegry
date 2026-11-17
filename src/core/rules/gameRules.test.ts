/**
 * Test globalny reguł: skanuje wszystkie pliki w src/games/** pod kątem zakazanych API
 * (docs/ARCHITEKTURA.md, „Zasady dla kodu gier”) oraz testy samych reguł (każda: przypadek łapany i dozwolony).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { checkGameFile, isGameSourceFile, stripComments } from './gameRules';

const GAMES_DIR = fileURLToPath(new URL('../../games', import.meta.url));

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

describe('kod gier przestrzega reguł', () => {
  const files = listFiles(GAMES_DIR)
    .map((f) => relative(GAMES_DIR, f).replace(/\\/g, '/'))
    .filter(isGameSourceFile);

  it.each(files)('%s', (rel) => {
    const violations = checkGameFile(rel, readFileSync(join(GAMES_DIR, rel), 'utf8'));
    expect(violations.map((v) => `${v.file}:${v.line} — ${v.message}`)).toEqual([]);
  });
});

describe('checkGameFile — kod (.ts/.js/.mjs)', () => {
  const ts = (code: string, file = 'x/game.ts') => checkGameFile(file, code).length;

  it('łapie timery i requestAnimationFrame, przepuszcza ctx.clock', () => {
    expect(ts('setTimeout(() => {}, 10);')).toBe(1);
    expect(ts('window.setInterval(f, 10)')).toBe(1);
    expect(ts('requestAnimationFrame(loop)')).toBe(1);
    expect(ts('const t = setTimeout;')).toBe(1);
    expect(ts('cancelAnimationFrame(id)')).toBe(1);
    expect(ts('ctx.clock.after(10, f); ctx.clock.frame(g);')).toBe(0);
  });

  it('ignoruje komentarze i napisy', () => {
    expect(ts('// nie używaj setTimeout(\n/* setInterval( */ const a = 1;')).toBe(0);
    expect(ts("const msg = 'setTimeout jest zakazany'; const b = `Date.now ${1}`;")).toBe(0);
    expect(ts("const url = 'http://www.w3.org/2000/svg';")).toBe(0);
    expect(stripComments('a // b\nc').split('\n')).toHaveLength(2);
    expect(stripComments('a /* b\nc */ d').split('\n')).toHaveLength(2);
  });

  it('wyrażenia w szablonach są kodem', () => {
    expect(ts('const s = `czas ${Date.now()}`;')).toBe(1);
    expect(ts('const s = `a ${ {x: 1}.x } ${Math.random()}`;')).toBe(1);
  });

  it('łapie nasłuch klawiatury (także w następnej linii i przez onkey…)', () => {
    expect(ts("window.addEventListener('keydown', f)")).toBe(1);
    expect(ts("el.addEventListener('keyup', f)")).toBe(1);
    expect(ts("el.addEventListener(\n  'keydown',\n  f)")).toBe(1);
    expect(ts('el.onkeydown = f;')).toBe(1);
    expect(ts("el.addEventListener('focus', f)")).toBe(0);
    expect(ts('ctx.input.on((intent) => {});')).toBe(0);
  });

  it('łapie wskaźnik na window/document, przepuszcza własne elementy', () => {
    expect(ts("document.addEventListener('pointerdown', f)")).toBe(1);
    expect(ts("document.body.addEventListener('click', f)")).toBe(1);
    expect(ts("window.addEventListener(\n'touchstart', f)")).toBe(1);
    expect(ts('window.onpointermove = f;')).toBe(1);
    expect(ts("card.addEventListener('pointerdown', f)")).toBe(0);
    expect(ts("window.addEventListener('resize', f)")).toBe(0);
  });

  it('łapie localStorage, sessionStorage, cookies; przepuszcza ctx.storage', () => {
    expect(ts('localStorage.setItem("a", "b")')).toBe(1);
    expect(ts('sessionStorage.getItem("a")')).toBe(1);
    expect(ts('document.cookie = "a=b"')).toBe(1);
    expect(ts('ctx.storage.get("a")')).toBe(0);
  });

  it('łapie własny dźwięk, przepuszcza ctx.audio', () => {
    expect(ts('const a = new AudioContext()')).toBe(1);
    expect(ts("const a = new Audio('x.mp3')")).toBe(1);
    expect(ts("document.createElement('audio')")).toBe(1);
    expect(ts("ctx.audio.play('pop')")).toBe(0);
  });

  it('bez syntezatora mowy', () => {
    expect(ts('speechSynthesis.speak(u)')).toBe(1);
    expect(ts("new SpeechSynthesisUtterance('a')")).toBe(1);
    expect(ts('const speech = 1')).toBe(0);
  });

  it('bez własnego kroju pisma w TS, litery przez ctx.ui.letter', () => {
    expect(ts("el.style.fontFamily = 'Comic Sans'")).toBe(1);
    expect(ts("el.style.font = '20px serif'")).toBe(1);
    expect(ts("el.style.setProperty('font-family', 'x')")).toBe(1);
    expect(ts("const f = 'Playwrite PL'")).toBe(1);
    expect(ts('document.fonts.load("1em x")')).toBe(1);
    expect(ts("ctx.ui.letter('A')")).toBe(0);
    expect(ts("el.style.fontSize = '2rem'")).toBe(0);
  });

  it('bez sieci i linków zewnętrznych, przepuszcza xmlns SVG', () => {
    expect(ts("fetch('/x')")).toBe(1);
    expect(ts('const x = new XMLHttpRequest()')).toBe(1);
    expect(ts("new WebSocket('wss://x')")).toBe(1);
    expect(ts("a.href = 'https://example.com'")).toBe(1);
    expect(ts('window.open(u)')).toBe(1);
    expect(ts("window.location.href = '/x'")).toBe(1);
    expect(ts("history.pushState(null, '', '/x')")).toBe(1);
    expect(ts("svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')")).toBe(0);
    expect(ts('const prefetched = items.length')).toBe(0);
  });

  it('czas tylko przez ctx.clock', () => {
    expect(ts('const t = Date.now()')).toBe(1);
    expect(ts('const t = performance.now()')).toBe(1);
    expect(ts('const d = new Date()')).toBe(1);
    expect(ts('const d = new Date(0)')).toBe(0);
    expect(ts('const t = ctx.clock.now()')).toBe(0);
  });

  it('losowość tylko przez ctx.rng', () => {
    expect(ts('const r = Math.random()')).toBe(1);
    expect(ts('crypto.getRandomValues(a)')).toBe(1);
    expect(ts('const r = ctx.rng.next()')).toBe(0);
  });

  it('skanuje także .js i .mjs, pomija testy i inne typy plików', () => {
    expect(ts('setTimeout(f)', 'x/helper.js')).toBe(1);
    expect(ts('Math.random()', 'x/helper.mjs')).toBe(1);
    expect(ts('setTimeout(f)', 'x/logic.test.ts')).toBe(0);
    expect(ts('setTimeout(f)', 'x/helper.test.js')).toBe(0);
    expect(ts('setTimeout(f)', 'x/README.md')).toBe(0);
    expect(isGameSourceFile('x/a.mjs')).toBe(true);
    expect(isGameSourceFile('x/a.test.ts')).toBe(false);
    expect(isGameSourceFile('x/a.svg')).toBe(false);
  });
});

describe('checkGameFile — importy', () => {
  const ts = (code: string, file = 'x/game.ts') => checkGameFile(file, code).length;

  it('własny folder jest dozwolony, inna gra nie', () => {
    expect(ts("import { x } from './logic';")).toBe(0);
    expect(ts("import './style.css';")).toBe(0);
    expect(ts("import { x } from '../labirynt/logic';")).toBe(1);
    expect(ts("export * from '../labirynt/logic';")).toBe(1);
    expect(ts("const m = import('../labirynt/logic');")).toBe(1);
    expect(ts("import '../labirynt/style.css';")).toBe(1);
  });

  it('podfolder gry może sięgać do własnego folderu i do rdzenia', () => {
    expect(ts("import { x } from '../logic';", 'x/poziomy/a.ts')).toBe(0);
    expect(ts("import { h } from '../../../core/util/dom';", 'x/poziomy/a.ts')).toBe(0);
    expect(ts("import { x } from '../../y/logic';", 'x/poziomy/a.ts')).toBe(1);
    expect(ts("import { createClock } from './core/clock';", 'x/game.ts')).toBe(0);
    expect(ts("import { createClock } from '../../../core/clock';", 'x/poziomy/a.ts')).toBe(1);
  });

  it('z rdzenia tylko dozwolone moduły', () => {
    expect(ts("import { art } from '../../core/art';")).toBe(0);
    expect(ts("import { h } from '../../core/util/dom';")).toBe(0);
    expect(ts("import { createCoach } from '../../core/round';")).toBe(0);
    expect(ts("import type { GameModule } from '../../core/types';")).toBe(0);
    expect(ts("import { createClock } from '../../core/clock';")).toBe(1);
    expect(ts("import { startApp } from '../../core/shell/app';")).toBe(1);
    expect(ts("const m = import('../../core/clock');")).toBe(1);
    expect(ts("import '../../core/styles/base.css';")).toBe(1);
  });

  it('bez importów z sieci, pakietów i spoza src/core', () => {
    expect(ts("import x from 'https://cdn.example.com/x.js';")).toBeGreaterThan(0);
    expect(ts("import x from '//cdn.example.com/x.js';")).toBe(1);
    expect(ts("import _ from 'lodash';")).toBe(1);
    expect(ts("import { x } from '../../main';")).toBe(1);
    expect(ts("const fs = require('node:fs');")).toBe(1);
  });

  it('logika ma węższą listę rdzenia i nie importuje widoku', () => {
    expect(ts("import type { Rng } from '../../core/types';", 'x/logic.ts')).toBe(0);
    expect(ts("import { BASE_ALPHABET } from '../../core/util/letters';", 'x/logic.ts')).toBe(0);
    expect(ts("import { createRng } from '../../core/util/rng';", 'x/logic.ts')).toBe(0);
    expect(ts("import { h } from '../../core/util/dom';", 'x/logic.ts')).toBe(1);
    expect(ts("import { art } from '../../core/art';", 'x/logic.ts')).toBe(1);
    expect(ts("import { h } from '../../core/ui/index';", 'x/logic.ts')).toBe(1);
    expect(ts("import { h } from '../../core/util/dom';", 'x/game.ts')).toBe(0);
    expect(ts("import { start } from './game';", 'x/logic.ts')).toBe(1);
  });
});

describe('checkGameFile — logika bez DOM', () => {
  const ts = (code: string, file = 'x/logic.ts') => checkGameFile(file, code).length;

  it('łapie DOM w logic.ts i w logic/**', () => {
    expect(ts('const el = document.createElement("div")')).toBe(1);
    expect(ts('const w = window.innerWidth')).toBe(1);
    expect(ts('let e: HTMLElement | null = null')).toBe(1);
    expect(ts('const g = globalThis')).toBe(1);
    expect(ts('const el = document.body', 'x/logic/levels.ts')).toBe(1);
    expect(ts('const el = document.body', 'x/poziomy/logic.ts')).toBe(1);
  });

  it('czysta logika i inne pliki przechodzą', () => {
    expect(ts('const win = { start: 0 }; const n = win.start;')).toBe(0);
    expect(ts('const el = document.body', 'x/game.ts')).toBe(0);
    expect(ts('export function step(s: State, dt: number) { return s; }')).toBe(0);
  });
});

describe('checkGameFile — CSS', () => {
  const css = (code: string, file = 'literki/style.css') => checkGameFile(file, code).map((v) => v.message);

  it('selektory: każdy zaczyna się od .g-<id>', () => {
    expect(css('.g-literki { }')).toEqual([]);
    expect(css('.g-literki-a.mg-focused:hover { }')).toEqual([]);
    expect(css(".g-literki[data-skin='rybki'] .g-literki-b > svg { }")).toEqual([]);
    expect(css('@media (prefers-reduced-motion: reduce) { .g-literki-a { opacity: 1; } }')).toEqual([]);
    expect(css('.g-literki-a { &:hover { opacity: 1; } }')).toEqual([]);
    expect(css('.pudelko { }')).toHaveLength(1);
    expect(css('.g-literki-a,\n.inna { }')).toHaveLength(1);
    expect(css('.g-literkix { }')).toHaveLength(1);
    expect(css('.g-inna-gra { }')).toHaveLength(1);
  });

  it('selektory: zakaz globalnych i samodzielnych klas rdzenia', () => {
    expect(css(':root { --mg-ink: var(--x); }')).toHaveLength(1);
    expect(css('html { }')).toHaveLength(1);
    expect(css('body { }')).toHaveLength(1);
    expect(css('* { }')).toHaveLength(1);
    expect(css('svg { }')).toHaveLength(1);
    expect(css('.mg-btn { }')).toHaveLength(1);
    expect(css('.g-literki, body { }')).toHaveLength(1);
    expect(css('@media (min-width: 600px) { body { } }')).toHaveLength(1);
    expect(css('.g-literki * { }')).toEqual([]);
    expect(css('.g-literki .mg-btn { }')).toEqual([]);
    expect(css('.g-literki-a:not(#abc) { }')).toEqual([]);
  });

  it('keyframes: nazwa z prefiksem gry, kroki bez sprawdzania', () => {
    expect(css('@keyframes g-literki-x { from { opacity: 0; } 50% { opacity: 0.5; } to { opacity: 1; } }')).toEqual([]);
    expect(css('@keyframes pulse { 50% { opacity: 0.5; } }')).toHaveLength(1);
  });

  it('kolory: tylko tokeny, currentColor i transparent', () => {
    expect(css('.g-literki-a { color: #ff0000; }')).toHaveLength(1);
    expect(css('.g-literki-a { background: linear-gradient(#fff, #000); }')).toHaveLength(1);
    expect(css('.g-literki-a { color: rgb(1, 2, 3); }')).toHaveLength(1);
    expect(css('.g-literki-a { color: hsl(10 20% 30%); }')).toHaveLength(1);
    expect(css('.g-literki-a { color: red; }')).toHaveLength(1);
    expect(css('.g-literki-a { border: 1px solid white; }')).toHaveLength(1);
    expect(css('.g-literki-a { background: tomato; }')).toHaveLength(1);
    expect(css('.g-literki-a { color: var(--mg-ink, red); }')).toHaveLength(1);
    expect(css('.g-literki-a { color: var(--mg-color-text); background: currentColor; border-color: transparent; }')).toEqual([]);
    expect(css('.g-literki-a { background: color-mix(in srgb, var(--mg-a) 40%, transparent); }')).toEqual([]);
    expect(css('.g-literki-red { animation-name: g-literki-red-pulse; }')).toEqual([]);
    expect(css('.g-literki-a { fill: url(#grad); }')).toEqual([]);
  });

  it('czasy animacji i przejść: tylko tokeny', () => {
    expect(css('.g-literki-a { transition: opacity 0.5s; }')).toHaveLength(1);
    expect(css('.g-literki-a { animation: g-literki-x 800ms ease; }')).toHaveLength(1);
    expect(css('.g-literki-a { animation-delay: .2s; }')).toHaveLength(1);
    expect(css('.g-literki-a { --t: 400ms; }')).toHaveLength(1);
    expect(css('.g-literki-a { transition: opacity var(--mg-dur-base) var(--mg-ease); }')).toEqual([]);
    expect(css('.g-literki-a { animation: g-literki-x var(--mg-dur-slow) var(--mg-ease) both; }')).toEqual([]);
    expect(css('.g-literki-a { width: 5rem; margin: 0 2em; }')).toEqual([]);
  });

  it('promienie: tylko tokeny albo procenty', () => {
    expect(css('.g-literki-a { border-radius: 28px; }')).toHaveLength(1);
    expect(css('.g-literki-a { border-radius: 50% 50% 0 0 / 28px 28px 0 0; }')).toHaveLength(1);
    expect(css('.g-literki-a { border-top-left-radius: 1rem; }')).toHaveLength(1);
    expect(css('.g-literki-a { border-radius: var(--mg-radius); }')).toEqual([]);
    expect(css('.g-literki-a { border-radius: 50%; border: 2px solid currentColor; }')).toEqual([]);
  });

  it('bez własnego kroju, @font-face, @import i zasobów z sieci', () => {
    expect(css('.g-literki-a { font-family: Comic Sans; }')).toHaveLength(1);
    expect(css('.g-literki-a { font: 20px serif; }')).toHaveLength(1);
    expect(css('.g-literki-a { font-size: 2rem; font-weight: 700; }')).toEqual([]);
    expect(css("@import 'x.css';")).toHaveLength(1);
    expect(css("@font-face { src: local('x'); }")).toHaveLength(1);
    expect(css(".g-literki-a { background: url('https://x.pl/a.png'); }")).toHaveLength(1);
    expect(css('.g-literki-a { background: url(//x.pl/a.png); }')).toHaveLength(1);
    expect(css(".g-literki-a { background: url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\"/>'); }")).toEqual([]);
  });

  it('ignoruje komentarze i napisy', () => {
    expect(css('/* :root { color: red; transition: 1s; } */\n.g-literki-a { content: "red 1s #fff"; }')).toEqual([]);
    expect(css(".g-literki[data-x='a.b'] { }")).toEqual([]);
  });

  it('podaje numer linii naruszenia', () => {
    const v = checkGameFile('literki/style.css', '.g-literki-a {\n  opacity: 1;\n  color: red;\n}\n\nbody {\n}\n');
    expect(v.map((x) => x.line)).toEqual([3, 6]);
  });
});
