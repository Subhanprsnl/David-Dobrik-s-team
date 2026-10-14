// Vercel serverless function: POST /api/rsvp
// Two steps, forwarded to Rumor's RSVP service set in RSVP_FORWARD_URL:
//   {action:"start",  firstName, lastName, phone, email, instagram}        -> Rumor texts the guest a code
//   {action:"verify", firstName, lastName, phone, email, instagram, code}  -> Rumor checks the code and saves the RSVP
// Without RSVP_FORWARD_URL it answers 503 so RSVPs are never silently lost.

const RULES = {
  firstName: (v) => typeof v === 'string' && v.trim().length > 0 && v.length <= 60,
  lastName: (v) => typeof v === 'string' && v.trim().length > 0 && v.length <= 60,
  phone: (v) => typeof v === 'string' && /^\d{10,15}$/.test(v.replace(/\D/g, '')),
  email: (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
  instagram: (v) => typeof v === 'string' && /^@?[A-Za-z0-9._]{1,30}$/.test(v.trim()),
};

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  return null;
}

// US numbers without a country code get +1; anything else keeps its digits with a +.
function e164(phone) {
  const d = phone.replace(/\D/g, '');
  return d.length === 10 ? `+1${d}` : `+${d}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST.' });
  }
  const body = readBody(req);
  if (!body) return res.status(400).json({ error: 'Send the RSVP as JSON.' });
  const action = body.action === 'verify' ? 'verify' : 'start';

  // Honeypot: real people never fill the hidden "website" field.
  if (body.website) return res.status(200).json({ ok: true, verified: true });

  const invalid = Object.keys(RULES).filter((k) => !RULES[k](body[k]));
  if (action === 'verify' && !(typeof body.code === 'string' && /^\d{4,6}$/.test(body.code))) invalid.push('code');
  if (invalid.length) return res.status(400).json({ error: `Check these fields: ${invalid.join(', ')}.`, fields: invalid });

  const forwardUrl = process.env.RSVP_FORWARD_URL;
  if (!forwardUrl) return res.status(503).json({ error: "RSVPs aren't connected yet." });

  const payload = {
    action,
    eventCode: process.env.RUMOR_EVENT_CODE || '926326',
    firstName: body.firstName.trim(),
    lastName: body.lastName.trim(),
    email: body.email.trim().toLowerCase(),
    phone: e164(body.phone),
    instagram: '@' + body.instagram.trim().replace(/^@/, ''),
    smsConsent: true,
    ...(action === 'verify' ? { code: body.code } : {}),
    submittedAt: new Date().toISOString(),
  };

  try {
    const upstream = await fetch(forwardUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(process.env.RSVP_FORWARD_TOKEN ? { authorization: `Bearer ${process.env.RSVP_FORWARD_TOKEN}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (action === 'verify' && [400, 401, 422].includes(upstream.status)) {
      return res.status(400).json({ error: "That code didn't work. Check the text and try again.", code: 'bad_code' });
    }
    if (upstream.status === 429) return res.status(429).json({ error: 'Too many tries. Wait a minute.' });
    if (!upstream.ok) {
      console.error('RSVP forward failed', action, upstream.status, await upstream.text().catch(() => ''));
      return res.status(502).json({ error: action === 'start' ? "We couldn't text you a code." : "We couldn't save your RSVP." });
    }
    return res.status(200).json({ ok: true, verified: action === 'verify' });
  } catch (err) {
    console.error('RSVP forward error', action, err);
    return res.status(502).json({ error: "We couldn't reach Rumor." });
  }
}
