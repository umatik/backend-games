# Node.js Backend Course — E-commerce API — Część 1

## Cel kursu

Celem kursu było zbudowanie realnego backendu e-commerce w Node.js + TypeScript, zamiast nauki zagadnień w oderwaniu od
praktyki.

Projekt był rozwijany etapami na bazie jednego rzeczywistego API. Kurs był prowadzony interaktywnie przez ChatGPT:
kolejne zagadnienia były dobierane do aktualnego poziomu projektu, implementowane praktycznie, testowane, a następnie
wspólnie weryfikowane i refaktoryzowane.

Nie chodziło o stworzenie sztucznego projektu „pod kurs”, lecz o przejście przez rzeczywisty cykl developerski:
projektowanie → implementacja → testowanie → poprawki → refaktoryzacja → decyzje architektoniczne → code review.

Główny nacisk:

- praktyczne rozumienie backendu
- architektura aplikacji
- PostgreSQL
- REST API
- uwierzytelnianie i autoryzacja
- transakcje i spójność danych
- testy
- bezpieczeństwo
- dokumentacja API
- przygotowanie aplikacji do produkcji
- myślenie o skalowalności bez niepotrzebnego overengineeringu

> **Rola ChatGPT w kursie**
>
> Kurs był prowadzony w formie praktycznej współpracy z ChatGPT. ChatGPT pełnił rolę prowadzącego / mentora
> technicznego: zadawał kolejne zadania, wyjaśniał zagadnienia, analizował decyzje architektoniczne, pomagał diagnozować
> problemy, przygotowywał testy i prowadził przez refaktoryzacje.
>
> Kod był rozwijany iteracyjnie, a decyzje techniczne były podejmowane na podstawie rzeczywistych problemów
> pojawiających się w projekcie. Ostateczny kod projektu jest wynikiem tej wspólnej pracy.

> **Historia i ewolucja projektu**
>
> Historia commitów Git dokumentuje rzeczywisty rozwój projektu w trakcie kursu, jego kolejne etapy oraz czas trwania
> nauki.
> Kurs był realizowany systematycznie, dzień po dniu, w rzeczywistym cyklu developerskim — wraz z implementacją,
> testowaniem, poprawkami, refaktoryzacją i podejmowaniem decyzji technicznych.
>
> Historia commitów odpowiada kolejnym etapom opisanym w README. Poszczególne commity mogą jednak przedstawiać zupełnie
> różne podejścia, eksperymenty lub zmiany implementacyjne. Ostateczna logika i architektura projektu są zgodne z
> aktualnym opisem kursu w README.

## Stack technologiczny

### Runtime / język

- Node.js
- TypeScript
- ES Modules
- tsx

### HTTP / API

- Express
- REST API
- Helmet
- cors
- express-rate-limit

### Baza danych

- PostgreSQL
- Docker
- pg
- Pool / PoolClient
- SQL
- database migrations

### Authentication / Authorization

- JWT
- bcrypt
- RBAC
- permissions
- Bearer Authentication

### Validation / Security

- request validation
- Helmet
- CORS
- rate limiting
- JWT hardening
- parameterized SQL queries
- request body limits
- npm audit

### Testing

- Jest
- Supertest
- ts-jest
- osobna baza PostgreSQL `ecommerce_test`

### API Documentation

- OpenAPI 3.0
- swagger-jsdoc
- Swagger UI

### Tooling

- dotenv
- Git
- npm

---

## Architektura

```text
HTTP Request
     ↓
Middleware
     ↓
Controller
     ↓
Service
     ↓
Repository
     ↓
PostgreSQL
```

Za składanie zależności odpowiada Composition Root:

```text
src/dependency-injection.ts
```

Aktualna architektura wykorzystuje Dependency Injection do składania:

```text
Repository
   ↓
Service
   ↓
Controller
   ↓
Router
```

Jednym z celów końcowego code review jest ocena, czy obecna forma Composition Root i DI jest optymalna dla małego
e-commerce, który może ewoluować w większy system.

---

# Zrealizowane zagadnienia

## 1. Node.js + TypeScript

- konfiguracja projektu Node.js
- TypeScript
- ES Modules
- package.json
- tsx
- typowanie
- async/await
- obsługa błędów
- struktura aplikacji

## 2. Express

- Express
- routing
- middleware
- request / response
- status codes
- JSON API
- separacja routerów
- kontrolery

## 3. PostgreSQL

- PostgreSQL
- Docker
- połączenie Node.js ↔ PostgreSQL
- pg
- Pool
- PoolClient
- SQL queries
- parametryzowane zapytania
- JOIN-y
- klucze obce
- indeksy
- constraints

## 4. Database migrations

Zbudowany został system migracji bazy danych obejmujący m.in.:

- users
- products
- product variants
- orders
- order items
- roles
- permissions
- soft delete
- constraints
- indeksy
- relacje między tabelami

## 5. Users

System użytkowników:

```text
users
└── user_contact_details
```

Zaimplementowane:

- rejestracja
- pobieranie użytkownika
- aktualizacja użytkownika
- dane kontaktowe
- soft delete
- unikalny email

## 6. Authentication

Uwierzytelnianie użytkownika:

```text
POST /login
```

Wykorzystujemy:

- bcrypt
- JWT
- Authorization header
- Bearer token
- authentication middleware

Flow:

```text
login
 ↓
email + password
 ↓
bcrypt.compare()
 ↓
JWT
 ↓
Authorization: Bearer <token>
 ↓
authentication middleware
 ↓
req.user
```

## 7. Authorization

Rozdzielone zostały dwa pojęcia:

```text
Authentication
→ Kim jesteś?

Authorization
→ Co możesz zrobić?
```

System wykorzystuje RBAC + permissions:

```text
users
   ↓
user_roles
   ↓
roles
   ↓
role_permissions
   ↓
permissions
```

Przykładowe permissions:

```text
products:read
products:create
products:update
products:delete

orders:read
orders:create
orders:update

users:read
users:update
```

Role:

```text
user
admin
```

Middleware:

```text
requirePermission(...)
```

## 8. Products

System produktów:

```text
products
   ↓
product_variants
```

Produkt może posiadać wiele wariantów.

Wariant zawiera m.in.:

```text
color
size
price
quantity
```

Zaimplementowane:

- pobieranie produktów
- pobieranie produktu
- tworzenie produktu
- aktualizacja produktu
- soft delete produktu
- usuwanie wariantu
- filtrowanie usuniętych rekordów

## 9. Soft delete

Zamiast fizycznego usuwania rekordów stosujemy:

```text
is_deleted
deleted_at
```

Mechanizm wykorzystujemy dla:

- users
- products
- product variants

## 10. Orders

System zamówień:

```text
orders
   ↓
order_items
   ↓
product_variants
```

Zaimplementowane:

- pobieranie zamówień
- pobieranie pojedynczego zamówienia
- tworzenie zamówienia
- wiele produktów w jednym zamówieniu
- sprawdzanie istnienia wariantu
- sprawdzanie ilości
- kontrola właściciela zamówienia

## 11. Inventory / Stock

Stan magazynowy znajduje się bezpośrednio na wariancie:

```text
product_variants.quantity
```

Przy utworzeniu zamówienia:

```text
quantity -= ordered quantity
```

Sprawdzamy:

```text
requested quantity <= available quantity
```

Jeżeli ilość jest niewystarczająca:

```text
409 Conflict
```

## 12. Transactions

Tworzenie zamówienia wykorzystuje transakcję PostgreSQL:

```text
BEGIN
 ↓
sprawdzenie danych
 ↓
sprawdzenie stocku
 ↓
utworzenie order
 ↓
utworzenie order_items
 ↓
zmniejszenie stocku
 ↓
COMMIT
```

W przypadku błędu:

```text
ROLLBACK
```

oraz zawsze:

```text
client.release()
```

## 13. Dependency Injection

Zależności są składane w:

```text
src/dependency-injection.ts
```

Flow:

```text
Repository
   ↓
Service
   ↓
Controller
   ↓
Router
```

Pozwala to m.in. na:

- łatwiejsze testowanie
- mockowanie zależności
- wymianę implementacji
- kontrolowanie architektury

Końcowy refactor / code review obejmuje również ocenę granic Composition Root oraz sposobu udostępniania zależności
pomiędzy middleware, routerami i pozostałymi warstwami.

## 14. Unit tests

Testujemy m.in.:

- Services
- Repository interactions
- mockowanie PoolClient
- transakcje
- commit
- rollback
- release

## 15. API tests

Wykorzystujemy:

```text
Jest
+
Supertest
```

Testujemy:

- authentication
- users API
- products API
- orders API
- status codes
- response body
- błędne requesty
- brak tokena
- niepoprawny token
- brak zasobu
- brak uprawnień
- stock
- ownership
- izolację testowej bazy danych

Testy wykorzystują osobną bazę PostgreSQL:

```text
ecommerce_test
```

Konfiguracja środowiska testowego znajduje się w:

```text
.env.test
```

Baza testowa jest całkowicie oddzielona od bazy developerskiej:

```text
Development
    ↓
ecommerce

Tests
    ↓
ecommerce_test
```

Przed uruchomieniem testów baza testowa jest resetowana i wypełniana deterministycznymi danymi.

Dzięki temu:

- testy nigdy nie modyfikują bazy developerskiej
- każdy test run korzysta ze znanego stanu danych
- dane testowe są deterministyczne
- API tests mogą korzystać z prawdziwego PostgreSQL
- testy nie pozostawiają danych w bazie developerskiej

Aktualny stan:

```text
Test Suites: 8 passed
Tests:       112 passed
Snapshots:   0 total
```

## 16. Testowanie przypadków brzegowych

Testujemy również przypadki błędne:

```text
brak Authorization header
niepoprawny JWT
nieistniejący user
nieistniejący product
nieistniejący variant
pusta lista items
quantity = 0
quantity < 0
quantity większe niż stock
dostęp do cudzego orderu
```

---

## 17. Error handling / Error cleanup

Zaimplementowano centralną obsługę błędów Express.

Zaimplementowane:

- centralna obsługa błędów Express
- własna klasa AppError
- własne klasy błędów aplikacyjnych
- next (error)
- rozdzielenie błędów biznesowych od technicznych
- poprawne status codes
- usunięcie powtarzającego się error handlingu
- bezpieczne komunikaty dla klienta
- obsługa nieoczekiwanych błędów
- cleanup po błędach
- poprawne ROLLBACK
- poprawne zwalnianie PoolClient

Błędy aplikacyjne wykorzystują odpowiednie statusy HTTP, m.in.:

```text
404 Not Found
409 Conflict
```

Nieoczekiwane błędy są zwracane klientowi jako:

```text
500 Internal Server Error
```

bez ujawniania szczegółów implementacji.

---

## 18. API Security

Zaimplementowane zostało podstawowe security hardening API.

### Security headers

Wykorzystujemy:

```text
Helmet
```

Helmet dodaje podstawowe security headers do odpowiedzi HTTP.

### CORS

API posiada konfigurację CORS:

```text
cors
```

Aktualnie API pozwala na żądania cross-origin.

### Rate limiting

Endpoint logowania posiada ograniczenie liczby prób:

```text
POST /login
```

Konfiguracja:

```text
10 requests
/
15 minutes
```

Po przekroczeniu limitu API zwraca:

```text
429 Too Many Requests
```

### JWT security

JWT został dodatkowo zabezpieczony poprzez:

- jawne określenie algorytmu HS256
- wymagany JWT_SECRET
- issuer
- audience
- expiration time

Token:

```text
expiresIn: 1h
```

### Password security

Hasła użytkowników są hashowane przy użyciu:

```text
bcrypt
```

Przy rejestracji używany jest odpowiedni koszt hashowania.

### Input validation

Endpointy posiadają walidację danych wejściowych.

Walidowane są m.in.:

- wymagane pola
- typy danych
- wartości liczbowe
- quantity
- dane produktów
- dane zamówień
- dane użytkowników

### SQL Injection

Zapytania PostgreSQL wykorzystują parametryzowane wartości:

```text
$1
$2
$3
```

Dzięki temu dane użytkownika nie są bezpośrednio składane w SQL.

### Mass assignment

Dane przyjmowane przez API są jawnie mapowane na pola obsługiwane przez aplikację.

Nie przekazujemy bezpośrednio całego req.body do warstwy bazy danych.

### Sensitive data

API nie zwraca w odpowiedziach:

```text
password_hash
```

Wrażliwe dane nie są również umieszczane w komunikatach błędów.

### Request size limits

JSON request body posiada ograniczenie:

```text
1 MB
```

Konfiguracja:

```ts
express.json({limit: "1mb"})
```

Przekroczenie limitu zwraca:

```text
413 Payload Too Large
```

z bezpiecznym komunikatem:

```json
{
  "message": "Request body too large"
}
```

### Dependency security audit

Zależności projektu zostały sprawdzone:

```bash
npm audit
```

Aktualny wynik:

```text
found 0 vulnerabilities
```

---

## 19. Logging — bonus

Podstawowe logowanie requestów istnieje w aplikacji.

Obecny logger zapisuje m.in.:

```text
GET /products 200 12ms
```

Rozbudowane logging zostało świadomie potraktowane jako **bonus**, a nie wymagany element podstawowej architektury.

Potencjalne rozszerzenia na przyszłość:

- logging błędów
- poziomy logowania
- strukturalne logi
- correlation/request ID
- centralne logowanie
- zasady dotyczące danych, których nie należy logować

Nie ma potrzeby wprowadzać rozbudowanego systemu logowania dla obecnej skali projektu, chyba że code review wykaże
konkretną potrzebę.

---

## 20. API Documentation

API zostało udokumentowane przy użyciu:

```text
OpenAPI 3.0
+
swagger-jsdoc
+
Swagger UI
```

Swagger UI dostępny jest pod:

```text
/api-docs
```

Dokumentacja obejmuje:

- endpointy Users
- endpointy Products
- endpointy Orders
- Authentication
- parametry path
- request bodies
- response codes
- wymagania dotyczące autoryzacji
- tagowanie endpointów

Endpointy są grupowane w Swagger UI według obszarów:

```text
Users
Products
Orders
Authentication
```

---

# 21. Final refactor / Code review

Ten etap nie jest kolejną funkcjonalnością API.

Jest to pełny przegląd projektu pod kątem jakości obecnej architektury oraz jej zdolności do dalszej ewolucji.

Główne kryterium:

> Czy jest to dobrze zaprojektowany mały e-commerce, który może rosnąć bez konieczności przepisywania podstaw
> architektury?

Code review powinien ocenić m.in.:

- Architecture
- Code quality
- Separation of responsibilities
- Dependency Injection
- Composition Root
- Controllers
- Services
- Repositories
- Middleware
- Database
- Transactions
- Error handling
- Tests
- Security
- API
- Performance
- Scalability
- Maintainability
- Production readiness

### Technical debt

Technical debt musi być analizowany osobno.

W review należy rozróżniać:

```text
OK
↓
zostawić

Do poprawy teraz
↓
realna wartość / ryzyko

Technical debt
↓
obecnie działa, ale może wymagać zmiany przy rozwoju

Realny problem / ryzyko
↓
wymaga działania
```

Nie każda niedoskonałość wymaga natychmiastowego refaktoru.

Celem jest znalezienie rozsądnego balansu pomiędzy:

```text
prostota
     +
maintainability
     +
skalowalność
     +
brak overengineeringu
```

---

# 22. Production preparation

Planowane przygotowanie aplikacji do środowiska produkcyjnego:

- environment variables
- Docker
- production build
- database migrations
- graceful shutdown
- PostgreSQL connection handling
- health check
- configuration
- security
- logging
- deployment considerations

---

# Docelowa architektura

```text
                    ┌──────────────┐
                    │    Client    │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │    Express   │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ Middleware   │
                    │ Auth         │
                    │ Permissions  │
                    │ Validation   │
                    │ Security     │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ Controller   │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │   Service    │
                    │ Business     │
                    │ Logic        │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ Repository   │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ PostgreSQL   │
                    └──────────────┘
```

Architektura celowo pozostaje stosunkowo prosta dla małego e-commerce.

Jednocześnie granice między warstwami mają umożliwiać późniejszą ewolucję systemu bez konieczności natychmiastowego
przechodzenia na mikroserwisy lub inne rozwiązania infrastrukturalne.

---

# Stan projektu

### Zrealizowane

```text
1.  Node.js + TypeScript
2.  Express
3.  PostgreSQL
4.  Database migrations
5.  Users
6.  Authentication
7.  Authorization
8.  Products
9.  Soft delete
10. Orders
11. Inventory / Stock
12. Transactions
13. Dependency Injection
14. Unit tests
15. API tests
16. Edge cases
17. Error handling / Error cleanup
18. API Security
19. Logging — bonus
20. API Documentation
```

### Aktualny stan testów

```text
Test Suites: 8 passed
Tests:       112 passed
Snapshots:   0 total
```

### Aktualny stan zależności

```text
npm audit
found 0 vulnerabilities
```

### Pozostało

```text
21. Final refactor / Code review
22. Production preparation
```

---

# Cel architektoniczny projektu

Projekt jest przeznaczony dla **małych, niskokomercyjnych sklepów e-commerce**.

Nie jest celem budowanie systemu o złożoności platform pokroju Amazon.

Celem jest natomiast stworzenie architektury, która:

- jest prosta do utrzymania,
- ma jasno określone odpowiedzialności,
- jest testowalna,
- ogranicza sprzężenie,
- pozwala rozwijać kolejne moduły,
- pozwala wymieniać implementacje,
- może obsłużyć wzrost projektu,
- nie wymaga przedwczesnego overengineeringu,
- może ewoluować wraz ze wzrostem biznesu.

Najważniejsza zasada projektu:

> **Budujemy prosty system dla małego e-commerce, ale nie budujemy go w sposób, który zamyka drogę do dalszego
rozwoju.**

## Bonus — Production & Scalability

Tematy świadomie pozostawione poza główną częścią kursu. Nie są konieczne dla małego, niskokomercyjnego sklepu na start,
ale są ważne w realnych systemach i przy dalszym skalowaniu API.

- **Production-grade logging** — structured logging, log levels, request/correlation ID, bezpieczne logowanie błędów
- **Caching** — Redis, cache-aside, TTL, invalidation, cache'owanie danych typu `GET /products` i problemy ze stale data
- **Observability** — health/readiness checks, metrics, monitoring, tracing, alerting
- **Background jobs** — kolejki, BullMQ/Redis, zadania asynchroniczne, retry i failed jobs
- **Graceful shutdown** — poprawne zamykanie HTTP server, PostgreSQL pool, Redis i obsługa `SIGTERM` / `SIGINT`
- **Production configuration** — rozdzielenie `dev/test/prod`, secrets management i bezpieczna konfiguracja środowiska
- **Database scaling** — indeksy, analiza zapytań, `EXPLAIN ANALYZE`, tuning connection pool, a później read replicas
- **API scalability** — pagination, filtering, sorting, limity, idempotency i API versioning
- **Deployment & infrastructure** — CI/CD, production Docker, reverse proxy, HTTPS/TLS, backup/restore i
  minimal/no-downtime deployment

### Part II

Druga część kursu będzie rozwijać istniejący backend w kierunku bardziej produkcyjnego i skalowalnego systemu — bez
dokładania infrastruktury tylko po to, żeby ją mieć.

**I will back :P**
