import { describe, expect, it } from 'vitest';
import type { Direction } from '../types';
import { nearestInDirection } from '../ui/focusGrid';
import { HUB_LAYOUT, NO_INSETS, computeHubLayout, hubStartIndex, type SafeInsets } from './hubLayout';

describe('hubStartIndex — start ramki klawiatury', () => {
  it('startuje od ostatnio granej gry', () => {
    expect(hubStartIndex(['a', 'b', 'c'], 'b')).toBe(1);
  });

  it('gdy ostatnio grana gra jest ukryta (albo brak zapisu) — od pierwszego kafelka', () => {
    expect(hubStartIndex(['a', 'c'], 'b')).toBe(0);
    expect(hubStartIndex(['a', 'c'], '')).toBe(0);
  });
});

type Layout = ReturnType<typeof computeHubLayout>;

/**
 * Szerokość i wysokość, jakie zajmie hub przy danym układzie — liczone tu z wymiarów, nie z funkcji.
 * `withTitles` pozwala policzyć, ile zająłby ten sam układ z tytułami. Bezpieczne marginesy (`safe`)
 * dochodzą z boków i z góry; z dołu pas przy krawędzi i margines dolny się nie sumują — liczy się większy.
 */
function footprint(layout: Layout, withTitles = layout.titles, safe: SafeInsets = NO_INSETS) {
  const { pad, padTop, gap, headerGap, edgeSafe, titleHeight } = HUB_LAYOUT;
  const width = safe.left + 2 * pad + layout.columns * layout.tile + (layout.columns - 1) * gap + safe.right;
  const height =
    safe.top +
    padTop +
    layout.headerHeight +
    headerGap +
    layout.rows * (layout.tile + (withTitles ? titleHeight : 0)) +
    (layout.rows - 1) * gap +
    Math.max(edgeSafe, safe.bottom);
  return { width, height };
}

/** Prostokąt (lewy górny róg, szerokość, wysokość). */
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Gdzie widok (hub.css) stawia kafelki i przycisk „Dla rodziców”: siatka wyśrodkowana pod nagłówkiem,
 * wypełniana rzędami od lewej; przycisk w prawym górnym rogu pasa nagłówka. Model układu z CSS —
 * zmień go razem z hub.css (np. marginesy).
 */
function placement(layout: Layout, count: number, width: number, safe: SafeInsets = NO_INSETS) {
  const { pad, padTop, gap, headerGap, titleHeight, parents } = HUB_LAYOUT;
  const tileHeight = layout.tile + (layout.titles ? titleHeight : 0);
  const gridWidth = layout.columns * layout.tile + (layout.columns - 1) * gap;
  const inner = width - safe.left - safe.right - 2 * pad;
  const left = safe.left + pad + (inner - gridWidth) / 2;
  const top = safe.top + padTop + layout.headerHeight + headerGap;
  const tiles: Rect[] = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / layout.columns);
    const col = i % layout.columns;
    tiles.push({ x: left + col * (layout.tile + gap), y: top + row * (tileHeight + gap), w: layout.tile, h: tileHeight });
  }
  const button: Rect = {
    x: width - safe.right - pad - parents,
    y: safe.top + padTop + (layout.headerHeight - parents) / 2,
    w: parents,
    h: parents,
  };
  return { tiles, button };
}

/** Odstęp między prostokątami (0, gdy się stykają albo nachodzą). */
function distance(a: Rect, b: Rect): number {
  const dx = Math.max(0, b.x - (a.x + a.w), a.x - (b.x + b.w));
  const dy = Math.max(0, b.y - (a.y + a.h), a.y - (b.y + b.h));
  return Math.max(dx, dy);
}

/** Indeksy osiągalne strzałkami z `start` (ten sam wybór sąsiada co focusGrid przy columns: 'auto'). */
function reachable(rects: Rect[], start: number): Set<number> {
  const boxes = rects.map((r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2, w: r.w, h: r.h }));
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length > 0) {
    const from = queue.shift() as number;
    for (const dir of ['up', 'down', 'left', 'right'] as Direction[]) {
      const others = boxes.map((b, i) => (i === from ? { x: Infinity, y: Infinity } : b));
      const next = nearestInDirection(boxes[from] as (typeof boxes)[number], others, dir);
      if (next >= 0 && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

const phones = [
  { name: 'pion 375 × 667', width: 375, height: 667 },
  { name: 'poziom 667 × 375', width: 667, height: 375 },
];

describe('computeHubLayout', () => {
  for (const screen of phones) {
    for (let count = 1; count <= 12; count++) {
      it(`${screen.name}, ${count} gier: kafelek ≥ 80 px i całość z nagłówkiem na ekranie`, () => {
        const layout = computeHubLayout(count, screen.width, screen.height);
        expect(layout.tile).toBeGreaterThanOrEqual(80);
        expect(layout.columns * layout.rows).toBeGreaterThanOrEqual(count);
        expect(layout.fits).toBe(true);
        const size = footprint(layout);
        expect(size.width).toBeLessThanOrEqual(screen.width);
        expect(size.height).toBeLessThanOrEqual(screen.height);
      });
    }
  }

  it('nagłówek ma wysokość przycisku „Dla rodziców” (80 px), w pionie i w poziomie', () => {
    expect(HUB_LAYOUT.parents).toBeGreaterThanOrEqual(80);
    for (const [w, h] of [[375, 667], [667, 375], [1280, 800]] as const) {
      expect(computeHubLayout(9, w, h).headerHeight).toBe(HUB_LAYOUT.parents);
    }
  });

  it('9 gier: 3 kolumny w pionie, 5 w poziomie', () => {
    for (const [w, h] of [[375, 667], [375, 812], [768, 1024]] as const) {
      expect(computeHubLayout(9, w, h)).toMatchObject({ columns: 3, rows: 3, orientation: 'portrait' });
    }
    for (const [w, h] of [[667, 375], [812, 375], [1280, 800]] as const) {
      expect(computeHubLayout(9, w, h)).toMatchObject({ columns: 5, rows: 2, orientation: 'landscape' });
    }
  });

  it('10–12 gier: 3 × 4 w pionie, 6 × 2 w poziomie', () => {
    for (const count of [10, 11, 12]) {
      expect(computeHubLayout(count, 375, 667)).toMatchObject({ columns: 3, rows: 4 });
      expect(computeHubLayout(count, 667, 375)).toMatchObject({ columns: 6, rows: 2 });
    }
  });

  it('mało gier: nie więcej kolumn niż gier', () => {
    expect(computeHubLayout(2, 375, 667)).toMatchObject({ columns: 2, rows: 1 });
    expect(computeHubLayout(4, 667, 375)).toMatchObject({ columns: 4, rows: 1 });
  });

  it('większy ekran: ten sam układ, większe kafelki (z górną granicą)', () => {
    const phone = computeHubLayout(9, 667, 375);
    const desktop = computeHubLayout(9, 1280, 800);
    expect(desktop.columns).toBe(phone.columns);
    expect(desktop.tile).toBeGreaterThan(phone.tile);
    expect(computeHubLayout(9, 3840, 2160).tile).toBe(HUB_LAYOUT.maxTile);
  });

  it('za mały ekran albo za dużo gier: kafelek zostaje 80 px, hub się przewija', () => {
    expect(computeHubLayout(9, 320, 400)).toMatchObject({ tile: 80, fits: false });
    expect(computeHubLayout(20, 375, 667)).toMatchObject({ tile: 80, fits: false });
  });

  describe('widoczność tytułów (PRD, sekcja 4, „Tytuły tylko tam, gdzie się mieszczą”)', () => {
    it('9 gier w pionie: tytuły widoczne', () => {
      for (const [w, h] of [[375, 667], [375, 812], [768, 1024]] as const) {
        expect(computeHubLayout(9, w, h).titles).toBe(true);
      }
    });

    it('telefon w poziomie: same obrazki, a miejsce po tytułach dostają obrazki', () => {
      for (const [w, h] of [[667, 375], [812, 375]] as const) {
        const layout = computeHubLayout(9, w, h);
        expect(layout.titles).toBe(false);
        expect(layout.fits).toBe(true);
        // Tak duże obrazki z tytułami nie zmieściłyby się na ekranie.
        expect(footprint(layout, true).height).toBeGreaterThan(h);
      }
    });

    it('10–12 gier na 375 × 667 (3 × 4): same obrazki, większe niż 80 px', () => {
      for (const count of [10, 11, 12]) {
        const layout = computeHubLayout(count, 375, 667);
        expect(layout).toMatchObject({ columns: 3, rows: 4, titles: false, fits: true });
        expect(layout.tile).toBeGreaterThanOrEqual(100);
        expect(footprint(layout, true).height).toBeGreaterThan(667);
      }
    });

    it('10–12 gier na 667 × 375 (6 × 2): same obrazki, kafelek ≥ 80 px', () => {
      for (const count of [10, 11, 12]) {
        const layout = computeHubLayout(count, 667, 375);
        expect(layout).toMatchObject({ columns: 6, titles: false, fits: true });
        expect(layout.tile).toBeGreaterThanOrEqual(80);
      }
    });

    it('duży ekran w poziomie: tytuły widoczne', () => {
      for (const [w, h] of [[1024, 768], [1280, 800], [1920, 1080]] as const) {
        expect(computeHubLayout(9, w, h).titles).toBe(true);
      }
    });

    it('w obu orientacjach tytuł widać tylko na kafelku co najmniej tak szerokim jak próg', () => {
      for (let count = 1; count <= 12; count++) {
        for (let w = 300; w <= 1400; w += 25) {
          for (let h = 300; h <= 1400; h += 25) {
            const layout = computeHubLayout(count, w, h);
            if (layout.titles) expect(layout.tile).toBeGreaterThanOrEqual(HUB_LAYOUT.titleMinTile);
          }
        }
      }
    });
  });

  it('kafelek ma całe piksele', () => {
    expect(Number.isInteger(computeHubLayout(9, 375, 812).tile)).toBe(true);
  });
});

describe('bezpieczne marginesy (wycięcie aparatu, zaokrąglone rogi; PRD, sekcja 4)', () => {
  it('bez wycięcia (marginesy zerowe) układ jest taki sam jak bez podania marginesów', () => {
    for (let count = 1; count <= 12; count++) {
      for (const [w, h] of [[375, 667], [375, 812], [667, 375], [812, 375], [1280, 800]] as const) {
        expect(computeHubLayout(count, w, h, NO_INSETS)).toEqual(computeHubLayout(count, w, h));
      }
    }
  });

  // Typowe wartości z telefonów z wycięciem (pion: góra i dół; poziom: boki i dół).
  const notched = [
    { name: 'pion 375 × 812', width: 375, height: 812, safe: { top: 47, right: 0, bottom: 34, left: 0 } },
    { name: 'poziom 812 × 375', width: 812, height: 375, safe: { top: 0, right: 47, bottom: 21, left: 47 } },
    { name: 'poziom 667 × 375, boki po 44 px', width: 667, height: 375, safe: { top: 0, right: 44, bottom: 0, left: 44 } },
  ];

  for (const screen of notched) {
    it(`${screen.name}: 9 gier mieści się poza marginesami, kafelek ≥ 80 px`, () => {
      const layout = computeHubLayout(9, screen.width, screen.height, screen.safe);
      expect(layout.fits).toBe(true);
      expect(layout.tile).toBeGreaterThanOrEqual(80);
      const size = footprint(layout, layout.titles, screen.safe);
      expect(size.width).toBeLessThanOrEqual(screen.width);
      expect(size.height).toBeLessThanOrEqual(screen.height);
    });

    it(`${screen.name}: kafelki i przycisk „Dla rodziców” leżą w bezpiecznym obszarze`, () => {
      const { safe, width, height } = screen;
      const layout = computeHubLayout(9, width, height, safe);
      const { tiles, button } = placement(layout, 9, width, safe);
      for (const r of [...tiles, button]) {
        expect(r.x).toBeGreaterThanOrEqual(safe.left);
        expect(r.x + r.w).toBeLessThanOrEqual(width - safe.right);
        expect(r.y).toBeGreaterThanOrEqual(safe.top);
        expect(r.y + r.h).toBeLessThanOrEqual(height - Math.max(HUB_LAYOUT.edgeSafe, safe.bottom));
      }
    });
  }

  it('boczne marginesy zabierają szerokość: kafelek mniejszy niż bez nich', () => {
    const plain = computeHubLayout(9, 667, 375);
    const notch = computeHubLayout(9, 667, 375, { top: 0, right: 44, bottom: 0, left: 44 });
    // 667 − 2 × 44 − 2 × 16 = 547 px na 5 kolumn z 4 odstępami po 16 px → 96 px.
    expect(notch.tile).toBe(96);
    expect(notch.tile).toBeLessThan(plain.tile);
  });

  it('dolny margines mniejszy niż pas przy krawędzi nic nie zmienia, większy zabiera wysokość', () => {
    const plain = computeHubLayout(9, 812, 375);
    expect(computeHubLayout(9, 812, 375, { top: 0, right: 0, bottom: 21, left: 0 })).toEqual(plain);
    expect(computeHubLayout(9, 812, 375, { top: 0, right: 0, bottom: HUB_LAYOUT.edgeSafe, left: 0 })).toEqual(plain);
    const tall = computeHubLayout(9, 812, 375, { top: 0, right: 0, bottom: 60, left: 0 });
    expect(tall.tile).toBeLessThan(plain.tile);
  });

  it('górny margines zabiera wysokość', () => {
    const plain = computeHubLayout(9, 812, 375);
    expect(computeHubLayout(9, 812, 375, { top: 30, right: 0, bottom: 0, left: 0 }).tile).toBeLessThan(plain.tile);
  });
});

describe('„Dla rodziców” w rogu nagłówka i strzałki (PRD, sekcja 5)', () => {
  const screens = [...phones, { name: 'pion 375 × 812', width: 375, height: 812 }, { name: 'poziom 812 × 375', width: 812, height: 375 }];

  for (const screen of screens) {
    for (let count = 1; count <= 12; count++) {
      it(`${screen.name}, ${count} gier: przycisk na ekranie, ≥ 16 px od kafelków; strzałki dochodzą wszędzie`, () => {
        const layout = computeHubLayout(count, screen.width, screen.height);
        const { tiles, button } = placement(layout, count, screen.width);

        expect(button.w).toBeGreaterThanOrEqual(80);
        expect(button.h).toBeGreaterThanOrEqual(80);
        expect(button.x).toBeGreaterThanOrEqual(0);
        expect(button.y).toBeGreaterThanOrEqual(0);
        expect(button.x + button.w).toBeLessThanOrEqual(screen.width);
        for (const t of tiles) expect(distance(button, t)).toBeGreaterThanOrEqual(HUB_LAYOUT.gap);

        // Z każdego kafelka i z przycisku strzałkami da się dojść do każdego kafelka i do przycisku.
        const rects = [...tiles, button];
        for (let start = 0; start < rects.length; start++) {
          expect(reachable(rects, start).size).toBe(rects.length);
        }
      });
    }
  }
});
