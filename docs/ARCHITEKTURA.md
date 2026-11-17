# Architektura platformy Miłe Gry

Mapa rdzenia i decyzje, których nie widać w kodzie (dlaczego tak). Sygnatury API są w kodzie:
`src/core/types.ts` (kontrakt gra ↔ rdzeń) i `src/core/round/index.ts` (warstwa rundy). Jak pisać grę:
`docs/DODAWANIE-GRY.md`.

**Zmiana kontraktu** to każda zmiana tego, co widzi gra: typów w tych dwóch plikach (także nowe pole
opcjonalne), zachowania opisanego w ich komentarzach albo listy dozwolonych importów. Idzie przez ticket
platformy i w tym samym commicie aktualizuje komentarze typów, pasujący akapit tego dokumentu i — jeśli gry
mogą się na niej potknąć — pułapki w `docs/DODAWANIE-GRY.md`.

## Cele

1. **Statyczny wynik.** `npm run build` → `dist/` na zwykły hosting (Apache), bez backendu i bez zapytań
   sieciowych w działającej grze (Z-26): kroje i grafika są w buildzie, dźwięk powstaje w Web Audio.
2. **Gra = jeden folder** `src/games/<id>/` — agenci pracujący nad różnymi grami nie wchodzą sobie w drogę.
3. **Logika oddzielona od widoku:** czyste funkcje w `logic.ts`, testowane bez DOM.
4. **Gra reaguje na intencje, nie na zdarzenia:** klawiaturę i dotyk tłumaczy rdzeń.
5. **Miły design z rdzenia:** paleta, kroje, tempo, dźwięk, podpowiedzi, koniec rundy, wyjście z gry
   i limit sesji są wspólne, więc gra jest spokojna domyślnie.

## Stos

Vite + TypeScript (`strict`), bez frameworka UI i bez zależności runtime; DOM + inline SVG + CSS z tokenami
`--mg-*`; Vitest. Kroje (SIL OFL, z paczek `@fontsource/*`): Andika (interfejs, litery drukowane),
Playwrite PL (litery pisane). Wersje: `package.json`.

## Mapa `src/core/`

```
types.ts      kontrakt gra ↔ rdzeń
registry.ts   odkrywanie gier (import.meta.glob), walidacja manifestu, AREAS, RESERVED_IDS
router.ts     adresy / , /<id>/ , /rodzice/ (History API, z adresem bazowym)
clock.ts      zegar gry: pauza i skala tempa
round/        warstwa rundy: runRound, createCoach, createCodeEntry (+ czyste coachCore, queue, codeBuffer)
shell/        powłoka: app (usługi), hub, gameFrame (ramka, cykl rund), session (ctx jednej rundy), sheet (okna),
              pickers, endScreens, levels, holdButton, pressFeedback, gate + parents (panel rodzica), playTime
input/        keyboard (klawisz → intencja), guard (strażnik), inputHub (stos odbiorców, Esc), gameInput (dotyk)
ui/           ctx.ui: controls (numPad, dPad, letterKeys), letters, effects (celebrate, wobble, hint), focusGrid
art/          wspólne sprite'y SVG
audio/        efekty Web Audio
storage/      storage (koperta localStorage), settings, progress, sessionTime
styles/       tokens.css (jedyne miejsce z kolorami, rozmiarami i czasami w CSS), fonts.css, base.css
util/         rng (z ziarnem), dom (h, svg), letters (alfabet, wybór kroju)
rules/        gameRules.ts — skaner reguł kodu gier
```

Poza rdzeniem: `src/games-szablon/wzor/` (szablon dla `npm run nowa-gra`; poza hubem i buildem, testowany
jak gra), `scripts/` (`postbuild`, `nowa-gra`, `sprawdz-gre`), `.claude/` (skille flow, agent `recenzent-gry`,
`launch.json` dla podglądu).

## Routing i build

- Jedna aplikacja: bundle startowy + leniwy chunk JS i CSS na grę. Manifesty ładują się przy starcie, każdy
  osobno; `game.ts` dopiero po wejściu do gry. Gra, której manifest się nie ładuje albo nie przechodzi
  walidacji, jest pomijana z `console.error` — hub i pozostałe gry działają.
- Adresy: `/` hub, `/<id>/` gra, `/rodzice/` panel rodzica; nieznany adres → hub.
- `scripts/postbuild.mjs` tworzy prawdziwe pliki `dist/<id>/index.html` i `dist/rodzice/index.html` (własny
  `<title>` i opis), więc serwer nie potrzebuje reguł przepisywania adresów; do tego `404.html`, `.htaccess`
  i `dist/licencje/`. Katalogi builda muszą być w `RESERVED_IDS` (postbuild to sprawdza).
- `dist/.htaccess` wysyła nagłówek `Content-Security-Policy`: wszystko tylko z własnego adresu (Z-26 — także
  przy pomyłce w grze). Jedyne poluzowanie to `'unsafe-inline'` dla atrybutów `style` (rysunki SVG wstawiane
  przez `innerHTML`). Polityka to stała `CSP` w `postbuild.mjs`, pilnowana testem. Podgląd deweloperski
  nagłówka nie wysyła — po zmianie polityki trzeba przejść gry na zbudowanym `dist/`.
- `MILEGRY_BASE` (domyślnie `/`, normalizowane do `/coś/`) — adres bazowy dla podkatalogu na serwerze;
  komendy dla każdej powłoki: `README.md`.

## Hub

- Jedna siatka wszystkich gier bez nagłówków obszarów: obszarami w kolejności `AREAS`, w obszarze według
  `order`. Kafelek to obrazek z manifestu na tle w kolorze obszaru i tytuł; tytuł, nazwa obszaru, opis
  i dopisek o trybie sterowania są w etykiecie dla czytników ekranu. Gra niedostępna w bieżącym trybie ma
  przygaszony obrazek z dopiskiem („z klawiaturą” / „na dotyk”) na obrazku, więc widać go także bez tytułu.
- Kafelek gry działającej w bieżącym trybie „wciska się” od dotknięcia do puszczenia (`shell/pressFeedback.ts`
  daje klasę `mg-pressed`, bo samo `:active` na dotyku bywa zawodne); zsunięcie palca puszcza. Wygląd
  i czasy z tokenów są w `hub.css`; przy „ogranicz ruch” bez przesunięcia (Z-05). Przygaszony kafelek się
  nie wciska.
- Tytuły pod obrazkami są widoczne tylko wtedy, gdy kafelek z tytułami ma co najmniej `titleMinTile`
  szerokości (dwa wiersze czytelnym pismem; próg jest wyższy niż 80 px), w pionie i w poziomie. Inaczej
  (telefon w poziomie, mały telefon w pionie przy 10–12 grach) → same obrazki, które dostają miejsce po
  tytułach. Decyduje funkcja układu (`titles`); widok tylko ukrywa tytuł.
- Nagłówek to pas wysokości przycisku „Dla rodziców” (80 px), tak samo w pionie i w poziomie: jeżyk
  z napisem „Miłe Gry” wyśrodkowany w miejscu obok przycisku, przycisk-ikonka w prawym górnym rogu,
  16 px nad siatką. Wejście przez przytrzymanie 2 s, potem bramka (Z-29); napis „Dla rodziców” jest
  w etykiecie dla czytników ekranu. Hub nie ma stopki. Przycisk jest w `focusGrid` razem z kafelkami,
  więc strzałki prowadzą do niego z górnego rzędu i z powrotem (sąsiad wg położenia na ekranie).
- Układ jest ten sam na każdym urządzeniu (3 kolumny w pionie; w poziomie 5, a od 10 gier 6), większy ekran
  daje większe kafelki. Kolumny i bok kafelka liczy czysta funkcja `shell/hubLayout.ts` z rozmiaru okna
  (tam też wszystkie wymiary i odstępy); `hub.ts` podaje wynik do CSS w zmiennych `--mg-hub-*` i liczy go
  od nowa przy zmianie rozmiaru. Do 12 gier siatka mieści się bez przewijania od 375 × 667 w pionie
  i 667 × 375 w poziomie; na mniejszym ekranie kafelek zostaje przy 80 px (Z-33), a hub się przewija.
  Funkcja dostaje też bezpieczne marginesy (niżej), więc na telefonie z wycięciem liczy kafelek z miejsca,
  które naprawdę zostaje.

## Bezpieczne marginesy

- Hub i ramka gry odsuwają treść od wycięcia na aparat, zaokrąglonych rogów i paska systemu ze wszystkich
  czterech stron. Wartości dają zmienne `--mg-safe-top/right/bottom/left` w `styles/tokens.css`
  (`env(safe-area-inset-*)`; działają dzięki `viewport-fit=cover` w `index.html`). Na ekranie bez wycięcia
  są zerowe i układ jest taki sam jak bez nich. Hub i ramka biorą marginesy tylko z tych zmiennych, więc
  w podglądzie (który wycięcia nie ma) da się je zasymulować, nadpisując zmienne na `<html>`.
- Ramka gry (`shell/frame.css`): marginesy są wcięciem całej `.mg-frame`; pasek, scena i pas kontrolek
  zachowują w środku swoje odstępy (także pas `--mg-edge-safe` pod kontrolkami). Na telefonie z wycięciem
  scena w poziomie jest węższa o szerokość wycięcia.
- Ramka jest kontenerem zapytań (`container: mg-frame / size`), którego wymiary to ekran bez marginesów. Próg
  „małego telefonu w pionie” (zwarta klawiatura numeryczna 5 × 2 z klawiszami 64 px w `ui/ui.css` i węższe
  wcięcie pasa kontrolek w `shell/frame.css`, oba `@container mg-frame … (max-height: 760px)`) liczy się więc
  z wysokości użytecznej: 375 × 812 z wycięciem 47/34 px działa jak 375 × 731 bez wycięcia. Działa też przy
  zmiennych `--mg-safe-*` nadpisanych w podglądzie. Progi układu w poziomie (`max-height: 520px`) są nadal
  zapytaniami `@media` o okno, bo zmieniają siatkę samej ramki, a kontener nie może pytać o siebie. Skutek
  uboczny kontenera: ramka jest blokiem zawierającym dla okien (`sheet`, `position: fixed`) dołączanych do niej,
  a że zajmuje cały ekran, okna wyglądają tak samo; wysokość ramki nie może zależeć od treści.
- Wąski ekran w poziomie: przy pasie klawiatury numerycznej z klawiszami 80 px (384 px) pasek gry zawija się
  poniżej ok. 633 px szerokości użytecznej, a scena robi się za mała na treść. Dlatego poniżej 640 px szerokości
  użytecznej (np. 667 × 375 z wycięciem po bokach) klawiatura ma zwarte klawisze 64 px (Z-33) i pas ma 296 px —
  `@container mg-frame (max-width: 639.98px)` zagnieżdżone w progu poziomym (`ui/ui.css` i `shell/frame.css`).
  Bez wycięcia najwęższy telefon w poziomie (667 px) jest powyżej progu. dPad i klawisze liter się nie zmieniają.
- Hub (`shell/hub.css`): z boków i z góry margines dochodzi do zwykłych odstępów; z dołu siatkę odsuwa
  większa z wartości: pas `--mg-edge-safe` albo dolny margines (pas już omija pasek systemu, więc się nie
  sumują). `hub.ts` odczytuje marginesy w px z niewidocznej miarki (`.mg-hub__safe-probe`) i podaje je
  `computeHubLayout`, żeby gwarancja „bez przewijania” była liczona z miejsca poza marginesami; obrót
  telefonu zmienia marginesy i wywołuje przeliczenie (`resize`).

## Cykl życia gry

1. Hub → `gameFrame`: pasek (domek, poziom, skórka), wczytanie krojów z ustawień rodzica, leniwe załadowanie
   modułu gry.
2. `session` buduje `GameContext` (`ctx`) dla jednej rundy i woła `mount(ctx)`.
3. Gra kończy rundę przez `ctx.complete` (zwykle pośrednio: `runRound` / `coach.finish`). Rdzeń zapisuje
   postęp i pokazuje ekran końca rundy: jeszcze raz / dalej / do domu; nic nie startuje samo (Z-23, Z-24).
   „Dalej” pomija poziomy z `hardLevels` w bieżącym trybie sterowania.
4. `destroy()` gry, potem rdzeń czyści `root`, pas kontrolek, zegar, subskrypcje wejścia i kontrolki `ui`.

- **Błędy.** Wyjątek w `mount` albo `ctx.fail` (`runRound` woła je sam): rdzeń loguje błąd, niszczy sesję, nie
  zapisuje postępu i pokazuje spokojny ekran z drogą do domu. Ekran błędu pokazuje tego samego śpiącego jeżyka
  co koniec sesji — decyzja właściciela: dla dziecka oba znaczą „teraz nie gramy”, różnicę niesie napis dla
  rodzica. Wyjątek w callbacku zegara jest logowany i nie zatrzymuje zegara.
- **Limit sesji** jest sprawdzany tylko między rundami i przy wejściu do gry (Z-25): runda, w której limit
  minął, kończy się zwykłym „Brawo!”, a „Jeżyk idzie spać” pojawia się dopiero po wyborze kolejnej rundy.
- **Pauza zegara gry:** ukryta karta, utrata fokusu okna, otwarte okno rdzenia.

## Warstwa rundy

Podpowiedź przy bezczynności, drabina po błędach (Z-19), kołysanie (Z-18), blokada po błędzie (Z-21) i koniec
rundy są wspólne, żeby każda gra nie sklejała ich sama i inaczej. Dwa poziomy: `runRound` (gra opisuje
zadania, rdzeń robi resztę) i `createCoach` (gra z własną pętlą mówi trenerowi, co jest celem i co się stało).
Wszystko działa w ciszy i na czasie gry; logika trenera jest czysta (`coachCore.ts`). Stałe czasu (pauza między
zadaniami, blokada po błędzie, bezczynność) są w `coach.ts` i `coachCore.ts`; testy rundy używają atrapy `ctx`
z `fakeCtx.ts`.

Wybór 1 z N przyjmuje klawisz litery tylko wtedy, gdy gra poda literę każdego elementu (`letters` w `ChooseView`),
bo mapowanie elementów na klawisze wolno robić tylko tam, gdzie litera jest treścią zadania (Z-32). Klawisz litery
idzie wtedy do tej samej oceny co stuknięcie i Spacja, więc blokada po błędzie, pauza między zadaniami i drabina
działają bez osobnej ścieżki, a gra nie buduje własnego nasłuchu klawiszy. Zła litera to łagodny błąd, a nie cisza:
cisza odsuwałaby podpowiedź, bo każde naciśnięcie zeruje licznik bezczynności. Podpowiedź po 2. błędzie zostaje
paluszkiem (decyzja właściciela). Szczegóły zachowania: komentarz `ChooseView`.

## Wejście

- Gra dostaje intencje przez `ctx.input`; kontrolki ekranowe z `ctx.ui` emitują te same intencje.
- Tryb `auto` = `(pointer: coarse)` → dotyk, wykrywany przy starcie; rodzic może go wymusić.
- **Strażnik klawiatury** (`input/guard.ts`, Z-21) wstrzymuje odpowiedzi na krótką chwilę i odrzuca je w całości
  przy waleniu w klawisze. **Świadomie nie łapie** „wolnego walenia” (ok. 4–6 klawiszy/s — nie do odróżnienia
  od prób dziecka) ani ruchu strzałkami (musi działać od razu). Przed wolnym waleniem chroni blokada po błędzie
  w warstwie rundy (`coach.locked`).
- Dotyk: intencja `pointer` na `pointerdown` w elemencie z `data-target`; liczy się pierwszy palec, dotyk
  dłonią jest ignorowany.
- Ramka wyboru (`focusGrid`) i obrys fokusu przycisków są widoczne tylko po nawigacji klawiaturą
  (`data-last-input="keyboard"` na `<html>`): ustawiają go strzałki, Spacja/Enter i Tab przenoszący fokus poza grą, a nie litery, cyfry
  ani inne klawisze. Dziecko odpowiadające literą nie widzi wtedy ramki na elemencie, którego nie wybrało;
  pierwsza strzałka albo Spacja/Enter tylko odsłania ramkę. Wybór wskaźnikiem idzie tym samym kanałem co
  dotyk w grze i ustawia `pointer`.
- Wyjście z gry: przytrzymanie `Esc` albo domku (Z-28); `Esc` omija strażnika.
- Kontrolki trafiają do pasa obok sceny: w poziomie po prawej, w pionie pod sceną nad pasem bezpieczeństwa (Z-33).

## Zapis

- Klucze `milegry:<nazwa>`, wartość w kopercie `{"v":1,"d":…}`. Rdzeń: `settings`, `progress:<id>`, `session`,
  ostatnia gra w hubie; gra: `game:<id>:<klucz>` przez `ctx.storage`.
- Odczyt jest tolerancyjny: brak `localStorage` → magazyn w pamięci, uszkodzony JSON → wartość domyślna, błąd
  zapisu połknięty. Kształtu danych magazyn nie sprawdza — każdy czytelnik waliduje swoje dane pole po polu
  (`loadSettings`, `loadProgress`, gra), więc zmiana formatu jednego klucza nie kasuje pozostałych.
- Cisza ma jedną drogę: `muted` (Z-11); zapisaną głośność 0 `loadSettings` zamienia na wyciszenie.

## Reguły kodu gier

Wymusza je skaner `src/core/rules/gameRules.ts` (test skanuje `src/games/**`, szablon ma własny test): czas,
losowość, dźwięk, zapis i wejście tylko przez `ctx`; zero sieci; litery tylko przez `ctx.ui.letter`; CSS tylko
w klasach `.g-<id>…` i z tokenów; importy z rdzenia według list `ALLOWED_CORE_IMPORTS` i `LOGIC_CORE_IMPORTS`.
Skaner to linter typowych pomyłek, nie bariera — czego nie widzi (zrozumiałość bez czytania, brak kar, spokój
ruchu, oba tryby sterowania), sprawdza recenzja według `docs/ZASADY-DESIGNU.md`. `src/core/registry.test.ts`
pilnuje manifestu i kompletu plików każdej gry.
