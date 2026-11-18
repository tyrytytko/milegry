---
status: zrobione
kto: agent
zalezy-od: ["01"]
prd: docs/prd/konkurs-matematyczny.md
historyjki: [4, 5]
---

# 02 — Poziom 1 w komplecie

## Co zbudować

Poziom 1 dostaje pozostałe typy zadań ze swojego wiersza tabeli poziomów (sekcja 4 PRD): ciąg liczb,
piramidkę z jednym dodawaniem, brakujące pola (do 6 pól) i kod literowy „jakie to słowo”. Każdy typ
ma własny rysunek powstający z danych zadania i własne polecenie z tabeli typów. Pula poziomu 1 rośnie
do 17 własnych zadań. Runda losuje 7 różnych zadań tak, żeby były w niej co najmniej 4 typy; kolejna
runda daje inny zestaw, a karty leżą w innej kolejności.

## Kryteria akceptacji

- [x] Pula poziomu 1 ma 17 zadań sześciu typów; wszystkie przechodzą test z ticketu 01.
- [x] Test logiki: runda ma 7 różnych zadań co najmniej 4 typów, a to samo ziarno losowości daje tę
      samą rundę.
- [x] Każdy z czterech nowych typów rysuje się czytelnie na 375 × 812 i ma „?” w miejscu odpowiedzi.
- [x] W kodzie literowym litery są WIELKIE i pokazane literami platformy; karty-słowa mają nazwę równą
      słowu.
- [x] `npm run check` przechodzi.

## Jak sprawdzić

Automatycznie:
- `npm run sprawdz-gre -- konkurs-matematyczny`
- `npm run check`

Ręcznie (`npm run dev`, potem http://localhost:5173/konkurs-matematyczny/):
- Klawiatura: przejdź trzy rundy poziomu 1; sprawdź, że zestawy zadań się różnią i że trafia się
  każdy nowy typ.
- Dotyk (widok telefonu 375×812): przejdź rundę; karty ze słowami mieszczą się w kartach bez ucinania.
- Trzy błędy pod rząd przy zadaniu z kodem literowym: poświata → paluszek → „zróbmy razem”.

## Notatki z realizacji

### 2026-11-18

**Co zrobiono**
- `logic.ts`: cztery nowe typy zadań jako dane — `sequence` (ciąg liczb), `pyramid` (rzędy kółek od góry,
  każde kółko = suma dwóch pod nim; dwa rzędy = jedno dodawanie), `tiles` (mur albo podłoga zapisane
  napisami `#`/`.`), `codeWord` (tabelka litera = liczba, rząd liczb, odpowiedź-słowo). Pula poziomu 1:
  17 zadań (5 × brakująca liczba, 3 × kostki, 2 × ciąg, 2 × piramidka, 2 × brakujące pola, 3 × kod
  literowy). Polecenia w `promptOf(puzzle)` (zamiast tablicy `PROMPTS`, bo „brakujące pola” mają dwa
  polecenia: cegły/płytki).
- Uwagi recenzenta do 01: typ karty `Answer = number | string` (dane, `arrangeCards`, karty w `game.ts`);
  `parseEquation` (eksportowany) rzuca błąd, gdy „?” nie występuje dokładnie raz; test rundy „7 różnych
  zadań, ≥ 4 typy, to samo ziarno = ta sama runda, różne ziarna = różne zestawy”; test mieszania dla
  każdego zadania puli (dobra karta na każdym z 4 miejsc, nigdy rosnąco); rysunek ma `reveal()`, które
  wstawia odpowiedź i podmienia „ile?” w `aria-label` na odpowiedź; pole „?” ma stałą szerokość 1,75 em
  (mieści 10 bez przesuwania układu).
- `figures.ts`: rysunki nowych typów z danych — ciąg (liczby z przecinkami), piramidka (SVG: kółka
  i kreski, „?” = kółko z kreskowanym obrysem), mur/podłoga (SVG, brakujące pola: kreskowany obrys bez
  wypełnienia), kod (tabelka „litera nad liczbą”, rząd liczb, pod nim szerokie pole „?”, w którym po
  rozwiązaniu litery stają pod swoimi liczbami). Litery przez fabrykę z `game.ts`
  (`ctx.ui.letter(ch, { case: 'upper' })`).
- `game.ts`/`style.css`: karty-słowa (`aria-label` = słowo, litery platformy, wielkość liter wg
  najdłuższego słowa zadania), szersze od kart z liczbami (`--g-konkurs-matematyczny-word-card`).
  `README.md` gry opisuje nowe typy i pulę 17 zadań.
- `logic.test.ts`: 54 testy (niezależne liczenie wyniku dla każdego typu, budowa typów, reguły poziomu 1).

**Decyzje podjęte w trakcie**
- Litery zadania zawsze WIELKIE (`case: 'upper'`, Z-35), krój wg ustawienia rodzica (także pisany).
- Krój pisany: WIELKIE litery pisane są bardzo szerokie (MAMA ≈ 1,5 × szerokość karty 103 px), dlatego
  karty-słowa są szersze (do 1,5 × karta, ale zawsze mieszczą się w rzędzie) i w kartach oraz w tabelce
  kodu litery pisane mają mniejszą skalę niż w rdzeniu (`.mg-letter[data-script='cursive']` w CSS gry).
- Mur: co drugi rząd przesunięty o pół cegły, z połówkami cegieł na końcach (połówki nigdy nie brakują);
  liczy się tylko całe cegły.
- Słowa: 3–4 WIELKIE litery bez polskich znaków, wszystkie karty-słowa złożone z liter tabelki (test).
- Kolory nowych rysunków: woda (kółka piramidki, płytki), kasztan zmieszany z kartką (cegły), miód
  z kartką (litery w tabelce) — bez czerwieni; brakujące pola i „?” rozpoznawalne po kreskowanym obrysie.

**Wyniki sprawdzeń**
- `npm run sprawdz-gre -- konkurs-matematyczny`: zielone. `npm run check`: zielone (40 plików, 1264 testy, build).
- Podgląd (panel przeglądarki, serwer dev z innej sesji na :5173):
  - klawiatura (800 × 600): trzy rundy do ekranu końca; zestawy różne (np. runda 2 z „2, 4, 6, 8, ?”
    i LAS, runda 3 z DOM/MAK i MAMA). W pierwszej rundzie jedna para „strzałki + Spacja” prawdziwymi
    klawiszami, reszta zdarzeniami klawiatury wysłanymi skryptem (ta sama obsługa w rdzeniu);
  - trzy błędy pod rząd przy kodzie literowym (MAMA): poświata kartki → poświata + paluszek przy MAMA →
    „zróbmy razem” (pole „?” pokazuje M A M A pod liczbami, tło „dobrze”, opis dla czytnika „Słowo: MAMA”);
    zadanie wróciło na końcu rundy;
  - dotyk 375 × 812: dwie rundy stuknięciami do ekranu końca; karty-słowa w kroju drukowanym mieszczą
    się w kartach (prawdziwa runda, pomiar szerokości słowa i karty); krój pisany (ustawienie „pisane”,
    krój wczytany) sprawdzony na kartach i tabelce kodu złożonych skryptem z liter `.mg-letter`
    `data-script="cursive"` — nie w prawdziwej rundzie z tym ustawieniem; przewijania w poziomie brak;
  - każdy z czterech nowych typów obejrzany na 375 × 812 (zrzuty): ciąg, piramidka, podłoga i kod
    w prawdziwej rundzie; **mur nie wylosował się w żadnej z 6 rund** — obejrzany przez wstawienie
    rysunku zadania `1-pola-b` na kartkę skryptem (ta sama funkcja `drawFigure`); wszystkie rysunki
    mieszczą się we wnętrzu kartki (pomiar), „?” → odpowiedź nie zmienia rozmiarów (pomiar przed/po,
    także „10”);
  - konsola bez błędów. Ustawienia podglądu (limit sesji, krój liter) przywrócone do stanu sprzed testu.
- Nie sprawdzono: litery małe (ustawienie „małe” — gra i tak wymusza WIELKIE), prawdziwe urządzenie
  dotykowe.

**Wskazówki dla ticketu 03**
- Nowy typ: jak w notatkach 01, tylko zamiast `PROMPTS` jest `promptOf(puzzle)` (switch po `kind`),
  a rysunek zwraca `Figure { el, reveal() }` przez `makeFigure`/`numberFigure` w `figures.ts`
  (opis dla czytnika jako funkcja `describe(odpowiedź | null)`).
- Piramidka jest już ogólna (`rows` od góry, dowolnie wiele rzędów; test sprawdza sumy). Jeśli
  „piramidka z dwoma dodawaniami” z PRD to inny kształt (np. łańcuch klamer), trzeba dodać wariant.
- „Brakująca liczba po obu stronach =”: `parseEquation` już przyjmuje kilka liczb po obu stronach;
  test „jedno działanie” dotyczy tylko poziomu 1.
- Kod literowy „ile razem”: odpowiedź liczbowa — nowy `kind` albo pole w `codeWord`; tabelka i litery
  (`codeWordFigure`) do wykorzystania.
- **Poziom 667 × 375 (ticket 06):** kartka z kodem literowym i z piramidką plus rząd kart nie mieszczą się
  w scenie (≈ 263 px wysokości) — sheet ≈ 240 px + karty 80 px. Zwykłe zmniejszenie czcionki nie
  wystarczy; potrzebny układ obok siebie (kartka po lewej, karty 2 × 2 po prawej) przy szerokiej
  i niskiej scenie.

**Pytania do rodzica**
- Czy karty-słowa w kroju pisanym (gdy w panelu wybrano „pisane”) mają zostać pisane, czy wolisz
  zawsze drukowane WIELKIE (jak na konkursie)? Teraz krój idzie za ustawieniem rodzica.

### Recenzja (2026-11-18)

Recenzent `recenzent-gry`: bez ustaleń KRYTYCZNYCH; wszystkie 17 zadań sprawdzone merytorycznie.
Poprawione po recenzji: w `1-kod-c` wszystkie cztery karty mają cztery litery (MAMA, TATA, MATA,
TAMA), żeby długość słowa nie zdradzała odpowiedzi; w `1-kod-a` tabelka nie stoi już w kolejności
liter słowa. Znany brak przekazany do ticketu 03: w poziomie 667 × 375 kartka z kodem albo piramidką
nie mieści się razem z kartami.
