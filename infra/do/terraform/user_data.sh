#!/bin/bash
set -e
# Provisioning script for droplet: installs docker, docker-compose, clones repo and runs stack

apt-get update && apt-get install -y git curl apt-transport-https ca-certificates gnupg lsb-release

# Install Docker
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io
fi

# Install docker-compose plugin if not present
if ! docker compose version >/dev/null 2>&1; then
  apt-get install -y docker-compose-plugin
fi

# Run as non-root: clone repo into /opt/cinesync
cd /opt || exit 1
if [ ! -d cinesync ]; then
  git clone https://github.com/Tazio0/cinesync.git cinesync || true
fi
cd cinesync || exit 1

# Start docker stack (assumes docker/peer-turn-docker-compose.yml exists)
if [ -f docker/peer-turn-docker-compose.yml ]; then
  docker compose -f docker/peer-turn-docker-compose.yml pull || true
  docker compose -f docker/peer-turn-docker-compose.yml up -d
fi

# Optionally start token server if present
if [ -d server/twilio-token-server ]; then
  cd server/twilio-token-server
  if [ ! -d node_modules ]; then
    npm install --production
  fi
  NODE_ENV=production PORT=3001 node index.js &
fi

# Keep script idempotent and exit
exit 0
