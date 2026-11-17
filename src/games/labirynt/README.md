# Labirynty z jeżykiem (`labirynt`)

Jeżyk idzie przez labirynt do domku. Czasem drogę zamyka brama z kodem — trzeba przepisać cyfry z tabliczki.
Gra wielokrokowa na `createCoach` (chodzenie) i `createCodeEntry` (brama) z rdzenia.

## Cel rozwojowy

Planowanie ruchu i orientacja w przestrzeni (kierunki), cierpliwe wycofywanie się ze ślepych zaułków.
Bramy: rozpoznawanie cyfr 0–9 i przepisywanie ich po kolei.

## Mechanika

- Plansza stoi przez całą rundę (Z-02), rusza się tylko jeżyk (Z-01). Ściany to ciemny „żywopłot” na jasnej
  ścieżce, domek stoi na miodowym polu. Runda to jeden labirynt (Z-23).
- **Jeden krok na jedno naciśnięcie.** Następny krok gra przyjmuje dopiero po 180 ms czasu gry (`STEP_MS`
  w `game.ts`); szybsze naciśnięcia przepadają, więc nie da się „przelecieć” labiryntu.
- **Ściana to nie błąd.** Jeżyk lekko się o nią opiera i wraca — bez dźwięku, bez kołysania i bez drabiny podpowiedzi.
- **Brama z kodem.** Gdy jeżyk chce wejść na pole bramy, scenę przykrywa zbliżenie: brama, tabliczka z kodem i pole
  do wpisania pod nią (cyfra pod cyfrą; cyfry tabliczki mają rozmiar i rozstaw kratek pola). Kod jest cały czas
  widoczny — nic nie trzeba pamiętać (Z-38). Wpisywanie robi `createCodeEntry`; **pytaniem** (poświata po 1. błędzie)
  jest tabliczka. Po dobrym kodzie (i po „zróbmy razem”) brama znika, a jeżyk wchodzi na jej pole.
  Przy bramie strzałki nie działają; z bramy nie da się „odejść” — kończy ją dobry kod albo „zróbmy razem”.
- **Podpowiedź przy bezczynności:** następny krok najkrótszej drogi — na klawiaturze klawisz ze strzałką na polu,
  na które trzeba wejść, na dotyku paluszek przy właściwej strzałce ekranowej. Każde nowe pole to nowe zadanie trenera.
- **Sukces:** wejście do domku — pole domku zmienia tło na „dobrze” i runda się kończy.

## Poziomy (`logic.ts` → `LEVELS`)

Układ labiryntu zależy tylko od numeru poziomu, więc **ten sam poziom to zawsze ten sam labirynt**: `logic.ts`
bierze generator z ziarnem z rdzenia (`createRng` z `core/util/rng`, ziarno = numer poziomu), bo `ctx.rng` jest losowy.
Losowe (z `ctx.rng`) są wyłącznie cyfry kodów, żeby dziecko ćwiczyło różne cyfry.

| Poziom | Siatka | Najkrótsza droga | Bramy | Kod | Pętle |
|---|---|---|---|---|---|
| 1 | 3 × 3 | 4 | – | – | – |
| 2 | 3 × 3 | 6 | – | – | – |
| 3 | 4 × 3 | 7 | – | – | – |
| 4 | 4 × 4 | 8 | – | – | – |
| 5 | 5 × 4 | 9 | 1 | 1 cyfra | – |
| 6 | 5 × 4 | 10 | 1 | 1 cyfra | – |
| 7 | 5 × 5 | 11 | 1 | 2 cyfry | – |
| 8 | 6 × 5 | 12 | 1 | 2 cyfry | – |
| 9 | 6 × 5 | 13 | – | – | – |
| 10 | 7 × 5 | 14 | 2 | 2 cyfry | – |
| 11 | 7 × 5 | 15 | 2 | 2 cyfry | – |
| 12 | 7 × 6 | 16 | 1 | 3 cyfry | – |
| 13 | 8 × 6 | 17 | 2 | 3 cyfry | 2 |
| 14 | 8 × 6 | 18 | – | – | 3 |
| 15 | 8 × 6 | 19 | 2 | 3 cyfry | 3 |
| 16 | 9 × 6 | 20 | 1 | 4 cyfry | 3 |
| 17 | 9 × 6 | 21 | 2 | 4 cyfry | 4 |
| 18 | 9 × 6 | 22 | 2 | 4 cyfry | 4 |
| 19 | 9 × 6 | 24 | 1 | 5 cyfr | 4 |
| 20 | 9 × 6 | 26 | 2 | 5 cyfr | 4 |

Generator (`generateLayout`): drzewo korytarzy (każde pole osiągalne), start w lewym dolnym rogu, domek w ślepym
zaułku odległym dokładnie o zadaną liczbę kroków, bramy równo rozłożone **na drodze** do domku, na końcu pętle.
Pętla jest przyjmowana tylko wtedy, gdy nie skraca drogi i nie pozwala ominąć bramy. Kod nie ma dwóch takich samych
cyfr pod rząd (strażnik wejścia odrzuca szybkie powtórzenie tego samego klawisza jako drżący palec), a kod
jednocyfrowy nie jest zerem.

## Sterowanie

- **Klawiatura:** strzałki — krok; cyfry (i Backspace) — kod bramy.
- **Dotyk:** strzałki ekranowe z rdzenia (`ctx.ui.dPad`) **albo** stuknięcie planszy: jeżyk robi krok w stronę
  stukniętego miejsca (liczy się kierunek, więc cała plansza jest dużym celem). Przy bramie strzałki znikają,
  a w ich miejscu pojawia się klawiatura numeryczna rdzenia; po otwarciu bramy strzałki wracają.
- Stuknięcie planszy działa też myszą w trybie klawiatury.

## Decyzje właściciela

- **Rozmiar siatki: najwyżej 9 × 6, pole poniżej 44 px na telefonie zostaje.** Na telefonie ze strzałkami
  ekranowymi scena jest niska (360 × 640: siatka 9 × 6 daje pole ok. 35 px, 10 × 10 dałaby 21 px), więc labirynty
  są szersze niż wyższe i nie rosną dalej. Kamery przewijającej dużą siatkę nie ma, bo scena ma stać (Z-02).

## Znane ograniczenia

- Przy bramie pas kontrolek zmienia wysokość (strzałki ↔ klawiatura numeryczna), więc scena i plansza na chwilę
  zmieniają rozmiar. Dzieje się to pod zbliżeniem bramy, a po jego zamknięciu plansza wraca do poprzedniej wielkości.
  Rdzeń nie ma sposobu na zamianę kontrolek bez zmiany rozmiaru sceny.
- Tabliczka z kodem jest zawsze przy bramie — tabliczka w innym miejscu labiryntu wymagałaby pamiętania kodu (Z-38).
- Nie ma śladu przebytej drogi, ustawienia „jedź do skrzyżowania” ani przesuwania palcem.
