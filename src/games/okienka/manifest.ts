import type { GameManifest } from '../../core/types';
import { LEVELS } from './logic';
import { houseIcon } from './shapes';

export const manifest: GameManifest = {
  id: 'okienka',
  title: 'Kształtowe okienka',
  description:
    'Dopasuj okiennicę do okienka o tym samym kształcie w domku wiewiórki. Stuknij okienko albo przesuń ramkę strzałkami i naciśnij Spację.',
  area: 'ksztalty',
  input: ['keyboard', 'touch'],
  age: [3, 5],
  icon: houseIcon(),
  levels: LEVELS.length,
  order: 10,
};
