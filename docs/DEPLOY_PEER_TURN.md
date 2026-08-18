Self-host PeerJS signaling + Coturn (TURN) with Docker Compose

This repository includes a convenience docker/peer-turn-docker-compose.yml that brings up a minimal PeerServer and coturn TURN relay for testing.

Quick start (local testing):

1. Install Docker and Docker Compose.
2. From the project root:

```bash
cd docker
docker compose up -d
```

3. Configure the app to use your TURN server:
   - In the app header click "Network" and paste a JSON object like:
     {"urls":"turn:YOUR_HOST:3478","username":"turnuser","credential":"turnpass"}
   - Or add the same JSON to localStorage key `cinesync_custom_turn`.

Production notes:
- Use a properly configured coturn with TLS (ports 5349) and external IP configured.
- Use strong credentials and rotate them regularly.
- For scale and reliability, provision a dedicated TURN provider (Twilio, Xirsys, or your own coturn fleet) and a stable Peer signaling server (peerjs-server) behind TLS.

Security: do not commit production TURN credentials to the repo. Use environment variables or secret management.
