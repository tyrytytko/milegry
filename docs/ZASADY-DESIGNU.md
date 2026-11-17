# Zasady „miłego” designu

Wiążące reguły dla każdej gry i każdej zmiany w platformie. Numery `Z-xx` służą do
odwołań w ticketach i recenzjach. Tło rozwojowe i źródła: `docs/TLO.md`. Wartości liczbowe to
punkty startowe do strojenia z dzieckiem, nie normy.

**Zasada nadrzędna:** gra ma być spokojniejsza niż kartka i kredki obok. Jeśli masz wątpliwość,
czy coś dodać (efekt, dźwięk, ruch, nagrodę) — nie dodawaj.

## Tempo i ruch

- **Z-01** Naraz porusza się co najwyżej 1 obiekt zadaniowy na poziomie 1 i najwyżej 3 na najwyższym. Tło jest statyczne.
- **Z-02** Tło, układ i świat sceny są stałe przez całą rundę; między zadaniami wymienia się tylko treść zadania (te same miejsca, nowe elementy). Przejścia między ekranami to przenikanie ≥ 400 ms.
- **Z-03** Czasy animacji tylko z tokenów (`--mg-dur-fast` 200 ms, `--mg-dur-base` 400 ms, `--mg-dur-slow` 800 ms; do tego `--mg-dur-breathe` 3200 ms — oddychanie podpowiedzi i `--mg-dur-reward` 1000 ms — nagroda na ekranie końca rundy; wielokrotność tokenu, np. `calc(var(--mg-dur-slow) * 1.5)`, też jest z tokenów). Nic nie mruga.
- **Z-04** Ruch łagodny (`ease-in-out`). Bez potrząsania ekranem, sprężyn z więcej niż jednym odbiciem, zoomów; efekt nagrody ≤ 12 cząstek i ≤ 1,5 s.
- **Z-05** `prefers-reduced-motion` jest honorowane: ruch zastępuje przenikanie.
- **Z-06** Tempo gier ruchowych ustawia rodzic (3 stopnie), domyślnie najwolniejsze. Gry używają `ctx.clock`, który to skaluje.

## Dźwięk i głos

- **Z-07** Brak muzyki w tle.
- **Z-08** Efekty są miękkie i ciche (sinus/trójkąt, narastanie ≥ 10 ms, ton podstawowy ≤ ~1,5 kHz).
- **Z-09** Nie ma dźwięku porażki. Błąd = cisza albo neutralny, cichy ton.
- **Z-10** **Gra musi być zrozumiała w ciszy** — przez demonstrację/animację podpowiedzi. Zero tekstu, który dziecko musiałoby przeczytać. Platforma nie ma trybu mówionego (lektora) — to pozycja w kolejce (`docs/KATALOG-GIER.md`).
- **Z-11** Głośność efektów i globalne wyciszenie w panelu rodzica.

## Kolor i obraz

- **Z-12** Kolory tylko z tokenów palety „Leśna polana” (`src/core/styles/tokens.css`). Tła i duże powierzchnie mają nasycenie ≤ 35%; nasycony kolor tylko na małym elemencie zadaniowym. **Brak czerwieni.**
- **Z-13** Dekoracje tylko na brzegach, niskokontrastowe, nieanimowane. Środek ekranu należy do zadania.
- **Z-14** Litery i cyfry: `--mg-ink` na jasnym kafelku, kontrast ≥ 7:1; elementy interaktywne ≥ 3:1.
- **Z-15** Kolor nigdy nie jest jedynym nośnikiem informacji (zawsze dochodzi kształt lub wzór).
- **Z-16** Najwyżej jedna postać-przewodnik w scenie. Postać nie wywiera presji („będę smutny, jeśli wyjdziesz”).

## Informacja zwrotna i pomoc

- **Z-17** Nie ma przegranej, żyć, punktów, gwiazdek-ocen, „game over”.
- **Z-18** Błąd → łagodne kołysanie elementu (≤ 2 wahnięcia, ≤ 8 px, ~400 ms); element zostaje do ponowienia. Bez czerwonego X.
- **Z-19** Drabina podpowiedzi (realizuje ją warstwa rundy `src/core/round`): 1. błąd → obiekt pytania spokojnie „oddycha” poświatą (polecenie pokazane jeszcze raz); 2. → wyraźna podpowiedź przy poprawnej odpowiedzi (paluszek albo klawisz); 3. → „zróbmy razem”: gra pokazuje rozwiązanie, a zadanie wraca później w rundzie. Bezczynność pokazuje podpowiedź, ale nie liczy się jako błąd.
- **Z-20** Sukces → krótka (≤ 800 ms), zawsze taka sama reakcja związana z zadaniem (kurczak się wykluwa, okiennica pasuje) — nagrodą jest skutek działania, nie ocena. Bez napisów-pochwał; ewentualna pochwała słowna (przyszły tryb mówiony) dotyczy działania („Znalazłeś M!”), nigdy osoby („jesteś mądry”).
- **Z-21** Przypadkowe walenie w klawiaturę/ekran nie daje sukcesu: strażnik w `core/input` odrzuca szybkie serie klawiszy, po każdym błędzie warstwa rundy przez chwilę nie przyjmuje odpowiedzi (blokada po błędzie), a na ekranie liczy się tylko pierwszy palec (dotyk dłonią jest ignorowany).

## Czas i zakończenia

- **Z-22** Brak timerów i limitów czasu. Spadające obiekty nie przepadają — lądują i czekają.
- **Z-23** Runda ma koniec: 5–10 zadań albo 1–3 minuty, potem spokojny ekran „jeszcze raz / dalej / do domu”.
  Wyjątek: w grze „imie” imię dłuższe niż 10 liter układa się w jednej rundzie w całości (do 20 zadań) — dziecko układa własne imię, a nie jego kawałek.
- **Z-24** Nic nie startuje samo. Kolejna runda wymaga świadomego wyboru.
- **Z-25** Łagodny koniec sesji: po czasie ustawionym przez rodzica (domyślnie 15 min) — wyłącznie między rundami — jeżyk „idzie spać”.

## Uczciwość, prywatność, bezpieczeństwo

- **Z-26** Zero reklam, zakupów, linków zewnętrznych, analityki, powiadomień i zasobów z sieci.
- **Z-27** Zero serii dni, losowych nagród, „wróć jutro”, liczników kolekcji do uzupełnienia.
- **Z-28** Wyjście z gry jest zawsze dostępne, ale odporne na przypadek: przytrzymanie domku lub `Esc` ≥ 1,5 s.
- **Z-29** Panel rodzica za bramką (zadanie nie do rozwiązania przez przedszkolaka, np. „6 × 7”).
- **Z-30** Dane wyłącznie w `localStorage`. Imię dziecka (opcjonalne) nigdy nie opuszcza urządzenia.

## Sterowanie

- **Z-31** Klawiatura: tylko pojedyncze klawisze — strzałki, Spacja/Enter, litery, cyfry, Backspace. Żadnych kombinacji, trzymania, szybkich serii. Diakrytyki (AltGr) nigdy nie są wymagane na poziomach domyślnych; samo „A” nie zalicza „Ą”.
- **Z-32** Wybór 1 z N na klawiaturze: ramka-wyróżnienie przesuwana strzałkami + Spacja/Enter (`ctx.ui.focusGrid`). Nie mapujemy obiektów na litery/cyfry, jeśli litera/cyfra nie jest treścią zadania.
- **Z-33** Dotyk: cele ≥ 80×80 px z odstępem ≥ 16 px (tokeny `--mg-touch-min`, `--mg-touch-gap`; pas przy dolnej krawędzi `--mg-edge-safe`); stuknięcie zamiast precyzyjnego przeciągania (przeciąganie zawsze ma alternatywę stuknij–stuknij i „magnes”); nic interaktywnego przy dolnej krawędzi; bez gestów wielopalcowych, długich przytrzymań w mechanice, wibracji. Wyjątek: gdzie przy klawiszach 80 px scena nie miałaby miejsca, klawiatura numeryczna ma klawisze 64 px z odstępem 8 px (`core/ui/ui.css`) — na małym telefonie w pionie (poniżej ok. 760 px wysokości) i na niskim i wąskim ekranie w poziomie (do 520 px wysokości i poniżej 640 px szerokości); wymiary liczone bez bezpiecznych marginesów (wycięcie aparatu, pasek systemu). Nic innego nie jest zmniejszane.
- **Z-34** Układ działa w pionie i w poziomie; nie wymuszamy obracania urządzenia.

## Treść dydaktyczna

- **Z-35** Litery: start od WIELKICH drukowanych (takie są na klawiszach). Krój liter „do nauki” (drukowane / pisane) wybiera rodzic; gry renderują litery wyłącznie przez `ctx.ui.letter(...)`, nigdy własnym fontem.
- **Z-36** *(dotyczy przyszłego trybu mówionego — dziś nieobowiązująca)* Głos mówi głoskę („m”, nie „my” ani „em”) i słowo-kotwicę („M jak miś”).
- **Z-37** Liczby zawsze najpierw na konkretach (orzeszki, patyczki), symbol („2 + 3”) dopiero obok konkretu. Zakresy: do 3 → do 5 → do 10.
- **Z-38** Zadania nie wymagają pamiętania więcej niż 2–4 elementów; kody do bram są widoczne na ekranie, nie do zapamiętania.
  Wyjątek: gra pamięciowa „pary” na poziomach 4–5 (6 i 8 par) świadomie przekracza ten limit — poziom wybiera rodzic (Z-39), nie ma kar ani liczników, znalezione pary zostają odkryte, a bezczynność podpowiada znaną parę.
  Wyjątek: gra „imie” na poziomach 4–5 chowa wzór całego imienia — to własne imię dziecka, wzór wraca po pierwszym błędzie, a poziom wybiera rodzic (Z-39).
- **Z-39** Poziom nie jest przypisany do wieku — rodzic może wybrać dowolny.

## Lista kontrolna recenzji gry

1. Czy w ciszy i bez czytania wiadomo, co zrobić? (Z-10)
2. Czy da się przegrać, spóźnić albo stracić coś? Nie może się dać. (Z-17, Z-22)
3. Policz ruchome obiekty i zmiany sceny. (Z-01, Z-02)
4. Zrzut ekranu w skali szarości: najbardziej kontrastowe jest zadanie, nie dekoracja. (Z-13)
5. Trzy błędy pod rząd: czy drabina podpowiedzi działa i nic nie „karze”? (Z-18, Z-19)
6. Walenie w klawiaturę przez 5 s: czy nic się nie zalicza? (Z-21)
7. Przejście klawiaturą samymi strzałkami/Spacją/treścią zadania oraz dotykiem na 375×812. (Z-31–Z-34)
8. Koniec rundy: czy jest, czy nic nie startuje samo? (Z-23, Z-24)
