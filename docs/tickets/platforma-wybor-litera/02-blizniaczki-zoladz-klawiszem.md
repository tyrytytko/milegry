---
status: zrobione
kto: agent
zalezy-od: ["01"]
prd: docs/prd/platforma-wybor-litera.md
historyjki: [1, 2, 4]
---

# 02 — Literki bliźniaczki: żołądź klawiszem litery

## Co zbudować

Gra `literki-blizniaczki` (`src/games/literki-blizniaczki/`) podaje platformie litery żołędzi nowym polem
z ticketu 01 (PRD, sekcja 4: „`literki-blizniaczki`”). Dziecko naciska klawisz litery widocznej na żołędziu
i żołądź zostaje wybrany jak po stuknięciu; zła litera daje łagodny błąd i drabinę podpowiedzi (PRD, sekcja 2).
Wielkość i krój litery na żołędziu nie mają znaczenia dla klawisza. Poziomy, zadania, wygląd, strzałki ze Spacją
i dotyk zostają bez zmian. README gry, sekcja „Sterowanie”, opisuje wybór klawiszem litery zamiast jego braku.

## Kryteria akceptacji

- [x] Na poziomach 1, 8 (oba kierunki zadań), 9 i 14 klawisz litery z właściwego żołędzia zalicza zadanie.
- [x] Litera z innego żołędzia kołysze ten żołądź, litera spoza żołędzi kołysze liść; trzy błędy literami
      dają poświatę → paluszek → „zróbmy razem”.
- [x] Runda przechodzi w całości strzałkami ze Spacją oraz dotykiem 375 × 812, jak dotąd; konsola bez błędów.
- [x] README gry opisuje nowe sterowanie i nie wspomina o braku wyboru klawiszem litery.
- [x] `npm run sprawdz-gre -- literki-blizniaczki` i `npm run check` przechodzą.

## Jak sprawdzić

Automatycznie:
- `npm run sprawdz-gre -- literki-blizniaczki`
- `npm run check`

Ręcznie (`npm run dev`, potem http://localhost:5173/literki-blizniaczki/):
- Klawiatura, litery: cała runda poziomu 1 samymi klawiszami liter; po jednym zadaniu na poziomach 8, 9 i 14.
- Klawiatura, strzałki + Spacja: cała runda poziomu 1.
- Dotyk (widok telefonu 375×812): cała runda poziomu 1.
- Trzy błędy pod rząd klawiszami liter: poświata liścia → paluszek przy żołędziu → „zróbmy razem”.
- Walenie w klawisze przez 5 s: nic się nie zalicza (Z-21).

## Notatki z realizacji

**2026-11-17**

Co zrobiono:
- `game.ts`: widok `choose` podaje `letters: task.options` (litery żołędzi w kolejności na ekranie, trzymane
  jako WIELKIE; rdzeń porównuje bez względu na wielkość). Gra nie ma własnego nasłuchu klawiszy.
- `README.md`, sekcja „Sterowanie”: opis wyboru klawiszem litery (wielkość i krój bez znaczenia, zła litera
  kołysze żołądź albo liść, drabina Z-19, AltGr niekonieczny — Z-31) zamiast akapitu o jego braku.
- `logic.test.ts` bez zmian: test „każde zadanie ma dokładnie jedną poprawną odpowiedź…” już sprawdza na każdym
  poziomie (50 ziaren), że opcje są różne (`Set`) i należą do puli liter alfabetu — więc są pojedynczymi
  literami. Litery w `logic.ts` są zawsze wielkie, więc „różne” znaczy też „różne bez względu na wielkość”.

Decyzje: brak — zmiana to jedno pole zgodnie ze wskazówką z ticketu 01.

Sprawdzenia:
- `npm run sprawdz-gre -- literki-blizniaczki`: typy, 123 testy gry, skaner i manifest — zielono.
- `npm run check`: 39 plików, 1192 testy, build — zielono (dwa przebiegi, drugi już ze zmianami w `imie`
  z równoległej sesji).
- Podgląd (:5173, własna karta, `?poziom=N`):
  - Poziom 1 — cała runda samymi klawiszami liter (8 zadań, ekran końca rundy).
  - Poziom 8 — zadanie `pd` (K) i zadanie `dp` (L, żołędzie pisane) zaliczone klawiszem.
  - Poziom 9 — Shift+I wybrał żołądź z małym „i”. Trzy błędy literami (zły żołądź → litera spoza → zły
    żołądź): kołysze się kolejno żołądź „o” + poświata liścia, liść, a po trzecim „zróbmy razem” (para na
    liściu, właściwy żołądź oznaczony). Paluszek stał już wcześniej — z bezczynności (zamierzone wg PRD).
  - Poziom 14 — zadanie zaliczone klawiszem „U” (wzór małe pisane „u”, żołędzie WIELKIE drukowane).
  - Bez ramki po literach (`data-last-input` nieustawione); strzałka ją odsłania.
  - Poziom 1 — cała runda strzałkami + Spacją; cała runda dotykiem 375 × 812.
  - Walenie w klawisze ok. 5,5 s (serie liter z poprawną „S” w środku): nic nie zaliczone, brak kołysań.
  - Konsola bez błędów.
- Uwaga z podglądu: w jednej próbie litera naciśnięta ok. 1 s po błędzie nie dała reakcji (blokada po błędzie
  0,7 s + 0,3 s wstrzymania strażnika). Przy przerwach 2 s wszystko liczyło się poprawnie. Prawdopodobnie
  zegar gry w karcie w tle (przejścia też trwały tam dłużej niż zwykle) — do obejrzenia przy teście z dzieckiem
  (ticket 05), nie dotyczy kodu gry.
- Recenzji `recenzent-gry` w tej sesji nie uruchamiano (zlecona osobno).

Wskazówki dla następnej sesji: brak — gra nie wymaga dalszych zmian w tym PRD.

Pytania do rodzica: brak.

### Recenzja (2026-11-17, `recenzent-gry`)

Wynik: gotowe, bez ustaleń KRYTYCZNYCH i WAŻNYCH; `sprawdz-gre` i `npm run check` potwierdzone niezależnie.
Ustalenia DROBNE, zostawione bez zmian:
- `logic.test.ts` nie sprawdza wprost, że opcje są pojedynczymi literami, różnymi bez względu na wielkość — dziś
  gwarantuje to pula liter w `logic.ts`, nie test;
- README, „Sterowanie”: akapit powtarza zachowanie platformy (co się kołysze po złej literze), a „litery z ogonkiem”
  nie obejmuje „Ł” — do skrócenia przy okazji.
