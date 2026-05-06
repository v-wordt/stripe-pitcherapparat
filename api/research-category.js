import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const SHARED_SECRET = process.env.SHARED_SECRET;

const GOOGLE_SHEET_ID = '1Okk8GvpMxNpAimn6Z1Dkt2lAzj3Qd8IM';
const GOOGLE_PROSPECT_PROFILE_GID = '886669856';
const MODEL = 'claude-haiku-4-5-20251001';
const FETCH_CHAR_CAP = 8000;
const MAX_TURNS = 2;

async function fetchCategoryFields(category) {
  const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/export?format=csv&gid=${GOOGLE_PROSPECT_PROFILE_GID}`;
  const res = await fetch(url);
  const text = await res.text();
  const lines = text.trim().split('\n').map(l => l.split(','));
  const fields = [];
  for (let i = 1; i < lines.length; i++) {
    const [, info, typ] = lines[i];
    if (!info || !info.trim()) continue;
    const fieldName = info.trim().replace(/^"(.+)"$/, '$1');
    const cat = typ ? typ.trim().replace(/^"(.+)"$/, '$1') : null;
    if (cat === category) fields.push(fieldName);
  }
  return fields;
}

async function fetchWithJina(url) {
  try {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const res = await fetch(jinaUrl, {
      headers: { 'Accept': 'text/plain', 'X-No-Cache': 'true' },
      signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) return null;
    return (await res.text()).slice(0, FETCH_CHAR_CAP);
  } catch { return null; }
}

function isInvalidToolError(err) {
  const msg = err?.message ? String(err.message) : '';
  return /web_search|invalid.*tool|unsupported|unknown.*tool/i.test(msg) &&
         /400|invalid_request_error/i.test(msg);
}

const FETCH_URL_TOOL = {
  name: 'fetch_url',
  description: 'Fetch the readable text of a URL via Jina Reader. Use for company pages (/impressum, /about, /investors, /press), Wikipedia, news articles, and regulatory filings.',
  input_schema: {
    type: 'object',
    properties: { url: { type: 'string', description: 'Absolute URL to fetch' } },
    required: ['url']
  }
};

const WEB_SEARCH_TOOL = { type: 'web_search_20250305', name: 'web_search', max_uses: 2 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-valantic-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!SHARED_SECRET || req.headers['x-valantic-secret'] !== SHARED_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { company, website, category, half } = req.body || {};
  if (!company || !website || !category) {
    return res.status(400).json({ error: 'company, website, and category required' });
  }

  try {
    const t0 = Date.now();
    const allFields = await fetchCategoryFields(category);
    if (allFields.length === 0) {
      return res.status(200).json({ category, result: {} });
    }

    let fields = allFields;
    if (half === 0) fields = allFields.slice(0, Math.ceil(allFields.length / 2));
    else if (half === 1) fields = allFields.slice(Math.ceil(allFields.length / 2));

    const fieldList = fields.map(f => `  - ${f}`).join('\n');
    const fieldKeys = fields.map(f => `    "${f}": { ... }`).join(',\n');

    const systemPrompt = `You are a B2B prospect research analyst. Research ONLY the "${category}" fields listed below for the given company.

Source priority:
1. Company-controlled pages: homepage, /impressum, /about, /investors, /press, /careers.
2. Authoritative third parties: Wikipedia (DE+EN), Handelsregister, regulatory filings, named press (Handelsblatt, FAZ, Reuters, Bloomberg, NZZ, etc.).
3. Lower-tier signals: LinkedIn, Crunchbase, news aggregators.

Decision ladder (per field):
1. Direct evidence → confidence: "high", source: <url>. COMPACT shape.
2. Reasoned estimate → assumption: true, assumptionNote ≤20 words, confidence: "medium"|"low", source: "estimate". FULL shape.
3. Last resort only → value: "Nicht öffentlich verfügbar", confidence: "low", source: null. Must be rare.

Fields to populate (${category}):
${fieldList}

Do 1–2 targeted web searches and/or fetch relevant pages, then synthesise.`;

    const messages = [{ role: 'user', content: `Company: ${company}\nWebsite: ${website}\n\nResearch the "${category}" fields listed in your instructions.` }];
    let useWebSearch = true;
    let lastResponse;

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const tools = useWebSearch ? [WEB_SEARCH_TOOL, FETCH_URL_TOOL] : [FETCH_URL_TOOL];
      let response;
      try {
        response = await client.messages.create({
          model: MODEL,
          max_tokens: 2048,
          system: systemPrompt,
          tools,
          messages
        });
      } catch (err) {
        if (useWebSearch && isInvalidToolError(err)) {
          useWebSearch = false;
          turn--;
          continue;
        }
        throw err;
      }

      messages.push({ role: 'assistant', content: response.content });
      lastResponse = response;

      if (response.stop_reason === 'pause_turn') continue;

      const fetchCalls = response.content.filter(b => b.type === 'tool_use' && b.name === 'fetch_url');
      if (fetchCalls.length > 0) {
        const results = await Promise.all(fetchCalls.map(async block => {
          const url = block.input?.url;
          if (!url) return { type: 'tool_result', tool_use_id: block.id, content: 'Error: missing url', is_error: true };
          const text = await fetchWithJina(url);
          return {
            type: 'tool_result',
            tool_use_id: block.id,
            content: text ? `Content of ${url}:\n\n${text}` : `Failed to fetch ${url}`,
            is_error: !text
          };
        }));
        messages.push({ role: 'user', content: results });
      } else {
        break;
      }
    }

    console.log(`[research-category] ${category} research took ${Date.now() - t0}ms`);

    const synthesisPrompt = `Based on your research, return ONLY the JSON for the "${category}" category. No prose, no markdown fences.

LENGTH LIMITS: "value": max 20 words (addresses/names/URLs may be longer). "assumptionNote": max 20 words. "source": one URL, "web_search:<q>", "estimate", "training_knowledge", or null.

JSON RULES: ASCII straight quotes only. Escape literal " as \\". Escape \\ as \\\\. No literal newlines inside strings. No trailing commas. No markdown fences.

TWO valid shapes:
COMPACT: { "value": "...", "source": "...", "confidence": "high|medium|low" }
FULL (assumption only): { "value": "...", "assumption": true, "assumptionNote": "...", "source": "estimate", "confidence": "medium|low" }

Return exactly this structure:
{
  "${category}": {
${fieldKeys}
  }
}`;

    messages.push({ role: 'user', content: synthesisPrompt });

    const tSynth = Date.now();
    const synthResponse = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages
    });
    console.log(`[research-category] ${category} synthesis took ${Date.now() - tSynth}ms, total ${Date.now() - t0}ms`);

    const raw = synthResponse.content.map(b => b.text || '').join('');
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(cleaned);
    const result = parsed[category] ?? parsed;

    return res.status(200).json({ category, result });
  } catch (err) {
    console.error(`[research-category] ${category} error:`, err.message);
    return res.status(200).json({ category, result: {} });
  }
}
