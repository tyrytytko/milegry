---
status: zrobione
kto: rodzic
zalezy-od: ["01", "02", "03", "04"]
prd: docs/prd/platforma-hub-mobilny.md
historyjki: [1, 2, 3, 5, 8]
---

# 05 — Odbiór na telefonie

## Co zbudować

Nic do zbudowania — rodzic sprawdza nowy hub na własnym telefonie, prawdziwym palcem, najlepiej
z dzieckiem obok. To jedyne miejsce, w którym widać wycięcie aparatu, paski przeglądarki i to, czy
dziecko trafia w kafelki.

## Kryteria akceptacji

- [ ] W pionie i w poziomie widać wszystkie gry naraz, bez przewijania.
- [ ] Dziecko samo wybiera i otwiera grę; widać, że kafelek reaguje na dotyk.
- [ ] Nic nie chowa się pod wycięciem ani zaokrąglonym rogiem — w hubie i w co najmniej dwóch grach.
- [ ] „Dla rodziców” otwiera się po przytrzymaniu 2 s i nie otwiera się dziecku przypadkiem.
- [ ] Tytuły pod obrazkami da się przeczytać.

## Jak sprawdzić

1. Uruchom podgląd dostępny z telefonu albo otwórz wdrożoną stronę (uruchomienie i publikacja:
   `README.md`).
2. Otwórz hub na telefonie w pionie: policz gry (9), spróbuj przewinąć — strona ma stać w miejscu.
3. Obróć telefon poziomo i powtórz. Zwróć uwagę na róg z ikonką „Dla rodziców” i na stronę z wycięciem.
4. Daj telefon dziecku: czy samo stuka w obrazek i wchodzi do gry? Czy trafia za pierwszym razem?
5. Wejdź do dwóch gier w poziomie (np. `labirynt` i `orzeszki`): czy domek, scena i przyciski są
   w całości widoczne?
6. Przytrzymaj ikonkę „Dla rodziców” 2 s — ma się otworzyć bramka.

Odpisz agentowi: co działa, co nie (najlepiej ze zrzutem ekranu), model telefonu i przeglądarkę. Jeśli
wszystko jest w porządku, agent oznaczy ticket jako zrobiony i usunie pasującą pozycję
z `docs/OTWARTE-SPRAWY.md`.

## Notatki z realizacji

2026-11-17

- Ticket zamknięty decyzją rodzica; rodzic nie podał wyniku odbioru (co działa, model telefonu,
  przeglądarka), dlatego kryteria zostają nieodhaczone.
- Pozycje o telefonie z wycięciem w `docs/OTWARTE-SPRAWY.md` zostają — znikną, gdy rodzic potwierdzi
  wynik na urządzeniu.
