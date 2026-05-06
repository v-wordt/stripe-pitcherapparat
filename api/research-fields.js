const SHARED_SECRET = process.env.SHARED_SECRET;
const GOOGLE_SHEET_ID = '1Okk8GvpMxNpAimn6Z1Dkt2lAzj3Qd8IM';
const GOOGLE_PROSPECT_PROFILE_GID = '886669856';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-valantic-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!SHARED_SECRET || req.headers['x-valantic-secret'] !== SHARED_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/export?format=csv&gid=${GOOGLE_PROSPECT_PROFILE_GID}`;
  const sheetRes = await fetch(url);
  const text = await sheetRes.text();

  const grouped = {};
  const lines = text.trim().split('\n').map(l => l.split(','));
  for (let i = 1; i < lines.length; i++) {
    const [, info, typ] = lines[i];
    if (!info || !info.trim()) continue;
    const field = info.trim().replace(/^"(.+)"$/, '$1');
    const category = typ ? typ.trim().replace(/^"(.+)"$/, '$1') : null;
    if (!category) continue;
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(field);
  }

  return res.status(200).json({ categories: grouped });
}
