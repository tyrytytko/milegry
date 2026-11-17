import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/util/rng';
import {
  LEVELS,
  bestLayout,
  closeOpen,
  createBoards,
  createState,
  fitPairs,
  flip,
  isCleared,
  levelParams,
  matchedCount,
  partnerOf,
  solveTogether,
  suggest,
  type BoardState,
  type Card,
} from './logic';
import { manifest } from './manifest';

const SEEDS = Array.from({ length: 30 }, (_, i) => i + 1);
const levelNumbers = LEVELS.map((_, i) => i + 1);

/** Wszystkie karty planszy po kolei: dla każdej karty jej para (przydaje się w testach rozgrywki). */
const pairsOf = (cards: Card[]) => cards.map((_, i) => partnerOf({ cards } as BoardState, i));

describe('poziomy', () => {
  it('runda ma 5–10 par do znalezienia (Z-23), plansza 2–8 par', () => {
    for (const p of LEVELS) {
      expect(p.pairs * p.boards).toBeGreaterThanOrEqual(5);
      expect(p.pairs * p.boards).toBeLessThanOrEqual(10);
      expect(p.pairs).toBeGreaterThanOrEqual(2);
      expect(p.pairs).toBeLessThanOrEqual(8);
    }
  });

  it('obrazki: 2 → 3 → 4 → 6 → 8 par (specyfikacja), potem warianty liter i liczb', () => {
    expect(LEVELS.slice(0, 5).map((p) => [p.kind, p.pairs])).toEqual([
      ['picture', 2],
      ['picture', 3],
      ['picture', 4],
      ['picture', 6],
      ['picture', 8],
    ]);
    expect(LEVELS.slice(5).map((p) => p.kind)).toEqual(['letters', 'numbers']);
  });

  it('levelParams przycina numer poziomu do zakresu', () => {
    expect(levelParams(0)).toBe(LEVELS[0]);
    expect(levelParams(99)).toBe(LEVELS[LEVELS.length - 1]);
  });

  it('manifest.levels zgadza się z LEVELS', () => {
    expect(manifest.levels).toBe(LEVELS.length);
  });
});

describe('createBoards', () => {
  describe.each(levelNumbers)('poziom %i', (level) => {
    const params = levelParams(level);
    const rounds = SEEDS.map((seed) => createBoards(level, params.pairs, createRng(seed)));

    it('daje tyle plansz i par, ile przewiduje poziom; każda karta ma dokładnie jedną parę', () => {
      for (const boards of rounds) {
        expect(boards).toHaveLength(params.boards);
        for (const cards of boards) {
          expect(cards).toHaveLength(params.pairs * 2);
          const ids = cards.map((c) => c.pair);
          for (const id of new Set(ids)) expect(ids.filter((x) => x === id)).toHaveLength(2);
          pairsOf(cards).forEach((p, i) => {
            expect(p).not.toBe(i);
            expect(cards[p]!.pair).toBe(cards[i]!.pair);
          });
        }
      }
    });

    it('karty pary pasują do siebie wg wariantu, różne pary mają różną treść', () => {
      for (const cards of rounds.flat()) {
        const byPair = new Map<number, Card[]>();
        for (const c of cards) byPair.set(c.pair, [...(byPair.get(c.pair) ?? []), c]);
        const keys = new Set<string>();
        for (const [a, b] of byPair.values()) {
          const fa = a!.face;
          const fb = b!.face;
          if (params.kind === 'picture') {
            expect(fa).toEqual(fb);
            if (fa.type === 'picture') keys.add(fa.id);
          } else if (params.kind === 'letters') {
            expect(fa.type === 'letter' && fb.type === 'letter').toBe(true);
            if (fa.type !== 'letter' || fb.type !== 'letter') continue;
            expect(fa.char).toBe(fb.char);
            expect(new Set([fa.case, fb.case])).toEqual(new Set(['upper', 'lower']));
            keys.add(fa.char);
          } else {
            expect(new Set([fa.type, fb.type])).toEqual(new Set(['digit', 'set']));
            if (fa.type === 'picture' || fa.type === 'letter' || fb.type === 'picture' || fb.type === 'letter') continue;
            expect(fa.n).toBe(fb.n);
            expect(fa.n).toBeGreaterThanOrEqual(1);
            expect(fa.n).toBeLessThanOrEqual(5); // Z-37: do 5
            keys.add(String(fa.n));
          }
        }
        expect(keys.size).toBe(params.pairs);
      }
    });

    it('karty są przetasowane (para nie leży zawsze obok siebie)', () => {
      const adjacent = rounds.flat().every((cards) => cards.every((c, i) => i % 2 === 1 || cards[i + 1]?.pair === c.pair));
      expect(adjacent).toBe(false);
    });
  });

  it('kolejne plansze rundy mają inną treść, jeśli pula na to pozwala', () => {
    for (const seed of SEEDS) {
      const [a, b] = createBoards(1, 2, createRng(seed));
      const faces = (cards: Card[]) => new Set(cards.map((c) => JSON.stringify(c.face)));
      const common = [...faces(a!)].filter((f) => faces(b!).has(f));
      expect(common).toHaveLength(0);
    }
  });

  it('przycięta liczba par (mały ekran) daje mniejsze plansze — także dla liter i cyfr', () => {
    expect(createBoards(5, 6, createRng(3))[0]).toHaveLength(12);
    expect(createBoards(6, 3, createRng(3)).every((b) => b.length === 6)).toBe(true);
    expect(createBoards(7, 3, createRng(3)).every((b) => b.length === 6)).toBe(true);
  });

  it('cyfry: na planszy najwyżej 5 par (1–5, Z-37), nawet gdy poproszono o więcej', () => {
    for (const cards of createBoards(7, 8, createRng(4))) expect(cards).toHaveLength(10);
  });

  it('dla każdego poziomu i rozsądnego rozmiaru sceny runda ma 5–10 par (Z-23)', () => {
    for (const level of levelNumbers) {
      for (let w = 150; w <= 1400; w += 50) {
        for (let h = 150; h <= 1000; h += 50) {
          const total = createBoards(level, fitPairs(levelParams(level).pairs, w, h), createRng(w + h)).flat().length / 2;
          expect(total, `poziom ${level}, ${w} × ${h}`).toBeGreaterThanOrEqual(5);
          expect(total, `poziom ${level}, ${w} × ${h}`).toBeLessThanOrEqual(10);
        }
      }
    }
  });

  it('to samo ziarno daje te same plansze, inne ziarno — inne', () => {
    for (const level of levelNumbers) {
      const p = levelParams(level).pairs;
      expect(createBoards(level, p, createRng(7))).toEqual(createBoards(level, p, createRng(7)));
      expect(createBoards(level, p, createRng(7))).not.toEqual(createBoards(level, p, createRng(8)));
    }
  });
});

describe('rozgrywka', () => {
  const board = () => createBoards(3, 4, createRng(11))[0]!;

  it('pierwsze odkrycie, para → zostaje odkryta; odkryte i dopasowane karty są ignorowane', () => {
    const s = createState(board());
    const p = partnerOf(s, 0);
    expect(flip(s, 0)).toEqual({ kind: 'first' });
    expect(flip(s, 0)).toEqual({ kind: 'ignored' });
    expect(flip(s, p)).toEqual({ kind: 'match', a: 0, b: p });
    expect(s.matched[0] && s.matched[p]).toBe(true);
    expect(s.open).toEqual([]);
    expect(flip(s, p)).toEqual({ kind: 'ignored' });
    expect(matchedCount(s)).toBe(1);
  });

  it('nietrafiona para: trzecia karta nie odkryje się, póki dwie nie zostaną zakryte', () => {
    const s = createState(board());
    const wrong = s.cards.findIndex((c, i) => i > 0 && c.pair !== s.cards[0]!.pair);
    const third = s.cards.findIndex((_, i) => i !== 0 && i !== wrong);
    flip(s, 0);
    expect(flip(s, wrong)).toMatchObject({ kind: 'mismatch', a: 0, b: wrong });
    expect(flip(s, third)).toEqual({ kind: 'ignored' });
    expect(closeOpen(s).sort()).toEqual([0, wrong].sort());
    expect(s.open).toEqual([]);
    expect(flip(s, third)).toEqual({ kind: 'first' });
  });

  it('„pomyłka pamięci” tylko gdy obie karty (para pierwszej i druga) były już widziane', () => {
    const s = createState(board());
    // Pierwsze nietrafienie: nic nie było widziane — to zwykła gra, nie pomyłka.
    const other = s.cards.findIndex((card, i) => i > 0 && card.pair !== s.cards[0]!.pair);
    flip(s, 0);
    expect(flip(s, other)).toMatchObject({ kind: 'mismatch', slip: false });
    closeOpen(s);
    // Para karty 0 (jeszcze niewidziana), a potem znowu `other`: karta 0 i `other` były już widziane,
    // więc dziecko mogło pamiętać, gdzie leży para — to „pomyłka pamięci”.
    flip(s, partnerOf(s, 0));
    expect(flip(s, other)).toMatchObject({ kind: 'mismatch', slip: true });
  });

  it('nowa (niewidziana) karta jako druga nie jest pomyłką, nawet gdy para pierwszej była widziana', () => {
    const s = createState(board());
    const p = partnerOf(s, 0);
    const other = s.cards.findIndex((c, i) => i !== 0 && i !== p && c.pair !== s.cards[0]!.pair);
    flip(s, 0);
    flip(s, other);
    closeOpen(s);
    const unseen = s.cards.findIndex((c, i) => !s.seen[i] && i !== p && c.pair !== s.cards[p]!.pair);
    flip(s, p);
    expect(flip(s, unseen)).toMatchObject({ kind: 'mismatch', slip: false });
  });

  it('suggest: przy jednej odkrytej wskazuje jej parę; bez odkrytych — znaną parę, potem niewidzianą kartę', () => {
    const s = createState(board());
    expect(s.matched[suggest(s)]).toBe(false);
    flip(s, 3);
    expect(suggest(s)).toBe(partnerOf(s, 3));
    const wrong = s.cards.findIndex((c, i) => i !== 3 && c.pair !== s.cards[3]!.pair);
    flip(s, wrong);
    closeOpen(s);
    // Karta 3 i `wrong` widziane, ich pary nie — wskazujemy kartę niewidzianą.
    expect(s.seen[suggest(s)]).toBe(false);
    // Odkrywamy parę karty 3 i coś innego niewidzianego → para 3 znana w całości.
    const p3 = partnerOf(s, 3);
    flip(s, p3);
    const another = s.cards.findIndex((c, i) => !s.seen[i] && i !== p3 && c.pair !== s.cards[p3]!.pair);
    flip(s, another);
    closeOpen(s);
    const hint = suggest(s);
    expect(s.seen[hint] && s.seen[partnerOf(s, hint)]).toBe(true);
  });

  it('solveTogether dopasowuje pierwszą odkrytą kartę z jej parą; druga zostaje do zakrycia', () => {
    const s = createState(board());
    const wrong = s.cards.findIndex((c, i) => i > 0 && c.pair !== s.cards[0]!.pair);
    flip(s, 0);
    flip(s, wrong);
    const partner = solveTogether(s);
    expect(partner).toBe(partnerOf(s, 0));
    expect(s.matched[0] && s.matched[partner]).toBe(true);
    expect(s.open).toEqual([wrong]);
    expect(closeOpen(s)).toEqual([wrong]);
  });

  it('każda plansza da się skończyć: odkrywanie parami kończy grę (isCleared)', () => {
    for (const level of levelNumbers) {
      for (const cards of createBoards(level, levelParams(level).pairs, createRng(5))) {
        const s = createState(cards);
        expect(isCleared(s)).toBe(false);
        for (let i = 0; i < cards.length; i++) {
          if (s.matched[i]) continue;
          flip(s, i);
          flip(s, partnerOf(s, i));
        }
        expect(isCleared(s)).toBe(true);
        expect(matchedCount(s)).toBe(cards.length / 2);
      }
    }
  });

  it('losowe stukanie: nigdy więcej niż 2 odkryte karty naraz', () => {
    const rng = createRng(42);
    const s = createState(board());
    for (let k = 0; k < 500 && !isCleared(s); k++) {
      const r = flip(s, rng.int(0, s.cards.length - 1));
      expect(s.open.length).toBeLessThanOrEqual(2);
      if (r.kind === 'mismatch') closeOpen(s);
    }
  });
});

describe('układ', () => {
  const MIN = 80;
  const GAP = 16;
  const fits = (count: number, w: number, h: number) => {
    const l = bestLayout(count, w, h);
    if (!l) return false;
    expect(l.size).toBeGreaterThanOrEqual(MIN);
    expect(l.cols * l.rows).toBeGreaterThanOrEqual(count);
    expect(l.cols * l.size + (l.cols - 1) * GAP).toBeLessThanOrEqual(w);
    expect(l.rows * l.size + (l.rows - 1) * GAP).toBeLessThanOrEqual(h);
    return true;
  };

  it('karty ≥ 80 px z odstępem 16 px mieszczą się w dostępnym miejscu albo układu nie ma', () => {
    for (const count of [4, 6, 8, 10, 12, 16]) {
      for (const [w, h] of [[312, 480], [327, 652], [619, 215], [1000, 600], [200, 200]] as const) fits(count, w, h);
    }
  });

  it('16 kart: nie mieści się w 360 × 640 ani 667 × 375, mieści się w 375 × 812 i na tablecie', () => {
    // Miejsce na karty = scena (zmierzona) bez marginesów: 360×640 → 312×480, 667×375 → 619×215.
    expect(fits(16, 312, 480)).toBe(false);
    expect(fits(16, 619, 215)).toBe(false);
    expect(fits(16, 327, 652)).toBe(true);
    expect(fits(16, 720, 800)).toBe(true);
    expect(fits(12, 312, 480)).toBe(true);
    expect(fits(12, 619, 215)).toBe(true);
  });

  it('fitPairs przycina liczbę par do ekranu, ale nie poniżej 2; bez wymiarów nie przycina', () => {
    expect(fitPairs(8, 312, 480)).toBe(7); // 14 kart: 3 kolumny × 5 rzędów
    expect(fitPairs(8, 619, 215)).toBe(6);
    expect(fitPairs(8, 327, 652)).toBe(8);
    expect(fitPairs(3, 312, 480)).toBe(3);
    expect(fitPairs(8, 100, 100)).toBe(2);
    expect(fitPairs(8, 0, 0)).toBe(8);
  });

  it('obrót w trakcie rundy (16 kart, 375 × 812 → 667 × 375): przy min 1 px cała plansza mieści się w scenie', () => {
    expect(bestLayout(16, 619, 215)).toBeNull();
    const l = bestLayout(16, 619, 215, 1)!;
    expect(l).toMatchObject({ cols: 8, rows: 2 });
    expect(l.size).toBeLessThan(MIN);
    expect(l.cols * l.size + (l.cols - 1) * GAP).toBeLessThanOrEqual(619);
    expect(l.rows * l.size + (l.rows - 1) * GAP).toBeLessThanOrEqual(215);
  });

  it('bestLayout wybiera większe karty, ale nie większe niż MAX', () => {
    const l = bestLayout(4, 2000, 2000)!;
    expect(l.size).toBeLessThanOrEqual(160);
    expect(bestLayout(4, 500, 150)).toMatchObject({ cols: 4, rows: 1 });
    expect(bestLayout(4, 200, 400)).toMatchObject({ cols: 2, rows: 2 });
  });
});
