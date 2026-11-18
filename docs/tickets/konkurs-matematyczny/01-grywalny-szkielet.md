---
status: zrobione
kto: agent
zalezy-od: []
prd: docs/prd/konkurs-matematyczny.md
historyjki: [1, 2, 3, 6, 8, 9]
---

# 01 — Grywalny szkielet

## Co zbudować

Utwórz grę z szablonu: `npm run nowa-gra -- konkurs-matematyczny "Matematyczne zagadki" liczby`.
Wymaga wdrożonej zmiany `platforma-wiek` (oba tickety `zrobione`) — bez niej zatrzymaj się i powiedz
o tym rodzicowi. Manifest i `README.md` gry według sekcji 4 PRD (wiek 6–7, oba tryby sterowania,
na razie jeden poziom). Dziecko widzi stałą kartkę z poleceniem u góry, zadaniem z „?” pośrodku
i czterema kartami odpowiedzi; wybiera kartę stuknięciem albo strzałkami i Spacją. Po dobrej
odpowiedzi „?” zamienia się w odpowiedź, a kartka zmienia tło na „dobrze”. W tym tickecie poziom 1 ma
dwa typy zadań z tabeli typów: „brakująca liczba” (jedno działanie) i „kostki” — razem co najmniej
7 własnych zadań w zakresie do 10; runda to 7 zadań i kończy się ekranem końca rundy z wiewiórką.

## Kryteria akceptacji

- [x] Gra otwiera się pod adresem `/konkurs-matematyczny/`; w hubie widać ją przy wieku „5–7 lat”,
      a przy „3–5 lat” nie.
- [x] Runda poziomu 1 (7 zadań, dwa typy) da się przejść klawiaturą i dotykiem; kończy się ekranem
      końca rundy platformy.
- [x] Po dobrej odpowiedzi i przy „zróbmy razem” „?” zamienia się w odpowiedź; pytaniem dla drabiny
      podpowiedzi jest kartka.
- [x] Test logiki: każde zadanie ma cztery różne karty i dokładnie jedną dobrą, zgodną z wynikiem
      policzonym z danych zadania; liczby mieszczą się w zakresie poziomu.
- [x] `npm run check` przechodzi.

## Jak sprawdzić

Automatycznie:
- `npm run sprawdz-gre -- konkurs-matematyczny`
- `npm run check`

Ręcznie (`npm run dev`, potem http://localhost:5173/konkurs-matematyczny/):
- Klawiatura: strzałkami przesuń ramkę po kartach, Spacją wybierz; przejdź całą rundę.
- Dotyk (widok telefonu 375×812): karty w układzie 2 × 2, każda co najmniej 80 px; przejdź rundę.
- Trzy błędy pod rząd: poświata kartki → paluszek przy dobrej karcie → „zróbmy razem”, zadanie wraca
  na końcu rundy.
- Hub: przełącz wiek w panelu rodzica i sprawdź, że kafelek pojawia się i znika. Konsola bez błędów.

## Notatki z realizacji

### 2026-11-18

**Co zrobiono**
- Gra z generatora (`src/games/konkurs-matematyczny/`): manifest (wiek 6–7, oba tryby, 1 poziom, bez skórek,
  `order: 40` — ostatnia w „Liczbach”), README według wzoru z `docs/DODAWANIE-GRY.md` (sekcja 6).
- `logic.ts`: zadania jako dane (`Puzzle` — unia typów po polu `kind`), pula poziomu 1: 10 własnych zadań
  (6 × „brakująca liczba”, 4 × „kostki”), zakres do 10; `createTasks` (7 różnych zadań, typy brane po kolei),
  `arrangeCards` (kolejność kart mieszana przy każdym pokazaniu, nigdy rosnąca).
- `figures.ts`: rysunek każdego typu z danych zadania + miejsce „?” (`drawFigure`, `revealAnswer`);
  `game.ts`: stała scena (kartka z poleceniem i rysunkiem, rząd kart) na `runRound`; bohater końca rundy — wiewiórka.
- `logic.test.ts`: 15 testów — cztery różne karty i dokładnie jedna dobra, sprawdzana niezależnym liczeniem
  w teście (podstawienie karty do równości, suma oczek), zakres liczb, budowa typów, runda 7 różnych zadań
  z oboma typami, to samo ziarno = ta sama runda, karty nie leżą rosnąco.

**Decyzje podjęte w trakcie**
- Karty i dobra odpowiedź są zapisane w danych zadania (jak w arkuszach), a nie wyliczane przez grę —
  test pilnuje ich zgodności z wynikiem.
- „Brakująca liczba” zapisana tekstem (`'? + 3 = 7'`, minus jako `-`) i parsowana do struktury
  `Equation` (dwie strony, dowolnie wiele liczb) — gotowe na „po obu stronach =” z poziomu 2.
- Wybór zadań do rundy bierze typy po kolei (po jednym z każdego typu, potem znowu), więc gdy pula ma ≥ 4 typy,
  runda sama ma ≥ 4 różne typy (wymóg PRD dla kolejnych ticketów).
- Pula poziomu 1 ma 10 zadań (nie 7), żeby kolejne rundy różniły się zadaniami, nie tylko kolejnością.
- Karty: 2 × 2 na wąskiej scenie, 4 w rzędzie od 480 px szerokości sceny (`@container (min-width: 480px)`).
- „?” ma kreskowany obrys, po rozwiązaniu ciągły z liczbą (Z-15: nie sam kolor); kartka zmienia tło na „dobrze”.

**Wyniki sprawdzeń**
- `npm run sprawdz-gre -- konkurs-matematyczny`: zielone. `npm run check`: zielone (40 plików, 1225 testów, build).
- Podgląd (panel przeglądarki, serwer dev z innej sesji na :5173):
  - klawiatura (800 × 600): cała runda strzałkami + Spacją do ekranu końca (jeżyk + wiewiórka);
    trzy błędy pod rząd: poświata kartki → paluszek przy dobrej karcie → „zróbmy razem” („?” → 4, tło
    „dobrze”), zadanie wróciło na końcu rundy z inną kolejnością kart;
  - dotyk 375 × 812: karty 2 × 2 po ok. 103 px, odstęp ≥ 16 px; cała runda stuknięciami do ekranu końca;
    błąd = kołysanie + poświata kartki;
  - 667 × 375 (tylko układ): kartka i rząd 4 kart po 80 px mieszczą się bez przewijania;
  - hub: przy wieku „3–5” kafelka nie ma, przy „5–7” jest i otwiera grę. Wiek przełączony zapisem ustawień
    w `localStorage` (ten sam klucz, który zapisuje panel), nie przez kliknięcie w panelu rodzica;
    ustawienia przywrócone (wiek 3–5, limit sesji 15 min);
  - konsola bez błędów.
- Recenzji (`recenzent-gry`) w tej sesji nie uruchamiano — robi ją orkiestrator.

**Wskazówki dla następnego ticketu — jak dodać nowy typ zadania**
1. `logic.ts`: nowy interfejs `XxxPuzzle extends PuzzleBase` z `kind: 'xxx'` i polami danych; dopisz go do
   unii `Puzzle`, dodaj polecenie w `PROMPTS` (TypeScript wymusi wpis dla każdego `kind`) i pomocnika
   jak `dice(...)` do zapisu zadań w `LEVELS[n].pool`.
2. `figures.ts`: funkcja `xxxFigure(puzzle): Figure` (rysunek + element `hole` z „?”) i nowy `case`
   w `drawFigure`. Kolory w `style.css` z tokenów, klasy `.g-konkurs-matematyczny-…`.
3. `logic.test.ts`: w `isRight` i `numbersShown` dopisz `case` z niezależnym liczeniem wyniku, a w teście
   budowy typów — reguły nowego typu. Test „poziom 1: … typy” sprawdza dokładny zestaw typów — zaktualizuj go.
4. Karty to dziś liczby (`cards: number[]`). „Kod literowy — jakie to słowo” (ticket 02) ma odpowiedź-słowo:
   trzeba uogólnić typ karty (np. `number | string`) oraz `revealAnswer` i karty w `game.ts`; litery tylko
   przez `ctx.ui.letter`.
5. Rząd rysunku nie zawija się (`white-space: nowrap`): przy szerokich rysunkach sprawdź 375 × 812
   (wnętrze kartki ok. 273 px) i ewentualnie zmniejsz `font-size` rysunku dla danego typu.

**Pytania do rodzica**
- Brak pilnych. Do decyzji przy kolejnych ticketach: czy polecenie ma zostać tak małe jak teraz
  (ok. 16–20 px na telefonie), czy wolisz większe.

### Recenzja (2026-11-18)

Recenzent `recenzent-gry`: bez ustaleń KRYTYCZNYCH. Ustalenia WAŻNE i DROBNE dotyczące kodu
(uogólnienie typu karty na liczbę albo napis, parser pilnujący dokładnie jednego „?”, test „co
najmniej 4 typy w rundzie” zamiast „wszystkie typy”, mocniejszy test mieszania kart, nazwa rysunku
dla czytników po rozwiązaniu, szerokość pola „?” przy liczbie dwucyfrowej) przechodzą do ticketu 02,
który i tak przebudowuje te miejsca. Do decyzji rodzica: brzmienie wyjątku od Z-37
w `docs/ZASADY-DESIGNU.md` mówi o liczbach powyżej 10, a poziom 1 pokazuje samym zapisem także
działania do 10 (zgodnie z PRD).
