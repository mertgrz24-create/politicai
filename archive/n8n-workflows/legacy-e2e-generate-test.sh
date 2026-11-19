#!/bin/bash
# E2E: politicai-generate akışı — tek haber için 3 varyant üretimi testi
# Kullanım: bash scripts/e2e-generate-test.sh
# Gereksinim: n8n localhost:5678'de ayakta, .env dolu (AUTH_*, VITE_CLIENT_ID)
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
BASE="${N8N_BASE:-http://localhost:5678}"

# 1) Login
TOKEN=$(curl -s -X POST "$BASE/webhook/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$AUTH_EMAIL\",\"password\":\"$AUTH_PASSWORD\"}" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
echo "1) LOGIN: OK"

# 2) Haber listesi — ilk haberi seç
NEWS_JSON=$(curl -s "$BASE/webhook/news-list" -H "Authorization: Bearer $TOKEN")
NEWS_ID=$(echo "$NEWS_JSON" | python3 -c 'import sys,json;print(json.load(sys.stdin)["news"][0]["id"])')
NEWS_TITLE=$(echo "$NEWS_JSON" | python3 -c 'import sys,json;print(json.load(sys.stdin)["news"][0]["title"][:70])')
echo "2) NEWS: seçilen: $NEWS_ID — $NEWS_TITLE"

# 3) Öncesi: mevcut draft id'leri
BEFORE=$(curl -s "$BASE/webhook/drafts?client_id=$VITE_CLIENT_ID" -H "Authorization: Bearer $TOKEN")
BEFORE_IDS=$(echo "$BEFORE" | python3 -c 'import sys,json;print(",".join(x["id"] for x in json.load(sys.stdin)["drafts"]))')
echo "3) DRAFTS ÖNCE: $(echo "$BEFORE" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)["drafts"]))') adet"

# 4) Generate tetikle
GEN=$(curl -s -X POST "$BASE/webhook/generate" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"news_id\":\"$NEWS_ID\",\"client_id\":\"$VITE_CLIENT_ID\"}")
echo "4) GENERATE yanıtı: $GEN"
JOB_ID=$(echo "$GEN" | python3 -c 'import sys,json;print(json.load(sys.stdin)["job_id"])')

# 5) Job durumunu polle (maks 60 sn)
STATUS="?"
for i in $(seq 1 30); do
  sleep 2
  ST=$(curl -s "$BASE/webhook/job-status?job_id=$JOB_ID" -H "Authorization: Bearer $TOKEN")
  STATUS=$(echo "$ST" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("status","?"))' 2>/dev/null || echo "parse_hatasi")
  echo "5) POLL $i: $STATUS"
  if [ "$STATUS" = "saved" ] || [ "$STATUS" = "failed" ]; then break; fi
done
if [ "$STATUS" = "failed" ]; then echo "JOB FAILED — ham yanıt: $ST"; fi

# 6) Sonrası: yeni draft'lar yalnızca seçilen habere mi ait?
AFTER=$(curl -s "$BASE/webhook/drafts?client_id=$VITE_CLIENT_ID" -H "Authorization: Bearer $TOKEN")
echo "$AFTER" | NEWS_ID="$NEWS_ID" BEFORE_IDS="$BEFORE_IDS" python3 -c "
import sys, json, os
before = set(filter(None, os.environ['BEFORE_IDS'].split(',')))
target = os.environ['NEWS_ID']
drafts = json.load(sys.stdin)['drafts']
new = [x for x in drafts if x['id'] not in before]
print(f'6) YENİ DRAFT: {len(new)} adet')
for x in new:
    print('   -', x.get('variant_label'), '| haber eşleşti:', x.get('news_id') == target, '|', (x.get('content') or '')[:80])
ok = len(new) == 3 and all(x.get('news_id') == target for x in new)
print('SONUÇ:', 'PASS — 3 varyant, hepsi seçilen habere ait' if ok else f'FAIL — {len(new)} yeni draft')
"
