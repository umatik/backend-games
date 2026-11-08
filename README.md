# API sklepu z płytami

Backend sklepu internetowego z płytami winylowymi (reggae, nowe i używane), z koszulkami i gadżetami.
Node.js + TypeScript, Express 5, PostgreSQL, Redis.

Panel admina i sklep to osobne aplikacje, które korzystają z tego API. Dokumentacja wszystkich endpointów jest
w Swaggerze: `http://localhost:3000/api-docs`, a sama specyfikacja OpenAPI (np. do generowania typów w panelu) pod
`/api-docs.json`.

## Co potrafi

- **Katalog płyt:** produkt to album, a wariant to konkretne tłoczenie w określonym stanie (skala Goldmine, osobno
  płyta i okładka) z ceną i ilością. Splity, kompilacje i reedycje są obsłużone.
- **Inne typy produktów:** koszulki (kolor, rozmiar) i gadżety. Nowy typ dodaje się jednym plikiem.
- **Dodawanie płyty przez zdjęcie labela:** Claude odczytuje label, Discogs podpowiada wydanie, a formularz uzupełnia
  się sam. Zdjęcie labela zostaje głównym zdjęciem wariantu.
- **Wykrywanie duplikatów:** gdy płyta (lub inne tłoczenie tego samego albumu) już jest w sklepie, kreator proponuje
  dodanie wariantu do istniejącego produktu.
- **Szkice i publikacja:** nowy produkt jest szkicem, sklep pokazuje tylko opublikowane.
- **Wyszukiwanie i filtry:** artysta, format, stan, wytwórnia, cena, dostępność, tekst; sortowanie po dacie, cenie,
  artyście.
- **Ceny w EUR i PLN:** cena w eurocentach, PLN przeliczane średnim kursem NBP i zaokrąglane w górę do pełnych złotych.
- **Odsłuch:** linki (YouTube, Bandcamp, także z Discogs) i własne nagrania egzemplarza.
- **Tłumaczenie notatki o stanie** z polskiego na angielski i hiszpański (Claude).
- **Ustawienia sklepu z panelu:** klucze API (szyfrowane), model Claude, dane sklepu.
- **Konta, role i uprawnienia (RBAC), zamówienia** ze zdejmowaniem stanów magazynowych.

## Szybki start

Wymagania: Node.js, pnpm, Docker.

```bash
pnpm install
```

```bash
docker compose up -d
```

`docker compose` uruchamia PostgreSQL (`:5432`), Redis (`:6379`) i Mailpit, czyli lokalną skrzynkę na maile (SMTP
`:1025`, podgląd `http://localhost:8025`).

```bash
pnpm migrate
```

```bash
pnpm dev
```

API działa na `http://localhost:3000`. Konta z danych startowych (hasło `alamakota`):

- `bob@example.com`: admin
- `alice@example.com`: zwykły użytkownik

## Konfiguracja

Plik `.env` (nie trafia do repozytorium). Najważniejsze zmienne:

| Zmienna                               | Do czego                                                                                              |
|---------------------------------------|-------------------------------------------------------------------------------------------------------|
| `DB_*`                                | Połączenie z PostgreSQL                                                                               |
| `JWT_*`                               | Tokeny logowania                                                                                      |
| `SMTP_*`                              | Wysyłka maili (lokalnie Mailpit)                                                                      |
| `STORAGE_PATH`                        | Folder na wgrywane pliki, domyślnie `./uploads`                                                       |
| `CORS_ORIGIN`                         | Adresy panelu i sklepu rozdzielone przecinkami, np. `http://localhost:5173,http://localhost:5174`     |
| `SETTINGS_ENCRYPTION_KEY`             | Klucz szyfrujący sekrety zapisywane w panelu; `openssl rand -base64 32`. **Nie zmieniaj go później.** |
| `ANTHROPIC_API_KEY`                   | Klucz Claude (opcjonalnie, można wpisać w panelu)                                                     |
| `DISCOGS_TOKEN`, `DISCOGS_USER_AGENT` | Dostęp do Discogs (opcjonalnie, można wpisać w panelu)                                                |
| `EUR_PLN_FALLBACK_RATE`               | Kurs zapasowy, gdy NBP nie odpowiada                                                                  |
| `EUR_PLN_RATE`                        | Stały kurs zamiast NBP (np. przy pracy offline)                                                       |
| `INTEGRATIONS_ENABLED=false`          | Wyłącza Claude i Discogs                                                                              |

Ustawienia z panelu (`/settings`) mają pierwszeństwo przed `.env`. Kolejność: panel → `.env` → wartość domyślna.

Testy czytają wyłącznie `.env.test`.

## Komendy

```bash
pnpm dev                 # API na :3000, Swagger na /api-docs
pnpm migrate             # migracje bazy developerskiej
pnpm migrate:test        # baza testowa (tworzy ją, jeśli trzeba)
pnpm test                # wszystkie testy (potrzebują PostgreSQL, Redis i Mailpit)
pnpm test:e2e            # tylko scenariusze end-to-end z katalogu e2e/
npx tsc --noEmit         # sprawdzenie typów
npx eslint .
```

Pojedynczy plik testów:

```bash
pnpm test -- src/__tests__/api/products.api.test.ts
```

## Model danych

**Produkt (album):** `type`, `title`, `slug` (generowany), `description`, `isPublished` oraz `attributes`, czyli pola
zależne od typu. Dla płyty: lista artystów, lista utworów, linki do odsłuchu.

**Wariant (tłoczenie i stan):** `priceEur` (eurocenty), `quantity` (domyślnie 1, przy 0 „wyprzedane”) oraz
`attributes`. Dla płyty:

| Pole                                                             |                                                 |
|------------------------------------------------------------------|-------------------------------------------------|
| `format`                                                         | `LP`, `12"`, `10"`, `7"` (wymagane)             |
| `mediaCondition`                                                 | M, NM, VG+, VG, G+, G, F, P (wymagane)          |
| `sleeveCondition`                                                | jak wyżej oraz `generic`, `no_cover` (wymagane) |
| `speed`, `year`, `label`, `catalogNumber`, `country`, `pressing` | opcjonalne                                      |
| `conditionNote`                                                  | notatka o stanie `{ en, es, pl }`               |
| `discogsReleaseId`                                               | wydanie w Discogs                               |

Sztuki w tym samym stanie to jeden wariant z większą ilością. Inny stan albo inne tłoczenie to osobny wariant.

**Typy produktów** są zdefiniowane w kodzie, w `src/product-types/` (`vinyl`, `tshirt`, `other`). Każdy typ to schemat
zod dla atrybutów produktu i wariantu. Nowy typ to nowy plik i wpis w `index.ts`, bez migracji bazy.
`GET /products/types` zwraca schematy jako JSON Schema, z których panel może budować formularze.

**Media** (zdjęcia, wideo, audio, dokumenty) należą do wariantu.

## Dodawanie płyty w kreatorze

```text
zdjęcie labela → wybór wydania z Discogs → produkt → wariant → media → podsumowanie
```

| Krok                   | Endpoint                                                                            |
|------------------------|-------------------------------------------------------------------------------------|
| Rozpoznanie ze zdjęcia | `POST /products/lookup/photo`: odczyt labela, kandydaci z Discogs, `photoUploadIds` |
| Bez zdjęcia            | `GET /products/lookup?catalogNumber=…`                                              |
| Dane wybranego wydania | `GET /products/lookup/releases/{id}`: propozycja formularza i `existingProducts`    |
| Sprawdzenie duplikatów | `GET /products/lookup/existing?…`                                                   |
| Nowy produkt (szkic)   | `POST /products`                                                                    |
| Nowy wariant           | `POST /products/{id}/variants` z `photoUploadIds`: zdjęcie labela staje się głównym |
| Media                  | `POST /products/variants/{id}/media`                                                |
| Tłumaczenie notatki    | `POST /products/lookup/condition-note`                                              |
| Publikacja             | `POST /products/{id}/publish`: zwraca ostrzeżenia, np. `missing_preview`            |

Endpointy pomocnicze kreatora niczego nie zapisują poza zdjęciem labela. Zdjęcie jest zachowywane także wtedy, gdy
Claude lub Discogs zawiodą, a nieużyte znika po 24 godzinach.

Lista szkiców: `GET /products/manage?status=draft`.

## Integracje

- **Claude** (Anthropic): odczyt labela i tłumaczenia. Model do wyboru w ustawieniach (`anthropic.model`):
  Haiku 5.5 (domyślny, ułamek centa za zdjęcie) albo Opus 5.5 (dokładniejszy przy zniszczonych labelach,
  około 0,02 USD za zdjęcie).
- **Discogs:** wyszukiwanie wydań i ich szczegóły. Wymaga darmowego tokenu osobistego. Przed startem sklepu sprawdź
  warunki korzystania z API (podawanie źródła danych).
- **NBP:** średni kurs EUR/PLN, trzymany w cache przez 6 godzin.

Bez skonfigurowanych kluczy endpointy kreatora odpowiadają 503. Połączenie można sprawdzić przez
`POST /settings/test/{anthropic|discogs}`.

## Ustawienia

`GET /settings` i `PATCH /settings`, wymagają uprawnienia `settings:manage`. Lista ustawień jest zdefiniowana
w `src/settings/definitions.ts`. Sekrety są szyfrowane (AES-256-GCM) i API nigdy nie zwraca ich w całości, tylko
zamaskowane. Zmiana działa od razu, bez restartu serwera.

## Uprawnienia

| Uprawnienie                                             |                                 |
|---------------------------------------------------------|---------------------------------|
| `products:create`, `products:update`, `products:delete` | katalog i kreator               |
| `products:publish`                                      | publikacja i wycofanie produktu |
| `settings:manage`                                       | ustawienia sklepu               |
| `users:*`, `orders:*`                                   | konta i zamówienia              |

Wszystkie ma rola `admin`. Uprawnienia są w `seed_data.sql`.

## Dla panelu admina

- **Kim jestem:** `GET /users/me` zwraca zalogowanego użytkownika i listę jego uprawnień. Panel wpuszcza tylko
  użytkownika z uprawnieniami do produktów, a przyciski (np. publikacja, ustawienia) pokazuje według uprawnień.
- **Pliki:** media mają w polu `url` ścieżkę względną (np. `products/photo/variant-1-….jpg`). Plik jest dostępny pod
  `{adres API}/uploads/{url}`. Nazwy plików są unikalne, więc przeglądarka trzyma je w cache przez 30 dni.
- **CORS:** adres panelu musi być na liście `CORS_ORIGIN`.
- **Typy:** specyfikacja OpenAPI pod `/api-docs.json`.

## Architektura

```text
routes → middleware (auth, uprawnienia) → controller (walidacja zod) → service (logika, transakcje) → repository → PostgreSQL
```

- Wszystkie zależności są tworzone ręcznie w `src/dependency-injection.ts`.
- Repozytoria są bezstanowe i dostają połączenie od serwisu. Serwisy otwierają transakcje.
- Cache list produktów jest w Redis. Aplikacja działa także bez Redisa.
- Integracje są schowane za interfejsami (`Storage`, `IntegrationProvider`, `AudioProcessor`,
  `ExchangeRateProvider`), więc można je podmienić bez zmian w reszcie kodu.

```text
src/
├── product-types/    typy produktów (vinyl, tshirt, other)
├── settings/         definicje ustawień, szyfrowanie
├── integrations/     Claude, Discogs
├── controllers/  services/  repositories/  routes/  validators/
├── database/         migracje, seed, konfiguracja testów
└── __tests__/        testy API i jednostkowe
e2e/                  scenariusze end-to-end (całe ścieżki przez HTTP)
```

## Testy

Testy API działają na prawdziwej bazie `ecommerce_test`, którą czyszczą i wypełniają danymi startowymi przed każdym
testem. Uruchamiają się po kolei. Claude, Discogs i NBP są w testach wyłączone albo zastąpione atrapami, więc testy nie
łączą się z siecią. Pliki wgrywane w testach trafiają do `./uploads-test` (`STORAGE_PATH` w `.env.test`), czyszczonego
przed każdym uruchomieniem.

Scenariusze end-to-end w katalogu `e2e/` przechodzą całe ścieżki przez HTTP na tej samej bazie testowej:

- **właściciel sklepu:** szkic płyty, wariant, zdjęcie, ostrzeżenie o braku odsłuchu, publikacja, wykrycie duplikatu,
  sprzedaż ostatniej sztuki, wycofanie z publikacji;
- **klient:** rejestracja, logowanie, zamówienie, „moje zamówienia”, anulowanie ze zwrotem na stan;
- **reset hasła:** prawdziwy e-mail przez SMTP do Mailpita, z którego test odczytuje token (adres API: `MAILPIT_URL`,
  domyślnie `http://localhost:8025`).

## Do zrobienia

Szczegółowa lista jest w [TODO.md](TODO.md). Najważniejsze:

- obróbka nagrań audio (ffmpeg) i przechowywanie plików w chmurze (R2/S3) przed startem;
- przygotowanie do produkcji: build, Docker, health check, logi;
- koszyk, zamówienia i płatności Stripe, kody rabatowe, wysyłka;
- VAT przy sprzedaży za granicę (do omówienia z księgowym).

## Zasada projektu

Prosty system dla małego sklepu, który nie zamyka drogi do dalszego rozwoju. Bez przedwczesnego overengineeringu.

## Historia

Projekt powstał jako kurs budowy backendu e-commerce w Node.js + TypeScript i został przebudowany pod sklep z płytami.
Opis kursu i jego etapów jest w historii repozytorium.
