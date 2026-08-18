import express from 'express';
import cors from 'cors';
import twilio from 'twilio';

const app = express();
app.use(cors());
app.use(express.json());

// Expects TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in env
// Returns temporary ICE servers via Twilio Network Traversal API
app.get('/token', async (req, res) => {
  try {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) return res.status(500).json({ error: 'TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN not configured' });

    // Using Twilio REST client to fetch TURN credentials via Network Traversal
    const client = twilio(sid, token);

    // Twilio's Network Traversal token creation varies by SDK - here we call the REST endpoint
    const response = await client.request({
      method: 'POST',
      uri: `https://api.twilio.com/2010-04-01/Accounts/${sid}/Tokens.json`,
    }).catch(() => null);

    // Fall back: many Twilio setups require generating an Access Token server-side (Programmable Video)
    // For simple TURN credentials, users typically use Twilio's Network Traversal service (provide account SID & token)

    if (response && response._body) {
      return res.json(response._body);
    }

    // If the REST route above doesn't return, send guidance
    return res.status(501).json({ error: 'Could not fetch TURN from Twilio automatically. Use Twilio SDK to generate Access Tokens or configure TURN via the app header.' });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Twilio token server listening on ${port}`));
