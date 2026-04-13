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

  const firstName = input.name.split(' ')[0];
  const domain = input.company.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '') + '.com';

  const refs = data.references || [];
  const refCards = refs.map((r, i) => `
    <div class="ref-card" data-idx="${i}" style="${i > 0 ? 'display:none;' : ''}">
      <div style="font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:12px;">Reference ${i+1} of ${refs.length}</div>
      <div class="count-up" data-target="${r.number}" style="font-size:68px;font-weight:700;line-height:1;background:linear-gradient(135deg,#ff4b4b,#ff744f);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">${r.number}</div>
      <div style="font-size:17px;color:rgba(255,255,255,0.75);line-height:1.6;margin:8px 0 6px;">${r.description}</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.3);">${r.client}</div>
    </div>`).join('');

  const dots = refs.map((_, i) =>
    `<div class="ref-dot" data-idx="${i}" style="width:${i===0?'16px':'5px'};height:5px;border-radius:${i===0?'3px':'50%'};background:${i===0?'#ff4b4b':'rgba(0,0,0,0.15)'};transition:all 0.2s;cursor:pointer;" onclick="gotoRef(${i})"></div>`
  ).join('');

  const bringHTML = (data.what_we_gain || data.what_we_bring || []).map((a, i) => `
    <div class="fade-in-up" style="display:flex;gap:20px;padding:20px 0;border-bottom:1px solid rgba(0,0,0,0.06);">
      <div style="font-size:11px;font-weight:700;color:#ff4b4b;padding-top:4px;min-width:20px;letter-spacing:.05em;">0${i+1}</div>
      <div>
        <h4 style="font-size:17px;font-weight:700;color:#100c2a;margin:0 0 5px;">${a.title}</h4>
        <p style="font-size:15px;color:#555;line-height:1.65;margin:0 0 6px;">${a.description}</p>
        <div style="font-size:13px;font-weight:600;color:#bbb;display:flex;align-items:center;gap:5px;">
          <span style="color:#ff4b4b;">→</span> ${a.proof}
        </div>
      </div>
    </div>`).join('');

  const avatar = contact.photo
    ? `<img src="${contact.photo}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;flex-shrink:0;" />`
    : `<div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#ff4b4b,#ff744f);display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:700;color:white;flex-shrink:0;">${contact.initials || 'VS'}</div>`;

  const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="232 216 1500 325" style="height:22px;width:auto;"><path fill="#FFFFFF" d="M1678,456.2c-7.8,14.8-24.3,23.9-43.6,23.9c-30,0-51.8-22.4-51.8-53.2s21.8-53.2,51.8-53.2c19.2,0,35.3,8.9,43.6,23.9l54-31.4c-19.3-33.1-56.2-53.6-96.8-53.6c-65.4,0-114.7,49.1-114.7,114.2S1569.8,541,1635.2,541c40.6,0,77.5-20.6,96.8-54L1678,456.2z"/><rect fill="#FFFFFF" x="1439" y="318.8" width="62" height="216.2"/><path fill="#FFFFFF" d="M1470,216.1c-20.4,0-37.6,17.2-37.6,37.6s17.2,37.6,37.6,37.6s37.6-17.2,37.6-37.6S1490.4,216.1,1470,216.1z"/><path fill="#FFFFFF" d="M1331.8,519.9c16.2,14.6,44.1,19.5,87.8,15.2v-55.9c-19.9,1.1-32.8,0.3-39.9-6.3c-3.7-3.5-5.5-8.3-5.5-14.8v-80h45.4v-59.4h-45.4v-75.9l-62,18.6v57.3H1277V378h35.2v80C1312.2,488.2,1318.4,507.8,1331.8,519.9z"/><path fill="#FFFFFF" d="M1163.4,374.6c23,0,41.7,18.7,41.7,41.7v118.6h62V402.1c0-49.4-40-89.5-89.4-89.5c-18.9,0-37.4,6-52.7,17.2l-3.3,2.4v-13.4h-62V535h62V416.3C1121.8,393.3,1140.4,374.6,1163.4,374.6z"/><path fill="#FFFFFF" d="M1029.2,534.9V318.8h-62v24.1l-3.6-4.1c-15-17.4-36.6-26.2-64.1-26.2c-27.5,0-53.4,11.7-72.8,32.9c-19.7,21.5-30.5,50.4-30.5,81.4s10.8,59.9,30.5,81.4c19.4,21.2,45.2,32.9,72.8,32.9c27.6,0,49-8.8,64.1-26.2l3.6-4.1V535L1029.2,534.9z M912.8,482.6c-32.6,0-54.5-22.4-54.5-55.8s21.9-55.8,54.5-55.8c32.6,0,54.5,22.4,54.5,55.8S945.3,482.6,912.8,482.6z"/><polygon fill="#FFFFFF" points="714.8,234.7 714.8,534.9 776.8,534.9 776.8,216.1"/><path fill="#FFFFFF" d="M684.3,534.9V318.8h-62v24.1l-3.6-4.1c-15.1-17.4-36.6-26.2-64.1-26.2c-27.5,0-53.4,11.7-72.8,32.9c-19.6,21.5-30.5,50.4-30.5,81.4s10.8,59.9,30.5,81.4c19.4,21.2,45.2,32.9,72.8,32.9c27.5,0,49-8.8,64.1-26.2l3.6-4.1V535L684.3,534.9z M567.8,482.6c-32.6,0-54.5-22.4-54.5-55.8s21.9-55.8,54.5-55.8c32.6,0,54.5,22.4,54.5,55.8S600.4,482.6,567.8,482.6z"/><polygon fill="#FFFFFF" points="395.3,318.8 348,463 300.7,318.8 232,318.8 312,534.9 384,534.9 464,318.8"/></svg>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>For ${input.name} · valantic</title>
  <link href="https://fonts.googleapis.com/css2?family=Maven+Pro:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/@phosphor-icons/web@2.1.2"></script>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Maven Pro',sans-serif;background:#f5f4f1;color:#100c2a;overflow-x:hidden;}
    h1 em{font-style:normal;background:linear-gradient(135deg,#ff4b4b,#ff744f);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}

    /* ── Animations ── */
    @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
    @keyframes fadeIn { from{opacity:0} to{opacity:1} }
    @keyframes slideInName { from{opacity:0;transform:translateY(-12px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }

    .hero-name { animation: slideInName 0.7s cubic-bezier(.2,0,.2,1) 0.1s both; }
    .hero-headline { animation: fadeUp 0.7s cubic-bezier(.2,0,.2,1) 0.3s both; }
    .hero-tagline { animation: fadeUp 0.7s cubic-bezier(.2,0,.2,1) 0.5s both; }
    .fade-in-up { opacity:0; transform:translateY(20px); transition:opacity 0.6s ease, transform 0.6s ease; }
    .fade-in-up.visible { opacity:1; transform:translateY(0); }

    /* ── Logo strip ── */
    .company-logo { height:28px; width:auto; object-fit:contain; opacity:0.7; filter:grayscale(1); }

    /* ── CTA ── */
    .cta-primary {
      display:inline-flex; align-items:center; gap:10px;
      padding:16px 32px; background:linear-gradient(135deg,#ff4b4b,#ff744f);
      color:white; font-family:'Maven Pro',sans-serif; font-weight:700; font-size:16px;
      border-radius:12px; text-decoration:none; transition:transform 0.15s, box-shadow 0.15s;
      box-shadow: 0 4px 20px rgba(255,75,75,0.35);
    }
    .cta-primary:hover { transform:translateY(-2px); box-shadow:0 8px 30px rgba(255,75,75,0.45); }

    /* ── Sticky CTA bar (mobile) ── */
    .sticky-cta {
      display:none; position:fixed; bottom:0; left:0; right:0; z-index:99;
      background:white; border-top:1px solid #e8e5f0; padding:12px 20px;
    }
    @media(max-width:640px){
      .sticky-cta { display:block; }
      body { padding-bottom: 70px; }
    }
  </style>
</head>
<body>

<!-- NAV -->
<div style="background:#100c2a;padding:14px 48px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:50;">
  ${LOGO}
  <div style="display:flex;align-items:center;gap:12px;">
    <img src="https://logo.clearbit.com/${domain}" class="company-logo" onerror="this.style.display='none'" alt="${input.company}">
    <a href="mailto:${contact.email}" style="font-family:'Maven Pro',sans-serif;font-size:13px;font-weight:700;color:rgba(255,255,255,0.6);text-decoration:none;padding:7px 16px;border:1.5px solid rgba(255,255,255,0.15);border-radius:8px;transition:all 0.15s;">Get in touch</a>
  </div>
</div>

<!-- HERO -->
<div style="position:relative;overflow:hidden;background:#100c2a;padding:56px 48px 72px;">
  <!-- Clean geometric accent — no blob -->
  <div style="position:absolute;top:0;right:0;width:50%;height:100%;pointer-events:none;overflow:hidden;">
    <div style="position:absolute;top:-30%;right:-20%;width:600px;height:600px;border-radius:50%;background:radial-gradient(circle,rgba(255,75,75,0.12) 0%,transparent 70%);"></div>
    <div style="position:absolute;bottom:-10%;right:5%;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(255,116,79,0.08) 0%,transparent 70%);"></div>
  </div>

  <div style="position:relative;z-index:1;max-width:680px;">
    <!-- Big personalised name — the first thing Mirko sees -->
    <div class="hero-name" style="margin-bottom:20px;">
      <span style="font-size:13px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,0.35);">Prepared for</span>
      <div style="font-size:clamp(36px,5vw,56px);font-weight:700;color:white;line-height:1;margin-top:4px;">${input.name}</div>
      <div style="font-size:15px;color:rgba(255,255,255,0.4);margin-top:4px;">${input.role ? input.role + ' · ' : ''}${input.company}</div>
    </div>

    <div style="height:1px;background:linear-gradient(90deg,rgba(255,75,75,0.4),transparent);margin-bottom:24px;width:120px;"></div>

    <h1 class="hero-headline" style="font-size:clamp(24px,3.5vw,40px);font-weight:700;line-height:1.15;color:white;max-width:600px;margin-bottom:16px;">${headlineHTML}</h1>
    <p class="hero-tagline" style="font-size:17px;color:rgba(255,255,255,0.55);max-width:520px;line-height:1.65;">${data.tagline || ''}</p>
  </div>
</div>

<!-- BODY -->
<div style="max-width:700px;margin:0 auto;padding:56px 48px 80px;">

  <!-- Situation — the "how do they know this?" moment -->
  <div class="fade-in-up" style="margin-bottom:52px;">
    <p style="font-size:19px;line-height:1.8;color:#2a2a2a;">${data.situation || ''}</p>
  </div>

  <!-- What we'd do — flows from the situation -->
  <div class="fade-in-up" style="margin-bottom:52px;">
    <div style="font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#ff4b4b;margin-bottom:4px;">Here's what we'd do for ${firstName}</div>
    <div style="height:2px;background:linear-gradient(90deg,#ff4b4b,#ff744f,transparent);margin-bottom:20px;"></div>
    ${bringHTML}
  </div>

  <!-- Reference stack with animated counter -->
  ${refs.length ? `
  <div class="fade-in-up" style="margin-bottom:52px;">
    <div style="font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#ff4b4b;margin-bottom:16px;">Proven at companies like yours</div>
    <div onclick="nextRef()" style="cursor:pointer;position:relative;user-select:none;">
      <div style="position:absolute;left:8px;right:8px;bottom:-6px;height:100%;background:rgba(16,12,42,0.5);border-radius:18px;"></div>
      <div style="position:absolute;left:14px;right:14px;bottom:-11px;height:100%;background:rgba(16,12,42,0.28);border-radius:18px;"></div>
      <div style="background:#100c2a;border-radius:18px;padding:36px 40px;position:relative;overflow:hidden;">
        ${refCards}
        <div style="position:absolute;right:-5%;bottom:-20%;width:280px;height:280px;border-radius:50%;background:radial-gradient(circle,rgba(255,75,75,0.15) 0%,transparent 70%);pointer-events:none;"></div>
      </div>
    </div>
    <div style="display:flex;gap:6px;margin-top:14px;align-items:center;">
      ${dots}
      ${refs.length > 1 ? `<span style="font-size:11px;color:rgba(0,0,0,0.25);margin-left:auto;display:flex;align-items:center;gap:4px;"><i class="ph ph-hand-tap" style="font-size:13px;"></i> tap to browse</span>` : ''}
    </div>
  </div>` : ''}

  <!-- Next step + CTA — low friction -->
  <div class="fade-in-up" style="background:white;border-radius:18px;padding:36px;margin-bottom:48px;box-shadow:0 2px 20px rgba(0,0,0,0.06);">
    <div style="font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#ff4b4b;margin-bottom:12px;">What happens next</div>
    <p style="font-size:16px;color:#444;line-height:1.75;margin-bottom:28px;">${data.next_step || ''}</p>
    <a href="mailto:${contact.email}?subject=Re: valantic for ${input.company}&body=Hi ${contact.name.split(' ')[0]}," class="cta-primary">
      <i class="ph ph-calendar-check" style="font-size:19px;"></i>
      ${data.cta_label || 'Book 30 minutes'}
    </a>
    <div style="font-size:13px;color:#aaa;margin-top:14px;">No deck, no pitch. Just a conversation.</div>
  </div>

  <!-- Contact — human, not corporate -->
  <div class="fade-in-up" style="display:flex;align-items:center;gap:20px;">
    ${avatar}
    <div>
      <div style="font-size:16px;font-weight:700;color:#100c2a;">${contact.name}</div>
      <div style="font-size:13px;color:#888;margin-bottom:6px;">${contact.role}</div>
      <a href="mailto:${contact.email}" style="font-size:13px;color:#ff4b4b;text-decoration:none;font-weight:600;">${contact.email}</a>
    </div>
  </div>

</div>

<!-- FOOTER -->
<div style="text-align:center;padding:40px 48px;background:#100c2a;">
  ${LOGO}
  <div style="font-size:12px;color:rgba(255,255,255,0.18);margin-top:10px;">Prepared by valantic · valantic.ai</div>
</div>

<!-- STICKY MOBILE CTA -->
<div class="sticky-cta">
  <a href="mailto:${contact.email}?subject=Re: valantic for ${input.company}" class="cta-primary" style="width:100%;justify-content:center;">
    <i class="ph ph-calendar-check" style="font-size:18px;"></i>
    ${data.cta_label || 'Book 30 minutes'}
  </a>
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
  // animate counter on new card
  animateCounter(document.querySelectorAll('.ref-card')[i]);
}

function animateCounter(card) {
  if (!card) return;
  const el = card.querySelector('.count-up');
  if (!el) return;
  const raw = el.dataset.target || '';
  const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
  const suffix = raw.replace(/[0-9.]/g, '');
  if (isNaN(num)) return;
  const start = 0;
  const duration = 1200;
  const startTime = performance.now();
  function tick(now) {
    const p = Math.min((now - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    const val = Math.round(start + (num - start) * ease * 10) / 10;
    el.textContent = (Number.isInteger(num) ? Math.round(val) : val) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// Scroll fade-in
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
}, { threshold: 0.15 });
document.querySelectorAll('.fade-in-up').forEach(el => observer.observe(el));

// Animate first ref counter on load
window.addEventListener('load', () => {
  animateCounter(document.querySelector('.ref-card'));
});
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

    // 4. Store in Vercel Blob (public store required)
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
