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
- [ ] Wykrywanie duplikatów: to samo ID z Discogs lub numer katalogowy → propozycja dodania wariantu do istniejącego produktu
- [x] Zdjęcie labela, z którego rozpoznajemy płytę, jest głównym zdjęciem (`isPrimary`) wariantu: rozpoznawanie zapisuje zdjęcia (tabela `pending_uploads`, migracja 016) i zwraca `photoUploadIds`, które podaje się przy tworzeniu wariantu; nieużyte znikają po 24 h. Zdjęcia są zapisywane także wtedy, gdy Claude lub Discogs zawiodą (odpowiedź z błędem zawiera `photoUploadIds`), żeby kreator mógł przejść do formularza ręcznego z tym zdjęciem. Przy dodawaniu ręcznym zdjęcia idą od razu przez endpoint mediów, bez tego mechanizmu. Zdjęć z Discogs na razie nie importujemy (miniatury Discogs tylko na liście kandydatów do wyboru).
- [x] Token Discogs i klucz Claude ustawione; całość sprawdzona na żywo 2026-11-08 (zdjęcie ZV-7-006 → poprawny odczyt i wydanie z Discogs w ok. 4 s)
- [ ] Sprawdzić warunki korzystania z API Discogs (limity, podawanie źródła danych na stronie sklepu)

## 6. Kreator dodawania produktu

Przebieg: zdjęcie → nowy produkt → edycja wariantu → media wariantu → podsumowanie

- [x] Po kroku „nowy produkt” produkt zapisuje się jako szkic
- [ ] „Dodaj nowy wariant” wraca do edycji wariantu z danymi tłoczenia skopiowanymi z poprzedniego
- [ ] Podsumowanie, akcje: dodaj wariant / opublikuj / zapisz bez publikacji / usuń wariant (przy jednym wariancie: usuń produkt)
- [x] Ostrzeżenie „brak odsłuchu”, które nie blokuje publikacji
- [x] Lista szkiców do dokończenia

## 7. Odsłuch i audio (pełna wersja na końcu; na razie atrapa)

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

## 10. Dane i testy

- [x] Seed: kilka płyt reggae (split 7", LP w kilku tłoczeniach i stanach, wyprzedany wariant, szkic) oraz po jednym produkcie `tshirt` i `other`
- [x] Poprawić testy unit i API (produkty, zamówienia)
- [ ] Testy schematów zod, kreatora, publikacji i usuwania
- [x] Discogs i Claude zamockowane w testach, bez sieci
- [ ] Test konwersji audio (`test-audio.wav`)
- [ ] Nowe tabele w liście TRUNCATE (`test-database.ts`)
- [x] Testy czytają wyłącznie `.env.test` (`src/config/env.ts`); wcześniej `app.ts` doczytywał też `.env`, więc testy widziały prawdziwe klucze i zależały od SMTP z `.env`
- [x] **Niestabilne testy API** (naprawione 2026-11-08): supertest łączył się z 127.0.0.1, a serwer testowy słuchał na `::`, więc inny program na Macu słuchający na 127.0.0.1 pod tym samym portem czasem przejmował połączenie (puste 404/503, „socket hang up”, 401). `test-setup.ts` łączy się teraz przez `[::1]`. Do tego test wgrywania bez logowania czasem kończył się „write EPIPE”, więc wysyła teraz żądanie bez pliku. Wynik: 40 pełnych uruchomień, ostatnie 20 bez porażki.

## Później (osobne etapy)

- [ ] Koszyk: rezerwacja egzemplarza (na jak długo?)
- [ ] Zamówienie i Stripe: zablokować sprzedaż tego samego egzemplarza dwóm osobom; zapisać walutę, kwotę i kurs
- [ ] Kody rabatowe: tylko procentowe, na całe zamówienie, jeden kod na zamówienie, data ważności, limit użyć, własna tabela
- [ ] Wysyłka: koszt zależny od formatu i liczby płyt
- [ ] VAT i sprzedaż za granicę (OSS): skonsultować z księgowym
- [ ] Gatunki, SKU, artyści per utwór, wyszukiwanie w API YouTube
- [ ] Panel admina z kreatorem: osobne repo, po API. To repo udostępnia tylko endpointy, z których kreator korzysta.
