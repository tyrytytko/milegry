---
status: zrobione
kto: agent
zalezy-od: ["01"]
prd: docs/prd/platforma-wiek.md
historyjki: [1]
---

# 02 — Zasady i opisy dla wieku 3–7

## Co zbudować

Dokumenty i teksty platformy opisują stan po wprowadzeniu wieku 5–7. `docs/ZASADY-DESIGNU.md`
dostaje dwa wyjątki dla gry `konkurs-matematyczny` (przy Z-10 i przy Z-37) oraz dopowiedzenie przy
Z-39 — w brzmieniu z sekcji 4 PRD, w tym samym stylu co istniejące wyjątki. Sekcja „O Miłych Grach”
w panelu rodzica mówi o wieku 3–7 lat. Miejsca w `README.md`, nagłówku `CLAUDE.md` i `docs/FLOW.md`,
które mówią „dla dzieci 3–5 lat”, mówią o wieku 3–7 z domyślnym przedziałem 3–5. Wskazówka o czasie
przed ekranem w panelu zostaje bez zmian.

## Kryteria akceptacji

- [x] `docs/ZASADY-DESIGNU.md` ma wyjątek przy Z-10 i przy Z-37 dla gry `konkurs-matematyczny` oraz
      dopowiedzenie przy Z-39, że wiek dobiera gry w hubie, a poziomu nie przypisuje.
- [x] Sekcja „O Miłych Grach” w panelu rodzica mówi „3–7 lat”.
- [x] Wyszukanie „3–5” w `README.md`, `CLAUDE.md` i `docs/` nie znajduje już opisu całego produktu
      jako „dla dzieci 3–5 lat” (zostają nazwa przedziału i opisy pojedynczych gier).
- [x] `npm run check` przechodzi.

## Jak sprawdzić

Automatycznie:
- `npm run check`

Ręcznie (`npm run dev`, potem http://localhost:5173/):
- Wejdź do panelu rodzica i przeczytaj sekcję „O Miłych Grach”; sprawdź, że „Czas przed ekranem”
  ma dotychczasowe brzmienie.
- Przeczytaj zmienione fragmenty `docs/ZASADY-DESIGNU.md`: wyjątki wskazują grę po id i podają powód.

## Notatki z realizacji

**2026-11-18**

Co zrobiono:
- `docs/ZASADY-DESIGNU.md`: wyjątek przy Z-10 (krótkie polecenie tekstem w `konkurs-matematyczny`)
  i przy Z-37 (liczby do 20, w najtrudniejszych zadaniach do około 30, jako sam zapis) — w stylu
  wyjątków przy Z-23 i Z-38, z id gry i powodem; Z-39 dopowiada, że wiek dobiera tylko gry w hubie.
- Panel rodzica (`src/core/shell/parents.ts`): „O Miłych Grach” mówi „3–7 lat” (znaki `⁠`
  i ` ` zachowane); „Czas przed ekranem” bez zmian. Żaden test nie sprawdza tego zdania.
- Opisy całego produktu: `README.md` (3–7 lat i zdanie o domyślnym przedziale 3–5), nagłówek
  `CLAUDE.md` („3–7 lat, domyślnie 3–5”), `index.html` (meta description) i `package.json`
  (description) — „3–7 lat”.

Decyzje w trakcie:
- `docs/FLOW.md` nie opisuje wieku — bez zmian.
- `index.html` i `package.json` mówią tylko „3–7 lat”, bez przedziału domyślnego (krótkie opisy).

Sprawdzenia: `npm run check` — 39 plików, 1202 testy, build z 9 grami, zielony.

Świadomie zostawione „3–5”:
- nazwa przedziału w kodzie, testach, `docs/ARCHITEKTURA.md` i ticketach (`'3-5'`, „3–5 lat”);
- `docs/prd/` i `docs/tickets/` innych zmian (opisują stan sprzed zmiany jako problem);
- `docs/TLO.md` — pasma rozwojowe („~3–5,5 l.”, subitizing „do 3–5”) i czas pracy („3–5 dni”);
- `src/core/round/codeBuffer.ts` — komentarz uzasadnia brak Entera wiekiem 3–5 (dotyczy gier dla
  młodszych; do decyzji, czy uogólnić);
- `.claude/agents/recenzent-gry.md` — opis odbiorców w instrukcji recenzenta (poza `docs/`, do
  decyzji rodzica).

Podgląd (orkiestrator, 2026-11-18): panel rodzica na 375 × 812 — „O Miłych Grach” mówi „3–7 lat”,
„Czas przed ekranem” ma dotychczasowe brzmienie, konsola bez błędów.

Recenzja (`recenzent-gry`): GOTOWE, bez ustaleń krytycznych i ważnych. Poprawione drobne: w nagłówku
`CLAUDE.md` „domyślny przedział wieku to 3–5 lat” stoi za nawiasem z technologią.

Pytania do rodzica (pliki poza zakresem ticketu, nietknięte):
- `.claude/agents/recenzent-gry.md` opisuje odbiorców jako dzieci „w wieku 3–5 lat” — czy zmienić na
  3–7 przed pierwszą recenzją gry `konkurs-matematyczny`?
- `.claude/skills/grill-me/SKILL.md` pyta o wiek „3, 4 czy 5 lat” — czy dopisać 6–7?
- Bramka panelu rodzica (Z-29, mnożenie typu 6 × 7): czy wystarcza przy dziecku 7-letnim?
- `README.md` mówi, że gra „jest zrozumiała bez czytania” — do przejrzenia, gdy `konkurs-matematyczny`
  (wyjątek przy Z-10) trafi do katalogu.
