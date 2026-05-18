import { runGroundedJson, MODEL_RESEARCH, MODEL_LIGHT } from './_lib/research-core.js';

const SHARED_SECRET = process.env.SHARED_SECRET;

// Hybrid model split to fit Vercel's 60s cap: heavy categories need Sonnet's
// reasoning/extraction; light ones run fine (and faster) on Haiku. Unknown or
// custom categories default to Sonnet (safe).
const CATEGORY_MODEL = {
  'Finanzierung & Wachstum': MODEL_RESEARCH,
  'Markt & Wettbewerb': MODEL_RESEARCH,
  'Signale': MODEL_RESEARCH,
  'Grösse und Struktur': MODEL_RESEARCH,
  'Grundinformationen': MODEL_LIGHT,
  'Geschäftstätigkeit': MODEL_LIGHT,
  'Produkte & Services': MODEL_LIGHT,
  'Technologie & Infrastructure': MODEL_LIGHT,
  'Online-Touchpoints': MODEL_LIGHT,
};

function buildSystemPrompt() {
  return `You are a B2B prospect research analyst. Research the requested category for the given company using web_search, then return ONLY a JSON object for the listed fields.

MANDATORY PROCESS:
- Use web_search to find evidence for each field. Search company-controlled pages (homepage, /impressum, /about, /investors, /press, /careers), then authoritative third parties (Wikipedia DE+EN, Handelsregister, regulatory filings, named press: Handelsblatt, FAZ, Reuters, Bloomberg, NZZ), then lower-tier signals (LinkedIn, Crunchbase, news).
- After searching, check which fields are still empty or weak and search specifically for those gaps before answering.

DECISION LADDER (apply per field):
1. Direct evidence — a search result states the value. source MUST be the exact URL of that page. confidence: "high". COMPACT shape.
2. Reasoned estimate — no direct source after genuine searching, but related cited signals support an inference (e.g. headcount from LinkedIn, revenue from headcount x industry benchmark). assumption: true, terse assumptionNote, source: "estimate", confidence: "medium"|"low". FULL shape.
3. Last resort — even a defensible estimate is impossible: value: "Nicht öffentlich verfügbar", source: null, confidence: "low".

ABSOLUTE SOURCING RULE: Uncited model knowledge is NEVER an acceptable source. There is no "training_knowledge" option. If you have no citation you MUST run web_search; only after genuine search failure may you estimate (source "estimate") or mark the field unavailable. Every "high" confidence value must have a real URL as its source.

JSON rules: straight ASCII double quotes only; escape literal " inside strings as \\"; escape \\ as \\\\; no literal newlines inside string values; no trailing commas; no markdown fences.

COMPACT shape (assumption false):
{ "value": "...", "source": "https://exact-source-url|null", "confidence": "high|medium|low" }

FULL shape (assumption true only):
{ "value": "...", "assumption": true, "assumptionNote": "<=20 words", "source": "estimate", "confidence": "medium|low" }

Length limits: "value" max 25 words (addresses, names, URLs may be longer); "assumptionNote" max 20 words.`;
}

function anchorBlock(anchor) {
  if (!anchor || typeof anchor !== 'object' || Object.keys(anchor).length === 0) return '';
  const lines = Object.entries(anchor)
    .map(([k, v]) => `  - ${k}: ${v && v.value ? v.value : '(unknown)'}${v && v.source ? ` [source: ${v.source}]` : ''}`)
    .join('\n');
  return `\nVERIFIED IDENTITY ANCHORS (already researched — treat as authoritative, stay consistent with these, do not contradict them):\n${lines}\n`;
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

  const { company, website, anchor, category, fields, modelHint, searchMaxUses } = req.body || {};
  if (!company || !category) {
    return res.status(400).json({ error: 'company and category required' });
  }
  const fieldList_arr = Array.isArray(fields) ? fields : [];

  try {
    const t0 = Date.now();

    const fieldList = fieldList_arr.map(f => `  - ${f}`).join('\n') || '  (research all standard fields for this category)';
    const fieldKeys = fieldList_arr.map(f => `    "${f}": { ... }`).join(',\n') || `    "<field>": { ... }`;

    const userMessage = `Company: "${company}"${website ? `\nOfficial website: ${website}` : ''}
Category to research: "${category}"
${anchorBlock(anchor)}
Research and extract these fields using web_search:
${fieldList}

When fetching/searching, prefer the official website and its /impressum, /about, /press, /investors subpages and authoritative third parties. For German companies the impressum is the authoritative source for address, legal form, and directors.`;

    const instruction = `After searching, return ONLY this JSON object. No prose. No markdown fences.

{
  "${category}": {
${fieldKeys}
  }
}`;

    const model = modelHint === 'light' ? MODEL_LIGHT : (CATEGORY_MODEL[category] || MODEL_RESEARCH);
    const maxTokens = Math.min(3000, 400 + fieldList_arr.length * 350);

    const parsed = await runGroundedJson({
      model,
      system: buildSystemPrompt(),
      userMessage,
      instruction,
      maxTokens,
      searchMaxUses: typeof searchMaxUses === 'number' ? searchMaxUses : undefined
    });
    console.log(`[research-category] ${category} (${model}, ${fieldList_arr.length}f) took ${Date.now() - t0}ms`);

    const result = parsed[category] ?? parsed;
    return res.status(200).json({ category, result });
  } catch (err) {
    const status = Number.isInteger(err?.status) ? err.status : 500;
    console.error(`[research-category] ${category} error (${status}):`, err.message);
    return res.status(status).json({ error: err.message, status });
  }
}
