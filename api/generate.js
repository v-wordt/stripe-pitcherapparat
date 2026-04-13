import Anthropic from '@anthropic-ai/sdk';
import { put } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const SHARED_SECRET = process.env.SHARED_SECRET || 'valantic2026';

// ── PROMPT ────────────────────────────────────────────────────────────────
function buildPrompt(name, role, company, context) {
  const firstName = name.split(' ')[0];
  return `You are a world-class B2B sales strategist at valantic, a leading European digital consulting firm.
Create a highly personalised value story for a contact.

## Contact
- Name: ${name}
- Role: ${role || 'not specified'}
- Company: ${company}
- What's going on: ${context || 'not specified'}

## valantic AI Offering
valantic combines business, data, and technology end-to-end. Technology-agnostic but opinionated. Deep industry expertise.
Building blocks: PLAN (AI Strategy & Value Discovery), BUILD (Data & AI Platform), RUN (AI Solution Delivery), TRANSFORM (Governance & Adoption).
References: DATEV — 40% faster month-end close; PLM — 23% inventory reduction; Siemens Energy — 60% fewer incidents; HELA — 70% fewer manual bookings; Rewe Digital — NPS +18; Retail client — +34% checkout conversion; Industrial client — €4M AI potential; Logistics — document AI in 6 weeks; valantic internal — 400+ vally users NPS 72.

## Task
IMPORTANT: Keep "approaches" (what we WOULD do — future) and "references" (what we DID — past) completely separate. Never mix them.

Respond ONLY with valid JSON:
{
  "opening_hook": "A punchy direct sentence starting with their first name ${firstName}. E.g. '${firstName}, your competitors are already using AI in operations.' Max 12 words. Feel like a personal note opener.",
  "situation": "3-4 sentences. Make them think how do they know this. Specific tension this role is under. Have an opinion on the right move. Human, no buzzwords.",
  "approaches": [
    {
      "title": "Forward-looking action title 5-7 words what we WOULD do",
      "description": "2 sentences: what exactly we would do for ${company} and why it matters. Future tense only.",
      "outcome": "What this would deliver — specific and measurable."
    }
  ],
  "references": [
    { "number": "metric e.g. 40%", "description": "What we achieved. Past tense. 1-2 sentences.", "client": "Client name or industry type" }
  ],
  "next_step": "One concrete low-friction proposal. Specific: what we'd cover, why now, roughly how long. 2 sentences.",
  "cta_label": "4-6 words action-oriented specific."
}
2-3 approaches. 2-3 references from closest industry/role. First reference most impactful.`;
}

// ── HTML TEMPLATE ─────────────────────────────────────────────────────────
function buildHTML(data, input, contact) {
  const firstName = input.name.split(' ')[0];
  const domain = input.company.toLowerCase().replace(/\s+/g,'').replace(/[^a-z0-9]/g,'') + '.com';
  const refs = data.references || [];

  const refCardsHTML = refs.map((r, i) => `
    <div class="ref-card" style="${i > 0 ? 'display:none;' : ''}">
      <div style="font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,0.3);margin-bottom:14px;">Reference ${i+1} of ${refs.length}</div>
      <div class="count-up" data-target="${r.number}" style="font-size:68px;font-weight:700;line-height:1;background:linear-gradient(135deg,#ff4b4b,#ff744f);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:10px;">${r.number}</div>
      <div style="font-size:15px;color:rgba(255,255,255,0.8);line-height:1.6;margin-bottom:8px;">${r.description}</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.35);">${r.client}</div>
    </div>`).join('');

  const refDots = refs.map((_, i) =>
    `<div class="ref-dot" onclick="gotoRef(${i})" style="width:${i===0?'18px':'6px'};height:6px;border-radius:${i===0?'3px':'50%'};background:${i===0?'#ff4b4b':'rgba(255,255,255,0.25)'};cursor:pointer;transition:all .2s;display:inline-block;"></div>`
  ).join('');

  const approachesHTML = (data.approaches || []).map((a, i) => `
    <div style="display:grid;grid-template-columns:24px 1fr;gap:0 18px;padding:20px 0;border-bottom:1px solid #f0eef8;">
      <div style="font-size:11px;font-weight:700;color:#ff4b4b;padding-top:3px;">0${i+1}</div>
      <div>
        <div style="font-size:16px;font-weight:700;color:#100c2a;margin-bottom:6px;line-height:1.3;">${a.title}</div>
        <div style="font-size:14px;color:#444;line-height:1.65;margin-bottom:8px;">${a.description}</div>
        ${a.outcome ? `<div style="font-size:13px;font-weight:600;color:#5b26b7;"><span style="color:#ff4b4b;">→ </span>${a.outcome}</div>` : ''}
      </div>
    </div>`).join('');

  const avatar = contact.photo
    ? `<img src="${contact.photo}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
    : `<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#ff4b4b,#ff744f);display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700;color:white;flex-shrink:0;">${contact.initials||'VS'}</div>`;

  const LOGO_DARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="232 216 1500 325" style="height:24px;width:auto;"><path fill="#100C2A" d="M1678,456.2c-7.8,14.8-24.3,23.9-43.6,23.9c-30,0-51.8-22.4-51.8-53.2s21.8-53.2,51.8-53.2c19.2,0,35.3,8.9,43.6,23.9l54-31.4c-19.3-33.1-56.2-53.6-96.8-53.6c-65.4,0-114.7,49.1-114.7,114.2S1569.8,541,1635.2,541c40.6,0,77.5-20.6,96.8-54L1678,456.2z"/><rect fill="#100C2A" x="1439" y="318.8" width="62" height="216.2"/><path fill="#100C2A" d="M1470,216.1c-20.4,0-37.6,17.2-37.6,37.6s17.2,37.6,37.6,37.6s37.6-17.2,37.6-37.6S1490.4,216.1,1470,216.1z"/><path fill="#100C2A" d="M1331.8,519.9c16.2,14.6,44.1,19.5,87.8,15.2v-55.9c-19.9,1.1-32.8,0.3-39.9-6.3c-3.7-3.5-5.5-8.3-5.5-14.8v-80h45.4v-59.4h-45.4v-75.9l-62,18.6v57.3H1277V378h35.2v80C1312.2,488.2,1318.4,507.8,1331.8,519.9z"/><path fill="#100C2A" d="M1163.4,374.6c23,0,41.7,18.7,41.7,41.7v118.6h62V402.1c0-49.4-40-89.5-89.4-89.5c-18.9,0-37.4,6-52.7,17.2l-3.3,2.4v-13.4h-62V535h62V416.3C1121.8,393.3,1140.4,374.6,1163.4,374.6z"/><path fill="#100C2A" d="M1029.2,534.9V318.8h-62v24.1l-3.6-4.1c-15-17.4-36.6-26.2-64.1-26.2c-27.5,0-53.4,11.7-72.8,32.9c-19.7,21.5-30.5,50.4-30.5,81.4s10.8,59.9,30.5,81.4c19.4,21.2,45.2,32.9,72.8,32.9c27.6,0,49-8.8,64.1-26.2l3.6-4.1V535L1029.2,534.9z M912.8,482.6c-32.6,0-54.5-22.4-54.5-55.8s21.9-55.8,54.5-55.8c32.6,0,54.5,22.4,54.5,55.8S945.3,482.6,912.8,482.6z"/><polygon fill="#100C2A" points="714.8,234.7 714.8,534.9 776.8,534.9 776.8,216.1"/><path fill="#100C2A" d="M684.3,534.9V318.8h-62v24.1l-3.6-4.1c-15.1-17.4-36.6-26.2-64.1-26.2c-27.5,0-53.4,11.7-72.8,32.9c-19.6,21.5-30.5,50.4-30.5,81.4s10.8,59.9,30.5,81.4c19.4,21.2,45.2,32.9,72.8,32.9c27.5,0,49-8.8,64.1-26.2l3.6-4.1V535L684.3,534.9z M567.8,482.6c-32.6,0-54.5-22.4-54.5-55.8s21.9-55.8,54.5-55.8c32.6,0,54.5,22.4,54.5,55.8S600.4,482.6,567.8,482.6z"/><polygon fill="#100C2A" points="395.3,318.8 348,463 300.7,318.8 232,318.8 312,534.9 384,534.9 464,318.8"/></svg>`;
  const LOGO_WHITE = LOGO_DARK.replace(/fill="#100C2A"/g,'fill="#FFFFFF"');

  const hookText = data.opening_hook
    ? data.opening_hook.replace(new RegExp('^' + firstName + '[,.]?\\s*','i'), '')
    : (data.tagline || '');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>For ${input.name} · valantic</title>
<link href="https://fonts.googleapis.com/css2?family=Maven+Pro:wght@400;500;600;700&family=Dancing+Script:wght@700&display=swap" rel="stylesheet">
<script src="https://unpkg.com/@phosphor-icons/web@2.1.2"></script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Maven Pro',sans-serif;background:#fafafa;color:#100c2a;-webkit-font-smoothing:antialiased;}
/* NAV */
.nav{background:white;border-bottom:1px solid #f0eef8;padding:14px 48px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:50;}
.nav-cta{font-family:'Maven Pro',sans-serif;font-size:13px;font-weight:700;color:white;background:linear-gradient(135deg,#ff4b4b,#ff744f);padding:8px 20px;border-radius:8px;text-decoration:none;display:flex;align-items:center;gap:6px;box-shadow:0 2px 12px rgba(255,75,75,.3);transition:transform .15s,box-shadow .15s;}
.nav-cta:hover{transform:translateY(-1px);box-shadow:0 4px 20px rgba(255,75,75,.4);}
/* HERO — Route C */
.hero{position:relative;background:white;overflow:hidden;padding:60px 48px 72px;min-height:360px;display:flex;align-items:flex-end;border-bottom:1px solid #f0eef8;}
.hero-photo-wrap{position:absolute;top:-40px;right:-60px;width:min(420px,46%);aspect-ratio:1;clip-path:url(#blobMask);}
.hero-photo-wrap img{width:100%;height:100%;object-fit:cover;}
.hero-ghost{position:absolute;top:-10px;right:-10px;font-family:'Maven Pro',sans-serif;font-weight:700;font-size:clamp(90px,15vw,170px);line-height:1;background:linear-gradient(135deg,#ff4b4b18,#ff744f28);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;pointer-events:none;user-select:none;white-space:nowrap;}
.hero-content{position:relative;z-index:1;max-width:580px;}
.hero-eyebrow{font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#ff4b4b;margin-bottom:10px;display:flex;align-items:center;gap:10px;}
.hero-eyebrow::after{content:'';flex:0 0 40px;height:1.5px;background:linear-gradient(90deg,#ff4b4b,transparent);}
.hero-name{font-family:'Dancing Script',cursive;font-size:clamp(50px,8vw,88px);font-weight:700;line-height:1.05;background:linear-gradient(135deg,#ff4b4b,#ff744f);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:8px;}
.hero-hook{font-size:clamp(17px,2.4vw,24px);font-weight:700;color:#100c2a;line-height:1.3;max-width:480px;margin-bottom:14px;}
.hero-meta{font-size:13px;color:#bbb;}
/* BODY GRID */
.body-wrap{max-width:1020px;margin:0 auto;padding:0 48px 80px;display:grid;grid-template-columns:1fr 320px;gap:0 52px;align-items:start;}
.body-main{padding-top:52px;}
.body-sidebar{padding-top:52px;position:sticky;top:72px;}
/* SECTIONS */
.sec{margin-bottom:48px;}
.sec-label{font-size:10px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#ff4b4b;margin-bottom:14px;display:flex;align-items:center;gap:10px;}
.sec-label::after{content:'';flex:0 0 28px;height:1.5px;background:linear-gradient(90deg,#ff4b4b50,transparent);}
/* APPROACHES */
.approach{display:grid;grid-template-columns:24px 1fr;gap:0 18px;padding:20px 0;border-bottom:1px solid #f0eef8;}
.approach-num{font-size:11px;font-weight:700;color:#ff4b4b;padding-top:3px;}
.approach-title{font-size:16px;font-weight:700;color:#100c2a;margin-bottom:6px;line-height:1.3;}
.approach-desc{font-size:14px;color:#444;line-height:1.65;margin-bottom:8px;}
.approach-outcome{font-size:13px;font-weight:600;color:#5b26b7;}
/* SIDEBAR */
.ref-outer{position:relative;cursor:pointer;margin-bottom:12px;}
.ref-s2{position:absolute;left:10px;right:10px;bottom:-8px;height:100%;background:rgba(16,12,42,.45);border-radius:18px;}
.ref-s1{position:absolute;left:5px;right:5px;bottom:-4px;height:100%;background:rgba(16,12,42,.65);border-radius:18px;}
.ref-front{position:relative;background:#100c2a;border-radius:18px;padding:28px;overflow:hidden;}
.ref-accent{position:absolute;right:-15%;bottom:-20%;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(255,75,75,.18) 0%,transparent 70%);pointer-events:none;}
.ref-dots{display:flex;gap:5px;align-items:center;margin-top:10px;}
.nxt{background:white;border-radius:16px;border:1.5px solid #f0eef8;padding:22px;box-shadow:0 2px 14px rgba(0,0,0,.05);}
.cta-btn{display:flex;align-items:center;justify-content:center;gap:8px;padding:13px 18px;margin-top:18px;background:linear-gradient(135deg,#ff4b4b,#ff744f);color:white;font-family:'Maven Pro',sans-serif;font-weight:700;font-size:14px;border-radius:10px;text-decoration:none;width:100%;box-shadow:0 3px 14px rgba(255,75,75,.3);transition:transform .15s,box-shadow .15s;}
.cta-btn:hover{transform:translateY(-2px);box-shadow:0 6px 22px rgba(255,75,75,.4);}
.cta-sub{font-size:11px;color:#bbb;text-align:center;margin-top:9px;}
/* CONTACT */
.contact-row{display:flex;align-items:center;gap:14px;padding:18px 0;border-top:1px solid #f0eef8;margin-top:4px;}
/* FOOTER */
footer{background:#100c2a;padding:28px 48px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;}
/* STICKY MOBILE */
.sticky-cta{display:none;position:fixed;bottom:0;left:0;right:0;z-index:99;background:white;border-top:1px solid #f0eef8;padding:10px 16px;}
/* ANIMATIONS */
@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
.fu{animation:fadeUp .6s ease both;}
.fu2{animation:fadeUp .6s .15s ease both;}
.fu3{animation:fadeUp .6s .28s ease both;}
.sf{opacity:0;transform:translateY(14px);transition:opacity .5s ease,transform .5s ease;}
.sf.v{opacity:1;transform:none;}
/* RESPONSIVE */
@media(max-width:800px){
  .nav,.hero,footer{padding-left:20px;padding-right:20px;}
  .hero{padding-top:40px;padding-bottom:52px;min-height:280px;}
  .hero-photo-wrap{width:52%;top:-20px;right:-30px;}
  .body-wrap{grid-template-columns:1fr;padding:0 20px 60px;gap:0;}
  .body-sidebar{position:static;padding-top:0;}
  .sticky-cta{display:block;}
  body{padding-bottom:68px;}
}
</style>
</head>
<body>
<svg width="0" height="0" style="position:absolute;pointer-events:none;">
  <defs>
    <clipPath id="blobMask" clipPathUnits="objectBoundingBox">
      <path d="M0.5,0.1 C0.65,0.05 0.85,0.15 0.9,0.3 C0.96,0.46 0.89,0.61 0.78,0.7 C0.9,0.75 0.96,0.9 0.88,0.99 C0.79,1.07 0.63,1.05 0.53,0.98 C0.44,1.05 0.28,1.1 0.19,1.01 C0.1,0.93 0.11,0.76 0.2,0.68 C0.08,0.59 0.03,0.41 0.11,0.26 C0.2,0.11 0.35,0.15 0.5,0.1 Z"/>
    </clipPath>
  </defs>
</svg>

<nav class="nav">
  ${LOGO_DARK}
  <div style="display:flex;align-items:center;gap:14px;">
    <img src="https://logo.clearbit.com/${domain}" style="height:20px;width:auto;opacity:.55;filter:grayscale(1);" onerror="this.style.display='none'" alt="">
    <a href="mailto:${contact.email}?subject=Re: valantic for ${input.company}" class="nav-cta">
      <i class="ph ph-envelope" style="font-size:14px;"></i> Get in touch
    </a>
  </div>
</nav>

<section class="hero">
  ${contact.photo
    ? `<div class="hero-photo-wrap"><img src="${contact.photo}" alt="${contact.name}"></div>`
    : `<div class="hero-photo-wrap" style="clip-path:url(#blobMask);background:linear-gradient(135deg,#ff4b4b12,#5b26b710);"></div>
       <div class="hero-ghost">${firstName}</div>`}
  <div class="hero-content">
    <div class="hero-eyebrow fu">A note for you</div>
    <div class="hero-name fu2">${firstName},</div>
    <div class="hero-hook fu3">${hookText}</div>
    <div class="hero-meta fu3">${input.role ? input.role + ' · ' : ''}${input.company}</div>
  </div>
</section>

<div class="body-wrap">
  <main class="body-main">
    <div class="sec sf">
      <div class="sec-label">The situation</div>
      <p style="font-size:18px;line-height:1.8;color:#2a2a2a;">${data.situation||''}</p>
    </div>
    <div class="sec sf">
      <div class="sec-label">What we'd do for ${input.company}</div>
      ${approachesHTML}
    </div>
  </main>

  <aside class="body-sidebar">
    ${refs.length ? `
    <div class="sec sf">
      <div class="sec-label">Proven at companies like yours</div>
      <div class="ref-outer" onclick="nextRef()">
        <div class="ref-s2"></div><div class="ref-s1"></div>
        <div class="ref-front">
          ${refCardsHTML}
          <div class="ref-accent"></div>
        </div>
      </div>
      <div class="ref-dots">
        ${refDots}
        ${refs.length > 1 ? `<span style="font-size:11px;color:#aaa;margin-left:auto;display:flex;align-items:center;gap:3px;"><i class="ph ph-hand-tap" style="font-size:12px;"></i> tap</span>` : ''}
      </div>
    </div>` : ''}

    <div class="nxt sf">
      <div class="sec-label" style="margin-bottom:10px;">What happens next</div>
      <p style="font-size:14px;color:#444;line-height:1.7;">${data.next_step||''}</p>
      <a href="mailto:${contact.email}?subject=Re: valantic for ${input.company}&body=Hi ${contact.name.split(' ')[0]}," class="cta-btn">
        <i class="ph ph-calendar-check" style="font-size:17px;"></i>
        ${data.cta_label||'Book 30 minutes'}
      </a>
      <div class="cta-sub">No deck. No pitch. Just a conversation.</div>
    </div>

    <div class="contact-row sf">
      ${avatar}
      <div>
        <div style="font-size:14px;font-weight:700;color:#100c2a;">${contact.name}</div>
        <div style="font-size:12px;color:#aaa;margin-bottom:4px;">${contact.role}</div>
        <a href="mailto:${contact.email}" style="font-size:12px;color:#ff4b4b;font-weight:600;text-decoration:none;">${contact.email}</a>
      </div>
    </div>
  </aside>
</div>

<footer>
  ${LOGO_WHITE}
  <div style="font-size:12px;color:rgba(255,255,255,.25);">Prepared by valantic · valantic.ai</div>
</footer>

<div class="sticky-cta">
  <a href="mailto:${contact.email}?subject=Re: valantic for ${input.company}" class="cta-btn">
    <i class="ph ph-calendar-check" style="font-size:16px;"></i>
    ${data.cta_label||'Book 30 minutes'}
  </a>
</div>

<script>
const refs=${JSON.stringify(refs)};
let idx=0;
function nextRef(){if(refs.length<=1)return;idx=(idx+1)%refs.length;gotoRef(idx);}
function gotoRef(i){
  idx=i;
  document.querySelectorAll('.ref-card').forEach((c,j)=>c.style.display=j===i?'':'none');
  document.querySelectorAll('.ref-dot').forEach((d,j)=>{
    d.style.width=j===i?'18px':'6px';d.style.borderRadius=j===i?'3px':'50%';
    d.style.background=j===i?'#ff4b4b':'rgba(255,255,255,.25)';
  });
  animateCounter(document.querySelectorAll('.ref-card')[i]);
}
function animateCounter(card){
  if(!card)return;const el=card.querySelector('.count-up');if(!el)return;
  const raw=el.dataset.target||'';const num=parseFloat(raw.replace(/[^0-9.]/g,''));
  const suf=raw.replace(/[0-9.]/g,'');if(isNaN(num))return;
  const dur=900,s=performance.now();
  function t(now){const p=Math.min((now-s)/dur,1);const e=1-Math.pow(1-p,3);
    el.textContent=(Number.isInteger(num)?Math.round(num*e):Math.round(num*e*10)/10)+suf;
    if(p<1)requestAnimationFrame(t);}
  requestAnimationFrame(t);
}
const obs=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('v');obs.unobserve(e.target);}});},{threshold:.1});
document.querySelectorAll('.sf').forEach(el=>obs.observe(el));
window.addEventListener('load',()=>animateCounter(document.querySelector('.ref-card')));
</script>
</body>
</html>`;
}

// ── HANDLER ───────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-valantic-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: buildPrompt(name, role, company, context) }],
    });

    const text = message.content.map(b => b.text || '').join('');
    const clean = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const story = JSON.parse(clean);

    const html = buildHTML(story, { name, company, role }, contactInfo);

    const prefix = `${name.split(' ')[0].toLowerCase()}-${company.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')}`;
    const slug = `${prefix}-${uuidv4().slice(0,8)}`;

    const blob = await put(`pitches/${slug}.html`, html, {
      access: 'public',
      contentType: 'text/html; charset=utf-8',
      addRandomSuffix: false,
    });

    await put(`index/${slug}.json`, JSON.stringify({
      slug, name, company, role, created: new Date().toISOString(), url: blob.url
    }), { access: 'public', contentType: 'application/json', addRandomSuffix: false });

    return res.status(200).json({ url: blob.url, slug, story });

  } catch (err) {
    console.error('Generate error:', err);
    return res.status(500).json({ error: err.message });
  }
}
