/**
 * Runda — wspólne zachowanie gier, żeby gra nie sklejała go sama: podpowiedź przy bezczynności,
 * drabina podpowiedzi po błędach (Z-19), kołysanie (Z-18), blokada po błędzie (Z-21), koniec rundy.
 * Wszystko działa w ciszy (Z-10) i na czasie gry (ctx.clock), bez setTimeout.
 *
 * Dwa poziomy — wybierz jeden:
 *
 * 1. `runRound(ctx, spec)` — gra „rozwiąż 5–10 zadań po kolei” (okienka, orzeszki, imię…).
 *    Gra opisuje zadania, stałą scenę i treść jednego zadania, rdzeń robi całą resztę:
 *
 *      const spec: RoundSpec<Task, { wall: HTMLElement; shutter: HTMLElement }> = {
 *        tasks: (ctx) => createTasks(ctx.level, ctx.rng),      // logic.ts
 *        scene(ctx) {                                          // RAZ: tło, domek, wiewiórka
 *          ctx.root.append(h('div', { class: 'g-x-scene' }, [house, yard]));
 *          return { wall, shutter };                           // miejsca na treść zadania
 *        },
 *        show(ctx, task, { wall, shutter }) {                  // co zadanie: tylko treść
 *          wall.replaceChildren(...windows);
 *          return { choose: windows, correct: task.answer, question: shutter, solved: () => … };
 *        },
 *        hero: () => art.squirrel(),
 *      };
 *      export default { mount: (ctx) => runRound(ctx, spec) } satisfies GameModule;
 *
 * 2. `createCoach(ctx)` — gra z własną pętlą (spadające literki, labirynt, pary).
 *    Gra mówi trenerowi, co jest celem i co się stało; trener pokazuje podpowiedzi:
 *
 *      const coach = createCoach(ctx);
 *      coach.setTask({ key: item.id, target: itemEl, hintKey: 'M' });   // można co klatkę
 *      if (coach.locked) return;                                        // przed oceną odpowiedzi
 *      coach.success();                                                 // dobra odpowiedź
 *      if (coach.miss(wrongEl) === 'together') solveItTogether();       // zła odpowiedź
 *      coach.finish({ icon: art.chick() });                             // koniec rundy
 */
import type { Cancel, GameContext, LevelResult } from '../types';

// ---------------------------------------------------------------------------
// createCoach
// ---------------------------------------------------------------------------

export interface CoachTask {
  /** Tożsamość zadania. Inny key = nowe zadanie: drabina i licznik bezczynności od zera. */
  key: string | number;
  /**
   * Poprawna odpowiedź — przy nim pojawia się podpowiedź: paluszek (dotyk) albo klawisz z napisem
   * `hintKey` (klawiatura). Element musi mieć CSS position (relative/absolute).
   */
  target: HTMLElement;
  /** Napis na klawiszu-podpowiedzi, np. 'M', '3', '→'. Bez niego także na klawiaturze jest paluszek. */
  hintKey?: string;
  /**
   * Obiekt pytania, np. kształt do dopasowania albo kupka orzeszków. Po 1. błędzie spokojnie
   * „oddycha” poświatą (Z-19: pokaż polecenie jeszcze raz). Domyślnie `target` — wtedy już 1. błąd
   * wyróżnia odpowiedź, więc podaj go, jeśli scena ma osobne pytanie.
   *
   * Uwaga: poświata i podpowiedź to dodatkowy potomek dokładany NA KOŃCU elementu (`question`
   * albo `target`): `<span class="mg-hint …" aria-hidden="true">`, pozycjonowany absolutnie,
   * nieklikalny, usuwany po sukcesie / zmianie zadania. Element musi mieć CSS position, a jego
   * style nie mogą zależeć od :last-child ani od liczby dzieci. (Wariant „klasa na samym elemencie”
   * odrzucony: zderzałby się z ramką fokusu (outline), kołysaniem (animation) i cieniami gry.)
   */
  question?: HTMLElement;
}

/** Co trener zrobił z błędem (wynik `coach.miss`). */
export type MissOutcome =
  /** Nic: trwa blokada po błędzie, nie ma zadania albo runda się skończyła. Nie zmieniaj stanu gry. */
  | 'ignored'
  /** 1. błąd: kołysanie i poświata obiektu pytania. */
  | 'glow'
  /** 2. błąd: wyraźna podpowiedź (klawisz albo paluszek) przy poprawnej odpowiedzi. */
  | 'hint'
  /**
   * 3. błąd: „zróbmy razem”. Gra ma TERAZ sama rozwiązać zadanie na oczach dziecka (np. otworzyć
   * jajko) i może dać je później jeszcze raz. Drabina zaczyna się od nowa.
   */
  | 'together';

export interface Coach {
  /** Bieżące zadanie; null = nie ma nic do zrobienia. Wołanie z tym samym `key` nic nie zeruje. */
  setTask(task: CoachTask | null): void;
  /**
   * Zła odpowiedź: `wrongEl` łagodnie się kołysze, cichy neutralny ton, szczebel drabiny w górę,
   * potem przez ~0,7 s `locked` = true. Bez żadnego komunikatu-kary.
   */
  miss(wrongEl?: HTMLElement): MissOutcome;
  /** Dobra odpowiedź: drabina od zera, podpowiedzi znikają. Dźwięk i reakcję sceny robi gra. */
  success(): void;
  /**
   * Woła `fn` po pauzie między zadaniami — tej samej co w runRound (1 s czasu rzeczywistego przy każdym
   * tempie, czas gry z ctx.clock). Zwraca Cancel; gra woła go w destroy.
   */
  afterPause(fn: () => void): Cancel;
  /**
   * true przez chwilę po błędzie i po `finish`. Sprawdź PRZED oceną odpowiedzi i wtedy jej nie
   * oceniaj — ani dobrej, ani złej (ochrona przed „wolnym waleniem” w klawisze).
   */
  readonly locked: boolean;
  /**
   * Koniec rundy: listki (ui.celebrate), a gdy opadną — ctx.complete(result). Czeka na koniec
   * animacji, więc gra nie potrzebuje własnych stałych czasu. Kolejne wywołania nic nie robią.
   */
  finish(result?: LevelResult): void;
  /** true po `finish`. */
  readonly done: boolean;
  /** Sprząta podpowiedzi i liczniki. Wywołania po destroy są bezpieczne i nic nie robią. */
  destroy(): void;
}

// ---------------------------------------------------------------------------
// createCodeEntry — wpisywanie cyfr z createCoach (np. kod bramy w labiryncie)
// ---------------------------------------------------------------------------
//
//   const entry = createCodeEntry(ctx, coach, {
//     key: 'brama-1', code: '4271', question: gateEl,
//     onAnswer(outcome) {
//       if (outcome === 'right' || outcome === 'together') { entry.destroy(); openGate(); }
//     },
//   });
//   gateEl.append(entry.field);

export interface CodeEntryOptions {
  /** Tożsamość zadania dla trenera (jak CoachTask.key) — createCodeEntry sam woła coach.setTask. */
  key: string | number;
  /** Poprawny kod: liczba naturalna albo same cyfry ('4271'). */
  code: number | string;
  /** Obiekt pytania (CoachTask.question), np. brama z narysowanym kodem. */
  question?: HTMLElement;
  /**
   * Cyfry na ekranowej klawiaturze (dotyk). Domyślnie 1–9 i 0. „Cofnij” jest przy kodach > 1 cyfry.
   * Muszą zawierać wszystkie cyfry kodu — inaczej createCodeEntry rzuca błąd (w każdym trybie).
   */
  keys?: number[];
  /**
   * Wpisano komplet cyfr. Ocenę zrobił już trener (createCodeEntry sam woła coach.success /
   * coach.miss(field)), tu tylko wynik:
   * - 'right' — dobrze;
   * - 'together' — 3. błąd (Z-19): pole pokazuje poprawny kod, gra kończy zadanie razem z dzieckiem;
   * - 'glow' / 'hint' / 'ignored' — błąd: pole kołysze się i czyści samo, gdy minie blokada.
   * Po 'right' i 'together' pole nie przyjmuje już cyfr.
   */
  onAnswer(outcome: 'right' | MissOutcome): void;
}

export interface CodeEntry {
  /** Duże pole z wpisanymi cyframi — wstaw je do sceny (musi być widoczne). */
  readonly field: HTMLElement;
  /** Przestaje przyjmować cyfry (pole zostaje; nieukończone/błędne cyfry znikają, poprawny kod zostaje). */
  stop(): void;
  /** stop() + usuwa klawiaturę ekranową. Pole w scenie sprząta gra (runRound robi to sam). */
  destroy(): void;
}

// ---------------------------------------------------------------------------
// runRound
// ---------------------------------------------------------------------------

interface TaskViewBase {
  /** Obiekt pytania — patrz CoachTask.question. */
  question?: HTMLElement;
  /**
   * Reakcja sceny na rozwiązanie (≤ 800 ms, Z-20), np. okiennica zamyka okienko. Wołana po dobrej
   * odpowiedzi i przy „zróbmy razem”.
   *
   * Pauza do następnego zadania trwa 1000 ms czasu rzeczywistego (coach.afterPause; tempo z panelu rodzica
   * jej nie zmienia) i liczy się od wywołania `solved`. Cała reakcja musi się w niej zmieścić — potem
   * rdzeń od razu pokazuje następne zadanie. Gra tej pauzy nie wydłuża (nie ma na to pola w RoundSpec).
   */
  solved?: () => void;
}

/**
 * Wybór 1 z N: strzałki + Spacja/Enter albo stuknięcie (ctx.ui.focusGrid, Z-32), a gdy gra poda
 * `letters` — także klawisz litery.
 * Drabina (Z-19): 1. błąd — poświata `question` (bez niego: poprawnego elementu); 2. błąd — paluszek
 * wskazuje poprawny element (zawsze paluszek, także na klawiaturze i przy `letters`);
 * 3. błąd — „zróbmy razem”: ramka przeskakuje na poprawny element, woła się `solved`, a zadanie
 * wraca raz na koniec rundy.
 */
export interface ChooseView extends TaskViewBase {
  /**
   * Elementy do wyboru (w kolejności czytania). Rdzeń nadaje im role="button", a elementowi bez
   * żadnej nazwy (bez tekstu i aria-label, np. sam obrazek SVG) — aria-label „Odpowiedź N”.
   * Lepszą nazwę daj sam: `aria-label` na elemencie (np. 'koło').
   */
  choose: HTMLElement[];
  /** Indeks poprawnego elementu w `choose`. */
  correct: number;
  /**
   * Litera na każdym elemencie `choose`, w tej samej kolejności (np. ['a', 'm', 'ó'] dla żołędzi z tymi
   * literami). Tylko gdy litera jest treścią zadania (Z-32). Wielkość i krój bez znaczenia (klawisz „M”
   * wybiera element z „m”), ale 'A' ≠ 'Ą' (Z-31).
   *
   * Z `letters` klawisz litery to odpowiedź, tak jak stuknięcie albo Spacja (ta sama ocena, blokada po
   * błędzie i pauza między zadaniami): litera poprawnego elementu — dobrze; litera innego elementu —
   * błąd, kołysze się ten element; litera, której nie ma na żadnym elemencie — błąd, kołysze się
   * `question` (bez niego nic się nie kołysze, żeby nie wskazać odpowiedzi). Oba błędy idą w drabinę.
   * Wybór literą przenosi zaznaczenie na wybrany element jak stuknięcie, ale ramki nie odsłania
   * (odsłaniają ją tylko strzałki i Spacja/Enter). Bez `letters` klawisze liter w wyborze nic nie robią.
   *
   * Musi mieć tyle wpisów, ile `choose`, każdy to jedna litera i żadna się nie powtarza (bez względu na
   * wielkość) — inaczej błąd i koniec rundy (patrz RoundSpec).
   */
  letters?: string[];
}

/**
 * Odpowiedź cyframi: klawisze cyfr albo (dotyk) klawiatura numeryczna pod sceną. Rdzeń dokłada na
 * końcu `question` duże pole z wpisanymi cyframi (klasa mg-code) i ocenia SAM, gdy wpisano tyle
 * cyfr, ile ma odpowiedź — bez Entera. Jedna cyfra = jedno naciśnięcie. Backspace / „cofnij”
 * kasuje ostatnią cyfrę. Błąd: pole się kołysze i czyści. 3. błąd: pole pokazuje poprawną odpowiedź.
 *
 * Gdzie co się pojawia (gra niczego z tego nie buduje):
 * - pole odpowiedzi (`span.mg-code`, kwadratowa kratka na cyfrę: 40–80 px zależnie od szerokości
 *   sceny i liczby cyfr, zmienne CSS `--mg-code-slot` i `--mg-code-gap`) — ostatnie dziecko `question`;
 * - klawisz-podpowiedź na klawiaturze (`.mg-hint--key`, z napisem następnej cyfry, a gdy wpisane cyfry
 *   nie są początkiem odpowiedzi — „⌫”) — potomek pola, wyświetlany z jego PRAWEJ strony (left: 100% +
 *   odstęp); zostaw tam ~76 px wolnego miejsca — gdy go brak, rdzeń stawia klawisz pod polem,
 *   a w ostateczności na nim;
 * - poświata 1. błędu (`.mg-hint--glow`) — ostatnie dziecko `question`, ma jego zaokrąglenie
 *   (border-radius: inherit), więc nadaj `question` własny `border-radius`;
 * - dotyk: zamiast klawisza — paluszek (`.mg-hint--tap`) przy właściwej cyfrze klawiatury ekranowej
 *   (przy złym początku odpowiedzi — przy „Cofnij”);
 *   klawiatura leży w pasie kontrolek ramki (pod sceną, a na niskim ekranie poziomo po jej prawej
 *   stronie, 4 kolumny × 3 rzędy), więc scena ma mniej miejsca.
 */
export interface DigitsView extends TaskViewBase {
  /** Poprawna odpowiedź: liczba naturalna (7, 10) albo kod z cyfr ('0427' — zera z przodu się liczą). */
  digits: number | string;
  /**
   * Cyfry na ekranowej klawiaturze (dotyk), np. [1, 2, 3] dla zakresu „do 3”. Domyślnie 1–9 i 0.
   * Muszą zawierać cyfry odpowiedzi (sprawdzane w każdym trybie — inaczej błąd i koniec rundy).
   */
  keys?: number[];
  /** Wymagany: tu trafia pole odpowiedzi, a na 1. błąd ten element spokojnie „oddycha”. */
  question: HTMLElement;
}

/**
 * Odpowiedź literą: klawisz litery albo (dotyk) przyciski z literami pod sceną. 3. błąd: przez pauzę
 * przed następnym zadaniem widać właściwy klawisz (klawiatura) albo paluszek przy przycisku (dotyk).
 */
export interface LetterView extends TaskViewBase {
  /** Poprawna litera ('M'; wielkość bez znaczenia, 'A' ≠ 'Ą'). */
  letter: string;
  /** Litery na przyciskach ekranowych (dotyk) — muszą zawierać `letter` (sprawdzane w każdym trybie). */
  keys: string[];
  /** Wymagany: nad nim pojawia się klawisz-podpowiedź na klawiaturze. */
  question: HTMLElement;
}

/** Co zwraca `show`: elementy sceny i poprawna odpowiedź. */
export type TaskView = ChooseView | DigitsView | LetterView;

/**
 * `T` — zadanie (z logic.ts); `S` — miejsca stałej sceny, które zwraca `scene` (np. { wall, shutter }).
 *
 * Błąd w grze nie zawiesza rundy: wyjątek w tasks / scene / show (także zła odpowiedź: `correct`
 * spoza `choose`, `letters` niezgodne z `choose`, cyfra lub litera spoza `keys`, pusta lista zadań) kończy
 * rundę przez ctx.fail: błąd trafia do console.error, poziom NIE jest zaliczany (bez listków i bez
 * ctx.complete), a dziecko widzi spokojny ekran błędu z drogą do domu. Wyjątek w `solved` jest tylko logowany.
 */
export interface RoundSpec<T, S = void> {
  /** Zadania rundy, 5–10 (Z-23) — zwykle z logic.ts. Zadanie rozwiązane „razem” wróci raz na koniec. */
  tasks(ctx: GameContext): T[];
  /**
   * Stała scena rundy (Z-02), budowana RAZ przed pierwszym zadaniem: tło, układ, postaci, kafelki
   * na treść zadania. Dołóż ją do ctx.root i zwróć miejsca, w które `show` wstawia treść zadania —
   * rdzeń poda je do każdego `show`. Ze sceną rdzeń niczego w ctx.root nie czyści.
   */
  scene?(ctx: GameContext): S;
  /**
   * Treść jednego zadania i co jest odpowiedzią.
   * - Ze `scene`: wymień treść w miejscach sceny (`miejsce.replaceChildren(...nowe)`); tło stoi.
   *   Przenikaniem (CSS) niech wchodzą tylko nowe elementy, nie scena.
   * - Bez `scene`: rdzeń czyści ctx.root przed każdym show, więc tylko dokładaj (ctx.root.append) —
   *   ale wtedy co zadanie powstaje od nowa całe tło; to tylko dla scen bez tła i dekoracji.
   * Pole cyfr (DigitsView), podpowiedzi i ramkę wyboru sprząta rdzeń.
   */
  show(ctx: GameContext, task: T, scene: S): TaskView;
  /** Inline SVG bohatera ekranu końca rundy (np. art.squirrel()). */
  hero?: () => string;
  /**
   * Gra wymusza litery pisane (ui.letter z script: 'cursive') — runda poczeka na ten krój przed
   * pierwszą sceną. Gdy się nie wczyta (≤ 3 s), runda NIE startuje: kończy się przez ctx.fail, bez
   * zaliczenia poziomu (zamiast zadań z literami drukowanymi w miejsce pisanych). Bez tego pola pierwsza
   * scena powstaje od razu (kroje z ustawień rodzica ramka wczytuje przed startem gry).
   */
  cursive?: boolean;
}

export { createCoach } from './coach';
export { createCodeEntry } from './codeEntry';
export { runRound } from './runRound';
