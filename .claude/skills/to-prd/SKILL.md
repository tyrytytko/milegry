---
name: to-prd
description: Zamienia ustalenia z /grill-me (bieżącą rozmowę) w dokument wymagań docs/prd/<slug>.md według szablonu, bez nowego wywiadu, i prosi rodzica o akceptację. Drugi krok flow (po /grill-me, przed /to-tickets).
argument-hint: "[slug]"
disable-model-invocation: true
---

# /to-prd — dokument wymagań (PRD) z rozmowy

Slug: $ARGUMENTS (pusty → weź slug z potwierdzonego podsumowania /grill-me).

PRD (dokument wymagań) to pamięć projektu: kolejne kroki i kolejne sesje agenta czytają go zamiast
tej rozmowy. Musi więc zawierać wszystkie decyzje, a nie tylko ogólnik.

## Najważniejsze zasady

1. **Synteza, nie wywiad.** Źródłem jest ta rozmowa (potwierdzone podsumowanie z `/grill-me`)
   i repo. Nie dodawaj decyzji, których rodzic nie podjął.
2. **Brakuje decyzji?** Jedna lub dwie drobne: zapytaj z rekomendacją (jak w `/grill-me`).
   Więcej albo w rozmowie nie ma potwierdzonego podsumowania wywiadu (np. po `/clear`):
   zatrzymaj się i poproś o `/grill-me <temat>` albo o wklejenie wcześniejszego podsumowania.
3. **Bez kodu i nazw funkcji.** Wolno podać folder gry `src/games/<id>/` oraz nazwy z kontraktu
   platformy (np. „strzałki na ekranie”, „ekran końca rundy”, „dotknięcie elementu”) — tylko w sekcjach
   technicznych (4–5).
4. Sekcje 1–3 piszesz językiem rodzica; technikalia trzymasz w sekcjach 4–5.
5. Rodzaj pracy decyduje o treści: nowa gra / zmiana gry / platforma (szablon ma wskazówki).

## Kroki

1. **Slug i plik.** Slug: małe litery ASCII, cyfry, myślniki (reguła w `/grill-me`). Jeśli
   `docs/prd/<slug>.md` już istnieje, zapytaj: „uzupełnić istniejący czy zacząć nowy pod inną nazwą?”.
2. **Materiały.** Przeczytaj szablon `.claude/skills/to-prd/szablon-prd.md`. W razie potrzeby
   sprawdź fakty w `docs/DODAWANIE-GRY.md` (sekcja 2: co daje platforma) i `docs/ZASADY-DESIGNU.md`;
   zmiana platformy — także `docs/ARCHITEKTURA.md`. Dla zmiany gry przeczytaj jej folder i jej PRD.
3. **Co testujemy.** Zaproponuj 1–3 właściwości logiki gry, które sprawdzą automatyczne testy,
   np. „każdy poziom ma rozwiązanie”, „na planszy zawsze jest para do każdego koloru”. Wyjaśnij
   rodzicowi jednym zdaniem: „to małe programy, które same sprawdzają reguły gry przy każdej
   zmianie”. Zapytaj z rekomendacją; „tak” przyjmuje propozycję.
4. **Zapis.** Wypełnij szablon (usuń komentarze `<!-- -->`) i zapisz `docs/prd/<slug>.md`
   ze `status: szkic` i dzisiejszą datą.
5. **Akceptacja.** Pokaż rodzicowi skrót (5–8 linii) i ścieżkę pliku. Zapytaj: „Czy PRD jest OK?
   Możesz też otworzyć plik i poprawić go sam.” Poprawki → popraw plik i zapytaj ponownie.
   Po akceptacji ustaw `status: zatwierdzony`.

## Definicja ukończenia

- [ ] `docs/prd/<slug>.md` istnieje, frontmatter jest poprawnym YAML z kluczami jak w szablonie.
- [ ] Każda sekcja jest wypełniona (żadnych „TODO”, „???”, pustych nagłówków).
- [ ] Historyjki są ponumerowane (będą przywoływane w ticketach po numerze).
- [ ] Gra z poziomami ma tabelę poziomów; jest co najmniej jedna właściwość do testów.
- [ ] „Definicja ukończenia” jest sprawdzalna, a „Poza zakresem” nie jest puste.
- [ ] Rodzic zaakceptował, `status: zatwierdzony`.

## Co dalej

Powiedz rodzicowi: „Następny krok: `/to-tickets <slug>`. Możesz wpisać to od razu albo najpierw
`/clear` (wyczyszczenie rozmowy) — PRD zawiera już wszystko, co potrzebne.”
