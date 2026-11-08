# Weryfikacja poprawek po audycie

Data: 2026-11-08.

Stan: gałąź `rassba`, HEAD `d31022a` oraz niezacommitowane poprawki dostępne podczas weryfikacji. Raport dotyczy katalogu roboczego, nie samego commita HEAD.

## Wynik

Nie znaleziono nowych potwierdzonych usterek w sprawdzonych poprawkach. Scenariusze opisane w `AUDIT_RESULTS.md` i `AUDIT_RECHECK.md` zostały zaadresowane. Nie dodano uwag stylistycznych ani nie zgłaszano zaakceptowanych ograniczeń z `AUDIT.md`.

## Weryfikacja trzech ostatnich ustaleń

### R1 — wyciek tokenu przez wyjątek integracji: naprawione

- Schematy sekretów i tekstów nagłówków odrzucają niedozwolone znaki.
- Zagnieżdżone przyczyny błędów są logowane bez komunikatu i stosu mogących zawierać poświadczenia.
- Niezależnie powtórzono próbę z fikcyjnym tokenem Discogs zawierającym nową linię: walidacja go odrzuca, a rzeczywisty wyjątek natywnego fetch po sanitizacji nie zawiera tokenu.
- Próba nie wymagała połączenia z zewnętrznym API.

### R2 — spóźniony zapis odtwarzający nieaktualny cache: naprawione

- Klucz listy uwzględnia generację odczytaną przed pobraniem danych.
- Redis przechowuje wspólną generację poza wzorcem usuwanych wpisów i zmienia ją przed sprzątaniem.
- Odczyt listy oraz licznika korzysta ze wspólnego obrazu bazy w transakcji REPEATABLE READ READ ONLY.
- Test API odtwarzający wyścig z wycofaniem publikacji przeszedł.
- Niezależna próba na rzeczywistym PostgreSQL, serwisie i repozytoriach, z produkcyjną implementacją InMemoryCache oraz kontrolowaną barierą, sprawdziła zmianę ceny: spóźniony odczyt zwrócił stary obraz z ceną 100, ale kolejny odczyt poprawnie zwrócił 200. Stary zapis nie zastąpił aktualnej generacji.

### R3 — opublikowany produkt bez wariantów: naprawione

- Próba usunięcia ostatniego wariantu opublikowanego produktu jest odrzucana kodem 409.
- Liczenie wariantów odbywa się pod blokadą produktu.
- Przeszedł test równoczesnego usuwania dwóch ostatnich wariantów: jedno usunięcie dochodzi do skutku, drugie zostaje odrzucone.
- Niezależna próba na PostgreSQL potwierdziła 409 oraz zachowanie jednego wariantu w publicznym produkcie.

## Wcześniejsze poprawki

Ponownie sprawdzono zabezpieczenia trwałego usuwania i historii zamówień, obsługę błędnego JSON-a, jednoznaczność kluczy cache, TTL uploadów oraz mapowanie błędnej odpowiedzi wyszukiwania Discogs. Ich testy regresji przeszły, w tym test ochrony kluczem obcym po migracji 017.

## Wykonane sprawdzenia

- `pnpm test`: **33/33 zestawy, 458/458 testów przeszło**.
- `pnpm exec tsc --noEmit`: bez błędów.
- `pnpm exec eslint .`: bez błędów.
- Dodatkowe niezależne próby R1, wyścigu zmiany ceny i R3: zakończone powodzeniem.
- `git diff --check HEAD` wskazuje wyłącznie końcowe spacje w wierszach 3–6 wcześniejszego `AUDIT_RESULTS.md`; są to znaczniki łamania linii Markdown, nie usterka aplikacji.

Tymczasowy produkt z dodatkowej próby został usunięty. Nie zmieniano kodu aplikacji ani wcześniejszych raportów.

## Granice weryfikacji

Przegląd koncentrował się na poprawkach po dwóch poprzednich audytach, ich powiązaniach z istniejącym kodem i regresjach. Nie jest gwarancją braku wszystkich błędów w repozytorium. Nie wykonywano testów żywych integracji Claude, Discogs i NBP ani testów obciążeniowych. Wynik obowiązuje dla stanu katalogu roboczego sprawdzonego w tej rundzie.
