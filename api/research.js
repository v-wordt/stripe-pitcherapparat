import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const SHARED_SECRET = process.env.SHARED_SECRET;

const GOOGLE_SHEET_ID = '1Okk8GvpMxNpAimn6Z1Dkt2lAzj3Qd8IM';
const GOOGLE_PROSPECT_PROFILE_GID = '886669856';

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
    return text.slice(0, 6000);
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

function buildResearchPrompt(company, website, fields, websiteContent, searchContent) {
  const fieldStr = fields
    .map(f => `- ${f.field}`)
    .join('\n');

  return `You are a B2B prospect researcher. Your job is to fill in a company profile using all available sources below.

Company: ${company}
Website: ${website}

${websiteContent ? `--- WEBSITE CONTENT ---\n${websiteContent}\n` : ''}
${searchContent ? `--- WEB SEARCH RESULTS ---\n${searchContent}\n` : ''}

Fill in every field using the sources above. For fields not covered in the sources, use your training knowledge to provide a reasonable estimate. Only write "Nicht öffentlich verfügbar" when you have truly no basis to estimate — this should be rare.

Fields to fill (grouped by category):
${fieldStr}

Output ONLY valid JSON, no explanation. Use this exact structure:
{
  "Grundinformationen": {
    "Firmenname (Rufname)": { "value": "...", "assumption": false, "assumptionNote": null },
    ...
  },
  "Geschäftstätigkeit": { ... },
  "Grösse und Struktur": { ... },
  "Produkte & Services": { ... },
  "Finanzierung & Wachstum": { ... },
  "Markt & Wettbewerb": { ... },
  "Technologie & Infrastructure": { ... },
  "Signale": { ... }
}

Rules:
- Prefer factual values from the website and search results
- For estimates: set assumption:true and write a short assumptionNote explaining the basis
- Only use "Nicht öffentlich verfügbar" when truly unknown with no basis to estimate
- Be concise: max 1-2 sentences per field value
`;
}

function buildRefinementPrompt(currentProfile, message, fetchedContent) {
  const profileStr = JSON.stringify(currentProfile, null, 2);

  return `You are refining a prospect research profile. Given the current profile, user feedback, and optional URL content, return ONLY the fields that changed.

Current profile:
${profileStr}

User feedback:
${message}

${fetchedContent ? `URL content provided by user:\n${fetchedContent}\n` : ''}

Return ONLY a partial JSON with ONLY the fields that need updating, using the same nested structure. For fields not mentioned, omit them entirely.

Example response:
{
  "Geschäftstätigkeit": {
    "Kerngeschäft": { "value": "...", "assumption": false, "assumptionNote": null }
  }
}

Do NOT include unchanged fields. Return only changed ones.`;
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
      // Refinement flow — use legacy fetch for user-provided URLs
      let fetchedContent = null;
      if (url) {
        fetchedContent = await fetchWithJina(url) || await fetchAndCleanURL(url);
      }

      const prompt = buildRefinementPrompt(profile, message, fetchedContent);
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      });

      const text = msg.content[0].text || '';
      const updates = JSON.parse(text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim());
      const merged = mergeProfiles(profile, updates);

      return res.status(200).json({ profile: merged });
    } else {
      // Initial research flow
      if (!company || !website) {
        return res.status(400).json({ error: 'company and website required' });
      }

      // Fetch profile fields, website content via Jina Reader, and web search results — all in parallel
      const [fields, websiteContent, searchContent] = await Promise.all([
        fetchProfileFields(),
        fetchWithJina(website),
        searchWithJina(`${company} Adresse Umsatz Mitarbeiter Produkte Services`)
      ]);

      const prompt = buildResearchPrompt(company, website, fields, websiteContent, searchContent);

      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      });

      const text = msg.content[0].text || '';
      const researchedProfile = JSON.parse(text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim());

      return res.status(200).json({ profile: researchedProfile });
    }
  } catch (err) {
    console.error('Research error:', err);
    return res.status(500).json({ error: err.message });
  }
}
