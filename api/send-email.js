// POST /api/send-email
// Sends a transactional email via Resend (https://resend.com).
//
// Required env vars (set in Vercel dashboard → Settings → Environment Variables):
//   YSZN_API_SECRET   — long random string, also stored in client localStorage
//   RESEND_API_KEY    — from resend.com → API Keys
//   EMAIL_FROM        — e.g. "YourSZN <hello@yourszn.com.au>"
//
// Install dependency before deploying:
//   npm install resend

const { cors, authenticate, methodCheck } = require('./_auth');

// Resend SDK — loaded lazily so missing dep gives a clear error
function getResend() {
  try {
    const { Resend } = require('resend');
    return new Resend(process.env.RESEND_API_KEY);
  } catch (e) {
    return null;
  }
}

// Very light sanitisation — strips angle-bracket injection from address fields.
function sanitiseEmail(str) {
  return (str || '').replace(/[<>]/g, '').trim();
}
function sanitiseText(str, maxLen) {
  return (str || '').slice(0, maxLen || 5000).trim();
}

module.exports = async function handler(req, res) {
  if (!cors(req, res)) return;
  if (!methodCheck(req, res, ['POST'])) return;
  if (!authenticate(req, res)) return;

  const { to, subject, body } = req.body || {};

  // Input validation
  if (!to || !body) {
    return res.status(400).json({ error: 'Missing required fields: to, body.' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitiseEmail(to))) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }
  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'Email service not configured (missing RESEND_API_KEY).' });
  }

  const resend = getResend();
  if (!resend) {
    return res.status(500).json({
      error: 'Resend package not installed. Run: npm install resend, then redeploy.'
    });
  }

  const from = process.env.EMAIL_FROM || 'YourSZN <hello@yourszn.com.au>';

  try {
    const { data, error } = await resend.emails.send({
      from,
      to:      sanitiseEmail(to),
      subject: sanitiseText(subject || '(no subject)', 200),
      // Plain-text body wrapped in minimal HTML for email client compatibility
      html: `<div style="font-family:Georgia,serif;font-size:15px;line-height:1.7;color:#1C1712;max-width:560px;margin:0 auto;padding:32px 24px">`
           + sanitiseText(body, 5000).replace(/\n/g, '<br>')
           + `</div>`,
      text: sanitiseText(body, 5000),
    });

    if (error) {
      console.error('[send-email] Resend error:', error);
      return res.status(502).json({ error: error.message || 'Email send failed.' });
    }

    return res.status(200).json({ ok: true, id: data?.id });
  } catch (err) {
    console.error('[send-email] Unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
};
