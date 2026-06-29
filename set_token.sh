#!/bin/bash
# Run this to set Turso token on Vercel
# Usage: bash set_token.sh

read -p "Paste Turso auth token: " TOKEN
echo "$TOKEN" | npx vercel env add TURSO_AUTH_TOKEN production --yes
echo "Done! Now redeploy: npx vercel --prod --yes"
