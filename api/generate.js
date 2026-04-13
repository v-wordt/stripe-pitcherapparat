import Anthropic from '@anthropic-ai/sdk';
import { put } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const SHARED_SECRET = process.env.SHARED_SECRET || 'valantic2026';

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
Building blocks: PLAN (AI Strategy), BUILD (Data & AI Platform), RUN (AI Solution Delivery), TRANSFORM (Governance & Adoption).
References: DATEV — 40% faster month-end close; PLM — 23% inventory reduction; Siemens Energy — 60% fewer incidents; HELA — 70% fewer manual bookings; Rewe Digital — NPS +18; Retail — +34% checkout conversion; Industrial — €4M AI potential; Logistics — document AI in 6 weeks; valantic internal — 400+ vally users NPS 72.

## Task
Keep approaches (forward-looking, what we WOULD do) and references (past proof) completely separate.

Respond ONLY with valid JSON — no markdown:
{
  "greeting": "One direct sentence for ${firstName}. E.g. 'Your operations team is already 6 months behind where your competitors will be next quarter.' Max 15 words. No fluff.",
  "situation": "3-4 sentences. Specific tension this role is under. Have an opinion. Human, no buzzwords.",
  "approaches": [
    {
      "title": "What we'd do — action verb, 5-7 words, future-facing",
      "description": "2 sentences: exactly what we'd do for ${company}, why it matters. Future tense.",
      "outcome": "Specific measurable result this would deliver."
    }
  ],
  "references": [
    { "number": "metric", "description": "What we achieved. Past tense. 1-2 sentences.", "client": "Client name or type" }
  ],
  "next_step": "Concrete low-friction proposal. Specific: what we'd cover, why now. 2 sentences.",
  "cta_label": "4-6 words. Specific and action-oriented."
}
2-3 approaches. 2-3 references from closest industry. First reference most impactful.`;
}

function buildHTML(data, input, contact) {
  const firstName = input.name.split(' ')[0];
  const domain = input.company.toLowerCase().replace(/\s+/g,'').replace(/[^a-z0-9]/g,'') + '.com';
  const refs = data.references || [];

  const refCardsHTML = refs.map((r, i) => `
    <div class="rc" style="${i>0?'display:none;':''}">
      <div style="font-size:10px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:12px;">Reference ${i+1} / ${refs.length}</div>
      <div class="cu" data-n="${r.number}" style="font-size:64px;font-weight:400;line-height:1;background:linear-gradient(135deg,#ff4b4b,#ff744f);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:8px;">${r.number}</div>
      <div style="font-size:14px;color:rgba(255,255,255,.75);line-height:1.6;margin-bottom:6px;">${r.description}</div>
      <div style="font-size:11px;color:rgba(255,255,255,.3);">${r.client}</div>
    </div>`).join('');

  const refDots = refs.map((_,i) =>
    `<span class="rd" onclick="gr(${i})" style="display:inline-block;width:${i===0?'18px':'6px'};height:6px;border-radius:${i===0?'3px':'50%'};background:${i===0?'#ff4b4b':'rgba(255,255,255,.2)'};cursor:pointer;transition:all .2s;"></span>`
  ).join('');

  const approachesHTML = (data.approaches||[]).map((a,i) => `
    <div style="display:grid;grid-template-columns:20px 1fr;gap:0 16px;padding:20px 0;border-bottom:1px solid #f0eeee;">
      <span style="font-size:10px;font-weight:600;letter-spacing:.1em;color:#ff4b4b;padding-top:3px;">0${i+1}</span>
      <div>
        <div style="font-size:15px;font-weight:600;color:#100c2a;margin-bottom:5px;line-height:1.3;">${a.title}</div>
        <div style="font-size:14px;color:#444;line-height:1.65;margin-bottom:7px;">${a.description}</div>
        ${a.outcome?`<div style="font-size:12px;font-weight:600;color:#193773;"><span style="color:#ff4b4b;">→ </span>${a.outcome}</div>`:''}
      </div>
    </div>`).join('');

  const avatar = contact.photo
    ? `<img src="${contact.photo}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
    : `<div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#ff4b4b,#ff744f);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:600;color:white;flex-shrink:0;">${contact.initials||'VS'}</div>`;

  const LOGO_D = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="232 216 1500 325" style="height:22px;width:auto;"><path fill="#100C2A" d="M1678,456.2c-7.8,14.8-24.3,23.9-43.6,23.9c-30,0-51.8-22.4-51.8-53.2s21.8-53.2,51.8-53.2c19.2,0,35.3,8.9,43.6,23.9l54-31.4c-19.3-33.1-56.2-53.6-96.8-53.6c-65.4,0-114.7,49.1-114.7,114.2S1569.8,541,1635.2,541c40.6,0,77.5-20.6,96.8-54L1678,456.2z"/><rect fill="#100C2A" x="1439" y="318.8" width="62" height="216.2"/><path fill="#100C2A" d="M1470,216.1c-20.4,0-37.6,17.2-37.6,37.6s17.2,37.6,37.6,37.6s37.6-17.2,37.6-37.6S1490.4,216.1,1470,216.1z"/><path fill="#100C2A" d="M1331.8,519.9c16.2,14.6,44.1,19.5,87.8,15.2v-55.9c-19.9,1.1-32.8,0.3-39.9-6.3c-3.7-3.5-5.5-8.3-5.5-14.8v-80h45.4v-59.4h-45.4v-75.9l-62,18.6v57.3H1277V378h35.2v80C1312.2,488.2,1318.4,507.8,1331.8,519.9z"/><path fill="#100C2A" d="M1163.4,374.6c23,0,41.7,18.7,41.7,41.7v118.6h62V402.1c0-49.4-40-89.5-89.4-89.5c-18.9,0-37.4,6-52.7,17.2l-3.3,2.4v-13.4h-62V535h62V416.3C1121.8,393.3,1140.4,374.6,1163.4,374.6z"/><path fill="#100C2A" d="M1029.2,534.9V318.8h-62v24.1l-3.6-4.1c-15-17.4-36.6-26.2-64.1-26.2c-27.5,0-53.4,11.7-72.8,32.9c-19.7,21.5-30.5,50.4-30.5,81.4s10.8,59.9,30.5,81.4c19.4,21.2,45.2,32.9,72.8,32.9c27.6,0,49-8.8,64.1-26.2l3.6-4.1V535L1029.2,534.9z M912.8,482.6c-32.6,0-54.5-22.4-54.5-55.8s21.9-55.8,54.5-55.8c32.6,0,54.5,22.4,54.5,55.8S945.3,482.6,912.8,482.6z"/><polygon fill="#100C2A" points="714.8,234.7 714.8,534.9 776.8,534.9 776.8,216.1"/><path fill="#100C2A" d="M684.3,534.9V318.8h-62v24.1l-3.6-4.1c-15.1-17.4-36.6-26.2-64.1-26.2c-27.5,0-53.4,11.7-72.8,32.9c-19.6,21.5-30.5,50.4-30.5,81.4s10.8,59.9,30.5,81.4c19.4,21.2,45.2,32.9,72.8,32.9c27.5,0,49-8.8,64.1-26.2l3.6-4.1V535L684.3,534.9z M567.8,482.6c-32.6,0-54.5-22.4-54.5-55.8s21.9-55.8,54.5-55.8c32.6,0,54.5,22.4,54.5,55.8S600.4,482.6,567.8,482.6z"/><polygon fill="#100C2A" points="395.3,318.8 348,463 300.7,318.8 232,318.8 312,534.9 384,534.9 464,318.8"/></svg>`;
  const LOGO_W = LOGO_D.replace(/fill="#100C2A"/g,'fill="#FFFFFF"').replace('height:22px','height:20px');

  // Guilloche-style SVG (Route A stroke art, simplified inline)
  const GUILLOCHE = `<svg viewBox="0 0 999 1239" xmlns="http://www.w3.org/2000/svg" style="height:100%;width:auto;">
    <defs>
      <linearGradient id="gc" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#ff4b4b;stop-opacity:.35"/>
        <stop offset="100%" style="stop-color:#ff744f;stop-opacity:.2"/>
      </linearGradient>
    </defs>
    <g fill="none" stroke="url(#gc)" stroke-width="1.2">
      <ellipse cx="500" cy="600" rx="460" ry="580"/>
      <ellipse cx="500" cy="600" rx="420" ry="540"/>
      <ellipse cx="500" cy="600" rx="380" ry="500"/>
      <ellipse cx="500" cy="600" rx="340" ry="460"/>
      <ellipse cx="500" cy="600" rx="300" ry="420"/>
      <ellipse cx="500" cy="600" rx="260" ry="380"/>
      <ellipse cx="500" cy="600" rx="220" ry="340"/>
      <ellipse cx="500" cy="600" rx="180" ry="300"/>
      <ellipse cx="500" cy="420" rx="360" ry="380"/>
      <ellipse cx="500" cy="420" rx="320" ry="340"/>
      <ellipse cx="500" cy="420" rx="280" ry="300"/>
      <ellipse cx="500" cy="420" rx="240" ry="260"/>
      <ellipse cx="500" cy="420" rx="200" ry="220"/>
    </g>
  </svg>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>For ${input.name} · valantic</title>
<link href="https://fonts.googleapis.com/css2?family=Maven+Pro:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="https://unpkg.com/@phosphor-icons/web@2.1.2"></script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Maven Pro',sans-serif;background:#fff;color:#100c2a;-webkit-font-smoothing:antialiased;font-size:17px;font-weight:400;line-height:1.5;}
/* NAV */
.nav{background:#fff;border-bottom:1px solid #f0eeee;padding:16px 56px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:50;}
.nav-right{display:flex;align-items:center;gap:16px;}
.nav-logo-client{height:18px;width:auto;opacity:.5;filter:grayscale(1);}
.nav-cta{font-family:'Maven Pro',sans-serif;font-size:13px;font-weight:600;color:white;background:linear-gradient(135deg,#ff4b4b,#ff744f);padding:8px 20px;border-radius:8px;text-decoration:none;transition:opacity .15s;}
.nav-cta:hover{opacity:.88;}
/* HERO — Route A: white, guilloche top-right */
.hero{position:relative;overflow:hidden;background:#fff;padding:72px 56px 80px;min-height:340px;display:flex;align-items:flex-end;}
.hero-guilloche{position:absolute;top:-12%;right:-10%;height:110%;pointer-events:none;opacity:1;}
.hero-content{position:relative;z-index:1;max-width:600px;}
.hero-for{font-size:12px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#193773;margin-bottom:16px;}
.hero-name{font-size:clamp(44px,6.5vw,72px);font-weight:400;line-height:1.05;background:linear-gradient(135deg,#ff4b4b,#ff744f);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:12px;}
.hero-hook{font-size:clamp(16px,2.2vw,22px);font-weight:400;color:#100c2a;line-height:1.4;max-width:500px;margin-bottom:20px;}
.hero-meta{font-size:13px;color:#cdcdcd;}
/* LAYOUT */
.wrap{max-width:1040px;margin:0 auto;padding:0 56px 80px;display:grid;grid-template-columns:1fr 300px;gap:0 52px;}
.main{padding-top:52px;}
.aside{padding-top:52px;position:sticky;top:68px;}
/* SECTIONS */
.sec{margin-bottom:44px;}
.lbl{font-size:10px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:#193773;margin-bottom:16px;display:flex;align-items:center;gap:12px;}
.lbl::after{content:'';flex:0 0 32px;height:1px;background:linear-gradient(90deg,#19377340,transparent);}
/* APPROACHES */
.ap{display:grid;grid-template-columns:20px 1fr;gap:0 16px;padding:18px 0;border-bottom:1px solid #f0eeee;}
.ap-n{font-size:10px;font-weight:600;letter-spacing:.1em;color:#ff4b4b;padding-top:3px;}
.ap-t{font-size:15px;font-weight:600;color:#100c2a;margin-bottom:5px;line-height:1.3;}
.ap-d{font-size:14px;color:#444;line-height:1.65;margin-bottom:6px;}
.ap-o{font-size:12px;font-weight:600;color:#193773;}
/* REF STACK */
.rs-outer{position:relative;cursor:pointer;margin-bottom:12px;}
.rs-s2{position:absolute;left:10px;right:10px;bottom:-7px;height:100%;background:rgba(16,12,42,.4);border-radius:14px;}
.rs-s1{position:absolute;left:5px;right:5px;bottom:-3px;height:100%;background:rgba(16,12,42,.6);border-radius:14px;}
.rs-front{position:relative;background:#100c2a;border-radius:14px;padding:26px;overflow:hidden;}
.rs-glow{position:absolute;right:-10%;bottom:-15%;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,rgba(255,75,75,.15) 0%,transparent 70%);pointer-events:none;}
.rd-row{display:flex;gap:5px;align-items:center;margin-top:10px;}
/* NEXT STEP */
.nxt{background:#fff;border:1px solid #f0eeee;border-radius:14px;padding:22px;box-shadow:0 1px 12px rgba(0,0,0,.05);}
.cta{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:12px;margin-top:16px;background:linear-gradient(135deg,#ff4b4b,#ff744f);color:white;font-family:'Maven Pro',sans-serif;font-weight:600;font-size:14px;border-radius:9px;text-decoration:none;transition:opacity .15s;}
.cta:hover{opacity:.88;}
.cta-note{font-size:11px;color:#cdcdcd;text-align:center;margin-top:8px;}
/* CONTACT */
.ct{display:flex;align-items:center;gap:12px;padding:16px 0;border-top:1px solid #f0eeee;margin-top:4px;}
/* FOOTER */
footer{background:#100c2a;padding:28px 56px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;}
/* STICKY MOBILE */
.mob-cta{display:none;position:fixed;bottom:0;left:0;right:0;z-index:99;background:white;border-top:1px solid #f0eeee;padding:10px 16px;}
/* FADE IN */
@keyframes fi{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.fi{animation:fi .5s ease both;}.fi2{animation:fi .5s .12s ease both;}.fi3{animation:fi .5s .24s ease both;}
.sf{opacity:0;transform:translateY(12px);transition:opacity .5s ease,transform .5s ease;}.sf.v{opacity:1;transform:none;}
/* RESPONSIVE */
@media(max-width:800px){
  .nav,.hero,footer{padding-left:20px;padding-right:20px;}
  .hero{padding-top:44px;padding-bottom:52px;}
  .wrap{grid-template-columns:1fr;padding:0 20px 60px;}
  .aside{position:static;padding-top:0;}
  .mob-cta{display:block;}
  body{padding-bottom:66px;}
}
</style>
</head>
<body>

<nav class="nav">
  ${LOGO_D}
  <div class="nav-right">
    <img src="https://logo.clearbit.com/${domain}" class="nav-logo-client" onerror="this.style.display='none'" alt="">
    <a href="mailto:${contact.email}?subject=Re: valantic for ${input.company}" class="nav-cta">Get in touch</a>
  </div>
</nav>

<!-- HERO — Route A -->
<section class="hero">
  <div class="hero-guilloche">${GUILLOCHE}</div>
  <div class="hero-content">
    <div class="hero-for fi">${input.role ? input.role + ' · ' : ''}${input.company}</div>
    <div class="hero-name fi2">${firstName},</div>
    <div class="hero-hook fi3">${data.greeting || data.tagline || ''}</div>
    <div class="hero-meta fi3">Prepared by ${contact.name} · valantic</div>
  </div>
</section>

<div class="wrap">
  <main class="main">
    <div class="sec sf">
      <div class="lbl">The situation</div>
      <p style="font-size:18px;line-height:1.8;color:#2a2a2a;">${data.situation||''}</p>
    </div>
    <div class="sec sf">
      <div class="lbl">What we'd do for ${input.company}</div>
      ${approachesHTML}
    </div>
  </main>

  <aside class="aside">
    ${refs.length ? `
    <div class="sec sf">
      <div class="lbl">Proven at companies like yours</div>
      <div class="rs-outer" onclick="nr()">
        <div class="rs-s2"></div><div class="rs-s1"></div>
        <div class="rs-front">
          ${refCardsHTML}
          <div class="rs-glow"></div>
        </div>
      </div>
      <div class="rd-row">
        ${refDots}
        ${refs.length>1?`<span style="font-size:11px;color:#cdcdcd;margin-left:auto;display:flex;align-items:center;gap:3px;"><i class="ph ph-hand-tap" style="font-size:12px;"></i> tap</span>`:''}
      </div>
    </div>` : ''}

    <div class="nxt sf">
      <div class="lbl" style="margin-bottom:10px;">What happens next</div>
      <p style="font-size:14px;color:#444;line-height:1.7;">${data.next_step||''}</p>
      <a href="mailto:${contact.email}?subject=Re: valantic for ${input.company}&body=Hi ${contact.name.split(' ')[0]}," class="cta">
        <i class="ph ph-calendar-check" style="font-size:16px;"></i>
        ${data.cta_label||'Book 30 minutes'}
      </a>
      <div class="cta-note">No deck. No pitch. Just a conversation.</div>
    </div>

    <div class="ct sf">
      ${avatar}
      <div>
        <div style="font-size:14px;font-weight:600;color:#100c2a;">${contact.name}</div>
        <div style="font-size:12px;color:#aaa;margin-bottom:3px;">${contact.role}</div>
        <a href="mailto:${contact.email}" style="font-size:12px;color:#ff4b4b;font-weight:600;text-decoration:none;">${contact.email}</a>
      </div>
    </div>
  </aside>
</div>

<footer>
  ${LOGO_W}
  <div style="font-size:12px;color:rgba(255,255,255,.3);">Prepared by valantic · valantic.ai</div>
</footer>

<div class="mob-cta">
  <a href="mailto:${contact.email}?subject=Re: valantic for ${input.company}" class="cta">
    <i class="ph ph-calendar-check" style="font-size:16px;"></i>
    ${data.cta_label||'Book 30 minutes'}
  </a>
</div>

<script>
const refs=${JSON.stringify(refs)};
let i=0;
function nr(){if(refs.length<=1)return;i=(i+1)%refs.length;gr(i);}
function gr(n){
  i=n;
  document.querySelectorAll('.rc').forEach((c,j)=>c.style.display=j===n?'':'none');
  document.querySelectorAll('.rd').forEach((d,j)=>{
    d.style.width=j===n?'18px':'6px';
    d.style.borderRadius=j===n?'3px':'50%';
    d.style.background=j===n?'#ff4b4b':'rgba(255,255,255,.2)';
  });
  ac(document.querySelectorAll('.rc')[n]);
}
function ac(card){
  if(!card)return;const el=card.querySelector('.cu');if(!el)return;
  const raw=el.dataset.n||'';const num=parseFloat(raw.replace(/[^0-9.]/g,''));
  const suf=raw.replace(/[0-9.]/g,'');if(isNaN(num))return;
  const dur=900,s=performance.now();
  function t(now){const p=Math.min((now-s)/dur,1);const e=1-Math.pow(1-p,3);
    el.textContent=(Number.isInteger(num)?Math.round(num*e):Math.round(num*e*10)/10)+suf;
    if(p<1)requestAnimationFrame(t);}
  requestAnimationFrame(t);
}
const obs=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('v');obs.unobserve(e.target);}});},{threshold:.1});
document.querySelectorAll('.sf').forEach(el=>obs.observe(el));
window.addEventListener('load',()=>ac(document.querySelector('.rc')));
</script>
</body>
</html>`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type,x-valantic-secret');
  if(req.method==='OPTIONS') return res.status(200).end();
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});

  const secret=req.headers['x-valantic-secret'];
  if(secret!==SHARED_SECRET) return res.status(401).json({error:'Unauthorized'});

  const {name,company,role,context,contact}=req.body||{};
  if(!name||!company) return res.status(400).json({error:'name and company required'});

  const contactInfo={
    name:contact?.name||'Maike Saager',
    role:contact?.role||'Head of Growth Platform AI Hub, valantic',
    email:contact?.email||'maike.saager@valantic.com',
    photo:contact?.photo||null,
    initials:(contact?.name||'Maike Saager').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(),
  };

  try {
    const message=await client.messages.create({
      model:'claude-sonnet-4-5',max_tokens:1500,
      messages:[{role:'user',content:buildPrompt(name,role,company,context)}],
    });
    const text=message.content.map(b=>b.text||'').join('');
    const clean=text.replace(/^```json\s*/i,'').replace(/```\s*$/i,'').trim();
    const story=JSON.parse(clean);
    const html=buildHTML(story,{name,company,role},contactInfo);
    const prefix=`${name.split(' ')[0].toLowerCase()}-${company.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')}`;
    const slug=`${prefix}-${uuidv4().slice(0,8)}`;
    const blob=await put(`pitches/${slug}.html`,html,{access:'public',contentType:'text/html; charset=utf-8',addRandomSuffix:false});
    await put(`index/${slug}.json`,JSON.stringify({slug,name,company,role,created:new Date().toISOString(),url:blob.url}),{access:'public',contentType:'application/json',addRandomSuffix:false});
    return res.status(200).json({url:blob.url,slug,story});
  } catch(err){
    console.error('Generate error:',err);
    return res.status(500).json({error:err.message});
  }
}
