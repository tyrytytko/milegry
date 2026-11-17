import type { Rng } from '../types';

/**
 * Generator liczb pseudolosowych z ziarnem (algorytm mulberry32).
 * To samo ziarno → ta sama sekwencja (przydatne w testach logiki gier); bez ziarna — losowe.
 */
export function createRng(seed: number = Math.random() * 2 ** 32): Rng {
  let state = seed >>> 0;

  function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function int(min: number, max: number): number {
    const lo = Math.ceil(Math.min(min, max));
    const hi = Math.floor(Math.max(min, max));
    return lo + Math.floor(next() * (hi - lo + 1));
  }

  function pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('rng.pick: pusta tablica');
    return items[int(0, items.length - 1)] as T;
  }

  function shuffle<T>(items: readonly T[]): T[] {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = int(0, i);
      [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
    }
    return copy;
  }

  function chance(p: number): boolean {
    return next() < p;
  }

  return { next, int, pick, shuffle, chance };
}
