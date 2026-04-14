import { list, put } from '@vercel/blob';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache');

  const { slug } = req.query;

  if (slug) {
    try {
      const { blobs } = await list({ prefix: `index/${slug}.json` });
      if (blobs.length > 0) {
        const r = await fetch(blobs[0].url);
        const data = await r.json();
        data.opens = (data.opens || 0) + 1;
        data.lastOpened = new Date().toISOString();
        await put(`index/${slug}.json`, JSON.stringify(data), {
          access: 'public',
          contentType: 'application/json',
          addRandomSuffix: false
        });
      }
    } catch (e) { /* silent */ }
  }

  // Return 1x1 transparent GIF
  const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  res.setHeader('Content-Type', 'image/gif');
  return res.status(200).end(gif);
}
