---
slug: platforma-wiek
rodzaj: platforma
dotyczy: platforma
status: zatwierdzony
data: 2026-11-18
---

# Wiek dziecka w panelu rodzica

## 1. Problem — po co to robimy

Miłe Gry są dziś jednym zestawem gier dla dzieci 3–5 lat. Starsze dziecko (5–7 lat) potrzebuje
trudniejszych gier, na przykład przygotowujących do konkursu matematycznego dla klasy 1, ale takie
gry nie mogą trafić przed trzylatka. Rodzic nie ma dziś gdzie powiedzieć, ile lat ma dziecko.

## 2. Rozwiązanie — jak to wygląda oczami dziecka

Dopóki rodzic niczego nie zmieni, wszystko wygląda jak dotąd: dziecko widzi te same gry co dziś.

Rodzic wchodzi do panelu „Dla rodziców” (przytrzymanie i bramka jak dotąd) i w nowej sekcji „Wiek
dziecka” wybiera jeden z dwóch przycisków: „3–5 lat” albo „5–7 lat”. Po powrocie do gier starsze
dziecko widzi wszystkie dotychczasowe gry i dodatkowo gry dla starszych. Młodsze dziecko gier dla
starszych nie widzi wcale — nie są przygaszone ani zablokowane, po prostu ich nie ma.

Rodzic może w każdej chwili przełączyć wiek z powrotem. Postęp w grach zostaje.

## 3. Historyjki użytkownika

1. Jako rodzic chcę wybrać w panelu wiek dziecka („3–5 lat” albo „5–7 lat”), żeby dziecko dostało gry
   na swoim poziomie.
2. Jako rodzic, który niczego nie ustawiał, chcę, żeby gry wyglądały jak dotąd, żeby młodsze dziecko
   nie trafiło na zadania nie dla niego.
3. Jako starsze dziecko chcę widzieć gry dla starszych obok tych, które już znam, żeby móc grać
   w jedne i drugie.
4. Jako młodsze dziecko chcę widzieć tylko gry dla mnie, żeby nie wchodzić w coś, czego nie zrozumiem.
5. Jako rodzic chcę móc otworzyć dowolną grę, wpisując jej adres, niezależnie od ustawionego wieku,
   żeby wiek był pomocą, a nie blokadą.
6. Jako autor gry chcę, żeby o widoczności gry w hubie decydował przedział wieku z jej manifestu,
   żeby nowa gra dla starszych nie wymagała zmian w hubie.

## 4. Decyzje implementacyjne

- **Moduły:** ustawienia (`src/core/storage/settings.ts`), panel rodzica (`src/core/shell/parents.ts`),
  hub (`src/core/shell/hub.ts`). Gry (`src/games/`) nie są zmieniane.
- **Kontrakt gra ↔ rdzeń:** w ustawieniach (`Settings` w `src/core/types.ts`) dochodzi pole z wiekiem
  dziecka o dwóch wartościach: „3–5” (domyślna) i „5–7”. Przedział wieku w manifeście gry przestaje
  być samą informacją: hub używa go do wyboru kafelków. Komentarz tego pola w `src/core/types.ts`
  i `docs/ARCHITEKTURA.md` są aktualizowane w tym samym commicie.
- **Zapisane ustawienia:** brak pola albo wartość spoza listy daje „3–5” — tak jak przy pozostałych
  ustawieniach (walidacja każdego pola przy odczycie). Osoby, które już korzystają z Miłych Gier, nie
  zobaczą żadnej zmiany.
- **Reguła widoczności w hubie:** gra jest pokazywana, gdy dolna granica jej wieku z manifestu nie
  przekracza górnej granicy wybranego przedziału. Dzisiejsze gry (od 3 lat) są więc widoczne w obu
  przedziałach; gra dla starszych podaje w manifeście wiek od 6 lat i jest widoczna tylko w „5–7”.
  Regułę liczy czysta funkcja, osobno od widoku, żeby dało się ją testować bez przeglądarki.
- **Tylko hub:** wiek nie blokuje wejścia do gry pod jej adresem ani wyboru poziomu (Z-39).
- **Układ huba:** siatka liczy się z liczby gier widocznych, nie wszystkich. Przy 10 grach (dzisiejsze
  9 i jedna dla starszych) obowiązuje układ już opisany dla 10–12 gier: 3 × 4 w pionie, 6 × 2
  w poziomie.
- **Klawiatura w hubie:** ramka startuje od ostatnio granej gry; gdy ta gra jest ukryta przez wiek —
  od pierwszego kafelka.
- **Panel rodzica:** sekcja „Wiek dziecka” z grupą dwóch przycisków takich jak w pozostałych sekcjach
  i jednym zdaniem wyjaśnienia (wiek dobiera gry na ekranie głównym; poziom w każdej grze nadal
  wybiera rodzic). Zdanie „Spokojne gry dla dzieci w wieku 3–5 lat” w sekcji „O Miłych Grach” zmienia
  się na „3–7 lat”. Wskazówka o czasie przed ekranem zostaje bez zmian.
- **Zasady designu:** `docs/ZASADY-DESIGNU.md` dostaje dwa wyjątki dla gry `konkurs-matematyczny`
  (decyzja rodzica): przy Z-10 — zadanie ma krótkie polecenie tekstem, bo na konkursie dziecko też je
  czyta; przy Z-37 — liczby do 20 (w najtrudniejszych zadaniach do około 30) występują jako sam zapis,
  bez przedmiotów do policzenia. Z-39 dostaje dopowiedzenie: wiek dobiera gry w hubie, poziomu nie
  przypisuje.
- **Dokumenty opisujące produkt:** miejsca mówiące „dla dzieci 3–5 lat” (`README.md`, nagłówek
  `CLAUDE.md`, `docs/FLOW.md`, jeśli tam występuje) opisują stan po zmianie: 3–7 lat, z domyślnym
  przedziałem 3–5.
- **Wpływ na istniejące gry:** żaden — wszystkie mają wiek od 3 lat i pozostają widoczne w obu
  przedziałach.

## 5. Decyzje testowe

- Test odczytu ustawień: brak pola wieku i wartość spoza listy dają „3–5”; zapisane „5–7” wraca
  jako „5–7”.
- Test reguły widoczności: gra od 3 lat jest widoczna w obu przedziałach; gra od 6 lat tylko w „5–7”.
- Test rejestru na prawdziwych manifestach: w przedziale „3–5” widać dokładnie dzisiejsze 9 gier.
- Testy globalne platformy (manifest, zakazane API, skaner reguł) muszą przechodzić.
- Ręcznie w przeglądarce: zmiana wieku w panelu klawiaturą i dotykiem (375 × 812), powrót do huba,
  konsola bez błędów; hub z 9 i z 10 grami w pionie i w poziomie.

## 6. Definicja ukończenia

- [ ] Panel rodzica ma sekcję „Wiek dziecka” z przyciskami „3–5 lat” i „5–7 lat”; wybór przetrwa
      zamknięcie przeglądarki.
- [ ] Bez zmiany ustawień hub pokazuje te same gry co przed zmianą.
- [ ] W przedziale „3–5” gra z wiekiem od 6 lat nie ma kafelka; w „5–7” ma.
- [ ] Gra ukryta w hubie otwiera się pod swoim adresem.
- [ ] Trzy testy z sekcji 5 istnieją i przechodzą; `npm run check` przechodzi.
- [ ] `docs/ARCHITEKTURA.md` i komentarze w `src/core/types.ts` opisują ustawienie wieku i regułę
      widoczności; `docs/ZASADY-DESIGNU.md` ma oba wyjątki i dopowiedzenie przy Z-39.
- [ ] Panel i sekcja „O Miłych Grach” mówią o wieku 3–7 lat.

## 7. Poza zakresem

- Więcej niż dwa przedziały wieku i wiek podawany jako liczba lat.
- Dopasowanie istniejących gier do wieku 5–7 (nowe poziomy, inne zakresy).
- Automatyczny dobór poziomu w grach na podstawie wieku.
- Blokowanie gier (hasło, bramka) — wiek tylko dobiera kafelki.
- Profile kilkorga dzieci z osobnym wiekiem (pozycja w kolejce platformy).

## 8. Uwagi

- Ta zmiana powstaje przed grą `konkurs-matematyczny` (`docs/prd/konkurs-matematyczny.md`): bez niej
  gra dla starszych byłaby widoczna dla wszystkich.
- Do czasu dodania pierwszej gry dla starszych oba przedziały pokazują w hubie to samo.
- Hub gwarantuje brak przewijania do 12 gier; licznik dotyczy gier widocznych w wybranym przedziale.
