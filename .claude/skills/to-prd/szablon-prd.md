---
slug: kolory
rodzaj: nowa-gra
dotyczy: kolory
status: szkic
data: 2026-01-01
---

<!--
Klucze frontmattera (ASCII):
- slug: nazwa tego PRD = nazwa pliku i folderu ticketów (docs/tickets/<slug>/)
- rodzaj: nowa-gra | zmiana-gry | platforma
- dotyczy: id gry (= folder src/games/<id>/) albo "platforma"
- status: szkic | zatwierdzony
- data: RRRR-MM-DD
Po wypełnieniu usuń wszystkie komentarze HTML (takie jak ten).
-->

# <Tytuł gry albo zmiany>

## 1. Problem — po co to robimy

<!-- 1–3 zdania językiem rodzica: jaka umiejętność, dla jakiego wieku, czego brakuje dziś. -->

## 2. Rozwiązanie — jak to wygląda oczami dziecka

<!-- Krok po kroku: dziecko otwiera grę, widzi…, robi…, gdy się pomyli…, na końcu… Bez technikaliów. -->

## 3. Historyjki użytkownika

<!-- Numerowana lista. Aktorzy: dziecko, rodzic (dla platformy też: autor gry). Tickety odwołują się do numerów,
     więc po utworzeniu ticketów nie przenumerowuj historyjek — nowe dopisuj na końcu. -->

1. Jako dziecko chcę …, żeby …
2. Jako rodzic chcę …, żeby …

## 4. Decyzje implementacyjne

<!-- Nowa gra / zmiana gry: wypełnij punkty poniżej, zbędne usuń.
     Platforma: zamiast tego opisz moduły, których dotyczy zmiana, zmiany kontraktu
     (src/core/types.ts, src/core/round/index.ts; docs/ARCHITEKTURA.md aktualizowany w tym samym commicie),
     wpływ na istniejące gry. -->

- **Folder:** `src/games/<id>/` (zmiana gry: co w nim się zmienia, czego nie ruszamy)
- **Manifest:** obszar, wiek, tryby sterowania, liczba poziomów, skórki
- **Mechanika i sukces:** jedno zadanie, liczba zadań w rundzie (5–10), koniec rundy (ekran końca rundy platformy)
- **Wariant odpowiedzi:** wybór 1 z N / cyfry / litera / gra ciągła (decyduje, ile sterowania i podpowiedzi daje platforma)
- **Poziomy:**

  | Poziom | Co się zmienia (np. liczba kolorów, liczba par) |
  |---|---|
  | 1 | … (do przejścia za pierwszym razem) |

- **Sterowanie — klawiatura:** które klawisze i co robią
- **Sterowanie — dotyk:** co dziecko dotyka / przeciąga; które kontrolki platformy
- **Reakcja na błąd i podpowiedź:** drabina platformy (poświata pytania → paluszek/klawisz → „zróbmy razem”);
  co jest „pytaniem” na scenie i co scena pokazuje po rozwiązaniu
- **Skórki i grafika:** obrazki platformy, kolory wyłącznie z palety
- **Dźwięk i nagroda:** które łagodne dźwięki; bohater ekranu końca rundy (inny niż jeżyk)
- **Zapisywany postęp / ustawienia rodzica:** co pamiętamy na urządzeniu

## 5. Decyzje testowe

<!-- 1–3 właściwości logiki uzgodnione z rodzicem. Testujemy zachowanie, nie szczegóły kodu.
     Przykład: "dla każdego poziomu 1..N plansza ma parę do każdego koloru". -->

- Testy logiki (`src/games/<id>/logic.test.ts`): …
- Testy globalne platformy (manifest, zakazane API) muszą przechodzić.
- Ręcznie w przeglądarce: przejście poziomu klawiaturą i dotykiem (ekran 375×812).

## 6. Definicja ukończenia

<!-- Sprawdzalne warunki całości, np.: -->

- [ ] Wszystkie poziomy z tabeli działają w obu trybach sterowania.
- [ ] `npm run check` przechodzi.
- [ ] Dziecko przechodzi poziom 1 bez pomocy (test z dzieckiem — ticket rodzica).

## 7. Poza zakresem

<!-- Co świadomie NIE wchodzi do tej wersji. -->

## 8. Uwagi

<!-- Powiązania (np. wpis w docs/KATALOG-GIER.md), pomysły na później. Bez otwartych decyzji. -->
