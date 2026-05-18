import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const SHARED_SECRET = process.env.SHARED_SECRET;

// ── INTELLIGENCE ──────────────────────────────────────────────────────────
// valantic implementation references — top 3 used in Mapping Draft prompts
const INTELLIGENCE = {
  references: [
    { client: "DATEV", display: "DATEV", nda: false, metric: "AI roadmap + shared vision", description: "Developed shared AI vision and strategy for DATEV's internal IT including use case clustering, strategic roadmap and stakeholder alignment workshops.", industry: "Software", service: "AI North Star" },
    { client: "Siemens Energy", display: "Siemens Energy", nda: false, metric: "KPI impact in 6 weeks", description: "6-week impact increments to discover, build and scale AI-supported process enhancements across KPI-critical business areas.", industry: "Energy", service: "AI North Star / Process AI" },
    { client: "JUMO", display: "JUMO", nda: false, metric: "119 use cases identified, 3 in production by year-end", description: "Business-oriented AI strategy with governance model — 119 use cases identified, 12 prioritised, 3 selected for production.", industry: "Manufacturing", service: "AI North Star" },
  ]
};

function profileToProse(profile) {
  const SKIP_VALUE = 'Nicht öffentlich verfügbar';
  const lines = [];
  for (const [category, fields] of Object.entries(profile)) {
    if (!fields || typeof fields !== 'object') continue;
    const fieldLines = [];
    for (const [fieldName, fieldData] of Object.entries(fields)) {
      const val = fieldData?.value;
      if (val == null || val === SKIP_VALUE) continue;
      fieldLines.push(`  ${fieldName}: ${val}`);
    }
    if (fieldLines.length === 0) continue;
    lines.push(`${category}:`);
    lines.push(...fieldLines);
  }
  return lines.join('\n');
}

function buildMappingPrompt(profile) {
  // Extract company name for header
  const grundinfo = profile['Grundinformationen'] || {};
  const company = grundinfo['Firmenname (Rufname)']?.value || 'Prospect';

  // Top 3 valantic references for credibility
  const safeRefs = INTELLIGENCE.references.filter(r => r.nda !== 'full');
  const refsStr = safeRefs.map(r =>
    `- ${r.display} (${r.industry}): ${r.metric} — ${r.description}`
  ).join('\n');

  return `You are a B2B sales strategist mapping prospect pains to Stripe + valantic solution blocks. Be extremely concise — every string value max 15 words.

Prospect Profile: ${company}

Prospect Profile Details:
${profileToProse(profile)}

valantic implementation track record:
${refsStr}

Output ONLY valid JSON, no markdown, no explanation:
{
  "prospect_snapshot": {
    "core_business": "industry + service + markets (max 10 words)",
    "size_scale": "headcount + revenue estimate (max 8 words)",
    "business_model": "B2B/B2C + pricing type (max 8 words)",
    "current_payment_stack": "current PSP(s) if known, else 'unknown' (max 8 words)",
    "strategic_signals": "1 key recent signal (max 10 words)"
  },
  "pain_solution_blocks": [
    {
      "block_name": "3-5 word theme",
      "prospect_situation": "1 sentence pain in prospect language (max 15 words)",
      "stripe_answer": "Stripe product(s) + 1-line how (max 12 words)",
      "fit": "High",
      "rationale": "1 sentence why this fits (max 12 words)",
      "pitch_angle": "4-6 word headline"
    }
  ],
  "narrative": {
    "headline_message": "1 sentence: Stripe + valantic value for this prospect (max 15 words)",
    "headline_highlight": "2-3 words from headline to highlight",
    "top_3_priorities": ["block_name_1", "block_name_2", "block_name_3"],
    "de_emphasize": []
  },
  "open_items": ["1 internal clarifying question?"],
  "next_step": "1-2 sentences on next action (max 20 words)",
  "cta_label": "4-6 words"
}

Rules: 3 pain blocks only. Fit = High/Medium/Low. Never name competitors. Ground claims in prospect profile.`;
}

function buildMappingRefinementPrompt(currentMapping, message) {
  const mappingStr = JSON.stringify(currentMapping, null, 2);

  return `You are refining a Mapping Draft. Given the current mapping, user feedback, return ONLY the fields that changed.

Current mapping:
${mappingStr}

User feedback:
${message}

Return ONLY a partial JSON with ONLY the fields that need updating, using the same nested structure. For fields not mentioned, omit them entirely.

Example response:
{
  "pain_solution_blocks": [
    {
      "block_name": "Updated block name",
      "prospect_situation": "Updated situation"
    }
  ]
}

Do NOT include unchanged fields. Return only changed ones.`;
}

function mergeMapping(current, updates) {
  const merged = JSON.parse(JSON.stringify(current));
  for (const category in updates) {
    if (category === 'pain_solution_blocks' && Array.isArray(updates[category])) {
      // Special handling: merge updates by index, or append new blocks
      updates[category].forEach((update, idx) => {
        if (merged[category] && merged[category][idx]) {
          Object.assign(merged[category][idx], update);
        } else {
          if (!merged[category]) merged[category] = [];
          merged[category].push(update);
        }
      });
    } else if (typeof updates[category] === 'object' && !Array.isArray(updates[category])) {
      if (!merged[category]) merged[category] = {};
      Object.assign(merged[category], updates[category]);
    } else {
      merged[category] = updates[category];
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

  const { profile, mapping, message } = req.body || {};

  try {
    const isRefine = mapping !== undefined && message !== undefined;

    if (isRefine) {
      // Refinement flow
      const prompt = buildMappingRefinementPrompt(mapping, message);
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      });

      const text = msg.content[0].text || '';
      const updates = JSON.parse(text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim());
      const merged = mergeMapping(mapping, updates);

      return res.status(200).json({ mapping: merged });
    } else {
      // Initial generation flow
      if (!profile) {
        return res.status(400).json({ error: 'profile required' });
      }

      const prompt = buildMappingPrompt(profile);
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      });

      const text = msg.content[0].text || '';
      const mapping = JSON.parse(text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim());

      return res.status(200).json({ mapping });
    }
  } catch (err) {
    console.error('Mapping error:', err);
    return res.status(500).json({ error: err.message });
  }
}
