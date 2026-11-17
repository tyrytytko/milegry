import { art } from '../../core/art';
import type { GameManifest } from '../../core/types';
import { LEVELS } from './logic';

export const manifest: GameManifest = {
  id: 'literki-blizniaczki',
  title: 'Literki bliźniaczki',
  description: 'Znajdź tę samą literkę: pisaną i drukowaną. Stuknij żołądź albo przesuń ramkę strzałkami i naciśnij Spację.',
  area: 'litery',
  input: ['keyboard', 'touch'],
  age: [3, 5],
  icon: art.squirrel(),
  levels: LEVELS.length,
  // Po „Spadających literkach” (order 10).
  order: 20,
};
