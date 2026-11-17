# Spadające literki (`literki`)

Przedmioty z literami powoli spadają albo płyną w górę; dziecko otwiera je literą na klawiaturze albo
stuknięciem przedmiotu z literą jak na karcie-wzorze. Gra-wzór dla gier z własną pętlą: `logic.ts`
(czyste reguły) + `game.ts` (widok) + `createCoach` z `core/round` (podpowiedzi i koniec rundy).

## Cel rozwojowy

Rozpoznawanie kształtu litery. Klawiatura: wyszukanie litery na klawiszach. Dotyk: dopasowanie litery
do wzoru (w trybie „drukowane + pisane” — pisana ↔ drukowana).

## Mechanika

- Przedmiot z literą powoli przesuwa się swoim torem (jajko spada, bąbelek płynie w górę, łupina spada
  spod drzew). Naraz 1–3 przedmioty wg poziomu (Z-01). Litery na ekranie nigdy się nie powtarzają.
- **Klawiatura:** każda litera widoczna na ekranie, naciśnięta na klawiaturze, otwiera swój przedmiot.
  Litera spoza ekranu = błąd. Kliknięcie przedmiotu niczego nie zalicza (zadaniem jest klawisz, Z-21) —
  pokazuje tylko nad nim klawisz z jego literą.
- **Dotyk:** u góry sceny jeżyk trzyma kartę-wzór z literą najstarszego zamkniętego przedmiotu. Zalicza się
  tylko stuknięcie przedmiotu z tą literą; inny przedmiot łagodnie się kołysze (błąd).
- **Pytanie** (poświata po 1. błędzie): karta-wzór (dotyk) albo przedmiot (klawiatura). W trybie „pisane”
  dodatkowo pojawia się przy przedmiocie mała drukowana litera. Klawisz-podpowiedź dla polskich znaków
  pokazuje „AltGr + A”.
- **Sukces:** przedmiot się otwiera (kurczaczek / rybka / kasztan) i odchodzi po drugim trafieniu albo sam
  po 3 s. Następny przedmiot pojawia się najwcześniej 1,2 s po zebraniu, żeby nie ruszał razem
  z odchodzącym (Z-01).
- Przedmiot, który dotrze do końca toru, ląduje i czeka — nic nie przepada (Z-22).
- Ograniczony ruch (`ctx.reducedMotion`, Z-05): przedmiot pojawia się od razu na końcu toru.

## Poziomy (`logic.ts` → `LEVELS`)

| Poziom | Litery | Naraz | Tor (s, tempo średnie) | Do zebrania |
|---|---|---|---|---|
| 1 | A O M | 1 | 15 | 5 |
| 2 | A O M E L I | 1 | 12 | 6 |
| 3 | A E I O U M L T P K | 2 | 10 | 8 |
| 4 | A–M | 2 | 10 | 8 |
| 5 | N–Z | 2 | 10 | 8 |
| 6 | cały alfabet bez diakrytyków (23 litery, bez Q V X) | 2 | 8 | 10 |
| 7 | jw. | 3 | 8 | 10 |
| 8 | litery z polskimi znakami i ich bazowe: A Ą C Ć E Ę L Ł N Ń O Ó S Ś Z Ź Ż | 2 | 10 | 8 |

## Skórki

| id | Zamknięty → otwarty | Ruch |
|---|---|---|
| `kurczaczki` | jajko → kurczaczek w skorupce | spada na trawę |
| `rybki` | bąbelek → rybka | płynie w górę do tafli wody |
| `kasztany` | kolczasta łupina → kasztan | spada spod koron drzew |

## Kroje (ustawienie rodzica „Litery pisane”)

| Ustawienie | Na przedmiocie | Karta-wzór (dotyk) | Po otwarciu |
|---|---|---|---|
| tylko drukowane | drukowana | drukowana | drukowana |
| drukowane + pisane | drukowana | pisana | pisana |
| pisane | pisana | drukowana | drukowana |

Gra nie wybiera kroju sama: `ctx.ui.letter(ch)` i `ctx.ui.letter(ch, { role: 'companion' })`.

## Decyzje właściciela

- Poziom 8 (polskie znaki) jest na klawiaturze **trudniejszy** (`manifest.hardLevels`), bo wymaga AltGr;
  „zróbmy razem” gwarantuje ukończenie bez AltGr (Z-31), a samo „A” nie zalicza „Ą”.
- Na klawiaturze „Dalej” z poziomu 7 nie prowadzi na poziom 8 — poziom trudniejszy jest dostępny tylko
  z wyboru poziomu.
