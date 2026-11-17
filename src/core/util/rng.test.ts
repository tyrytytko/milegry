import { describe, expect, it, vi } from 'vitest';
import { createRng } from './rng';

describe('createRng', () => {
  it('daje tę samą sekwencję dla tego samego ziarna', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('daje różne sekwencje dla różnych ziaren', () => {
    expect(createRng(1).next()).not.toEqual(createRng(2).next());
  });

  it('next() mieści się w [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int() zwraca liczby z zakresu włącznie z krańcami', () => {
    const rng = createRng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const v = rng.int(1, 4);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(4);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4]);
  });

  it('shuffle() nie gubi elementów i nie zmienia oryginału', () => {
    const rng = createRng(5);
    const items = [1, 2, 3, 4, 5, 6];
    const shuffled = rng.shuffle(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...shuffled].sort()).toEqual(items);
  });

  it('bez ziarna dwa generatory utworzone w tej samej chwili są niezależne', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    try {
      expect(createRng().next()).not.toEqual(createRng().next());
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('pick() rzuca dla pustej tablicy', () => {
    expect(() => createRng(1).pick([])).toThrow();
  });
});
