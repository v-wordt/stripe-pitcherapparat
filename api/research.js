import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const SHARED_SECRET = process.env.SHARED_SECRET;
const MODEL_REFINE = 'claude-haiku-4-5-20251001';

// Initial prospect research now lives in /api/research-seed + /api/research-category
// (web_search-grounded). This endpoint only handles profile refinement.

// Raw HTML strip for an optional user-provided URL during refinement.
async function fetchAndCleanURL(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const html = await res.text();
    return html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000);
  } catch {
    return null;
  }
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

Uncited model knowledge is never an acceptable source — there is no "training_knowledge" option.

JSON output rules: ASCII straight quotes only, escape literal " as \\" inside string values, escape \\ as \\\\, no literal newlines inside strings, no trailing commas, no markdown fences.

Two valid shapes per field:
- COMPACT: { "value": "...", "source": "<url>|null", "confidence": "high|medium|low" }
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

  const { profile, message, url } = req.body || {};

  try {
    if (profile === undefined || message === undefined) {
      return res.status(400).json({ error: 'profile and message required' });
    }

    let fetchedContent = null;
    if (url) fetchedContent = await fetchAndCleanURL(url);

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
  } catch (err) {
    console.error('Research refine error:', err);
    return res.status(500).json({ error: err.message });
  }
}
