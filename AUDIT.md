# Audit brief

Context for an external code and security audit of the `rassba` branch. Written for a reviewer who does not know the
history of the project. The project documentation (README, TODO) is in Polish; this brief is in English.

## What the project is

A REST API for a small online record shop (used and new reggae vinyl, plus t-shirts and merch). Node.js + TypeScript,
Express 5, PostgreSQL, Redis. The admin panel and the shop front end are separate applications (not in this repo).

It started as a learning project ("generic e-commerce API" on `main`) and the `rassba` branch adapts it to a real shop.
The guiding principle: keep it simple for a small shop, but open to growth. Overengineering is treated as a defect too.

## Scope

Audit the diff `main...rassba` (13 commits, ~115 files, ~15k lines added) plus the uncommitted work if any. The most
important areas:

| Area                                  | Where                                                                                                 |
|---------------------------------------|-------------------------------------------------------------------------------------------------------|
| Product model with types              | `src/product-types/`, migrations `013`, `src/services/product.service.ts`, product repositories       |
| Admin wizard (label photo → record)   | `src/services/record-lookup.service.ts`, `src/integrations/` (Claude, Discogs), `pending_uploads`     |
| Settings with encrypted secrets       | `src/settings/`, `src/services/settings.service.ts`, migration `015`                                  |
| Auth and RBAC                         | `src/middleware/`, `src/services/authorization.service.ts`, `seed_data.sql` (roles and permissions)   |
| File uploads and serving              | multer in `src/dependency-injection.ts`, `src/storage/local-storage.ts`, `/uploads` in `src/app.ts`   |
| Orders and stock                      | `src/services/order.service.ts`, `src/repositories/order/`                                            |
| Prices and exchange rate              | `src/services/exchange-rate.service.ts` (NBP API, Redis cache)                                        |
| Validation (zod)                      | `src/validators/`, `src/product-types/`                                                               |

Architecture in one line: routes → middleware → controller (zod) → service (owns connections and transactions) →
stateless repository (takes a `PoolClient`). Wiring is by hand in `src/dependency-injection.ts`. See `CLAUDE.md` for
the conventions.

## How to run

```bash
docker compose up -d     # PostgreSQL :5432, Redis :6379, Mailpit (SMTP :1025, UI :8025)
pnpm install
pnpm migrate:test        # creates ecommerce_test and applies migrations
pnpm test                # unit + API + E2E (needs Postgres, Redis and Mailpit)
pnpm test:e2e            # only the end-to-end scenarios in e2e/
npx tsc --noEmit
npx eslint .
```

Tests read only `.env.test`. Claude, Discogs and NBP are disabled or faked in tests, so no network or API keys are
needed. Swagger is at `/api-docs` when running `pnpm dev`, the raw spec at `/api-docs.json`.

## Known limitations and deliberate decisions (not findings)

Please do not report these as new findings, unless you think the decision itself is wrong or the risk is higher than
stated.

- **No payments yet.** `POST /orders` takes stock immediately, with no payment, shipping address or order status. Cart,
  Stripe, shipping, discount codes and VAT are the next stage.
- **Local disk storage.** Files live under `STORAGE_PATH` and are served publicly at `/uploads`. Moving to R2/S3 is
  planned before production.
- **Predictable media file names** (`variant-{id}-{timestamp}.ext`). Draft photos can be guessed. Accepted because all
  media are product photos meant to be public; label photos from the wizard use UUIDs.
- **JWT without refresh tokens or revocation.** Sessions simply expire (`JWT_EXPIRES_IN`).
- **No production setup yet:** no Dockerfile for the API, health check, graceful shutdown or structured logs.
- **Audio previews:** uploaded audio is stored as is (`PassThroughAudioProcessor`); ffmpeg conversion was skipped.
- **Discogs data is stored permanently** in products (CC0 data only; images and marketplace data are not imported).
  The Discogs attribution ("Data provided by Discogs." with a link) is the front end's job.
- **Redis is optional at runtime:** the app starts without it and works without cache.
- **Remaining dependency advisories** (3): `deepmerge` via Jest (dev only, no fix), `glob` and `minimatch` via
  `swagger-jsdoc` (fix needs a major upgrade). Major upgrades of `dotenv` 18 and TypeScript 7 are postponed.
- **Soft deletes:** published or ordered products and variants get `is_deleted`; only drafts without orders are
  deleted permanently, together with their files.

## Where to look closely

1. **Authorization:** every admin endpoint must require the right permission (`requirePermission`), including the
   wizard (`/products/lookup/*`), `/products/manage`, publishing and `/settings`. Check route order in `src/app.ts`
   (`/products/lookup` is mounted before `/products/:id`).
2. **Secrets in settings:** AES-256-GCM in `src/settings/secret-cipher.ts`, key from `SETTINGS_ENCRYPTION_KEY`. Secrets
   must never be returned unmasked or logged. Check the error paths too.
3. **File handling:** multer limits and type checks (extension and MIME type, but no content sniffing), path handling
   in `LocalStorage`, static serving at `/uploads` (path traversal, dotfiles, `Cross-Origin-Resource-Policy`), and the
   lifecycle of `pending_uploads` (24 h TTL, cleanup only during lookup).
4. **Stock and transactions:** stock is decremented with a conditional `UPDATE … WHERE quantity >= n` inside a
   transaction; order deletion returns stock. Look for races and missing rollbacks.
5. **External calls:** Claude and Discogs responses are parsed with zod; check timeouts, error mapping (502/503) and
   that nothing from those responses is trusted without validation. The Anthropic key and Discogs token come from
   settings (DB) or env.
6. **Validation:** zod schemas in `src/validators/` and `src/product-types/` (strict objects, JSONB attributes, preview
   links limited to http/https).
7. **SQL:** all queries should be parameterized, including the dynamic filters and sorting in
   `src/repositories/products/product/product-list-query.ts`.
8. **Cache:** product listings are cached in Redis; check that every mutation affecting the shop clears it and that
   admin views and drafts never get cached.
9. **Rate limits:** login is limited (disabled in tests), password reset requests are limited. Is that enough?

## Expected output

A list of findings with file and line, severity, a concrete failure scenario, and a suggested fix. Please separate
real bugs and security issues from style or "nice to have" suggestions.
