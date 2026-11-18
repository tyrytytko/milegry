---
status: zrobione
kto: agent
zalezy-od: ["03"]
prd: docs/prd/konkurs-matematyczny.md
historyjki: [4, 7]
---

# 04 — Poziom 2: zadania z rysunkiem

## Co zbudować

Poziom 2 dostaje typy rysunkowe ze swojego wiersza tabeli poziomów (sekcja 4 PRD): tarczę
z 2–3 trafieniami, rosnące figury, kod literowy „ile razem” i brakujące pola do 12 pól. Rysunki
powstają z danych zadania, w kolorach z palety; trafienia to kropki, a brakujące pola mają kreskowany
obrys, żeby informacji nie niósł sam kolor. Pula poziomu 2 rośnie do 17 własnych zadań.

## Kryteria akceptacji

- [x] Pula poziomu 2 ma 17 zadań ośmiu typów; wszystkie przechodzą testy puli, a runda poziomu 2 ma
      7 różnych zadań co najmniej 4 typów.
- [x] Na tarczy liczby pierścieni i kropki trafień są czytelne na 375 × 812; dobra odpowiedź zgadza
      się z sumą policzoną z danych.
- [x] Rosnące figury pokazują trzy układy podpisane liczbą i „?” na miejscu czwartego.
- [x] Zrzut sceny w skali szarości: najbardziej kontrastowe jest zadanie, a brakujące pola i trafienia
      da się odróżnić bez koloru.
- [x] `npm run check` przechodzi.

## Jak sprawdzić

Automatycznie:
- `npm run sprawdz-gre -- konkurs-matematyczny`
- `npm run check`

Ręcznie (`npm run dev`, potem http://localhost:5173/konkurs-matematyczny/):
- Klawiatura: przejdź trzy rundy poziomu 2, aż trafi się każdy z czterech nowych typów.
- Dotyk (widok telefonu 375×812) i poziomo 667×375: rysunek mieści się na kartce, karty mają co
  najmniej 80 px.
- Trzy błędy pod rząd przy tarczy: poświata → paluszek → „zróbmy razem”.

## Notatki z realizacji

### 2026-11-18

**Co zrobiono**
- `logic.ts`: trzy nowe typy zadań jako dane — `target` (tarcza: `rings` od brzegu do środka, `hits` =
  wartości pierścieni, w których leżą kropki), `growing` (rosnące figury: `shape` kółko/kwadrat, `stages` =
  trzy układy zapisane napisami `#`/`.`), `codeSum` (kod „ile razem”: tabelka i `word`). Pula poziomu 2:
  17 zadań ośmiu typów (doszły 2 × tarcza, 2 × rosnące figury, 2 × kod „ile razem”, 1 × brakujące pola).
- `logic.test.ts` (najpierw test): niezależne liczenie odpowiedzi nowych typów (suma trafień z danych,
  liczba pól `#` w układach i stały przyrost, suma wartości liter słowa; brakujące pola jak dotąd — liczba
  kropek `.`); reguły budowy (tarcza: wartości rosną ku środkowi, każde trafienie w którymś pierścieniu;
  figury: każdy układ zawiera poprzedni od lewego dolnego rogu; kod: litery WIELKIE z tabelki); reguły
  poziomu 2 (tarcza 3 pierścienie i 2–3 trafienia, do 12 brakujących pól, dokładny zestaw ośmiu typów).
  Zadanie dodatkowe (a): test, że w „znakach” wynik po każdym kroku dobrej odpowiedzi mieści się w 0..max.
  114 testów gry.
- `figures.ts`: rysunki tarczy (SVG; liczby pierścieni u góry tarczy, liczba środka trochę nad środkiem,
  kropki trafień w połowie szerokości pierścienia pod kątami z dala od liczb), rosnących figur (jeden SVG,
  układy wyrównane do dołu, pod każdym liczba pól, obok „?”) i kodu „ile razem” (tabelka jak w „jakie to
  słowo”, wydzielona do `legendEl`, pod nią „K + O + T = ?” literami `ctx.ui.letter`). Mur/podłoga: wysokość
  rysunku rośnie z liczbą rzędów; `fitWidth` zmniejsza czcionkę szerokiego obrazka (podłoga 6 × 4,
  rosnące figury), tak jak `fitRow` dla rzędów.
- Zadanie dodatkowe (b) — stała scena w pionie (`style.css`): w układach „kartka nad kartami” polecenie
  ma zawsze miejsce na dwa wiersze, a miejsce na rysunek stałą wysokość 5 czcionek rysunku. Czcionki
  rysunku i kodu są ograniczone przez `slot-room` (wysokość sceny minus karty, odstępy, polecenie), więc na
  niskiej scenie maleją zamiast wypychać karty w pas przy krawędzi. Wartości, które różnią układ poziomy
  (odstęp w kartce, interlinia i zapas polecenia), są zmiennymi sceny — zwykłe reguły w `@container`
  przegrywały z późniejszymi regułami bazowymi o tej samej wadze.
- `README.md` gry: nowe typy, pula 17, opis stałej sceny; usunięte „znane ograniczenie” o przesuwającym
  się rzędzie kart.

**Decyzje podjęte w trakcie**
- Tarcza: 3 pierścienie (dwa pierścienie i środek), liczby wyłącznie w środku pasa, kropki ≥ 8 jednostek
  od brzegów pasa (pas 47, kropka z obwódką 28). Kolory: woda/kartka/miód zmieszane z kartką; kropki
  ciemne (`--mg-ink`) z jasną obwódką — w skali szarości wyraźne.
- Kod „ile razem”: słowo pokazane z plusami między literami („K + O + T = ?”), rząd w czcionce rysunku
  (większej niż tabelka) — „razem” znaczy dodawanie, a dziecko widzi, ile liter dodaje (OKO = O + K + O).
- Rosnące figury: polecenie dobrane do kształtu („kółek”/„kwadratów”); „?” stoi obok trzeciego układu,
  bez rysowania czwartego (po rozwiązaniu „?” zamienia się w liczbę).
- Tarcza na pionie ma 4,8 czcionki rysunku (prawie całe miejsce na rysunek), w poziomie 4,4 (jak piramidka).
- Opis tarczy dla czytnika: „Tarcza: od brzegu do środka pierścienie za 1, 3, 5 punktów. Trafienia: 5, 3, 3.
  Razem: ile?”.

**Rachunki zadań** (karty: cztery kolejne liczby)
- `2-tarcza-a`: pierścienie 1, 3, 5; trafienia 5 + 3 + 3 = 11 (karty 9–12).
- `2-tarcza-b`: pierścienie 2, 5, 10; trafienia 10 + 2 = 12 (karty 11–14).
- `2-figury-a`: kółka w dwóch rzędach 2, 4, 6 (co 2) → 8 (karty 7–10).
- `2-figury-b`: kwadraty w kształcie litery L 1, 3, 5 (każde ramię rośnie o 1) → 7 (karty 6–9).
- `2-kod-a`: A=1 K=2 S=3 T=4 O=5; KOT = 2 + 5 + 4 = 11 (karty 9–12).
- `2-kod-b`: T=1 L=2 A=3 O=4 K=6; OKO = 4 + 6 + 4 = 14 (karty 12–15; „O + K” = 10 nie jest kartą).
- `2-pola-a`: podłoga 6 × 4, brakuje 4 + 4 + 2 = 10 płytek (karty 9–12).

**Wyniki sprawdzeń**
- `npm run sprawdz-gre -- konkurs-matematyczny`: zielone. `npm run check`: zielone (40 plików, 1324 testy, build).
- Podgląd (własna karta panelu przeglądarki, serwer dev na :5173):
  - pomiar stałej sceny: wszystkie 34 rysunki obu poziomów wstawione kolejno na kartkę (ta sama funkcja
    `drawFigure`): kartka i rząd kart w tym samym miejscu i rozmiarze przy każdym — 375 × 812: kartka
    311 × 308, karty 222 × 222 (103 px, odstęp 16); 800 × 600: kartka 736 × 301, karty 477 × 107 (dół kart
    dokładnie 40 px nad dołem sceny); 360 × 640: kartka 296 × 263, karty 84 px; 667 × 375 bez zmian względem
    ticketu 03: kartka 296 × 207, pole kart 283 × 207. Każdy rysunek mieści się w kartce, „?” → odpowiedź nie
    zmienia rozmiaru rysunku. Ten sam rozmiar potwierdzony w prawdziwych rundach przy każdym zadaniu;
  - klawiatura: 800 × 600 — pierwsze zadanie prawdziwymi klawiszami (strzałki + Spacja), reszta rundy
    zdarzeniami klawiatury wysłanymi skryptem; w tej rundzie trafiły się wszystkie cztery nowe typy
    (kod „ile razem”, tarcza, rosnące figury, podłoga). Dalej dwie pełne rundy skryptem w 667 × 375
    (strzałki góra/dół/bok w 2 × 2) do ekranu końca i część rundy w 375 × 812;
  - dotyk 375 × 812: pełna runda stuknięciami do ekranu końca; dotyk 667 × 375: pełna runda stuknięciami do
    ekranu końca; karty ≥ 80 px;
  - trzy błędy pod rząd przy tarczy (dotyk 375 × 812): poświata kartki → paluszek przy dobrej karcie →
    „zróbmy razem” (tło „dobrze”, opis „Razem: 12”); zadanie wróciło na końcu rundy. Stan potwierdzony
    odczytem DOM (`.mg-hint--glow` na kartce po 1. błędzie, `--tap` przy dobrej karcie po 2.); paluszek
    bezczynności stał przy dobrej karcie już przed pierwszym błędem (testy skryptem trwały długo), więc
    samo pojawienie się paluszka po 2. błędzie nie było tu widoczne jako zmiana;
  - zrzuty: tarcza, podłoga, rosnące figury (kwadraty) i kod „ile razem” w prawdziwej rundzie na 375 × 812
    i 667 × 375; rosnące figury z kółek obejrzane przez wstawienie rysunku na kartkę. Skala szarości (375 × 812):
    tarcza w prawdziwej rundzie, podłoga i kółka wstawione skryptem — zadanie jest najciemniejsze, kropki
    trafień i kreskowane brakujące płytki widać bez koloru;
  - konsola bez błędów. Ustawienia podglądu przywrócone (limit sesji 15 min, postęp gry „ukończony poziom 1”);
    licznik czasu sesji nadpisała gra.
- Nie sprawdzono: krój pisany (ustawienie „pisane”) w kodzie „ile razem”, prawdziwe urządzenie dotykowe,
  zrzut kodu „ile razem” w skali szarości. Animacje w schowanym panelu stoją, więc przed zrzutami kończyłem
  przenikanie skryptem (`getAnimations().finish()`).
- Recenzji (`recenzent-gry`) w tej sesji nie uruchamiano — robi ją orkiestrator.

**Wskazówki dla ticketu 05**
- Tarcza z 4–5 trafieniami: kąty kropek w `HIT_ANGLES` (`figures.ts`) wystarczają na 5 trafień w jednym
  pierścieniu i 3 w środku; więcej pierścieni niż 3 zwęża pasy (pas = (160 − 66) / (pierścienie − 1)) — przy
  4 pierścieniach sprawdź, czy liczby (czcionka 44 jednostki) i kropki (28) mieszczą się w pasie ~31; być
  może trzeba zmniejszyć czcionkę albo `inner`. Test reguł poziomu 2 sprawdza 3 pierścienie — dla poziomu 3
  dopisz własne reguły.
- Rosnące figury (trójkąt, kwadrat, krzyżyk) zapisuje się tymi samymi `stages`; test wymaga stałego
  przyrostu — ciąg o rosnącym przyroście (trójkąt 1, 3, 6) wymaga zmiany `isRight` w teście i reguły
  w puli. Krzyżyk nie zawiera poprzedniego od lewego dolnego rogu — test zawierania trzeba będzie uogólnić
  (np. wyśrodkowanie).
- Szachownica i inne wysokie rysunki: miejsce na rysunek ma w pionie 5 czcionek rysunku — rysunek wyższy
  niż to wyjdzie poza miejsce. Pomiar wszystkich rysunków: wstawić `drawFigure` każdego zadania do
  `.g-konkurs-matematyczny-figure-slot` i porównać prostokąty kartki i kart (375 × 812, 360 × 640, 800 × 600, 667 × 375).
- Reguły w `@container` dla `.g-konkurs-matematyczny-sheet`/`-prompt` przegrywają z późniejszymi regułami
  bazowymi — różnice układów zapisuj jako zmienne sceny.
- Pula poziomu 2 ma 17 zadań (komplet z PRD).

**Pytania do rodzica**
- Kod „ile razem”: słowo pokazane jako „K + O + T = ?” (z plusami). Czy wolisz samo słowo „KOT = ?”, jak
  bywa na konkursie (trudniej — dziecko samo musi wiedzieć, że dodaje)?
- Rosnące figury z kółek w dwóch rzędach mają na telefonie w pionie małe kółka (~22 px) — wystarczy, czy
  wolisz mniej szerokie układy?

### Recenzja (2026-11-18)

Recenzent `recenzent-gry`: bez ustaleń KRYTYCZNYCH i WAŻNYCH; 7 nowych zadań przeliczonych niezależnie,
geometria tarczy sprawdzona liczbowo, `npm run check` zielony u recenzenta. DROBNE przekazane dalej —
do ticketu 05: dopasowanie szerokości wiersza „K + O + T = ?” przed dłuższymi słowami, położenie
kropek tarczy jako czysta, przetestowana funkcja (4–5 trafień); do ticketu 06: opis muru i podłogi
dla czytników ekranu (liczba brakujących pól w rzędach), zrzut kodu „ile razem” w skali szarości.
Do decyzji rodzica: „?” w rosnących figurach stoi obok trzeciego układu jako małe pole, nie jako
miejsce czwartej figury.
