---
name: to-tickets
description: Dzieli zatwierdzony PRD (docs/prd/<slug>.md) na pionowe, demowalne tickety, pokazuje rodzicowi numerowaną listę do akceptacji i dopiero potem zapisuje pliki docs/tickets/<slug>/NN-nazwa.md. Trzeci krok flow (po /to-prd, przed /implement).
argument-hint: "[slug]"
disable-model-invocation: true
---

# /to-tickets — podział PRD na tickety

Slug: $ARGUMENTS

Ticket to jedno zadanie na jedną sesję agenta, zapisane w pliku. Po każdym tickecie coś da się
zobaczyć albo zagrać.

## Najważniejsze zasady

1. **Pionowe plastry.** Każdy ticket to cienka, ale kompletna ścieżka: logika + test + widok +
   sterowanie, po której rodzic może coś obejrzeć. Nigdy „01: cała logika, 02: cała grafika”.
2. **Ticket 01 nowej gry = grywalny szkielet**, zaczyna się od utworzenia gry z szablonu
   (`npm run nowa-gra -- <id> "<Tytuł>" <obszar>`, wpisane w „Co zbudować”): manifest
   i README gry, **jeden poziom**, oba tryby sterowania z PRD (klawiatura i dotyk), runda kończy się
   ekranem końca rundy platformy, test logiki, gra widoczna w hubie, `npm run check` zielony.
   Podpowiedzi po błędach i przy bezczynności daje platforma — nie są osobnym ticketem.
3. **Mieści się w jednej sesji**: najwyżej 5 kryteriów akceptacji, bez „i jeszcze…” w tytule.
   Za duży → podziel.
4. **`kto: rodzic`** tylko dla rzeczy, które wymagają gustu albo dziecka: wybór kolorystyki
   lub skórki, akceptacja tempa, test z dzieckiem. Reszta: `kto: agent` (preferowane).
5. **Pliki zapisujesz dopiero po akceptacji listy** przez rodzica.
6. **Bez kodu i nazw funkcji.** Odwołuj się do sekcji i numerów historyjek PRD, nie kopiuj ich.
   Wolno podać folder gry, adres strony gry i komendy `npm run …`.

## Kroki

1. **Wczytaj PRD** `docs/prd/<slug>.md`. Brak pliku albo `status: szkic` → zatrzymaj się i odeślij
   do `/to-prd`. Brak argumentu → weź zatwierdzony PRD bez folderu ticketów; niejednoznaczne → zapytaj.
   Z frontmattera weź `rodzaj` i `dotyczy` (id gry).
2. **Sprawdź `docs/tickets/<slug>/`.** Jeśli istnieje, nowe tickety numeruj od kolejnego wolnego
   numeru i nie nadpisuj starych.
3. **Rozpoznaj kod** (zmiana gry, platforma): czy zmianę łatwiej zrobić po małym uporządkowaniu
   kodu? Jeśli tak, pierwszy ticket to to uporządkowanie — zachowanie gry bez zmian, testy zielone.
4. **Naszkicuj listę.** Typowo:
   - nowa gra: `01 grywalny szkielet` → `poziomy 2–N` → `skórka / grafika` → `szlify`
     (reakcja sceny na sukces, dźwięki) → `test z dzieckiem (rodzic)`;
   - zmiana gry: 1–2 tickety agenta + odbiór przez rodzica, jeśli w grę wchodzi gust;
   - platforma: ticket 01 = najcieńsza widoczna zmiana od początku do końca.
5. **Pokaż listę do akceptacji** w formacie:
   `NN. Tytuł — kto: agent|rodzic — zależy od: NN — historyjki: 1, 3`
   Pod nią: pokrycie historyjek (każdy numer z PRD → ticket) i 1–3 pytania z rekomendacją,
   np. „Czy podział jest dobry, czy coś połączyć lub rozdzielić?”, „Czy test z dzieckiem robisz
   Ty?”. Poprawiaj, aż rodzic zaakceptuje.
6. **Zapisz pliki** według `.claude/skills/to-tickets/szablon-ticketu.md`, w kolejności zależności
   (najpierw te, od których inne zależą). Nie zmieniaj PRD.

## Format plików

- Ścieżka: `docs/tickets/<slug>/NN-nazwa.md`; `NN` dwucyfrowe (`01`, `02`…), nazwa ASCII
  z myślnikami, np. `01-grywalny-szkielet.md`.
- Frontmatter (klucze i wartości ASCII):
  - `status: do-zrobienia` (dozwolone: `do-zrobienia | w-toku | zrobione | zablokowane`);
  - `kto: agent` albo `kto: rodzic`;
  - `zalezy-od: []` albo `zalezy-od: ["01", "02"]` — numery w cudzysłowie, z tego samego folderu;
  - `prd: docs/prd/<slug>.md`;
  - `historyjki: [1, 3]` — numery historyjek z PRD.
- Każde kryterium akceptacji da się sprawdzić testem, komendą albo konkretnym krokiem
  w przeglądarce. „Jak sprawdzić” zawiera komendy i scenariusz ręczny (klawiatura, dotyk 375×812).
- Ticket rodzica: „Jak sprawdzić” to instrukcja dla rodzica (co otworzyć, co dać dziecku,
  na co patrzeć, co odpisać agentowi).

## Definicja ukończenia

- [ ] Rodzic zaakceptował listę; pliki zapisane, wszystkie ze `status: do-zrobienia`.
- [ ] Frontmatter każdego pliku jest poprawnym YAML z pięcioma kluczami jak wyżej.
- [ ] `zalezy-od` wskazuje istniejące numery z tego folderu; brak zależności w kółko.
- [ ] Każda historyjka z PRD jest pokryta przez co najmniej jeden ticket.
- [ ] Nowa gra: ticket 01 to grywalny szkielet z jednym poziomem, zaczynający się od `npm run nowa-gra`.

## Co dalej

Powiedz rodzicowi: „Gotowe. Wpisz `/clear` (zaczniemy z czystą rozmową), a potem
`/implement <slug>` — agent weźmie ticket 01. Każdy kolejny ticket: znów `/clear` i `/implement <slug>`.”
