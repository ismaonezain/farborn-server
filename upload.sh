#!/bin/bash
TOKEN="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"
REPO="ismaonezain/farborn-server"
BASE="https://api.github.com/repos/$REPO/contents"

upload_file() {
  local filepath="$1"
  local filename="$2"
  local content=$(base64 -w 0 "$filepath" 2>/dev/null || base64 "$filepath" | tr -d '\n')
  local sha=""
  
  local existing=$(curl -s -H "Authorization: token $TOKEN" "$BASE/$filename")
  sha=$(echo "$existing" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('sha',''))" 2>/dev/null)
  
  local payload="{\"message\":\"update $filename\",\"content\":\"$content\""
  if [ -n "$sha" ]; then
    payload="$payload,\"sha\":\"$sha\""
  fi
  payload="$payload}"
  
  local result=$(curl -s -X PUT -H "Authorization: token $TOKEN" -H "Content-Type: application/json" "$BASE/$filename" -d "$payload")
  echo "$filename: $(echo "$result" | python -c "import sys,json; d=json.load(sys.stdin); print('OK' if d.get('content') else d.get('message','ERR'))" 2>/dev/null || echo 'SKIP')"
}

upload_file "src/index.js" "src/index.js"
upload_file "src/auth.js" "src/auth.js"
upload_file "src/db.js" "src/db.js"
upload_file "src/economy.js" "src/economy.js"
upload_file "package.json" "package.json"
upload_file ".gitignore" ".gitignore"
upload_file ".env.example" ".env.example"

echo "DONE"
