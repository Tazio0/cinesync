#!/bin/bash
# Run on the droplet after git clone to finalize coturn/peerjs stack
# Usage: sudo /opt/cinesync/infra/do/terraform/post_setup.sh <domain_or_ip> [email_for_certbot]

set -e
TARGET=${1:-$(curl -s http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address)}
EMAIL=${2:-}
REPO_DIR=/opt/cinesync

cd "$REPO_DIR" || exit 1

# Replace external-ip in generated turnserver.conf if present
if [ -f docker/coturn/turnserver.conf ]; then
  sed -i "s|external-ip=.*|external-ip=$TARGET|g" docker/coturn/turnserver.conf || true
fi

# If a domain and email were provided, try to obtain TLS certs with certbot (assumes DNS points to this host)
if [ -n "$EMAIL" ]; then
  apt-get update && apt-get install -y snapd
  snap install core; snap refresh core
  snap install --classic certbot
  if ! command -v certbot >/dev/null 2>&1; then
    echo "certbot not available"; exit 1
  fi

  # Stop any service on port 80 temporarily
  systemctl stop docker || true
  certbot certonly --standalone -d "$TARGET" --non-interactive --agree-tos -m "$EMAIL"
  # Prepare mounts for coturn to use certs
  mkdir -p docker/coturn/certs
  ln -sf /etc/letsencrypt/live/$TARGET/fullchain.pem docker/coturn/certs/fullchain.pem
  ln -sf /etc/letsencrypt/live/$TARGET/privkey.pem docker/coturn/certs/privkey.pem
  # Restart docker and docker-compose stack
  systemctl start docker || true
  docker compose -f docker/peer-turn-docker-compose.yml up -d --force-recreate
fi

# Finally, start docker compose if not running
docker compose -f docker/peer-turn-docker-compose.yml pull || true
docker compose -f docker/peer-turn-docker-compose.yml up -d

echo "Post-setup completed. Coturn external IP set to $TARGET."
