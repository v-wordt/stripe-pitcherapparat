import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const SHARED_SECRET = process.env.SHARED_SECRET;
const MODEL = 'claude-haiku-4-5-20251001';

async function searchWithJina(query) {
  try {
    const res = await fetch(`https://s.jina.ai/${encodeURIComponent(query)}`, {
      headers: { 'Accept': 'text/plain' },
      signal: AbortSignal.timeout(20000)
    });
    if (!res.ok) return null;
    return (await res.text()).slice(0, 6000);
  } catch {
    return null;
  }
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

  const { company, category, fields } = req.body || {};
  if (!company || !category) {
    return res.status(400).json({ error: 'company and category required' });
  }
  const fieldList_arr = Array.isArray(fields) ? fields : [];

  try {
    const t0 = Date.now();

    const searchResults = await searchWithJina(`"${company}" ${category}`);

    const fieldList = fieldList_arr.map(f => `  - ${f}`).join('\n') || '  (research all standard fields for this category)';
    const fieldKeys = fieldList_arr.map(f => `    "${f}": { ... }`).join(',\n') || `    "<field>": { ... }`;

    const systemPrompt = `You are a B2B prospect research analyst. Extract information from the search results provided and return ONLY a JSON object for the fields listed. No prose, no markdown fences.

Decision ladder (apply per field):
1. Direct evidence from search results → use the exact URL from the search result as "source" (e.g. "https://www.zalando.de/impressum"). confidence: "high". COMPACT shape.
2. Reasoned estimate from signals in the search results → assumption: true, assumptionNote ≤20 words, confidence: "medium"|"low", source: "estimate". FULL shape.
3. Training knowledge only (no supporting search result) → source: "training_knowledge", confidence: "medium"|"low". COMPACT shape.
4. Last resort only → value: "Nicht öffentlich verfügbar", confidence: "low", source: null. Must be rare.

SOURCE RULE: The search results contain URLs. Always prefer a real URL over "training_knowledge". Extract the URL of the page that gave you the evidence and use it as "source".

JSON rules: ASCII straight double quotes only. Escape literal " inside strings as \\". No trailing commas. No markdown.

COMPACT shape (use when assumption is false):
{ "value": "...", "source": "https://example.com/page|training_knowledge|null", "confidence": "high|medium|low" }

FULL shape (use only when assumption is true):
{ "value": "...", "assumption": true, "assumptionNote": "...", "source": "estimate", "confidence": "medium|low" }

Return exactly this structure and nothing else:
{
  "${category}": {
${fieldKeys}
  }
}`;

    const userMessage = `Company: "${company}", Category: "${category}"

SEARCH RESULTS:
${searchResults || '(no search results available — use training knowledge)'}

Extract these fields:
${fieldList}

Return the JSON now.`;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    });

    const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
    console.log(`[research-category] ${category} took ${Date.now() - t0}ms`);

    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(cleaned);
    const result = parsed[category] ?? parsed;

    return res.status(200).json({ category, result });
  } catch (err) {
    console.error(`[research-category] ${category} error:`, err.message);
    return res.status(500).json({ error: err.message });
  }
}
