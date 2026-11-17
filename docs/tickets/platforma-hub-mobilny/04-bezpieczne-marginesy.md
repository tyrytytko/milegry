---
status: zrobione
kto: agent
zalezy-od: ["02"]
prd: docs/prd/platforma-hub-mobilny.md
historyjki: [8]
---

# 04 — Bezpieczne marginesy w hubie i w grze

## Co zbudować

Hub i ramka gry odsuwają treść od wycięcia na aparat i zaokrąglonych rogów ze wszystkich czterech stron
(PRD, sekcja 4, „Bezpieczne marginesy”). Na urządzeniu bez wycięcia nic się nie zmienia. Zmiana ramki
dotyczy wszystkich gier — na telefonie z wycięciem scena w poziomie jest węższa — dlatego po zmianie
przejdź po jednej rundzie każdej z 9 gier w pionie i w poziomie. Dopisz do `docs/OTWARTE-SPRAWY.md`
pozycję dla rodzica: hub i gry na telefonie z wycięciem, w poziomie (Safari).

## Kryteria akceptacji

- [x] W hubie i w ramce gry treść (ikonka „Dla rodziców”, domek, pasek, scena, pas kontrolek) uwzględnia
      bezpieczne marginesy z góry, dołu, lewej i prawej.
- [x] Na ekranie bez wycięcia układ huba i gier jest taki sam jak przed zmianą (progi „bez przewijania”
      z PRD nadal spełnione).
- [x] Po jednej rundzie każdej z 9 gier w 375 × 812 i 812 × 375: nic nie jest ucięte, cele dotykowe
      ≥ 80 px tam, gdzie były, konsola bez błędów. (Wyjątki: klawisze cyfr 64 px na wąskim ekranie w poziomie —
      decyzja rodzica, Z-33; `orzeszki` na hipotetycznym 667 × 375 z bokami 59 px — wiewiórka ucięta o ~5 px,
      pytanie 1 w notatkach.)
- [x] `docs/ARCHITEKTURA.md` opisuje bezpieczne marginesy; `docs/OTWARTE-SPRAWY.md` ma nową pozycję.
- [x] `npm run check` przechodzi.

## Jak sprawdzić

Automatycznie:
- `npm run check`

Ręcznie (`npm run dev`, potem http://localhost:5173/):
- Podgląd nie ma wycięcia: sprawdź w narzędziach przeglądarki, że marginesy są podpięte pod wartości
  bezpiecznego obszaru, i na chwilę podstaw w narzędziach niezerowe wartości (np. 44 px z lewej
  i prawej), żeby zobaczyć odsunięcie — bez zapisywania tego w plikach.
- Dotyk (375 × 812 i 812 × 375): hub, potem każda z 9 gier — jedna runda; zwróć uwagę na `labirynt`
  (strzałki i klawiatura numeryczna po prawej) oraz `orzeszki` i `patyczki` (klawiatura numeryczna).
- Klawiatura (okno komputera): hub i jedna dowolna gra — bez zmian.

## Notatki z realizacji

**2026-11-17 (pierwsza sesja — zmiana i sprawdzenie huba oraz dwóch gier; przegląd 9 gier zostaje)**

Co zrobiono:
- `styles/tokens.css`: zmienne `--mg-safe-top/right/bottom/left` = `env(safe-area-inset-*, 0px)`
  (`index.html` ma już `viewport-fit=cover`). Hub i ramka biorą marginesy tylko z nich — da się je
  nadpisać w podglądzie.
- `shell/frame.css`: wcięcie całej `.mg-frame` o cztery marginesy (zamiast samego dolnego `env()`);
  pasek, scena i pas kontrolek zachowują swoje odstępy w środku.
- `shell/hubLayout.ts` (najpierw test): `computeHubLayout(..., safe)` z typem `SafeInsets` i `NO_INSETS`;
  boki i góra odejmowane od miejsca, z dołu `max(edgeSafe, safe.bottom)`. `hubLayout.test.ts`: zerowe
  marginesy = ten sam wynik co bez nich (1–12 gier, 5 ekranów); trzy telefony z wycięciem (pion 375 × 812,
  poziom 812 × 375, poziom 667 × 375 z bokami 44 px) — 9 gier mieści się, kafelki i przycisk w bezpiecznym
  obszarze; boki, góra i duży dół zmniejszają kafelek; mały dół nic nie zmienia. `footprint`
  i `placement` w teście uwzględniają marginesy.
- `shell/hub.css` / `hub.ts`: padding huba = odstępy + marginesy, dół siatki
  `max(--mg-edge-safe, --mg-safe-bottom)`; niewidoczna miarka `.mg-hub__safe-probe` (padding z marginesów),
  z której `hub.ts` czyta px dla `computeHubLayout` przy starcie i przy `resize`.
- `docs/ARCHITEKTURA.md` (sekcja „Bezpieczne marginesy”), `docs/OTWARTE-SPRAWY.md` (nowa pozycja).

Decyzje w trakcie:
- Z dołu w hubie większa z wartości, nie suma: pas 40 px (Z-33) już omija pasek systemu (21–34 px),
  a suma odbierałaby w poziomie ~21 px wysokości — na iPhonie w Safari z paskami hub mógłby się zacząć
  przewijać. W ramce gry dolny margines i pas pod kontrolkami się sumują, jak było przed zmianą
  (ramka miała już `padding-bottom: env(safe-area-inset-bottom)`).
- Z boków i z góry margines dochodzi do zwykłych odstępów (16 / 8 px), tak jak w ramce.
- Okna rdzenia (bramka, ekran końca rundy, panel rodzica) bez zmian — PRD, sekcja 7.

Sprawdzenia:
- `npm run check`: zielony — 39 plików testów, 1157 testów, build OK.
- Podgląd (Browser pane, localhost:5173, pomiary z DOM przed zmianą i po niej):
  - Bez wycięcia — identycznie co do piksela: hub 375 × 812 (kafelki 103 px z tytułami, przycisk
    279,8, strona 812 px) i 667 × 375 (107 px, same obrazki, strona 375 px); `labirynt` 667 × 375
    (pasek 0,0,379,96; scena 16,96,347,263; dPad bez zmian); `orzeszki` 375 × 812 (scena 16,96,343,292;
    klawisze od 52,404). Miarka czyta 0 px.
  - **Symulacja wycięcia** (podgląd go nie ma; zmienne `--mg-safe-*` nadpisane na `<html>`, bez zmian
    w plikach): hub 375 × 812 z góra 47 / dół 34 / boki 20 i 12 px, hub 667 × 375 z góra 12 / boki 44 /
    dół 60 i z boki 44 / dół 21 — jeżyk, przycisk i kafelki odsunięte z każdej z czterech stron
    o margines + zwykły odstęp, siatka kończy się nad `max(40, dół)`, strona bez przewijania (wysokość =
    ekran, bez przewijania w bok). Hub wyrenderowany od nowa z ustawionymi marginesami liczy je od razu.
    Ramka: `labirynt` 667 × 375 (góra 10, boki 44, dół 21) — domek 60,18, prawy klawisz kończy się 60 px
    od prawej, pas kontrolek kończy się 21 px nad dołem; `orzeszki` 375 × 812 (góra 47, dół 34, boki 12)
    — pasek od 47 px, domek 24,55, pas kontrolek kończy się 34 px nad dołem.
  - Rundy z symulowanym wycięciem: `orzeszki` 375 × 812 — cała runda dotykiem (w tym jedna błędna
    odpowiedź, łagodnie przyjęta) do „Brawo!”, powrót do huba. `patyczki` 667 × 375 (boki 44, dół 21) —
    wejście stuknięciem kafelka w hubie, cała runda dotykiem do „Brawo!”. `labirynt` 667 × 375 — tylko
    kilka ruchów (dotyk i strzałki), bez przejścia rundy (poziom 20 z bramkami).
  - Okno komputera: strzałki w hubie od ostatnio granej gry, Enter otwiera grę — bez zmian.
  - Konsola: jedyne błędy (`setPointerCapture`) pochodziły z mojego skryptu, który wysyłał sztuczne
    zdarzenia wskaźnika do dPadu; poza nim konsola bez błędów.
- **Znalezisko — `patyczki` przy wąskim ekranie z wycięciem:** na 667 × 375 z bokami po 44 px (takiego
  iPhone'a nie ma — iPhone'y z wycięciem mają w poziomie ≥ 812 px) kolumna sceny ma 195 px, pasek się
  zawija (poziom pod domkiem), scena ma 163 × 146 px i patyczki są przycięte. Na 812 × 375 z bokami 44
  (prawdziwy iPhone X/11 Pro/mini) scena 308 × 242 i nic nie jest ucięte; bez wycięcia na 667 × 375 też
  nic. Do oceny w przeglądzie 9 gier (telefony z Androidem z wycięciem mają zwykle ≥ 732 px w poziomie).
- Nie sprawdzone: prawdziwy telefon z wycięciem (pozycja w `OTWARTE-SPRAWY.md`, ticket 05); pełne
  przejście 9 gier (niżej).

Recenzja (`recenzent-gry`): GOTOWE dla zakresu tej sesji, brak KRYTYCZNYCH. WAŻNE: (1) brak przeglądu
9 gier — celowo zostawiony na następną sesję (kryterium 3, `w-toku`); (2) przycięte `patyczki` na
667 × 375 z bokami 44 px — do rozstrzygnięcia w przeglądzie; jeśli powtórzy się na realnych rozmiarach,
decyzja rodzica (dostosować grę albo przyjąć jako granicę). DROBNE: dopisany test z dolnym marginesem
równym pasowi 40 px (bez zmiany układu). Zostawione: wartości 16/8/40 px są w `hub.css` i w `HUB_LAYOUT`
(tak od ticketu 01, komentarze każą zmieniać razem); układ huba przelicza marginesy tylko przy starcie
i `resize` (w podglądzie po nadpisaniu zmiennych trzeba wywołać `resize`; obrót telefonu wywołuje go sam).
`npm run check` po poprawce: zielony — 39 plików, 1157 testów, build OK.

**Wskazówki dla następnej sesji (przegląd 9 gier — kryterium 3 nieodhaczone, dlatego `w-toku`):**
- Do przejścia: po jednej rundzie każdej z 9 gier (`literki`, `literki-blizniaczki`, `imie`, `orzeszki`,
  `patyczki`, `po-jednym`, `okienka`, `labirynt`, `pary`) w 375 × 812 i 812 × 375 — bez wycięcia i z
  symulowanym wycięciem (pion: `--mg-safe-top: 47px; --mg-safe-bottom: 34px`; poziom:
  `--mg-safe-left: 44px; --mg-safe-right: 44px; --mg-safe-bottom: 21px`, wpisane w `style` elementu
  `<html>`). Sprawdzić: nic nie jest ucięte, cele ≥ 80 px tam, gdzie były, konsola bez błędów. Szczególnie
  `labirynt` (dPad i klawiatura numeryczna po prawej), `orzeszki`, `patyczki`.
- Już zrobione (nie trzeba powtarzać): runda `orzeszki` 375 × 812 i `patyczki` 667 × 375 z wycięciem.
- Narzędzie podglądu: po `resize_window` hub nie dostaje zdarzenia `resize` — wywołać
  `dispatchEvent(new Event('resize'))`; współrzędne kliknięć są w układzie ostatniego zrzutu ekranu
  (bywa przeskalowany względem rozmiaru okna) — bezpieczniej klikać przez `find` / `ref`.
- `labirynt` nie reaguje na sztuczne zdarzenia z JS (strażnik wejścia) — klikać naprawdę albo strzałkami.

Pytania do rodzica: brak (znalezisko o `patyczki` dotyczy ekranu, którego iPhone z wycięciem nie ma —
do decyzji po przeglądzie 9 gier, jeśli powtórzy się na realnych rozmiarach).

**2026-11-17 (przegląd 9 gier i trzecia sesja — błąd A naprawiony, błąd B czeka na decyzję rodzica)**

Wynik przeglądu 9 gier (osobna sesja): wszystkie 9 przeszły po rundzie w pionie 375 × 812 i w poziomie
812 × 375, z wycięciem i bez; w `literki` z wycięciem przeszło 4 z 8 i 3 z 8 zadań. Znalezione:
- **Błąd A (pion):** próg „małego telefonu” (`max-height: 760px`) liczony z wysokości okna. Na 375 × 812
  z wycięciem 47/34 (miejsce 375 × 731) zostawała klawiatura 3 × 4 (408 px), scena 343 × 211, treść ucięta
  o 8–10 px (`patyczki` poz. 5, brama `labirynt`; w `orzeszki` polana maleje do 200 px).
- **Błąd B (poziom, wąski ekran z wycięciem po bokach):** niżej.
- Stan sprzed zmiany, **nie do naprawy w tym tickecie** (sprawa dla rodzica): `literki` w poziomie na dotyku —
  obszar trafienia przedmiotu ma 60 px, z wycięciem 54 px, czyli poniżej 80 px (Z-33).

Co zrobiono (błąd A):
- `shell/frame.css`: `.mg-frame` jest kontenerem zapytań `container: mg-frame / size` (wymiary treści = ekran
  bez marginesów). Reguła wcięcia pasa kontrolek i reguła zwartej klawiatury w `ui/ui.css` przeszły
  z `@media` na `@container mg-frame (max-aspect-ratio: 99/100) and (max-height: 760px) and (min-width: 360px)`.
- `docs/ARCHITEKTURA.md` (sekcja „Bezpieczne marginesy”): kontener, skutek uboczny dla okien, granica z błędu B.
  `docs/DODAWANIE-GRY.md` nie opisuje progu 760 px ani tych wymiarów — bez zmian.

Decyzje w trakcie:
- Zapytania kontenerowe zamiast atrybutu ustawianego z TypeScriptu: zero nowego kodu, działają też przy
  nadpisaniu `--mg-safe-*` w podglądzie (bez `resize`). Bez logiki w TS — nie było czego testować testem
  jednostkowym; dowodem są pomiary niżej. Progi poziome (`max-height: 520px`) zostały `@media`, bo zmieniają
  siatkę samej ramki (kontener nie może pytać o siebie).
- Kontener (`size`) czyni ramkę blokiem zawierającym dla okien `position: fixed` — sprawdzone: okno wyboru
  poziomu zajmuje 0,0 – 390 × 844, jak cały ekran. `@container` i `:has` były już wymagane przez rdzeń
  (`.mg-game-root` jest kontenerem, gry używają `@container`), więc wymagania przeglądarki się nie zmieniają.

Sprawdzenia (Browser pane, tryb dotyku: wczytanie w pionie, potem zmiana rozmiaru):
- Bez wycięcia — przed i po identycznie co do piksela (pasek / scena / pas kontrolek, x,y,szer.,wys.):

  | Ekran | `patyczki` poz. 5 i brama `labirynt` | `labirynt` dPad | `orzeszki` poz. 4 |
  |---|---|---|---|
  | 375 × 812 | 0,0,375,96 / 16,96,343,292 / 0,404,375,408 | … / 16,96,343,388 / 0,500,375,312 | jak `patyczki` |
  | 375 × 667 | 0,0,375,96 / 16,96,343,307 / 0,419,375,248 (klawisze 64) | … / 16,96,343,243 / 0,355,375,312 | jak `patyczki` |
  | 667 × 375 | 0,0,283,96 / 16,96,251,263 / 283,0,384,375 | 0,0,379,96 / 16,96,347,263 / 379,0,288,375 | jak `patyczki` |
  | 812 × 375 | 0,0,428,96 / 16,96,396,263 / 428,0,384,375 | 0,0,524,96 / 16,96,492,263 / 524,0,288,375 | jak `patyczki` |

  (`labirynt` z dPadem po zmianie zmierzony tylko w 667 × 375 z dołem 21 px: pasek i pas kontrolek o tej samej
  szerokości co przed zmianą; reguła zmieniona w tej sesji nie dotyczy poziomu ani dPadu.)
- Z wycięciem 47/34 na 375 × 812: `patyczki` poz. 5, brama `labirynt`, `orzeszki` poz. 4 — scena 343 × 371,
  klawiatura 5 × 2 (64 px), pas kontrolek kończy się 34 px nad dołem, nic nie wystaje poza scenę. 59/34 na
  390 × 844: scena 358 × 391, to samo. Rozwiązane dotykiem: `patyczki` 3 zadania (w tym dwucyfrowe 10 — po
  pojawieniu się „cofnij” scena nie zmienia wysokości), `orzeszki` 3 zadania, brama `labirynt` otwarta kodem
  (po bramie wracają strzałki). Nie przeszedłem pełnej rundy ani dojścia do domku w `labirynt`.
- `imie` i `labirynt` (dPad) w poziomie 667 × 375 z wycięciem 44/44/21: scena 259 × 242, nic nie ucięte — bez
  regresji. Brama `labirynt` w tym samym rozmiarze ma ten sam problem co błąd B (pas klawiatury 384 px).
- Konsola bez błędów. `npm run check`: zielony — 39 plików testów, 1157 testów, build OK.

**Błąd B** (naprawiony w czwartej sesji wariantem 1 — niżej). W poziomie pas klawiatury numerycznej ma stałe 384 px
(4 kolumny po 80 px, także na poziomie 1 z 3 klawiszami). Pasek (domek 80 + poziom 104 + odstęp + wcięcia)
mieści się w jednej linii, gdy jego kolumna ma ≥ ~250 px, czyli przy szerokości użytecznej ≥ ~634 px.
Pomiary `patyczki` (dół 21 px; scena szer. × wys.):

| Ekran | boki 44 px | boki 59 px |
|---|---|---|
| 667 × 375 | 163 × 146, ucięte | 133 × 146, ucięte |
| 700 × 375 | 196 × 146, ucięte | 166 × 146, ucięte |
| 740 × 375 | 236 × 242, dobrze | 206 × 146, ucięte |
| 812 × 375 | 308 × 242, dobrze | 278 × 242, dobrze |

Samą ramką nie da się tego naprawić bez zmiany tego, co widzi dziecko: nawet gdy pasek się nie zawija (próba
z zerowymi odstępami), scena 163 px jest węższa niż treść (~220 px); klawiatura 3 × 4 z klawiszami 80 px ma
368 px wysokości, a miejsca jest 314 px. Warianty:
1. Zwarte klawisze (64 px, odstęp 8 px, jak w małym telefonie w pionie) także w poziomie, gdy szerokość
   użyteczna < ~634 px. Próba w podglądzie (bez zapisu): pas 296 px, pasek bez zawijania, scena 251 × 242
   (667/44), 221 × 242 (667/59), 254–324 px szer. dla 700 i 740 — nic nie ucięte. Wymaga rozszerzenia wyjątku
   Z-33 (dziś tylko „mały telefon w pionie”).
2. Zostawić jako granicę: iPhone'y z wycięciem mają w poziomie ≥ 812 px (dobrze); problem dotyczy telefonów
   z Androidem z wycięciem po bokach i szerokością < ~720–750 px. Zapisać w `OTWARTE-SPRAWY.md`.

Recenzja (`recenzent-gry`): brak KRYTYCZNYCH. WAŻNE: brak notatek z tej sesji i otwarte kryterium/pytanie —
uzupełnione tym wpisem. DROBNE: komentarz w `ui.css` („375 × 812 zostaje po staremu”) — doprecyzowany;
ostrzeżenie w `frame.css`, że wysokość ramki nie może zależeć od treści, i zdanie o oknach w ARCHITEKTURZE —
dopisane; wsparcie przeglądarek (`@container` od Safari 16) — bez zmian, bo rdzeń i gry już tego wymagały;
Z-33 w `ZASADY-DESIGNU.md` mówi „poniżej ok. 760 px wysokości” — zostawione (dokument zasad należy do rodzica;
z wycięciem chodzi o wysokość miejsca bez marginesów — do ewentualnego doprecyzowania razem z decyzją o B).

Rodzic wybrał wariant 1 (rozszerzenie wyjątku Z-33 o wąski ekran w poziomie).

**2026-11-17 (czwarta sesja — błąd B naprawiony wariantem 1)**

Co zrobiono:
- `ui/ui.css`: w progu poziomym (`@media (min-aspect-ratio: 1/1) and (max-height: 520px)`) zagnieżdżone
  `@container mg-frame (max-width: 639.98px)` — `.mg-numpad` dostaje `--mg-touch-min: 64px; --mg-touch-gap: 8px`
  (dalej 4 kolumny × 3 rzędy). Szerokość kontenera = ekran bez marginesów `--mg-safe-*`.
- `shell/frame.css`: ten sam próg — `.mg-dock:has(.mg-numpad)` ma `max-width` 4 × 64 + 3 × 8 + 16 = 296 px.
  dPad (pas 288 px) i klawisze liter (288 px) bez zmian — mieszczą się także przy 667 × 375 z bokami 59 px.
- `docs/ZASADY-DESIGNU.md` (Z-33: wyjątek opisany wymiarami bez bezpiecznych marginesów, także wąski ekran
  w poziomie), `docs/ARCHITEKTURA.md` (punkt o wąskim ekranie zamiast „granicy”), `docs/OTWARTE-SPRAWY.md`
  (pozycja o telefonie z wycięciem: mniejsze klawisze cyfr na wąskim telefonie — czy dziecko trafia).
  `docs/DODAWANIE-GRY.md` tych wymiarów nie opisuje — bez zmian. `src/games/` bez zmian.

Decyzje w trakcie:
- Próg 640 px zmierzony (`patyczki` poz. 5, klawisze 80 px, dół 21 px): pasek zawija się przy szerokości użytecznej
  ≤ 632 px (633 — jedna linia); treść sceny (`g-patyczki-plot`) wystaje o 1 px do 635 px, od 636 px mieści się.
  Wybrany próg z małym zapasem: zwarte klawisze poniżej 640 px. Bez wycięcia najwęższy telefon w poziomie
  (667 px) jest ponad progiem.
- Reguła zagnieżdżona w zapytaniu `@media` progu poziomego, żeby działała tylko w układzie „pas na całą wysokość”
  (build zachowuje zagnieżdżenie — sprawdzone w `dist/`).

Sprawdzenia (Browser pane, tryb dotyku: wczytanie w pionie; pomiary w ramkach `iframe` danego rozmiaru na tej samej
karcie oraz w samej karcie po zmianie rozmiaru):
- Bez wycięcia, przed zmianą i po niej — 16 pomiarów (pasek / scena / pas / pierwsze dwa klawisze / przewijanie):
  `patyczki` poz. 5, `labirynt` poz. 5 (dPad), `orzeszki` poz. 4, `imie` × 375 × 667, 375 × 812, 667 × 375,
  812 × 375 — identyczne co do piksela (jak w tabeli wyżej). W `imie` różniła się tylko liczba klawiszy liter
  (losowe imię w zadaniu). Brama `labirynt` po zmianie: 667 × 375 — 0,0,283,96 / 16,96,251,263 / 283,0,384,375,
  812 × 375 — 0,0,428,96 / 16,96,396,263 / 428,0,384,375, czyli jak w tabeli sprzed zmiany (bramy przed zmianą
  w tej sesji nie mierzyłem — porównanie z tabelą z trzeciej sesji).
- Z wycięciem (dół 21 px; scena szer. × wys., klawisz / odstęp; pasek zawsze 96 px — bez zawijania):

  | Ekran | boki 44 px | boki 59 px |
  |---|---|---|
  | 667 × 375 | 251 × 242, 64/8 | 221 × 242, 64/8 |
  | 700 × 375 | 284 × 242, 64/8 | 254 × 242, 64/8 |
  | 740 × 375 | 236 × 242, 80/16 | 294 × 242, 64/8 |
  | 812 × 375 | 308 × 242, 80/16 | 278 × 242, 80/16 |

  Tak samo `patyczki` poz. 1 i 5, `orzeszki` poz. 1 i 4 i brama `labirynt` poz. 5. Nic nie wystaje poza scenę
  (sprawdzone prostokątami wszystkich elementów gry), z wyjątkami: `patyczki` poz. 1 przy 740/59 — obszar patyczków
  wystaje o < 1 px (zaokrąglenie, nic widocznego); **`orzeszki` przy 667/59 (szer. użyteczna 549 px)** — polana
  ma najmniejszą szerokość ok. 232 px, scena 221 px, wiewiórka ucięta o ~5 px z lewej. Wymiary w pikselach
  CSS; klawisze kończą się ≥ 16 px od prawego marginesu i ≥ 40 px nad dolnym; strona bez przewijania.
- `imie` i `labirynt` (dPad) na 667 × 375 z 44/44/21 i 59/59/21: scena 259 × 242 i 229 × 242, klawisze 80/16,
  nic nie ucięte — bez regresji.
- Pion 375 × 812 z wycięciem 47/34: `patyczki` i `orzeszki` scena 343 × 371, klawisze 64/8; `labirynt` (dPad)
  343 × 307 — jak po trzeciej sesji.
- Dotykiem (zwarte klawisze): `labirynt` poz. 5 na 667 × 375 z 44/44/21 — dojście strzałkami ekranowymi do bramy,
  kod wpisany klawiszem 64 px, brama otwarta, strzałki wróciły (80 px). `patyczki` poz. 5 na 700 × 375 z 59/59/21 —
  dwa zadania rozwiązane stuknięciem. Konsola bez błędów.
- `npm run check`: zielony — 39 plików testów, 1157 testów, build OK.

Recenzja (`recenzent-gry`): GOTOWE, brak KRYTYCZNYCH. WAŻNE: kryterium 3 odhaczone mimo uciętej wiewiórki
w `orzeszki` 667/59 — dopisany jawny wyjątek przy kryterium (sprawa gry, pytanie 1). DROBNE: Z-33 doprecyzowana
(„niski i wąski ekran w poziomie”, do 520 px wysokości); 64/8 px i próg 640 px wpisane w `ui.css` i `frame.css`
(jak przy pionie, komentarze odsyłają do siebie) — zostawione; zakres 730–760 px w `OTWARTE-SPRAWY.md` to
przeliczenie progu 640 px na boki 44–59 px — zostawione.

Nie sprawdzone: prawdziwy telefon z wycięciem (pozycja w `OTWARTE-SPRAWY.md`); pełna runda w poziomie z wycięciem
w `orzeszki`; klawiatura komputera (reguła działa tylko w niskim oknie w poziomie, układ okna komputera się nie zmienia).

Pytania do rodzica:
1. `orzeszki` przy bardzo wąskim ekranie (667 × 375 z wycięciem 59 px po bokach — takiego telefonu raczej nie ma)
   wiewiórka jest ucięta o ~5 px; to sprawa gry (najmniejsza szerokość polany). Zostawić czy osobna zmiana gry?
2. `literki` w poziomie na dotyku: obszar trafienia przedmiotu 60 px (z wycięciem 54 px) < 80 px — osobna
   zmiana gry (`/grill-me`)?
