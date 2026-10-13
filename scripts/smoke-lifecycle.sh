#!/usr/bin/env bash
# Extended smoke test: session lifecycle, reviews and reschedule.
# Run after scripts/smoke-test.sh (needs a confirmed booking in the dev DB).

set -u
BASE="${1:-http://localhost:3000}"
H='X-Requested-With: XMLHttpRequest'
J='Content-Type: application/json'
TMP=$(mktemp -d)
CUST="$TMP/cust.txt"
TRAINER="$TMP/trainer.txt"
pass=0; fail=0

step() { if echo "$3" | grep -q "$2"; then echo "  PASS $1"; pass=$((pass+1)); else echo "  FAIL $1"; fail=$((fail+1)); fi; }

DB_PSQL() { docker exec aramya-postgres psql -U aramya -d aramya_dev -tAc "$1"; }

echo "== Setup: customer + trainer =="
C_CONTACT="life$(date +%s)"
curl -s -X POST "$BASE/api/auth/signup" -H "$H" -H "$J" \
  -d "{\"name\":\"Life Customer\",\"contact\":\"$C_CONTACT\",\"role\":\"customer\",\"password\":\"testpass123\"}" -c "$CUST" -o /dev/null
T_CONTACT="liftk$(date +%s)"
curl -s -X POST "$BASE/api/auth/signup" -H "$H" -H "$J" \
  -d "{\"name\":\"Life Trainer\",\"contact\":\"$T_CONTACT\",\"role\":\"trainer\",\"password\":\"testpass123\"}" -c "$TRAINER" -o /dev/null
TID=$(DB_PSQL "SELECT id FROM users WHERE contact='$T_CONTACT'")

curl -s -X PUT "$BASE/api/trainer/basics" -b "$TRAINER" -H "$H" -H "$J" \
  -d '{"bio":"A lifecycle smoke biography that is comfortably longer than the minimum length.","yearsExperience":6,"languages":["English"]}' -o /dev/null
curl -s -X PUT "$BASE/api/trainer/categories" -b "$TRAINER" -H "$H" -H "$J" -d '{"categories":[{"slug":"yoga","primary":true}]}' -o /dev/null
curl -s -X PUT "$BASE/api/trainer/areas" -b "$TRAINER" -H "$H" -H "$J" \
  -d '{"radiusKm":10,"areas":[{"city":"New Delhi","locality":"Vasant Vihar","pinCode":"110057"}]}' -o /dev/null
curl -s -X PUT "$BASE/api/trainer/availability" -b "$TRAINER" -H "$H" -H "$J" \
  -d '{"ranges":[{"weekday":1,"startTime":"06:00","endTime":"09:00"},{"weekday":3,"startTime":"17:00","endTime":"20:00"}]}' -o /dev/null
curl -s -X POST "$BASE/api/trainer/offerings" -b "$TRAINER" -H "$H" -H "$J" \
  -d '{"categorySlug":"yoga","format":"home_visit","durationMin":60,"pricePaise":60000,"sessionsInPackage":1,"active":true}' -o /dev/null
curl -s -X POST "$BASE/api/trainer/photo" -b "$TRAINER" -H "$H" -H "$J" \
  -d '{"dataUrl":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/AL+aAAAAABJRU5ErkJggg==","kind":"photo"}' -o /dev/null
curl -s -X POST "$BASE/api/trainer/submit" -b "$TRAINER" -H "$H" -o /dev/null
DB_PSQL "UPDATE trainer_profiles SET verification_status='verified', verified_at=now() WHERE user_id='$TID'; UPDATE users SET verified=true WHERE id='$TID';" > /dev/null
SLUG=$(DB_PSQL "SELECT slug FROM trainer_profiles WHERE user_id='$TID'")
OFFERING=$(DB_PSQL "SELECT id FROM trainer_offerings WHERE trainer_id='$TID' LIMIT 1")
echo "  trainer: $SLUG"

echo "== Book and accept =="
BOOKING=$(curl -s -X POST "$BASE/api/bookings/targeted" -b "$CUST" -H "$H" -H "$J" \
  -d "{\"trainerSlug\":\"$SLUG\",\"offeringId\":\"$OFFERING\",\"weekdays\":[1],\"startTime\":\"07:00\",\"location\":\"12 Some Street, Delhi\"}")
BID=$(echo "$BOOKING" | sed -n 's/.*"bookingId":"\([^"]*\)".*/\1/p')
step "targeted booking created" '"bookingId"' "$BOOKING"
curl -s -X POST "$BASE/api/bookings/$BID/accept" -b "$TRAINER" -H "$H" -o /dev/null
STATUS=$(DB_PSQL "SELECT status FROM bookings WHERE id='$BID'")
step "accepted by trainer" "^Confirmed$" "$STATUS"

echo "== Lifecycle: start -> complete =="
curl -s -X POST "$BASE/api/bookings/$BID/session" -b "$TRAINER" -H "$H" -H "$J" -d '{"action":"start"}' -o /dev/null
step "session started" "^In Progress$" "$(DB_PSQL "SELECT status FROM bookings WHERE id='$BID'")"
curl -s -X POST "$BASE/api/bookings/$BID/session" -b "$TRAINER" -H "$H" -H "$J" -d '{"action":"complete"}' -o /dev/null
step "session completed" "^Completed$" "$(DB_PSQL "SELECT status FROM bookings WHERE id='$BID'")"

echo "== Review =="
REVIEW=$(curl -s -X POST "$BASE/api/reviews" -b "$CUST" -H "$H" -H "$J" \
  -d "{\"bookingId\":\"$BID\",\"rating\":5,\"comment\":\"Lifecycle smoke review.\"}")
step "review created" '"rating":5' "$REVIEW"
DUP=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/reviews" -b "$CUST" -H "$H" -H "$J" \
  -d "{\"bookingId\":\"$BID\",\"rating\":3,\"comment\":\"again\"}")
step "duplicate review rejected (409)" "^409$" "$DUP"

echo "== Reschedule a fresh booking =="
BOOKING2=$(curl -s -X POST "$BASE/api/bookings/targeted" -b "$CUST" -H "$H" -H "$J" \
  -d "{\"trainerSlug\":\"$SLUG\",\"offeringId\":\"$OFFERING\",\"weekdays\":[1],\"startTime\":\"08:00\",\"location\":\"12 Some Street, Delhi\"}")
B2=$(echo "$BOOKING2" | sed -n 's/.*"bookingId":"\([^"]*\)".*/\1/p')
curl -s -X POST "$BASE/api/bookings/$B2/accept" -b "$TRAINER" -H "$H" -o /dev/null
RESCHEDULE=$(curl -s -X POST "$BASE/api/bookings/$B2/reschedule" -b "$CUST" -H "$H" -H "$J" \
  -d '{"weekdays":[3],"startTime":"19:00"}')
step "reschedule proposed" '"status":"Reschedule Requested"' "$RESCHEDULE"
OUTSIDE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/bookings/$B2/reschedule" -b "$CUST" -H "$H" -H "$J" \
  -d '{"weekdays":[1],"startTime":"23:30"}')
step "reschedule outside availability rejected (400)" "^400$" "$OUTSIDE"
curl -s -X POST "$BASE/api/bookings/$B2/reschedule/accept" -b "$TRAINER" -H "$H" -o /dev/null
step "reschedule accepted with new start time" "^19:00$" "$(DB_PSQL "SELECT start_time FROM bookings WHERE id='$B2'")"
step "end time derived from duration" "^20:00$" "$(DB_PSQL "SELECT end_time FROM bookings WHERE id='$B2'")"

echo "== Area interest =="
AREA=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/area-interest" -H "$H" -H "$J" \
  -d '{"pinCode":"110001","city":"New Delhi","contact":"life-interest@example.com","consent":true}')
step "area interest saved (201)" "^201$" "$AREA"
NOCONSENT=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/area-interest" -H "$H" -H "$J" \
  -d '{"pinCode":"110001","contact":"nope@example.com","consent":false}')
step "area interest without consent rejected (400)" "^400$" "$NOCONSENT"

echo
echo "lifecycle smoke test: $pass passed, $fail failed"
rm -rf "$TMP"
[ "$fail" -eq 0 ]
