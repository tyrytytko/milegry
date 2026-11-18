import type { GameManifest } from '../../core/types';
import { LEVELS } from './logic';
import { tileIcon } from './shapes';

export const manifest: GameManifest = {
  // Musi być równe nazwie folderu i adresowi /<id>/ (tylko a-z, cyfry, pojedyncze myślniki).
  id: 'wzor',
  title: 'Taki sam kształt',
  // PODMIEŃ: jedno zdanie dla rodzica (też opis strony gry w wyszukiwarce).
  description: 'Dopasuj do wzoru taki sam kształt. Stuknij go albo przesuń ramkę strzałkami i naciśnij Spację.',
  // Obszar rozwojowy, według którego hub grupuje kafelki: litery | liczby | ksztalty | logika | pamiec.
  area: 'ksztalty',
  // Tryby sterowania, które gra obsługuje; runRound daje oba (strzałki + Spacja oraz stuknięcie).
  input: ['keyboard', 'touch'],
  // Przedział wieku [od, do] w latach; `od` dobiera kafelek w hubie do wieku wybranego przez rodzica
  // (GameManifest.age w core/types.ts). To nie blokada (Z-39).
  age: [3, 5],
  // PODMIEŃ: inline SVG kafelka w hubie (np. art.chick() z core/art).
  icon: tileIcon(),
  // Liczba poziomów; zawsze z logic.ts, żeby nie rozjechała się z generatorem zadań.
  levels: LEVELS.length,
  // Skórki: ta sama mechanika, inny wygląd (tu tylko tło sceny w style.css). Pierwsza jest domyślna.
  // PODMIEŃ albo usuń całe pole, jeśli gra nie ma skórek.
  skins: [
    { id: 'polana', title: 'Polana' },
    { id: 'woda', title: 'Woda' },
  ],
  // PODMIEŃ: kolejność kafelka w hubie (rosnąco, w obrębie obszaru).
  order: 100,
};
