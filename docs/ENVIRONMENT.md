# ARAMYA — Environment & Configuration

All configuration is through environment variables. Nothing secret is committed:
`.env*` is gitignored, and `.env.example` lists every variable.

```bash
cp .env.example .env.local
```

---

## Database (PostgreSQL)

ARAMYA uses **PostgreSQL** only. There is no runtime dependency on SQLite or Turso.

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | `postgres://user:password@host:5432/aramya_dev` |
| `DATABASE_SSL` | no | `require`, `verify-ca` or `verify-full` for managed hosts. Omit for local Docker (no TLS). |
| `DATABASE_POOL_MAX` | no | Pool size, default `10`. |
| `DATABASE_URL_TEST` | tests | Must point at a **separate** `*_test` database. The suite refuses to run otherwise. |

### Local development

```bash
docker compose up -d          # Postgres 16 on localhost:5432
npm run db:migrate            # applies migrations/
npm run db:seed               # fake sample trainers (dev databases only)
npm run dev
```

### Pooling / serverless

Route handlers open short-lived queries, so the pool is deliberately small
(`DATABASE_POOL_MAX`, default 10) with a 30s idle timeout. One pool is shared per
process and reused across dev hot reloads.

If you deploy to a serverless platform, prefer a pooled connection string
(PgBouncer or your provider's pooler, e.g. Supabase/Neon `-pooler` host) and set
`DATABASE_SSL=require`. Prepared statements over PgBouncer transaction pooling are
handled by `pg` (queries are parameterised, not server-prepared).

### Importing existing SQLite data (one-time)

```bash
npm run db:import
```

Reads `.aramya-data/db.sqlite`, inserts idempotently (`ON CONFLICT DO NOTHING`),
backfills `trainer_profiles` for legacy trainer accounts, re-keys
`bookings.trainer_name` → `trainer_id` where the name matches exactly one trainer,
and prints a row-count verification plus an unmatched-rows report.

---

## Feature switches

| Variable | Default | Effect |
|---|---|---|
| `LISTING_FEE_REQUIRED` | `false` | When `true`, a lapsed listing subscription hides a trainer from discovery and blocks new requests (confirmed bookings are honoured). |
| `BOOKING_PAYMENTS_ENABLED` | `false` | When `false`, session payment happens directly between customer and trainer. Existing Razorpay booking-payment/payout/refund code is preserved but not surfaced. |

---

## Media storage

| Variable | Default | Notes |
|---|---|---|
| `STORAGE_DRIVER` | `local` | `local` or `s3` |
| `STORAGE_LOCAL_DIR` | `.aramya-uploads` | Local disk driver (gitignored) |
| `S3_BUCKET` | — | Required for the `s3` driver |
| `S3_REGION` | `auto` | Bucket region |
| `S3_ENDPOINT` | — | For S3-compatible providers (R2, MinIO, Spaces) |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | — | Credentials |
| `S3_PUBLIC_BASE_URL` | — | Public base URL if objects are served from a CDN |

Only keys are stored in Postgres, never binaries. Photos are served through
`/api/trainer-photo/<key>` and only for keys that exist on a trainer profile.
Certification documents are **private** and served only through authenticated routes
to the owning trainer or an admin.

If production storage is not configured, uploads fail loudly and the UI says so
instead of pretending to succeed.

---

## Payments (Razorpay)

MOCK mode is used when keys are absent, so subscription flows can be built and tested
end-to-end without a gateway account.

| Variable | Required | Notes |
|---|---|---|
| `RAZORPAY_KEY_ID` | for live | Order creation |
| `RAZORPAY_KEY_SECRET` | for live | Order creation + checkout signature verification |
| `RAZORPAY_WEBHOOK_SECRET` | for live | Webhook signature verification (HMAC-SHA256 of the raw body) |

Webhook URL: `https://<domain>/api/payments/webhook` — the signature is always
verified before any payload is processed.

---

## Admin console

`/admin` is gated by a contact allowlist; there is no separate role system.

| Variable | Required | Notes |
|---|---|---|
| `ADMIN_CONTACTS` | for admin | Comma-separated phone numbers or emails that may sign in to `/admin` |

---

## SMS (MSG91)

Optional; when absent, SMS notifications are skipped silently.

| Variable | Notes |
|---|---|
| `MSG91_AUTH_KEY` | API key |
| `MSG91_SENDER_ID` | Sender id |
| `MSG91_TEMPLATE_ID` | Template id |

---

## Pricing bounds (admin-managed, not env)

Price bounds live in the `pricing_limits` table (per 60 minutes, per category or
global fallback) and are edited in `/admin`. Seeded placeholder: ₹200–₹5,000 per
60 minutes. No price, subscription fee or bound is hardcoded in components or logic.
