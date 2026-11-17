# Katalog gier

Plan produktu: co jest i co czeka. Każda gotowa gra to folder `src/games/<id>/` z własnym `README.md`
— tam jest jej opis. Opisy gier z kolejki (mechanika, progresja, ryzyka): `docs/TLO.md`.

Statusy: `gotowa` · `w budowie` · `planowana` · `pomysł`.

## Wydanie 1 (MVP)

| # | id | Tytuł | Obszar | Czego uczy | Sterowanie | Status |
|---|---|---|---|---|---|---|
| 1 | `literki` | Spadające literki | litery | rozpoznawanie liter, litera ↔ klawisz | klawiatura, dotyk | gotowa |
| 2 | `labirynt` | Labirynty z jeżykiem | logika | planowanie drogi, kierunki; bramy z kodem cyfrowym | klawiatura, dotyk | gotowa |
| 3 | `orzeszki` | Liczymy orzeszki | liczby | liczenie po jednym, „ile jest?” (do 3 → 5 → 10) | klawiatura, dotyk | gotowa |
| 4 | `patyczki` | Patyczki jeżyka | liczby | dodawanie na konkretach: x + y patyczków → cyfra; odejmowanie na wyższych poziomach | klawiatura, dotyk | gotowa |
| 5 | `okienka` | Kształtowe okienka | kształty | dopasowanie kształtu do otworu, obroty, figury nietypowe | klawiatura, dotyk | gotowa |
| 6 | `po-jednym` | Każdemu po jednym | liczby | odpowiedniość 1:1, zbiór ↔ cyfra | klawiatura, dotyk | gotowa |
| 7 | `pary` | Pary pod liśćmi | pamięć | pamięć wzrokowa; pary obrazek–obrazek, WIELKA–mała, cyfra–zbiór | klawiatura, dotyk | gotowa |
| 8 | `imie` | Literki z imienia | litery | litery własnego imienia (metoda odimienna), kolejność liter | klawiatura, dotyk | gotowa |
| 9 | `literki-blizniaczki` | Literki bliźniaczki | litery | dopasowanie litery PISANEJ do DRUKOWANEJ | klawiatura, dotyk | gotowa |

Skórki: świat leśny i spokojny (jeżyk, wiewiórka, kurczaczki, rybki, kasztany, żołędzie, liście).
`literki` ma trzy skórki tej samej mechaniki: kurczaczki, rybki, kasztany. Pomysły na skórki bez decyzji:
`labirynt` (kurczaczek w kukurydzy, rybka w rafie, wiewiórka w koronie drzewa), `po-jednym` (kurczaczki
i ziarenka, wiewiórki i orzechy).

## Wydanie 2 (kolejka)

| id | Tytuł | Uwagi |
|---|---|---|
| `literki` — poprawka, **pilne** | Spadające literki w poziomie na dotyku | obszar trafienia przedmiotu ma 60 px (przedmiot 44 px), a z wycięciem aparatu 54 px — poniżej 80 px (Z-33); w pionie jest 93 px. Start: `/grill-me literki-dotyk-poziom` |
| `labirynt` — wariant | Zapasy dla wiewiórki | jeżyk nosi zapasy tam i z powrotem; nowy tryb istniejącej gry |
| `ile-jest` | Ile jest? | szybkie rozpoznawanie małych ilości (subitizing), reużywa `orzeszki` |
| `sciezka` | Ścieżka do wiewiórki | liniowa gra planszowa z liczeniem kroków |
| `korale` | Kasztanowe korale | wzory i rytmy (AB, AAB, ABC) |
| `spizarnia` | Spiżarnia wiewiórki | sortowanie wg cechy |
| `kto-sie-schowal` | Kto się schował? | pamięć: co zniknęło |
| `lesne-pary` | Leśne pary | memory pisana–drukowana |
| `pierwsza-gloska` | Pierwsza głoska | wymaga nagrań lektora |
| `bebenki` | Sylabowe bębenki | wymaga nagrań lektora |
| `slimak-pisze` | Ślimak pisze | pokaz kreślenia litery; wymaga własnych ścieżek SVG i konsultacji z nauczycielem |

## Platforma — kolejka

- **Tryb mówiony (lektor czytający polecenia) — do zrobienia od zera;** w kodzie nie ma po nim śladu.
  Wytyczne (polecenia ≤ 6 słów, głoska + słowo-kotwica, nagrania zamiast syntezatora): `docs/TLO.md`.
  Start przez flow (`/grill-me platforma-glos`); projekt ma nie wymagać zmian w grach. Razem z nim: nagrania lektora.
- Profile kilkorga dzieci, eksport/import postępu (JSON).
- Śledzenie opanowania liter/cyfr i cicha adaptacja poziomu między rundami.
- „Tryb przedszkolaka”: pełny ekran + blokada klawiszy systemowych (Chrome/Edge).
- Widok postępu dla rodzica (siatka liter i cyfr, bez wykresów).
- Wybór 1 z N: odpowiedź „żadne”, wybór dwukrokowy.
- Warstwa rundy: sygnał postępu rundy dla gry; możliwość wydłużenia pauzy po sukcesie.
- Wariant rundy „policz po jednym, potem wpisz cyfrę” (zabrakło go w `orzeszki` i `patyczki`).
- Sprite'y domku i bramy labiryntu w `core/art` (dziś rysuje je gra `labirynt`).
- Stały rozmiar pasa kontrolek przy zamianie strzałek ekranowych na klawiaturę numeryczną (dziś scena
  zmienia wysokość, np. przy bramie w `labirynt`).
- Poświata po 1. błędzie przy kodzie 5-cyfrowym w oknie 667 × 375 wychodzi poza scenę i jest przycięta
  o ok. 6 px z każdej strony (`labirynt`, poziomy z długim kodem).

## Jak dodać pozycję

Nie edytuj tej tabeli ręcznie „na zapas”. Pomysł przechodzi przez flow (`docs/FLOW.md`):
`/grill-me` → `/to-prd` → `/to-tickets` → `/implement`; wpis w katalogu aktualizuje ticket,
który grę dowozi (dopisuje jej wiersz i status). Ticket platformy, który realizuje pozycję z kolejki,
usuwa ją z listy.
