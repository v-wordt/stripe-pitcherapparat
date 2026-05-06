import Anthropic from '@anthropic-ai/sdk';
import { put } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const SHARED_SECRET = process.env.SHARED_SECRET;

const FETCH_CHAR_CAP = 8000;
const LOOP_BUDGET = 3;

async function fetchWithJina(url) {
  try {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const res = await fetch(jinaUrl, {
      headers: { 'Accept': 'text/plain', 'X-No-Cache': 'true' },
      signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.slice(0, FETCH_CHAR_CAP);
  } catch {
    return null;
  }
}

async function searchWithJina(query) {
  try {
    const jinaUrl = `https://s.jina.ai/${encodeURIComponent(query)}`;
    const res = await fetch(jinaUrl, {
      headers: { 'Accept': 'text/plain' },
      signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.slice(0, 4000);
  } catch {
    return null;
  }
}

const VALANTIC_STRIPE_KNOWLEDGE = `
## About valantic (the company pitching)
valantic is Europe's fastest-growing Digital Consulting, Solutions and Software company.
- 4,300 employees, 50+ locations, 500+ clients, 100+ awards
- Forbes 2023 World's Best Management Consulting Firms; multiple "TOP Beratung" & "Beste Mittelstandsdienstleister" awards
- Stripe Services Implementation Specialized Partner — first specialized Stripe partner in the DACH region
- 30+ Stripe experts, 50+ Stripe payment and billing projects across industries
- Stripe project track record: Universal Music Group, Etsy, N26, HSBC, reMarkable, Payoneer, Awin, StreamAMG, Copecart
- Clients include: AXA, Red Bull, Siemens, Zeiss, Bayer, Pfizer, Allianz, Deutsche Bank, Lufthansa, BMW, Bosch, Swarovski, Scout24, GEBERIT, Intersport, Zurich, Coop, DeepL, and many more

## valantic payment consulting services
End-to-end payment support: Strategy → Design & Concept → Implementation → Optimization

Key capabilities:
- Payment Market & Trend Analysis, Benchmarking, Regulatory Affairs, Technology Scouting
- Digital Payment Roadmap & Growth Strategy; Payment Product & business model innovation
- Payment Process Design & Customer Experience
- Payment Tech selection & Vendor Sourcing; Requirement Engineering, technical integration
- Full-stack Development (no/low/high code); Program & Project Management
- Business & IT System Architecture; Data Analytics & AI; M&A Advisory; Go2Market

Service packages:
- Stripe Discovery Workshop: 2–4 weeks prep + 1-day workshop co-delivered with Stripe experts + 1 week synthesis. OTC process analysis, pain point identification, ROI assessment, implementation roadmap.
- Success & Readiness Workshop: 2-day Stripe Billing readiness assessment; gap analysis, path-to-green execution plan.
- Implementation Package S: 5–8 weeks. Payments + Radar. €10,000–25,000. Standard payment integration, refunds, reporting.
- Implementation Package M: 8–12 weeks. Payments + Billing + Connect + Radar. €30,000–45,000. Marketplaces, platforms, billing/invoicing, subscriptions.
- Implementation Package L: 10–16 weeks. Full transformation incl. Migration + ERP integration. €45,000–65,000.

## Stripe platform (what valantic sells and implements)
Stripe: global payment platform. $1.4 Trillion processed annually · 99.999% uptime · $105bn valuation

Payments (Accepting money):
- Online Payments, In-Person Payments, Payments Intelligence
- 125+ payment methods with one click
- AI-powered Optimized Checkout Suite: +11.9% revenue increase on average
- Adaptive Acceptance, Network tokenization, Fraud protection (Radar)

Revenue / Billing (Automating money):
- Gartner Magic Quadrant Leader 2024 for Recurring Billing Applications
- Launch new pricing or business models in under 2 months
- Subscriptions, usage-based billing, complex contracts and ramp pricing
- Revenue recovery & dunning, Customer portal, Revenue Recognition
- Tax: Register, Calculate, Collect, Report, Remit

Connect (Platforming money):
- Enable platform and partner payments, Global Payments, Payouts
- Onboarding & Partner Verification, Monetization, Platform Management

Money Management (Moving money):
- Payouts, Issuing, Capital, Stablecoin
- By 2030: ~30% of all online payments will be agentic payments executed by AI agents

Key value drivers for prospects:
1. Optimal monetization of existing & future business models (subscriptions, platform business, embedded finance)
2. Maximize revenue by modernizing checkout (+11.9% avg revenue increase, 125+ payment methods, seamless UX)
3. New disruptive payment technologies (instant payments, embedded finance, stablecoins, agentic payments)
4. Automate & Digitize Billing & finance operations (replace legacy tools, unified OTC, reduce fragmentation)
5. Scale globally with unified infrastructure; seamless integration with ERP, CRM, CPQ systems
`;

const PITCH_OUTPUT_FORMAT = `
After researching the company, output ONLY valid JSON — no markdown fences, no prose, no explanation.

{
  "prospect_snapshot": {
    "core_business": "industry + core service/product + key markets (max 12 words)",
    "size_scale": "headcount range + revenue estimate (max 8 words)",
    "business_model": "B2B/B2C/marketplace + pricing type (max 8 words)",
    "current_payment_stack": "known or estimated current PSP/checkout setup (max 10 words)",
    "strategic_signals": "the single most Stripe-relevant recent signal for this company (max 14 words)"
  },
  "pain_solution_blocks": [
    {
      "block_name": "3-5 word pain theme title",
      "prospect_situation": "1 sentence pain in prospect language, specific to them (max 16 words)",
      "stripe_answer": "Stripe product(s) + how valantic implements it for them (max 15 words)",
      "fit": "High",
      "rationale": "why THIS company specifically would benefit (max 12 words)",
      "pitch_angle": "4-6 word compelling headline for this pain block"
    }
  ],
  "narrative": {
    "headline_message": "1 punchy sentence capturing Stripe + valantic core value for THIS prospect (max 15 words)",
    "headline_highlight": "2-3 exact words from headline_message to visually highlight",
    "top_3_priorities": ["block_name_1", "block_name_2", "block_name_3"]
  },
  "open_items": ["1 thing the sales team should verify before sending this pitch"],
  "next_step": "Concrete next action specific to this company and their situation (max 20 words)",
  "cta_label": "4-6 words action-oriented CTA"
}

Rules:
- Exactly 3 pain_solution_blocks
- Fit = High, Medium, or Low based on evidence found
- Never name competitors directly
- Every claim grounded in what you found about this company
- The pitch sells Stripe products + valantic implementation consulting
- Make it feel written specifically for this company — zero generic boilerplate
`;

const FETCH_URL_TOOL = {
  name: 'fetch_url',
  description: 'Fetch readable text of a URL via Jina Reader. Use for company pages (/about, /impressum, /investors, /press, /careers), Wikipedia, news articles, press releases.',
  input_schema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'Absolute URL to fetch' }
    },
    required: ['url']
  }
};

const WEB_SEARCH_TOOL = { type: 'web_search_20250305', name: 'web_search', max_uses: 4 };

function isInvalidToolError(err) {
  const msg = err && err.message ? String(err.message) : '';
  return /web_search|invalid.*tool|unsupported|unknown.*tool/i.test(msg) &&
    /400|invalid_request_error/i.test(msg);
}

async function executeToolUse(block) {
  if (block.name === 'fetch_url') {
    const url = block.input?.url;
    if (!url || typeof url !== 'string') {
      return { type: 'tool_result', tool_use_id: block.id, content: 'Error: missing url', is_error: true };
    }
    const text = await fetchWithJina(url);
    return {
      type: 'tool_result',
      tool_use_id: block.id,
      content: text ? `Content of ${url}:\n\n${text}` : `Failed to fetch ${url}`,
      is_error: !text
    };
  }
  return { type: 'tool_result', tool_use_id: block.id, content: `Unknown tool: ${block.name}`, is_error: true };
}

function parseJson(text) {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Failed to parse pitch JSON from model output');
  }
}

async function generateQuickPitch(company, searchDe, searchEn) {
  const systemPrompt = `You are an expert B2B sales strategist for valantic — a Stripe Services Implementation Specialized Partner. Research a prospect company and generate a highly personalized pitch to sell Stripe products + valantic implementation consulting.

${VALANTIC_STRIPE_KNOWLEDGE}

Research process:
1. Use web_search to find: core business, industry, size, revenue, current payment/checkout setup, recent strategic news and signals.
2. Use fetch_url to read key pages: homepage, /about, Wikipedia, press releases, recent news articles.
3. After 2-3 research turns, generate the pitch JSON. Focus on what makes this company a strong Stripe + valantic fit.
4. Look specifically for: payment fragmentation, digital transformation signals, billing complexity, international expansion plans, new business models, tech stack signals.`;

  const seedContent = [
    searchDe ? `--- WEB SEARCH (DE) ---\n${searchDe}` : null,
    searchEn ? `--- WEB SEARCH (EN) ---\n${searchEn}` : null,
  ].filter(Boolean).join('\n\n');

  const messages = [{
    role: 'user',
    content: `Company to pitch: "${company}"

PRELIMINARY RESEARCH (seed):
${seedContent || '(no seed available — use web_search to find information about this company)'}

Research further if needed (1-2 rounds max), then output the pitch JSON.

${PITCH_OUTPUT_FORMAT}`
  }];

  let useWebSearch = true;

  for (let turn = 0; turn < LOOP_BUDGET; turn++) {
    const tools = useWebSearch ? [WEB_SEARCH_TOOL, FETCH_URL_TOOL] : [FETCH_URL_TOOL];

    let response;
    try {
      response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 3500,
        system: systemPrompt,
        tools,
        messages
      });
    } catch (err) {
      if (useWebSearch && isInvalidToolError(err)) {
        console.warn('[quick-generate] web_search rejected — degrading to fetch-only:', err.message);
        useWebSearch = false;
        turn--;
        continue;
      }
      throw err;
    }

    if (response.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: response.content });
      continue;
    }

    const toolUses = response.content.filter(b => b.type === 'tool_use');

    if (toolUses.length === 0) {
      const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
      return parseJson(text);
    }

    messages.push({ role: 'assistant', content: response.content });

    const customToolUses = toolUses.filter(b => b.name === 'fetch_url');
    if (customToolUses.length > 0) {
      const results = await Promise.all(customToolUses.map(executeToolUse));
      messages.push({ role: 'user', content: results });
    }
  }

  // Force final synthesis after loop budget exhausted
  messages.push({ role: 'user', content: `Now output the pitch JSON based on everything you found.\n\n${PITCH_OUTPUT_FORMAT}` });

  const finalResponse = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3500,
    system: systemPrompt,
    messages
  });

  const text = finalResponse.content.filter(b => b.type === 'text').map(b => b.text).join('');
  return parseJson(text);
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHTML(story, company, contact, slug) {
  const headline = story.narrative?.headline_message || `Stripe × valantic für ${company}`;
  const highlight = story.narrative?.headline_highlight || '';
  const snapshot = story.prospect_snapshot || {};
  const blocks = story.pain_solution_blocks || [];
  const nextStep = story.next_step || '';
  const ctaLabel = story.cta_label || 'Gespräch vereinbaren';

  const escapedHL = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const highlightedHeadline = highlight
    ? esc(headline).replace(new RegExp('(' + escapedHL + ')', 'i'),
      '<span style="background:linear-gradient(135deg,#ff4b4b,#ff744f);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">$1</span>')
    : esc(headline);

  const fitColor = { High: '#22c55e', Medium: '#f59e0b', Low: '#94a3b8' };

  const blockCardsHtml = blocks.map((b, i) => `
    <div style="background:white;border-radius:16px;padding:28px;box-shadow:0 2px 12px rgba(0,0,0,.08);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div style="font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#ff4b4b;">0${i + 1}</div>
        <span style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:white;background:${fitColor[b.fit] || '#94a3b8'};padding:3px 9px;border-radius:99px;">${esc(b.fit)}</span>
      </div>
      <div style="font-size:16px;font-weight:700;color:#100c2a;margin-bottom:8px;line-height:1.35;">${esc(b.block_name)}</div>
      <div style="font-size:13px;color:#888;font-style:italic;margin-bottom:12px;line-height:1.6;">"${esc(b.prospect_situation)}"</div>
      <div style="font-size:14px;color:#555;line-height:1.7;margin-bottom:12px;"><strong style="color:#100c2a;">Stripe: </strong>${esc(b.stripe_answer)}</div>
      <div style="font-size:12px;font-weight:600;color:#193773;border-top:1px solid #f0eeee;padding-top:12px;">→ ${esc(b.pitch_angle)}</div>
    </div>`).join('');

  const snapshotFields = [
    { label: 'Business', value: snapshot.core_business },
    { label: 'Scale', value: snapshot.size_scale },
    { label: 'Model', value: snapshot.business_model },
    { label: 'Payments', value: snapshot.current_payment_stack },
    { label: 'Signals', value: snapshot.strategic_signals },
  ].filter(r => r.value);

  const snapshotHtml = snapshotFields.map((r, i, arr) => `
    <div style="display:flex;gap:12px;padding:12px 0;${i < arr.length - 1 ? 'border-bottom:1px solid rgba(255,255,255,0.08);' : ''}">
      <div style="font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#ff4b4b;width:68px;flex-shrink:0;padding-top:3px;">${r.label}</div>
      <div style="font-size:14px;color:rgba(255,255,255,0.8);line-height:1.55;">${esc(r.value)}</div>
    </div>`).join('');

  const trackingPixel = slug
    ? `<img src="https://stripe-pitcherapparat.vercel.app/api/open/${slug}" width="1" height="1" style="position:absolute;opacity:0;pointer-events:none;" alt="">`
    : '';

  const initials = contact.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Stripe × valantic · ${esc(company)}</title>
<link href="https://fonts.googleapis.com/css2?family=Maven+Pro:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Maven Pro', sans-serif; background: #100c2a; color: white; }
.container { max-width: 720px; margin: 0 auto; padding: 48px 24px 80px; }
</style>
</head>
<body>
${trackingPixel}
<div class="container">

  <div style="margin-bottom:48px;">
    <div style="font-size:12px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#ff4b4b;margin-bottom:12px;">Stripe × valantic · für ${esc(company)}</div>
    <h1 style="font-size:clamp(28px,5vw,44px);font-weight:700;line-height:1.15;margin-bottom:20px;">${highlightedHeadline}</h1>
    ${nextStep ? `<p style="font-size:17px;color:rgba(255,255,255,0.7);line-height:1.65;max-width:560px;">${esc(nextStep)}</p>` : ''}
  </div>

  ${snapshotHtml ? `
  <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;margin-bottom:40px;">
    <div style="font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:8px;">Prospect Snapshot</div>
    ${snapshotHtml}
  </div>` : ''}

  <div style="display:grid;grid-template-columns:1fr;gap:20px;margin-bottom:48px;">
    ${blockCardsHtml}
  </div>

  <div style="background:linear-gradient(135deg,rgba(255,75,75,0.15),rgba(255,116,79,0.15));border:1px solid rgba(255,75,75,0.3);border-radius:16px;padding:32px;text-align:center;margin-bottom:40px;">
    <div style="font-size:18px;font-weight:700;margin-bottom:8px;">Bereit für den nächsten Schritt?</div>
    <div style="font-size:15px;color:rgba(255,255,255,0.7);margin-bottom:24px;">${esc(nextStep)}</div>
    <a href="mailto:${esc(contact.email)}?subject=Stripe%20%C3%97%20valantic%20%C2%B7%20${encodeURIComponent(company)}" style="display:inline-flex;align-items:center;gap:8px;padding:14px 28px;background:linear-gradient(135deg,#ff4b4b,#ff744f);color:white;font-family:'Maven Pro',sans-serif;font-weight:700;font-size:15px;border-radius:10px;text-decoration:none;">${esc(ctaLabel)}</a>
  </div>

  <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;display:flex;align-items:center;gap:16px;">
    <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#ff4b4b,#ff744f);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;flex-shrink:0;">${esc(initials)}</div>
    <div>
      <div style="font-size:16px;font-weight:700;">${esc(contact.name)}</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.5);margin-bottom:4px;">${esc(contact.role)}</div>
      <a href="mailto:${esc(contact.email)}" style="font-size:13px;color:#ff4b4b;text-decoration:none;">${esc(contact.email)}</a>
    </div>
  </div>

  <div style="margin-top:32px;text-align:center;font-size:11px;color:rgba(255,255,255,0.2);letter-spacing:.08em;">valantic confidential · powered by Claude</div>
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
  if (!SHARED_SECRET) return res.status(500).json({ error: 'SHARED_SECRET not configured' });
  if (req.headers['x-valantic-secret'] !== SHARED_SECRET) return res.status(401).json({ error: 'Unauthorized' });

  const { company, contact } = req.body || {};
  if (!company) return res.status(400).json({ error: 'company required' });

  const contactInfo = {
    name: contact?.name || 'Joshua Marckwordt',
    role: contact?.role || 'Account Manager, valantic',
    email: contact?.email || 'joshua.marckwordt@nxt.valantic.com',
  };

  try {
    const t0 = Date.now();

    const [searchDe, searchEn] = await Promise.all([
      searchWithJina(`${company} Unternehmen Mitarbeiter Umsatz Zahlungsabwicklung Produkte News`),
      searchWithJina(`${company} company business model revenue employees payment checkout strategy`)
    ]);
    console.log(`[quick-generate] seed took ${Date.now() - t0}ms`);

    const story = await generateQuickPitch(company, searchDe, searchEn);
    console.log(`[quick-generate] pitch generated in ${Date.now() - t0}ms`);

    const slug = `${company.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${uuidv4().slice(0, 8)}`;
    const html = buildHTML(story, company, contactInfo, slug);

    const blob = await put(`pitches/${slug}.html`, html, {
      access: 'public',
      contentType: 'text/html; charset=utf-8',
      addRandomSuffix: false
    });

    await put(`index/${slug}.json`, JSON.stringify({
      slug, company,
      sender: contactInfo.name,
      senderEmail: contactInfo.email,
      created: new Date().toISOString(),
      opens: 0,
      lastOpened: null,
      url: blob.url
    }), { access: 'public', contentType: 'application/json', addRandomSuffix: false });

    return res.status(200).json({ url: blob.url, slug, story });
  } catch (err) {
    console.error('[quick-generate] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
