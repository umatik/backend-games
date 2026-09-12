# Node.js Backend Course — E-commerce API

## Cel kursu

Celem kursu jest zbudowanie realnego backendu e-commerce w Node.js + TypeScript, zamiast nauki zagadnień w oderwaniu od
praktyki.

Projekt rozwijany jest etapami, a każde nowe zagadnienie jest dokładane do istniejącej aplikacji.

Główny nacisk:

- praktyczne rozumienie backendu
- architektura aplikacji
- PostgreSQL
- REST API
- uwierzytelnianie i autoryzacja
- transakcje i spójność danych
- testy
- bezpieczeństwo
- przygotowanie aplikacji do produkcji

> **Historia i ewolucja kursu**
>
> Historia commitów Git dokumentuje rzeczywisty rozwój projektu w trakcie kursu, jego kolejne etapy oraz czas trwania
> nauki.
> Kurs jest realizowany systematycznie, dzień po dniu, w rzeczywistym cyklu developerskim — wraz z implementacją,
> testowaniem, poprawkami, refaktoryzacją i podejmowaniem decyzji technicznych.
>
> Historia commitów odpowiada kolejnym etapom opisanym w README. Poszczególne commity mogą jednak przedstawiać zupełnie
> różne podejścia, eksperymenty lub zmiany implementacyjne. Ostateczna logika i architektura projektu są zgodne z
> aktualnym opisem kursu w README.

## Stack technologiczny

- Node.js
- TypeScript
- Express
- PostgreSQL
- Docker
- pg
- JWT
- bcrypt
- Jest
- Supertest
- ts-jest
- dotenv
- Git

---

## Architektura

```text
HTTP Request
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

Aktualny stan:

```text
Test Suites: 5 passed
Tests:       88 passed
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

# Następne zagadnienia

## 17. Error handling / Error cleanup

Następny etap kursu:

- centralna obsługa błędów Express
- własne klasy błędów
- next (error)
- rozdzielenie błędów biznesowych od technicznych
- poprawne status codes
- usunięcie powtarzającego się error handlingu
- bezpieczne komunikaty dla klienta
- obsługa nieoczekiwanych błędów
- cleanup po błędach
- poprawne ROLLBACK
- poprawne zwalnianie PoolClient

## 18. API Security

- security headers
- CORS
- rate limiting
- JWT security
- password security
- input validation
- SQL injection
- mass assignment
- sensitive data
- odpowiednie status codes
- security hardening

## 19. Logging

- logging requestów
- logging błędów
- poziomy logowania
- strukturalne logi
- correlation/request ID
- co logować
- czego nie logować

## 20. API Documentation

- OpenAPI
- Swagger
- dokumentowanie endpointów
- request schemas
- response schemas
- authentication
- error responses

## 21. Final refactor / Code review

Przegląd całego projektu:

- Architecture
- Code quality
- Naming
- Dependencies
- Database
- Transactions
- Error handling
- Tests
- Security
- Performance

## 22. Production preparation

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

---

# Stan kursu

**Zrealizowane:** 1–16

**Aktualny etap:** 17. Error handling / Error cleanup

Projekt przeszedł od prostego REST API do backendu z:

- warstwową architekturą
- PostgreSQL
- migracjami
- JWT
- bcrypt
- RBAC
- permissions
- transakcjami
- soft delete
- kontrolą stocku
- ownership
- unit tests
- API tests

Docelowo projekt ma być kompletnym przykładem backendu e-commerce przygotowanego z myślą o środowisku produkcyjnym.
