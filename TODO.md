# TODO: adaptacja API pod sklep z płytami (reggae, nowe i używane)

Branch: `rassba` · Stan: planowanie zakończone, implementacja jeszcze nie ruszyła.

## Ustalenia ogólne

- **Produkt** to album (wydanie muzyczne). **Wariant** to tłoczenie w określonym stanie, czyli grupa sztuk w tym samym stanie, z jedną ceną.
- Inny stan albo inne tłoczenie oznacza osobny wariant. Domyślna ilość to 1. Sztuki jednego wariantu mają wspólne zdjęcia i notatkę.
- **Typy produktów** (na start `vinyl`, `tshirt`, `other`) są zdefiniowane w kodzie. Nowy typ to nowy plik z definicją pól i wpis w rejestrze, bez migracji.
- **Minimalizm:** artysta, wytwórnia itp. to na razie zwykłe stringi, bez osobnych tabel.
- **Gatunki i tagi:** na start brak.

## 0. Języki

- [x] Sklep w trzech językach: EN (domyślny), ES, PL
- [x] Interfejs i słowniki (formaty, skala Goldmine) tłumaczy frontend. API zwraca kody.
- [x] Opis produktu: jeden tekst, bez tłumaczeń (uzupełnianie z Discogs: etap 4)
- [x] Notatka o stanie: wpisywana po PL i tłumaczona automatycznie przez Claude na EN i ES, z potwierdzeniem lub poprawką przed zapisem. Zapisana jako mapa `{ en, es, pl }`. Endpoint tłumaczenia tylko proponuje, niczego nie zapisuje. W testach zamockowany.
- [x] Stan płyty i okładki to enum, tłumaczony we frontendzie.

## 1. Typy produktów

- [x] Wspólny, otwarty kontrakt typu (interfejs TS), który pozwala później dodawać nowe rodzaje pól i opcje bez przepisywania istniejących typów
- [x] Każdy typ w osobnym, dedykowanym pliku w `product-types/`
- [x] Rejestr typów: jedna lista importująca pliki typów
- [x] Typ `vinyl`: pola z sekcji 2 i 3
- [x] Typ `tshirt`: wariant z polami kolor i rozmiar (wymagane)
- [x] Typ `other` (gadżety: figurki, krzyże etiopskie…): bez wymaganych atrybutów, w wariancie opcjonalny opis (np. materiał, wymiar)
- [x] Schematy zod budowane z definicji typu
- [x] `GET /products/types`: lista typów z JSON Schema pól, dla formularza

## 2. Model danych: produkt

- [x] Stałe kolumny: `type`, `title`, `slug` (generowany automatycznie), `description` (opcjonalny), `is_published` (szkic / opublikowany), `attributes` (JSONB)
- [x] Winyl, `attributes`:
  - [x] artyści: lista stringów („Various” dla kompilacji, splity jako kilku artystów)
  - [x] lista utworów (z Discogs)
  - [x] linki do odsłuchu: lista (YouTube / Bandcamp)
- [x] Opis uzupełniany z Discogs (notes i wykonawcy), edytowalny

## 3. Model danych: wariant

- [x] Stałe kolumny: `price_eur` (eurocenty, int), `quantity` (domyślnie 1), `attributes` (JSONB)
- [x] Usunąć `color` i `size` jako kolumny (merch ma je w `attributes`)
- [x] Winyl, `attributes`:
  - [x] format: wymagany (LP / 12" / 10" / 7")
  - [x] prędkość: 33 / 45 RPM
  - [x] rok, wytwórnia, numer katalogowy (bez UNIQUE), kraj: opcjonalne
  - [x] oryginał / reedycja: opcjonalne
  - [x] stan płyty: wymagany, w skali Goldmine (M / NM / VG+ / VG / G+ / G / F / P)
  - [x] stan okładki: wymagany, skala Goldmine oraz Generic / No Cover
  - [x] notatka o stanie: opcjonalna, mapa języków (sekcja 0)
  - [x] ID wydania z Discogs
- [x] Ilość 0: wariant widoczny jako „wyprzedane”
- [x] Media wariantu: zdjęcia i własne nagranie audio (bez zmian w tabeli)

## 4. Ceny i waluty

- [x] Cena podawana w EUR, PLN przeliczane
- [x] Kurs NBP trzymany w cache (6 h), przy awarii ostatni znany kurs lub `EUR_PLN_FALLBACK_RATE`; `EUR_PLN_RATE` ustawia kurs stały
- [x] Reguła zaokrąglania cen w PLN: w górę do pełnych złotych
- [x] API zwraca cenę w EUR i w PLN

## 5. Dodawanie przez zdjęcie (Claude i Discogs)

- [x] Endpoint: zdjęcie labela (1–2 zdjęcia) → Claude (vision) odczytuje pola → wyszukiwanie w Discogs → lista kandydatów. Endpoint niczego nie zapisuje. Tylko admin.
- [x] Wyszukiwanie w Discogs: najpierw numer katalogowy i wytwórnia, potem artysta i tytuł
- [x] Endpoint: wyszukiwanie po wpisanym numerze katalogowym, bez zdjęcia
- [x] Endpoint: szczegóły wybranego wydania zmapowane na pola formularza (z linkami `videos` do odsłuchu)
- [x] Kilka wyników: lista do wyboru (miniatura, artysta – tytuł, wytwórnia, nr kat., rok, kraj, format). Przy jednym wyniku też potwierdzenie.
- [x] Opcja „żadne z nich, wpisz ręcznie”: formularz uzupełniony tym, co odczytało AI
- [x] Wykrywanie duplikatów: to samo ID z Discogs, numer katalogowy (z wytwórnią) albo tytuł z artystą (ten sam album w innym tłoczeniu) → `existingProducts` w propozycji z Discogs i `GET /products/lookup/existing`
- [x] Zdjęcie labela, z którego rozpoznajemy płytę, jest głównym zdjęciem (`isPrimary`) wariantu: rozpoznawanie zapisuje zdjęcia (tabela `pending_uploads`, migracja 016) i zwraca `photoUploadIds`, które podaje się przy tworzeniu wariantu; nieużyte znikają po 24 h. Zdjęcia są zapisywane także wtedy, gdy Claude lub Discogs zawiodą (odpowiedź z błędem zawiera `photoUploadIds`), żeby kreator mógł przejść do formularza ręcznego z tym zdjęciem. Przy dodawaniu ręcznym zdjęcia idą od razu przez endpoint mediów, bez tego mechanizmu. Zdjęć z Discogs na razie nie importujemy (miniatury Discogs tylko na liście kandydatów do wyboru).
- [x] Token Discogs i klucz Claude ustawione; całość sprawdzona na żywo 2026-11-08 (zdjęcie ZV-7-006 → poprawny odczyt i wydanie z Discogs w ok. 4 s)
- [x] Warunki API Discogs przeczytane 2026-11-08 (wersja z 27.05.2025, https://support.discogs.com/hc/en-us/articles/360009334593):
  - Dane, których używamy (tytuł, artyści, wytwórnia, nr kat., rok, kraj, format, tracklista, notatki, kredyty), to „CC0 Data”: wolno ich używać komercyjnie.
  - Zdjęcia z Discogs i dane z Marketplace (ceny, historia sprzedaży) to „Restricted Data”: zakaz użycia komercyjnego. Dobrze, że ich nie importujemy; nie pobierać cen z Discogs.
  - Przy danych z Discogs trzeba pokazać „Data provided by Discogs.” z linkiem (bez `nofollow`) do strony wydania na discogs.com.
  - Na stronie (np. w regulaminie) informacja: „This application uses Discogs’ API but is not affiliated with, sponsored or endorsed by Discogs. ‘Discogs’ is a trademark of Zink Media, LLC.”
  - Treść z API nie może być wyświetlana, jeśli jest starsza niż 6 h od tej na Discogs, ani przechowywana dłużej, niż to potrzebne. Do wyjaśnienia: czy to dotyczy też danych CC0 skopiowanych do produktu i poprawionych przez nas (licencja CC0 mówi, że wolno je zachować).
- [ ] **Obowiązkowe oznaczenie przy danych z Discogs:** dopisek „Data provided by Discogs.” z linkiem do strony wydania na discogs.com (`https://www.discogs.com/release/{discogsReleaseId}`). Link nie może mieć `nofollow`. API zwraca `discogsReleaseId` wariantu, a link buduje front. Rozważyć pole `discogsUrl` w odpowiedzi API.
- [ ] Notka o Discogs w regulaminie sklepu (front)

## 6. Kreator dodawania produktu

Przebieg: zdjęcie → nowy produkt → edycja wariantu → media wariantu → podsumowanie

- [x] Po kroku „nowy produkt” produkt zapisuje się jako szkic
- [ ] „Dodaj nowy wariant” wraca do edycji wariantu z danymi tłoczenia skopiowanymi z poprzedniego
- [ ] Podsumowanie, akcje: dodaj wariant / opublikuj / zapisz bez publikacji / usuń wariant (przy jednym wariancie: usuń produkt)
- [x] Ostrzeżenie „brak odsłuchu”, które nie blokuje publikacji
- [x] Lista szkiców do dokończenia

## 7. Odsłuch i audio (pełna wersja na końcu; na razie atrapa)

> **Pominięte (decyzja 2026-11-08):** etap audio (ffmpeg, limity) świadomie odłożony. Nagrania zapisują się
> bez obróbki przez atrapę `PassThroughAudioProcessor`; wrócić do tego przed startem sklepu albo gdy pliki audio
> zaczną zajmować za dużo miejsca.

- [x] Interfejs `AudioProcessor` z atrapą, która zapisuje plik bez zmian. Później podmiana na ffmpeg w `dependency-injection.ts`.

- [x] Odsłuch jest opcjonalny: linki z Discogs, własne linki albo własne nagranie
- [ ] Konwersja przez ffmpeg na serwerze: MP3 128 kbps, fragment 30–60 s, wyciszenie na początku i końcu, wyrównanie głośności, usunięcie oryginału
- [ ] Osobny, wyższy limit rozmiaru dla wgrywanego audio
- [ ] Przechowywanie na lokalnym dysku (`LocalStorage`). Przed produkcją przejście na R2 lub S3.

## 8. API

- [x] Produkt: utwórz (jako szkic), edytuj, opublikuj i cofnij publikację, usuń (szkic na twardo razem z plikami, opublikowany miękko)
- [x] `POST /products` zwraca produkt z wariantami
- [x] Osobne endpointy wariantów pod produktem: dodaj, edytuj, usuń
- [x] Sklep pokazuje tylko opublikowane produkty. Admin widzi też szkice (filtr statusu).
- [x] Filtry: artysta, format, stan płyty, wytwórnia, zakres cen, dostępność
- [x] Wyszukiwanie tekstowe: tytuł, artyści, wytwórnia, numer katalogowy
- [x] Sortowanie: najnowsze, cena, artysta
- [x] Nowe uprawnienie `products:publish` (w seedzie)
- [x] Walidacja przez zod, także użytkowników, zamówień i mediów (stare walidatory usunięte)
- [x] Swagger (`@openapi`) aktualizowany przy każdym endpoincie
- [x] Pod panel admina (2026-11-08): `GET /users/me` (użytkownik i uprawnienia), pliki pod `/uploads/{url}` (z nagłówkiem pozwalającym wczytać je z innej domeny i cache na 30 dni), `CORS_ORIGIN` jako lista adresów, specyfikacja pod `/api-docs.json`. Przy okazji niepoprawny JSON w żądaniu daje 400 zamiast 500.
- [ ] Przy przejściu na R2/S3: `url` mediów stanie się pełnym adresem; panel powinien wtedy używać go wprost (rozważyć pole z pełnym adresem już teraz)
- [ ] Nazwy plików mediów (`variant-{id}-{czas}`) są przewidywalne, więc zdjęcia szkiców da się odgadnąć. Dla zdjęć płyt bez znaczenia; zmienić na UUID, gdyby pojawiły się pliki prywatne

## 8a. Moduł ustawień

- [x] Tabela `settings` (migracja 015), uprawnienie `settings:manage` (admin)
- [x] Lista ustawień zdefiniowana w kodzie (`src/settings/definitions.ts`): grupa, rodzaj (sekret / tekst / liczba / lista), walidacja zod, zmienna środowiskowa jako zapas, wartość domyślna
- [x] Kolejność: baza (panel) → `.env` → wartość domyślna
- [x] Sekrety szyfrowane AES-256-GCM kluczem `SETTINGS_ENCRYPTION_KEY`; API zwraca tylko zamaskowaną postać
- [x] `GET /settings`, `PATCH /settings` (`null` przywraca `.env`/domyślną), `POST /settings/test/{anthropic|discogs}`
- [x] Integracje (Claude, Discogs, kurs zapasowy) czytają ustawienia na bieżąco, bez restartu
- [x] Model Claude do wyboru w ustawieniach (Opus 5.5 / Haiku 5.5)
- [x] Ustawić `SETTINGS_ENCRYPTION_KEY` w `.env` (`openssl rand -base64 32`)

## 9. Porządki techniczne

- [x] Nowa migracja: `TIMESTAMP` → `TIMESTAMPTZ` w `product_variants`
- [x] Usunąć `.DS_Store` z repozytorium i dodać do `.gitignore`
- [x] Cache list: klucz z uporządkowanych parametrów, TTL, czyszczenie przy zmianach. Bez cache dla wyszukiwania tekstowego.

## 9a. Zależności (stan 2026-11-08)

- [x] Aktualizacja pakietów w ramach dozwolonych wersji (`pnpm update`); podatności z 19 do 3
- [x] supertest 7.3 sam naprawia problem z macOS (łączenie z obcym procesem na 127.0.0.1), więc własna łatka w `test-setup.ts` została usunięta
- [x] eslint: nieużywane parametry wymagane przez sygnaturę mają prefiks `_` (reguła w `eslint.config.ts`)
- [ ] Zostały: `deepmerge` (tylko w jest, brak poprawki), `glob` i `minimatch` w `swagger-jsdoc` (czyta pliki tras przy starcie; poprawka wymaga głównej wersji `glob`, która może zepsuć Swaggera). Sprawdzać przy kolejnych aktualizacjach.
- [ ] Zmiany głównych wersji odłożone: `dotenv` 18, TypeScript 7 (nowy kompilator). Zrobić osobno, z przeczytaniem listy zmian.

## 9b. Audyt zewnętrzny (2026-11-08)

Raport: `AUDIT_RESULTS.md` (audyt commita `d31022a`). Wszystkie 5 zgłoszeń potwierdzone w kodzie i poprawione, każde z testem regresji.

- [x] **P1 – wyścig usuwania szkicu z publikacją i zakupem kasował pozycje zamówienia.** Zmiany, od których zależy, czy produkt można kupić albo trwale usunąć (publikacja, usunięcie produktu lub wariantu), zaczynają od `lockForUpdate` (`SELECT … FOR UPDATE` na produkcie); zamówienie bierze na produkcie `FOR SHARE`, a wycofanie publikacji blokuje wiersz samym `UPDATE`. Migracja 017: `order_items.product_variant_id` z `ON DELETE RESTRICT` zamiast `CASCADE`; gdyby baza odmówiła trwałego usunięcia, serwis cofa się do punktu zapisu i usuwa miękko. Test: `api/concurrency.api.test.ts` (bariera w połowie usuwania, przed poprawką odtwarzał błąd).
- [x] **P1 – niepoprawny JSON wysłany do `/settings` zapisywał sekret w logach.** Handler błędów loguje tylko bezpieczny opis (`src/errors/loggable-error.ts`): przy błędach parsera bez body i komunikatu, przy innych nazwa, komunikat, status, stos tylko dla 5xx i skrócone przyczyny. Odpowiedź na niepoprawny JSON to ogólne „Malformed JSON”. To samo w logu nieudanego rozpoznawania płyty.
- [x] **P2 – kolizje kluczy cache listy** (np. artysta `Bob:format=LP` i artysta `Bob` z formatem `LP`). Klucz to teraz JSON posortowanych par parametrów.
- [x] **P3 – zdjęcie labela starsze niż 24 h dało się podpiąć.** `claim()` sprawdza wiek w tym samym zapytaniu (zegar bazy); stała `PENDING_UPLOAD_TTL_MS` jest w jednym miejscu (`pending-upload.interface.ts`).
- [x] **P3 – zły format odpowiedzi wyszukiwania Discogs dawał 500.** `search()` używa `safeParse` i zgłasza `ExternalServiceError` (502).

Ponowny audyt: `AUDIT_RECHECK.md`. Poprzednie poprawki potwierdzone; 3 nowe zgłoszenia, wszystkie poprawione z testami regresji.

- [x] **R1 (P2) – token z błędu `fetch` w logach.** Token ze znakiem nowej linii przechodził walidację, `fetch` odrzucał nagłówek i cytował go w komunikacie, a sanitizer kopiował komunikat i stos przyczyny. Teraz: klucz Claude i token Discogs przyjmują tylko widoczne znaki ASCII bez spacji, User-Agent tylko drukowalne ASCII (dotyczy też wartości z env); z przyczyn błędów (`cause`, `originalError`) logujemy tylko nazwę, kod i status.
- [x] **R2 (P2) – spóźniony zapis przywracał nieaktualną listę w cache.** Cache ma generacje (`Cache.generation()`, klucz `cache-generation:products` w Redisie, wspólny dla wielu instancji): `clear()` najpierw ustawia nową losową generację, a lista buduje klucz z generacji odczytanej przed pobraniem danych, więc zapis sprzed unieważnienia trafia do generacji, której nikt już nie czyta. Lista i licznik czytane w jednej transakcji `REPEATABLE READ READ ONLY`.
- [x] **R3 (P2) – usunięcie ostatniego wariantu zostawiało opublikowany produkt bez wariantów.** Reguła: ostatniego wariantu opublikowanego produktu nie da się usunąć (409, `LastPublishedVariantError`); trzeba wycofać publikację albo usunąć cały produkt. Sprawdzane pod blokadą produktu, więc dwa równoległe usunięcia nie zejdą do zera. Panel: przy jednym wariancie przycisk „usuń wariant” zamienia się w „usuń produkt” (zgodnie z planem kreatora).
- [ ] Inne `console.error` w kodzie (Redis, NBP, ustawienia, migracje) nadal logują cały obiekt błędu. Nie dotyczą danych z żądań, ale przy logach JSON (przygotowanie do produkcji) przejść wszędzie na `toLoggableError`.

## 10. Dane i testy

- [x] Seed: kilka płyt reggae (split 7", LP w kilku tłoczeniach i stanach, wyprzedany wariant, szkic) oraz po jednym produkcie `tshirt` i `other`
- [x] Poprawić testy unit i API (produkty, zamówienia)
- [x] Testy schematów zod, kreatora, publikacji i usuwania (2026-11-08): `unit/product-types`, `unit/validators`, `api/product-lifecycle.api.test.ts` (usuwanie plików przy twardym usuwaniu, miękkie usuwanie zamówionych, cache listy, zapis kreatora ze zdjęciem i wycofanie przy złym zdjęciu)
- [x] Testy end-to-end w `e2e/` (2026-11-08): ścieżka właściciela sklepu, klienta i reset hasła przez Mailpit; `pnpm test:e2e`. Do rozważenia później: uruchamianie ich na zbudowanym kontenerze w ramach przygotowania do produkcji
- [x] Discogs i Claude zamockowane w testach, bez sieci
- [x] Testy na żywych usługach (2026-11-08): `live/`, `pnpm test:live`, poza zwykłym `pnpm test`. Claude czyta zdjęcie ZV-7-006, Discogs znajduje wydanie 34434571 i mapuje szkic, tłumaczenie notatki, pełny pierwszy krok kreatora (zdjęcie → kandydaci), kurs NBP. Bez kluczy pomijane. Pierwsze uruchomienie: 7/7, ok. 10 s.
- [ ] Testy obciążeniowe (k6 albo autocannon) po przygotowaniu do produkcji: przeglądanie sklepu z cache i bez, wiele osób kupujących ostatnie sztuki tej samej płyty, publikacja w trakcie ruchu; mierzyć p95, błędy, pulę połączeń, pracę bez Redisa
- [ ] Kreator: Discogs nie zawsze podaje prędkość (np. 34434571 ma tylko 7"), a Claude czyta „45 RPM” z labela. Panel może uzupełnić puste pola szkicu z Discogs odczytem ze zdjęcia
- [ ] Test konwersji audio (`test-audio.wav`)
- [x] Nowe tabele w liście TRUNCATE (`test-database.ts`): `settings`, `pending_uploads`
- [x] Testy mają własny katalog plików `./uploads-test` (`STORAGE_PATH` w `.env.test`), czyszczony przed każdym uruchomieniem (`src/database/test-global-setup.ts`). Wcześniej zapisywały do `./uploads` razem z dev; 1137 osieroconych plików (4,4 MB) przeniesiono 2026-11-08 do Kosza (`ecommerce-api-uploads-2026-11-08`).
- [x] Testy czytają wyłącznie `.env.test` (`src/config/env.ts`); wcześniej `app.ts` doczytywał też `.env`, więc testy widziały prawdziwe klucze i zależały od SMTP z `.env`
- [x] **Niestabilne testy API** (naprawione 2026-11-08): supertest łączył się z 127.0.0.1, a serwer testowy słuchał na `::`, więc inny program na Macu słuchający na 127.0.0.1 pod tym samym portem czasem przejmował połączenie (puste 404/503, „socket hang up”, 401). `test-setup.ts` łączył się przez `[::1]`; od supertest 7.3 problem naprawia sama biblioteka. Do tego test wgrywania bez logowania czasem kończył się „write EPIPE”, więc wysyła teraz żądanie bez pliku. Wynik: 40 pełnych uruchomień, ostatnie 20 bez porażki.

## Później (osobne etapy)

- [ ] Koszyk: rezerwacja egzemplarza (na jak długo?)
- [ ] Zamówienie i Stripe: zablokować sprzedaż tego samego egzemplarza dwóm osobom; zapisać walutę, kwotę i kurs
- [ ] Kody rabatowe: tylko procentowe, na całe zamówienie, jeden kod na zamówienie, data ważności, limit użyć, własna tabela
- [ ] Wysyłka: koszt zależny od formatu i liczby płyt
- [ ] VAT i sprzedaż za granicę (OSS): skonsultować z księgowym
- [ ] Gatunki, SKU, artyści per utwór, wyszukiwanie w API YouTube
- [ ] Panel admina z kreatorem: osobne repo, po API. To repo udostępnia tylko endpointy, z których kreator korzysta.
