export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pageId, value, timestamp } = req.body || {};

    if (!pageId || typeof pageId !== 'string') {
      return res.status(400).json({ error: 'Missing pageId' });
    }

    if (!value || !['yes', 'no'].includes(value)) {
      return res.status(400).json({ error: 'Invalid value' });
    }

    const payload = {
      event: 'docs_feedback',
      pageId: pageId.slice(0, 64),
      value: value,
      timestamp: typeof timestamp === 'number' ? timestamp : Date.now(),
      ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown',
      ua: (req.headers['user-agent'] || '').slice(0, 200),
      referer: (req.headers['referer'] || '').slice(0, 200)
    };

    console.log(JSON.stringify(payload));

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
}