import Anthropic from '@anthropic-ai/sdk';
import { put, get, list } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EXPIRY_DAYS = 90;
const SHARED_SECRET = process.env.SHARED_SECRET || 'valantic2026';

// ── PROMPT ────────────────────────────────────────────────────────────────
function buildPrompt(name, role, company, context) {
  return `You are a world-class B2B sales strategist at valantic, a leading European digital consulting firm.
Your task: create a highly personalised value story for a contact.

## Contact
- Name: ${name}
- Role: ${role || 'not specified'}
- Company: ${company}
- What's going on: ${context || 'not specified'}

## valantic AI Offering

### Why valantic?
valantic combines business, data, and technology — we don't just build models, we solve business problems end-to-end. Technology-agnostic but opinionated. Deep industry and process expertise.

### The 4 Building Blocks
- **PLAN — AI Strategy & Value Discovery**: CxO workshops, AI readiness, value discovery sprints, use case design. Entry door for new accounts.
- **BUILD — Data & AI Platform**: Data foundation, architecture, LLM integration, security, governance, MLOps.
- **RUN — AI Solution Delivery**: GenAI assistants, chatbots, copilots, automation, predictive AI. Managed services, recurring revenue.
- **TRANSFORM — Governance & Adoption**: Change management, AI training, organisational development.

### References
- DATEV — 40% faster month-end close (SAP + AI)
- PLM — 23% inventory reduction via AI disposition
- Siemens Energy — 60% reduction in critical incidents
- HELA — 70% reduction in manual bookings via Finance Copilot
- Rewe Digital — NPS +18 points after CX transformation
- Retail client — checkout conversion +34% after UX redesign
- Industrial client — AI roadmap with €4M identified potential
- Logistics client — document AI live in 6 weeks, 80% time saving
- valantic internal — 400+ active vally users, NPS 72

## Task
Respond ONLY with valid JSON:

{
  "headline": "Direct confident headline (max 10 words). About their situation.",
  "headline_highlight": "1-3 words from headline to highlight — exact substring",
  "tagline": "One sentence. What valantic brings to this situation. Max 20 words.",
  "situation": "3-5 sentences. Make them think 'how do they know this?' Specific pressure this role faces. Weave in a clear point of view. Human, no buzzwords.",
  "what_we_gain": [
    {
      "title": "Outcome-first title (4-6 words) — what they gain, not what we do",
      "description": "Business impact first, then briefly how. 1-2 sentences.",
      "proof": "Client name or type + specific metric."
    }
  ],
  "references": [
    { "number": "metric e.g. 40%", "description": "What was achieved. 1-2 sentences.", "client": "Client name or type" }
  ],
  "next_step": "One concrete proposal. Specific: what kind of conversation, what we'd cover, roughly when. 2-3 sentences.",
  "cta_label": "4-6 words. Action-oriented."
}

2-3 items in what_we_gain. 2-3 references closest to their world. First reference most impactful.`;
}

// ── HTML TEMPLATE ─────────────────────────────────────────────────────────
function buildHTML(data, input, contact) {
  const hl = data.headline || '';
  const hlH = data.headline_highlight || '';
  const headlineHTML = hlH && hl.includes(hlH)
    ? hl.replace(hlH, `<em>${hlH}</em>`)
    : `<em>${hl}</em>`;

  const bringHTML = (data.what_we_gain || data.what_we_bring || []).map((a, i) => `
    <div style="display:flex;gap:24px;padding:16px 0;border-bottom:1px solid rgba(0,0,0,0.07);">
      <div style="font-size:11px;font-weight:700;color:#ff4b4b;padding-top:3px;min-width:24px;">0${i+1}</div>
      <div>
        <h4 style="font-size:17px;font-weight:700;color:#100c2a;margin:0 0 4px;">${a.title}</h4>
        <p style="font-size:15px;color:#555;line-height:1.65;margin:0 0 6px;">${a.description}</p>
        <div style="font-size:13px;font-weight:600;color:#999;">→ ${a.proof}</div>
      </div>
    </div>`).join('');

  const refs = data.references || [];
  const refCards = refs.map((r, i) => `
    <div class="ref-card" data-idx="${i}" style="${i > 0 ? 'display:none;' : ''}">
      <div style="font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:12px;">Reference ${i+1} of ${refs.length}</div>
      <div style="font-size:64px;font-weight:700;line-height:1;background:linear-gradient(135deg,#ff4b4b,#ff744f);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">${r.number}</div>
      <div style="font-size:17px;color:rgba(255,255,255,0.75);line-height:1.6;margin:8px 0 6px;">${r.description}</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.3);">${r.client}</div>
    </div>`).join('');

  const dots = refs.map((_, i) =>
    `<div class="ref-dot" data-idx="${i}" style="width:${i===0?'16px':'5px'};height:5px;border-radius:${i===0?'3px':'50%'};background:${i===0?'#ff4b4b':'rgba(0,0,0,0.15)'};transition:all 0.2s;cursor:pointer;" onclick="gotoRef(${i})"></div>`
  ).join('');

  const avatar = contact.photo
    ? `<img src="${contact.photo}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;" />`
    : `<div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#ff4b4b,#ff744f);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:white;flex-shrink:0;">${contact.initials || 'VS'}</div>`;

  const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="232 216 1500 325" style="height:20px;width:auto;"><path fill="#FFFFFF" d="M1678,456.2c-7.8,14.8-24.3,23.9-43.6,23.9c-30,0-51.8-22.4-51.8-53.2s21.8-53.2,51.8-53.2c19.2,0,35.3,8.9,43.6,23.9l54-31.4c-19.3-33.1-56.2-53.6-96.8-53.6c-65.4,0-114.7,49.1-114.7,114.2S1569.8,541,1635.2,541c40.6,0,77.5-20.6,96.8-54L1678,456.2z"/><rect fill="#FFFFFF" x="1439" y="318.8" width="62" height="216.2"/><path fill="#FFFFFF" d="M1470,216.1c-20.4,0-37.6,17.2-37.6,37.6s17.2,37.6,37.6,37.6s37.6-17.2,37.6-37.6S1490.4,216.1,1470,216.1z"/><path fill="#FFFFFF" d="M1331.8,519.9c16.2,14.6,44.1,19.5,87.8,15.2v-55.9c-19.9,1.1-32.8,0.3-39.9-6.3c-3.7-3.5-5.5-8.3-5.5-14.8v-80h45.4v-59.4h-45.4v-75.9l-62,18.6v57.3H1277V378h35.2v80C1312.2,488.2,1318.4,507.8,1331.8,519.9z"/><path fill="#FFFFFF" d="M1163.4,374.6c23,0,41.7,18.7,41.7,41.7v118.6h62V402.1c0-49.4-40-89.5-89.4-89.5c-18.9,0-37.4,6-52.7,17.2l-3.3,2.4v-13.4h-62V535h62V416.3C1121.8,393.3,1140.4,374.6,1163.4,374.6z"/><path fill="#FFFFFF" d="M1029.2,534.9V318.8h-62v24.1l-3.6-4.1c-15-17.4-36.6-26.2-64.1-26.2c-27.5,0-53.4,11.7-72.8,32.9c-19.7,21.5-30.5,50.4-30.5,81.4s10.8,59.9,30.5,81.4c19.4,21.2,45.2,32.9,72.8,32.9c27.6,0,49-8.8,64.1-26.2l3.6-4.1V535L1029.2,534.9z M912.8,482.6c-32.6,0-54.5-22.4-54.5-55.8s21.9-55.8,54.5-55.8c32.6,0,54.5,22.4,54.5,55.8S945.3,482.6,912.8,482.6z"/><polygon fill="#FFFFFF" points="714.8,234.7 714.8,534.9 776.8,534.9 776.8,216.1"/><path fill="#FFFFFF" d="M684.3,534.9V318.8h-62v24.1l-3.6-4.1c-15.1-17.4-36.6-26.2-64.1-26.2c-27.5,0-53.4,11.7-72.8,32.9c-19.6,21.5-30.5,50.4-30.5,81.4s10.8,59.9,30.5,81.4c19.4,21.2,45.2,32.9,72.8,32.9c27.5,0,49-8.8,64.1-26.2l3.6-4.1V535L684.3,534.9z M567.8,482.6c-32.6,0-54.5-22.4-54.5-55.8s21.9-55.8,54.5-55.8c32.6,0,54.5,22.4,54.5,55.8S600.4,482.6,567.8,482.6z"/><polygon fill="#FFFFFF" points="395.3,318.8 348,463 300.7,318.8 232,318.8 312,534.9 384,534.9 464,318.8"/></svg>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.headline || 'valantic'} · For ${input.name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Maven+Pro:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/@phosphor-icons/web@2.1.2"></script>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Maven Pro',sans-serif;background:#f5f4f1;color:#100c2a;}
    h1 em{font-style:normal;background:linear-gradient(135deg,#ff4b4b,#ff744f);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
  </style>
</head>
<body>

<!-- NAV -->
<div style="background:#100c2a;padding:14px 48px;display:flex;justify-content:flex-end;align-items:center;">
  ${LOGO}
</div>

<!-- HERO -->
<div style="position:relative;overflow:hidden;background:#100c2a;padding:72px 48px 80px;">
  <div style="position:absolute;top:-20%;right:-8%;height:130%;pointer-events:none;opacity:0.55;mix-blend-mode:screen;">
    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1015.91 1154.31" style="height:100%;width:auto;"><defs><linearGradient id="g1" gradientUnits="userSpaceOnUse" x1="0" y1="577" x2="1016" y2="577"><stop offset="0" style="stop-color:#FF4B4B"/><stop offset="1" style="stop-color:#FF744F"/></linearGradient></defs><path fill="url(#g1)" d="M812.3,47.5C694.8-31.8,530.7,12.9,415.6,89.7C300.5,166.5,185.4,276.2,113.2,408.8C41,541.4,11.7,697.8,47.6,840.1c35.9,142.3,136.9,270.4,266.7,316.2c129.8,45.8,288.3-0.6,407.4-82.1c119.1-81.5,199-197.8,264.9-318.7c65.9-120.9,117.8-246.4,121.9-374.2C1112.6,253.5,1059.3,156.1,975,99.5C933.8,71.3,875.2,53.8,812.3,47.5z"/></svg>
  </div>
  <div style="position:relative;z-index:1;max-width:700px;">
    <div style="font-size:12px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#ff744f;margin-bottom:16px;">For ${input.name} · ${input.company}</div>
    <h1 style="font-size:clamp(30px,4.5vw,52px);font-weight:700;line-height:1.1;color:white;max-width:720px;margin-bottom:16px;">${headlineHTML}</h1>
    <p style="font-size:18px;color:rgba(255,255,255,0.6);max-width:560px;line-height:1.65;">${data.tagline || ''}</p>
  </div>
</div>

<!-- BODY -->
<div style="max-width:720px;margin:0 auto;padding:64px 48px 80px;">

  <!-- Situation -->
  <div style="margin-bottom:56px;">
    <div style="font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#ff4b4b;margin-bottom:12px;">The situation</div>
    <p style="font-size:19px;line-height:1.75;color:#2a2a2a;">${data.situation || ''}</p>
  </div>

  <!-- What you gain -->
  <div style="margin-bottom:56px;">
    <div style="font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#ff4b4b;margin-bottom:8px;">What you'll gain</div>
    ${bringHTML}
  </div>

  <!-- Reference stack -->
  ${refs.length ? `
  <div style="margin-bottom:56px;">
    <div style="font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#ff4b4b;margin-bottom:16px;">References</div>
    <div onclick="nextRef()" style="cursor:pointer;position:relative;">
      <div style="position:absolute;left:8px;right:8px;bottom:-6px;height:100%;background:rgba(16,12,42,0.55);border-radius:16px;transform:scale(0.97);"></div>
      <div style="position:absolute;left:14px;right:14px;bottom:-12px;height:100%;background:rgba(16,12,42,0.3);border-radius:16px;transform:scale(0.94);"></div>
      <div style="background:#100c2a;border-radius:16px;padding:40px;position:relative;overflow:hidden;">
        ${refCards}
        <div style="position:absolute;right:-8%;top:-15%;height:120%;pointer-events:none;opacity:0.18;mix-blend-mode:screen;">
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 838 1126" style="height:100%;width:auto;"><defs><linearGradient id="g2" gradientUnits="userSpaceOnUse" x1="0" y1="563" x2="838" y2="563"><stop offset="0" style="stop-color:#FF4B4B"/><stop offset="1" style="stop-color:#FF744F"/></linearGradient></defs><path fill="url(#g2)" d="M419,20C200,20,20,200,20,419s180,399,399,399s399-180,399-399S638,20,419,20z"/></svg>
        </div>
      </div>
    </div>
    <div style="display:flex;gap:6px;margin-top:12px;align-items:center;">
      ${dots}
      ${refs.length > 1 ? `<span style="font-size:11px;color:rgba(0,0,0,0.3);margin-left:auto;">tap to browse</span>` : ''}
    </div>
  </div>` : ''}

  <!-- Next step -->
  <div style="background:white;border:1.5px solid #e8e5f0;border-radius:16px;padding:32px;margin-bottom:56px;">
    <div style="font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#ff4b4b;margin-bottom:12px;">Proposed next step</div>
    <p style="font-size:16px;color:#555;line-height:1.7;margin-bottom:24px;">${data.next_step || ''}</p>
    <a href="mailto:${contact.email}" style="display:inline-flex;align-items:center;gap:8px;padding:13px 24px;background:linear-gradient(135deg,#ff4b4b,#ff744f);color:white;font-family:'Maven Pro',sans-serif;font-weight:700;font-size:15px;border-radius:9px;text-decoration:none;">
      <i class="ph ph-calendar-check" style="font-size:17px;"></i>
      ${data.cta_label || 'Get in touch'}
    </a>
  </div>

  <!-- Contact -->
  <div style="display:flex;align-items:center;gap:20px;padding-top:32px;border-top:1px solid rgba(0,0,0,0.08);">
    ${avatar}
    <div>
      <div style="font-size:16px;font-weight:700;color:#100c2a;">${contact.name}</div>
      <div style="font-size:13px;color:#888;margin-bottom:4px;">${contact.role}</div>
      <a href="mailto:${contact.email}" style="font-size:13px;color:#ff4b4b;text-decoration:none;font-weight:600;">${contact.email}</a>
    </div>
  </div>

</div>

<!-- FOOTER -->
<div style="text-align:center;padding:48px;background:#100c2a;">
  ${LOGO}
  <div style="font-size:12px;color:rgba(255,255,255,0.2);margin-top:12px;">Prepared by valantic · valantic.ai</div>
</div>

<script>
const refs = ${JSON.stringify(refs)};
let idx = 0;
function nextRef() {
  if (refs.length <= 1) return;
  idx = (idx + 1) % refs.length;
  gotoRef(idx);
}
function gotoRef(i) {
  idx = i;
  document.querySelectorAll('.ref-card').forEach((c, j) => c.style.display = j === i ? '' : 'none');
  document.querySelectorAll('.ref-dot').forEach((d, j) => {
    d.style.width = j === i ? '16px' : '5px';
    d.style.borderRadius = j === i ? '3px' : '50%';
    d.style.background = j === i ? '#ff4b4b' : 'rgba(0,0,0,0.15)';
  });
}
</script>
</body>
</html>`;
}

// ── HANDLER ───────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-valantic-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth
  const secret = req.headers['x-valantic-secret'];
  if (secret !== SHARED_SECRET) return res.status(401).json({ error: 'Unauthorized' });

  const { name, company, role, context, contact } = req.body || {};
  if (!name || !company) return res.status(400).json({ error: 'name and company required' });

  const contactInfo = {
    name: contact?.name || 'Maike Saager',
    role: contact?.role || 'Head of Growth Platform AI Hub, valantic',
    email: contact?.email || 'maike.saager@valantic.com',
    photo: contact?.photo || null,
    initials: (contact?.name || 'Maike Saager').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase(),
  };

  try {
    // 1. Generate story with Claude
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: buildPrompt(name, role, company, context) }],
    });

    const text = message.content.map(b => b.text || '').join('');
    const clean = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const story = JSON.parse(clean);

    // 2. Build HTML
    const html = buildHTML(story, { name, company }, contactInfo);

    // 3. Generate slug
    const prefix = `${name.split(' ')[0].toLowerCase()}-${company.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
    const slug = `${prefix}-${uuidv4().slice(0, 8)}`;

    // 4. Store in Vercel Blob
    const blob = await put(`pitches/${slug}.html`, html, {
      access: 'public',
      contentType: 'text/html; charset=utf-8',
      addRandomSuffix: false,
    });

    // 5. Save metadata index
    const meta = { slug, name, company, role, created: new Date().toISOString(), url: blob.url };
    await put(`index/${slug}.json`, JSON.stringify(meta), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    return res.status(200).json({
      url: blob.url,
      slug,
      story, // return story so frontend can show preview
    });

  } catch (err) {
    console.error('Generate error:', err);
    return res.status(500).json({ error: err.message });
  }
}
