import type { GameManifest } from '../../core/types';
import { art } from '../../core/art';
import { DIACRITIC_LEVELS, LEVELS } from './logic';

export const manifest: GameManifest = {
  id: 'literki',
  title: 'Spadające literki',
  description: 'Jajka z literami powoli spadają. Naciśnij literę z jajka albo stuknij jajko z literą jak u jeżyka — wykluje się kurczaczek.',
  area: 'litery',
  input: ['keyboard', 'touch'],
  age: [3, 5],
  icon: art.chick({ shell: true }),
  levels: LEVELS.length,
  skins: [
    { id: 'kurczaczki', title: 'Kurczaczki', icon: art.chick({ shell: true }) },
    { id: 'rybki', title: 'Rybki', icon: art.fish() },
    { id: 'kasztany', title: 'Kasztany', icon: art.chestnut() },
  ],
  order: 10,
  // Polskie znaki na klawiaturze wymagają AltGr — poziom trudniejszy (Z-31); podpowiedź „AltGr + A”.
  hardLevels: { keyboard: DIACRITIC_LEVELS },
};
