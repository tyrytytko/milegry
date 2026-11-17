---
status: zrobione
kto: agent
zalezy-od: ["01"]
prd: docs/prd/platforma-hub-mobilny.md
historyjki: [5, 7]
---

# 02 — „Dla rodziców” w górnym rogu i strzałki

## Co zbudować

Przycisk „Dla rodziców” przenosi się ze stopki do pasa nagłówka, w górny róg, jako sama ikonka
(co najmniej 80 px). Nagłówek ma wysokość przycisku; obok przycisku stoją jeżyk i napis „Miłe Gry” —
tak samo w pionie i w poziomie. Stopka huba znika (PRD, sekcja 4, „Nagłówek”). Tytuły pod obrazkami są
widoczne tylko tam, gdzie się mieszczą, w obu orientacjach (PRD, sekcja 4, „Tytuły tylko tam, gdzie się
mieszczą”). Oba wymiary uwzględnia czysta funkcja układu (`hubLayout.ts`) i jej test. Wejście działa
jak dotąd: przytrzymanie 2 s, potem bramka. Do przycisku da się dojść strzałkami z siatki gier (PRD,
sekcja 4, „Klawiatura”), co pilnuje drugi test z sekcji 5 PRD. Cały hub — nagłówek i siatka — mieści
się na ekranie bez przewijania na progach z PRD (1–12 gier, od 375 × 667 i 667 × 375).

## Kryteria akceptacji

- [x] Ikonka „Dla rodziców” stoi w górnym rogu pasa nagłówka, nie nachodzi na napis ani kafelki (odstęp
      ≥ 16 px), ma co najmniej 80 px i etykietę „Dla rodziców” dla czytników ekranu; hub nie ma stopki.
- [x] Krótkie stuknięcie nic nie robi; przytrzymanie 2 s otwiera bramkę panelu rodzica.
- [x] Test nawigacji: z każdego kafelka strzałkami da się dojść do każdego innego i do „Dla rodziców”.
- [x] Test funkcji układu: dla 1–12 gier na 375 × 667 i 667 × 375 kafelek ≥ 80 px, a całość
      z nagłówkiem 80 px mieści się na ekranie; tytuły tylko na kafelku co najmniej tak szerokim jak próg,
      w obu orientacjach.
- [x] Na 375 × 667 i 667 × 375 cała strona huba (nagłówek + 9 gier) mieści się bez przewijania.
- [x] `docs/ARCHITEKTURA.md` (sekcja „Hub”) opisuje nagłówek z przyciskiem i regułę tytułów.
- [x] `npm run check` przechodzi.

## Jak sprawdzić

Automatycznie:
- `npx vitest run src/core/shell src/core/ui`
- `npm run check`

Ręcznie (`npm run dev`, potem http://localhost:5173/):
- Dotyk (375 × 812 i 667 × 375): stuknij ikonkę krótko — nic; przytrzymaj 2 s — pierścień się wypełnia,
  otwiera się bramka; wróć do huba.
- Klawiatura: strzałkami dojdź z dowolnego kafelka do ikonki i z powrotem; Enter na kafelku otwiera grę.
- Sprawdź wysokość strony na 375 × 667 i 667 × 375 — równa wysokości ekranu.
- Obróć widok (zmień rozmiar bez przeładowania) — układ i tytuły przeliczają się same.
- Konsola bez błędów.

## Notatki z realizacji

**2026-11-17 (pierwsza sesja) — zatrzymana przed zmianą kodu.** Przycisk w kolumnie z boku siatki dawał
przy 10–12 grach kafelek poniżej 80 px. Rodzic zdecydował: przycisk w pasie nagłówka 80 px, tytuły tylko
tam, gdzie się mieszczą, w obu orientacjach (PRD, sekcja 4). Na tych decyzjach oparta jest druga sesja.

**2026-11-17 (druga sesja)**

Co zrobiono:
- `hubLayout.ts`: nagłówek ma wysokość przycisku (`HUB_LAYOUT.parents` = 80 px) w obu orientacjach;
  odstęp nagłówek–siatka 16 px (`headerGap`, przycisk ≥ 16 px od kafelków); tytuły tylko gdy kafelek
  z tytułami ma ≥ `titleMinTile` (100 px), w pionie i w poziomie.
- `hubLayout.test.ts` (najpierw testy, 85 przypadków): gwarancja 1–12 gier na 375 × 667 i 667 × 375
  z nagłówkiem 80 px; 10–12 gier w pionie → same obrazki ≥ 100 px; reguła tytułów w obu orientacjach;
  test położenia przycisku i nawigacji: prostokąty kafelków i przycisku liczone w teście z `HUB_LAYOUT`
  (tak, jak stawia je CSS), przechodzone `nearestInDirection` z `focusGrid` (ten sam wybór sąsiada co
  w hubie) — z każdego elementu osiągalne wszystkie, przycisk ≥ 16 px od kafelków; 375 × 667, 375 × 812,
  667 × 375, 812 × 375, 1–12 gier.
- `hub.ts` / `hub.css`: przycisk-ikonka (`createHoldButton`, 2 s, etykieta „Dla rodziców (przytrzymaj)”)
  w prawym rogu nagłówka; jeżyk 56 px z napisem wyśrodkowany w miejscu obok przycisku; dymek
  „przytrzymaj” wyrównany do prawej krawędzi przycisku; stopka usunięta; przycisk dołączony do
  `focusGrid` jako ostatni element.
- `docs/ARCHITEKTURA.md`, sekcja „Hub”: reguła tytułów w obu orientacjach, nagłówek z przyciskiem.

Liczby (funkcja układu, potwierdzone w podglądzie z DOM): 375 × 667 i 375 × 812, 9 gier — 103 px
z tytułami; 375 × 667, 10–12 gier — same obrazki 103 px; 667 × 375 — 107 px (9 gier), 92 px (10–12);
812 × 375 — 107 px; okno 1024 × 768 — 185 px z tytułami.

Decyzje w trakcie:
- Jeżyk z napisem wyśrodkowany w miejscu obok przycisku, nie na całej szerokości (na 375 px napis
  nachodziłby na przycisk). Na 375 px: napis kończy się 18 px przed przyciskiem.
- Napis „Miłe Gry” ma ten sam rozmiar w pionie i w poziomie (nagłówek jest wszędzie ten sam).
- Z klawiatury Enter na przycisku otwiera bramkę od razu — jak dotąd (`holdButton`: klawiatura to
  świadomy wybór dorosłego); bramka zostaje.

Sprawdzenia:
- `npm run check`: zielony — 38 plików testów, 1142 testy, build OK.
- Podgląd (Browser pane, serwer na :5173, pomiary z DOM):
  - 375 × 667: przycisk 80 × 80 w (279, 8), kafelki od 104 px (odstęp 16), napis do 261 px, strona
    667 px — bez przewijania, brak stopki. 375 × 812: to samo, strona 812 px.
  - 667 × 375 i 812 × 375: same obrazki 107 px, przycisk w rogu, strona 375 px.
  - Okno 1024 × 768: tytuły, kafelek 185 px, najmniejszy odstęp przycisk–kafelek 16 px, strona 768 px.
  - Przycisk: krótkie stuknięcie (prawdziwe kliknięcie i zasymulowane zdarzenia wskaźnika 300 ms) —
    zostaje hub, dymek „przytrzymaj” mieści się na ekranie; przytrzymanie 2 s (zdarzenia wskaźnika) —
    po 1 s pierścień w połowie, po 2 s bramka z działaniem.
  - Klawiatura (okno komputera): z „Literki z imienia” i „Spadające literki” strzałka w górę → przycisk
    (widoczna ramka), w dół → „Patyczki jeżyka” (górny prawy), Enter na przycisku → bramka, Enter na
    kafelku → gra „Labirynty”. Uwaga: szybka seria strzałek jest odrzucana przez strażnika wejścia —
    w podglądzie naciskać pojedynczo.
  - Jedna gra na próbę: „Pary pod liśćmi” stuknięciem na 375 × 667 i „Labirynty” Enterem; powrót
    przytrzymaniem domku (zdarzenia wskaźnika) — hub z 9 kafelkami i przyciskiem.
  - Konsola bez błędów.
- Zmiana rozmiaru bez przeładowania (obserwacja z pierwszej sesji): nie odtworzono błędu. Przy zmianie
  375 × 667 → 667 × 375 → 375 × 812 → 812 × 375 → 1024 × 768 → 375 × 667 strona dostaje zdarzenie
  `resize` i układ (kolumny, kafelek, tytuły) się przelicza. Zrzut ekranu zrobiony tuż po zmianie
  rozmiaru potrafi pokazać stan pośredni (raz: same obrazki na 375 × 667); po chwili ten sam widok
  ma tytuły, a `data-titles` w DOM było poprawne. To właściwość narzędzia podglądu, nie huba.
- Nie sprawdzone: prawdziwy telefon i palec, prawdziwy obrót telefonu (ticket rodzica); 10–12 gier
  w przeglądarce (tylko testem funkcji układu — gier jest 9); czytnik ekranu (tylko `aria-label` w DOM).

Recenzja (`recenzent-gry`): GOTOWE, brak KRYTYCZNYCH i WAŻNYCH. DROBNE:
- Poprawione (komentarze): `HUB_LAYOUT.parents` i `--mg-frame-btn` to dwa źródła tej samej liczby —
  komentarz w `hub.css` przy nagłówku; `placement` w teście to model CSS — komentarz „zmień razem z hub.css”.
- Zostawione: na ekranie węższym niż ok. 360 px napis „Miłe Gry” może nachodzić na przycisk (wyliczone,
  nie zmierzone; poza gwarancją PRD od 375 px). Dymek „przytrzymaj” przez ok. 1,6 s zakrywa górny brzeg
  pierwszego rzędu kafelków (bez wpływu na stukanie, `pointer-events: none`) — do oceny na telefonie.

**Wskazówki dla następnej sesji:**
- Ticket 03 (reakcja kafelka na dotyk) i 04 (bezpieczne marginesy): marginesy zmienią `pad` / `padTop`
  w `HUB_LAYOUT`; test położenia przycisku w `hubLayout.test.ts` (funkcja `placement`) powtarza układ
  z `hub.css` — przy zmianie CSS zmień też ją.
- W podglądzie strzałki naciskać pojedynczo (strażnik wejścia odrzuca serię).

Pytania do rodzica: brak.
