# Node.js Backend Course — E-commerce API

## Uruchomienie projektu

### Wymagania

- Node.js
- pnpm
- Docker
- Docker Compose

### Instalacja

```bash
pnpm install
```

### Uruchomienie infrastruktury

Projekt wymaga PostgreSQL oraz Redis. Uruchom je przez Docker Compose:

```bash
docker compose up -d
```

Sprawdzenie kontenerów:

```bash
docker compose ps
```

### Migracje bazy danych

Baza developerska:

```bash
pnpm migrate
```

Baza testowa:

```bash
pnpm migrate:test
```

### Uruchomienie API

```bash
pnpm dev
```

### Testy

Testy wymagają działającego PostgreSQL oraz Redis.

```bash
pnpm test
```

Jeżeli infrastruktura nie jest uruchomiona, testy mogą zakończyć się błędem połączenia z PostgreSQL lub Redis.

### Swagger

Po uruchomieniu API dokumentacja Swagger jest dostępna pod:

```text
http://localhost:3000/api-docs
```

---

## Cel kursu

Celem kursu było zbudowanie realnego backendu e-commerce w Node.js + TypeScript, zamiast nauki zagadnień w oderwaniu od
praktyki.

Projekt był rozwijany etapami na bazie jednego rzeczywistego API. Trening był prowadzony interaktywnie przez ChatGPT:
kolejne zagadnienia były dobierane do aktualnego poziomu projektu, implementowane praktycznie, testowane, a następnie
wspólnie weryfikowane i refaktoryzowane.

Nie chodziło o stworzenie sztucznego projektu „pod trening”, lecz o przejście przez rzeczywisty cykl developerski:
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
> ChatGPT pełnił w projekcie kilka różnych ról — zależnie od aktualnego etapu pracy. Czasami był inteligentną
> dokumentacją i źródłem wiedzy technicznej, pomagając wyjaśniać zagadnienia i porządkować informacje. Czasami pełnił rolę
> doradcy technicznego, pomagając analizować problemy, porównywać rozwiązania i podejmować decyzje architektoniczne. W
> innych momentach, szczególnie podczas pracy nad testami, pełnił rolę prowadzącego: przygotowywał zadania, prowadził
> przez kolejne zagadnienia i weryfikował ich praktyczne zastosowanie.
>
> Kod był rozwijany iteracyjnie, a decyzje techniczne były podejmowane na podstawie rzeczywistych problemów
> pojawiających się w projekcie. Ostateczny kod projektu jest wynikiem tej wspólnej pracy.

## Plan kursu

Kurs został podzielony na kolejne etapy. Każdy etap był realizowany na tym samym projekcie e-commerce, tak aby nowe
zagadnienia wynikały z rzeczywistych problemów aplikacji.

### Etap 1 — Fundament: Node.js + TypeScript

- Node.js
- TypeScript
- ES Modules
- Express
- konfiguracja projektu
- zmienne środowiskowe
- PostgreSQL w Dockerze
- połączenie aplikacji z bazą danych
- podstawowa struktura API
- users, products, orders
- database migrations

### Etap 2 — Database

- relacje między tabelami
- PRIMARY KEY / FOREIGN KEY
- JOIN
- indeksy
- UNIQUE
- constraints
- soft delete
- transakcje
- COMMIT / ROLLBACK
- isolation levels
- race conditions
- spójność danych
- optymalizacja zapytań

### Etap 3 — Proper Backend

- controllers
- services
- repositories
- Repository Pattern
- interfejsy repository
- Dependency Injection
- Composition Root
- validation
- error handling
- własne błędy aplikacyjne
- authentication
- JWT
- authorization
- RBAC
- permissions
- security hardening
- testy jednostkowe i API

### Etap 4 — Performance

- pagination
- N+1 problem
- query optimization
- indeksy
- analiza zapytań
- caching
- Redis
- ograniczanie niepotrzebnych zapytań do bazy

### Etap 5 — Code Review i refaktoryzacja

- pełny audyt architektury
- separation of responsibilities
- analiza Dependency Injection
- Composition Root
- kontrola granic warstw
- analiza technical debt
- bezpieczeństwo
- jakość kodu
- test coverage i jakość testów
- izolacja testowej bazy danych
- database indexes
- request limits
- API documentation
- production readiness

Etap audytu został zakończony. W ramach audytu uporządkowano m.in. konfigurację JWT, walidację, normalizację danych
wejściowych, login logs, indeksy kluczy obcych, migracje oraz drobne elementy projektu.

### Etap 6 — Production Preparation

- production configuration
- environment variables
- Docker
- production build
- database migrations w środowisku produkcyjnym
- graceful shutdown
- PostgreSQL connection handling
- health checks
- security configuration
- logging
- deployment considerations

### Etap 7 — Cart → Checkout → Payment → Order

Rozszerzenie obecnego API o rzeczywisty przepływ zakupowy:

```text
Cart
 ↓
Checkout
 ↓
Payment
 ↓
Order
 ↓
Webhook
 ↓
Order status
```

Zakres:

- cart
- cart items
- checkout
- adres dostawy
- shipping
- payment
- integracja Stripe
- payment status
- webhooki Stripe
- idempotency
- order creation po poprawnej płatności
- aktualizacja statusu zamówienia
- obsługa błędów płatności
- ochrona przed podwójnym przetworzeniem płatności

### Etap 8 — Dalszy rozwój e-commerce

Kolejne elementy będą dodawane tylko wtedy, gdy wynikną z realnych potrzeb projektu:

- rozszerzenie modelu produktów
- inventory / stock reservations
- shipping workflow
- refund / cancellation
- order lifecycle
- dalsza optymalizacja wydajności
- caching
- background jobs
- observability
- dalsze security hardening

Celem nie jest implementowanie wszystkich możliwych funkcji e-commerce, lecz stopniowe rozwijanie systemu bez
niepotrzebnego overengineeringu.

---

# Final refactor / Code review

Ten etap nie jest kolejną funkcjonalnością API.

Jest to pełny przegląd projektu pod kątem jakości obecnej architektury oraz jej zdolności do dalszej ewolucji.

Główne kryterium:

> Czy jest to dobrze zaprojektowany mały e-commerce, który może rosnąć bez konieczności przepisywania podstaw
> architektury?

Code review obejmował m.in.:

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

### Wyniki audytu

Audyt został zakończony.

Poprawiono i zweryfikowano m.in.:

- konfigurację JWT
- walidację danych
- normalizację email
- login logs oraz IP/User-Agent
- indeksy kluczy obcych
- migracje
- request body limits
- drobne elementy organizacji projektu

Dodatkowo:

```text
TypeScript: bez błędów
Test Suites: 8 passed
Tests: 112 passed
npm audit: 0 vulnerabilities
```

---

# Production preparation

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
21. Final refactor / Code review
```

### Następne etapy

```text
22. Production preparation
23. Cart → Checkout → Payment → Order
24. Dalszy rozwój e-commerce
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
