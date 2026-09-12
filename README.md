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