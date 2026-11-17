import type { GameManifest } from '../../core/types';
import { sticksIcon } from './icon';
import { LEVELS } from './logic';

export const manifest: GameManifest = {
  id: 'patyczki',
  title: 'Patyczki jeżyka',
  description:
    'Jeżyk ma dwie kupki patyczków. Policz wszystkie i wpisz cyfrę, ile ich jest razem — a na końcu, ile zostało po zabraniu.',
  area: 'liczby',
  input: ['keyboard', 'touch'],
  age: [3, 5],
  icon: sticksIcon(),
  levels: LEVELS.length,
  order: 20,
};
