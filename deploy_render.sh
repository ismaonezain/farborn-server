#!/bin/bash
TOKEN="rnd_4B3veeaxmsKuahDpPnuRBo8i3Wkz"
OWNER="tea-d90s0pok1i2s73fughag"

RESULT=$(curl -s -X POST https://api.render.com/v1/services \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"owner_id\": \"$OWNER\",
    \"name\": \"farborn-server\",
    \"type\": \"web\",
    \"repo\": \"https://github.com/ismaonezain/farborn-server\",
    \"branch\": \"main\",
    \"serviceDetails\": {
      \"dockerfilePath\": \"./Dockerfile\",
      \"envVars\": [
        {\"key\": \"PORT\", \"value\": \"3001\"},
        {\"key\": \"ALLOWED_ORIGINS\", \"value\": \"https://farborn-client.vercel.app\"},
        {\"key\": \"ADMIN_KEY\", \"value\": \"farborn-prod-2026\"},
        {\"key\": \"BASE_RPC_URL\", \"value\": \"https://mainnet.base.org\"},
        {\"key\": \"FARBORN_TOKEN_ADDRESS\", \"value\": \"0x4abD609B323ce6E7C0770E86d21E76BA00209DE2\"}
      ]
    }
  }")

echo "$RESULT"
