import type { GameManifest } from '../../core/types';
import { tileIcon } from './faces';
import { LEVELS } from './logic';

export const manifest: GameManifest = {
  id: 'pary',
  title: 'Pary pod liśćmi',
  description:
    'Memory bez pośpiechu: odkryj dwa liście i znajdź pod nimi parę obrazków, liter albo cyfr. Stuknij liść albo przesuń ramkę strzałkami i naciśnij Spację.',
  area: 'pamiec',
  input: ['keyboard', 'touch'],
  age: [3, 5],
  icon: tileIcon(),
  levels: LEVELS.length,
  order: 10,
};
