# ARAMYA environment variables

All secrets stay out of git (`.env*` is gitignored). Set these in `.env.local`
for dev or in your hosting provider for production.

## Database (Phase 3)

| Variable | Required | Effect |
|---|---|---|
| `TURSO_DATABASE_URL` | No | When set (e.g. `libsql://…-….turso.io`), the app uses Turso. When unset, it uses the local SQLite file at `.aramya-data/db.sqlite`. |
| `TURSO_AUTH_TOKEN` | With Turso | Auth token from `turso db tokens create`. |

Moving existing local data to Turso:

```bash
TURSO_DATABASE_URL="libsql://…" TURSO_AUTH_TOKEN="…" npm run db:migrate-to-turso
```

## Payments (Razorpay gateway)

| Variable | Required | Effect |
|---|---|---|
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | No | Without these the gateway runs in MOCK mode (full flow, no real money). |
| `RAZORPAY_WEBHOOK_SECRET` | With live keys | Verifies `/api/payments/webhook` signatures. |
| `TRAINER_SHARE_BPS` | No | Trainer share in basis points, default `7000` (70%). |
| `RAZORPAYX_ACCOUNT_NUMBER` / `RAZORPAYX_FUND_ACCOUNT_ID` | No | Enables instant trainer auto-settlement; otherwise payouts stay PAYABLE for manual settlement. |

## Notifications (Phase 5B)

| Variable | Required | Effect |
|---|---|---|
| `MSG91_AUTH_KEY` | No | Enables trainer SMS on new nearby bookings. Without it, notifications are logged server-side only. |
| `MSG91_SENDER_ID` | No | SMS sender ID, default `ARAMYA`. |
| `MSG91_TEMPLATE_ID` | With MSG91 | DLT template id for the booking alert SMS (India regulatory requirement). |
