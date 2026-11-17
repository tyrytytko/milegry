import type { GameManifest } from '../../core/types';
import { tileIcon } from './apple';
import { LEVELS } from './logic';

export const manifest: GameManifest = {
  id: 'po-jednym',
  title: 'Każdemu po jednym',
  description:
    'Daj każdemu jeżykowi po jednym jabłku, a potem znajdź tackę z tyloma jabłkami, ilu jest jeżyków albo ile pokazuje cyfra.',
  area: 'liczby',
  // Oba tryby (rozdawanie i wybór tacki): ramka na strzałkach + Spacja/Enter albo stuknięcie.
  input: ['keyboard', 'touch'],
  age: [3, 5],
  icon: tileIcon(),
  levels: LEVELS.length,
  // W obszarze „liczby” po „Liczymy orzeszki” (10) i „Patyczkach jeżyka” (20).
  order: 30,
};
