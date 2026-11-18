import type { GameManifest } from '../../core/types';
import { tileIcon } from './icon';
import { LEVELS } from './logic';

export const manifest: GameManifest = {
  // Musi być równe nazwie folderu i adresowi /<id>/ (tylko a-z, cyfry, pojedyncze myślniki).
  id: 'konkurs-matematyczny',
  title: 'Matematyczne zagadki',
  description:
    'Spokojne zadania jak z konkursu matematycznego dla klasy 1: polecenie, zadanie z „?” i cztery karty do wyboru — bez punktów i bez zegara.',
  area: 'liczby',
  input: ['keyboard', 'touch'],
  // Od 6 lat: hub pokazuje grę tylko przy wieku „5–7” (GameManifest.age w core/types.ts). To nie blokada (Z-39).
  age: [6, 7],
  icon: tileIcon(),
  // Liczba poziomów zawsze z logic.ts, żeby nie rozjechała się z pulą zadań.
  levels: LEVELS.length,
  // Ostatnia w obszarze „Liczby” (po orzeszkach 10, patyczkach 20 i „Po jednym” 30).
  order: 40,
};
