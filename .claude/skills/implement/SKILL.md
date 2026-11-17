---
name: implement
description: Realizuje dokładnie jeden ticket z docs/tickets/ - nowa gra z generatora, test logiki najpierw, kod, npm run sprawdz-gre, podgląd w przeglądarce (klawiatura i dotyk), npm run check, recenzja subagentem recenzent-gry, aktualizacja statusu i notatek, commit po zgodzie rodzica. Przy tickecie rodzica przygotowuje instrukcję odbioru. Czwarty krok flow; jeden ticket na sesję.
argument-hint: "[ścieżka ticketu | slug | nastepny]"
disable-model-invocation: true
allowed-tools:
  - Bash(npm run check)
  - Bash(npm run typecheck)
  - Bash(npm run test)
  - Bash(npm run sprawdz-gre *)
  - Bash(npm run nowa-gra *)
  - Bash(npx vitest run *)
  - Bash(git status *)
  - Bash(git diff *)
---

# /implement — jeden ticket, porządnie sprawdzony

Argument: $ARGUMENTS

## Najważniejsze zasady

1. **Jeden ticket na sesję.** Po zakończeniu zatrzymaj się, nawet jeśli następny wygląda na łatwy.
2. **`zrobione` tylko z dowodem:** zielony `npm run check` + podgląd w przeglądarce (albo
   potwierdzenie rodzica) + recenzja bez ustaleń KRYTYCZNYCH.
3. **Status zmieniasz jawnie:** `w-toku` zapisujesz w pliku ticketu, zanim zaczniesz pracę;
   `zrobione` albo `zablokowane` na końcu.
4. **Trzymaj się ticketu.** Nic ponad kryteria akceptacji. Pomysły zapisz w notatkach.
5. **Gra = jeden folder.** Ticket gry zmienia tylko `src/games/<id>/` (plus plik ticketu).
   Pliki poza nim wolno zmieniać tylko w tickecie platformy (`rodzaj: platforma` w PRD).
6. **Reguły z `docs/ZASADY-DESIGNU.md` i skaner reguł kodu** (`src/core/rules/gameRules.ts`) są twarde.
7. **Commit tylko po zgodzie rodzica** (krok 9). Nigdy `git push`.

## Krok 1. Wybór ticketu

- Ścieżka do pliku → ten ticket.
- Slug → szukaj w `docs/tickets/<slug>/`.
- `nastepny`, `następny` albo brak argumentu → szukaj we wszystkich `docs/tickets/*/`.

**Następny** = ticket o najniższym numerze ze `status: do-zrobienia`, którego wszystkie
`zalezy-od` mają `status: zrobione`. Wcześniej:
- jest ticket `w-toku` → zapytaj, czy go dokończyć (to zwykle przerwana sesja);
- kandydaci w kilku folderach → zapytaj, którą grę lub zmianę robimy;
- brak kandydatów → powiedz, co blokuje (np. ticket rodzica czeka na odbiór) i zakończ.

Podaj rodzicowi numer, tytuł i jednym zdaniem, co powstanie.

## Krok 2. Ticket rodzica (`kto: rodzic`) — nie programujesz

1. Ustaw `status: w-toku`. Uruchom podgląd (krok 6b), żeby gra była gotowa do obejrzenia.
2. Daj rodzicowi instrukcję z sekcji „Jak sprawdzić”: adres, co kliknąć, co dać dziecku,
   na co zwrócić uwagę, co odpisać („OK” albo co poprawić). Czekaj na odpowiedź.
3. Odbiór udany → wpisz wynik do notatek, `status: zrobione`, przejdź do kroku 8.
4. Potrzebne poprawki → zapisz uwagi w notatkach; za zgodą rodzica utwórz nowy ticket
   `kto: agent` (kolejny wolny numer, format jak w `/to-tickets`), a temu ustaw z powrotem
   `status: do-zrobienia` i dopisz nowy numer do jego `zalezy-od` — odbiór powtórzy się po poprawce.

## Krok 3. Start (ticket agenta)

1. Ustaw `status: w-toku` i zapisz plik ticketu.
2. Przeczytaj: ticket, PRD (`prd:` z frontmattera; `dotyczy:` w PRD to id gry, czyli folder
   `src/games/<id>/`), `docs/DODAWANIE-GRY.md`, `docs/ZASADY-DESIGNU.md` oraz „Notatki z realizacji”
   wcześniejszych ticketów z tego folderu. API sprawdzaj w kodzie (`src/core/round/index.ts`,
   `src/core/types.ts`), nie zgaduj. Ticket platformy: dodatkowo `docs/ARCHITEKTURA.md`.
3. **Nowa gra bez folderu** (zwykle ticket 01): `npm run nowa-gra -- <id> "<Tytuł>" [obszar]`
   (id, tytuł i obszar z PRD). Generator kopiuje działający szablon; miejsca do uzupełnienia
   są oznaczone `PODMIEŃ`. Komunikat o błędnym albo zajętym id → zatrzymaj się i zapytaj rodzica.

## Krok 4. Logika: najpierw test

Według `docs/DODAWANIE-GRY.md`, sekcja 3. Jeden przypadek naraz: test, który nie przechodzi → najmniejszy
kod, który go spełnia → zielono → następny. Testuj zachowanie i właściwości z sekcji 5 PRD (np. „każdy
poziom 1..N ma rozwiązanie”), nie szczegóły wewnętrzne; oczekiwanej wartości nie licz tym samym kodem,
który testujesz.

## Krok 5. Widok i sterowanie

Według `docs/DODAWANIE-GRY.md`: wybierz `runRound` (N zadań po kolei) albo `createCoach` (własna
pętla) — sekcja 2; omiń pułapki z sekcji 4. Podpowiedzi, reakcję na błąd i koniec rundy daje
warstwa rundy — nie buduj ich sam.

## Krok 6. Weryfikacja (w tej kolejności, każda musi przejść)

a. **Szybki sygnał:** `npm run sprawdz-gre -- <id>` (typy, testy gry, skaner reguł, manifest,
   pozostałe `PODMIEŃ`). Ticket platformy: `npm run typecheck` i `npm run test`. Czerwono → napraw → powtórz.

b. **Podgląd w przeglądarce** według `docs/DODAWANIE-GRY.md`, sekcja 5 (klawiatura, dotyk 375×812, trzy
   błędy pod rząd, konsola). Do tego: gra jest w hubie (`/`) i się otwiera, powrót do domu działa, kroki
   z sekcji „Jak sprawdzić” ticketu. Ticket platformy: zmienione ekrany zamiast gry, plus jedna istniejąca
   gra na próbę, że nic się nie zepsuło. Brak narzędzi przeglądarki → daj rodzicowi krótką instrukcję
   (adres, co kliknąć, jak włączyć widok telefonu: F12, ikonka telefonu) i poproś o potwierdzenie.
   Bez niego nie ustawiaj `zrobione`.

c. **`npm run check`** (typy, wszystkie testy, build). Czerwono → napraw → powtórz.

d. **Recenzja.** Uruchom subagenta `recenzent-gry` i przekaż mu: ścieżkę ticketu, ścieżkę PRD,
   listę zmienionych plików (`git status --porcelain -uall`), wynik `npm run check` i jedno zdanie
   o podglądzie (co przeszło klawiaturą, co dotykiem). Ustalenia KRYTYCZNE i WAŻNE popraw (albo
   w notatkach uzasadnij, czemu nie); DROBNE zapisz w notatkach. Po poprawkach powtórz (c),
   a gdy zmienił się widok — także (b). Ponowną recenzję zleć tylko po dużych poprawkach; najwyżej 2 rundy.

## Krok 7. Zamknięcie ticketu

1. Odhacz spełnione kryteria (`- [x]`).
2. W „Notatki z realizacji” dopisz: datę; co zrobiono (2–5 punktów); decyzje podjęte w trakcie;
   wynik sprawdzeń; uwagi recenzenta i co z nimi zrobiono; **wskazówki dla następnej sesji**;
   pytania do rodzica.
3. Ustaw `status: zrobione`. Jeśli nie da się dokończyć: `status: zablokowane`, a w notatkach
   powód i czego potrzeba (decyzji rodzica, zmiany w platformie…).

## Krok 8. Raport dla rodzica (bez żargonu)

Co powstało, jak to obejrzeć (`npm run dev`, adres, co kliknąć), co zostało sprawdzone,
ewentualne pytania.

## Krok 9. Commit — reguła

Commit (zapisanie zmian w historii projektu) proponujesz tylko, gdy `npm run check` jest zielony
i plik ticketu ma zaktualizowany status. Pokaż listę plików i opis po polsku:
`<slug> NN: <tytuł ticketu>` + 2–4 linie (co, kluczowe decyzje, następny krok).
Zapytaj: „Zapisać zmiany (commit)?” i rób commit dopiero po „tak”. Jeden ticket = jeden commit,
razem z plikiem ticketu. Bez `git push`, bez pomijania hooków. Gdy rodzic odmówi, zostaw zmiany
niezapisane i powiedz, że może zrobić commit później.

## Definicja ukończenia

- [ ] Pracowano nad dokładnie jednym ticketem.
- [ ] `npm run check` zielony; podgląd w obu trybach sterowania przeszedł (lub rodzic potwierdził).
- [ ] Recenzja bez otwartych ustaleń KRYTYCZNYCH.
- [ ] Ticket ma odhaczone kryteria, notatki i status `zrobione` albo `zablokowane` z powodem.
- [ ] Rodzic dostał raport; commit zrobiony albo świadomie odłożony.

## Co dalej

Powiedz rodzicowi: „Wpisz `/clear`, a potem `/implement <slug>` — weźmiemy następny ticket.”
Gdy wszystkie tickety są `zrobione`: „Gra (zmiana) gotowa. Jak ją wypuścić — patrz `README.md`,
sekcja „Publikacja”.”
