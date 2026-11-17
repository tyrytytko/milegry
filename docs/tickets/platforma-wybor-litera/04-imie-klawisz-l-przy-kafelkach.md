---
status: zrobione
kto: agent
zalezy-od: ["01"]
prd: docs/prd/platforma-wybor-litera.md
historyjki: [5]
---

# 04 — Imię: klawisz „L” przy kafelkach „Ł / L / inna”

## Co zbudować

W grze `imie` (`src/games/imie/`), gdy na klawiaturze pod kratkami stoją trzy kafelki dla litery z ogonkiem,
gra podaje platformie litery kafelków nowym polem z ticketu 01 (PRD, sekcja 4: „`imie`”). Naciśnięcie litery
bez ogonka (np. „L” przy „Ł”) kołysze jej kafelek i uruchamia drabinę podpowiedzi zamiast ciszy; litera
z ogonkiem wpisana przez AltGr zalicza właściwy kafelek, ale nikt nie musi tego umieć — strzałki ze Spacją
zostają. Poziomy, zadania, dotyk i odpowiadanie klawiszem dla liter bez ogonka zostają bez zmian. README gry
(„Sterowanie” i „Decyzje właściciela”) opisuje nowe zachowanie. Ticket usuwa z „Platforma — kolejka”
w `docs/KATALOG-GIER.md` pozycję „opcjonalne” o klawiszu litery przy kafelkach w `imie`.

## Kryteria akceptacji

- [x] Z imieniem zawierającym „Ł” (np. „ŁUCJA”) na klawiaturze: „L” przy kafelkach kołysze kafelek „L” i liczy
      się jako błąd; trzy takie błędy dają poświatę → paluszek → „zróbmy razem”.
- [x] AltGr + L zalicza kafelek „Ł”; wybór strzałkami ze Spacją działa jak dotąd.
- [x] Litery bez ogonka w tym samym imieniu układa się klawiszem jak dotąd; runda dotykiem 375 × 812 bez zmian.
- [x] README gry opisuje nowe zachowanie; pozycja „opcjonalne” zniknęła z kolejki w `docs/KATALOG-GIER.md`.
- [x] `npm run sprawdz-gre -- imie` i `npm run check` przechodzą.

## Jak sprawdzić

Automatycznie:
- `npm run sprawdz-gre -- imie`
- `npm run check`

Ręcznie (`npm run dev`; w panelu http://localhost:5173/rodzice/ ustaw imię „ŁUCJA”, potem
http://localhost:5173/imie/):
- Klawiatura: przy kafelkach naciśnij „L” trzy razy (poświata → paluszek → „zróbmy razem”); w kolejnej rundzie
  AltGr + L; w kolejnej strzałki + Spacja. Pozostałe litery klawiszami.
- Dotyk (widok telefonu 375×812): cała runda przyciskami liter.
- Konsola bez błędów. Po sprawdzeniu przywróć w panelu rodzica poprzednie imię.

## Notatki z realizacji

**2026-11-17**

Co zrobiono:
- `src/games/imie/game.ts`: przy trzech kafelkach (klawiatura, litera z ogonkiem) widok `choose` dostaje
  `letters: task.choices` — te same litery i ta sama kolejność co kafelki. Resztę (kołysanie, drabina, AltGr,
  ramka) robi rdzeń; gra nie ma własnego nasłuchu klawiszy.
- `src/games/imie/logic.test.ts`: test „kafelki to trzy różne pojedyncze litery” (każdy wpis pasuje do jednej
  litery A–Ż, różne bez względu na wielkość, trzeci kafelek ≠ litera z ogonkiem i ≠ jej wersja bez ogonka; wszystkie
  imiona z `NAMES` × 20 ziaren × 5 poziomów) i test wprost dla „ŁUCJA” (kafelki „Ł”, „L” i trzecia spoza pary).
- `logic.ts`: tylko komentarz pola `Task.choices` (kafelki wybiera się też klawiszem litery). Poziomy, zadania
  i dobór kafelków bez zmian.
- `README.md` gry: „Sterowanie” i „Decyzje właściciela” opisują klawisz „L” przy „Ł” (łagodny błąd z drabiną),
  AltGr + L (zalicza, niewymagany) i literę spoza kafelków (kołysze literę wzoru).
- `docs/KATALOG-GIER.md`: usunięta pozycja „opcjonalne” z „Platforma — kolejka”.

Decyzje w trakcie:
- Nowe testy logiki przeszły od razu — opisują właściwość, którą dobór kafelków już miał (trzeci kafelek ma inną
  literę bazową). Są strażnikiem warunku platformy: zmiana doboru kafelków, która złamie unikalność, zatrzyma się
  w teście, zanim runda skończy się ekranem błędu.
- Trzeci kafelek może być literą z ogonkiem z tego samego imienia (np. „Ż” w „ŁŻĄ”) — tak było i zostaje; jest
  inną literą niż obie z pary, więc klawisz wybiera go jednoznacznie.

Sprawdzenia:
- `npm run sprawdz-gre -- imie`: typy, testy gry (54), skaner i manifest — zielono.
- `npm run check`: 39 plików, 1192 testy, build — zielono.
- Podgląd (:5173, własna karta, imię „ŁUCJA” ustawione w panelu rodzica, poziom 3), klawiatura:
  - „L” ×3 przy kafelkach „L / J / Ł”: 1. — kafelek „L” się kołysze i poświata na literze wzoru „Ł”; 2. — paluszek
    przy kafelku „Ł”; 3. — „zróbmy razem” („Ł” wskakuje do kratki), zadanie wróciło na koniec rundy. Ramka po
    literach się nie pokazała.
  - U, C, J, A klawiszami jak dotąd; powrócone zadanie „Ł” zaliczone przez AltGr + L — zasymulowane zdarzeniem
    `keydown`/`keyup` z `key: "ł"`, `ctrlKey` i `altKey` (tak Windows zgłasza AltGr), wysłanym skryptem na aktywny
    element; runda skończona.
  - Kolejna runda: „L” ×2 (poświata, potem paluszek), strzałka w lewo odsłoniła ramkę na „L”, druga przeniosła ją
    na „Ł”, Spacja zaliczyła; reszta klawiszami. Trzecia runda: „X” (spoza kafelków) kołysze literę wzoru i daje poświatę.
- Dotyk 375 × 812: cała runda przyciskami (jeden zły „A”, potem Ł, U, C, J, A) — kafelków nie ma, jak dotąd. Rozmiar
  okna przywrócony (`desktop`). Konsola bez błędów.
- Po sprawdzeniu przywrócone ustawienia sprzed testu (imię było puste) i zapis postępu `imie` (ostatni poziom 5).
- Recenzji `recenzent-gry` w tej sesji nie uruchamiano (zlecana osobno).

Wskazówki dla następnej sesji:
- Brak. Ticket 05 (test z dzieckiem) dotyczy `literki-blizniaczki`.

Pytania do rodzica: brak.

### Recenzja (2026-11-17, `recenzent-gry`)

Wynik: gotowe, bez ustaleń KRYTYCZNYCH i WAŻNYCH; `sprawdz-gre` i `npm run check` potwierdzone niezależnie.
Ustalenia DROBNE, zostawione bez zmian:
- `logic.test.ts`: asercja „trzeci kafelek nie jest literą zadania ani jej wersją bez ogonka” jest spełniona z samej
  konstrukcji testu, a nowy test częściowo dubluje wcześniejszy — wartość mają sprawdzenia „pojedyncza litera”
  i „trzy różne bez względu na wielkość”;
- README, „Sterowanie”: przykład „Ł / L / K” — trzecia litera bywa inna (litera z imienia albo zapasowa).
