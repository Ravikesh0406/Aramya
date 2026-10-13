#!/usr/bin/env bash
# Marketplace smoke test against a running dev server.
# Usage: bash scripts/smoke-test.sh [base-url]

set -u
BASE="${1:-http://localhost:3000}"
H='X-Requested-With: XMLHttpRequest'
J='Content-Type: application/json'
TMP=$(mktemp -d)
CUST="$TMP/cust.txt"
TRAINER="$TMP/trainer.txt"
pass=0; fail=0

check() { # name expected actual
  if [ "$2" = "$3" ]; then echo "  PASS $1"; pass=$((pass+1));
  else echo "  FAIL $1 (expected $2 got $3)"; fail=$((fail+1)); fi
}
step() { # name pattern subject  -> pass when the subject contains the pattern
  if echo "$3" | grep -q "$2"; then echo "  PASS $1"; pass=$((pass+1));
  else echo "  FAIL $1"; fail=$((fail+1)); fi
}
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

echo "== 1. Customer signup =="
C_CONTACT="smoke$(date +%s)"
code_out=$(curl -s -X POST "$BASE/api/auth/signup" -H "$H" -H "$J" \
  -d "{\"name\":\"Smoke Customer\",\"contact\":\"$C_CONTACT\",\"role\":\"customer\",\"password\":\"testpass123\"}" -c "$CUST" -o /dev/null -w '%{http_code}')
check "customer signup" 201 "$code_out"

echo "== 2. Trainer signup creates a profile =="
T_CONTACT="smtk$(date +%s)"
curl -s -X POST "$BASE/api/auth/signup" -H "$H" -H "$J" \
  -d "{\"name\":\"Smoke Trainer\",\"contact\":\"$T_CONTACT\",\"role\":\"trainer\",\"password\":\"testpass123\"}" -c "$TRAINER" -o /dev/null
SLUG=$(docker exec aramya-postgres psql -U aramya -d aramya_dev -tAc "SELECT slug FROM trainer_profiles WHERE user_id=(SELECT id FROM users WHERE contact='$T_CONTACT')")
echo "  trainer slug: $SLUG"

echo "== 3. Onboarding: basics, categories, areas, availability, offering, photo, submit =="
curl -s -X PUT "$BASE/api/trainer/basics" -b "$TRAINER" -H "$H" -H "$J" -d '{"bio":"A smoke-test biography that is comfortably longer than the minimum required length.","yearsExperience":7,"languages":["English","Hindi"]}' -o /dev/null
curl -s -X PUT "$BASE/api/trainer/categories" -b "$TRAINER" -H "$H" -H "$J" -d '{"categories":[{"slug":"yoga","primary":true}]}' -o /dev/null
curl -s -X PUT "$BASE/api/trainer/areas" -b "$TRAINER" -H "$H" -H "$J" -d '{"radiusKm":10,"areas":[{"city":"New Delhi","locality":"Vasant Vihar","pinCode":"110057"}]}' -o /dev/null
curl -s -X PUT "$BASE/api/trainer/availability" -b "$TRAINER" -H "$H" -H "$J" -d '{"ranges":[{"weekday":1,"startTime":"06:00","endTime":"09:00"},{"weekday":3,"startTime":"17:00","endTime":"20:00"}]}' -o /dev/null
curl -s -X POST "$BASE/api/trainer/offerings" -b "$TRAINER" -H "$H" -H "$J" \
  -d '{"categorySlug":"yoga","format":"online","durationMin":60,"pricePaise":70000,"sessionsInPackage":1,"active":true,"meetingUrl":"https://zoom.us/j/smoke123"}' -o /dev/null
curl -s -X POST "$BASE/api/trainer/photo" -b "$TRAINER" -H "$H" -H "$J" \
  -d '{"dataUrl":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/AL+aAAAAABJRU5ErkJggg==","kind":"photo"}' -o /dev/null
SUBMIT=$(curl -s -X POST "$BASE/api/trainer/submit" -b "$TRAINER" -H "$H")
step "profile submitted for review" '"status":"submitted"' "$SUBMIT"

echo "== 4. Admin verifies the trainer =="
docker exec aramya-postgres psql -U aramya -d aramya_dev -tAc \
  "UPDATE trainer_profiles SET verification_status='verified', verified_at=now(), status='submitted' WHERE user_id=(SELECT id FROM users WHERE contact='$T_CONTACT'); UPDATE users SET verified=true WHERE contact='$T_CONTACT';" > /dev/null

echo "== 5. Search finds the trainer by PIN =="
SEARCH=$(curl -s "$BASE/api/trainers?pin=110057")
step "search finds trainer by PIN" "\"slug\":\"$SLUG\"" "$SEARCH"

echo "== 6. Targeted booking (price recomputed server-side) =="
BOOKING=$(curl -s -X POST "$BASE/api/bookings/targeted" -b "$CUST" -H "$H" -H "$J" \
  -d "{\"trainerSlug\":\"$SLUG\",\"offeringId\":\"$(docker exec aramya-postgres psql -U aramya -d aramya_dev -tAc "SELECT id FROM trainer_offerings WHERE trainer_id=(SELECT id FROM users WHERE contact='$T_CONTACT') LIMIT 1")\",\"weekdays\":[1],\"startTime\":\"07:00\",\"location\":\"\",\"pricePaise\":1}")
BOOKING_ID=$(echo "$BOOKING" | sed -n 's/.*"bookingId":"\([^"]*\)".*/\1/p')
step "targeted booking created" bookingId "$BOOKING"
SAVED_PRICE=$(docker exec aramya-postgres psql -U aramya -d aramya_dev -tAc "SELECT price_paise FROM bookings WHERE id='$BOOKING_ID'")
step "server-side price snapshot (client price ignored)" "^70000$" "$SAVED_PRICE"

echo "== 7. Duplicate submit is rejected =="
DUP=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/bookings/targeted" -b "$CUST" -H "$H" -H "$J" \
  -d "{\"trainerSlug\":\"$SLUG\",\"offeringId\":\"$(docker exec aramya-postgres psql -U aramya -d aramya_dev -tAc "SELECT id FROM trainer_offerings WHERE trainer_id=(SELECT id FROM users WHERE contact='$T_CONTACT') LIMIT 1")\",\"weekdays\":[1],\"startTime\":\"07:00\",\"location\":\"\"}")
check "duplicate request rejected" 409 "$DUP"

echo "== 8. Out-of-hours booking is rejected =="
LATE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/bookings/targeted" -b "$CUST" -H "$H" -H "$J" \
  -d "{\"trainerSlug\":\"$SLUG\",\"offeringId\":\"$(docker exec aramya-postgres psql -U aramya -d aramya_dev -tAc "SELECT id FROM trainer_offerings WHERE trainer_id=(SELECT id FROM users WHERE contact='$T_CONTACT') LIMIT 1")\",\"weekdays\":[1],\"startTime\":\"23:00\",\"location\":\"\"}")
check "outside availability rejected" 400 "$LATE"

echo "== 9. Trainer accepts; Zoom link hidden before and revealed after =="
HIDDEN=$(curl -s "$BASE/api/bookings" -b "$CUST" | grep -c "zoom.us" || true)
step "no zoom link before acceptance" "^0$" "$HIDDEN"
ACCEPT=$(curl -s -X POST "$BASE/api/bookings/$BOOKING_ID/accept" -b "$TRAINER" -H "$H")
step "trainer accepted the request" '"status":"Confirmed"' "$ACCEPT"
REVEALED=$(curl -s "$BASE/api/bookings" -b "$CUST" | grep -c "zoom.us" || true)
step "zoom link revealed to customer after acceptance" "^1$" "$REVEALED"

echo "== 10. Trainer declines another request =="
BOOKING2=$(curl -s -X POST "$BASE/api/bookings/targeted" -b "$CUST" -H "$H" -H "$J" \
  -d "{\"trainerSlug\":\"$SLUG\",\"offeringId\":\"$(docker exec aramya-postgres psql -U aramya -d aramya_dev -tAc "SELECT id FROM trainer_offerings WHERE trainer_id=(SELECT id FROM users WHERE contact='$T_CONTACT') LIMIT 1")\",\"weekdays\":[3],\"startTime\":\"18:00\",\"location\":\"\"}")
B2=$(echo "$BOOKING2" | sed -n 's/.*"bookingId":"\([^"]*\)".*/\1/p')
DECLINE=$(curl -s -X POST "$BASE/api/bookings/$B2/decline" -b "$TRAINER" -H "$H")
step "trainer declined the request" '"status":"Declined"' "$DECLINE"

echo "== 11. Complete the session and leave a review =="
docker exec aramya-postgres psql -U aramya -d aramya_dev -tAc "UPDATE bookings SET status='Completed' WHERE id='$BOOKING_ID'" > /dev/null
REVIEW=$(curl -s -X POST "$BASE/api/reviews" -b "$CUST" -H "$H" -H "$J" \
  -d "{\"bookingId\":\"$BOOKING_ID\",\"rating\":5,\"comment\":\"Clear, patient and well prepared.\"}")
step "review created" '"rating":5' "$REVIEW"
PROFILE=$(curl -s "$BASE/api/trainers/$SLUG")
step "review shown on public profile" 'Clear, patient and well prepared' "$PROFILE"

echo "== 12. Subscription purchase (MOCK gateway) =="
docker exec aramya-postgres psql -U aramya -d aramya_dev -tAc \
  "INSERT INTO subscription_plans (id,name,description,price_paise,period_days) VALUES ('smoke-plan','Smoke Listing','smoke test',50000,30) ON CONFLICT DO NOTHING" > /dev/null
SUB=$(curl -s -X POST "$BASE/api/trainer/subscription" -b "$TRAINER" -H "$H" -H "$J" -d '{"planId":"smoke-plan"}')
step "subscription activated (MOCK gateway)" 'Smoke Listing' "$SUB"

echo "== 13. Legacy open-request flow still works =="
LEGACY=$(curl -s -X POST "$BASE/api/bookings" -b "$CUST" -H "$H" -H "$J" \
  -d '{"location":"Indiranagar, Bengaluru","serviceSlug":"yoga","serviceName":"Yoga","days":["Monday","Tuesday","Wednesday","Thursday"],"time":"Morning"}')
step "legacy open request still works" '"requestKind":"open"' "$LEGACY"


echo "smoke test: $pass passed, $fail failed"
rm -rf "$TMP"
[ "$fail" -eq 0 ]
