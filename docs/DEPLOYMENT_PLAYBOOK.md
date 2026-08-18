CineSync deployment playbook

Goals:
- Self-host peerjs signaling and coturn TURN for reliable cross-network WebRTC.
- Deploy frontend to Vercel with VITE_ env vars for ICE and signaling.
- Validate with smoke-test harness (Puppeteer two-peer test).

1) Prepare VPS (recommended small droplet)
- Run terraform in infra/do/terraform with your DigitalOcean token and ssh key:
  - export TF_VAR_do_token=...; terraform init; terraform apply
- After apply, note the droplet_ip output and SSH in.

2) On the droplet
- Clone repo (user_data.sh does this automatically when using terraform) or run post_setup.sh manually:
  sudo /opt/cinesync/infra/do/terraform/post_setup.sh <domain_or_ip> [email_for_certbot]
- If you provided email and domain, the script will attempt certbot to get TLS certs and put them in docker/coturn/certs.

3) Generate coturn credentials
- Locally: ./scripts/generate-coturn-config.sh yourdomain.com turnuser
- This creates docker/coturn/turnserver.conf and turnuserdb.conf and prints a sample JSON for the UI.

4) Start stack (docker compose)
- docker compose -f docker/peer-turn-docker-compose.yml up -d
- Use scripts/monitor_stack.sh to view logs and basic checks.

5) Configure Vercel
- In Project Settings → Environment Variables, set:
  - VITE_ICE_SERVERS (JSON array as in docs/VERCEL_CONFIG.md)
  - VITE_PEERJS_HOST (peerjs domain)
  - VITE_PEERJS_PORT (usually 9000)
  - VITE_PEERJS_SECURE (true/false)
- Redeploy Vercel.

6) Validation
- Open frontend URL; in header → Network verify connection type. Use the Network modal to add local TURN entries if necessary.
- Run smoke-tests workflow manually in GitHub Actions or run locally: node scripts/twopeers-test.mjs TARGET_URL=https://your-vercel-url

7) TLS & Security
- Ensure coturn listens on 5349 (TLS) and 3478 (UDP/TCP). Use strong credentials and rotate.
- Use firewall to restrict management ports and monitor logs.

8) Troubleshooting
- If peers cannot connect: check coturn logs for auth errors; ensure external-ip configured; verify ports open; check peerjs logs for signaling errors.
- If smoke tests time out, increase Puppeteer timeouts or run tests interactively to observe console logs.
