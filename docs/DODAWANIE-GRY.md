# Dodawanie i zmiana gry

Przewodnik do pracy nad **jedną grą** w `src/games/<id>/`. Reguły designu Z-xx: `docs/ZASADY-DESIGNU.md`.
API nie jest tu kopiowane — źródłem prawdy są komentarze w kodzie:

| Plik | Co tam jest |
|---|---|
| `src/core/round/index.ts` | `runRound`, `createCoach`, `createCodeEntry` — warstwa rundy (podpowiedzi, błędy, koniec rundy); implementacja obok: `runRound.ts`, `coach.ts`, `coachCore.ts` (drabina, blokada, bezczynność) |
| `src/core/types.ts` | `GameManifest`, `GameContext` (`ctx`), intencje wejścia, `ctx.ui`, `ctx.clock`… |
| `src/core/styles/tokens.css` | kolory, rozmiary, czasy |
| `src/core/art/index.ts` | wspólne postacie i elementy SVG (`import { art } from '../../core/art'`) |
| `src/games-szablon/wzor/` | działająca gra-wzór „wybierz 1 z N” na `runRound` (z niej powstaje nowa gra) |
| `src/games/literki/` | gra-wzór z własną pętlą na `createCoach` |

Zmieniasz wyłącznie pliki w `src/games/<id>/`. Brakuje czegoś w rdzeniu (`src/core/`)? Nie dopisuj —
opisz brak w notatkach ticketu (zmiana rdzenia to osobny ticket platformy). Jedyny plik poza folderem gry,
który zmienia ticket gry, to status w `docs/KATALOG-GIER.md`.

## 1. Start

**Nowa gra — generator:**

```
npm run nowa-gra -- <id> "<Tytuł>" [obszar]
npm run nowa-gra -- kolory "Znajdź kolor" logika
```

- `id` = nazwa folderu = adres `/<id>/`: małe litery a-z, cyfry, pojedyncze myślniki; generator odrzuci id
  błędne, zajęte albo zarezerwowane. `obszar`: `litery | liczby | ksztalty | logika | pamiec`.
- Generator kopiuje szablon do `src/games/<id>/` i sam podmienia id (także w klasach `.g-<id>-…`), tytuł
  i obszar; miejsca do uzupełnienia ręcznie są oznaczone tekstem `PODMIEŃ`.
- Gra pojawia się w hubie sama (rejestr skanuje `src/games/*/manifest.ts`). Nie edytuj żadnej listy gier.

**Zmiana istniejącej gry:** zacznij od jej `README.md` (tam są decyzje właściciela i znane ograniczenia —
nie otwieraj ich na nowo) i `logic.test.ts`, dalej ta sama kolejność co niżej.

## 2. Który poziom API

**Kryterium: czy rundę da się opisać jako listę 5–10 zadań, z których każde ma jedną poprawną odpowiedź
podaną naraz?** Tak → `runRound`. Nie (ruch, plansza, wiele obiektów naraz, odpowiedź w kilku krokach)
→ `createCoach`.

- **`runRound(ctx, spec)`** — gra opisuje zadania (`tasks`), stałą scenę (`scene`, budowana raz) i treść
  jednego zadania (`show`); rdzeń robi resztę: kolejkę, sterowanie w obu trybach, drabinę podpowiedzi, powrót
  zadania po „zróbmy razem”, koniec rundy. `show` zwraca jeden z wariantów odpowiedzi: **wybór 1 z N**
  (`choose`, `correct`, opcjonalnie `letters`), **cyfry** (`digits`) albo **litera** (`letter`, `keys`).
- **`createCoach(ctx)`** — gra ma własną pętlę i stan, a trenerowi mówi tylko, co jest celem (`setTask`)
  i co się stało (`success`, `miss`, `finish`). Wpisywanie kodu cyfrowego w takiej grze: `createCodeEntry`.

## 3. Kolejność pracy

1. **`logic.ts` + `logic.test.ts`** — najpierw test, potem kod. Czyste funkcje bez DOM: `LEVELS`, generator
   zadań, reguły. Losowość tylko parametrem `rng: Rng` (w teście `createRng(seed)` z `core/util/rng`; gdy układ
   poziomu ma być zawsze ten sam, `createRng(seed)` także w `logic.ts`). Testuj właściwości każdego poziomu:
   runda ma 5–10 zadań (Z-23), każde zadanie ma poprawną odpowiedź w zakresie, to samo ziarno daje te same
   zadania. Wzór: `wzor/logic.test.ts`. Uruchamiaj: `npx vitest run src/games/<id>/`.
2. **`game.ts`** — scena i wiązanie z `runRound` albo `createCoach`. Importuje `./style.css`.
3. **`style.css`** — wygląd (pułapki niżej).
4. **`manifest.ts` i `README.md`** — `levels: LEVELS.length`; README według wzoru z sekcji 6.

## 4. Pułapki, których nie widać w typach

**Podpowiedzi**
- **Podpowiedzi dokładają potomka.** Poświata (1. błąd) i podpowiedź (2. błąd, bezczynność) to
  `<span class="mg-hint">` dopisany na końcu `question` / `target`. Te elementy muszą mieć `position: relative`
  (albo `absolute`), a ich style nie mogą zależeć od `:last-child` ani liczby dzieci.
- **Podaj `question`, jeśli scena ma osobne pytanie** (wzór, kupka orzeszków). Bez niego 1. błąd rozświetla
  od razu poprawną odpowiedź.
- **Klawisz-podpowiedź** (`.mg-hint--key`) stoi nad celem; gdy nad celem brak miejsca w scenie (72 px) — pod
  nim, a gdy i tam brak — na środku celu. Dziedziczy czcionkę rodzica: przy dużej czcionce celu wysoki wiersz
  tekstu go przesuwa — wtedy w CSS gry `.g-<id>-… > .mg-hint--key { display: flex; }`.
- **Wariant cyfr.** Rdzeń dokłada na końcu `question` pole odpowiedzi `.mg-code` (zmiennych `--mg-code-slot`
  i `--mg-code-gap` nie nadpisuj). Ile miejsca zostawić obok pola i jakie zaokrąglenie nadać `question`:
  komentarz `DigitsView` w `src/core/round/index.ts`.

**Runda**
- **Scena jest stała, wymienia się treść zadania (Z-02).** Tło i świat gry zbuduj raz w `scene(ctx)` i zwróć
  miejsca na treść; `show` podmienia w nich elementy (`miejsce.replaceChildren(...)`). Przenikaniem
  wprowadzaj tylko nowe elementy, nie tło.
- **Pauza po sukcesie: 1000 ms** czasu rzeczywistego, bez względu na tempo. Reakcja `solved` (≤ 800 ms, Z-20)
  musi się w niej zmieścić; gra pauzy nie wydłuża. Gra na `createCoach` bierze tę samą pauzę: `coach.afterPause(fn)`.
- **Błąd w kodzie gry zatrzymuje rundę** bez zaliczenia poziomu (`runRound` woła `ctx.fail`; lista przypadków:
  komentarz `RoundSpec`). Gra na `createCoach` woła `ctx.fail(error)` sama, gdy trafi w stan, z którego nie umie
  wyjść; zwykła pomyłka dziecka to `coach.miss`.
- **Elementów `choose` nie obsługuj sam** (własne kliknięcia dałyby podwójną odpowiedź) — robi to rdzeń.
  Klawisze liter też: gdy litera jest treścią zadania (Z-32), podaj `letters` — po jednej literze na element,
  w kolejności `choose`, bez powtórzeń. Zła liczba liter albo powtórzona litera kończy rundę błędem; dopilnuj
  tego w `logic.test.ts` (np. różne litery w każdym zadaniu).
- **`hero` / `finish({ icon })` to nie jeżyk.** Rdzeń sam stawia jeżyka na ekranie końca rundy, a bohatera gry
  obok niego (Z-16).
- **`createCoach`:** sprawdzaj `coach.locked` (i `coach.done`) **przed** oceną odpowiedzi; na wynik
  `'together'` z `coach.miss` gra musi od razu sama rozwiązać zadanie. Koniec rundy tylko przez `coach.finish`
  — bez własnych stałych czasu. `setTask` z tym samym `key` i nowym `target`/`question` przenosi widoczne
  wskazówki (drabina zostaje).
- **Ruch strzałkami:** strażnik wejścia nie limituje ruchu — gra z celem osiąganym krokami sama ogranicza ich
  tempo. Wzór: `labirynt` — po kroku kolejne ruchy odpadają przez 180 ms czasu gry (`ctx.clock.after`).
- **Zapis gry** (`ctx.storage.get`) nie sprawdza kształtu danych — waliduj je sama.

**Układ i CSS**
- **Skalowanie sceny:** `ctx.root` ma `container-type: size`, więc rozmiary pisz w `cqw`/`cqh` z dolnym progiem
  `max(var(--mg-touch-min), …)`; układ poziomy przez `@container (min-aspect-ratio: …)` (Z-34). Wzór:
  `wzor/style.css`.
- **Nie zakładaj „pion = wysoka scena”:** kontrolki ekranowe zabierają miejsce. Z klawiaturą 0–9 scena ma
  na telefonie 375 × 812 → 343 × 292 (szersza niż wyższa), 667 × 375 → 251 × 263, 812 × 375 → 396 × 263;
  ze strzałkami: 360 × 640 → 328 × 216, 667 × 375 → 347 × 263. Sprawdź grę w tych rozmiarach.
- **Ramka wyboru** (`focusGrid`) jest widoczna tylko po strzałkach i Spacji/Enterze (nie po literach
  i cyfrach); pierwsze takie naciśnięcie tylko ją odsłania. Nie stylizuj własnej ramki. Strzałki w bok działają w obrębie rzędu.
- **Cele dotykowe ≥ 80 px z odstępem ≥ 16 px** — tokeny `--mg-touch-min` i `--mg-touch-gap`; przy dolnej
  krawędzi pas `--mg-edge-safe` bez niczego klikalnego (Z-33).
- **Litery tylko przez `ctx.ui.letter`** (Z-35): krój i wielkość wybiera rodzic, rozmiar = `font-size` rodzica.
  Gra wymuszająca pisane: `cursive: true` w `RoundSpec` albo `await ctx.ui.lettersReady({ cursive: true })`.
- **CSS:** tylko klasy `.g-<id>-…` (lub `.g-<id> .mg-…`); kolory, czasy i promienie z tokenów — mieszanie przez
  `color-mix(in srgb, var(--mg-honey) 35%, var(--mg-surface))` jest dozwolone. `animation: … both` (albo
  `forwards`) trzyma `opacity`/`transform` elementu na zawsze — animację wejścia kładź na elemencie-dziecku
  albo bez `both`/`forwards`.
- **Grafika:** rysunki z `core/art` mają kolory wpisane na stałe (atrybut `style`) — nie przemalowuj ich z CSS gry
  (ani `!important`, ani `filter`).
  Własny rysunek (kształt, sylwetka, nowe zwierzątko) to plik w folderze gry: tekst SVG bez koloru, kolor
  nadaje `style.css` z tokenów (wzór: `wzor/shapes.ts`). Dopisanie rysunku do `core/art` to ticket platformy.
- **Skaner reguł** (`src/core/rules/gameRules.ts`) zatrzyma m.in.: `setTimeout`/`setInterval`, `Math.random`,
  `localStorage`, własny dźwięk i nasłuch klawiatury, `fetch` i adresy z sieci, kroje i kolory spoza tokenów,
  importy z rdzenia spoza listy i z innych gier. Komunikat mówi, czego użyć zamiast.

## 5. Sprawdzenie

1. **`npm run sprawdz-gre -- <id>`** — typy (cały projekt), testy gry, skaner reguł, manifest i liczba
   pozostałych `PODMIEŃ`.
2. **Przeglądarka:** `npm run dev` (w aplikacji desktop `preview_start` z konfiguracją `dev` z
   `.claude/launch.json`) → `http://localhost:5173/<id>/`. Przejdź rundę do ekranu końca:
   - klawiaturą (strzałki + Spacja/Enter, cyfry lub litery, jeśli są treścią zadania);
   - dotykiem w widoku 375 × 812 (`resize_window` z `preset: "mobile"`, potem przeładuj stronę — tryb dotyku
     wykrywa się przy starcie i tylko przy szerokości okna < 768 px; układ poziomy sprawdzaj jako układ);
   - trzy błędy pod rząd (poświata → paluszek/klawisz → „zróbmy razem”; co w danej grze liczy się jako błąd,
     mówi jej README), szybkie walenie w klawisze
     (nic się nie zalicza), konsola bez błędów.
3. **`npm run check`** — musi być zielony przed commitem.

Pomocne przy testach skryptem:
- Wiązanie gry z trenerem (`game.ts` na `createCoach`) nie ma testów automatycznych — testujesz logikę,
  a wiązanie sprawdzasz w podglądzie.
- Strażnik wstrzymuje odpowiedzi z klawiatury: odczekaj ≥ 350 ms po każdym klawiszu i ≥ 800 ms po błędzie.
- Konkretny poziom: `/<id>/?poziom=5` (opcjonalnie `&obrazki=<id skórki>`); parametr niczego nie zapisuje
  i zostaje w adresie po „Dalej” — to adres tylko do testów.
- Czas testów liczy się do limitu sesji (po ~15 min wchodzi „Jeżyk idzie spać”). Wyłączenie: panel rodzica
  → Limit sesji → Wyłączony, albo w konsoli:
  `const k='milegry:settings',o=JSON.parse(localStorage.getItem(k)||'{"v":1,"d":{}}');o.d.sessionLimit=0;localStorage.setItem(k,JSON.stringify(o));location.reload()`
- Schowany panel podglądu: zegar gry tyka normalnie, ale animacje CSS mogą stać — stan potwierdzaj odczytem
  DOM (`getBoundingClientRect`, klasy, tekst), nie zrzutem ekranu.

## 6. README gry — wzór

README opisuje stan obecny gry, bez historii zmian i bez tego, co daje rdzeń każdej grze (drabina
podpowiedzi, ekran końca rundy, komendy sprawdzania). Sekcje, w tej kolejności; puste pomiń:

1. **Nagłówek i 1–3 zdania:** co dziecko robi; na którym poziomie API stoi gra.
2. **Cel rozwojowy.**
3. **Mechanika** — tylko to, co własne tej gry (co jest pytaniem, co reakcją na sukces, co liczy się jako błąd).
4. **Poziomy** — tabela zgodna z `LEVELS`.
5. **Sterowanie** — tylko to, co nietypowe. **Skórki** — tabela, jeśli gra ma więcej niż jedną.
6. **Decyzje właściciela** — każda w 1–2 zdaniach: co i dlaczego. Nie otwieramy ich na nowo.
7. **Znane ograniczenia** — z liczbą tylko wtedy, gdy uzasadnia stałą w kodzie albo CSS.

## 7. Definicja ukończenia

- [ ] Zmiany tylko w `src/games/<id>/`; komplet plików (`manifest.ts`, `game.ts`, `logic.ts`, `logic.test.ts`,
      `style.css`, `README.md`); nie zostało żadne `PODMIEŃ`.
- [ ] `npm run sprawdz-gre -- <id>` i `npm run check` zielone; testy logiki obejmują każdy poziom.
- [ ] Przejście z sekcji 5 w obu trybach sterowania, także w układzie poziomym.
- [ ] „Lista kontrolna recenzji gry” z `docs/ZASADY-DESIGNU.md` przechodzi; ruch ma zastępstwo przy
      `prefers-reduced-motion` (Z-05; samo przenikanie osobnej reguły nie wymaga).
- [ ] Litery (jeśli są) sprawdzone w trybach „tylko drukowane”, „drukowane + pisane”, „pisane” i małymi
      literami (Z-35); diakrytyki nie są wymagane na poziomach domyślnych (Z-31).
- [ ] `README.md` gry opisuje stan obecny; status w tabeli gier w `docs/KATALOG-GIER.md` (kolumna „Status”; nowa gra dopisuje swój wiersz): `w budowie` w trakcie prac,
      `gotowa` po recenzji i commicie.
