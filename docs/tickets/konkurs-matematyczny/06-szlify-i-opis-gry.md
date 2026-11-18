---
status: zrobione
kto: agent
zalezy-od: ["05"]
prd: docs/prd/konkurs-matematyczny.md
historyjki: [2, 6, 9]
---

# 06 — Szlify i opis gry

## Co zbudować

Przegląd całej gry po dodaniu wszystkich typów zadań. Każdy typ z tabeli typów (sekcja 4 PRD) ma być
czytelny w pionie 375 × 812 i w poziomie 667 × 375, scena ma stać w miejscu między zadaniami (nowa
treść wchodzi przenikaniem), a reakcja na dobrą odpowiedź ma mieścić się w 800 ms i szanować
ustawienie „ogranicz ruch”. Polecenie jest nazwą zadania dla czytników ekranu, a każda karta ma
nazwę równą swojej treści. `README.md` gry opisuje stan końcowy: mechanikę, typy zadań, poziomy, oba
wyjątki od zasad designu i znane ograniczenia. Gra dostaje wiersz w `docs/KATALOG-GIER.md` ze
statusem `gotowa`.

## Kryteria akceptacji

- [x] Wszystkie 10 typów zadań obejrzane w podglądzie na 375 × 812 i 667 × 375: nic nie jest ucięte,
      karty mają co najmniej 80 px z odstępem 16 px, nic interaktywnego przy dolnej krawędzi.
- [x] Między zadaniami nie zmienia się położenie ani rozmiar kartki i rzędu kart; przy „ogranicz
      ruch” zmiany wchodzą przenikaniem.
- [x] Lista kontrolna recenzji gry z `docs/ZASADY-DESIGNU.md` przechodzi, z wyjątkami zapisanymi dla
      tej gry przy Z-10 i Z-37.
- [x] `README.md` gry i wiersz w `docs/KATALOG-GIER.md` (status `gotowa`) opisują stan obecny.
- [x] `npm run check` przechodzi.

## Jak sprawdzić

Automatycznie:
- `npm run sprawdz-gre -- konkurs-matematyczny`
- `npm run check`

Ręcznie (`npm run dev`, potem http://localhost:5173/konkurs-matematyczny/):
- Klawiatura: po jednej rundzie każdego poziomu samymi strzałkami i Spacją; walenie w klawiaturę
  przez 5 sekund niczego nie zalicza.
- Dotyk (widok telefonu 375×812 i 667×375): po jednej rundzie każdego poziomu.
- Trzy błędy pod rząd: poświata → paluszek → „zróbmy razem”.
- Zrzut sceny w skali szarości; konsola bez błędów.

## Notatki z realizacji

### 2026-11-18

**Co zrobiono**
- Większe małe elementy na telefonie (kartka i rząd kart bez zmiany miejsca i rozmiaru):
  - rosnące figury: „?” stoi w rzędzie liczb pod układami, na miejscu liczby czwartego układu (rysowane
    w SVG, z kreskowanym obrysem jak inne „?”), odstęp między układami 44 → 24 jednostki, kwadraty 30 → 34
    (prawie się stykają), kółka bez zmian (przerwa do liczenia);
  - ciąg liczb: przecinek przy liczbie („30,”), szerokości cyfr i przecinka w `rowWidth` zmierzone dla kroju
    platformy (cyfra 0,61 em, przecinek 0,33 em);
  - tarcza: przy 4 i więcej pierścieniach środkowe koło ma promień 44 (było 55 przy 4), więc pasy i liczby
    pierścieni są większe (`innerRadius` w `logic.ts`; nowy test: czcionka liczb ≥ 36 z 328 przy 3 i 4 pierścieniach);
  - mur: rząd cegieł ma 1 em (było 2/3 em), jak rząd płytek podłogi;
  - kartka ma z boków odstęp 8 px (było 16 px) — szerokie rysunki mają więcej miejsca.
- Układ poziomy: wysokie rysunki (tarcza, szachownica, piramidka 1–2–3, figury nazwane) mają wysokość
  liczoną z miejsca pod poleceniem w dwóch wierszach (`--g-konkurs-matematyczny-target-height`), a odstępy
  w kartce są mniejsze (8 px, między poleceniem a rysunkiem 4 px). Wcześniej tarcza i szachownica (127–131 px)
  ściskały polecenie w dwóch wierszach (z 51 do 34 px) i tekst „strzelec?” dotykał tarczy. Polecenie ma
  `flex-shrink: 0`.
- Stały rząd kart: wszystkie karty mają szerokość karty-słowa w każdym zadaniu (`--g-konkurs-matematyczny-card-width`).
  Wcześniej w zadaniach „jakie to słowo” rząd kart był szerszy (pion: 311 zamiast 222 px) — rząd zmieniał
  rozmiar między zadaniami (Z-02).
- Czytnik ekranu: kartka (`role="group"`) ma `aria-label` = polecenie; każda karta ma `aria-label` = treść
  (liczba, słowo, „plus, minus”, „5 ciemnych i 4 jasne”), widoczna zawartość karty i polecenia jest
  `aria-hidden`. Opis muru i podłogi podaje liczbę brakujących pól w kolejnych rzędach, opis szachownicy —
  położenie brakujących pól (rząd i numer pola) obok reguły kolorów; nowa czysta funkcja `missingCells`
  w `logic.ts` (test: przykłady i zgodność z liczbą kropek dla każdego muru, podłogi i szachownicy z puli).
- `README.md` gry przepisany na stan końcowy (mechanika, czytnik ekranu, typy, poziomy, układ sceny i wielkość
  rysunków, oba wyjątki od zasad, znane ograniczenia); wiersz gry w `docs/KATALOG-GIER.md` ze statusem `gotowa`.

**Rozmiary przed → po** (pomiar `getBoundingClientRect` wszystkich 50 rysunków na kartce)

| Element | 375 × 812 | 667 × 375 |
|---|---|---|
| kwadraciki krzyżyka | 10,6 → 14,0 px | 9,2 → 13,3 px |
| kółka trójkąta i kwadratu (poziom 3) | 16,2 → 18,6 px | 14,1 → 17,6 px |
| kółka figur z dwoma rzędami (`2-figury-a`) | 21,3 → 24,2 px | 20,2 → 22,9 px |
| ciąg pięciu liczb (`3-ciag-c`), czcionka | 20,2 → 26,9 px | 19,1 → 25,5 px |
| liczby pierścieni tarczy z 4 pierścieniami, czcionka | ok. 17,8 → 20,2 px | 13,1 → 15,2 px |
| cegły muru (`1-pola-b`), wysokość | 23,1 → 29,5 px | 18,5 → 26,9 px |

**Decyzje podjęte w trakcie**
- Karty: zamiast kart kwadratowych z wyjątkiem dla słów — wszystkie karty szersze niż wysokie (pion 147,5 × 102,9,
  poziom 133,3 × 95,3, 800 × 600: 161 × 107,4). Rząd kart ma jeden rozmiar w całej grze.
- „?” rosnących figur ma wielkość liczb pod układami (mniejsze niż „?” w innych zadaniach) — tak mieści się
  w rzędzie liczb i nie zabiera szerokości rysunkowi.
- Treści zadań (liczby, karty) bez zmian; błędów merytorycznych nie znalazłem.

**Wyniki sprawdzeń**
- `npm run sprawdz-gre -- konkurs-matematyczny`: zielone (217 testów gry). `npm run check`: zielone (40 plików,
  1427 testów, build).
- Pomiar stałej sceny — każdy z 50 rysunków (przed i po rozwiązaniu) wstawiony tą samą funkcją `drawFigure`
  na kartkę: rysunek mieści się we wnętrzu kartki pod poleceniem, „?” → odpowiedź nie zmienia rozmiaru.
  Kartka i rząd kart: 375 × 812 — kartka (32; 155,3) 311 × 307,7, karty (32; 491) 311 × 221,8;
  667 × 375 — kartka (32; 112) 296,3 × 207, pole kart (352,3; 112,3) 282,7 × 206,5; 360 × 640 — kartka 296 × 263,
  karty 269,4 × 184,9 (karta 126,7 × 84,5); 800 × 600 — kartka 736 × 300,6, karty 692,1 × 107,4. W prawdziwych
  rundach (poziomy 1 i 3 w pionie, 1 i 3 w poziomie, 1 w 800 × 600 i 360 × 640) wszystkie cztery karty w tym
  samym miejscu i rozmiarze przy każdym zadaniu; odstęp kart 16 px; dół kart ≥ 56 px nad dolną krawędzią
  ekranu; treść żadnej karty nie wystaje.
- Zrzuty wszystkich rodzajów rysunków (10 typów z PRD: brakujące pola jako mur i podłoga, kod literowy w obu
  odmianach, do tego dwie litery i szachownica) w 375 × 812 i 667 × 375 obejrzane — nic nie jest ucięte ani
  nie nachodzi. Zrzuty zrobione przez wstawienie rysunku na kartkę (litery wtedy jako zwykły `span.mg-letter`);
  większość typów widziana też w prawdziwych rundach.
- Skala szarości (375 × 812, tymczasowy `filter` na `html`, potem usunięty): kod „ile razem”, krzyżyk, tarcza —
  zadanie jest najciemniejsze, tło i dekoracje jasne.
- Reakcja na dobrą odpowiedź: klasa „rozwiązane” i odpowiedź w „?” zaraz po stuknięciu (109 ms od początku
  stuknięcia ze skryptu, w tym 80 ms przytrzymania palca), tło kartki przechodzi w 400 ms — razem < 800 ms.
  W czasie reakcji i przejścia działają tylko animacje `opacity` (przenikanie treści, 400 ms) i przejścia
  kolorów kartki (400 ms) — żadnego ruchu, więc przy „ogranicz ruch” zostaje samo przenikanie. Ustawienia
  `prefers-reduced-motion` nie dało się włączyć w narzędziu (sprawdzone w kodzie i w liście animacji).
- Klawiatura (800 × 600): walenie w klawisze prawdziwymi klawiszami (ok. 70 liter i cyfr, potem Enter) — nic
  się nie zaliczyło (Enter tylko odsłonił ramkę). Pełna runda poziomu 1 prawdziwymi strzałkami i Spacją do
  ekranu końca („Jeszcze raz / Dalej / Do domu”); poziomy 2 i 3 — pełne rundy zdarzeniami klawiatury ze
  skryptu (strzałki + Spacja) do ekranu końca; po zmianie szerokości kart jeszcze jedno zadanie prawdziwymi
  strzałkami i Spacją (ramka na szerokich kartach).
- Dotyk 375 × 812 (emulacja telefonu, tryb dotyku): pełna runda poziomu 1 prawdziwymi stuknięciami, w niej trzy
  błędy pod rząd przy `1-brak-c`: poświata kartki (`.mg-hint--glow`) → paluszek przy dobrej karcie
  (`.mg-hint--tap` przy „4”) → „zróbmy razem” („?” → 4, opis „9 minus 4 równa się 5”); to zadanie wróciło
  jako ósme, na końcu rundy, z dobrą kartą na innym miejscu — potem ekran końca. Poziomy 2 i 3 — pełne rundy
  stuknięciami ze skryptu (zdarzenia wskaźnika) do ekranu końca.
- Dotyk 667 × 375: pełne rundy poziomów 1, 2 i 3 stuknięciami ze skryptu do ekranu końca.
- Nazwy dla czytnika (drzewo dostępności narzędzia i atrybuty): kartka „Ile punktów zdobył strzelec?” itd.,
  karty-liczby „27”, karty-słowa „SOK / LAS / KOS / OSA”, znaki „plus, minus, plus”, pary „5 ciemnych i 4 jasne”.
- Konsola bez błędów. `localStorage` podglądu przywrócone do wartości sprzed testów (limit sesji 15 min,
  postęp gry „ukończony poziom 1, ostatni 1”, licznik sesji); rozmiar okna — desktop; moja karta podglądu zamknięta.
- Nie sprawdzono: prawdziwy czytnik ekranu, prawdziwe ustawienie `prefers-reduced-motion`, krój pisany
  (ustawienie „pisane”) na szerokich kartach i w rysunkach, prawdziwe urządzenie dotykowe, rundy poziomów 2 i 3
  prawdziwymi klawiszami i stuknięciami (tylko zdarzeniami ze skryptu).
- Recenzji (`recenzent-gry`) w tej sesji nie uruchamiano — robi ją orkiestrator.

**Lista kontrolna recenzji gry** (`docs/ZASADY-DESIGNU.md`)
1. W ciszy i bez czytania (Z-10): **wyjątek tej gry** — co policzyć, mówi polecenie tekstem (rodzic może je
   przeczytać). Bez czytania widać, że trzeba wybrać jedną z czterech kart w miejsce „?”; dźwięk nie niesie
   żadnej informacji. Zgodne z wyjątkiem.
2. Przegrać, spóźnić się, stracić coś (Z-17, Z-22): nie da się — brak punktów, zegara, żyć; błąd to kołysanie karty.
3. Ruch i zmiany sceny (Z-01, Z-02): 0 ruchomych obiektów; między zadaniami tylko przenikanie treści (400 ms)
   i zmiana koloru kartki po rozwiązaniu; kartka i rząd kart stoją (pomiar wyżej).
4. Skala szarości (Z-13): zadanie najbardziej kontrastowe, dekoracji brak.
5. Trzy błędy (Z-18, Z-19): poświata → paluszek → „zróbmy razem”, zadanie wraca na końcu rundy; nic nie karze.
6. Walenie w klawiaturę (Z-21): nic się nie zalicza.
7. Klawiatura strzałki + Spacja i dotyk 375 × 812 (Z-31–Z-34): przechodzą; także 667 × 375; karty ≥ 80 px
   z odstępem 16 px, nic klikalnego w pasie przy dolnej krawędzi.
8. Koniec rundy (Z-23, Z-24): po 7 zadaniach (i zadaniach powtórzonych po „zróbmy razem”) ekran końca; nic nie
   startuje samo.
- Liczby (Z-37): **wyjątek tej gry** — liczby do 20 (poziom 3 do 30) jako sam zapis; poziom 1 też samym zapisem.

**Pytania do rodzica** (wszystkie otwarte z ticketów 01–06)
1. Polecenie na telefonie ma ok. 18–20 px — zostawić, czy większe? (01)
2. Wyjątek od Z-37 w `docs/ZASADY-DESIGNU.md` mówi o liczbach powyżej 10, a poziom 1 pokazuje samym zapisem
   także działania do 10 — dopisać to do wyjątku? (01)
3. Karty-słowa i litery zadań w kroju pisanym (gdy w panelu wybrano „pisane”): zostawić pisane, czy zawsze
   drukowane WIELKIE jak na konkursie? (02)
4. Piramidka z dwoma dodawaniami jako „dwa kółka nad trzema” — tak miało być, czy pełna piramidka 1–2–3 już na
   poziomie 2? (03)
5. Kod „ile razem”: zostaje „K + O + T = ?”, czy samo słowo „KOT = ?” (trudniej)? (04)
6. Rosnące figury: „?” stoi w rzędzie liczb na miejscu liczby czwartej figury, bez rysowania czwartej figury —
   wystarczy? (04, zmienione w 06)
7. Szachownica: „Ile ciemnych i ile jasnych pól brakuje?” z kartami z dwiema liczbami — czy wolisz „Ile pól
   brakuje?” z jedną liczbą? (05)
8. Krzyżyk ma na telefonie kwadraciki ok. 14 px (pion) i 13 px (poziom), a liczby pierścieni tarczy
   z 4 pierścieniami w poziomie ok. 15 px — wystarczy, skoro pod układami stoją liczby? (05, 06)
9. Piramidka 1–2–3: środek pusty (dziecko liczy samo) — zostawić, czy środek z liczbami (łatwiej)? (05)
10. Wszystkie karty są teraz prostokątne (szersze niż wysokie), żeby rząd kart był stały także przy słowach —
    w porządku? (06)

### Recenzja i sprawdzenie orkiestratora (2026-11-18)

Recenzent `recenzent-gry`: bez ustaleń KRYTYCZNYCH i WAŻNYCH; cała pula 50 zadań przeliczona
niezależnie, lista kontrolna recenzji gry przechodzi, `npm run check` zielony u recenzenta.
Poprawione DROBNE: znaki „+ − =” w rysunkach mają pełny kolor tekstu (kontrast, Z-14), komentarz
w `logic.ts` nie odsyła do ticketu, README wyjaśnia 13 wierszy tabeli typów. Zostawione DROBNE:
prawie tautologiczny test `missingCells`, brak testu nazwy karty ze znakami (`signsLabel`), brak
dolnego progu czcionki rysunku na bardzo niskim ekranie pionowym (poniżej ok. 560 px).

Orkiestrator w podglądzie: runda poziomu 3 stuknięciami na 375 × 812 (trzy błędy pod rząd →
poświata i paluszek → „zróbmy razem”, zadanie wróciło na końcu z kartami w innej kolejności, ekran
końca z jeżykiem i wiewiórką), widok 667 × 375, na 800 × 600 strzałki i Spacja wybierają kartę,
litery i cyfry nic nie robią; konsola bez błędów.

### Rozstrzygnięcie pytań (2026-11-18)

Rodzic zlecił agentowi wybór. Miarą jest to, co pierwszoklasista spotka na konkursie i co jest
zgodne z zatwierdzonym PRD:

1. Wielkość polecenia: zostaje. Polecenie ma stałe miejsce na dwa wiersze, a najdłuższe polecenia już
   je zajmują; w podglądzie na telefonie tekst jest czytelny. Do oceny na prawdziwym telefonie.
2. Wyjątek od Z-37: doprecyzowany w `docs/ZASADY-DESIGNU.md` — obejmuje wszystkie poziomy, także
   działania do 10 na poziomie 1 (tak jest w PRD).
3. Karty-słowa: krój idzie za ustawieniem rodzica, jak wszystkie litery platformy; litery zawsze WIELKIE.
4. Piramidka poziomu 2: dwa kółka nad trzema — dwa dodawania widać naraz, a pełna piramidka zostaje
   na poziom 3.
5. Kod „ile razem”: zapis „K + O + T = ?” — pokazuje, że wartości liter się dodaje.
6. Rosnące figury: „?” w rzędzie liczb wystarcza — pytanie brzmi „z ilu”, a odpowiedzią jest liczba.
7. Szachownica: dwie liczby (ciemne i jasne), jak w PRD i tickecie 05.
8. Małe elementy (krzyżyk ok. 14 px, liczby tarczy w poziomie ok. 15 px): zostają; do oceny na
   prawdziwym telefonie.
9. Piramidka poziomu 3: środek pusty — policzenie go po drodze jest treścią zadania.
10. Prostokątne karty: zostają; dzięki nim rząd kart ma ten sam rozmiar przy liczbach i słowach.
