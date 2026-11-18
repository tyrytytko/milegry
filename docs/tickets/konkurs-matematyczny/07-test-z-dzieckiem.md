---
status: zrobione
kto: rodzic
zalezy-od: ["06"]
prd: docs/prd/konkurs-matematyczny.md
historyjki: [1, 3, 6]
---

# 07 — Test z dzieckiem

## Co zbudować

Nic do zbudowania: rodzic sprawdza grę z dzieckiem w wieku 5–7 lat i przekazuje uwagi agentowi.
Chodzi o to, czy dziecko rozumie polecenia i rysunki, czy poziom 1 da się przejść za pierwszym
razem i czy podpowiedzi pomagają, a nie przeszkadzają.

## Kryteria akceptacji

- [ ] Dziecko przeszło rundę poziomu 1 na urządzeniu, z którego korzysta na co dzień.
- [ ] Rodzic zapisał, przy których typach zadań dziecko nie wiedziało, co zrobić, albo nie zrozumiało
      polecenia.
- [ ] Rodzic ocenił, czy poziomy 2 i 3 są na dobrym stopniu trudności (za łatwe / w sam raz / za trudne).
- [ ] Uwagi są wpisane w „Notatki z realizacji” albo przekazane agentowi.

## Jak sprawdzić

Instrukcja dla rodzica:
- W panelu „Dla rodziców” ustaw „Wiek dziecka” na „5–7 lat” i otwórz „Matematyczne zagadki”.
- Daj dziecku rundę poziomu 1. Przeczytaj polecenie tylko wtedy, gdy dziecko o to poprosi; nie
  podpowiadaj odpowiedzi.
- Patrz: czy dziecko wie, że ma wybrać kartę; czy rozumie „?”; co robi po pomyłce; czy paluszek
  i „zróbmy razem” pomagają; czy chce zagrać jeszcze raz.
- Jeśli poszło gładko, daj rundę poziomu 2, a potem 3.
- Odpisz agentowi: które typy zadań były niejasne, które polecenia zmienić, czy któryś poziom jest
  za łatwy albo za trudny. Poprawki zaczynamy od `/grill-me konkurs-matematyczny-poprawki`.

## Notatki z realizacji

2026-11-18: ticket zamknięty decyzją rodzica razem z ticketami 01–06. Kryteria nie są odhaczone —
w tym tickecie nie zapisano wyniku testu z dzieckiem. Uwagi po graniu zaczynamy od
`/grill-me konkurs-matematyczny-poprawki`.
