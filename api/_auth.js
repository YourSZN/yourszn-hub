// Shared auth + CORS middleware for all API routes.
// Every handler calls this first. Returns true if the request is allowed to proceed.

const ALLOWED_ORIGINS = [
  'https://portal.yourszn.com.au',
  'http://localhost:3000',
  'http://localhost:5173',
];

function cors(req, res) {
  const origin = req.headers.origin || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');

  // Preflight
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return false;
  }
  return true;
}

function authenticate(req, res) {
  const secret = process.env.YSZN_API_SECRET;
  if (!secret) {
    res.status(500).json({ error: 'API not configured (missing YSZN_API_SECRET).' });
    return false;
  }

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token || token !== secret) {
    res.status(401).json({ error: 'Unauthorized.' });
    return false;
  }
  return true;
}

function methodCheck(req, res, allowed) {
  if (!allowed.includes(req.method)) {
    res.status(405).json({ error: 'Method not allowed.' });
    return false;
  }
  return true;
}

module.exports = { cors, authenticate, methodCheck };
