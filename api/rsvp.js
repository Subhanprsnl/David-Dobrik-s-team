// Vercel serverless function: POST /api/rsvp
// Validates an RSVP and forwards it to the RSVP system (Rumor Studio) set in RSVP_FORWARD_URL.
// Without RSVP_FORWARD_URL it answers 503 so RSVPs are never silently lost.

const RULES = {
  name: (v) => typeof v === 'string' && v.trim().length > 1,
  phone: (v) => typeof v === 'string' && v.replace(/\D/g, '').length >= 10,
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST.' });
  }
  const body = readBody(req);
  if (!body) return res.status(400).json({ error: 'Send the RSVP as JSON.' });

  // Honeypot: real people never fill the hidden "website" field.
  if (body.website) return res.status(200).json({ ok: true });

  const invalid = Object.keys(RULES).filter((k) => !RULES[k](body[k]));
  if (invalid.length) return res.status(400).json({ error: `Check these fields: ${invalid.join(', ')}.`, fields: invalid });

  const forwardUrl = process.env.RSVP_FORWARD_URL;
  if (!forwardUrl) return res.status(503).json({ error: "RSVPs aren't connected yet." });

  const payload = {
    eventCode: process.env.RUMOR_EVENT_CODE || '926326',
    name: body.name.trim(),
    email: body.email.trim().toLowerCase(),
    phone: body.phone.trim(),
    instagram: '@' + body.instagram.trim().replace(/^@/, ''),
    concept: typeof body.concept === 'string' ? body.concept.slice(0, 40) : null,
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
    if (!upstream.ok) {
      console.error('RSVP forward failed', upstream.status, await upstream.text().catch(() => ''));
      return res.status(502).json({ error: "We couldn't save your RSVP." });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('RSVP forward error', err);
    return res.status(502).json({ error: "We couldn't save your RSVP." });
  }
}
