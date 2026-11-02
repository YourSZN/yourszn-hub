// POST /api/client-submission
// Revised photos for a client's Online Colour Analysis, from the portal home page.
// Needs the portal session (Authorization: Bearer …) from /api/client-auth; the
// submission is always the signed-in client's own latest one (found by email),
// never one named by the browser.
//
//   { action: 'revised', photos: [{ path, name, type }] }
//     -> records photos the browser has already uploaded into the private
//        'online-clients-photos' bucket under <submissionId>/revised_…, and
//        stamps revised_photos_at so staff see them.
//
// Required env vars: SUPABASE_SERVICE_ROLE_KEY, COLOUR_SESSION_SECRET

const { SUPABASE_URL, cors, sb } = require('./_colour');
const { portalSession, latestSubmission } = require('./_portal');

const BUCKET = 'online-clients-photos';
const MAX_PHOTOS = 20;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const clean = (v, max) => String(v == null ? '' : v).trim().slice(0, max || 200);

module.exports = async function handler(req, res) {
  if (!cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const who = await portalSession(req, res);
  if (!who) return;
  const body = req.body || {};

  try {
    if (body.action !== 'revised') return res.status(400).json({ error: 'Unknown action.' });

    const sub = await latestSubmission(who.email);
    if (!sub) return res.status(404).json({ error: 'We couldn\'t find your questionnaire. Please contact YourSZN.' });

    const prefix = sub.id + '/revised_';
    const photos = (Array.isArray(body.photos) ? body.photos : []).slice(0, MAX_PHOTOS);
    const rows = [];
    for (const p of photos) {
      const path = clean(p && p.path, 300);
      const type = clean(p && p.type, 60);
      if (path.indexOf(prefix) !== 0 || path.indexOf('..') !== -1) return res.status(400).json({ error: 'Invalid photo.' });
      if (!ALLOWED_TYPES.includes(type)) return res.status(400).json({ error: 'Photos must be JPG, PNG or WEBP.' });
      rows.push({
        submission_id: sub.id,
        // Same URL shape the staff hub already reads; the bucket itself is private.
        file_url: SUPABASE_URL + '/storage/v1/object/public/' + BUCKET + '/' + path,
        file_name: clean(p.name, 200), file_type: type,
        is_revised: true, revised_at: new Date().toISOString(), slot_number: null, slot_label: null,
      });
    }
    if (!rows.length) return res.status(400).json({ error: 'No photos received.' });

    await sb('/rest/v1/szn_photos', { method: 'POST', body: rows, headers: { Prefer: 'return=minimal' } });
    await sb('/rest/v1/szn_submissions?id=eq.' + sub.id, { method: 'PATCH', body: { revised_photos_at: new Date().toISOString() }, headers: { Prefer: 'return=minimal' } });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[client-submission]', err && err.message);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
