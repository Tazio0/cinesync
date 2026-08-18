#!/bin/bash
# Lightweight monitor for peerjs + coturn docker compose stack
# Usage: ./scripts/monitor_stack.sh
set -e

COMPOSE_FILE="docker/peer-turn-docker-compose.yml"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found"
  exit 2
fi

# Show container status
docker compose -f "$COMPOSE_FILE" ps

# Show last 200 lines of logs for each service
for svc in peerjs-server coturn; do
  echo "--- Logs: $svc ---"
  docker compose -f "$COMPOSE_FILE" logs --no-color --tail 200 $svc || true
done

# Basic port checks
echo "--- Port checks ---"
for port in 9000 3478 5349; do
  ss -ltnp 2>/dev/null | grep -E ":$port\b" && echo "Port $port: LISTEN" || echo "Port $port: NOT LISTENING"
done

echo "--- coturn health (turnutils_uclient if installed) ---"
if command -v turnutils_uclient >/dev/null 2>&1; then
  echo "Running test client against localhost:3478 (UDP)..."
  turnutils_uclient -v -u test -w test -t 127.0.0.1 2>/dev/null || true
else
  echo "turnutils_uclient not installed. Install coturn utils to run deeper checks."
fi
