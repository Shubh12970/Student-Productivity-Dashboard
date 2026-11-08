#!/usr/bin/env bash
# StudyFlow API boundary/security tests - non-destructive.
# Usage: BASE=https://studyflow.2wf0w2.workers.dev TOKEN=<clerk session token> bash security-tests.sh
set -u
BASE="${BASE:-https://studyflow.2wf0w2.workers.dev}"
TOKEN="${TOKEN:-}"
pass=0; fail=0
check() { # name expected actual
  if [ "$2" = "$3" ]; then pass=$((pass+1)); echo "PASS  $1 ($3)";
  else fail=$((fail+1)); echo "FAIL  $1 - expected $2, got $3"; fi
}
code() { curl -s -o /tmp/st-body -w "%{http_code}" "$@"; }

echo "== Unauthenticated rejection =="
check "GET /api/tasks no token" 401 "$(code "$BASE/api/tasks")"
check "POST /api/tasks no token" 401 "$(code -X POST -H 'Content-Type: application/json' -d '{"title":"x"}' "$BASE/api/tasks")"
check "GET /api/reflections no token" 401 "$(code "$BASE/api/reflections")"
check "POST /api/reflections no token" 401 "$(code -X POST -H 'Content-Type: application/json' -d '{"text":"x"}' "$BASE/api/reflections")"
check "DELETE /api/reflections/x no token" 401 "$(code -X DELETE "$BASE/api/reflections/x")"
check "Garbage bearer token" 401 "$(code -H 'Authorization: Bearer not-a-jwt' "$BASE/api/reflections")"

echo "== Malformed input (unauthenticated path) =="
check "Malformed JSON body rejected (400 parse or 401 pre-auth)" "400or401" "$(code -X POST -H 'Content-Type: application/json' -d '{bad json' "$BASE/api/reflections" | sed 's/^400$/400or401/;s/^401$/400or401/')"

echo "== Oversized payload =="
python3 -c "import json;print(json.dumps({'text':'x'*200000}))" > /tmp/st-big.json
check "200KB JSON rejected (401 pre-auth or 413)" "413or401" "$(code -X POST -H 'Content-Type: application/json' -d @/tmp/st-big.json "$BASE/api/reflections" | sed 's/^401$/413or401/;s/^413$/413or401/')"

if [ -n "$TOKEN" ]; then
  AUTH=(-H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json')
  echo "== Authenticated validation =="
  check "POST reflection empty text" 400 "$(code -X POST "${AUTH[@]}" -d '{"text":"  "}' "$BASE/api/reflections")"
  check "POST reflection missing text" 400 "$(code -X POST "${AUTH[@]}" -d '{}' "$BASE/api/reflections")"
  check "POST reflection text>4000" 400 "$(code -X POST "${AUTH[@]}" -d "{\"text\":\"$(python3 -c "print('y'*5000)")\"}" "$BASE/api/reflections")"
  check "POST reflection non-string text" 400 "$(code -X POST "${AUTH[@]}" -d '{"text":123}' "$BASE/api/reflections")"
  check "POST task missing title" 400 "$(code -X POST "${AUTH[@]}" -d '{}' "$BASE/api/tasks")"
  check "PATCH task nonexistent id" 404 "$(code -X PATCH "${AUTH[@]}" -d '{"title":"x"}' "$BASE/api/tasks/does-not-exist")"
  check "DELETE reflection nonexistent id" 404 "$(code -X DELETE "${AUTH[@]}" "$BASE/api/reflections/does-not-exist")"
  check "POST reflection bad createdAt falls back" 201 "$(code -X POST "${AUTH[@]}" -d '{"text":"boundary test bad date","createdAt":"not-a-date"}' "$BASE/api/reflections")"
  badid=$(jq -r '._id' /tmp/st-body 2>/dev/null)
  echo "   created id=$badid createdAt=$(jq -r '.createdAt' /tmp/st-body 2>/dev/null)"
  check "XSS text stored as data" 201 "$(code -X POST "${AUTH[@]}" -d '{"text":"<script>alert(1)</script><img src=x onerror=alert(2)>"}' "$BASE/api/reflections")"
  xssid=$(jq -r '._id' /tmp/st-body 2>/dev/null)
  stored=$(jq -r '.text' /tmp/st-body 2>/dev/null)
  check "XSS text returned verbatim (no execution server-side)" '<script>alert(1)</script><img src=x onerror=alert(2)>' "$stored"
  check "SQL injection attempt in text" 201 "$(code -X POST "${AUTH[@]}" -d '{"text":"x'"'"'); DROP TABLE reflections;--"}' "$BASE/api/reflections")"
  sqliid=$(jq -r '._id' /tmp/st-body 2>/dev/null)
  check "reflections table still readable after SQLi attempt" 200 "$(code "${AUTH[@]}" "$BASE/api/reflections")"
  # cleanup test rows
  for id in $badid $xssid $sqliid; do [ -n "$id" ] && curl -s -X DELETE "${AUTH[@]}" "$BASE/api/reflections/$id" >/dev/null; done
  echo "   cleaned up test reflections"
else
  echo "== Authenticated tests skipped (no TOKEN) =="
fi
echo "== Result: $pass passed, $fail failed =="
exit $fail
