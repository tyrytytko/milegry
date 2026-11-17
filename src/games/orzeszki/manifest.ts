import { art } from '../../core/art';
import type { GameManifest } from '../../core/types';
import { LEVELS } from './logic';

export const manifest: GameManifest = {
  id: 'orzeszki',
  title: 'Liczymy orzeszki',
  description:
    'Wiewiórka zbiera orzeszki. Policz, ile ich leży na polanie, i wpisz cyfrę — klawiszem albo na klawiaturze ekranowej.',
  area: 'liczby',
  input: ['keyboard', 'touch'],
  age: [3, 5],
  icon: art.acorn(),
  levels: LEVELS.length,
  order: 10,
};
