# Miłe Gry — instrukcja dla agenta

Spokojne gry przeglądarkowe dla dzieci w wieku 3–5 lat (Vite + TypeScript, statyczny build,
interfejs po polsku). Repo rozwijają **rodzice**, którzy uczą się pracy z agentem: mów prosto,
tłumacz pojęcia przy pierwszym użyciu, fakty sprawdzaj sam w repo, decyzje o grze i dziecku
zostawiaj rodzicowi.

## Żelazne reguły

1. **Miły design.** Bez przegranej, liczników czasu, punktów, rywalizacji, migania i krzykliwych
   kolorów. Błąd = łagodna informacja i ponowna próba. Gra zrozumiała bez czytania i w ciszy.
   Reguły `Z-01…Z-39` w `docs/ZASADY-DESIGNU.md` — powołuj się na numery w ticketach i recenzjach.
2. **Gra = jeden folder** `src/games/<id>/`. Praca nad grą nie dotyka plików poza nim (jedyny wyjątek:
   status gry w `docs/KATALOG-GIER.md`). Zmiany w `src/core/` tylko w tickecie platformy (PRD z
   `rodzaj: platforma`); zmiana kontraktu aktualizuje `docs/ARCHITEKTURA.md` w tym samym commicie.
3. **Zero zapytań sieciowych w działającej grze** (CDN, fonty z sieci, analityka, `fetch`).
4. **Logika czysta i przetestowana:** `logic.ts` bez DOM, testy w `logic.test.ts`, najpierw test.
5. **Korzystaj z rdzenia:** `ctx` (wejście, zegar, losowość, dźwięk, zapis, kontrolki), warstwa rundy
   `src/core/round`, tokeny CSS `var(--mg-…)`, litery tylko przez `ctx.ui.letter`. Zakazy pilnuje
   skaner (`src/core/rules/gameRules.ts`) w testach; jego komunikat mówi, czego użyć zamiast.
6. **`npm run check` przed każdym commitem.** Commit tylko za zgodą człowieka; nigdy `git push`
   bez wyraźnej prośby; nie pomijaj hooków.
7. **Język:** interfejs, dokumenty, PRD, tickety i commity po polsku; nazwy w kodzie po angielsku
   (komentarze mogą być po polsku). Slugi, nazwy skilli i klucze frontmattera tylko ASCII.
8. **Dokumenty i komentarze opisują stan obecny** (jak jest i dlaczego), nie historię zmian — ta jest
   w git. Każdy fakt ma jedno miejsce; inne miejsca do niego odsyłają.

## Co czytać do jakiego zadania

Czytaj tylko swoją ścieżkę, w tej kolejności. API nie jest opisane w dokumentach — źródłem prawdy są
komentarze typów w `src/core/types.ts` i `src/core/round/index.ts`.

| Zadanie | Ścieżka |
|---|---|
| Nowa gra (ticket z flow, patrz „Flow pracy”) | `docs/DODAWANIE-GRY.md` → `docs/ZASADY-DESIGNU.md` → `src/core/round/index.ts` → `src/core/types.ts` → szablon `src/games-szablon/wzor/`; w miarę potrzeby `src/core/art/index.ts` (gotowe rysunki) i `src/core/styles/tokens.css` (kolory) |
| Zmiana lub poprawka gry | `docs/DODAWANIE-GRY.md` → folder gry (`README.md`, `logic.test.ts`, reszta) → w miarę potrzeby `src/core/round/index.ts` (obok niego implementacja trenera: `coach.ts`, `coachCore.ts`) i `src/core/types.ts`; `docs/ZASADY-DESIGNU.md`, gdy zmienia się to, co widzi lub robi dziecko |
| Zmiana rdzenia (`src/core/`) | `docs/ARCHITEKTURA.md` → `src/core/types.ts`, `src/core/round/index.ts` → zmieniany moduł i jego test (`*.test.ts` obok modułu) → `docs/DODAWANIE-GRY.md` (pułapki, które widzą gry); pozycje czekające na zrobienie: „Platforma — kolejka” w `docs/KATALOG-GIER.md` |
| Pytanie rodzica „jak…?” | `docs/FLOW.md`; uruchomienie i publikacja: `README.md` |

Pozostałe: `docs/KATALOG-GIER.md` (lista gier, kolejka gier i platformy), `docs/OTWARTE-SPRAWY.md`
(co rodzic ma sprawdzić na urządzeniach), `docs/TLO.md` (tło rozwojowe i opisy gier z kolejki — tylko
przy pomyśle na nową grę), `docs/prd/<slug>.md` i `docs/tickets/<slug>/` (powstają we flow).

## Komendy

- `npm install` — raz po pobraniu repo.
- `npm run dev` — podgląd: hub `http://localhost:5173/`, gra `http://localhost:5173/<id>/`.
- `npm run nowa-gra -- <id> "<Tytuł>" [obszar]` — nowa gra z szablonu.
- `npm run sprawdz-gre -- <id>` — szybki sygnał dla jednej gry (typy, testy gry, skaner, manifest).
- `npx vitest run <plik lub folder>` — wybrane testy; `npm run typecheck` — same typy.
- `npm run check` — typy + wszystkie testy + build. Musi być zielony.

## Flow pracy

Nietrywialną zmianę prowadzimy krokami: `/grill-me` (wywiad) → `/to-prd` (dokument wymagań)
→ `/to-tickets` (zadania) → `/clear` i `/implement` (jeden ticket na sesję); `/nowa-gra` łączy trzy
pierwsze kroki. Skille (`.claude/skills/`) uruchamia **tylko człowiek** — gdy rodzic opisze pomysł
bez komendy, zaproponuj właściwą komendę zamiast zaczynać samemu. Slug: nowa gra = id gry (`kolory`);
zmiana gry = `<id>-<zmiana>`; platforma = `platforma-<zmiana>`.

**Małe poprawki bez flow** (literówka, kolor z palety, oczywisty błąd w jednym miejscu): zrób
bezpośrednio, potem `npm run check` i podgląd. Gdy zmiana zmienia to, jak dziecko gra, albo wymaga
decyzji rodzica — zaproponuj `/grill-me`.

**Zgłoszony błąd:** najpierw odtwórz go (test logiki albo podgląd) i sprawdź w `README.md` gry, czy to nie
opisane zachowanie albo decyzja właściciela. Naprawa przywracająca opisane zachowanie to mała poprawka;
naprawa, która zmienia to, co dziecko widzi lub robi — `/grill-me`.

## Weryfikacja zmian w kodzie gry lub rdzenia

Zielony `npm run check` to za mało: przejdź rundę w podglądzie **klawiaturą** i **dotykiem
375 × 812**, konsola bez błędów (`docs/DODAWANIE-GRY.md`, sekcja 5). Bez narzędzi przeglądarki
poproś rodzica o sprawdzenie z dokładną instrukcją. Zmiana samych dokumentów podglądu nie wymaga.

## Subagenci

Subagent to osobny agent ze świeżą rozmową; dostaje zadanie, zwraca tylko wynik. Nie czyta tego
pliku — podaj mu potrzebne reguły i **wskaźniki do plików** zamiast kopii treści.

- **Warto:** `recenzent-gry` po każdym tickecie, przed `zrobione`; `Explore` do przeglądu wielu
  plików; długie wyjście (logi, testy), z którego potrzebne jest streszczenie.
- **Nie warto:** w wywiadzie z rodzicem, przy małych poprawkach, przy ticketach `kto: rodzic`,
  do równoległej pracy nad kilkoma ticketami.
