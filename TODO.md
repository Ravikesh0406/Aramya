# ARAMYA — Fix Tracker (7 phases + round 2)

Round 1 rollout order: 1 → 2 → 6 → 3 → 4 → 5A → 7 → 5B. ✅ ALL DONE (see below)
Round 2 order: R1 → R2 → R3 → R4 → R5 → R6 → R9 → R7 → R8 → R10.

Rollout order: 1 → 2 → 6 → 3 → 4 → 5A → 7 → 5B.
After each phase: `npm run build` + curl smoke test (signup → book → accept → pay → earnings).

## Phase 1 — Accept guards + overlap check ✅ DONE
- [x] `acceptBookingWithTrainer`: only `Requested` → `Confirmed` (atomic WHERE)
- [x] Overlap guard: same trainer, shared day + clashing time → reject
- [x] Route maps failures to 404 / 409 with clear messages (who took it, clash day)
- [x] Smoke test: double-accept → 409; same-trainer same-slot → 409

## Phase 2 — Real geo-matching ✅ DONE
- [x] `ALTER TABLE bookings ADD COLUMN lat/lng` (existence-checked, backfill-safe)
- [x] BookingFlow keeps GPS coords, POST persists them
- [x] Trainer feed filtered by distance, nearest first; NULL-coord fallback
- [x] Trainer location capture on trainer dashboard (+ `distanceKm` display)
- [x] Smoke test: near sees first at 0 km, far doesn't see it, no-GPS sees all
- [x] Fixed: absent query params no longer filter around (0,0) (`Number(null)===0` trap)

## Phase 3 — Portable database ✅ DONE (Turso chosen)
- [x] Async `src/lib/server/db.ts` provider: local node:sqlite default, Turso when `TURSO_DATABASE_URL` set
- [x] store.ts + payments.ts converted; all route callers awaited
- [x] `npm run db:migrate-to-turso` one-way copy script (idempotent)
- [x] `docs/ENVIRONMENT.md` documents all env vars
- [x] Full regression smoke passed on local backend (signup→book→accept→pay→earnings→geo)

## Phase 4 — Complete the money loop ✅ DONE (auto-attempt + manual fallback)
- [x] Monthly (₹4,500) payable per booking alongside trial (plan-aware orders + paid checks)
- [x] Cancel-after-pay triggers refund: live Razorpay attempt, manual ledger fallback, never silent
- [x] `refund.processed` webhook reconciliation; refund columns (backfill-safe)
- [x] Smoke test: monthly order 201 on trial-paid booking; cancel → MANUAL refund record

## Phase 5 — Notifications ✅ DONE (5A live, 5B env-gated)
- [x] 5A: `TrainerBell` in header (open-request count, 30s poll) + trainer dashboard auto-refresh
- [x] 5B: `notifyTrainersOfBooking` via MSG91 (fire-and-forget, logged-skip without keys; needs `MSG91_AUTH_KEY` + `MSG91_TEMPLATE_ID` to send)
- [x] Smoke test: booking creation succeeds with notifier wired

---

# ROUND 2

## R1 — Session lifecycle ✅ DONE
- [x] Columns: `completed_at`, `customer_confirmed` (ALTER-guarded)
- [x] Transitions: start (Confirmed→In Progress), complete (In Progress→Completed), no-show (either party), customer confirm
- [x] Lazy auto-complete: In Progress + untouched 24h → Completed (on bookings reads)
- [x] Routes: `start`, `complete`, `noshow`, `confirm` (ownership-checked)
- [x] UI: trainer start/complete/no-show buttons; customer confirm + Past sessions section
- [x] Smoke test: full lifecycle + 401/403/409 guards all pass

## R2 — Ratings & reviews ✅ DONE
- [x] `reviews` table (one per completed booking), POST + average endpoints
- [x] Rate UI in customer dashboard; averages on trainer dashboard
- [x] Smoke test: pre-completion → 409, duplicate → 409, average 5.0/1 shown

## R3 — Org admin view ✅ DONE
- [x] `ADMIN_CONTACTS` allowlist, `/admin` page (payout queue, refund queue, overview)
- [x] `POST /api/admin/payouts/:id/settle` (admin, manual reference)
- [x] Header Ops link (fetch-gated)
- [x] Smoke test: 403 gates, overview 200, settle PAID, double-settle 409

## R4 — Trainer verification ✅ DONE
- [x] `users.verified` flag (+ home_lat/lng columns ride along, used in R5); verified/home in profile
- [x] Accept gated on VERIFIED (403 with pending-verification message) + dashboard banner
- [x] Admin flip endpoint; smoke test: unverified 403 → flip ok → accept 200

## R5 — Trainer home base ✅ DONE
- [x] `users.home_lat/home_lng`; save from trainer dashboard (+ profile refresh)
- [x] Feed defaults to home base when no live fix passed
- [x] Smoke test: Delhi base → Delhi visible, Mumbai absent, no params needed

## R6 — Cancellation window ✅ DONE
- [x] Free cancel until day-before-first-session; inside-window → MANUAL org decision (no auto-refund)
- [x] Day-granularity boundary (deterministic, no ms coin flips); UI copy per booking
- [x] Smoke test: free + MANUAL refund, inside-window + 24h MANUAL note

## R9 — Payout race hardening ✅ DONE
- [x] find-then-insert → `getOrCreateTrainerPayout` (catch UNIQUE → fetch existing) in verify + webhook
- [x] Smoke test: double-verify returns CAPTURED twice, single payout row

## R7 — Automated tests ✅ DONE
- [x] vitest harness (`npm test`), `@/` alias, 9 unit tests green
- [x] Coverage: pricing splits, geo math, rate-limit buckets

## R8 — Password reset
- [ ] Single-use token flow; SMS delivery when configured, logged in dev

## R10 — Share/PWA touches
- [ ] `opengraph-image.tsx`, `manifest.ts`, theme-color

## Phase 6 — Safety rails ✅ DONE
- [x] Rate-limit login/signup (10/min/IP), bookings + pay-order (per-user)
- [x] Min-8 password enforced server-side (verified present in signup route)
- [x] X-Requested-With coverage audited — all POST routes have it
- [x] Smoke test: 12 rapid signups → 10×201 then 429s with Retry-After

## Phase 7 — UX/SEO polish ✅ DONE
- [x] `LoadingSkeleton` in both dashboards (aria-busy, pulse)
- [x] `sitemap.xml` + `robots.txt` routes (services included)
- [x] Layout metadata already had OG/keywords/robots — left as-is
