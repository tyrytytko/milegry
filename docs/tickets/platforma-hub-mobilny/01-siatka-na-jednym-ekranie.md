---
status: zrobione
kto: agent
zalezy-od: []
prd: docs/prd/platforma-hub-mobilny.md
historyjki: [1, 3, 4, 6, 9]
---

# 01 — Siatka gier na jednym ekranie

## Co zbudować

Hub pokazuje wszystkie gry naraz w jednej równej siatce, bez przewijania: układ, liczbę kolumn i próg
„bez przewijania” opisuje PRD w sekcji 4 („Układ”, „Gwarancja «bez przewijania»”, „Kolejność gier”).
Znikają nagłówki obszarów i ikonki trybu sterowania; kafelek to obrazek na tle w kolorze obszaru i tytuł
(PRD, sekcja 4, „Kafelek” i „Kolor obszaru”). Rozmiar siatki liczy czysta funkcja, osobna od widoku,
z własnym testem (PRD, sekcja 5, pierwszy test). Gra niedostępna w bieżącym trybie pozostaje przygaszona
z dopiskiem. Przycisk „Dla rodziców” w tym tickecie zostaje tam, gdzie jest — przenosi go ticket 02.
Jeśli na 667 × 375 dwuwierszowe tytuły nie mieszczą się czytelnie, zatrzymaj się i zapytaj rodzica
(PRD, sekcja 4, „Tytuły w poziomie”).

## Kryteria akceptacji

- [x] Na 375 × 667, 375 × 812, 667 × 375 i 812 × 375 widać naraz wszystkie 9 gier; siatka gier nie
      wymaga przewijania (3 kolumny w pionie, 5 w poziomie).
- [x] Test czystej funkcji układu: dla 1–12 gier i ekranów 375 × 667 oraz 667 × 375 kafelek ma co
      najmniej 80 px, a całość mieści się na ekranie.
- [x] Hub nie ma nagłówków obszarów ani ikonek trybu; nazwa obszaru i opis gry są w etykiecie kafelka
      dla czytników ekranu; kolory tylko z tokenów.
- [x] Na ekranie komputera układ jest ten sam, z większymi kafelkami; strzałki i Enter działają po
      kafelkach jak dotąd.
- [x] `docs/ARCHITEKTURA.md` opisuje nowy układ huba; `npm run check` przechodzi.

## Jak sprawdzić

Automatycznie:
- `npx vitest run src/core/shell`
- `npm run check`

Ręcznie (`npm run dev`, potem http://localhost:5173/):
- Dotyk: widok telefonu 375 × 812 i 375 × 667, potem poziomo 812 × 375 i 667 × 375 — policz kafelki
  (9), zmierz najmniejszy (≥ 80 px, odstęp ≥ 16 px), sprawdź, że strona się nie przewija; stuknij
  kafelek i wejdź do gry.
- Klawiatura (okno komputera): strzałkami przejdź po wszystkich kafelkach, Enter otwiera grę; ramka
  startuje od ostatnio granej gry.
- Wymuś w panelu rodzica tryb klawiatury na widoku telefonu i sprawdź przygaszenie kafelka gry bez
  tego trybu (dziś wszystkie gry mają oba tryby — wystarczy sprawdzenie w teście lub na chwilowej zmianie
  manifestu, której nie zapisujesz).
- Konsola bez błędów.

## Notatki z realizacji

**2026-11-17**

Co zrobiono:
- `src/core/shell/hubLayout.ts` — czysta funkcja `computeHubLayout(liczba gier, szerokość, wysokość)` →
  kolumny, rzędy, bok obrazka, wysokość nagłówka, `titles` (czy widać tytuły), `fits`; wszystkie wymiary
  w stałej `HUB_LAYOUT`, w tym próg `titleMinTile` = 100 px.
- `hubLayout.test.ts` (35 przypadków): 1–12 gier na 375 × 667 i 667 × 375 (kafelek ≥ 80 px, całość na
  ekranie), kolumny 3/5/6, duży ekran, za mały ekran, widoczność tytułów (pion, telefon w poziomie,
  10–12 gier w poziomie, duży ekran w poziomie, tytuł tylko na kafelku ≥ progu).
- `hub.ts` / `hub.css` — jedna siatka bez nagłówków obszarów i ikonek trybu; kafelek = obrazek na tle
  w kolorze obszaru (`mg-tile--<obszar>`) + tytuł; etykieta: tytuł, obszar, opis, ewentualnie „Gra
  z klawiaturą / na dotyk”. Gra spoza trybu: obrazek przygaszony, dopisek na obrazku (widoczny także bez
  tytułów). Układ przeliczany przy `resize`; `data-titles="false"` ukrywa tytuły. „Dla rodziców” w stopce.
- `docs/ARCHITEKTURA.md` — sekcja „Hub” (układ, widoczność tytułów, dopisek trybu).

Decyzje w trakcie:
- Rozmiary liczy TS i podaje do CSS (`--mg-hub-cols`, `--mg-hub-tile`, `--mg-hub-header`, `data-orientation`,
  `data-titles`), żeby wymiary były w jednym miejscu.
- Dolny pas `--mg-edge-safe` (40 px, Z-33) wliczony w „mieści się na ekranie”. 1rem = 18 px, więc tytuł
  w dwóch wierszach zajmuje 48 px; nagłówek 48 px w pionie, 44 px w poziomie.
- Tytuły w poziomie (decyzja rodzica, PRD sekcja 4): funkcja liczy kafelek z tytułami; jeśli w poziomie
  wyjdzie węższy niż `titleMinTile`, liczy go od nowa bez wysokości tytułów i ustawia `titles: false`.
  W pionie tytuły zawsze (dosłownie wg decyzji). Próg 100 px zmierzony w podglądzie: przy 100 px każdy
  dzisiejszy tytuł mieści się w 2 wierszach, przy 96 px „Kształtowe” (99 px) już nie.
- Największy kafelek 280 px (duży monitor).

Sprawdzenia:
- `npm run check`: zielony — 38 plików testów, 1092 testy, build OK.
- Podgląd (Browser pane, serwer z innej sesji na :5173, pomiary z DOM):
  - 375 × 812 i 375 × 667 (dotyk): 9 gier, 3 × 3, obrazek 103 px, odstęp 16 px, tytuły w 2 wierszach,
    siatka z pasem 40 px kończy się na 587 px — bez przewijania. Stuknięcie kafelka „Pary pod liśćmi”
    otworzyło grę, dwie karty odkryte, powrót przytrzymaniem domku do huba. Na dotyku ostatnio grana gra
    nie jest wyróżniona (ramka tylko w trybie klawiatury).
  - 667 × 375: 5 × 2, same obrazki 114 px, odstęp 16 px, siatka do 344 px. 812 × 375: 5 × 2, obrazki
    129 px, siatka do 374 px. Przeliczenie po zmianie rozmiaru bez przeładowania działa.
  - Granica progu 900 × 412: kafelek 100 px, tytuły widoczne w 2 wierszach, siatka się mieści.
  - Okno komputera (1024 × 768, potem 800 × 600): 5 × 2, obrazek 185 px, tytuły widoczne. Klawiatura:
    ramka startuje od ostatnio granej gry (sprawdzone dwa razy: „pary”, potem „po-jednym”), strzałkami
    odwiedzone wszystkie 9 kafelków, na krawędzi ramka stoi, Enter otwiera grę.
  - Przygaszenie: chwilowa zmiana manifestu w pamięci strony (bez zmian w plikach, `okienka` tylko na
    dotyk) w trybie klawiatury — obrazek przygaszony, dopisek „na dotyk”, etykieta kończy się „Gra na
    dotyk”; w 667 × 375 bez tytułów dopisek widoczny; dłuższy „z klawiaturą” mieści się w obrazku
    114 px w 2 wierszach.
  - Konsola bez błędów.
- Nie sprawdzone: prawdziwy telefon i palec (ticket rodzica 05); wymuszenie trybu klawiatury przez panel
  rodzica (tryb klawiatury był z okna komputera, a rozmiar telefonu ustawiony potem).

Recenzja (`recenzent-gry`): brak KRYTYCZNYCH. WAŻNE: ticket nieaktualny po decyzji rodzica — poprawione
(te notatki, kryterium 1). DROBNE poprawione: zdanie o progu w `ARCHITEKTURA.md` (próg tylko w poziomie),
komentarz o ograniczeniach progu w `hubLayout.ts`, test 10–12 gier w poziomie. DROBNE zostawione: stałe
w `HUB_LAYOUT` powtarzają wartości tokenów CSS i nic nie pilnuje zgodności (komentarz wskazuje tokeny);
dopisek trybu w 18 px na małym obrazku zawija się do 2 wierszy — do oceny na prawdziwym telefonie.

**Wskazówki dla następnej sesji:**
- Ticket 02: przycisk „Dla rodziców” (≥ 80 px) ma stać w górnym rogu obok nagłówka i siatki, nie w pasie
  nagłówka (PRD, sekcja 4, „Nagłówek”). Przy szukaniu miejsca uwzględnij `computeHubLayout` — dziś
  nagłówek ma 48/44 px, a siatka w poziomie wypełnia wysokość.
- Do czasu ticketu 02 stopka z „Dla rodziców” jest pod siatką i na telefonie wymaga przewinięcia strony.
- Nowa gra z długim słowem w tytule (> ok. 99 px w 18 px pogrubionym) → podnieść `titleMinTile`.

Pytania do rodzica:
- Przy 10–12 grach w pionie na 375 × 667 kafelek ma 80 px, a tytuły (pokazywane zawsze w pionie) mogą się
  nie mieścić w 2 wierszach. Czy wtedy też pokazywać same obrazki (ta sama reguła co w poziomie)? Dziś gier
  jest 9, więc to pytanie na przyszłość.
