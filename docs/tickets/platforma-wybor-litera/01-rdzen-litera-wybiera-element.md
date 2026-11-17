---
status: zrobione
kto: agent
zalezy-od: []
prd: docs/prd/platforma-wybor-litera.md
historyjki: [2, 6, 7]
---

# 01 — Rdzeń: litera wybiera element w wyborze 1 z N

## Co zbudować

Wariant „wybór 1 z N” w warstwie rundy dostaje nowe, opcjonalne pole: litera przypisana do każdego elementu
wyboru (PRD, sekcja 4: „Zmiana kontraktu”, „Litera wybiera element”, „Zła litera = łagodny błąd”). Gdy gra
poda litery, klawisz litery działa jak wybranie elementu z tą literą — tą samą drogą co stuknięcie i Spacja.
Litera z innego elementu kołysze ten element, litera spoza elementów kołysze obiekt pytania; oba przypadki
liczą się w drabinie podpowiedzi. Gra, która pola nie poda, zachowuje się jak dotąd. Podpowiedzi zostają
paluszkiem (PRD: „Podpowiedzi bez zmian”). Żadna gra nie jest w tym tickecie zmieniana — efekt widać w testach.

To zmiana kontraktu: w tym samym commicie komentarze typów w `src/core/round/index.ts`, akapit „Warstwa rundy”
w `docs/ARCHITEKTURA.md` i — jeśli gra może się potknąć (np. zła liczba liter) — pułapka w `docs/DODAWANIE-GRY.md`.
Ticket usuwa też z „Platforma — kolejka” w `docs/KATALOG-GIER.md` pozycję pilną o wyborze klawiszem litery.

## Kryteria akceptacji

- [x] Testy warstwy rundy z PRD (sekcja 5, pierwszy punkt — sześć przypadków) istnieją i przechodzą; najpierw
      test, potem kod.
- [x] Błąd gry w nowym polu (np. liczba liter inna niż liczba elementów) kończy rundę spokojnym ekranem błędu,
      jak inne błędy gry w rundzie — sprawdzone testem.
- [x] Komentarze typów opisują nowe pole i zachowanie złej litery; `docs/ARCHITEKTURA.md` jest zgodna.
- [x] Pilna pozycja o wyborze klawiszem litery zniknęła z kolejki w `docs/KATALOG-GIER.md`.
- [x] `npm run check` przechodzi.

## Jak sprawdzić

Automatycznie:
- `npx vitest run src/core/round`
- `npm run check`

Ręcznie (`npm run dev`): po jednym zadaniu klawiaturą w http://localhost:5173/okienka/
i http://localhost:5173/po-jednym/ — wybór strzałkami i Spacją działa jak dotąd, klawisz litery nic nie robi,
konsola bez błędów.

## Notatki z realizacji

**2026-11-17**

Co zrobiono:
- `ChooseView` (`src/core/round/index.ts`) ma nowe opcjonalne pole `letters?: string[]` — litera każdego
  elementu `choose`, w tej samej kolejności. Komentarz pola opisuje zachowanie i wymagania.
- `runRound.ts`: intencja `letter` w wariancie wyboru szuka elementu z tą literą (`normalizeLetter`, więc
  wielkość bez znaczenia, „A” ≠ „Ą”) i woła tę samą funkcję `answer` co stuknięcie i Spacja — ta sama ocena,
  blokada po błędzie i pauza. `checkLetters` w `wire` rzuca błąd (→ `ctx.fail`), gdy liczba liter ≠ liczba
  elementów, wpis nie jest jedną literą albo litera się powtarza (bez względu na wielkość).
- Testy w `runRound.test.ts`: blok „wybór 1 z N z literami (letters)” — sześć przypadków z PRD — oraz trzy
  nowe przypadki w tabeli „błąd w grze nie zawiesza rundy”.
- Dokumenty: akapit w „Warstwa rundy” (`docs/ARCHITEKTURA.md`), pułapka przy „Elementów `choose` nie obsługuj
  sam” i wzmianka w sekcji 2 (`docs/DODAWANIE-GRY.md`), pilna pozycja usunięta z kolejki w `docs/KATALOG-GIER.md`
  (pozycja „opcjonalne” o `imie` zostaje do ticketu 04).

Decyzje w trakcie:
- „Zła litera kołysze obiekt pytania”: litera spoza elementów idzie do `answer(false, undefined)`, które już dziś
  kołysze `view.question`. Gdy gra nie podała `question`, nic się nie kołysze (jest tylko cichy ton i szczebel
  drabiny) — kołysanie poprawnego elementu zdradziłoby odpowiedź. Opisane w komentarzu `letters`.
- Powtórzona litera i wpis dłuższy niż jeden znak to błąd gry (nie ciche pominięcie): któregoś elementu nie
  dałoby się wybrać klawiszem albo wybór byłby niejednoznaczny.
- Podpowiedź po 2. błędzie zostaje paluszkiem (`hintKey` nie jest ustawiany), zgodnie z PRD.
- Ramki wyboru nie ruszano (ticket 03): wybór literą nie przesuwa ramki; po „zróbmy razem” ramka przeskakuje
  na poprawny element jak dotąd.

Sprawdzenia:
- `npx vitest run src/core/round`: 6 plików, 88 testów — zielono (nowe testy najpierw czerwone; przypadek
  „bez letters nic nie robi” był zielony od początku, bo opisuje zachowanie dotychczasowe).
- `npm run typecheck` zielony; `npm run check`: 39 plików, 1166 testów, build — zielono.
- Podgląd (serwer dev drugiej sesji na :5173 z tego samego folderu; sprawdzone, że serwuje zmieniony
  `runRound.ts`): `/okienka/` (poziom 2) i `/po-jednym/?poziom=3` — klawisze liter (K, O, T / J, A, P) nie dały
  ani kołysania, ani podpowiedzi; zadanie zaliczone strzałkami + Spacją, przyszło następne; konsola bez błędów.
  Dotyku nie sprawdzano (ticket go nie zmienia).
- Recenzji `recenzent-gry` w tej sesji nie uruchamiano (zlecona osobno).

Wskazówki dla ticketów 02 i 04:
- Pole: `letters?: string[]` w obiekcie zwracanym z `show` (wariant `choose`), np.
  `return { choose: items, correct: task.answer, question: leaf, letters: task.options, solved }`.
  Litery w kroju/wielkości z ekranu są w porządku (`'m'`, `'ó'`) — rdzeń porównuje przez `normalizeLetter`.
- Warunki: `letters.length === choose.length`, jedna litera na wpis, bez powtórzeń bez względu na wielkość —
  inaczej runda kończy się ekranem błędu. W `literki-blizniaczki` `task.options` są już różne (test w
  `logic.test.ts`); w `imie` podaj `task.choices` (kafelki „Ł / L / inna” — sprawdź testem, że „inna” nie jest
  ani „Ł”, ani „L”).
- Bez `question` zła litera spoza elementów niczego nie kołysze; obie gry `question` podają (liść / wzór).
- Klawisz litery nie przesuwa ramki i (do ticketu 03) nadal ją odsłania — tego nie naprawiać w grze.

Pytania do rodzica: brak.

### Recenzja (2026-11-17, `recenzent-gry`)

Wynik: gotowe, bez ustaleń KRYTYCZNYCH i WAŻNYCH; `npm run check` potwierdzony niezależnie. Ustalenia DROBNE,
zostawione bez zmian:
- brak testu na literę spoza elementów, gdy gra nie podała `question` (nic się nie kołysze, błąd liczy się w drabinie);
- różność liter z ogonkiem sprawdzona testem tylko na parze „O”/„Ó”;
- kontrola „jedna litera” odrzuca zapis rozłożony (litera + znak łączący); gry w repo używają zapisu złożonego;
- akapit „Wejście” w `docs/ARCHITEKTURA.md` nie wspomina o klawiszu litery — fakt ma jedno miejsce w „Warstwie rundy”.
