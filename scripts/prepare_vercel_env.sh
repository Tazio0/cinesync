#!/bin/bash
# Helper to prepare Vercel env vars for CineSync. Does NOT upload secrets for you.
# Usage: ./scripts/prepare_vercel_env.sh <TURN_HOST> <TURN_USER> <TURN_PASS> [PEERJS_HOST]

TURN_HOST=${1:-your-turn-host.example.com}
TURN_USER=${2:-turnuser}
TURN_PASS=${3:-turnpass}
PEERJS_HOST=${4:-peer.your-domain.example.com}

cat <<EOF
Copy the following JSON value into Vercel project settings as VITE_ICE_SERVERS (Environment Variable, Build & Production):

$(jq -n --arg urls "turn:${TURN_HOST}:3478" --arg user "$TURN_USER" --arg pass "$TURN_PASS" '[{urls:$urls, username:$user, credential:$pass}]')

Then set these variables:

VITE_PEERJS_HOST=${PEERJS_HOST}
VITE_PEERJS_PORT=9000
VITE_PEERJS_PATH=/
VITE_PEERJS_SECURE=true

To set via Vercel CLI (if you have Vercel CLI and are logged in):

vercel env add VITE_ICE_SERVERS production    # paste the JSON when prompted
vercel env add VITE_PEERJS_HOST production    # ${PEERJS_HOST}
vercel env add VITE_PEERJS_PORT production    # 9000
vercel env add VITE_PEERJS_PATH production    # /
vercel env add VITE_PEERJS_SECURE production  # true

After adding, trigger a redeploy from Vercel dashboard or run:

vercel --prod --confirm

Notes:
- Do NOT commit credentials to git. Use Vercel UI or CLI to add env vars.
- If you self-host coturn, ensure firewall allows 3478 UDP/TCP and 5349 TLS and coturn's external-ip is configured.
EOF
