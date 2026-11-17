import type { GameManifest } from '../../core/types';
import { LEVELS } from './logic';
import { tileIcon } from './sprites';

export const manifest: GameManifest = {
  id: 'labirynt',
  title: 'Labirynty z jeżykiem',
  description:
    'Zaprowadź jeżyka strzałkami przez labirynt do domku. Zamkniętą bramę otwiera kod — przepisz cyfry z tabliczki.',
  area: 'logika',
  input: ['keyboard', 'touch'],
  age: [3, 5],
  icon: tileIcon(),
  levels: LEVELS.length,
  order: 10,
};
