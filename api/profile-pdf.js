import { put } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';

const SHARED_SECRET = process.env.SHARED_SECRET;

const CATEGORIES = [
  'Grundinformationen',
  'Geschäftstätigkeit',
  'Grösse und Struktur',
  'Produkte & Services',
  'Finanzierung & Wachstum',
  'Markt & Wettbewerb',
  'Technologie & Infrastructure',
  'Signale',
];

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHTML(company, profile, contact, date) {
  const categoryBlocks = CATEGORIES.map(cat => {
    const fields = profile[cat];
    if (!fields || Object.keys(fields).length === 0) return '';

    const rows = Object.entries(fields).map(([fieldName, data]) => {
      const value = data?.value || '';
      const isUnavailable = value === 'Nicht öffentlich verfügbar' || value === 'N/A' || !value;
      const isAssumption = data?.assumption === true;
      const confidence = data?.confidence || 'low';

      let valueHtml;
      if (isUnavailable) {
        valueHtml = `<span style="color:#aaa;font-style:italic;">${esc(value || 'Nicht öffentlich verfügbar')}</span>`;
      } else {
        valueHtml = esc(value);
        if (isAssumption) {
          valueHtml += ` <span style="display:inline-block;font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#ff4b4b;border:1px solid #ff4b4b;border-radius:4px;padding:1px 5px;vertical-align:middle;margin-left:4px;">Schätzung</span>`;
        }
        if (confidence === 'low' && !isAssumption) {
          valueHtml = `<span style="color:#888;">${valueHtml}</span>`;
        }
      }

      return `
        <tr>
          <td style="padding:10px 16px;font-size:13px;color:#555;font-weight:500;width:42%;border-bottom:1px solid #f0eeee;vertical-align:top;">${esc(fieldName)}</td>
          <td style="padding:10px 16px;font-size:13px;color:#100c2a;border-bottom:1px solid #f0eeee;vertical-align:top;line-height:1.55;">${valueHtml}</td>
        </tr>`;
    }).join('');

    return `
      <div style="margin-bottom:40px;break-inside:avoid;">
        <div style="font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#ff4b4b;margin-bottom:12px;">${esc(cat)}</div>
        <table style="width:100%;border-collapse:collapse;background:white;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.07);">
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }).join('');

  const initials = contact.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Prospect Profile · ${esc(company)}</title>
<link href="https://fonts.googleapis.com/css2?family=Maven+Pro:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Maven Pro', sans-serif; background: #f5f3f0; color: #100c2a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { max-width: 860px; margin: 0 auto; padding: 48px 40px 80px; }
@media print {
  @page { margin: 18mm 16mm; size: A4; }
  body { background: white; }
  .page { padding: 0; max-width: 100%; }
  .no-print { display: none !important; }
}
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:48px;padding-bottom:24px;border-bottom:2px solid #f0eeee;">
    <div>
      <div style="font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#ff4b4b;margin-bottom:8px;">Prospect Profile</div>
      <h1 style="font-size:36px;font-weight:700;line-height:1.1;background:linear-gradient(135deg,#ff4b4b,#ff744f);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">${esc(company)}</h1>
      <div style="font-size:13px;color:#888;margin-top:6px;">Erstellt am ${esc(date)} · valantic Stripe Pitcher</div>
    </div>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="232 216 1500 325" style="height:24px;width:auto;flex-shrink:0;margin-top:6px;">
      <path fill="#100C2A" d="M1678,456.2c-7.8,14.8-24.3,23.9-43.6,23.9c-30,0-51.8-22.4-51.8-53.2s21.8-53.2,51.8-53.2c19.2,0,35.3,8.9,43.6,23.9l54-31.4c-19.3-33.1-56.2-53.6-96.8-53.6c-65.4,0-114.7,49.1-114.7,114.2S1569.8,541,1635.2,541c40.6,0,77.5-20.6,96.8-54L1678,456.2z"/>
      <rect fill="#100C2A" x="1439" y="318.8" width="62" height="216.2"/>
      <path fill="#100C2A" d="M1470,216.1c-20.4,0-37.6,17.2-37.6,37.6s17.2,37.6,37.6,37.6s37.6-17.2,37.6-37.6S1490.4,216.1,1470,216.1z"/>
      <path fill="#100C2A" d="M1331.8,519.9c16.2,14.6,44.1,19.5,87.8,15.2v-55.9c-19.9,1.1-32.8,0.3-39.9-6.3c-3.7-3.5-5.5-8.3-5.5-14.8v-80h45.4v-59.4h-45.4v-75.9l-62,18.6v57.3H1277V378h35.2v80C1312.2,488.2,1318.4,507.8,1331.8,519.9z"/>
      <path fill="#100C2A" d="M1163.4,374.6c23,0,41.7,18.7,41.7,41.7v118.6h62V402.1c0-49.4-40-89.5-89.4-89.5c-18.9,0-37.4,6-52.7,17.2l-3.3,2.4v-13.4h-62V535h62V416.3C1121.8,393.3,1140.4,374.6,1163.4,374.6z"/>
      <path fill="#100C2A" d="M1029.2,534.9V318.8h-62v24.1l-3.6-4.1c-15-17.4-36.6-26.2-64.1-26.2c-27.5,0-53.4,11.7-72.8,32.9c-19.7,21.5-30.5,50.4-30.5,81.4s10.8,59.9,30.5,81.4c19.4,21.2,45.2,32.9,72.8,32.9c27.6,0,49-8.8,64.1-26.2l3.6-4.1V535L1029.2,534.9z M912.8,482.6c-32.6,0-54.5-22.4-54.5-55.8s21.9-55.8,54.5-55.8c32.6,0,54.5,22.4,54.5,55.8S945.3,482.6,912.8,482.6z"/>
      <polygon fill="#100C2A" points="714.8,234.7 714.8,534.9 776.8,534.9 776.8,216.1"/>
      <path fill="#100C2A" d="M684.3,534.9V318.8h-62v24.1l-3.6-4.1c-15.1-17.4-36.6-26.2-64.1-26.2c-27.5,0-53.4,11.7-72.8,32.9c-19.6,21.5-30.5,50.4-30.5,81.4s10.8,59.9,30.5,81.4c19.4,21.2,45.2,32.9,72.8,32.9c27.5,0,49-8.8,64.1-26.2l3.6-4.1V535L684.3,534.9z M567.8,482.6c-32.6,0-54.5-22.4-54.5-55.8s21.9-55.8,54.5-55.8c32.6,0,54.5,22.4,54.5,55.8S600.4,482.6,567.8,482.6z"/>
      <polygon fill="#100C2A" points="395.3,318.8 348,463 300.7,318.8 232,318.8 312,534.9 384,534.9 464,318.8"/>
    </svg>
  </div>

  <!-- Category blocks -->
  ${categoryBlocks}

  <!-- Contact footer -->
  <div style="margin-top:48px;padding-top:24px;border-top:1px solid #f0eeee;display:flex;align-items:center;gap:16px;">
    <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#ff4b4b,#ff744f);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:white;flex-shrink:0;">${esc(initials)}</div>
    <div>
      <div style="font-size:14px;font-weight:700;color:#100c2a;">${esc(contact.name)}</div>
      <div style="font-size:12px;color:#888;">${esc(contact.role)}</div>
      <div style="font-size:12px;color:#ff4b4b;">${esc(contact.email)}</div>
    </div>
  </div>

  <!-- Print button (hidden when printing) -->
  <div class="no-print" style="margin-top:32px;text-align:center;">
    <button onclick="window.print()" style="padding:12px 28px;background:linear-gradient(135deg,#ff4b4b,#ff744f);color:white;border:none;border-radius:10px;font-family:'Maven Pro',sans-serif;font-size:14px;font-weight:700;cursor:pointer;">Als PDF drucken</button>
  </div>

</div>
</body>
</html>`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-valantic-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!SHARED_SECRET || req.headers['x-valantic-secret'] !== SHARED_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { company, profile, contact } = req.body || {};
  if (!company || !profile) return res.status(400).json({ error: 'company and profile required' });

  const contactInfo = {
    name: contact?.name || 'valantic',
    role: contact?.role || '',
    email: contact?.email || '',
  };

  const date = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const slug = `profile-${company.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${uuidv4().slice(0, 8)}`;
  const html = buildHTML(company, profile, contactInfo, date);

  const blob = await put(`profiles/${slug}.html`, html, {
    access: 'public',
    contentType: 'text/html; charset=utf-8',
    addRandomSuffix: false,
  });

  return res.status(200).json({ url: blob.url, slug });
}
