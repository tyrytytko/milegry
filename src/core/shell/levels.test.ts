import { describe, expect, it } from 'vitest';
import type { GameManifest } from '../types';
import { nextLevel, startFromQuery } from './levels';

const manifest = (levels: number, hardLevels?: GameManifest['hardLevels']): GameManifest => ({
  id: 'x',
  title: 'X',
  description: 'x',
  area: 'litery',
  input: ['keyboard', 'touch'],
  age: [3, 5],
  icon: '<svg/>',
  levels,
  order: 1,
  hardLevels,
});

const withSkins = (levels: number): GameManifest => ({
  ...manifest(levels),
  skins: [
    { id: 'zwierzeta', title: 'Zwierzęta' },
    { id: 'owoce', title: 'Owoce' },
  ],
});

describe('startFromQuery', () => {
  it('czyta poziom i obrazki z adresu', () => {
    expect(startFromQuery('?poziom=5&obrazki=owoce', withSkins(8))).toEqual({ level: 5, skin: 'owoce' });
    expect(startFromQuery('?obrazki=owoce', withSkins(8))).toEqual({ skin: 'owoce' });
    expect(startFromQuery('?x=1&poziom=1', withSkins(8))).toEqual({ level: 1 });
  });

  it('błędna wartość = zachowanie domyślne', () => {
    for (const bad of ['0', '9', '-1', '2.5', 'abc', '', '05x', '99999']) {
      expect(startFromQuery('?poziom=' + bad, withSkins(8))).toEqual({});
    }
    expect(startFromQuery('?obrazki=nie-ma', withSkins(8))).toEqual({});
    expect(startFromQuery('', withSkins(8))).toEqual({});
  });

  it('gra bez skórek ignoruje obrazki, gra bez poziomów — poziom', () => {
    expect(startFromQuery('?obrazki=owoce', manifest(8))).toEqual({});
    expect(startFromQuery('?poziom=1', manifest(0))).toEqual({});
  });
});

describe('nextLevel', () => {
  it('prowadzi na kolejny poziom', () => {
    expect(nextLevel(manifest(8), 3, 'keyboard')).toBe(4);
  });

  it('po ostatnim poziomie nie ma dalej', () => {
    expect(nextLevel(manifest(8), 8, 'touch')).toBeNull();
    expect(nextLevel(manifest(0), 0, 'touch')).toBeNull();
  });

  it('omija poziomy trudniejsze w danym trybie sterowania', () => {
    const m = manifest(8, { keyboard: [8] });
    expect(nextLevel(m, 7, 'keyboard')).toBeNull();
    expect(nextLevel(m, 7, 'touch')).toBe(8);
  });

  it('przeskakuje trudniejszy poziom w środku listy', () => {
    expect(nextLevel(manifest(6, { keyboard: [4, 5] }), 3, 'keyboard')).toBe(6);
  });
});
