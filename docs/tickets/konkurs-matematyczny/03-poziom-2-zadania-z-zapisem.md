---
status: zrobione
kto: agent
zalezy-od: ["02"]
prd: docs/prd/konkurs-matematyczny.md
historyjki: [4, 7]
---

# 03 — Poziom 2: zadania z zapisem

## Co zbudować

Gra dostaje poziom 2 (zakres do 20), na razie z typami opartymi na samym zapisie z wiersza poziomu 2
w tabeli poziomów (sekcja 4 PRD): brakująca liczba po obu stronach znaku „=”, piramidka z dwoma
dodawaniami, „ta sama litera” i „znaki”. W zadaniu „znaki” karty pokazują zestawy znaków + i −.
Rodzic może wybrać poziom 2 na ekranie wyboru poziomu. Pula poziomu 2 ma po tym tickecie co najmniej
9 własnych zadań, a runda poziomu 2 działa tak jak runda poziomu 1.

## Kryteria akceptacji

- [x] Manifest ma 2 poziomy; poziom 2 da się wybrać i przejść klawiaturą i dotykiem.
- [x] Pula poziomu 2 ma co najmniej 9 zadań czterech typów; wszystkie przechodzą testy puli
      (cztery różne karty, jedna dobra, zgodna z wynikiem policzonym z danych; zakres do 20).
- [x] Karty ze znakami są czytelne i rozróżnialne nie tylko kolorem; każda ma nazwę dla czytników
      ekranu (np. „minus, plus, plus”).
- [x] Litera w zadaniu „ta sama litera” jest WIELKA i pokazana literą platformy.
- [x] `npm run check` przechodzi.

## Jak sprawdzić

Automatycznie:
- `npm run sprawdz-gre -- konkurs-matematyczny`
- `npm run check`

Ręcznie (`npm run dev`, potem http://localhost:5173/konkurs-matematyczny/):
- Klawiatura: wybierz poziom 2 i przejdź dwie rundy.
- Dotyk (widok telefonu 375×812): przejdź rundę; najdłuższe działanie mieści się na kartce w jednym
  wierszu albo łamie się w czytelnym miejscu.
- Trzy błędy pod rząd przy zadaniu „znaki”: poświata → paluszek → „zróbmy razem”, puste pola
  zamieniają się w znaki.

## Notatki z realizacji

### 2026-11-18

**Co zrobiono**
- `logic.ts`: poziom 2 (zakres do 20, runda 7 zadań) z pulą 10 własnych zadań czterech typów: 3 × brakująca
  liczba z działaniem po obu stronach „=”, 2 × piramidka z dwoma dodawaniami, 2 × „ta sama litera”
  (`sameLetter`: litera, ile razy, suma), 3 × „znaki” (`signs`: liczby, wynik; karta = napis z „+”/„-”).
  Piramidka uogólniona: każdy rząd ma o jedno kółko więcej niż rząd nad nim (nie musi zaczynać się od 1).
  Nowe `cardKind(puzzle)` mówi widokowi, jak narysować kartę (liczba / słowo / znaki). Manifest ma
  2 poziomy (`LEVELS.length`).
- `logic.test.ts` (najpierw test): niezależne sprawdzenie odpowiedzi dla nowych typów (podstawienie
  wartości litery, policzenie działania ze znakami od lewej), zakres 0..20, reguły poziomu 2 (liczby po obu
  stronach „=”, piramidka 2 nad 3, znaki przy 3 liczbach z kompletem czterech zestawów), litera WIELKA,
  karty-znaki tej samej długości; testy rundy (7 różnych zadań, ≥ 4 typy, to samo ziarno = ta sama runda)
  obejmują oba poziomy. 92 testy gry.
- `figures.ts`: rysunki „ta sama litera” (górny rząd „A + A + A = 12”, pod nim „A = ?”; litery przez
  `ctx.ui.letter`) i „znaki” (pola „?” między liczbami, po rozwiązaniu „+”/„−”); piramidka liczy położenie
  kółek od szerokości dolnego rzędu; `fitRow` — długi rząd dostaje mniejszą czcionkę, żeby zmieścił się
  w jednym wierszu kartki.
- `game.ts`/`style.css`: karty-znaki (dwa znaki obok siebie, `aria-label` np. „plus, minus”); układ niskiej
  i szerokiej sceny (zadanie dodatkowe): `@container (min-aspect-ratio: 4/3) and (max-height: 420px)` —
  kartka po lewej na całą wysokość, karty 2 × 2 po prawej w polu o stałej szerokości (2 karty-słowa + odstęp),
  czcionki rysunku z `cqh`. Czcionki rysunku i szerokość wnętrza kartki są zmiennymi sceny
  (`--g-konkurs-matematyczny-figure-font`, `-code-font`, `-figure-width`).
- `README.md` gry: nowe typy, poziom 2, układy sceny, znane ograniczenie (pion).

**Decyzje podjęte w trakcie**
- **Piramidka z dwoma dodawaniami = dwa kółka nad trzema** (dwa dodawania obok siebie, np. 9 i 11 nad
  4, ?, 6). Poziom 1 ma jedno dodawanie (1 nad 2), a pełna piramidka 1–2–3 z niewiadomą na górze (trzy
  dodawania, liczenie środkowego rzędu) zostaje na poziom 3 — prosty stopień trudności. „?” bywa w dolnym
  rzędzie (oba dodawania dają tę samą odpowiedź) albo na górze.
- **Znaki:** karty to zawsze komplet czterech zestawów dwóch znaków (++, +−, −+, −−), więc karty mają tę samą
  długość i kształt, a test sprawdza, że pasuje dokładnie jeden (pozostałe działania dają inne wyniki).
  Działanie liczone od lewej; częściowe wyniki dobrej odpowiedzi są nieujemne.
- Polecenie „Ile to A?” zawiera literę zadania zwykłym pismem (to tekst polecenia, jak w tabeli typów
  PRD); litery w rysunku idą przez `ctx.ui.letter`.
- Pula poziomu 2 ma 10 zadań (ponad wymagane 9), żeby kolejne rundy różniły się zestawem, a nie tylko
  kolejnością. Ręczne sprawdzenie każdego zadania: 6+7=8+5, 9+5=8+6, 15−3=4+6+2; 4+5=9 i 5+6=11; 7+6=13
  i 6+10=16; 3·4=12; 4·5=20; 7+5−3=9 (inne: 15, 5, −1), 12−4+6=14 (22, 10, 2), 3+6+8=17 (1, 5, −11).
- Układ poziomy włącza się tylko na niskiej scenie (≤ 420 px), więc 800 × 600 zostaje „kartka nad kartami”
  z czterema kartami w rzędzie.

**Wyniki sprawdzeń**
- `npm run sprawdz-gre -- konkurs-matematyczny`: zielone. `npm run check`: zielone (40 plików, 1302 testy, build).
- Podgląd (panel przeglądarki, serwer dev na :5173):
  - klawiatura (800 × 600): poziom 2 wybrany w oknie „Wybierz poziom” strzałką i Spacją (prawdziwe
    klawisze); pierwsza runda — kilka zadań prawdziwymi klawiszami, reszta zdarzeniami klawiatury wysłanymi
    skryptem; potem dwie kolejne pełne rundy skryptem do ekranu końca (zestawy zadań różne);
  - trzy błędy pod rząd przy „znakach” (klawiatura 800 × 600 i dotyk 375 × 812): poświata kartki →
    paluszek przy dobrej karcie → „zróbmy razem”: pola „?” zamieniają się w „+” i „−”, tło „dobrze”, opis
    dla czytnika „7 plus 5 minus 3 równa się 9”; zadanie wróciło na końcu rundy z inną kolejnością kart
    (stan potwierdzony odczytem DOM, bo zrzuty z panelu łapią przenikanie w połowie);
  - dotyk 375 × 812: pełna runda poziomu 2 stuknięciami do ekranu końca; karty 2 × 2 po 103 px, odstęp 16 px;
    najdłuższe działanie „15 − 3 = 4 + ? + 2” w jednym wierszu (czcionka 29 px zamiast 36 px), wszystkie
    27 rysunków obu poziomów mieści się we wnętrzu kartki w jednym wierszu (pomiar); w poziomie 1 żaden rząd
    nie jest na tyle długi, żeby czcionka się zmniejszyła (wzór czcionki w pionie bez zmian);
  - 667 × 375: kartka 296 × 207 px i pole kart 283 × 207 px w tym samym miejscu przy każdym zadaniu (pełna
    runda poziomu 2 i poziomu 1 klawiaturą skryptem — także strzałki góra/dół w 2 × 2 — z pomiarem przy
    każdym zadaniu), karty 95 px, odstęp 16 px, nic nie wystaje ze sceny, brak przewijania; zrzuty wszystkich
    typów obu poziomów (brakująca liczba obu poziomów, kostki, ciąg, piramidka 1 i 2, podłoga, mur, kod
    z kartami-słowami, ta sama litera, znaki); „?” → odpowiedź nie zmienia rozmiaru rysunku (pomiar dla
    wszystkich 27 zadań);
  - 812 × 375 (układ poziomy) i 800 × 600 (układ „kartka nad kartami”): wszystkie rysunki mieszczą się (pomiar);
  - konsola bez błędów. Ustawienia podglądu (limit sesji, postęp gry) przywrócone; licznik czasu sesji
    hub nadpisał przy ponownym wczytaniu.
- Nie sprawdzono: krój pisany (ustawienie „pisane”) w rysunku „ta sama litera”, prawdziwe urządzenie
  dotykowe. Część rysunków (mur, kostki, część zadań) obejrzana przez wstawienie rysunku zadania na kartkę
  skryptem (ta sama funkcja `drawFigure`; litery wtedy jako zwykły `span.mg-letter`), nie w prawdziwej rundzie.
- Recenzji (`recenzent-gry`) w tej sesji nie uruchamiano — robi ją orkiestrator.

**Wskazówki dla ticketu 04**
- Nowy typ: interfejs w `logic.ts` (+ `promptOf`, ewentualnie `cardKind`), rysunek w `figures.ts`
  (`makeFigure`/`numberFigure`; długi rząd — `fitRow(el, nodes)`), `case` w `isRight` i `numbersShown`
  w teście. Test „poziom 2: … typy” sprawdza dokładny zestaw typów, a test reguł poziomu 2 rzuca błąd dla
  typów spoza listy — dopisz tam nowe typy i ich reguły (np. tarcza 2–3 trafienia, pola do 12).
- Kod literowy „ile razem” ma odpowiedź liczbową: tabelka z `codeWordFigure` do wykorzystania.
- Układ poziomy: wnętrze kartki ma ok. 262 × 173 px na 667 × 375; rysunek o wysokości do ok. 4,4 em
  (`--g-konkurs-matematyczny-figure-font`) albo ok. 6 em czcionki kodu mieści się z poleceniem w dwóch
  wierszach. Nowe rysunki sprawdź pomiarem w 667 × 375, 375 × 812 i 800 × 600.
- Pula poziomu 2 ma dziś 10 zadań; PRD chce 17 po ticketach 03 i 04.

**Pytania do rodzica**
- Czy piramidka „dwa kółka nad trzema” odpowiada temu, co miałeś na myśli przez „piramidkę z dwoma
  dodawaniami”? Jeśli wolisz pełną piramidkę 1–2–3 już na poziomie 2, to zmiana danych zadań.
- W pionie rząd kart przesuwa się trochę między zadaniami (kartka ma wysokość zależną od rysunku) — czy
  ustalić stałą wysokość kartki także w pionie (osobna poprawka)?


### Recenzja (2026-11-18)

Recenzent `recenzent-gry`: bez ustaleń KRYTYCZNYCH; wszystkie 10 zadań poziomu 2 przeliczone
niezależnie i poprawne. Do ticketu 04 przechodzą: test, że w „znakach” wyniki pośrednie dobrej
odpowiedzi mieszczą się w zakresie poziomu, oraz stała wysokość kartki w pionie (rząd kart nie może
się przesuwać między zadaniami). Do ticketu 05: zadanie „znaki” z odpowiedzią „− −” i mniej
oczywistym wynikiem. Do decyzji rodzica: litera w poleceniu „Ile to A?” jest zwykłym tekstem (przy
kroju pisanym różni się od litery na rysunku).
