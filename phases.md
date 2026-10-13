# ARAMYA — Build Phases & Progress Tracker

**Status legend:** ✅ done & verified · 🟡 built, needs review · ⬜ not started · 🚫 blocked / needs a decision

Last updated: Round 3 (marketplace) — see `TODO.md` for the task-level checklist.

---

## Phase 0 — Audit & baseline ✅

- [x] Repository audit (Next.js 16 App Router, React 19, TS, Tailwind v4)
- [x] Next.js 16 docs read before writing code
- [x] Baseline: `npm run lint` pass, `npm run build` pass (no test script existed)
- [x] Plan + deviations recorded (see `TODO.md` → M0)

## Phase 1 — PostgreSQL data layer ✅

| Item | State |
|---|---|
| `pg` pool driver (`DATABASE_URL`, SSL, pool size, dev hot-reload safe) | ✅ |
| Compat adapter `prepare().get/all/run`, `exec`, `transaction(fn)` | ✅ |
| Versioned SQL migrations + `schema_migrations` runner (idempotent) | ✅ |
| `migrations/0001_init.sql` (pre-marketplace schema) | ✅ |
| `scripts/migrate-sqlite-to-postgres.ts` (row-count verified, unmatched-name report) | ✅ |
| `docker-compose.yml` for local Postgres | ✅ |
| Smoke test on Postgres: signup → open booking → accept → lifecycle | ✅ |

## Phase 2 — Marketplace schema, trainer identity, storage ✅

| Item | State |
|---|---|
| `migrations/0002_marketplace.sql` (all marketplace tables + bookings columns) | ✅ |
| `trainer_profiles` created atomically at signup (unique `trainer_code` + `slug`) | ✅ |
| `bookings.trainer_id` re-keying + `trainer_name` backfill with unmatched report | ✅ |
| Categories seeded (10 incl. the 4 original slugs) | ✅ |
| Pricing limits seeded (₹200–₹5,000 per 60 min placeholder, owner to confirm) | ✅ |
| `src/lib/server/storage.ts` — local + S3 drivers, MIME **and** magic-byte validation | ✅ |
| `scripts/seed-dev-trainers.ts` (fake trainers, refuses non-local databases) | ✅ |
| `reviews`, `profile_reports`, `area_interest` tables | ✅ |

## Phase 3 — Trainer onboarding & dashboard ✅

| Item | State |
|---|---|
| `/trainer/onboarding` 7-step flow, saved server-side after each step | ✅ |
| Price bounds enforced server-side with a UI range hint | ✅ |
| Zoom link validation (https, `zoom.us`/`*.zoom.us`, length-limited) | ✅ |
| Availability ranges (IST, 15-min steps, overlap + min-length checks) | ✅ |
| Location capture with consent line + service areas + radius | ✅ |
| Photo + certification document upload (private documents) | ✅ |
| Verification status (pending/verified/rejected with reason) in the dashboard | ✅ |
| Login gate: unsubmitted trainers → onboarding; request handling locked | ✅ |
| Subscription panel with plan purchase (MOCK gateway) and "expires in N days" | ✅ |

## Phase 4 — Discovery ✅

| Item | State |
|---|---|
| `/trainers` search with shareable URL params | ✅ |
| Filters: category, price, experience, format, weekday, time window, rating | ✅ |
| Sort: relevance / price / experience / rating | ✅ |
| In-person first (declared area **or** radius) with the online fallback | ✅ |
| "Not available in your area yet" notice with online trainers | ✅ |
| `/trainers/[slug]` public profile (allow-listed fields only) | ✅ |
| Reusable trainer card (initials on Sand, real price, rating with count) | ✅ |
| `/services/[slug]` lists trainers in that specialization | ✅ |
| Sitemap + robots include listed trainers only | ✅ |

## Phase 5 — Booking ✅

| Item | State |
|---|---|
| Targeted request: trainer → offering → days + start time → details → confirm | ✅ |
| Server-side validation: listed trainer, own active offering, availability fit | ✅ |
| Interval-based clash detection (`trainerScheduleClash`) | ✅ |
| Price snapshot from the DB (tampered client price ignored) | ✅ |
| Duplicate-submit protection (client + server + partial unique index) | ✅ |
| Accept / Decline / 24h Expire transitions | ✅ |
| `Declined` status added to types, badges and Design System §13 | ✅ |
| Targeted requests invisible to other trainers | ✅ |
| Zoom link revealed only to that booking's customer + trainer, only when `Confirmed` | ✅ |
| `BOOKING_PAYMENTS_ENABLED=false` → "payment arranged directly with your trainer" | ✅ |
| Legacy open-request flow still works (not promoted in the new UI) | ✅ |

## Phase 6 — Admin, trust & subscriptions ✅

| Item | State |
|---|---|
| `/admin` console gated by `ADMIN_CONTACTS` (no new role system) | ✅ |
| Application queue (draft/pending/verified/rejected/suspended) | ✅ |
| Verify/reject with reason, suspend/reactivate | ✅ |
| Certification documents served privately (admin or owner only) | ✅ |
| Category management (create/update/`requires_certification`) | ✅ |
| Pricing-limit management (per category or global fallback) | ✅ |
| Subscription plan management + active subscriber list | ✅ |
| Subscription purchase in MOCK mode; webhook signature verification | ✅ |
| Profile reports with resolve / dismiss / suspend | ✅ |

## Phase 7 — Copy, navigation & docs ✅

| Item | State |
|---|---|
| Header/footer/homepage/how-it-works/services rewritten to marketplace wording | ✅ |
| "Book a Trial" / "Plans" CTAs replaced with "Find a trainer" | ✅ |
| `/plans` → "How pricing works" (no invented price ranges) | ✅ |
| `/for-trainers` rewritten (own pricing/availability, no earnings claims) | ✅ |
| Design System v1.3 note (marketplace positioning, `Declined`) | ✅ |
| New `README.md`, `docs/ENVIRONMENT.md`, `.env.example` | ✅ |

## Phase 8 — Verification ✅

| Check | Result |
|---|---|
| `npm run lint` | ✅ 0 errors (5 warnings) |
| `DATABASE_URL_TEST=... npm test` | ✅ 46 tests / 5 suites passing |
| `npm run build` | ✅ passing |
| `bash scripts/smoke-test.sh` | ✅ 13-step marketplace smoke test passing |
| Admin console (stats, verify, categories, pricing limits, plans, reports) | ✅ verified live |
| Mobile/desktop widths | ⬜ no browser in this environment — manual check required |

---

## What is left

### Needs an owner decision before it can be finished
| Item | Why |
|---|---|
| Production Postgres connection string (pooled host, SSL) | Not provided; local Docker is used. |
| Production storage provider (Vercel Blob / S3 / R2) | `s3` driver exists but no bucket/credentials. |
| Import real SQLite/Turso data? | Only 1 dev user/1 dev booking exist; import script is ready. |
| Confirm pricing bounds (₹200–₹5,000 per 60 min placeholder) | Seeded placeholder, owner to confirm. |
| Listing fee amount/term (if `LISTING_FEE_REQUIRED=true`) | No plan is seeded by design. |
| GST treatment of the listing fee | Accounting decision; no invoicing built. |
| Privacy Policy update for location collection | Legal copy, outside code. |

### Built but disabled / dormant
- `BOOKING_PAYMENTS_ENABLED=true` restores Razorpay booking payments. **Note:** this
  repo had no payment/payout/refund code before Round 3, so there is nothing legacy to
  re-enable — the switch is wired and honoured in the UI, and the webhook handler routes
  subscription payments with signature verification. Enable + build the booking-payment
  flow only if the owner wants to collect session money again.
- Razorpay live keys → checkout for subscriptions (MOCK path is complete).
- MSG91 SMS (env-gated; no notifier was present in this repo, so no trainer
  notification is sent when a listing is 7 days from expiry).

### Deferred (from the brief)
- Studio sessions and group/2+ capacity bookings (v1 is one-to-one only).
- Zoom API automation (trainer pastes their own link).
- Auto-recurring subscriptions (v1 is prepaid, one period per purchase).
- Geocoding for address search (PIN/locality/city/radius only — no free-text `LIKE`).
- Multi-instance rate limiting (in-memory only).
- Calendar-date booking (weekday + start time only, matching the existing model).
- Email/SMS sending (no provider configured).
- Reviews on sessions that are `Completed` only — no follow-up after `No Show`.

### Known limitations to keep in mind
- `searchTrainers` loads all listed trainers and their aggregates, then filters in JS.
  Fine at marketplace scale; add SQL-side filtering before tens of thousands of trainers.
- Session status transitions (start/complete/no-show/confirm) are not exposed in the new
  UI; existing endpoints and data still work.
- Password reset is explicitly out of scope (R8).
