/**
 * Logika gry „Spadające literki” — czyste funkcje, bez DOM.
 *
 * Przedmiot (jajko / bąbelek / łupina) z literą powoli przesuwa się swoim torem.
 * Trafienie (klawiatura: klawisz z literą — klik myszą nic nie zalicza; dotyk: stuknięcie przedmiotu z literą jak na karcie-wzorze) → przedmiot
 * się otwiera (kurczaczek / rybka / kasztan). Drugie trafienie albo AUTO_LEAVE_MS później → zwierzątko
 * odchodzi i liczy się jako zebrane. Przedmiot, który dotrze do końca toru, ląduje i czeka (Z-22).
 */
import type { Rng } from '../../core/types';
import { BASE_ALPHABET } from '../../core/util/letters';

export interface LevelParams {
  /** Litery, które mogą się pojawić (WIELKIE). */
  letters: readonly string[];
  /** Czas przejścia całego toru w sekundach (przy tempie „średnie”; zegar gry skaluje go tempem). */
  fallSeconds: number;
  /** Ile przedmiotów naraz (Z-01: 1 na poziomie 1, najwyżej 3). */
  maxActive: number;
  /** Odstęp między kolejnymi przedmiotami (ms czasu gry); pierwszy przedmiot rundy pojawia się od razu. */
  spawnEveryMs: number;
  /** Ile liter trzeba zebrać w rundzie (Z-23: 5–10 zadań). */
  goal: number;
}

/** Otwarte zwierzątko samo odchodzi po tym czasie (ms czasu gry). */
export const AUTO_LEAVE_MS = 3000;
/** Otwarte zwierzątko można zebrać dopiero po tym czasie — szybkie podwójne stuknięcie tylko otwiera (Z-21). */
export const MIN_OPEN_MS = 400;
/**
 * Po zebraniu nowy przedmiot pojawia się najwcześniej po tym czasie (ms czasu gry), żeby nie ruszał
 * razem z odchodzącym zwierzątkiem (odejście: --mg-dur-slow 800 ms; zapas na tempo „żwawe” ×1,35) — Z-01.
 */
export const AFTER_COLLECT_MS = 1200;

const range = (from: string, to: string) => BASE_ALPHABET.slice(BASE_ALPHABET.indexOf(from), BASE_ALPHABET.indexOf(to) + 1);

/** Litery z diakrytykami razem z literą bazową. */
export const DIACRITIC_PAIRS = ['A', 'Ą', 'C', 'Ć', 'E', 'Ę', 'L', 'Ł', 'N', 'Ń', 'O', 'Ó', 'S', 'Ś', 'Z', 'Ź', 'Ż'];

/**
 * Poziomy. Poziom 8 ma polskie znaki — na klawiaturze wymagają AltGr, więc jest tam
 * „trudniejszy” (manifest.hardLevels), a klawisz-podpowiedź pokazuje „AltGr + A”.
 * Małe litery nie są osobnym poziomem: włącza je rodzic (ustawienie „Wielkość liter”).
 */
export const LEVELS: readonly LevelParams[] = [
  { letters: ['A', 'O', 'M'], fallSeconds: 15, maxActive: 1, spawnEveryMs: 1500, goal: 5 },
  { letters: ['A', 'O', 'M', 'E', 'L', 'I'], fallSeconds: 12, maxActive: 1, spawnEveryMs: 1500, goal: 6 },
  { letters: ['A', 'E', 'I', 'O', 'U', 'M', 'L', 'T', 'P', 'K'], fallSeconds: 10, maxActive: 2, spawnEveryMs: 3500, goal: 8 },
  { letters: range('A', 'M'), fallSeconds: 10, maxActive: 2, spawnEveryMs: 3500, goal: 8 },
  { letters: range('N', 'Z'), fallSeconds: 10, maxActive: 2, spawnEveryMs: 3500, goal: 8 },
  { letters: BASE_ALPHABET, fallSeconds: 8, maxActive: 2, spawnEveryMs: 3000, goal: 10 },
  { letters: BASE_ALPHABET, fallSeconds: 8, maxActive: 3, spawnEveryMs: 3000, goal: 10 },
  { letters: DIACRITIC_PAIRS, fallSeconds: 10, maxActive: 2, spawnEveryMs: 3500, goal: 8 },
];

/** Poziomy zawierające polskie znaki (dla manifest.hardLevels.keyboard). */
export const DIACRITIC_LEVELS: number[] = LEVELS.flatMap((p, i) =>
  p.letters.some((l) => !BASE_ALPHABET.includes(l)) ? [i + 1] : [],
);

/** Parametry poziomu (numeracja od 1; poza zakresem → najbliższy istniejący). */
export function levelParams(level: number): LevelParams {
  const index = Math.max(0, Math.min(LEVELS.length - 1, Math.floor(level) - 1));
  return LEVELS[index] ?? LEVELS[0]!;
}

/** Polskie znaki na klawiaturze (układ „polski programisty”): AltGr + ten klawisz. */
const ALTGR_KEYS: Readonly<Record<string, string>> = { Ą: 'A', Ć: 'C', Ę: 'E', Ł: 'L', Ń: 'N', Ó: 'O', Ś: 'S', Ź: 'X', Ż: 'Z' };

/** Napis na klawiszu-podpowiedzi: 'M', a dla polskiego znaku np. 'AltGr + A'. */
export function keyLabel(letter: string): string {
  const base = ALTGR_KEYS[letter];
  return base ? `AltGr + ${base}` : letter;
}

export type ItemStage = 'closed' | 'open';

export interface Item {
  id: number;
  letter: string;
  /** Tor (kolumna) 0..lanes-1. */
  lane: number;
  /** Położenie w torze: 0 = start, 1 = koniec (ziemia / tafla wody). */
  y: number;
  stage: ItemStage;
  /** Doleciał do końca toru i czeka. */
  landed: boolean;
  /** Ile ms czasu gry przedmiot jest już otwarty. */
  openMs: number;
}

export interface GameState {
  params: LevelParams;
  lanes: number;
  items: Item[];
  collected: number;
  nextId: number;
  /** Czas od ostatniego pojawienia się przedmiotu (ms); zebranie cofa go tak, by do następnego było ≥ AFTER_COLLECT_MS. */
  sinceSpawn: number;
  lastLetter: string | null;
  /** Litery rozwiązane „razem” — wrócą później w rundzie (Z-19). */
  again: string[];
  /** Ograniczony ruch (Z-05): przedmiot pojawia się od razu na końcu toru i nie przesuwa się. */
  still: boolean;
}

/** `lanes` — liczba torów wg szerokości sceny (co najmniej maxActive, więc zawsze jest wolny tor). */
export function createState(level: number, lanes: number, still = false): GameState {
  const params = levelParams(level);
  return {
    params,
    lanes: Math.max(lanes, params.maxActive),
    items: [],
    collected: 0,
    nextId: 1,
    sinceSpawn: params.spawnEveryMs, // pierwszy przedmiot od razu
    lastLetter: null,
    again: [],
    still,
  };
}

/** Losuje literę: nie taką, która już jest na ekranie, i (jeśli się da) nie taką jak poprzednia. */
export function pickLetter(rng: Rng, pool: readonly string[], onScreen: readonly string[], last: string | null): string {
  const notOnScreen = pool.filter((l) => !onScreen.includes(l));
  const fresh = notOnScreen.filter((l) => l !== last);
  if (fresh.length > 0) return rng.pick(fresh);
  if (notOnScreen.length > 0) return rng.pick(notOnScreen);
  return rng.pick(pool);
}

/** Losuje wolny tor (bez innego przedmiotu). Wolny tor jest zawsze, bo lanes ≥ maxActive. */
export function pickLane(rng: Rng, lanes: number, items: readonly Item[]): number {
  const taken = new Set(items.map((i) => i.lane));
  return rng.pick(Array.from({ length: lanes }, (_, i) => i).filter((i) => !taken.has(i)));
}

/** Ile przedmiotów jeszcze może się pojawić, żeby nie przekroczyć celu rundy. */
export function remainingToSpawn(state: GameState): number {
  return Math.max(0, state.params.goal - state.collected - state.items.length);
}

export interface StepEvents {
  spawned: Item[];
  landed: Item[];
  /** Zwierzątka, które same odeszły (AUTO_LEAVE_MS) — liczą się jako zebrane. */
  left: Item[];
}

/** Przesuwa świat o `dtMs` ms czasu gry. Mutuje stan, zwraca zdarzenia dla widoku. */
export function step(state: GameState, dtMs: number, rng: Rng): StepEvents {
  const events: StepEvents = { spawned: [], landed: [], left: [] };
  const dy = dtMs / (state.params.fallSeconds * 1000);

  for (const item of state.items) {
    if (item.stage === 'open') {
      item.openMs += dtMs; // otwarte zwierzątko stoi i czeka
      if (item.openMs >= AUTO_LEAVE_MS) events.left.push(item);
    } else if (!item.landed) {
      item.y = Math.min(1, item.y + dy);
      item.landed = item.y >= 1;
      if (item.landed) events.landed.push(item);
    }
  }
  for (const item of events.left) collect(state, item);

  state.sinceSpawn += dtMs;
  const canSpawn =
    state.items.length < state.params.maxActive &&
    remainingToSpawn(state) > 0 &&
    state.sinceSpawn >= state.params.spawnEveryMs;
  if (canSpawn) events.spawned.push(spawn(state, rng));
  return events;
}

function spawn(state: GameState, rng: Rng): Item {
  const onScreen = state.items.map((i) => i.letter);
  const comeback = state.again.findIndex((l) => !onScreen.includes(l));
  const letter =
    comeback >= 0
      ? (state.again.splice(comeback, 1)[0] ?? '')
      : pickLetter(rng, state.params.letters, onScreen, state.lastLetter);
  const item: Item = {
    id: state.nextId++,
    letter,
    lane: pickLane(rng, state.lanes, state.items),
    y: state.still ? 1 : 0,
    stage: 'closed',
    landed: state.still,
    openMs: 0,
  };
  state.items.push(item);
  state.lastLetter = letter;
  state.sinceSpawn = 0;
  return item;
}

function collect(state: GameState, item: Item): void {
  state.items = state.items.filter((i) => i !== item);
  state.collected += 1;
  state.sinceSpawn = Math.min(state.sinceSpawn, state.params.spawnEveryMs - AFTER_COLLECT_MS);
}

/** Wynik akcji dziecka. 'none' = nic się nie dzieje (ani sukces, ani błąd). */
export type HitResult =
  | { kind: 'open'; item: Item }
  | { kind: 'collect'; item: Item }
  | { kind: 'miss' }
  | { kind: 'none' };

/** Zadanie: najstarszy (więc najniżej położony) zamknięty przedmiot. Na nim stoi karta-wzór i podpowiedź. */
export function target(state: GameState): Item | null {
  return state.items.find((i) => i.stage === 'closed') ?? null;
}

/**
 * Trafienie przedmiotu bez warunku: zamknięty → otwiera się, otwarty (po MIN_OPEN_MS) → zebrany.
 * Nieeksportowane: trafienie zawsze idzie przez warunek trybu (tapItem / pressLetter / solveTogether).
 */
function hitItem(state: GameState, id: number): HitResult {
  const item = state.items.find((i) => i.id === id);
  if (!item) return { kind: 'none' };
  if (item.stage === 'closed') {
    item.stage = 'open';
    item.openMs = 0;
    return { kind: 'open', item };
  }
  if (item.openMs < MIN_OPEN_MS) return { kind: 'none' };
  collect(state, item);
  return { kind: 'collect', item };
}

/**
 * Dotyk: zalicza się tylko przedmiot-zadanie (ta sama litera co na karcie); inny zamknięty = błąd.
 * Tylko w trybie dotyku — na klawiaturze stuknięcie myszą niczego nie zalicza (zadaniem jest klawisz, Z-21).
 */
export function tapItem(state: GameState, id: number): HitResult {
  const item = state.items.find((i) => i.id === id);
  if (item && item.stage === 'closed' && item !== target(state)) return { kind: 'miss' };
  return hitItem(state, id);
}

/**
 * Klawiatura: dowolna litera widoczna na ekranie zalicza swój przedmiot (zadaniem jest znaleźć ją
 * na klawiszach). Litery na ekranie się nie powtarzają, więc cel jest jednoznaczny. „A” nie trafia „Ą”.
 */
export function pressLetter(state: GameState, letter: string): HitResult {
  const item = state.items.find((i) => i.letter === letter);
  return item ? hitItem(state, item.id) : { kind: 'miss' };
}

/** „Zróbmy razem” (Z-19, 3. błąd): gra sama otwiera zadanie, a jego litera wróci później w rundzie. */
export function solveTogether(state: GameState): HitResult {
  const item = target(state);
  if (!item) return { kind: 'none' };
  if (!state.again.includes(item.letter)) state.again.push(item.letter);
  return hitItem(state, item.id);
}

export function isComplete(state: GameState): boolean {
  return state.collected >= state.params.goal;
}
