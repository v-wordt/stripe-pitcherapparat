import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const SHARED_SECRET = process.env.SHARED_SECRET;
const MODEL = 'claude-sonnet-4-6';
const MAX_TURNS = 5;
const WEB_SEARCH_TOOL = { type: 'web_search_20250305', name: 'web_search', max_uses: 3 };

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
    const fieldList = fieldList_arr.map(f => `  - ${f}`).join('\n') || '  (research all standard fields for this category)';
    const fieldKeys = fieldList_arr.map(f => `    "${f}": { ... }`).join(',\n') || `    "<field>": { ... }`;

    const systemPrompt = `You are a B2B prospect research analyst. Use web_search to find information about "${company}", then return ONLY a JSON object for the fields listed below. No prose, no markdown fences.

Decision ladder (apply per field):
1. Direct evidence from a search result → confidence: "high", source: "web_search:<your query>". COMPACT shape.
2. Reasoned estimate from related signals → assumption: true, assumptionNote ≤20 words, confidence: "medium"|"low", source: "estimate". FULL shape.
3. Last resort only → value: "Nicht öffentlich verfügbar", confidence: "low", source: null. Must be rare.

JSON rules: ASCII straight double quotes only. Escape literal " inside strings as \\". No trailing commas. No markdown.

COMPACT shape (use when assumption is false):
{ "value": "...", "source": "web_search:<query>|training_knowledge|null", "confidence": "high|medium|low" }

FULL shape (use only when assumption is true):
{ "value": "...", "assumption": true, "assumptionNote": "...", "source": "estimate", "confidence": "medium|low" }

After your research, return exactly this structure and nothing else:
{
  "${category}": {
${fieldKeys}
  }
}`;

    const messages = [{
      role: 'user',
      content: `Research the following fields for the company "${company}" (category: ${category}):\n\n${fieldList}\n\nSearch the web, then return the JSON.`
    }];

    let lastText = '';

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: systemPrompt,
        tools: [WEB_SEARCH_TOOL],
        messages
      });

      messages.push({ role: 'assistant', content: response.content });

      const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
      if (text) lastText = text;

      if (response.stop_reason === 'end_turn') break;
      // pause_turn = web search in progress; continue loop (no user message needed)
    }

    console.log(`[research-category] ${category} [${fields.join(', ')}] took ${Date.now() - t0}ms`);

    const cleaned = lastText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(cleaned);
    const result = parsed[category] ?? parsed;

    return res.status(200).json({ category, result });
  } catch (err) {
    console.error(`[research-category] ${category} error:`, err.message);
    return res.status(500).json({ error: err.message });
  }
}
