---
status: zrobione
kto: agent
zalezy-od: ["04"]
prd: docs/prd/konkurs-matematyczny.md
historyjki: [4, 7]
---

# 05 — Poziom 3

## Co zbudować

Gra dostaje poziom 3 (zakres do około 30) z 16 własnymi zadaniami według wiersza poziomu 3 w tabeli
poziomów (sekcja 4 PRD): ciągi o rosnącym kroku, rosnące figury (trójkąt, kwadrat, krzyżyk),
piramidka z niewiadomą na górze, dwie litery w jednym zapisie, znaki przy czterech liczbach, tarcza
z 4–5 trafieniami i szachownica. Większość typów korzysta z rysunków z poprzednich ticketów; nowe są
szachownica (karty z dwiema liczbami: pola ciemne i jasne) i figura-krzyżyk. Pula całej gry ma po tym
tickecie 50 zadań.

## Kryteria akceptacji

- [x] Manifest ma 3 poziomy; poziom 3 da się wybrać i przejść klawiaturą i dotykiem.
- [x] Test logiki: pula ma 50 zadań (17, 17, 16), liczby mieszczą się w zakresie swojego poziomu,
      wszystkie zadania przechodzą testy puli.
- [x] Runda poziomu 3 ma 7 różnych zadań co najmniej 4 typów.
- [x] Szachownica rozróżnia pola ciemne i jasne także wzorem lub obrysem, a jej karty są czytelne
      i mają nazwy dla czytników ekranu (np. „13 ciemnych i 12 jasnych”).
- [x] `npm run check` przechodzi.

## Jak sprawdzić

Automatycznie:
- `npm run sprawdz-gre -- konkurs-matematyczny`
- `npm run check`

Ręcznie (`npm run dev`, potem http://localhost:5173/konkurs-matematyczny/):
- Klawiatura: wybierz poziom 3 i przejdź trzy rundy.
- Dotyk (widok telefonu 375×812): przejdź rundę; tarcza z pięcioma trafieniami i szachownica są
  czytelne.
- Trzy błędy pod rząd przy szachownicy: poświata → paluszek → „zróbmy razem”.

## Notatki z realizacji

### 2026-11-18

**Co zrobiono**
- `logic.ts`: poziom 3 (`max: 30`, runda 7) z 16 własnymi zadaniami siedmiu typów: 3 × ciąg o rosnącym
  kroku, 3 × rosnące figury nazwane (`outline`: trójkąt-schodki z kółek, kwadrat z kółek, krzyżyk
  z kwadratów), 2 × piramidka 1–2–3 (nowe kółko `'blank'` — puste, do policzenia po drodze), 2 × dwie litery
  (nowy typ `twoLetters`: zapisy `sums` i litera `ask`), 2 × znaki przy czterech liczbach, 2 × tarcza
  (4–5 trafień), 2 × szachownica (nowy typ `chess`, karta = para „ciemne,jasne”, `pairOf`). Nowe:
  `solvedPyramid` (rozwiązanie do pokazania) i `targetLayout` — czysta geometria tarczy (pierścienie,
  czcionka, liczby, kropki). Manifest ma 3 poziomy (`LEVELS.length`).
- `logic.test.ts` (najpierw test, 192 testy gry): niezależne liczenie odpowiedzi nowych typów (ciąg:
  kroki zmieniają się o tyle samo; figury: test sam rysuje trójkąt/kwadrat/krzyżyk wielkości s, s+1, s+2
  i liczy pola wielkości s+3; piramidka: puste kółka liczone od dołu; dwie litery: przegląd wszystkich
  wartości 0..30 — dokładnie jedno rozwiązanie; szachownica: liczenie brakujących pól z parzystości
  wiersz + kolumna); pula 50 = 17, 17, 16; zakres 0..30 (także liczby na kartach-parach i w piramidce po
  drodze); reguły poziomu 3 (piramidka [1, 2, 3] z „?” na górze, znaki przy 4 liczbach, tarcza 4–5
  trafień, wszystkie trzy figury, co najmniej jedno „znaki” z dwoma minusami); test rundy (7 różnych,
  ≥ 4 typy, to samo ziarno) obejmuje poziom 3. Zadanie dodatkowe (b): `targetLayout` testowany dla tarcz
  z puli i 9 przypadków sztucznych (3–5 pierścieni, 5 kropek w zewnętrznym i w najwęższym pierścieniu,
  3 w środku przy 3 pierścieniach, 2 w środku przy 4–5): każda kropka w pasie swojego pierścienia z
  zapasem 3 jednostek, kropki nie nachodzą na siebie ani na pudełka liczb (liczonych w teście z czcionki),
  liczby mieszczą się w swoim pasie, kropka ma promień ≥ 9.
- `figures.ts`: tarcza rysowana z `targetLayout` (przy 4 pierścieniach węższe pasy: mniejsze środkowe koło
  i czcionka liczb dobrana do pasa); piramidka z pustymi kółkami (po rozwiązaniu dostają liczby, trzy rzędy
  mają mniejszy odstęp i wyższe pudełko); nowe rysunki „dwie litery” (trzy rzędy, litery przez
  `ctx.ui.letter`) i szachownica (SVG; ciemne pola z jasnymi ukośnymi paskami, brakujące — kreskowany
  obrys; obok dwa „?” przy ciemnym i jasnym kwadraciku); figury nazwane mają wysokie pudełko i podpisy
  rosnące z liczbą rzędów; ciąg ma `fitRow`. Zadanie dodatkowe (a): rząd „K + O + T = ?” ma własne
  dopasowanie szerokości (`fitInnerRow` + reguła `…-figure-row--fit`).
- `game.ts`/`style.css`: karta-para (dwie liczby, każda przy kwadraciku pola; nazwa dla czytnika
  `pairLabel`, np. „5 ciemnych i 4 jasne”, „3 ciemne i 5 jasnych”), karta z trzema znakami ma mniejszą
  czcionkę (`…-card--signs3`); kolory szachownicy z tokenów (ciemne: kora z wodą, paski: woda z kartką,
  jasne: piasek).
- `README.md` gry: nowe typy, poziom 3, zakres 0..30, opis `targetLayout`.

**Decyzje podjęte w trakcie**
- Zakres poziomu 3 = dokładnie 0..30 (pole `max`), także wyniki pośrednie.
- Szachownica: pytanie „Ile ciemnych i ile jasnych pól brakuje?” — dziecko musi wywnioskować kolor
  brakującego pola z układu sąsiednich. Lewy górny róg zawsze ciemny. Odpowiedź w karcie to dwie liczby
  w rzędach z kwadracikiem (ciemny u góry, jasny na dole); po rozwiązaniu liczby stają w dwóch „?” obok
  szachownicy.
- Piramidka z „?” na górze: środkowy rząd to puste kółka (ciągły obrys, bez liczby), a nie „?” — pytaniem
  jest tylko góra. „Zróbmy razem” i dobra odpowiedź pokazują też policzony środek.
- Trójkąt jako „schodki” (rzędy 1, 2, 3… wyrównane do lewej) — da się go zapisać w kratce jak inne figury.
  Kwadrat zbudowany z kółek („Z ilu kółek będzie następny kwadrat?”), żeby nie pisać „kwadratów … kwadrat”.
- „Dwie litery” = dwa zapisy jeden pod drugim, w drugim obie litery; polecenie „Ile to B?” (jak „ta sama
  litera”, litera polecenia zwykłym pismem).
- Tarcza: kropki rozkłada funkcja, a nie lista kątów — pojedyncze kropki w różnych pierścieniach mają
  przesunięte kąty (`RING_PHASE`), żeby nie stały w jednej linii. Liczba środka jest w samym środku, gdy
  w środku jest ≤ 1 kropka (wcześniej zawsze trochę wyżej) — zmiana dotyczy też tarcz poziomu 2.
- Jasne pola szachownicy w kolorze piasku (nie jaśniejszym): z bliska brakujące pole (kartka z kreskami)
  było zbyt podobne do jasnego.

**Rachunki zadań** (karty: cztery kolejne liczby albo opisane niżej)
- `3-ciag-a`: 1, 2, 4, 7, 11 — kroki 1, 2, 3, 4 → 11 + 5 = 16 (karty 14–17).
- `3-ciag-b`: 1, 3, 6, 10, 15 — kroki 2, 3, 4, 5 → 15 + 6 = 21 (karty 20–23).
- `3-ciag-c`: 30, 29, 27, 24, 20 — kroki −1, −2, −3, −4 → 20 − 5 = 15 (karty 13–16).
- `3-figury-trojkat`: schodki z kółek 2, 3, 4 rzędów: 3, 6, 10 → 5 rzędów: 1+2+3+4+5 = 15 (karty 13–16;
  14 = „stały krok +4” jako pomyłka).
- `3-figury-kwadrat`: kwadraty z kółek 2×2, 3×3, 4×4: 4, 9, 16 → 5×5 = 25 (karty 23–26; 23 = 16 + 7).
- `3-figury-krzyzyk`: krzyżyki z kwadratów o ramionach 1, 2, 3: 5, 9, 13 → ramiona 4: 4·4 + 1 = 17 (karty 15–18).
- `3-piramidka-a`: dół 3, 5, 4 → środek 3+5 = 8, 5+4 = 9 → góra 8 + 9 = 17 (karty 15–18).
- `3-piramidka-b`: dół 4, 7, 5 → środek 11, 12 → góra 23 (karty 21–24).
- `3-litery-a`: A + A = 12 → A = 6; A + B = 10 → B = 4 (karty 3–6; 6 = wartość A).
- `3-litery-b`: K + K + K = 15 → K = 5; K + M + M = 21 → M + M = 16 → M = 8 (karty 7–10).
- `3-znaki-a`: 12 ? 9 ? 5 ? 7 = 9 → „+ − −”: 12 + 9 = 21, − 5 = 16, − 7 = 9 (dwa minusy). Inne karty:
  „− + −” = 1, „− − +” = 5, „+ + −” = 19.
- `3-znaki-b`: 9 ? 7 ? 4 ? 8 = 20 → „+ − +”: 16, 12, 20. Inne: „+ + −” = 12, „− + +” = 14, „+ + +” = 28.
- `3-tarcza-a`: pierścienie 2, 4, 6, 8 (4); trafienia 8 + 6 + 6 + 4 + 2 = 26 (karty 24–27).
- `3-tarcza-b`: pierścienie 1, 5, 10; trafienia 10 + 5 + 5 + 1 = 21 (karty 19–22).
- `3-szachy-a`: 5 × 5 bez środka 3 × 3; brakujące pola (w, k) dla w, k = 1..3: ciemne, gdy w + k parzyste —
  (1,1), (1,3), (2,2), (3,1), (3,3) = 5 ciemnych, 4 jasne (karty 5/4, 4/5, 5/5, 4/4).
- `3-szachy-b`: 6 × 6, brakuje (1,1), (1,2), (2,1), (2,2), (2,3), (3,2), (3,3), (4,3); ciemne (w + k
  parzyste): (1,1), (2,2), (3,3) = 3; jasne: 5 (karty 3/5, 5/3, 4/4, 3/4).

**Wyniki sprawdzeń**
- `npm run sprawdz-gre -- konkurs-matematyczny`: zielone. `npm run check`: zielone (40 plików, 1402 testy, build).
- Podgląd (panel przeglądarki, serwer dev na :5173):
  - klawiatura 800 × 600: okno „Wybierz poziom” ma 1, 2, 3; poziom 3 wybrany strzałkami i Spacją
    (prawdziwe klawisze). Runda 1: znaki, szachownica i piramidka prawdziwymi klawiszami, reszta zdarzeniami
    klawiatury wysłanymi skryptem (strzałki + Spacja) do ekranu końca; rundy 2 i 3 w całości zdarzeniami
    klawiatury ze skryptu do ekranu końca (na ostatnim poziomie ekran końca ma „jeszcze raz” i „do domu”).
    W rundach 2 i 3 po 7 zadań siedmiu różnych typów;
  - trzy błędy pod rząd przy szachownicy (prawdziwe klawisze, 800 × 600): po 1. błędzie poświata kartki
    (`.mg-hint--glow` na kartce), paluszek przy dobrej karcie („3 ciemne i 5 jasnych”), po 3. błędzie
    „zróbmy razem”: w „?” stanęły 3 i 5, tło „dobrze”, opis dla czytnika „Brakuje: 3 ciemne i 5 jasnych”.
    Paluszek bezczynności stał przy dobrej karcie już po 1. błędzie (testy trwały długo), więc samo pojawienie
    się paluszka po 2. błędzie nie było widoczne jako zmiana. Powrotu zadania na koniec rundy nie obserwowałem
    (strona przeładowała się po zmianie kodu w trakcie tej rundy);
  - dotyk 375 × 812 (emulacja telefonu, tryb dotyku): pełna runda poziomu 3 stuknięciami do ekranu końca
    (piramidka, dwie litery, znaki, trójkąt, tarcza z 5 trafieniami, ciąg, szachownica); karty 103 px,
    zawartość żadnej karty nie wystaje (pomiar);
  - stała scena — wszystkie 50 rysunków (przed i po rozwiązaniu) wstawione kolejno na kartkę tą samą funkcją
    `drawFigure`: kartka i karty mają jeden rozmiar i miejsce — 375 × 812: kartka 311 × 308, karty 222 × 222;
    667 × 375: kartka 296 × 207, pole kart 283 × 207; 800 × 600: kartka 736 × 301, karty 477 × 107 (te same
    wartości co po tickecie 04). Każdy rysunek mieści się w kartce, w pionie w miejscu na rysunek, w poziomie
    pod poleceniem. W prawdziwych rundach 800 × 600 ten sam rozmiar przy każdym zadaniu;
  - zrzuty: tarcza z 5 trafieniami (4 pierścienie), szachownica i krzyżyk na 375 × 812 i 667 × 375 —
    kropki wyraźnie w pierścieniach, nic nie nachodzi na liczby; szachownica czytelna; skala szarości
    (375 × 812): pola ciemne, jasne i brakujące rozróżnialne, zadanie najciemniejsze;
  - konsola bez błędów. `localStorage` podglądu przywrócone do wartości sprzed testów (ustawienia z limitem
    sesji 15 min, postęp gry „ukończony poziom 1, ostatni poziom 1”, licznik sesji).
- Nie sprawdzono: krój pisany (ustawienie „pisane”) w „dwóch literach”, prawdziwe urządzenie dotykowe,
  dotyk w 667 × 375 (tylko pomiar i zrzuty), część rysunków (krzyżyk na telefonie, tarcza/szachownica/krzyżyk
  w poziomie) obejrzana przez wstawienie rysunku na kartkę, nie w prawdziwej rundzie. Recenzji
  (`recenzent-gry`) w tej sesji nie uruchamiano — robi ją orkiestrator.

**Wskazówki dla ticketu 06**
- Najmniejsze rysunki na telefonie: krzyżyk (kwadraciki ok. 12 px w pionie, ok. 8 px w poziomie 667 × 375 —
  rysunek jest ograniczony szerokością: 15 kolumn trzech układów), ciąg pięciu liczb (czcionka ok. 20 px
  w pionie zamiast 36) i liczby pierścieni tarczy z 4 pierścieniami (ok. 13 px w poziomie). Jeśli za małe —
  np. „?” pod układami zamiast obok, przecinki węższe w ciągu.
- Pomiar stałej sceny: wstawić `drawFigure` każdego zadania do `.g-konkurs-matematyczny-figure-slot`
  (moduły da się zaimportować w konsoli: `await import('/src/games/konkurs-matematyczny/figures.ts')`).
- Opis tarczy, muru i podłogi dla czytników — jak w notatkach 04 (opis szachownicy mówi tylko rozmiar
  i regułę kolorów, nie położenie brakujących pól).

**Pytania do rodzica**
- Szachownica: czy pytanie „Ile ciemnych i ile jasnych pól brakuje?” odpowiada temu, co miałeś na myśli
  (karty z dwiema liczbami)? Alternatywa: „Ile pól brakuje?” z jedną liczbą.
- Krzyżyk na telefonie ma małe kwadraciki (ok. 12 px) — wystarczy, skoro pod każdym układem stoi liczba?
- Piramidka 1–2–3: środek pusty (dziecko liczy samo). Czy wolisz środek z liczbami (łatwiej)?

### Poprawki po recenzji (2026-11-18)

**Co zmieniono**
- „Znaki” — każda karta, nie tylko dobra, ma wszystkie wyniki pośrednie i wynik końcowy w 0..max poziomu.
  Test puli liczy wyniki po każdym kroku dla każdej karty (poziomy 2 i 3). Poziom 3: w `3-znaki-a` karta
  „− − +” (12 − 9 = 3, 3 − 5 = −2) zamieniona na „− + +”. Poziom 2: zmienione liczby wszystkich trzech zadań
  (dawne `7 ? 5 ? 3`: „− −” daje −1; `12 ? 4 ? 6`: „+ +” daje 22; `3 ? 6 ? 8`: „− +” i „− −” dają −3).
  To zastępuje rachunki „znaków” z notatek wyżej i z ticketu 03.
- Z-35: litera w poleceniu „Ile to A?” / „Ile to B?” („ta sama litera”, „dwie litery”) jest literą platformy
  (`ctx.ui.letter`, WIELKA). `logic.ts` ma `promptParts` (polecenie w częściach: tekst i `{ letter }`), a
  `promptOf` zostaje zwykłym tekstem. `game.ts` pokazuje części (litera w `…-prompt-letter`, część
  widoczna `aria-hidden`), a czytnik ekranu dostaje `promptOf` w `mg-visually-hidden` — nazwa kartki to
  nadal „Ile to A?” (nie „Ile to litera A?”). `style.css`: litera w poleceniu ma `line-height: 1`
  (pisana — mniejsza, jak w rysunku), więc wiersz polecenia ma tę samą wysokość. To zastępuje decyzję
  „litera polecenia zwykłym pismem” z notatek wyżej.
- `pairLabel` i `countWith` przeniesione z `figures.ts` do `logic.ts` (bez DOM); nowa `isDarkCell(row, col)`
  w `logic.ts`, używana przez rysunek szachownicy.
- Nowe testy: polecenie w częściach (złożone daje `promptOf`; litera tylko w „ta sama litera” i „dwie
  litery”), `solvedPyramid` (dla każdej piramidki z puli: „?” = odpowiedź, liczby zadania bez zmian, każde
  kółko = suma dwóch pod nim; plus dwa przypadki policzone ręcznie), `pairLabel` (0, 1, 2–4, 5, 12, 22,
  każda liczba 0..30 według ręcznej tabelki form, wszystkie karty szachownic z puli), `isDarkCell`
  (8 × 8 pól liczone w teście parzystością rzędu i kolumny osobno).
- `README.md` gry: litera w poleceniu, warunek „znaków” dla każdej karty, `pairLabel`/`isDarkCell`.

**Decyzja:** na poziomie 2 karty zostają wszystkimi czterema zestawami dwóch znaków (dziecko porównuje
pełny komplet); zamiast zmieniać karty dobrałem liczby a ? b ? c tak, że a ≥ b + c (najmniejszy wynik
a − b − c ≥ 0) i a + b + c ≤ 20 (największy wynik ≤ 20), a b ≠ c (wszystkie cztery wyniki różne). Rodzaje
dobrych odpowiedzi bez zmian („+ −”, „− +”, „+ +”).

**Rachunki „znaków”** (wyniki po kolejnych krokach, ✓ = dobra karta)
- `2-znaki-a`: 9 ? 5 ? 3 = 11 — „+ +”: 14, 17; „+ −”: 14, 11 ✓; „− +”: 4, 7; „− −”: 4, 1.
- `2-znaki-b`: 12 ? 4 ? 3 = 11 — „+ +”: 16, 19; „+ −”: 16, 13; „− +”: 8, 11 ✓; „− −”: 8, 5.
- `2-znaki-c`: 10 ? 3 ? 6 = 19 — „+ +”: 13, 19 ✓; „+ −”: 13, 7; „− +”: 7, 13; „− −”: 7, 1.
- `3-znaki-a`: 12 ? 9 ? 5 ? 7 = 9 — „+ − −”: 21, 16, 9 ✓ (dwa minusy, wynik mniejszy od pierwszej liczby,
  choć jest w nim plus); „− + −”: 3, 8, 1; „− + +”: 3, 8, 15; „+ + −”: 21, 26, 19. Spośród wszystkich ośmiu
  zestawów tylko „+ − −” daje 9 (+++ 33, ++− 19, +−+ 15, −++ 15, −+− 1, −−+ 5, −−− −9).
- `3-znaki-b` (bez zmian): 9 ? 7 ? 4 ? 8 = 20 — „+ − +”: 16, 12, 20 ✓; „+ + −”: 16, 20, 12; „− + +”: 2, 6, 14;
  „+ + +”: 16, 20, 28.

**Wyniki sprawdzeń**
- Najpierw test: nowe i rozszerzone testy czerwone (13 — znaki poziomów 2 i 3, brak `promptParts`,
  `isDarkCell`, `pairLabel` w `logic.ts`), potem zielone. `npm run sprawdz-gre -- konkurs-matematyczny`:
  zielone (210 testów gry, skaner, manifest). `npm run check`: zielone (40 plików, 1420 testów, build).
- Podgląd (panel przeglądarki, serwer dev na :5173, poziom ustawiany w zapisie postępu, dobre karty
  stukane zdarzeniami wskaźnika ze skryptu):
  - 375 × 812: „ta sama litera” (`2-litera-a`) i „dwie litery” (`3-litery-b`) — litera polecenia w kroju
    platformy, jak litery w rysunku; kartka 311 × 307,7 w (32; 155,3), karty 221,8 × 221,8 w (76,6; 491),
    polecenie 58,7 px — tak samo jak w innych zadaniach rundy;
  - 667 × 375: `2-litera-a`, `2-litera-b`, `3-litery-b` i reszta dwóch rund poziomu 2 i rundy poziomu 3 —
    kartka 296,3 × 207 w (32; 112), karty 282,7 × 206,5 w (352,3; 112,3) przy każdym zadaniu; polecenie
    z literą 25,3 px, jak inne polecenia w jednym wierszu. Litera przełączona na pisaną (atrybut
    `data-script` w podglądzie): wysokość polecenia bez zmian (25,3 px);
  - nowe liczby „znaków” (`2-znaki-a`, `2-znaki-c`, `3-znaki-a`) wyświetlone i rozwiązane w rundach;
  - konsola bez błędów; `localStorage` przywrócone do stanu sprzed sprawdzeń, rozmiar okna — desktop.
- Nie sprawdzono: czytnik ekranu na żywo (nazwa kartki wynika z `aria-labelledby` z częścią widoczną
  `aria-hidden`; drzewo dostępności narzędzia pokazało ukryty tekst „Ile to A?”), prawdziwe ustawienie
  „pisane” w panelu rodzica (tylko podmiana atrybutu), klawiatura (zmiana nie dotyka sterowania),
  prawdziwe urządzenie.


### Recenzja (2026-11-18)

Recenzent `recenzent-gry`: bez ustaleń KRYTYCZNYCH; wszystkie 16 zadań poziomu 3 przeliczone
niezależnie. Dwa ustalenia WAŻNE (ujemny wynik pośredni na błędnej karcie „znaków”, litera polecenia
poza literami platformy) i trzy DROBNE o testach są poprawione — patrz „Poprawki po recenzji”.
Orkiestrator przeliczył nowe zadania „znaki” obu poziomów: dokładnie jedna karta pasuje, żadna nie
schodzi poniżej zera. Do ticketu 06: małe elementy na telefonie (kwadraciki krzyżyka, ciąg pięciu
liczb, liczby pierścieni tarczy w poziomie).
