import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { art } from './index';

const tokens = readFileSync(new URL('../styles/tokens.css', import.meta.url), 'utf8');

/** Kolor tokenu jako [r, g, b] — rozwiązuje hex, var(…) i color-mix(in srgb, A p%, B). */
type Rgb = [number, number, number];

function rgb(value: string): Rgb {
  const v = value.trim();
  const ref = /^var\((--[\w-]+)\)$/.exec(v);
  if (ref) {
    const def = new RegExp(`${ref[1]}:\s*([^;]+);`).exec(tokens);
    if (!def?.[1]) throw new Error(`brak tokenu ${ref[1]}`);
    return rgb(def[1]);
  }
  const [, first = '', percent = '', second = ''] = /^color-mix\(in srgb, (.+) (\d+)%, (.+)\)$/.exec(v) ?? [];
  if (first) {
    const [a, b, p] = [rgb(first), rgb(second), Number(percent) / 100];
    return [0, 1, 2].map((i) => a[i]! * p + b[i]! * (1 - p)) as Rgb;
  }
  const hex = /^#([0-9a-f]{6})$/i.exec(v)?.[1];
  if (!hex) throw new Error(`nie umiem odczytać koloru: ${v}`);
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
}

function contrast(a: string, b: string): number {
  const lum = (c: Rgb) => {
    const [r, g, bl] = c.map((x) => {
      const s = x / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    }) as Rgb;
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((m, n) => n - m) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

/** Najsłabszy kontrast tokenu grafiki z jasnymi tłami, na których stoją sprite'y. */
const onLight = (token: string) =>
  Math.min(contrast(`var(--mg-art-${token})`, 'var(--mg-surface)'), contrast(`var(--mg-art-${token})`, 'var(--mg-bg)'));

describe('art', () => {
  it('każdy kolor sprite’a jest zdefiniowany w tokens.css (literówka dałaby czarny kształt)', () => {
    const markup = [
      ...Object.values(art).map((sprite) => sprite()),
      art.hedgehog({ sleeping: true }),
      art.chick({ shell: true }),
      art.egg({ cracked: true }),
      art.chestnutBurr({ open: true }),
      art.acorn({ face: true }),
      art.chestnut({ face: false }),
      ...(['sage', 'ochre', 'rose', 'brown'] as const).map((tone) => art.leaf({ tone })),
    ].join('');
    const used = new Set([...markup.matchAll(/var\((--mg-art-[\w-]+)\)/g)].map((m) => m[1]));
    expect(used.size).toBeGreaterThan(10);
    const missing = [...used].filter((name) => !tokens.includes(`${name}:`));
    expect(missing).toEqual([]);
  });

  it('sprite z jasnym wypełnieniem ma obrys ≥ 3:1 na surface i bg (Z-14: kształt nie ginie na kartce)', () => {
    // Elementy wewnątrz ciemniejszej sylwetki (nie dotykają tła) — nie potrzebują obrysu.
    const inner = new Set(['eye', 'highlight', 'shadow', 'cheek', 'beak', 'egg-shade', 'egg-spot', 'squirrel-light', 'chestnut-light', 'burr']);
    const variants: Record<string, string> = {
      ...Object.fromEntries(Object.entries(art).map(([name, sprite]) => [name, sprite()])),
      chickInShell: art.chick({ shell: true }),
      burrOpen: art.chestnutBurr({ open: true }),
      ...Object.fromEntries((['sage', 'ochre', 'rose', 'brown'] as const).map((tone) => [`leaf-${tone}`, art.leaf({ tone })])),
    };
    const weak: string[] = [];
    for (const [name, svg] of Object.entries(variants)) {
      const fills = [...svg.matchAll(/fill:var\(--mg-art-([\w-]+)\)/g)].map((m) => m[1] ?? '');
      // Obrys = kształt z wypełnieniem i stroke (nie same linie z fill:none, np. uśmiech czy gałązka).
      const rims = [...svg.matchAll(/style="fill:var\(--mg-art-[\w-]+\)[^"]*?stroke:var\(--mg-art-([\w-]+)\)/g)].map((m) => m[1] ?? '');
      const hasRim = rims.some((rim) => onLight(rim) >= 3);
      for (const token of new Set(fills)) {
        if (!inner.has(token) && onLight(token) < 3 && !hasRim) weak.push(`${name}: ${token} ${onLight(token).toFixed(2)}:1`);
      }
    }
    expect(weak).toEqual([]);
  });

  it('jajko i skorupka mają obrys (białe na białej kartce widać tylko po obrysie)', () => {
    expect(onLight('egg')).toBeLessThan(3);
    for (const svg of [art.egg(), art.egg({ cracked: true }), art.chick({ shell: true })]) {
      expect(svg).toMatch(/fill:var\(--mg-art-egg\);stroke:var\(--mg-art-egg-rim\)/);
    }
    expect(onLight('egg-rim')).toBeGreaterThanOrEqual(3);
  });

  it('żołądź i kasztan mają buzię tylko tam, gdzie wynika to z opcji', () => {
    const eyes = (svg: string) => svg.includes('--mg-art-eye');
    expect(eyes(art.acorn())).toBe(false);
    expect(eyes(art.acorn({ face: true }))).toBe(true);
    expect(eyes(art.chestnut())).toBe(true);
    expect(eyes(art.chestnut({ face: false }))).toBe(false);
  });
});
