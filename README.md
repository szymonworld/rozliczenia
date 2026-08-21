# Rozliczenia

Aplikacja PWA do rozliczania wspólnych wydatków dla czterech domowników
(Szymon, Jarek, Alan, Dawid). Ekran główny pokazuje Twoje saldo i sugerowane
przelewy minimalizujące liczbę transakcji; historia pokazuje wszystkie
wydatki i rozliczenia z możliwością edycji/usuwania.

Stack: Vite + React + TypeScript + Tailwind CSS, jako SPA. Dwie funkcje
serwerowe (`api/ledger.ts`, `api/entry.ts`) czytają/zapisują pojedynczy
dokument JSON w Vercel Blob.

## Uruchomienie lokalne (bez konta Vercel)

```bash
npm install
npm run dev
```

Otwórz `http://localhost:5173`. Bez ustawionej zmiennej
`BLOB_READ_WRITE_TOKEN` dane zapisywane są lokalnie w `.data/ledger.json`
(katalog tworzony automatycznie, ignorowany przez git). Plik jest zasiewany
przy pierwszym uruchomieniu czterema osobami i dwoma przykładowymi wpisami.

`npm run dev` uruchamia tylko Vite, ale endpointy `/api/ledger` i
`/api/entry` działają od razu — obsługuje je deweloperski middleware w
`vite.config.ts`, który ładuje prawdziwy kod z `api/` przez graf modułów
Vite. Nie jest potrzebny `vercel dev`.

Inne przydatne komendy:

```bash
npm run build    # sprawdzenie typów (src, api, shared) + build produkcyjny
npm run preview  # podgląd zbudowanej wersji
```

## Wdrożenie na Vercel

1. Zaloguj się i połącz projekt: `vercel login` oraz `vercel link` (lub
   zaimportuj repozytorium z poziomu dashboardu Vercel).
2. Utwórz store Vercel Blob: w dashboardzie projektu wejdź w zakładkę
   **Storage** → **Create Database** → **Blob** (dostępne też przez
   Marketplace). Podłącz go do projektu — Vercel doda zmienną
   `BLOB_READ_WRITE_TOKEN` automatycznie do środowiska projektu.
3. Pobierz zmienne środowiskowe lokalnie, jeśli chcesz przetestować z
   prawdziwym Blobem: `vercel env pull .env.local`.
4. Wdróż: `vercel deploy` (podgląd) lub `vercel deploy --prod` (produkcja).

Struktura repo jest zgodna z konwencją Vercela od razu — `api/*.ts` to
funkcje Node.js, reszta to statyczny build Vite (`dist/`).
`vercel.json` zawiera przepisanie tras SPA (wszystko poza `/api/*` trafia
do `index.html`), żeby np. bezpośrednie wejście na `/historia` działało.

## Struktura

- `shared/types.ts` — wspólne typy danych (`Ledger`, `Member`, wpisy).
- `src/lib/balances.ts` — czyste funkcje liczące salda, macierz długów i
  sugerowane przelewy (algorytm zachłanny), w groszach (liczby całkowite).
- `src/lib/money.ts` — parsowanie/formatowanie kwot PLN, podział kwoty.
- `src/context/` — stan tożsamości ("kim jestem") i danych (ledger, sync).
- `src/screens/` — ekrany: saldo (`/`), historia (`/historia`), dodawanie/
  edycja (`/dodaj`, `/edytuj/:id`), ustawienia (`/ustawienia`).
- `api/_lib/storage.ts` — jedyne miejsce dotykające tokenu Vercel Blob;
  automatyczny fallback do pliku lokalnego, gdy token nie jest ustawiony.

## Uwagi

- Brak logowania: pierwszy wybór osoby zapisywany jest w `localStorage`.
- Zapis "read-modify-write" na jednym dokumencie JSON — świadomie przyjęte
  ryzyko wyścigu przy równoczesnych zapisach (brak blokad, brak CAS).
- Usuwanie wpisów jest miękkie (`deletedAt`) — widoczne po włączeniu
  „pokaż usunięte”, z opcją przywrócenia.
