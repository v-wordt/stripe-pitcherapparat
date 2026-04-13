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
  const greetingClean = (data.greeting||'').replace(new RegExp('^'+firstName+'[,.]?\\s*','i'),'');
  const fullHeadline = firstName + ', ' + greetingClean;
  const nameLen = (firstName + ',').length;

  const approachCards = (data.approaches||[]).map((a,i) => `
    <div style="background:white;border-radius:16px;padding:28px;box-shadow:0 1px 6px rgba(0,0,0,.06);display:flex;flex-direction:column;transition:transform .2s,box-shadow .2s;" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,.1)'" onmouseout="this.style.transform='';this.style.boxShadow='0 1px 6px rgba(0,0,0,.06)'">
      <div style="font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#ff4b4b;margin-bottom:12px;">0${i+1}</div>
      <div style="font-size:15px;font-weight:700;color:#100c2a;margin-bottom:10px;line-height:1.35;">${a.title}</div>
      <div style="font-size:14px;color:#555;line-height:1.7;flex:1;">${a.description}</div>
      ${a.outcome?`<div style="font-size:12px;font-weight:600;color:#193773;border-top:1px solid #f0eeee;padding-top:12px;margin-top:12px;">→ ${a.outcome}</div>`:''}
    </div>`).join('');

  const refSpotlight = refs.length ? `
    <div style="position:relative;">
      ${refs.map((r,i)=>`
      <div class="rsp" style="display:${i===0?'block':'none'};background:#100c2a;border-radius:20px;padding:52px 56px;min-height:280px;position:relative;overflow:hidden;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px;">
          <img src="https://logo.clearbit.com/${(r.client||'').toLowerCase().replace(/[^a-z0-9]/g,'')}.com" style="height:18px;width:auto;opacity:.4;filter:brightness(10);" onerror="this.style.display='none'" alt="">
          <span style="font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.35);">${r.client}</span>
        </div>
        <div style="display:grid;grid-template-columns:auto 1fr;gap:48px;align-items:center;">
          <div style="font-size:clamp(72px,10vw,120px);font-weight:700;line-height:1;color:#ff4b4b;white-space:nowrap;">${r.number}</div>
          <div style="font-size:17px;color:rgba(255,255,255,.78);line-height:1.7;">${r.description}</div>
        </div>
        <div style="position:absolute;right:-20px;bottom:-30px;font-size:220px;font-weight:700;color:rgba(255,255,255,.025);line-height:1;pointer-events:none;user-select:none;">${r.number}</div>
      </div>`).join('')}
      ${refs.length>1?`<div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;">
        <div style="display:flex;gap:7px;">${refs.map((_,i)=>`<button onclick="sg(${i})" style="width:${i===0?'24':'8'}px;height:8px;border-radius:4px;border:none;background:${i===0?'#ff4b4b':'#ccc'};cursor:pointer;transition:all .25s;padding:0;" id="rb-${i}"></button>`).join('')}</div>
        <span id="rsc" style="font-size:12px;font-weight:600;color:#aaa;">1 / ${refs.length}</span>
      </div>`:''}
    </div>` : '';

  const avatar = contact.photo
    ? `<img src="${contact.photo}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
    : `<div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#ff4b4b,#ff744f);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:white;flex-shrink:0;">${contact.initials||'VS'}</div>`;

  const LOGO_W = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="232 216 1500 325" style="height:22px;width:auto;"><path fill="#FFFFFF" d="M1678,456.2c-7.8,14.8-24.3,23.9-43.6,23.9c-30,0-51.8-22.4-51.8-53.2s21.8-53.2,51.8-53.2c19.2,0,35.3,8.9,43.6,23.9l54-31.4c-19.3-33.1-56.2-53.6-96.8-53.6c-65.4,0-114.7,49.1-114.7,114.2S1569.8,541,1635.2,541c40.6,0,77.5-20.6,96.8-54L1678,456.2z"/><rect fill="#FFFFFF" x="1439" y="318.8" width="62" height="216.2"/><path fill="#FFFFFF" d="M1470,216.1c-20.4,0-37.6,17.6,37.6,37.6s17.2,37.6,37.6,37.6s37.6-17.2,37.6-37.6S1490.4,216.1,1470,216.1z"/><path fill="#FFFFFF" d="M1331.8,519.9c16.2,14.6,44.1,19.5,87.8,15.2v-55.9c-19.9,1.1-32.8,0.3-39.9-6.3c-3.7-3.5-5.5-8.3-5.5-14.8v-80h45.4v-59.4h-45.4v-75.9l-62,18.6v57.3H1277V378h35.2v80C1312.2,488.2,1318.4,507.8,1331.8,519.9z"/><path fill="#FFFFFF" d="M1163.4,374.6c23,0,41.7,18.7,41.7,41.7v118.6h62V402.1c0-49.4-40-89.5-89.4-89.5c-18.9,0-37.4,6-52.7,17.2l-3.3,2.4v-13.4h-62V535h62V416.3C1121.8,393.3,1140.4,374.6,1163.4,374.6z"/><path fill="#FFFFFF" d="M1029.2,534.9V318.8h-62v24.1l-3.6-4.1c-15-17.4-36.6-26.2-64.1-26.2c-27.5,0-53.4,11.7-72.8,32.9c-19.7,21.5-30.5,50.4-30.5,81.4s10.8,59.9,30.5,81.4c19.4,21.2,45.2,32.9,72.8,32.9c27.6,0,49-8.8,64.1-26.2l3.6-4.1V535L1029.2,534.9z M912.8,482.6c-32.6,0-54.5-22.4-54.5-55.8s21.9-55.8,54.5-55.8c32.6,0,54.5,22.4,54.5,55.8S945.3,482.6,912.8,482.6z"/><polygon fill="#FFFFFF" points="714.8,234.7 714.8,534.9 776.8,534.9 776.8,216.1"/><path fill="#FFFFFF" d="M684.3,534.9V318.8h-62v24.1l-3.6-4.1c-15.1-17.4-36.6-26.2-64.1-26.2c-27.5,0-53.4,11.7-72.8,32.9c-19.6,21.5-30.5,50.4-30.5,81.4s10.8,59.9,30.5,81.4c19.4,21.2,45.2,32.9,72.8,32.9c27.5,0,49-8.8,64.1-26.2l3.6-4.1V535L684.3,534.9z M567.8,482.6c-32.6,0-54.5-22.4-54.5-55.8s21.9-55.8,54.5-55.8c32.6,0,54.5,22.4,54.5,55.8S600.4,482.6,567.8,482.6z"/><polygon fill="#FFFFFF" points="395.3,318.8 348,463 300.7,318.8 232,318.8 312,534.9 384,534.9 464,318.8"/></svg>`;

  const BLOB = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1015.91 1154.31" style="height:100%;width:auto;"><defs><linearGradient id="bg1" gradientUnits="userSpaceOnUse" x1="0" y1="577" x2="1016" y2="577"><stop offset="0" style="stop-color:#FF4B4B"/><stop offset="1" style="stop-color:#FF744F"/></linearGradient></defs><path fill="url(#bg1)" d="M812.3,47.5C694.8-31.8,530.7,12.9,415.6,89.7C300.5,166.5,185.4,276.2,113.2,408.8C41,541.4,11.7,697.8,47.6,840.1c35.9,142.3,136.9,270.4,266.7,316.2c129.8,45.8,288.3-0.6,407.4-82.1c119.1-81.5,199-197.8,264.9-318.7c65.9-120.9,117.8-246.4,121.9-374.2C1112.6,253.5,1059.3,156.1,975,99.5C933.8,71.3,875.2,53.8,812.3,47.5z"/></svg>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>For ${input.name} · valantic</title>
<link href="https://fonts.googleapis.com/css2?family=Maven+Pro:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="https://unpkg.com/@phosphor-icons/web@2.1.2"></script>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Maven Pro',sans-serif;background:#f5f3f0;color:#100c2a;-webkit-font-smoothing:antialiased;}
nav{background:#100c2a;border-bottom:1px solid rgba(255,255,255,.07);padding:14px 56px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:50;}
.nc{font-family:'Maven Pro',sans-serif;font-size:13px;font-weight:700;color:white;background:linear-gradient(135deg,#ff4b4b,#ff744f);padding:9px 22px;border-radius:99px;text-decoration:none;}
.hero{position:relative;overflow:hidden;background:#100c2a;padding:64px 56px 72px;min-height:300px;display:flex;align-items:flex-end;}
.blob{position:absolute;top:-15%;right:-10%;height:115%;pointer-events:none;opacity:.9;mix-blend-mode:screen;}
.hc{position:relative;z-index:1;max-width:900px;width:100%;}
.wrap{max-width:1100px;margin:0 auto;padding:52px 56px 80px;}
.lbl{font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#ff4b4b;margin-bottom:14px;}
.wcard{background:white;border-radius:16px;padding:28px 32px;box-shadow:0 1px 6px rgba(0,0,0,.06);}
.card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;}
.cta{display:inline-flex;align-items:center;gap:8px;padding:13px 26px;background:linear-gradient(135deg,#ff4b4b,#ff744f);color:white;font-family:'Maven Pro',sans-serif;font-weight:700;font-size:14px;border-radius:99px;text-decoration:none;transition:transform .15s,box-shadow .15s;}
.cta:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(255,75,75,.35);}
footer{background:#100c2a;padding:28px 56px;display:flex;justify-content:space-between;align-items:center;}
.mob{display:none;position:fixed;bottom:0;left:0;right:0;z-index:99;background:white;border-top:1px solid #e5e2dc;padding:12px 16px;}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
.sr{opacity:0;transform:translateY(18px);transition:opacity .6s ease,transform .6s ease;}
.sr.v{opacity:1;transform:none;}
@media(max-width:700px){nav,.hero,footer,.wrap{padding-left:20px;padding-right:20px;}.rsp{padding:28px 24px !important;}.rsp>div:last-of-type{grid-template-columns:1fr !important;gap:16px !important;}.mob{display:block;}body{padding-bottom:68px;}}
</style>
</head>
<body>
<nav>
  ${LOGO_W}
  <div style="display:flex;align-items:center;gap:12px;">
    <img src="https://logo.clearbit.com/${domain}" style="height:18px;opacity:.4;filter:brightness(10);" onerror="this.style.display='none'" alt="">
    <a href="mailto:${contact.email}?subject=Re: valantic for ${input.company}" class="nc">Get in touch</a>
  </div>
</nav>
<section class="hero">
  <div class="blob">${BLOB}</div>
  <div class="hc">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:22px;opacity:0;animation:fadeUp .5s .1s ease forwards;">
      <span style="font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.35);">${input.name}</span>
      <span style="width:3px;height:3px;border-radius:50%;background:rgba(255,255,255,.2);"></span>
      <span style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.35);">${input.company}</span>
    </div>
    <div style="font-size:clamp(28px,4vw,52px);font-weight:700;line-height:1.18;max-width:840px;opacity:0;animation:fadeUp .6s .3s ease forwards;">
      <span id="tw" style="color:white;"></span><span id="twn" style="display:none;background:linear-gradient(135deg,#ff4b4b,#ff744f);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">${firstName},</span><span id="twr" style="color:white;display:none;"> ${greetingClean}</span><span id="twc" style="color:#ff4b4b;animation:blink 1s step-end infinite;display:none;">|</span>
    </div>
  </div>
</section>
<div style="background:#f5f3f0;">
<div class="wrap">
  <div class="sr" style="margin-bottom:44px;"><div class="lbl">Your situation</div><div class="wcard"><p style="font-size:16px;line-height:1.85;color:#2a2a2a;">${data.situation||''}</p></div></div>
  <div class="sr" style="margin-bottom:44px;"><div class="lbl">What we'd do for ${input.company}</div><div class="card-grid">${approachCards}</div></div>
  ${refs.length?`<div class="sr" style="margin-bottom:44px;"><div class="lbl">Proven results</div>${refSpotlight}</div>`:''}
  <div class="sr" style="margin-bottom:32px;"><div class="lbl">Here's what I'd suggest</div>
    <div class="wcard">
      <p style="font-size:15px;color:#444;line-height:1.75;margin-bottom:22px;">${data.next_step||''}</p>
      <a href="mailto:${contact.email}?subject=Re: valantic for ${input.company}&body=Hi ${contact.name.split(' ')[0]}," class="cta"><i class="ph ph-calendar-check" style="font-size:15px;"></i> ${data.cta_label||'Book 30 minutes'}</a>
      <div style="font-size:11px;color:#bbb;margin-top:10px;">No deck. No pitch. Just a conversation.</div>
    </div>
  </div>
  <div class="sr wcard" style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
    ${avatar}
    <div style="flex:1;min-width:180px;">
      <div style="font-size:17px;font-weight:700;color:#100c2a;margin-bottom:3px;">${contact.name}</div>
      <div style="font-size:13px;color:#888;margin-bottom:8px;">${contact.role}</div>
      <a href="mailto:${contact.email}" style="font-size:14px;color:#ff4b4b;font-weight:600;text-decoration:none;">${contact.email}</a>
    </div>
    <a href="mailto:${contact.email}" style="display:inline-flex;align-items:center;gap:7px;padding:10px 20px;background:#f5f3f0;color:#100c2a;font-family:'Maven Pro',sans-serif;font-weight:700;font-size:13px;border-radius:99px;text-decoration:none;"><i class="ph ph-envelope" style="font-size:14px;"></i> Send a message</a>
  </div>
</div>
</div>
<footer>${LOGO_W}<span style="font-size:12px;color:rgba(255,255,255,.25);">valantic.ai</span></footer>
<div class="mob"><a href="mailto:${contact.email}" class="cta" style="width:100%;justify-content:center;"><i class="ph ph-calendar-check" style="font-size:15px;"></i> ${data.cta_label||'Book 30 minutes'}</a></div>
<script>
// Typewriter on full headline — delay start to avoid flash
const full='${(firstName+', '+greetingClean).replace(/'/g,"\\'")}',nl=${nameLen};
let ni=0;const tw=document.getElementById('tw'),twn=document.getElementById('twn'),twr=document.getElementById('twr'),twc=document.getElementById('twc');
setTimeout(()=>{
  if(twc)twc.style.display='inline';
  const ti=setInterval(()=>{
    if(ni<=full.length){
      if(ni<=nl){if(tw)tw.textContent=full.slice(0,ni);}
      else{if(tw)tw.style.display='none';if(twn)twn.style.display='inline';if(twr){twr.style.display='inline';twr.textContent=' '+full.slice(nl+1,ni);}}
      ni++;
    }else{clearInterval(ti);if(twc)twc.style.display='none';}
  },45);
},400);
// Spotlight auto-advance
const rl=${JSON.stringify(refs.length)};let ri=0,rt;
function sg(i){ri=i;clearInterval(rt);if(rl>1)rt=setInterval(()=>sg((ri+1)%rl),8000);
  document.querySelectorAll('.rsp').forEach((e,j)=>e.style.display=j===i?'block':'none');
  for(let j=0;j<rl;j++){const b=document.getElementById('rb-'+j);if(b){b.style.width=j===i?'24px':'8px';b.style.background=j===i?'#ff4b4b':'#ccc';}}
  const c=document.getElementById('rsc');if(c)c.textContent=(i+1)+' / '+rl;}
if(rl>1)rt=setInterval(()=>sg((ri+1)%rl),8000);
// Scroll reveal
const obs=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('v');obs.unobserve(e.target);}});},{threshold:.08});
document.querySelectorAll('.sr').forEach(el=>obs.observe(el));
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
