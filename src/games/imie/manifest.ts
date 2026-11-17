import { art } from '../../core/art';
import type { GameManifest } from '../../core/types';
import { LEVELS } from './logic';

export const manifest: GameManifest = {
  id: 'imie',
  title: 'Literki z imienia',
  description:
    'Układanie imienia litera po literze: po wpisaniu imienia w panelu rodzica gra układa imię dziecka, a bez niego proste słowa (MAMA, TATA, DOM…).',
  area: 'litery',
  input: ['keyboard', 'touch'],
  age: [3, 5],
  icon: art.chestnut(),
  levels: LEVELS.length,
  // Po „Spadających literkach” (10) i „Literkach bliźniaczkach” (20).
  order: 30,
};
