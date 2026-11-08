# Wyniki audytu dla Claude’a

Data: 2026-11-08  
Repozytorium: `ecommerce-api`  
Gałąź: `rassba`  
Audytowany commit: `d31022a` (`test(env): add test environment config`)  
Zakres: `main...rassba`, zgodnie z `AUDIT.md`. W chwili audytu katalog roboczy był czysty.

## Podsumowanie

Potwierdzono pięć usterek: dwie P1 (wysokie), jedną P2 (średnią), dwie P3 (niskie). Najpierw należy zabezpieczyć historię zamówień przed trwałym usunięciem oraz usunąć możliwość logowania sekretów.

Audyt nie wprowadził poprawek do kodu. Zaakceptowanych ograniczeń z `AUDIT.md` nie traktowano jako nowych usterek. Poniższe zalecenia dotyczą naprawy błędów, a nie zmian stylistycznych lub rozbudowy architektury.

## 1. P1 — Wyścig usuwania szkicu z publikacją i zakupem usuwa pozycje zamówienia

**Lokalizacja:** `src/services/product.service.ts:290–305`, metoda `deleteProduct()`.

Powiązane miejsca:

- `src/repositories/products/product/product-postgres.repository.ts:451–460`, metoda `hardDelete()`.
- `src/database/migrations/007_create_order_items.sql`: klucz obcy do wariantu ma `ON DELETE CASCADE`.
- `deleteProductVariant()` wymaga analogicznego przeglądu synchronizacji.

### Przyczyna i scenariusz

Odczyt statusu produktu oraz sprawdzenie `hasOrders()` nie blokują równoległych zmian. Samo opakowanie tych operacji w transakcję nie zabezpiecza decyzji o trwałym usunięciu.

1. Transakcja A rozpoczyna usuwanie szkicu; odczytuje `isPublished = false` i brak zamówień.
2. A zatrzymuje się przed trwałym usunięciem, na etapie `findMediaUrls()`.
3. Operacja B publikuje produkt i zatwierdza zmianę.
4. Klient składa zamówienie na wariant produktu; zamówienie zostaje zatwierdzone.
5. A kontynuuje `hardDelete()`, opierając się na wcześniejszej decyzji.
6. Kaskada usuwa produkt, wariant i pozycję już utworzonego zamówienia.

**Potwierdzenie:** scenariusz odtworzono na PostgreSQL `ecommerce_test`, używając rzeczywistych serwisów i repozytoriów. Jedynie `findMediaUrls()` opóźniono kontrolowaną barierą. Wynik: `deleted: true`, zamówienie utworzone, liczba jego pozycji po usunięciu: `0`.

### Zalecana poprawka

- Ustalić wspólny protokół blokowania produktu/wariantu dla usuwania, publikacji i składania zamówień. Status i powiązania sprawdzać pod odpowiednimi blokadami, utrzymywanymi do końca transakcji.
- Dodać migrację zmieniającą klucz obcy `order_items.product_variant_id` na `ON DELETE RESTRICT` jako zabezpieczenie integralności danych.
- Obsłużyć konflikt usunięcia kontrolowaną odpowiedzią lub przejściem do soft delete, zamiast nieobsłużonego błędu bazy.
- Sprawdzić również usuwanie pojedynczego wariantu oraz zakup rozpoczęty równolegle z wycofaniem publikacji.

### Test regresji

Test integracyjny z dwiema transakcjami i kontrolowaną barierą, odtwarzający powyższą kolejność. Po jego zakończeniu każda zatwierdzona pozycja zamówienia musi nadal istnieć. Dodać odpowiedni scenariusz dla usuwania wariantu.

## 2. P1 — Błędny JSON ustawień powoduje zapis pełnego sekretu w logach

**Lokalizacja:** `src/app.ts:98–101`, globalny `errorHandler`.

### Przyczyna i scenariusz

Handler przekazuje do `console.error()` cały wyjątek. Wyjątek parsera JSON zawiera surowe body żądania. Niepoprawny JSON wysłany do nowego endpointu ustawień może więc umieścić pełny klucz API w logach, zanim zadziała walidacja, szyfrowanie lub maskowanie.

Przykładowe body `PATCH /settings` z celowo nadmiarowym przecinkiem:

```text
{"values":{"anthropic.apiKey":"AUDIT_FAKE_SECRET_1234567890",}}
```

**Potwierdzenie:** rzeczywista aplikacja zwróciła HTTP `400`, a przechwycony argument `console.error()` zawierał cały fikcyjny sekret. Nie używano prawdziwych kluczy.

Mechanizm logowania istniał wcześniej. Usterkę uwzględniono, ponieważ obejmuje nowy endpoint sekretów i narusza wymaganie z `AUDIT.md`, aby nie logować sekretów również na ścieżkach błędów.

### Zalecana poprawka

- Logować wybrane, bezpieczne pola błędu, zamiast całego obiektu wyjątku.
- Dla błędów parsera JSON nie logować `body` ani surowego komunikatu mogącego zawierać fragment danych wejściowych.
- Zwracać ogólny komunikat dla błędnego JSON-a.
- Uwzględnić zagnieżdżone `cause` oraz wyjątki integracji przy projektowaniu sanitizacji.

### Test regresji

Wysłać błędny JSON z rozpoznawalnym fikcyjnym sekretem i przechwycić logger. Sprawdzić, że odpowiedź jest `400`, a sekret nie występuje ani w logach, ani w odpowiedzi. Analogicznie sprawdzić body zawierające hasło.

## 3. P2 — Kolizje kluczy cache zwracają wyniki innego zestawu filtrów

**Lokalizacja:** `src/services/product.service.ts:608–614`, metoda `buildListCacheKey()`.

### Przyczyna i scenariusz

Klucz powstaje przez połączenie niekodowanych par `key=value` separatorem `:`. Wartości filtrów mogą zawierać te same znaki.

Dwa różne zestawy filtrów:

```json
{"artist":"Bob:format=LP"}
```

```json
{"artist":"Bob","format":"LP"}
```

Przy identycznej paginacji, statusie i sortowaniu oba generują:

```text
products:list:artist=Bob:format=LP:limit=20:page=1:sort=newest:status=published
```

**Potwierdzenie:** oba zestawy przechodzą rzeczywisty schemat walidacji, a metoda generuje identyczny klucz. Warunki SQL są różne. Jeżeli pierwszy odczyt zapisze pusty wynik, drugi może otrzymywać ten wynik przez czas życia cache, czyli do 60 sekund.

### Zalecana poprawka

Serializować posortowaną tablicę par parametrów przez `JSON.stringify()` albo użyć innego jednoznacznego kodowania. Zachować pomijanie wartości `undefined` i deterministyczną kolejność parametrów.

### Test regresji

Sprawdzić, że powyższe zestawy generują różne klucze, a te same parametry podane w różnej kolejności generują klucz identyczny. Dodatkowo sprawdzić, że zapis wyniku jednego zapytania nie wpływa na drugie.

## 4. P3 — Przypisywanie zdjęcia nie egzekwuje limitu 24 godzin

**Lokalizacja:** `src/repositories/pending-upload/pending-upload-postgres.repository.ts:39–45`, metoda `claim()`.

### Przyczyna i scenariusz

Zapytanie `DELETE … RETURNING` sprawdza tylko identyfikator uploadu. Nie sprawdza `created_at`. Jeśli od czasu przesłania zdjęcia nie wykonano kolejnego lookupu sprzątającego stare wpisy, upload starszy niż 24 godziny nadal można przypiąć do wariantu.

**Potwierdzenie:** w transakcji testowej utworzono upload z `created_at = NOW() - INTERVAL '48 hours'`. `claim()` zwróciło ten upload. Transakcję następnie wycofano.

To osobna kwestia od zaakceptowanego w `AUDIT.md` sprzątania plików wyłącznie podczas lookupu. Problemem jest brak egzekwowania ważności podczas przypisania.

### Zalecana poprawka

Dodać sprawdzenie wieku do tego samego atomowego zapytania, które przejmuje upload. Ujednolicić definicję TTL z mechanizmem sprzątania. Zachować poprawne wycofanie całej operacji, jeśli choć jeden identyfikator jest nieważny.

### Test regresji

Sprawdzić, że upload sprzed 48 godzin nie zostaje przejęty, świeży upload działa, a próba utworzenia produktu z wygasłym zdjęciem nie pozostawia częściowo utworzonych danych.

## 5. P3 — Błędny format odpowiedzi wyszukiwania Discogs daje HTTP 500 zamiast 502

**Lokalizacja:** `src/integrations/discogs/discogs-client.ts:126–127`, metoda `search()`.

### Przyczyna i scenariusz

`searchResponseSchema.parse(body)` może wyrzucić `ZodError`, który nie jest zamieniany na `ExternalServiceError`. Wyszukiwanie po numerze katalogowym przekazuje go do globalnego handlera, który odpowiada `500` zamiast błędem usługi zewnętrznej `502`.

**Potwierdzenie:** podstawiona odpowiedź HTTP `200` z body `{"results":null}` wywołała `ZodError` bez `statusCode`. Mapowanie tego wyjątku na `500` wynika z globalnego handlera. Zewnętrznego Discogs nie wywoływano.

### Zalecana poprawka

Użyć `safeParse()` i w przypadku niezgodności zgłaszać `ExternalServiceError`, analogicznie do istniejącego `getRelease()`. Zachować bezpieczny komunikat, bez kopiowania surowej odpowiedzi dostawcy.

### Test regresji

Zasymulować poprawny HTTP z nieprawidłową strukturą JSON. Sprawdzić typ wyjątku klienta integracji oraz HTTP `502` z endpointu wyszukiwania po numerze katalogowym.

## Weryfikacja wykonana podczas audytu

- `pnpm test`: **30/30 zestawów, 426/426 testów zakończonych powodzeniem**.
- `pnpm exec tsc --noEmit`: bez błędów.
- `pnpm exec eslint .`: bez błędów.
- Dodatkowe próby: wyścig usuwania/publikacji/zakupu na rzeczywistej bazie testowej, błędny JSON z fikcyjnym sekretem przez rzeczywistą aplikację, kolizja kluczy cache, przejęcie wygasłego uploadu oraz błędna struktura odpowiedzi Discogs.
- Dane utworzone przez dodatkowe próby zostały usunięte lub wycofane transakcją.
- Nie wykonywano połączeń testowych do żywych usług Claude, Discogs ani NBP.

Istniejące testy nie wykrywają powyższych scenariuszy. Po poprawkach należy dodać testy regresji i ponownie uruchomić pełny zestaw, kontrolę typów oraz ESLint.
