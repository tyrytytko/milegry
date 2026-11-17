---
slug: platforma-hub-mobilny
rodzaj: platforma
dotyczy: platforma
status: zatwierdzony
data: 2026-11-17
---

# Hub na jednym ekranie

## 1. Problem — po co to robimy

Ekran wyboru gier (hub) na telefonie jest długą, przewijaną stroną: przy 9 grach i ekranie 375 × 812
zajmuje ponad trzy ekrany w pionie i ponad trzy w poziomie, a w poziomie na pierwszym ekranie nie widać
w całości żadnej gry. Trzylatek nie wie, że niżej jest coś jeszcze, a po powrocie z gry z końca listy
musi przewijać od nowa. Sporą część każdego kafelka zajmują napisy i ikonki, których dziecko nie czyta.

## 2. Rozwiązanie — jak to wygląda oczami dziecka

Dziecko otwiera Miłe Gry i od razu widzi wszystkie gry naraz — duże obrazki ułożone w równą siatkę:
trzy w rzędzie, gdy telefon stoi pionowo, pięć w rzędzie, gdy leży poziomo. Niczego nie trzeba przesuwać
ani szukać. U góry jest jeżyk z napisem „Miłe Gry”.

Gry z tego samego obszaru stoją obok siebie i mają to samo spokojne tło obrazka (litery — miodowe,
liczby — mgliste i tak dalej). Pod każdym obrazkiem jest krótki tytuł dla rodzica, który czyta dziecku
przez ramię.

Dziecko stuka obrazek: kafelek łagodnie się „wciska”, ekran spokojnie przenika i zaczyna się gra. Po
powrocie z gry dziecko widzi ten sam ekran z wszystkimi grami.

Rodzic znajduje wejście do swojego panelu w górnym rogu, jako małą ikonkę. Tak jak dziś musi ją
przytrzymać przez 2 sekundy i rozwiązać zadanie-bramkę, więc dziecko nie wejdzie tam przypadkiem.

Na tablecie i komputerze ekran wygląda tak samo, tylko kafelki są większe. Na telefonie z wycięciem
na aparat nic nie chowa się pod wycięciem ani pod zaokrąglonym rogiem — ani w hubie, ani w grze.

## 3. Historyjki użytkownika

1. Jako dziecko chcę widzieć wszystkie gry naraz, żeby wybrać tę, na którą mam ochotę, bez przewijania.
2. Jako dziecko chcę, żeby kafelek zareagował, gdy go dotknę, żeby wiedzieć, że gra zaraz się zacznie.
3. Jako dziecko chcę, żeby gry były tak samo ułożone, gdy trzymam telefon pionowo i poziomo, żeby
   nie musieć go obracać.
4. Jako rodzic chcę przeczytać tytuł gry pod obrazkiem, żeby powiedzieć dziecku, w co gra.
5. Jako rodzic chcę wejść do panelu rodzica z górnego rogu przez przytrzymanie, żeby dziecko nie trafiło
   tam przypadkiem.
6. Jako rodzic chcę, żeby gra niedostępna na moim urządzeniu (np. tylko z klawiaturą) była wyraźnie
   przygaszona, żeby dziecko nie wchodziło w coś, co nie zadziała.
7. Jako dziecko grające na komputerze chcę wybierać grę strzałkami i Enterem tak jak dotąd, żeby nie
   potrzebować myszy.
8. Jako rodzic z telefonem z wycięciem na aparat chcę, żeby przyciski i scena gry nie wchodziły pod
   wycięcie, żeby dziecko mogło w nie trafić.
9. Jako autor gry chcę, żeby nowa gra pojawiła się w siatce sama, bez zmian w hubie, dopóki gier jest
   najwyżej 12.

## 4. Decyzje implementacyjne

- **Moduły:** hub w powłoce (`src/core/shell/hub.ts`, `hub.css`), ramka gry (`src/core/shell/frame.css`)
  dla bezpiecznych marginesów. Gry (`src/games/`) nie są zmieniane.
- **Kontrakt gra ↔ rdzeń:** bez zmian. Kafelek korzysta z tego, co manifest gry już zawiera (obrazek,
  tytuł, obszar, tryby sterowania, kolejność). `docs/ARCHITEKTURA.md` aktualizujemy tylko w miejscach
  opisujących hub i bezpieczne marginesy, w tym samym commicie co zmiana.
- **Układ:** jedna siatka wszystkich gier, bez sekcji i nagłówków obszarów. Kolumny: 3 w pionie,
  5 w poziomie przy dzisiejszych 9 grach; przy 10–12 grach 3 × 4 w pionie i 6 × 2 w poziomie. Ten sam
  układ na każdym urządzeniu; większy ekran daje większe kafelki, nie inny układ.
- **Rozmiar siatki liczy czysta funkcja** (liczba gier + wymiary ekranu → liczba kolumn i rozmiar
  kafelka), osobno od widoku, żeby dało się ją testować bez przeglądarki.
- **Gwarancja „bez przewijania”:** od 375 × 667 w pionie i 667 × 375 w poziomie, dla 1–12 gier. Na
  mniejszym ekranie albo przy większej liczbie gier hub łagodnie się przewija; kafelek nigdy nie
  schodzi poniżej 80 px (Z-33).
- **Kolejność gier:** obszarami w kolejności z rejestru, w obszarze według kolejności z manifestu — jak
  dziś. Przy dzisiejszych grach rzędy pokrywają się z obszarami (litery / liczby / kształty, logika,
  pamięć).
- **Kafelek:** obrazek na tle w kolorze obszaru i tytuł pod spodem. Bez ikonek trybu sterowania. Nazwa
  obszaru i opis gry zostają w etykiecie dla czytników ekranu. Gra niedostępna w bieżącym trybie:
  przygaszony obrazek i dopisek („z klawiaturą” / „na dotyk”) jak dziś.
- **Kolor obszaru** jest pomocą dla rodzica, nie informacją potrzebną dziecku do zadania; dodatkowym
  nośnikiem jest położenie w siatce i etykieta dla czytników (Z-15). Kolory tylko z tokenów (Z-12).
- **Reakcja na dotyk:** łagodne „wciśnięcie” kafelka przy stuknięciu, czas z tokenów (Z-03), bez ruchu
  przy ustawieniu „ogranicz ruch” (Z-05). Przejście do gry: przenikanie jak dziś, bez powiększania (Z-04).
- **Nagłówek:** pas wysokości przycisku (80 px) nad siatką: jeżyk, napis „Miłe Gry” i w górnym rogu
  przycisk „Dla rodziców” jako sama ikonka, co najmniej 80 px — tak samo w pionie i w poziomie
  (decyzja rodzica; przycisk w kolumnie z boku siatki dawałby w poziomie przy 10–12 grach kafelek
  poniżej 80 px). Przytrzymanie 2 s i bramka (Z-29). Napis „Dla rodziców” zostaje jako etykieta dla
  czytników ekranu. Stopka huba znika.
- **Klawiatura:** strzałki po kafelkach i Enter jak dziś; ramka startuje od ostatnio granej gry. Do
  przycisku „Dla rodziców” da się dojść strzałkami. Na dotyku ostatnio grana gra nie jest wyróżniana.
- **Bezpieczne marginesy:** hub i ramka gry odsuwają treść od wycięcia i zaokrąglonych rogów ze
  wszystkich czterech stron. Wpływ na gry: na telefonie z wycięciem scena w poziomie jest węższa
  o szerokość wycięcia — po zmianie przegląd wszystkich gier w podglądzie.
- **Tytuły tylko tam, gdzie się mieszczą (decyzja rodzica):** gdy kafelek z tytułem byłby za wąski na
  dwuwierszowy tytuł czytelnym pismem albo mniejszy niż 80 px, hub pokazuje same obrazki, a miejsce
  po tytułach dostają obrazki. Dotyczy obu orientacji: telefonu w poziomie (np. 667 × 375) oraz
  małego telefonu w pionie przy 10–12 grach (375 × 667). Tytuł zostaje w etykiecie dla czytników
  ekranu. Tam, gdzie tytuły się mieszczą (pion przy 9 grach, większe ekrany), są widoczne.
  O widoczności tytułów decyduje funkcja układu, nie widok.

## 5. Decyzje testowe

- Test czystej funkcji układu: dla każdej liczby gier 1–12 i ekranów 375 × 667 oraz 667 × 375 kafelki
  mają co najmniej 80 px, a całość mieści się na ekranie bez przewijania.
- Test nawigacji klawiaturą: z każdego kafelka strzałkami da się dojść do każdego innego i do
  przycisku „Dla rodziców”.
- Testy globalne platformy (manifest, zakazane API, skaner reguł) muszą przechodzić.
- Ręcznie w przeglądarce: hub na 375 × 812, 375 × 667, 812 × 375 i 667 × 375 oraz na ekranie
  komputera; wybór gry dotykiem i klawiaturą; wejście do panelu rodzica; konsola bez błędów. Po
  zmianie ramki gry: po jednej rundzie każdej z 9 gier w pionie i w poziomie.
- Wyglądu (kolory, odstępy, „wciśnięcie”, wycięcie aparatu) testy automatyczne nie obejmują.

## 6. Definicja ukończenia

- [ ] Na ekranach 375 × 667 i 667 × 375 (i większych) widać naraz wszystkie 9 gier, bez przewijania.
- [ ] Każdy kafelek i przycisk „Dla rodziców” ma co najmniej 80 px, z odstępem co najmniej 16 px.
- [ ] Hub nie ma nagłówków obszarów ani ikonek trybu; obszar pokazuje kolor tła i kolejność.
- [ ] Stuknięcie kafelka daje widoczną, spokojną reakcję i otwiera grę.
- [ ] „Dla rodziców” w górnym rogu działa przez przytrzymanie 2 s i bramkę.
- [ ] Strzałki i Enter działają w hubie jak dotąd, łącznie z dojściem do „Dla rodziców”.
- [ ] Hub i ramka gry uwzględniają bezpieczne marginesy ze wszystkich stron; 9 gier przejrzanych
      w podglądzie po zmianie ramki.
- [ ] Dwa testy z sekcji 5 istnieją i przechodzą; `npm run check` przechodzi.
- [ ] `docs/ARCHITEKTURA.md` opisuje nowy hub i marginesy.
- [ ] Rodzic sprawdził hub na własnym telefonie prawdziwym palcem, w pionie i w poziomie (ticket rodzica).

## 7. Poza zakresem

- Tryb aplikacji („dodaj do ekranu głównego”, pełny ekran bez pasków przeglądarki).
- Strony przesuwane w bok i każdy inny sposób pokazania więcej niż 12 gier bez przewijania.
- Zmiany w grach: dotyk w `literki`, podpowiedź z bezczynności przy liczeniu (`orzeszki`, `patyczki`),
  rozmiar planszy w `labirynt`.
- Wyróżnianie ostatnio granej gry na dotyku.
- Zmiany w panelu rodzica i w ekranach końca rundy.

## 8. Uwagi

- Pomiary wyjściowe (hub o wysokości 2539 px przy 375 × 812 i 1290 px przy 812 × 375, kafelek
  164 × 253 px) pochodzą z podglądu przed zmianą i służą do porównania po wdrożeniu.
- Po wdrożeniu do `docs/OTWARTE-SPRAWY.md` trafia pozycja: hub i gry na telefonie z wycięciem,
  w poziomie (Safari).
- Trzynasta gra wymaga osobnej decyzji o stronach huba, zanim zostanie dodana.
