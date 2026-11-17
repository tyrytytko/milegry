# Taki sam kształt (`wzor`)

> PODMIEŃ: ten opis dotyczy gry z szablonu. Po zmianie mechaniki opisz swoją grę według wzoru README
> z `docs/DODAWANIE-GRY.md` (sekcja 6): stan obecny, bez historii i bez tego, co daje rdzeń. Puste sekcje usuń,
> potem usuń ten akapit i sprawdź grę: `npm run sprawdz-gre -- wzor`.

Dziecko porównuje kształt u góry z kilkoma kartami i wskazuje taki sam. Minimalna gra „wybierz 1 z N”
na `runRound` — punkt startu nowych gier (`npm run nowa-gra`).

## Cel rozwojowy

Rozpoznawanie i dopasowywanie kształtów: porównanie wzoru z kilkoma kartami.

## Mechanika

- U góry jeden wzór (kształt), niżej 2–4 karty z kształtami. Tło i układ stoją przez całą rundę; między zadaniami
  wymieniają się tylko kształt wzoru i karty, nowe kształty wchodzą przenikaniem (Z-02).
- Wszystkie kształty mają ten sam kolor — dopasowuje się je kształtem (Z-15).
- **Pytanie** (poświata po 1. błędzie): wzór.
- **Sukces:** dobra karta spokojnie zmienia tło na „dobrze” (Z-20).

## Poziomy (`logic.ts` → `LEVELS`)

| Poziom | Kształty | Kart do wyboru | Zadań |
|---|---|---|---|
| 1 | kółko, kwadrat, trójkąt | 2 | 5 |
| 2 | + gwiazdka | 3 | 6 |
| 3 | + romb, serce | 4 | 8 |

## Sterowanie

Standard wyboru 1 z N: ramka na strzałkach + Spacja/Enter albo stuknięcie karty.

## Skórki

| id | Wygląd |
|---|---|
| `polana` (domyślna) | niebo „Leśnej polany” |
| `woda` | tło wodne |

Skórka zmienia tylko tło sceny (`style.css`, selektor `[data-skin='woda']`); mechanika jest wspólna.
