import { list } from '@vercel/blob';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { blobs } = await list({ prefix: 'index/', limit: 1000 });

    const entries = await Promise.allSettled(
      blobs.map(async b => {
        const r = await fetch(b.url);
        return r.json();
      })
    );

    const valid = entries
      .filter(e => e.status === 'fulfilled')
      .map(e => e.value)
      .filter(Boolean);

    return res.status(200).json({
      total: valid.length,
      opened: valid.filter(e => e.opens > 0).length,
      senders: [...new Set(valid.map(e => e.sender).filter(Boolean))].length,
      recent: valid
        .sort((a, b) => new Date(b.created) - new Date(a.created))
        .slice(0, 5)
        .map(e => ({
          name: e.name,
          company: e.company,
          sender: e.sender,
          created: e.created,
          opens: e.opens || 0
        }))
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
