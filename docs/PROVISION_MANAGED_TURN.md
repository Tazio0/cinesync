Provisioning managed TURN (recommended production)

Options:

1) Twilio Network Traversal (recommended when you already use Twilio)
   - Create a Twilio account and a Project
   - Use Twilio Access Tokens with Network Traversal grant to obtain ICE servers for a limited duration
   - Deploy the provided server/twilio-token-server to mint tokens server-side using TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN

2) Xirsys (alternative)
   - Create an account and obtain an API key
   - Use Xirsys REST API to request short-lived TURN credentials and add them to the app via Header -> Network or the TURN modal

3) Self-hosted coturn (docker/peer-turn-docker-compose.yml)
   - Use the Docker Compose in docker/ to run coturn and peerjs-server locally or on a droplet
   - Use Terraform in infra/do/terraform to create a droplet and run provisioning user_data

Security
- Always keep TURN credentials secret. Do not commit them to the repo.
- Use environment variables or secret managers for GitHub Actions and servers.

Usage
- After obtaining credentials, open CineSync Header -> Network and paste a JSON object like:
  {"urls":"turn:turn.example.com:3478","username":"user","credential":"pass"}

Notes
- Twilio and Xirsys provide higher availability and TLS support out of the box.
- coturn requires exposing UDP/TCP ports and correct EXTERNAL-IP configuration behind NAT.
