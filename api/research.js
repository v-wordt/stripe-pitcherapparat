import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const SHARED_SECRET = process.env.SHARED_SECRET;

const GOOGLE_SHEET_ID = '1Okk8GvpMxNpAimn6Z1Dkt2lAzj3Qd8IM';
const GOOGLE_PROSPECT_PROFILE_GID = '886669856';

const MODEL_RESEARCH = 'claude-opus-4-7';
const MODEL_REFINE = 'claude-haiku-4-5-20251001';
const LOOP_BUDGET = 6;
const FETCH_CHAR_CAP = 8000;

async function fetchProfileFields() {
  const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/export?format=csv&gid=${GOOGLE_PROSPECT_PROFILE_GID}`;
  const res = await fetch(url);
  const text = await res.text();

  const lines = text.trim().split('\n').map(l => l.split(','));
  const fields = [];

  for (let i = 1; i < lines.length; i++) {
    const [, info, typ] = lines[i];
    if (info && info.trim()) {
      fields.push({
        field: info.trim().replace(/^"(.+)"$/, '$1'),
        category: typ ? typ.trim().replace(/^"(.+)"$/, '$1') : null
      });
    }
  }

  return fields;
}

// Jina Reader: renders JavaScript, returns clean readable text from any URL
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

// Jina Search: real web search, returns top results as text
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

// Legacy fallback: raw HTML strip (used for user-provided URLs in refinement)
async function fetchAndCleanURL(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const html = await res.text();
    const text = html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000);
    return text;
  } catch {
    return null;
  }
}

const RESEARCH_DOCTRINE = `You are a B2B prospect research analyst. The website link you receive is a starting anchor, not the answer. Your job is to research broadly across the public web before drawing conclusions.

Source priority:
1. Company-controlled pages: homepage, /impressum, /about, /investors, /press, /careers.
2. Authoritative third parties: Wikipedia (DE+EN), Handelsregister, regulatory filings, named press (Handelsblatt, FAZ, Reuters, Bloomberg, NZZ, etc.), industry analyst reports.
3. Lower-tier signals: LinkedIn, Crunchbase, news aggregators.

Decision ladder, applied per field:
1. Direct evidence. If a source above states the value, use it. confidence: "high", source: <url>.
2. Reasoned estimate. No direct evidence after thorough searching → derive an estimate from related signals (headcount from LinkedIn employee count; revenue from headcount × industry benchmark; transaction volume from product type + customer base). Set assumption: true, write a clear assumptionNote explaining the inference, confidence: "medium" or "low".
3. Last resort only. If even a defensible estimate is impossible → value: "Nicht öffentlich verfügbar", confidence: "low", source: null. THIS MUST BE RARE — falling back here for fields like address, headcount, or revenue is a research failure, not an honest "don't know".

Process:
- Use web_search to discover candidate sources for fields you don't yet have evidence for.
- Use fetch_url to read promising pages (impressum for address, Wikipedia for history/funding, press pages for recent signals, etc.).
- After each tool round, mentally check which Prospect Profile fields are still empty or weak, and search/fetch specifically for those gaps.
- Stop researching when you have credible coverage of every field — then synthesise.
- For German companies, /impressum is mandatory and contains the registered address, legal form, and managing directors. Always fetch it if you don't already have those fields.`;

function fieldListString(fields) {
  const grouped = {};
  for (const f of fields) {
    const cat = f.category || 'Uncategorized';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(f.field);
  }
  return Object.entries(grouped)
    .map(([cat, items]) => `${cat}:\n${items.map(i => `  - ${i}`).join('\n')}`)
    .join('\n\n');
}

function buildSeedUserMessage(company, website, fields, websiteContent, searchDe, searchEn) {
  return `Company: ${company}
Website (anchor only — do not stop here): ${website}

PRELIMINARY FINDINGS (seed dump — extend with web_search and fetch_url as needed)

--- HOMEPAGE (via Jina Reader) ---
${websiteContent || '(homepage fetch failed — investigate via web_search)'}

--- WEB SEARCH (DE) ---
${searchDe || '(search failed)'}

--- WEB SEARCH (EN) ---
${searchEn || '(search failed)'}

--- FIELDS TO POPULATE ---
${fieldListString(fields)}

Begin researching. Use web_search and fetch_url to fill every field per the decision ladder.`;
}

function buildSynthesisPrompt() {
  return `Based on everything you've researched, return ONLY the structured JSON profile for the 8 categories below. No further tool calls. No prose. No markdown fences.

LENGTH LIMITS (strict — exceeding these will break the consumer):
- "value": max 20 words. Addresses, names, and URLs may be longer; everything else must be terse.
- "assumptionNote": max 20 words.
- "source": a single URL, "web_search:<q>", "estimate", "training_knowledge", or null. Never a sentence.

JSON OUTPUT RULES (critical):
- Use straight ASCII double quotes only — never typographic quotes ("" '' „").
- Escape every literal " inside a string value as \\" — German company taglines often contain them.
- Escape every literal \\ as \\\\.
- Never include literal newlines inside a string value — use a space instead.
- No trailing commas. No comments. No markdown fences.

DECISION LADDER (per field):
1. Direct evidence → confidence: "high", source: "<url>". Use the COMPACT shape (no assumption fields).
2. Reasoned estimate → use the FULL shape with assumption: true, terse assumptionNote, confidence: "medium" or "low", source: "estimate".
3. Last resort: { "value": "Nicht öffentlich verfügbar", "source": null, "confidence": "low" }. Use rarely.

TWO valid shapes per field — choose based on the ladder above:

COMPACT (use this whenever assumption is false — most fields):
{ "value": "...", "source": "<url>|web_search:<q>|training_knowledge|null", "confidence": "high|medium|low" }

FULL (use this only when assumption is true):
{ "value": "...", "assumption": true, "assumptionNote": "<≤20 words>", "source": "estimate", "confidence": "medium|low" }

Top-level structure (8 categories, with the German field names from the field list as keys inside each category):
{
  "Grundinformationen": { ... },
  "Geschäftstätigkeit": { ... },
  "Grösse und Struktur": { ... },
  "Produkte & Services": { ... },
  "Finanzierung & Wachstum": { ... },
  "Markt & Wettbewerb": { ... },
  "Technologie & Infrastructure": { ... },
  "Signale": { ... }
}`;
}

const FETCH_URL_TOOL = {
  name: 'fetch_url',
  description: 'Fetch the readable text of a URL via Jina Reader. Use for company subpages (/impressum, /about, /investors, /press, /careers), Wikipedia (DE+EN), news articles, filings, and press releases. Returns up to ~8000 chars of clean text.',
  input_schema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'Absolute URL to fetch' }
    },
    required: ['url']
  }
};

const WEB_SEARCH_TOOL = { type: 'web_search_20250305', name: 'web_search', max_uses: 10 };

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
  return {
    type: 'tool_result',
    tool_use_id: block.id,
    content: `Unknown tool: ${block.name}`,
    is_error: true
  };
}

async function runAgenticResearch(company, website, fields, seedInputs) {
  const { websiteContent, searchDe, searchEn } = seedInputs;

  const messages = [{
    role: 'user',
    content: buildSeedUserMessage(company, website, fields, websiteContent, searchDe, searchEn)
  }];

  let useWebSearch = true;

  for (let turn = 0; turn < LOOP_BUDGET; turn++) {
    const tools = useWebSearch ? [WEB_SEARCH_TOOL, FETCH_URL_TOOL] : [FETCH_URL_TOOL];

    let response;
    try {
      response = await client.messages.create({
        model: MODEL_RESEARCH,
        max_tokens: 4096,
        system: RESEARCH_DOCTRINE,
        tools,
        messages
      });
    } catch (err) {
      if (useWebSearch && isInvalidToolError(err)) {
        console.warn('web_search rejected — degrading to fetch-only:', err.message);
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

    if (toolUses.length === 0) break;

    messages.push({ role: 'assistant', content: response.content });

    const customToolUses = toolUses.filter(b => b.name === 'fetch_url');
    if (customToolUses.length > 0) {
      const results = await Promise.all(customToolUses.map(executeToolUse));
      messages.push({ role: 'user', content: results });
    } else {
      // Only server-side web_search calls in this turn — server already injected
      // results into response.content; loop again to let Claude react.
    }
  }

  // Force synthesis — no tools available
  messages.push({ role: 'user', content: buildSynthesisPrompt() });

  const synthResponse = await client.messages.create({
    model: MODEL_RESEARCH,
    max_tokens: 16000,
    system: RESEARCH_DOCTRINE,
    messages
  });

  return parseSynthesisJson(synthResponse);
}

function parseSynthesisJson(response) {
  const text = response.content.map(b => b.text || '').join('');
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const stopReason = response.stop_reason || 'unknown';
    const len = cleaned.length;
    const tail = cleaned.slice(Math.max(0, len - 300));
    console.error(`Synthesis parse failed. stop_reason=${stopReason} length=${len}. Last 300 chars:\n${tail}`);

    if (stopReason === 'max_tokens') {
      throw new Error(`Synthesis hit max_tokens cap (output ${len} chars). Raise max_tokens or constrain the schema further.`);
    }
    // stop_reason was end_turn but JSON is invalid → bad escaping or stray char from the model
    throw new Error(`Synthesis returned invalid JSON (stop_reason=${stopReason}, ${len} chars). Likely an unescaped quote or stray character. Original parse error: ${err.message}`);
  }
}

// Single-call fallback if the agentic loop fails entirely
async function fallbackSinglePass(company, website, fields, seedInputs) {
  const { websiteContent, searchDe, searchEn } = seedInputs;
  const prompt = `${buildSeedUserMessage(company, website, fields, websiteContent, searchDe, searchEn)}

${buildSynthesisPrompt()}`;

  const msg = await client.messages.create({
    model: MODEL_RESEARCH,
    max_tokens: 16000,
    system: RESEARCH_DOCTRINE,
    messages: [{ role: 'user', content: prompt }]
  });
  return parseSynthesisJson(msg);
}

function buildRefinementPrompt(currentProfile, message, fetchedContent) {
  return `You are refining a prospect research profile. Given the current profile, user feedback, and optional URL content, return ONLY the fields that changed.

Current profile:
${JSON.stringify(currentProfile, null, 2)}

User feedback:
${message}

${fetchedContent ? `URL content provided by user:\n${fetchedContent}\n` : ''}

Decision ladder for any field you touch:
1. Direct evidence in the URL content or current profile → confidence: "high", source: "<url>", COMPACT shape (no assumption fields).
2. Reasoned estimate from related signals → FULL shape with assumption: true, terse assumptionNote (≤20 words), confidence: "medium" or "low", source: "estimate".
3. ONLY use "Nicht öffentlich verfügbar" if a defensible estimate is impossible — this should be rare.

JSON output rules: ASCII straight quotes only, escape literal " as \\" inside string values, escape \\ as \\\\, no literal newlines inside strings, no trailing commas, no markdown fences.

Two valid shapes per field:
- COMPACT: { "value": "...", "source": "<url>|web_search:<q>|training_knowledge|null", "confidence": "high|medium|low" }
- FULL (only when assumption true): { "value": "...", "assumption": true, "assumptionNote": "...", "source": "estimate", "confidence": "medium|low" }

Return ONLY a partial JSON with the fields that need updating, using the same nested structure. Do NOT include unchanged fields.

Example:
{
  "Geschäftstätigkeit": {
    "Kerngeschäft": { "value": "...", "source": "https://...", "confidence": "high" }
  }
}`;
}

function mergeProfiles(current, updates) {
  const merged = JSON.parse(JSON.stringify(current));
  for (const category in updates) {
    if (!merged[category]) merged[category] = {};
    for (const field in updates[category]) {
      merged[category][field] = updates[category][field];
    }
  }
  return merged;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-valantic-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!SHARED_SECRET || req.headers['x-valantic-secret'] !== SHARED_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { company, website, profile, message, url } = req.body || {};

  try {
    const isRefine = profile !== undefined && message !== undefined;

    if (isRefine) {
      let fetchedContent = null;
      if (url) {
        fetchedContent = await fetchWithJina(url) || await fetchAndCleanURL(url);
      }

      const prompt = buildRefinementPrompt(profile, message, fetchedContent);
      const msg = await client.messages.create({
        model: MODEL_REFINE,
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      });

      const text = msg.content[0].text || '';
      const updates = JSON.parse(text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim());
      const merged = mergeProfiles(profile, updates);

      return res.status(200).json({ profile: merged });
    }

    if (!company || !website) {
      return res.status(400).json({ error: 'company and website required' });
    }

    const [fields, websiteContent, searchDe, searchEn] = await Promise.all([
      fetchProfileFields(),
      fetchWithJina(website),
      searchWithJina(`${company} Wikipedia Impressum Geschäftsbericht Adresse Mitarbeiter`),
      searchWithJina(`${company} company news funding revenue employees products`)
    ]);

    const seedInputs = { websiteContent, searchDe, searchEn };

    let researchedProfile;
    try {
      researchedProfile = await runAgenticResearch(company, website, fields, seedInputs);
    } catch (err) {
      console.error('Agentic research failed, falling back to single pass:', err);
      researchedProfile = await fallbackSinglePass(company, website, fields, seedInputs);
    }

    return res.status(200).json({ profile: researchedProfile });
  } catch (err) {
    console.error('Research error:', err);
    return res.status(500).json({ error: err.message });
  }
}
