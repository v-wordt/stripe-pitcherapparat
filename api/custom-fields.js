import { put, list } from '@vercel/blob';

const SHARED_SECRET = process.env.SHARED_SECRET;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-valantic-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    try {
      const { blobs } = await list({ prefix: 'config/custom-fields.json' });
      if (blobs.length > 0) {
        const r = await fetch(blobs[0].url);
        const data = await r.json();
        return res.status(200).json(data);
      }
    } catch (err) {
      console.error('[custom-fields] GET error:', err.message);
    }
    return res.status(200).json({ categories: null });
  }

  if (req.method === 'POST') {
    if (!SHARED_SECRET || req.headers['x-valantic-secret'] !== SHARED_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { categories } = req.body || {};
    if (!categories || typeof categories !== 'object' || Array.isArray(categories)) {
      return res.status(400).json({ error: 'categories object required' });
    }
    try {
      await put('config/custom-fields.json', JSON.stringify({ categories }), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false
      });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('[custom-fields] POST error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
