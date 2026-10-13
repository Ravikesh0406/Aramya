# ARAMYA — Round 3: Marketplace

Progress is also tracked in **`phases.md`** (what is built, what is left, and what needs
an owner decision).

Positioning: ARAMYA is now a **location-based trainer marketplace**. Trainers create
profiles, set their own prices within sanity bounds, publish availability, and customers
discover, compare and book them — in person or online.

## M0 — Audit and plan
- [x] Read the codebase and Next.js 16 docs (`node_modules/next/dist/docs/`)
- [x] List every file that referenced fixed pricing, `trainer_name` or SQLite-specific SQL
- [x] Write the plan and record deviations from the brief
- [x] Baseline before changes: `npm run lint` (pass), `npm run build` (pass), no test script existed

## M1 — Postgres data layer
- [x] `pg` pool driver with `DATABASE_URL`, SSL option, shared across dev hot reloads
- [x] Versioned migrations (`migrations/0001_init.sql`, `0002_marketplace.sql`) + `schema_migrations` runner
- [x] `prepare().get/all/run`, `exec` adapter and a real `transaction(fn)` helper
- [x] `scripts/migrate-sqlite-to-postgres.ts` (idempotent, row-count verified, unmatched-name report)
- [x] `docker-compose.yml` with local Postgres
- [x] Smoke test: signup → open booking → accept → full lifecycle on Postgres

## M2 — Marketplace schema, trainer identity, storage
- [x] Marketplace tables (profiles, offerings, availability, areas, certifications, categories,
      pricing limits, subscription plans/subscriptions/payments, reports, reviews, area interest)
- [x] `trainer_profiles` created atomically at signup with unique `trainer_code` + `slug`
- [x] `bookings` re-keyed to `trainer_id` (+ snapshot columns, `request_kind`), `trainer_name` backfill
- [x] Categories seeded (10), pricing limits seeded (₹200–₹5,000 per 60 min placeholder)
- [x] `src/lib/server/storage.ts` — local disk driver + S3-compatible driver, MIME + magic-byte validation
- [x] `scripts/seed-dev-trainers.ts` (fake sample trainers, refuses non-local databases)

## M3 — Onboarding and dashboard
- [x] `/trainer/onboarding` multi-step (basics, expertise, services & prices, availability,
      location & areas, credentials, review & submit), saved after each step
- [x] Price bounds + Zoom link validation per offering
- [x] `/trainer` dashboard: requests, offerings, availability, areas, subscription, verification status
- [x] Login gate: unsubmitted trainers are redirected to onboarding; request handling is locked

## M4 — Discovery
- [x] `/trainers` search + filters (category, price, experience, format, weekday, window, rating, sort)
- [x] In-person first with the online fallback and the "not in your area yet" notice
- [x] `/trainers/[slug]` public profile with allow-listed fields only
- [x] Category pages list trainers; sitemap includes listed trainers

## M5 — Booking
- [x] Targeted requests with availability fit, clash checks and a price snapshot from the DB
- [x] Accept / decline / 24h expire transitions
- [x] Duplicate-submit protection (client + server + partial unique index)
- [x] Zoom link revealed only to that booking's customer and trainer, only when `Confirmed`
- [x] `BOOKING_PAYMENTS_ENABLED` handling (payment arranged directly with the trainer)

## M6 — Admin, trust and subscriptions
- [x] `/admin` application queue, verify/reject with reason, suspend/reactivate
- [x] Certification review (documents served privately, admin or owner only)
- [x] Category management, pricing-limit management, subscription plan management + subscribers
- [x] Profile reports with resolve/dismiss/suspend

## M7 — Copy, navigation and docs
- [x] Marketplace wording in header, footer, homepage, how-it-works, services, plans, for-trainers
- [x] `/plans` rewritten as "How pricing works"; `/for-trainers` rewritten with no earnings claims
- [x] Design System v1.3 note; new README; `docs/ENVIRONMENT.md`

## M8 — Verification
- [x] `npm run lint` — 0 errors
- [x] `DATABASE_URL_TEST=... npm test` — 46 tests passing
- [x] `npm run build` — passing
- [x] `bash scripts/smoke-test.sh` — 13-step marketplace smoke test passing
