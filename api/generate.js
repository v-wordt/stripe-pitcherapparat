import Anthropic from '@anthropic-ai/sdk';
import { put } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const SHARED_SECRET = process.env.SHARED_SECRET || 'valantic2026';

function buildPrompt(name, role, company, context) {
  const firstName = name.split(' ')[0];
  return `You are a world-class B2B sales strategist at valantic.
Create a personalised value story. Approaches = future (what we WOULD do). References = past proof. Keep them completely separate.

## Contact: ${name}, ${role||'not specified'}, ${company}
## Context: ${context||'not specified'}

## valantic: PLAN AI Strategy, BUILD Data & AI Platform, RUN AI Solutions, TRANSFORM Adoption.
References: DATEV 40% faster month-end close; PLM 23% inventory reduction; Siemens Energy 60% fewer incidents; HELA 70% fewer manual bookings; Rewe Digital NPS +18; Retail +34% checkout; Industrial €4M AI potential; Logistics doc AI 6 weeks.

Respond ONLY with valid JSON:
{
  "greeting": "One punchy direct sentence for ${firstName}. Specific to their situation. Max 15 words.",
  "situation": "3-4 sentences. Specific tension this role faces. Have an opinion. Human, no buzzwords.",
  "approaches": [
    { "title": "Action verb + what, 5-7 words, future tense", "description": "2 sentences for ${company}, future tense.", "outcome": "Specific measurable result." }
  ],
  "references": [
    { "number": "metric", "description": "What we achieved. Past tense. 1-2 sentences.", "client": "Client or industry" }
  ],
  "next_step": "Concrete proposal. What we'd cover, why now. 2 sentences.",
  "cta_label": "4-6 words. Specific."
}
2-3 approaches. 2-3 references. First reference most impactful.`;
}

function buildHTML(data, input, contact) {
  const firstName = input.name.split(' ')[0];
  const domain = input.company.toLowerCase().replace(/\s+/g,'').replace(/[^a-z0-9]/g,'') + '.com';
  const refs = data.references || [];

  const refItems = refs.map((r, i) => `
    <div class="rc" style="${i>0?'display:none;':''}padding:28px;background:rgba(255,255,255,.04);border-radius:14px;border:1px solid rgba(255,255,255,.08);">
      <div style="font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:12px;">Reference ${i+1} / ${refs.length}</div>
      <div class="cu" data-n="${r.number}" style="font-size:60px;font-weight:700;line-height:1;color:#ff4b4b;margin-bottom:10px;">${r.number}</div>
      <div style="font-size:14px;color:rgba(255,255,255,.75);line-height:1.65;margin-bottom:8px;">${r.description}</div>
      <div style="font-size:11px;color:rgba(255,255,255,.3);">${r.client}</div>
    </div>`).join('');

  const refDots = refs.map((_,i) =>
    `<span onclick="gr(${i})" style="display:inline-block;width:${i===0?'20px':'7px'};height:7px;border-radius:4px;background:${i===0?'#ff4b4b':'rgba(255,255,255,.2)'};cursor:pointer;transition:all .2s;"></span>`
  ).join('');

  const approachCards = (data.approaches||[]).map((a,i) => `
    <div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:24px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#ff4b4b;margin-bottom:10px;">0${i+1}</div>
      <div style="font-size:15px;font-weight:700;color:white;margin-bottom:8px;line-height:1.3;">${a.title}</div>
      <div style="font-size:14px;color:rgba(255,255,255,.65);line-height:1.65;margin-bottom:10px;">${a.description}</div>
      ${a.outcome?`<div style="font-size:12px;font-weight:600;color:#ff744f;border-top:1px solid rgba(255,255,255,.08);padding-top:10px;">→ ${a.outcome}</div>`:''}
    </div>`).join('');

  const avatar = contact.photo
    ? `<img src="${contact.photo}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
    : `<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#ff4b4b,#ff744f);display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700;color:white;flex-shrink:0;">${contact.initials||'VS'}</div>`;

  const LOGO_W = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="232 216 1500 325" style="height:22px;width:auto;"><path fill="#FFFFFF" d="M1678,456.2c-7.8,14.8-24.3,23.9-43.6,23.9c-30,0-51.8-22.4-51.8-53.2s21.8-53.2,51.8-53.2c19.2,0,35.3,8.9,43.6,23.9l54-31.4c-19.3-33.1-56.2-53.6-96.8-53.6c-65.4,0-114.7,49.1-114.7,114.2S1569.8,541,1635.2,541c40.6,0,77.5-20.6,96.8-54L1678,456.2z"/><rect fill="#FFFFFF" x="1439" y="318.8" width="62" height="216.2"/><path fill="#FFFFFF" d="M1470,216.1c-20.4,0-37.6,17.2-37.6,37.6s17.2,37.6,37.6,37.6s37.6-17.2,37.6-37.6S1490.4,216.1,1470,216.1z"/><path fill="#FFFFFF" d="M1331.8,519.9c16.2,14.6,44.1,19.5,87.8,15.2v-55.9c-19.9,1.1-32.8,0.3-39.9-6.3c-3.7-3.5-5.5-8.3-5.5-14.8v-80h45.4v-59.4h-45.4v-75.9l-62,18.6v57.3H1277V378h35.2v80C1312.2,488.2,1318.4,507.8,1331.8,519.9z"/><path fill="#FFFFFF" d="M1163.4,374.6c23,0,41.7,18.7,41.7,41.7v118.6h62V402.1c0-49.4-40-89.5-89.4-89.5c-18.9,0-37.4,6-52.7,17.2l-3.3,2.4v-13.4h-62V535h62V416.3C1121.8,393.3,1140.4,374.6,1163.4,374.6z"/><path fill="#FFFFFF" d="M1029.2,534.9V318.8h-62v24.1l-3.6-4.1c-15-17.4-36.6-26.2-64.1-26.2c-27.5,0-53.4,11.7-72.8,32.9c-19.7,21.5-30.5,50.4-30.5,81.4s10.8,59.9,30.5,81.4c19.4,21.2,45.2,32.9,72.8,32.9c27.6,0,49-8.8,64.1-26.2l3.6-4.1V535L1029.2,534.9z M912.8,482.6c-32.6,0-54.5-22.4-54.5-55.8s21.9-55.8,54.5-55.8c32.6,0,54.5,22.4,54.5,55.8S945.3,482.6,912.8,482.6z"/><polygon fill="#FFFFFF" points="714.8,234.7 714.8,534.9 776.8,534.9 776.8,216.1"/><path fill="#FFFFFF" d="M684.3,534.9V318.8h-62v24.1l-3.6-4.1c-15.1-17.4-36.6-26.2-64.1-26.2c-27.5,0-53.4,11.7-72.8,32.9c-19.6,21.5-30.5,50.4-30.5,81.4s10.8,59.9,30.5,81.4c19.4,21.2,45.2,32.9,72.8,32.9c27.5,0,49-8.8,64.1-26.2l3.6-4.1V535L684.3,534.9z M567.8,482.6c-32.6,0-54.5-22.4-54.5-55.8s21.9-55.8,54.5-55.8c32.6,0,54.5,22.4,54.5,55.8S600.4,482.6,567.8,482.6z"/><polygon fill="#FFFFFF" points="395.3,318.8 348,463 300.7,318.8 232,318.8 312,534.9 384,534.9 464,318.8"/></svg>`;

  // Route B blob shape
  const BLOB = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1015.91 1154.31" style="height:100%;width:auto;">
    <defs><linearGradient id="bg1" gradientUnits="userSpaceOnUse" x1="0" y1="577" x2="1016" y2="577">
      <stop offset="0" style="stop-color:#FF4B4B"/><stop offset="1" style="stop-color:#FF744F"/>
    </linearGradient></defs>
    <path fill="url(#bg1)" d="M812.3,47.5C694.8-31.8,530.7,12.9,415.6,89.7C300.5,166.5,185.4,276.2,113.2,408.8C41,541.4,11.7,697.8,47.6,840.1c35.9,142.3,136.9,270.4,266.7,316.2c129.8,45.8,288.3-0.6,407.4-82.1c119.1-81.5,199-197.8,264.9-318.7c65.9-120.9,117.8-246.4,121.9-374.2C1112.6,253.5,1059.3,156.1,975,99.5C933.8,71.3,875.2,53.8,812.3,47.5z"/>
  </svg>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>For ${input.name} · valantic</title>
<link href="https://fonts.googleapis.com/css2?family=Maven+Pro:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="https://unpkg.com/@phosphor-icons/web@2.1.2"></script>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Maven Pro',sans-serif;background:#100c2a;color:white;-webkit-font-smoothing:antialiased;}
nav{background:#100c2a;border-bottom:1px solid rgba(255,255,255,.07);padding:14px 56px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:50;}
.nc{font-family:'Maven Pro',sans-serif;font-size:13px;font-weight:700;color:white;background:linear-gradient(135deg,#ff4b4b,#ff744f);padding:9px 22px;border-radius:99px;text-decoration:none;}
.hero{position:relative;overflow:hidden;background:#100c2a;padding:60px 56px 68px;min-height:280px;display:flex;align-items:flex-end;}
.blob{position:absolute;top:-15%;right:-10%;height:110%;pointer-events:none;opacity:.85;mix-blend-mode:screen;}
.hc{position:relative;z-index:1;max-width:640px;}
.wrap{background:#f5f3f0;}.winn{max-width:800px;margin:0 auto;padding:52px 56px 80px;}
.lbl{font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#ff4b4b;margin-bottom:14px;}
.card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;}
.wcard{background:white;border-radius:14px;padding:24px;box-shadow:0 1px 6px rgba(0,0,0,.06);}
.nxt{background:white;border-radius:16px;padding:26px;box-shadow:0 1px 6px rgba(0,0,0,.06);}
.cta{display:inline-flex;align-items:center;gap:8px;padding:12px 24px;background:linear-gradient(135deg,#ff4b4b,#ff744f);color:white;font-family:'Maven Pro',sans-serif;font-weight:700;font-size:14px;border-radius:99px;text-decoration:none;margin-top:18px;}
.ct{display:flex;align-items:center;gap:14px;padding:20px 0;border-top:1px solid #e5e2dc;}
footer{background:#100c2a;border-top:none;padding:28px 56px;display:flex;justify-content:space-between;align-items:center;}
.mob{display:none;position:fixed;bottom:0;left:0;right:0;z-index:99;background:white;border-top:1px solid #e5e2dc;padding:12px 16px;}
@keyframes fi{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.fi{animation:fi .5s ease both;}.fi2{animation:fi .5s .12s ease both;}.fi3{animation:fi .5s .24s ease both;}
@media(max-width:700px){nav,.wrap,footer{padding-left:20px;padding-right:20px;}.hero{padding:44px 20px 52px;}.mob{display:block;}body{padding-bottom:68px;}}
</style>
</head>
<body>

<nav>
  ${LOGO_W}
  <div style="display:flex;align-items:center;gap:12px;">
    <img src="https://logo.clearbit.com/${domain}" style="height:18px;opacity:.5;filter:brightness(10);" onerror="this.style.display='none'" alt="">
    <a href="mailto:${contact.email}?subject=Re: valantic for ${input.company}" class="nc">Get in touch</a>
  </div>
</nav>

<section class="hero">
  <div class="blob">${BLOB}</div>
  <div class="hc">
    <div class="fi" style="font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:14px;">${input.name} · ${input.company}</div>
    <div class="fi2" style="font-size:clamp(36px,5.5vw,60px);font-weight:700;line-height:1.05;background:linear-gradient(135deg,#ff4b4b,#ff744f);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:12px;">${firstName},</div>
    <div class="fi3" style="font-size:clamp(14px,1.8vw,18px);font-weight:400;color:rgba(255,255,255,.62);line-height:1.6;max-width:500px;">${(data.greeting||'').replace(new RegExp('^'+firstName+'[,.]?\s*','i'),'')}</div>
  </div>
</section>

<div class="wrap">
<div class="winn">
  <div style="margin-bottom:44px;">
    <div class="lbl">The situation</div>
    <div class="wcard"><p style="font-size:16px;line-height:1.8;color:#2a2a2a;">${data.situation||''}</p></div>
  </div>
  <div style="margin-bottom:44px;">
    <div class="lbl">What we'd do for ${input.company}</div>
    <div class="card-grid">${approachCards}</div>
  </div>
  ${refs.length?`<div style="margin-bottom:44px;">
    <div class="lbl">Proven results</div>
    <div style="position:relative;cursor:pointer;max-width:480px;" onclick="nr()">
      ${refItems}
      ${refs.length>1?`<div style="display:flex;gap:6px;align-items:center;margin-top:12px;">${refDots}<span style="font-size:11px;color:#aaa;margin-left:auto;display:flex;align-items:center;gap:3px;"><i class="ph ph-hand-tap" style="font-size:12px;"></i> tap</span></div>`:''}
    </div>
  </div>`:''}
  <div style="margin-bottom:44px;">
    <div class="lbl">What happens next</div>
    <div class="nxt">
      <p style="font-size:15px;color:#444;line-height:1.75;margin-bottom:20px;">${data.next_step||''}</p>
      <a href="mailto:${contact.email}?subject=Re: valantic for ${input.company}&body=Hi ${contact.name.split(' ')[0]}," class="cta">
        <i class="ph ph-calendar-check" style="font-size:16px;"></i> ${data.cta_label||'Book 30 minutes'}
      </a>
      <div style="font-size:11px;color:#bbb;margin-top:10px;">No deck. No pitch. Just a conversation.</div>
    </div>
  </div>
  <div class="ct">
    ${avatar}
    <div>
      <div style="font-size:14px;font-weight:700;color:#100c2a;">${contact.name}</div>
      <div style="font-size:12px;color:#aaa;margin-bottom:3px;">${contact.role}</div>
      <a href="mailto:${contact.email}" style="font-size:12px;color:#ff4b4b;font-weight:600;text-decoration:none;">${contact.email}</a>
    </div>
  </div>
</div>
</div>

<footer>${LOGO_W}<span style="font-size:12px;color:rgba(255,255,255,.25);">valantic.ai</span></footer>
<div class="mob"><a href="mailto:${contact.email}" class="cta" style="width:100%;justify-content:center;"><i class="ph ph-calendar-check" style="font-size:16px;"></i> ${data.cta_label||'Book 30 minutes'}</a></div>

<script>
const refs=${JSON.stringify(refs)};let i=0;
function nr(){if(refs.length<=1)return;i=(i+1)%refs.length;gr(i);}
function gr(n){i=n;document.querySelectorAll('.rc').forEach((c,j)=>c.style.display=j===n?'':'none');
  document.querySelectorAll('[onclick^="gr"]').forEach((d,j)=>{d.style.width=j===n?'20px':'7px';d.style.background=j===n?'#ff4b4b':'rgba(255,255,255,.2)';});
  ac(document.querySelectorAll('.rc')[n]);}
function ac(card){if(!card)return;const el=card.querySelector('.cu');if(!el)return;
  const raw=el.dataset.n||'';const num=parseFloat(raw.replace(/[^0-9.]/g,''));
  const suf=raw.replace(/[0-9.]/g,'');if(isNaN(num))return;
  const dur=900,s=performance.now();
  function t(now){const p=Math.min((now-s)/dur,1);const e=1-Math.pow(1-p,3);
    el.textContent=(Number.isInteger(num)?Math.round(num*e):Math.round(num*e*10)/10)+suf;if(p<1)requestAnimationFrame(t);}
  requestAnimationFrame(t);}
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
  if(req.headers['x-valantic-secret']!==SHARED_SECRET) return res.status(401).json({error:'Unauthorized'});
  const {name,company,role,context,contact}=req.body||{};
  if(!name||!company) return res.status(400).json({error:'name and company required'});
  const contactInfo={name:contact?.name||'Maike Saager',role:contact?.role||'Head of Growth Platform AI Hub, valantic',email:contact?.email||'maike.saager@valantic.com',photo:contact?.photo||null,initials:(contact?.name||'Maike Saager').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()};
  try {
    const msg=await client.messages.create({model:'claude-sonnet-4-5',max_tokens:1500,messages:[{role:'user',content:buildPrompt(name,role,company,context)}]});
    const text=msg.content.map(b=>b.text||'').join('');
    const story=JSON.parse(text.replace(/^```json\s*/i,'').replace(/```\s*$/i,'').trim());
    const html=buildHTML(story,{name,company,role},contactInfo);
    const prefix=`${name.split(' ')[0].toLowerCase()}-${company.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')}`;
    const slug=`${prefix}-${uuidv4().slice(0,8)}`;
    const blob=await put(`pitches/${slug}.html`,html,{access:'public',contentType:'text/html; charset=utf-8',addRandomSuffix:false});
    await put(`index/${slug}.json`,JSON.stringify({slug,name,company,created:new Date().toISOString(),url:blob.url}),{access:'public',contentType:'application/json',addRandomSuffix:false});
    return res.status(200).json({url:blob.url,slug,story});
  } catch(err){
    return res.status(500).json({error:err.message});
  }
}
