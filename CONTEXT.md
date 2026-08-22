# Rozliczenia

Aplikacja do rozliczania wspólnych wydatków w grupie (np. domownicy, wyjazd).
Liczy salda, sugeruje minimalną liczbę przelewów i pozwala przypominać sobie
nawzajem o długach.

## Language

**Przypomnienie** (reminder):
Żartobliwa wiadomość, którą wierzyciel wysyła (kopiuje/udostępnia) dłużnikowi,
wzywając do spłaty konkretnej kwoty. Zawsze podpisana imieniem nadawcy.
Napisana z perspektywy "ja piszę do ciebie" — stąd może odnosić się do "mojego
konta".
_Avoid_: nudge, self-nudge (to inny, powiązany, ale odrębny koncept — patrz niżej)

**Self-nudge** (podpis na karcie salda):
Żartobliwy podpis pokazywany dłużnikowi na jego własnym ekranie głównym, gdy
ma ujemne saldo — zastępuje standardowy podpis "Do N osób". Napisany z
perspektywy "mówię to sam do siebie", więc nie zawiera imienia (karta już je
pokazuje osobno), kwoty (karta już pokazuje ją jako nagłówek tuż nad
podpisem — powtórzenie liczby wyglądałoby jak błąd, nie akcent) ani zwrotów
zakładających nadawcę ("moje konto", "przypominam się").
_Avoid_: przypomnienie (to inny, powiązany, ale odrębny koncept — patrz wyżej)

## Relationships

- Jeden **Dłużnik** (member z ujemnym saldem) widzi dokładnie jeden
  **Self-nudge** naraz, dotyczący całości jego salda — nie pojedynczego długu
  wobec jednej osoby, nawet gdy jest winien kilku osobom.
- **Przypomnienie** dotyczy zawsze jednej konkretnej pary wierzyciel↔dłużnik
  i jednej konkretnej kwoty (tego przelewu, nie całego salda).

## Flagged ambiguities

- "przypomnienie" i "self-nudge" dzielą pulę tekstów w kodzie do 2026-08-22 —
  rozdzielone na `TEMPLATES` i `SELF_TEMPLATES` w `src/lib/reminders.ts`,
  ponieważ część sformułowań ("moim kontem", "przypominam się") ma sens tylko
  gdy nadawca i odbiorca to różne osoby. Nie łączyć tych pul bez ponownego
  przejrzenia treści pod kątem tej różnicy w perspektywie.
