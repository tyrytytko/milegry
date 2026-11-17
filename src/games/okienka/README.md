# Kształtowe okienka (`okienka`)

Domek wiewiórki ma okienka o różnych kształtach. Obok, przy wiewiórce, czeka okiennica — dziecko wskazuje
okienko, do którego pasuje. Gra „wybierz 1 z N” na `runRound`.

## Cel rozwojowy

Rozpoznawanie i rozróżnianie figur (koło, kwadrat, trójkąt, prostokąt, owal…) oraz przejście od prototypu
do cech: obrócony trójkąt to nadal trójkąt, ale „do góry nogami” nie pasuje do okienka „na podstawie”.

## Mechanika

- Na górze (w poziomie: po lewej) domek z 2–4 okienkami; niżej (po prawej) okiennica na jasnym kafelku.
  Domek i układ stoją przez całą rundę, zmienia się tylko treść okienek i okiennicy (Z-02).
- Wszystkie okienka mają ten sam kolor (mgła), okiennica jeden kolor (miód) — dopasowuje się tylko kształtem (Z-15).
- **Pytanie** (poświata po 1. błędzie): okiennica.
- **Sukces:** okiennica „wchodzi” w okienko — okienko przyjmuje jej kolor, kafelek okiennicy blednie (Z-20).
- Nazwy figur są tylko w `aria-label` okienek (czytniki ekranu) — na ekranie nie ma nic do czytania (Z-10).

## Poziomy (`logic.ts` → `LEVELS`)

| Poziom | Figury | Okienek | Zadań |
|---|---|---|---|
| 1 | koło, kwadrat, trójkąt | 2 | 5 |
| 2 | koło, kwadrat, trójkąt | 3 | 6 |
| 3 | + prostokąt, owal | 4 | 6 |
| 4 | + romb, trójkąt do góry nogami, wąski stojący prostokąt, gwiazdka, serce | 4 | 7 |
| 5 | figury mające „bliźniaka”; wśród okienek zawsze jest bliźniak okiennicy | 4 | 8 |

„Bliźniaki” (`TWINS`) różnią się tylko obrotem (trójkąt ↔ trójkąt do góry nogami, kwadrat ↔ romb,
prostokąt leżący ↔ stojący) albo proporcją (koło ↔ owal, kwadrat ↔ prostokąt). Romb jest zmyłką dla
kwadratu celowo: okiennica musi pasować do otworu bez obracania, więc orientacja figury ma znaczenie.

## Sterowanie

Standard wyboru 1 z N: ramka na strzałkach + Spacja/Enter albo stuknięcie okienka. Jeden krok — okiennica
jest dana, wybiera się tylko okienko.

## Znane ograniczenia

- Poza mechaniką „wybierz 1 z N”, więc ich nie ma: różne wielkości okiennic, odpowiedź „nie pasuje do
  żadnego”, składanie figur, cienie przedmiotów.
