# ARAMYA

A location-based **trainer marketplace** for fitness and wellness. Trainers create
profiles, set their own prices within sanity bounds, publish when they are available,
and customers discover, compare and book them — in person at home or online.

- Customers search by area, specialization, price, experience and availability, then
  send a **targeted booking request** to the trainer of their choice.
- Trainers set their own prices (no commission, nothing added on top) and accept or
  decline requests. Payment for sessions is arranged directly with the trainer.
- Trainer listing is free by default; an optional listing subscription can be switched
  on (`LISTING_FEE_REQUIRED`).

## Stack

- Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind v4
- PostgreSQL via the `pg` driver — no ORM, raw parameterised SQL
- Vitest for tests; migrations are versioned SQL files in `migrations/`
- Razorpay (MOCK mode when keys are absent) for listing subscriptions

## Getting started

```bash
npm install
cp .env.example .env.local       # edit if needed
docker compose up -d             # local PostgreSQL
npm run db:migrate               # create/upgrade the schema
npm run db:seed                  # optional: fake sample trainers
npm run dev
```

Open <http://localhost:3000>.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest (requires `DATABASE_URL_TEST`) |
| `npm run db:migrate` | Apply pending SQL migrations |
| `npm run db:import` | One-time import from a legacy SQLite database |
| `npm run db:seed` | Insert clearly-fake sample trainers (dev databases only) |

## Project layout

```
migrations/             versioned SQL migrations (0001 = base schema, 0002 = marketplace)
scripts/                db migrate/import/seed, smoke test
src/app/                App Router pages + route handlers
  api/                  JSON endpoints (bookings, trainer workspace, admin)
  trainers/             public search + profile pages
  trainer/              trainer dashboard + onboarding
  admin/                admin console
src/lib/server/         data layer: db, store, trainers, search, booking, pricing,
                        subscriptions, reviews, reports, storage, admin, rate-limit
src/lib/                shared client code, models, validation
src/components/         UI components (Design System v1.3)
tests/                  Vitest suites (Postgres test database)
docs/ENVIRONMENT.md     every environment variable
```

## Testing

Tests that touch the database use a **separate** Postgres database:

```bash
createdb aramya_test || docker exec aramya-postgres psql -U aramya -d postgres -c "CREATE DATABASE aramya_test"
export DATABASE_URL_TEST=postgres://aramya:aramya@localhost:5432/aramya_test
npm test
```

The suite refuses to run if `DATABASE_URL_TEST` is unset or does not point at a
`*_test` database.

## Data and privacy

- Trainer home coordinates are private; the public profile shows only city/locality and
  a coarse distance computed server-side.
- Public trainer payloads go through an explicit allow-list (no contact, coordinates,
  meeting links, certification documents or verification notes).
- Certification documents live in private storage and are served only to the owning
  trainer or an admin.
