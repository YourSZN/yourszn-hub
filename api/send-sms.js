// POST /api/send-sms
// Sends an SMS via Twilio (https://twilio.com).
//
// Required env vars (set in Vercel dashboard → Settings → Environment Variables):
//   YSZN_API_SECRET       — same secret stored in client localStorage
//   TWILIO_ACCOUNT_SID    — from twilio.com console
//   TWILIO_AUTH_TOKEN     — from twilio.com console (keep secret, never expose client-side)
//   TWILIO_FROM_NUMBER    — your Twilio phone number, e.g. +61400000000
//
// Install dependency before deploying:
//   npm install twilio

const { cors, authenticate, methodCheck } = require('./_auth');

function getTwilioClient() {
  try {
    const twilio = require('twilio');
    return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  } catch (e) {
    return null;
  }
}

// Normalise AU mobile numbers to E.164 (+61XXXXXXXXX)
function normalisePhone(raw) {
  var n = (raw || '').replace(/\s+/g, '').replace(/-/g, '');
  if (n.startsWith('04')) return '+61' + n.slice(1);
  if (n.startsWith('614')) return '+' + n;
  return n; // pass through if already E.164 or unknown format
}

function sanitiseText(str, maxLen) {
  return (str || '').slice(0, maxLen || 1600).trim();
}

module.exports = async function handler(req, res) {
  if (!cors(req, res)) return;
  if (!methodCheck(req, res, ['POST'])) return;
  if (!authenticate(req, res)) return;

  const { to, body } = req.body || {};

  if (!to || !body) {
    return res.status(400).json({ error: 'Missing required fields: to, body.' });
  }

  const phone = normalisePhone(to);
  const e164Regex = /^\+[1-9]\d{7,14}$/;
  if (!e164Regex.test(phone)) {
    return res.status(400).json({ error: 'Invalid phone number. Use Australian mobile format (04XX XXX XXX).' });
  }

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM_NUMBER) {
    return res.status(500).json({ error: 'SMS service not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER in Vercel.' });
  }

  const client = getTwilioClient();
  if (!client) {
    return res.status(500).json({
      error: 'Twilio package not installed. Run: npm install twilio, then redeploy.'
    });
  }

  try {
    const message = await client.messages.create({
      from: process.env.TWILIO_FROM_NUMBER,
      to:   phone,
      body: sanitiseText(body, 1600),
    });

    return res.status(200).json({ ok: true, sid: message.sid });
  } catch (err) {
    console.error('[send-sms] Twilio error:', err);
    return res.status(502).json({ error: err.message || 'SMS send failed.' });
  }
};
