# Ponowny audyt — weryfikacja poprawek i dodatkowe ustalenia

Data: 2026-11-08.

Zakres: gałąź `rassba`, baza `d31022a` oraz aktualne niezacommitowane poprawki. Przegląd zgodnie z `AUDIT.md`, ze szczególnym uwzględnieniem zmian po `AUDIT_RESULTS.md`. Numery linii odnoszą się do katalogu roboczego w chwili ponownego audytu.

## Status wcześniejszych ustaleń

Pięć wcześniej opisanych scenariuszy zostało zaadresowanych w kodzie:

1. Usuwanie/publikacja/zakup: dodano blokady produktu, migrację 017 z `ON DELETE RESTRICT` i obsługę konfliktu klucza obcego przez savepoint oraz soft delete. Testy współbieżności przeszły.
2. Błędny JSON: handler nie loguje już body ani komunikatu parsera; odpowiedź jest ogólna. Testy z fikcyjnymi sekretami przeszły. Poniżej opisano inną, nadal otwartą ścieżkę wycieku sekretu.
3. Kolizja kluczy cache: zastąpiono konkatenację serializacją posortowanych par do JSON.
4. TTL uploadów: `claim()` filtruje wiek atomowo w zapytaniu i korzysta ze wspólnej stałej TTL.
5. Discogs: błędna struktura odpowiedzi wyszukiwania jest mapowana na `ExternalServiceError`.

Nie stwierdzono ponownie pierwotnej utraty pozycji zamówień. Poniższe ustalenia są dodatkowymi scenariuszami; dwa ostatnie dotyczą wcześniejszej logiki, a nie regresji spowodowanej poprawkami.

## R1 — P2: sekret nadal wycieka przez komunikat i stos błędu integracji

**Plik:** `src/errors/loggable-error.ts:43–57`.

Powiązane miejsca: `src/settings/definitions.ts` (schemat `discogsToken`), `src/integrations/discogs/discogs-client.ts` (nagłówek Authorization i opakowanie błędu), globalny handler w `src/app.ts` oraz logowanie w `src/services/record-lookup.service.ts`.

### Scenariusz i dowód

Walidacja tokenu Discogs sprawdza długość i przycina końce, ale akceptuje znak nowej linii wewnątrz wartości. Dla fikcyjnego tokenu `AUDIT_FAKE_TOKEN_123456\n7890` walidacja zwraca sukces.

Rzeczywisty `fetch` odrzuca taki nagłówek przed wysłaniem żądania. Komunikat wyjątku zawiera całą wartość:

```text
Headers.append: "Discogs token=AUDIT_FAKE_TOKEN_123456\n7890" is an invalid header value.
```

`HttpDiscogsClient` opakowuje wyjątek w `ExternalServiceError`. `toLoggableError()` kopiuje `message` oraz `stack` z zagnieżdżonego błędu, więc fikcyjny sekret pozostał w wyniku sanitizacji. W zwykłym lookupie ten wynik jest logowany.

Próba używała rzeczywistego klienta Discogs i natywnego `fetch`, fikcyjnego tokenu i rzeczywistego sanitizera. Błąd powstał lokalnie podczas budowania nagłówków, bez połączenia z usługą zewnętrzną.

### Poprawka

- Odrzucać znaki sterujące oraz nieprawidłowy format kluczy używanych w nagłówkach, także dla konfiguracji z env.
- Nie kopiować bezwarunkowo komunikatów i stosów z wyjątków bibliotek obsługujących poświadczenia. Stos również zawiera komunikat błędu.
- Dla takich wyjątków logować kontrolowany typ/kod/status i własny bezpieczny opis; ewentualną redakcję stosować także do zagnieżdżonych przyczyn.

### Test regresji

Przetestować rzeczywisty błąd budowania nagłówka z fikcyjnym tokenem zawierającym nową linię. Zweryfikować walidację oraz brak tokenu w całym serializowanym wyniku loggera, w tym w `cause.message` i `cause.stack`.

## R2 — P2: odczyt rozpoczęty przed unieważnieniem odtwarza nieaktualny cache

**Plik:** `src/services/product.service.ts:193–204`, metoda `getAllProducts()`.

### Scenariusz i dowód

1. Żądanie A nie znajduje wpisu w cache i odczytuje listę z opublikowanym produktem.
2. A zatrzymuje się przed zakończeniem `countAll()` i zapisem do cache.
3. Żądanie B wycofuje publikację, zatwierdza transakcję i czyści cache.
4. A kontynuuje i zapisuje wcześniej pobraną listę już po czyszczeniu.
5. Kolejne żądanie listy publicznej dostaje wycofany produkt przez czas życia wpisu (60 sekund).

Potwierdzono na rzeczywistym `ProductService` i repozytoriach PostgreSQL, z kontrolowaną barierą przy `countAll()`. Cache zastąpiono prostą mapą implementującą używany kontrakt get/set/clear; wyścig wynika z kolejności wywołań serwisu i dotyczy również Redis.

Wynik po zakończeniu wycofania publikacji i spóźnionego odczytu:

```text
publicDetail: null
staleProductPresent: true
```

Publiczny odczyt szczegółów już ukrywał produkt, ale następny odczyt listy nadal go zwracał. Ten sam mechanizm może przywrócić nieaktualne ceny i stany. Oddzielny odczyt listy i licznika może dodatkowo zwrócić niespójne `products` oraz `total`.

### Poprawka

Użyć generacji/wersji cache zmienianej podczas unieważniania. Odczyt musi zapamiętać generację przed pobraniem danych; spóźniony zapis może trafić tylko do starej generacji, której nowe żądania już nie czytają. Alternatywą jest atomowe sprawdzenie generacji podczas zapisu. Samo sprawdzenie wersji w aplikacji, po którym następuje niezależny SET, pozostawia kolejny wyścig. Jeśli działa wiele instancji API, generacja musi być współdzielona.

### Test regresji

Kontrolowaną barierą odtworzyć sekwencję odczyt → unpublish/clear → spóźniony zapis → nowy odczyt. Nowy odczyt nie może zwrócić wycofanego produktu. Dodać analogiczną próbę dla zmiany ceny lub stanu.

## R3 — P2: usunięcie ostatniego wariantu pozostawia pusty produkt opublikowany

**Plik:** `src/services/product.service.ts:470–481`, metoda `deleteProductVariant()`.

### Scenariusz i dowód

Publikacja wymaga co najmniej jednego wariantu, ale jego późniejsze usunięcie nie zachowuje tego warunku:

1. Utworzyć produkt z jednym wariantem.
2. Opublikować produkt.
3. Usunąć jedyny wariant.
4. Odczytać produkt publicznym odczytem.

Potwierdzono na rzeczywistym serwisie i repozytoriach PostgreSQL:

```text
publicProductExists: true
isPublished: true
variants: 0
```

Produkt pozostaje w publicznym katalogu, chociaż nie ma wariantu, ceny wariantu ani możliwości zakupu. Jest to obejście warunku wymaganego przez `publishProduct()`.

### Poprawka

Pod istniejącą blokadą produktu sprawdzić liczbę aktywnych wariantów. Odrzucić usunięcie ostatniego wariantu opublikowanego produktu z kontrolowanym błędem, albo atomowo wycofać publikację produktu. Wybrać jedną regułę i odzwierciedlić ją w kontrakcie API.

### Test regresji

Sprawdzić sekwencję create → publish → delete last variant → public GET/list. Zweryfikować również równoczesne usuwanie dwóch ostatnich wariantów oraz poprawne czyszczenie cache.

## Weryfikacja

- `pnpm test`: **33/33 zestawy, 445/445 testów przeszło**.
- `pnpm exec tsc --noEmit`: bez błędów.
- `pnpm exec eslint .`: bez błędów.
- R1: odtworzony lokalnie z rzeczywistym błędem nagłówka i fikcyjnym tokenem.
- R2: odtworzony na rzeczywistej bazie testowej i serwisie, z cache w pamięci oraz kontrolowaną barierą.
- R3: odtworzony na rzeczywistej bazie testowej i serwisie.
- Tymczasowy produkt użyty w dodatkowych próbach został usunięty.
- Nie zmieniano kodu aplikacji ani istniejącego raportu `AUDIT_RESULTS.md`.

Nie dodano uwag stylistycznych. Akceptowane ograniczenia wskazane w `AUDIT.md` pozostają poza listą usterek. Wynik testów nie oznacza weryfikacji działania żywych usług Claude, Discogs i NBP.
