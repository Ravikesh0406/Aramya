# ARAMYA — Fix Tracker (7 phases)

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

## Phase 3 — Portable database (before any public link)
- [ ] Decision: Turso vs Postgres (default: Turso)
- [ ] DB provider abstraction, env wiring, migration of 5 tables
- [ ] Acceptance: redeploy keeps all data

## Phase 4 — Complete the money loop
- [ ] Monthly (₹4,500) payable, plan-aware PayButton
- [ ] Refund policy decision: auto (Razorpay Refunds API) vs manual ledger
- [ ] `refund.processed` webhook handling
- [ ] Acceptance: cancel-after-pay leaves a refund record, never silent loss

## Phase 5 — Notifications
- [ ] 5A: 30s poll + header bell badge with open-request count
- [ ] 5B: SMS on nearby request (vendor account required)

## Phase 6 — Safety rails ✅ DONE
- [x] Rate-limit login/signup (10/min/IP), bookings + pay-order (per-user)
- [x] Min-8 password enforced server-side (verified present in signup route)
- [x] X-Requested-With coverage audited — all POST routes have it
- [x] Smoke test: 12 rapid signups → 10×201 then 429s with Retry-After

## Phase 7 — UX/SEO polish
- [ ] Dashboard skeletons, empty states
- [ ] `sitemap.ts` + `robots.ts`, OG images
