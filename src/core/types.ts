/**
 * Typy kontraktu między rdzeniem a grami — źródło prawdy dla API.
 * Decyzje i mapa rdzenia: docs/ARCHITEKTURA.md; pułapki przy pisaniu gry: docs/DODAWANIE-GRY.md.
 * Runda (podpowiedzi, drabina Z-19, koniec rundy — runRound, createCoach): src/core/round/index.ts.
 */

// ---------------------------------------------------------------------------
// Manifest gry
// ---------------------------------------------------------------------------

/** Obszar rozwojowy — według niego hub grupuje kafelki. */
export type Area = 'litery' | 'liczby' | 'ksztalty' | 'logika' | 'pamiec';

/** Tryb sterowania. */
export type InputMode = 'keyboard' | 'touch';

export interface GameSkin {
  /** Identyfikator skórki (małe litery, cyfry, myślniki). */
  id: string;
  /** Nazwa wyświetlana w wyborze skórki (dla rodzica). */
  title: string;
  /** Ikonka (inline SVG) w wyborze skórki — dziecko wybiera po obrazku. */
  icon?: string;
}

export interface GameManifest {
  /** = nazwa folderu w src/games = adres URL (`/<id>/`). Tylko [a-z0-9-]. */
  id: string;
  /** Tytuł na kafelku i w ramce gry. */
  title: string;
  /** Jedno zdanie dla rodzica (też <meta description> strony gry). */
  description: string;
  area: Area;
  /** Wspierane tryby sterowania (co najmniej jeden). */
  input: InputMode[];
  /** Przedział wieku [od, do] w latach (informacja, nie blokada — Z-39). */
  age: [number, number];
  /** Inline SVG kafelka w hubie (np. wynik funkcji z core/art). */
  icon: string;
  /** Liczba poziomów (numerowane od 1). 0 = gra bez poziomów. */
  levels: number;
  /** Skórki (ta sama mechanika, inna grafika). Pierwsza jest domyślna. */
  skins?: GameSkin[];
  /** Kolejność w hubie (rosnąco, w obrębie obszaru). */
  order: number;
  /**
   * Poziomy oznaczone w wyborze poziomu jako „trudniejsze” w danym trybie
   * (np. polskie znaki wpisywane z AltGr na klawiaturze). Dostępne, ale opcjonalne.
   */
  hardLevels?: Partial<Record<InputMode, number[]>>;
}

// ---------------------------------------------------------------------------
// Moduł gry
// ---------------------------------------------------------------------------

export interface GameInstance {
  /** Sprzątanie gry. Rdzeń i tak czyści root, clock, input i kontrolki ui. */
  destroy(): void;
}

export interface GameModule {
  mount(ctx: GameContext): GameInstance;
}

/** Co gra przekazuje rdzeniowi po ukończeniu rundy (opcjonalnie). Bez punktów i gwiazdek (Z-17). */
export interface LevelResult {
  /** Inline SVG bohatera rundy (np. art.chick()) — pojawi się obok jeżyka na ekranie końca rundy. */
  icon?: string;
}

// ---------------------------------------------------------------------------
// Ustawienia (panel rodzica)
// ---------------------------------------------------------------------------

/** Tempo: spokojne / średnie / żwawe. Skaluje czas w ctx.clock. */
export type Tempo = 'calm' | 'medium' | 'lively';

/** Krój liter „do nauki”: tylko drukowane / drukowane + pisane do towarzystwa / pisane. */
export type LetterScriptSetting = 'print' | 'both' | 'cursive';
export type LetterScript = 'print' | 'cursive';
export type LetterCase = 'upper' | 'lower';
/** Rola litery: 'main' = zadanie, 'companion' = informacja zwrotna po sukcesie. */
export type LetterRole = 'main' | 'companion';

/** Limit sesji w minutach (0 = wyłączony). */
export type SessionLimit = 0 | 10 | 15 | 20 | 30;

export interface Settings {
  /** Globalne wyciszenie efektów. */
  muted: boolean;
  /** Głośność efektów, powyżej 0 do 1; cisza to `muted` (zapisane 0 `loadSettings` zamienia na wyciszenie). */
  effectsVolume: number;
  tempo: Tempo;
  /** 'auto' = wykryj (pointer: coarse → dotyk). */
  inputMode: 'auto' | InputMode;
  letterScript: LetterScriptSetting;
  letterCase: LetterCase;
  /** Imię dziecka (opcjonalne, tylko w tej przeglądarce). '' = brak. */
  childName: string;
  sessionLimit: SessionLimit;
}

// ---------------------------------------------------------------------------
// Wejście
// ---------------------------------------------------------------------------

export type Direction = 'up' | 'down' | 'left' | 'right';

export type Intent =
  /** Litera 'A'..'Ż' — zawsze WIELKA drukowana, z polskimi znakami ('A' ≠ 'Ą'). */
  | { type: 'letter'; value: string }
  /** Cyfra 0..9 (górny rząd i klawiatura numeryczna). */
  | { type: 'digit'; value: number }
  | { type: 'move'; dir: Direction }
  /** Spacja / Enter / przycisk OK. */
  | { type: 'confirm' }
  /** Backspace / przycisk „cofnij”. */
  | { type: 'erase' }
  /** Dotknięcie/kliknięcie elementu z atrybutem data-target wewnątrz ctx.root. x, y w px względem ctx.root. */
  | { type: 'pointer'; target: string; x: number; y: number };

export type IntentHandler = (intent: Intent) => void;

export interface GameInput {
  /** Rozstrzygnięty tryb sterowania (po autodetekcji i ustawieniu rodzica). */
  readonly mode: InputMode;
  /** Subskrypcja intencji. Zwraca funkcję wypisującą (rdzeń i tak wypisze wszystko po destroy). */
  on(handler: IntentHandler): () => void;
  /**
   * Czy przytrzymanie strzałki (klawisz albo przycisk dPad) ma powtarzać ruch — wolno, co 380 ms
   * czasu rzeczywistego. Domyślnie: nie (jeden ruch na jedno naciśnięcie). Powtarzanie nie zastępuje
   * ograniczenia tempa kroków po stronie gry (docs/DODAWANIE-GRY.md, pułapki).
   */
  setMoveRepeat(enabled: boolean): void;
}

// ---------------------------------------------------------------------------
// Dźwięk
// ---------------------------------------------------------------------------

export type SoundName =
  /** neutralne stuknięcie (naciśnięcie przycisku) */
  | 'tap'
  /** krok (ruch po planszy) */
  | 'step'
  /** miękkie „pyk” (coś się pojawia / pęka) */
  | 'pop'
  /** dobra odpowiedź */
  | 'good'
  /** neutralny, cichy ton „jeszcze nie” — nie jest dźwiękiem porażki (Z-09) */
  | 'soft-no'
  /** krótki ćwierk (zwierzątko) */
  | 'chirp'
  /** koniec rundy (woła rdzeń, nie gra) */
  | 'win';

export interface GameAudio {
  /**
   * Gra gotowy, łagodny efekt. Bezpieczne zawsze: przy wyciszeniu/braku Web Audio nic nie robi.
   * Gra musi być zrozumiała w ciszy — nie uzależniaj niczego od dźwięku (Z-10).
   */
  play(name: SoundName): void;
}

// ---------------------------------------------------------------------------
// Pamięć (localStorage w przestrzeni nazw gry)
// ---------------------------------------------------------------------------

export interface GameStorage {
  /**
   * Odczyt wartości; przy braku albo nieczytelnym zapisie zwraca fallback. Kształtu danych
   * rdzeń nie sprawdza — gra sama waliduje to, co odczytała (np. po zmianie formatu).
   */
  get<T>(key: string, fallback: T): T;
  /** Zapis wartości (musi dać się zserializować do JSON). Błędy zapisu są połykane. */
  set<T>(key: string, value: T): void;
  remove(key: string): void;
}

// ---------------------------------------------------------------------------
// Zegar
// ---------------------------------------------------------------------------

export type Cancel = () => void;

export interface Clock {
  /** Powtarza fn co `ms` milisekund czasu gry. */
  every(ms: number, fn: () => void): Cancel;
  /** Wywołuje fn raz po `ms` milisekundach czasu gry. */
  after(ms: number, fn: () => void): Cancel;
  /** Wywołuje fn w każdej klatce. dt = ms czasu gry od poprzedniej klatki (maks. 100 ms × tempo). */
  frame(fn: (dt: number, now: number) => void): Cancel;
  /** Obietnica rozwiązywana po `ms` czasu gry (nie rozwiąże się po zniszczeniu zegara). */
  wait(ms: number): Promise<void>;
  /** Czas gry w ms od startu (stoi na pauzie). */
  readonly now: number;
}

// ---------------------------------------------------------------------------
// Losowość
// ---------------------------------------------------------------------------

export interface Rng {
  /** Liczba z przedziału [0, 1). */
  next(): number;
  /** Liczba całkowita z przedziału [min, max] (włącznie). */
  int(min: number, max: number): number;
  /** Losowy element niepustej tablicy. */
  pick<T>(items: readonly T[]): T;
  /** Nowa, przetasowana kopia tablicy. */
  shuffle<T>(items: readonly T[]): T[];
  /** true z prawdopodobieństwem p. */
  chance(p: number): boolean;
}

// ---------------------------------------------------------------------------
// Kontrolki UI
// ---------------------------------------------------------------------------

/**
 * Kontrolka ekranowa. Trafia do pasa kontrolek ramki (obok albo pod sceną, nigdy przy dolnej
 * krawędzi). Klawisze mają ≥ 80 × 80 px i odstęp ≥ 16 px (Z-33), reagują od razu na dotknięcie;
 * liczy się tylko pierwszy palec.
 */
export interface Control {
  /** Główny element kontrolki. */
  readonly el: HTMLElement;
  show(): void;
  /** Ukrywa kontrolkę (np. na czas animacji) — niewidoczna i nieklikalna. */
  hide(): void;
  destroy(): void;
}

export interface NumPadOptions {
  /**
   * Cyfry na przyciskach w kolejności. Domyślnie 1..9 i 0 (układ 3 × 4 jak w telefonie: „cofnij”,
   * 0, „OK” w ostatnim rzędzie). Własna lista układa się po kolei w 3 kolumnach, „cofnij” i „OK” na końcu.
   */
  digits?: number[];
  /** Przycisk „cofnij” (intencja erase). Domyślnie false. */
  erase?: boolean;
  /** Przycisk „OK” (intencja confirm). Domyślnie false. */
  confirm?: boolean;
}

export interface DPadOptions {
  /** Środkowy przycisk OK (confirm). Domyślnie false. */
  confirm?: boolean;
}

export interface LetterKeysControl extends Control {
  /** Podmienia zestaw liter na przyciskach. */
  setLetters(letters: string[]): void;
}

export interface LetterOptions {
  /** 'main' (domyślnie) = zadanie; 'companion' = forma towarzysząca po sukcesie. */
  role?: LetterRole;
  /** Wymuszenie kroju (gry dopasowań pisana↔drukowana); pomija ustawienie rodzica. */
  script?: LetterScript;
  /** Wymuszenie wielkości; pomija ustawienie rodzica. */
  case?: LetterCase;
}

export interface CelebrateOptions {
  /** Miejsce efektu: element albo punkt (px względem ctx.root). Domyślnie środek sceny. */
  at?: HTMLElement | { x: number; y: number };
  /** Liczba listków (domyślnie 6, maks. 12 — Z-04). */
  count?: number;
}

export interface HintOptions {
  /** Element, przy którym pokazać podpowiedź (dostanie dziecko z podpowiedzią — musi mieć position). */
  target: HTMLElement;
  /**
   * 'auto' (domyślnie): klawiatura → klawisz `key` (jeśli podany), dotyk → paluszek.
   * 'tap' zawsze paluszek, 'key' zawsze klawisz, 'glow' tylko spokojna poświata wokół celu.
   */
  kind?: 'auto' | 'tap' | 'key' | 'glow';
  /** Napis na klawiszu, np. 'A', '3', '→', 'Spacja'. */
  key?: string;
}

export interface Hint {
  hide(): void;
}

export interface FocusGridOptions {
  /** Elementy do nawigacji (w kolejności czytania). */
  items: HTMLElement[];
  /** Liczba kolumn albo 'auto' (sąsiedzi wyznaczani z położenia na ekranie). Domyślnie 'auto'. */
  columns?: number | 'auto';
  /**
   * Zawijanie na krawędziach. Domyślnie false. Przy liczbie kolumn: we wszystkich kierunkach,
   * w obrębie rzędu/kolumny. Przy 'auto': tylko lewo/prawo, do pierwszego/ostatniego elementu listy.
   */
  wrap?: boolean;
  /** Indeks początkowy. Domyślnie środkowy element. */
  initial?: number;
  /** Wybór elementu: Spacja/Enter na zaznaczonym, klik/tap w element, cyfra (gdy `digits`). */
  onSelect: (index: number, el: HTMLElement) => void;
  /**
   * Wywoływane po zmianie zaznaczenia — także od razu przy tworzeniu (zanim focusGrid() zwróci
   * wynik) i po każdym setItems.
   */
  onFocus?: (index: number, el: HTMLElement) => void;
  /** Cyfry 1..9 wybierają element o tym numerze — tylko gdy cyfra jest treścią zadania (Z-32). */
  digits?: boolean;
  /** Klik/tap w element wybiera go. Domyślnie true. */
  pointer?: boolean;
}

export interface FocusGrid {
  /** Indeks zaznaczonego elementu (-1 gdy brak elementów). */
  readonly index: number;
  /** Zaznacza element o indeksie. */
  focus(index: number): void;
  /** Podmienia listę elementów (np. po przetasowaniu kart). */
  setItems(items: HTMLElement[], index?: number): void;
  /** Wyłącza/włącza obsługę (np. na czas animacji). */
  setEnabled(enabled: boolean): void;
  destroy(): void;
}

export interface Ui {
  /** Klawiatura numeryczna na ekranie (3 × 4) → intencje digit (+ erase/confirm). */
  numPad(options?: NumPadOptions): Control;
  /** Strzałki na ekranie → intencje move (+ confirm). Jedno naciśnięcie = jeden ruch; przytrzymanie powtarza ruch co 380 ms dopiero po setMoveRepeat(true). */
  dPad(options?: DPadOptions): Control;
  /** Przyciski z literami → intencje letter. Zawsze drukowane, wielkość wg ustawienia rodzica. */
  letterKeys(letters: string[]): LetterKeysControl;
  /**
   * Litera „do nauki” w kroju i wielkości wg ustawień rodzica (Z-35). Rozmiar = font-size rodzica.
   * Zwraca null dla roli 'companion', gdy rodzic wybrał „tylko drukowane”. Gdy krój pisany nie
   * jest wczytany (błąd, przekroczony czas), rysuje literę drukowaną — inny krój dałby zły kształt.
   * Twórz litery dopiero po lettersReady().
   */
  letter(char: string, options?: LetterOptions): HTMLElement | null;
  /**
   * Czeka (≤ 3 s), aż potrzebne kroje liter się wczytają; ramka wczytuje kroje z ustawień rodzica
   * przed startem gry, więc to zwykle chwila. `cursive: true` — gdy gra wymusza pisane.
   * Rozwiązuje się false, gdy potrzebny krój pisany się nie wczytał (ui.letter da wtedy drukowane).
   */
  lettersReady(options?: { cursive?: boolean }): Promise<boolean>;
  /**
   * Krótki, łagodny efekt radości (≤ 12 listków, ≤ 1,5 s). Kolejne wywołanie zastępuje trwający
   * efekt, więc na ekranie nigdy nie ma więcej niż 12 listków (Z-04). Obietnica rozwiązuje się,
   * gdy listki znikną (koniec animacji, zastąpienie albo sprzątanie) — czas zna tylko CSS.
   */
  celebrate(options?: CelebrateOptions): Promise<void>;
  /**
   * Łagodne kołysanie elementu po błędzie (Z-18: 2 wahnięcia, ≤ 8 px, ~400 ms); element zostaje
   * na miejscu. Przy ograniczonym ruchu — krótkie przygaszenie. Ponowne wywołanie zaczyna od nowa.
   * Kołysze właściwością CSS `translate`, `transform` elementu zostaje nietknięty.
   */
  wobble(el: HTMLElement): void;
  /** Podpowiedź bez słów: spokojnie „oddychający” paluszek, klawisz albo poświata. */
  hint(options: HintOptions): Hint;
  /** Ramka-wyróżnienie przesuwana strzałkami + Spacja/Enter (oraz tap) — wybór 1 z N (Z-32). */
  focusGrid(options: FocusGridOptions): FocusGrid;
}

// ---------------------------------------------------------------------------
// Kontekst gry
// ---------------------------------------------------------------------------

export interface GameContext {
  /** Element, w którym gra buduje scenę (ma klasę g-<id>; rdzeń czyści go po destroy). */
  readonly root: HTMLElement;
  readonly manifest: GameManifest;
  /** Wybrany poziom (od 1; 0 gdy gra nie ma poziomów). */
  readonly level: number;
  /** Id wybranej skórki ('' gdy gra nie ma skórek). */
  readonly skin: string;
  /** Ustawienia rodzica (tylko do odczytu). Kroju liter nie wybieraj sam — użyj ui.letter. */
  readonly settings: Readonly<Settings>;
  /** true, gdy system prosi o ograniczenie ruchu (prefers-reduced-motion) — ruch zastąp przenikaniem. */
  readonly reducedMotion: boolean;
  readonly input: GameInput;
  readonly audio: GameAudio;
  readonly storage: GameStorage;
  readonly ui: Ui;
  readonly clock: Clock;
  readonly rng: Rng;
  /**
   * Zgłasza ukończenie rundy. Rdzeń zapisuje postęp i pokazuje spokojny ekran końca rundy.
   * Ekran otwiera się asynchronicznie (mikrozadanie), więc kod gry po wywołaniu dokańcza się normalnie.
   * Kolejne wywołania są ignorowane, tak samo wywołanie po destroy().
   */
  complete(result?: LevelResult): void;
  /**
   * Wyjście awaryjne: gra jest w stanie, z którego nie umie wyjść (wyjątek, dane bez sensu, zasób,
   * którego brakuje). Rdzeń loguje `error` w konsoli (z id gry), zatrzymuje sesję (zegar, czas gry,
   * wejście), NIE zapisuje postępu i pokazuje spokojny ekran błędu z drogą do domu.
   * `runRound` woła je sam przy błędzie w grze; gra na `createCoach` — gdy sama trafi w taki stan.
   * To NIE jest sposób na zwykłą pomyłkę dziecka: ta ma iść przez `coach.miss` (kołysanie, podpowiedzi).
   * Pierwsze z `complete` / `fail` wygrywa; kolejne wywołania i wywołania po destroy() są ignorowane.
   * Ekran otwiera się asynchronicznie (mikrozadanie), tak jak przy `complete`.
   */
  fail(error?: unknown): void;
}
