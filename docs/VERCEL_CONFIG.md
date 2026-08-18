Vercel deployment configuration for CineSync

Set the following environment variables in your Vercel project (Project Settings → Environment Variables) before deploying:

- VITE_ICE_SERVERS
  - Value: JSON array or JSON object describing ICE servers.
  - Example (single TURN server):
    [{"urls":"turn:your-host.example.com:3478","username":"turnuser","credential":"turnpass"}]
  - Example (multiple):
    [{"urls":"turn:turn1.example.com:3478","username":"u1","credential":"p1"},{"urls":"turn:turn2.example.com:3478?transport=tcp","username":"u2","credential":"p2"}]

- VITE_PEERJS_HOST
  - Value: hostname or IP where a PeerJS signaling server is reachable (e.g. peer.cinesync.example.com)

- VITE_PEERJS_PORT (optional, default: 443)
- VITE_PEERJS_PATH (optional, default: /)
- VITE_PEERJS_SECURE (optional, "true" or "false" — default true)

Notes
- Do NOT commit secrets into the repository. Use the Vercel UI to add sensitive credentials.
- If you self-host coturn on a droplet, make sure firewall rules allow ports 3478 (UDP/TCP) and 5349 (TLS) and that coturn's `external-ip` is set to the droplet's public IP.
- After setting env vars, redeploy Vercel. The app will pick up VITE_ env vars at build time.
- For development / testing, use the Network modal in the app to paste local TURN JSON; it is stored locally in the browser and applied immediately.

Troubleshooting
- If users still fail to connect across networks, ensure TURN is reachable from client networks (use `turnutils_uclient` or WebRTC test pages). Check coturn logs for auth/port errors.
- If signaling fails, make sure VITE_PEERJS_HOST points to a reachable PeerJS server and that websockets are allowed through any network firewalls.
