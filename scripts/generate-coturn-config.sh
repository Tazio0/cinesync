#!/bin/bash
# Generates a sample turnserver.conf and a single long-term credential for coturn.
# Usage: ./scripts/generate-coturn-config.sh <realm> <username> <password>

REALM=${1:-example.com}
USER=${2:-turnuser}
PASS=${3:-$(openssl rand -hex 8)}
OUTDIR="./docker/coturn"
mkdir -p "$OUTDIR"

cat > "$OUTDIR/turnserver.conf" <<EOF
# Sample coturn configuration (auto-generated)
listening-port=3478
tls-listening-port=5349
listening-ip=0.0.0.0
relay-ip=0.0.0.0
external-ip=
# TLS cert paths (optional when you have certs mounted at docker/coturn/certs)
# cert=/etc/coturn/certs/fullchain.pem
# pkey=/etc/coturn/certs/privkey.pem
fingerprint
lt-cred-mech
use-auth-secret
static-auth-secret=changeme_replace_with_secure_secret
realm=$REALM
# long-term credentials file (username:password)
# will be generated next
userdb=/etc/turnuserdb.conf
no-multicast-peers
log-file=stdout
EOF

cat > "$OUTDIR/turnuserdb.conf" <<EOF
$USER:$PASS
EOF

chmod 600 "$OUTDIR/turnserver.conf" "$OUTDIR/turnuserdb.conf"

cat <<EOD
Generated coturn config in $OUTDIR
- turnserver.conf
- turnuserdb.conf (contains username:password)

Example Docker Compose snippet to mount these files:

services:
  coturn:
    image: instrumentisto/coturn:latest
    volumes:
      - ./docker/coturn/turnserver.conf:/etc/turnserver.conf:ro
      - ./docker/coturn/turnuserdb.conf:/etc/turnuserdb.conf:ro
    command: ["-n", "--log-file=stdout", "--no-cli"]

After starting coturn, configure CineSync header Network JSON like:
{"urls":"turn:YOUR_HOST:3478","username":"$USER","credential":"$PASS"}

EOD
