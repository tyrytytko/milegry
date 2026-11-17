# Literki z imienia (`imie`)

Dziecko układa swoje imię litera po literze: nad każdą kratką stoi litera wzoru, a dziecko wskazuje literę,
która ma trafić do bieżącej kratki. Gra na `runRound` (wariant literowy; wybór 1 z 3 dla liter z ogonkiem
na klawiaturze).

## Skąd gra bierze imię

- Z ustawień rodzica: panel `/rodzice/`, pole imienia (`ctx.settings.childName`; litery, spacja i myślnik,
  do 20 znaków; zostaje tylko w tej przeglądarce, Z-30).
- **Gdy imię jest puste (domyślnie)**, gra układa proste słowa: MAMA, TATA, DOM, KOT, LAS, OKO — w rundzie
  dwa różne, jedno po drugim. Słowa zależą od poziomu i numeru rundy (kolejna runda = dwa kolejne słowa;
  numer rundy pamięta zapis gry, klucz `turn` — zapisywany tylko wtedy, gdy imienia nie ma).

## Cel rozwojowy

Rozpoznawanie liter własnego imienia, kolejność liter w wyrazie, pierwsze „pisanie”. Metoda odimienna:
pierwsze litery dziecko poznaje zwykle z własnego imienia.

## Mechanika

- Scena stoi całą rundę (Z-02): siatka par — **litera wzoru**, a pod nią **kratka**. Pusta kratka jest płaska,
  z przerywaną ramką (to miejsce, nie przycisk — inaczej niż przyciski liter pod sceną, Z-33); bieżąca ma ciągłą
  miodową ramkę, wypełniona — zieloną.
- **Pytanie** (poświata po 1. błędzie): litera wzoru nad bieżącą kratką; na klawiaturze nad nią staje
  klawisz-podpowiedź.
- **Sukces:** litera wskakuje do kratki (Z-20), kratka robi się zielona, po chwili następna.
- **Błąd:** wskazanie innej litery niż ta w bieżącej kratce. Po „zróbmy razem” kratka tego zadania pustoszeje
  na koniec rundy i dziecko wstawia literę jeszcze raz.
- **Runda** (Z-23): imię 5–10 liter układamy raz; krótsze kilka razy, żeby wyszło 5–8 zadań (4 litery ×2,
  3 litery ×2, 2 litery ×3, 1 litera ×5 — przed kolejnym ułożeniem kratki pustoszeją). Słów domyślnych nie
  powtarzamy: runda to dwa różne słowa (6–8 zadań), a po pierwszym w siatce staje drugie. **Imię dłuższe niż
  10 liter układamy raz, w całości** (11–20 zadań) — wyjątek zapisany w Z-23 i Z-38 (zob. „Decyzje właściciela”).
- **Powtórzona litera** (ANNA): jeden przycisk „A”, używany dwa razy.
- **Spacja i myślnik** („ANNA MARIA”, „JAN-PAWEŁ”) to stałe odstępy: pusta komórka (myślnik — krótka kreska),
  nie układa się ich. Inne znaki są pomijane.
- **Układ rzędów** (`layout` w `logic.ts`): w wąskiej scenie najwyżej 5 komórek w rzędzie, w szerokiej
  (proporcje ≥ 3 : 2) 10. Części imienia nie dzielą się między rzędy, jeśli się mieszczą („JAN-” / „PAWEŁ”,
  „ANNA” / „MARIA”); jedno długie słowo dzieli się na równe kawałki („ALEKS” / „ANDRA”). Kratki i litery maleją
  razem z liczbą rzędów i kolumn — kratki nie są celami dotykowymi, więc nie mają dolnej granicy i nigdy nie
  wychodzą poza scenę.

## Poziomy (`logic.ts` → `LEVELS`)

| Poziom | Wzór | Pomoc | Przyciski na dotyku |
|---|---|---|---|
| 1 | stały | litera wzoru wyróżniona + blady „duch” litery w kratce | do 3, tylko litery słowa |
| 2 | stały | litera wzoru wyróżniona | do 6, tylko litery słowa |
| 3 | stały | — | do 6, w tym 2 zmyłki |
| 4 | znika po 3 s każdego zadania, wraca po błędzie | — | do 6, w tym 2 zmyłki |
| 5 | widać go 3 s tylko na początku każdego ułożenia, potem schowany; wraca po błędzie | — | do 6, w tym 2 zmyłki |

Zmyłki to litery bez ogonków spoza słowa (nigdy „L” przy „Ł”). Gdy litery słowa mieszczą się na przyciskach,
zestaw i kolejność przycisków są stałe przez całe słowo, także powtarzane (Z-02); przy dłuższym imieniu zestaw zmienia się
co zadanie (zawsze zawiera poprawną literę). Na klawiaturze przycisków nie ma — poziomy 2 i 3 różnią się tam
tylko wyróżnieniem litery wzoru.

## Sterowanie

- **Klawiatura:** klawisz litery. Dla litery z ogonkiem (Ł, Ś, Ż…) pod kratkami pojawiają się trzy kafelki
  (ta litera, jej wersja bez ogonka i trzecia litera) — wybór ramką na strzałkach + Spacja/Enter, kliknięciem
  albo klawiszem litery z kafelka (Z-31, Z-32; zob. „Decyzje właściciela”). Przy „Ł / L / K” klawisz „L”
  kołysze kafelek „L” i liczy się jako błąd (drabina podpowiedzi), AltGr + L wybiera „Ł”, a litera spoza
  kafelków kołysze literę wzoru i też jest błędem. Rząd na kafelki jest zarezerwowany przez całą rundę,
  gdy słowo ma ogonki, żeby scena nie skakała.
- **Dotyk:** przyciski z literami pod sceną (daje je rdzeń; zawsze drukowane).
- Litery w scenie rysuje `ctx.ui.letter` — krój (drukowane / pisane) i wielkość liter wg ustawień rodzica (Z-35).

## Decyzje właściciela

- **Poziomy 1–5 w obecnym kształcie są zatwierdzone** (3 przyciski na poziomie 1, zmyłki od poziomu 3,
  znikanie wzoru od poziomu 4 po 3 s, poziom 5 z tym samym imieniem).
- **Jedno pole imienia, bez imion rodziny:** ustawienia mają jedno pole (`ctx.settings.childName`), a gra nie ma
  listy słów z liter imienia; imiona rodziny wymagałyby zmiany platformy i nie są planowane.
- **Litery z ogonkiem na klawiaturze = trzy kafelki wyboru** (AltGr nie jest wymagany): podpowiedź klawiszem
  „AltGr + L” byłaby dla dziecka nieczytelna, więc odpowiada się wyborem kafelka. Kafelki słuchają też klawiszy
  swoich liter: dziecko, które przy „Ł” naciśnie „L”, widzi łagodne kołysanie kafelka „L” i dostaje pomoc jak po
  każdym błędzie (poświata litery wzoru → paluszek przy właściwym kafelku → „zróbmy razem”), zamiast ciszy.
  AltGr + L zalicza „Ł”, ale nikt nie musi tego umieć — strzałki ze Spacją zostają. Kafelki to zawsze trzy
  różne litery, a trzecia nie jest ani literą z ogonkiem z zadania, ani jej wersją bez ogonka.
- **Długie imię (11–20 liter) = do 20 zadań w rundzie**, układane raz w całości (wyjątek w Z-23 i Z-38).
  Na poziomach 4–5 dziecko odtwarza z pamięci całe imię; realnie runda trwa wtedy ok. 1,5–3 min, a dłużej przy błędach.
- **Bardzo długie imię w niskiej szerokiej scenie dostaje układ „wąski”** (≤ 5 w rzędzie), bo wybór układu
  zależy tylko od proporcji sceny — kratki są wtedy mniejsze, niż dałby układ „szeroki”. Zostaje, bo dotyczy
  tylko imion na ok. 20 liter w poziomym telefonie.
- **„Duch” litery** (poziom 1, `opacity: 0.45`) jest celowo jaśniejszy od ułożonej litery, więc ma kontrast
  poniżej 7 : 1 z Z-14 — to podpowiedź, nie treść.
- **Gra jest bez skórek.**

## Znane ograniczenia

- Rdzeń nie daje grze sygnału o błędzie, więc powrót wzoru po błędzie (poziomy 4–5) robi CSS: wzór jest widoczny,
  gdy rdzeń trzyma w nim podpowiedź (`:has(.mg-hint)`); wraca cały wzór, nie tylko bieżąca litera. Na klawiaturze
  klawisz-podpowiedź z bezczynności staje nad literą wzoru, więc też go odsłania. Na dotyku podpowiedź
  z bezczynności stoi przy przycisku (poza sceną), więc sama bezczynność wzoru nie odsłania — dopiero 1. błąd.
- Na dotyku na poziomie 4 podpowiedź z bezczynności (paluszek przy właściwym przycisku) przychodzi mniej więcej
  wtedy, gdy wzór gaśnie — dziecko, które czeka, widzi puste kratki i paluszek wskazujący odpowiedź.
- Klawisz-podpowiedź (60 px) stoi nad literą wzoru; w 1. rzędzie ma na to miejsce (`--top: 68px`), w dalszych
  rzędach długiego imienia przy małych kratkach zachodzi na rząd wyżej (już przepisany), nie na bieżący wzór
  ani kratkę.
- Przy imieniu na ok. 20 liter w niskiej scenie poziomej (telefon 667 × 375) litera wzoru ma tylko ok. 15–18 px.
