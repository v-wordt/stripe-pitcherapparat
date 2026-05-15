import { runGroundedJson, MODEL_RESEARCH } from './_lib/research-core.js';

const SHARED_SECRET = process.env.SHARED_SECRET;

const ANCHOR_SYSTEM = `You are a B2B prospect research analyst. You are given only a company name. Your job is to identify the real legal entity behind it and establish its authoritative identity facts.

MANDATORY PROCESS:
1. Use web_search to find the company's official primary website (the company-controlled domain, not an aggregator, directory, or LinkedIn).
2. Use web_search to find the company's IMPRESSUM / legal notice, its Handelsregister entry, and its Wikipedia page (DE and EN). For German/Austrian/Swiss companies the impressum is legally required and is the authoritative source for the registered address, legal form, and managing directors.
3. Specifically search for the registered head-office address — e.g. "<company> Impressum Adresse", "<company> Handelsregister", "<company> Hauptsitz". Do not stop until you have a street-level address from a citable source.

SOURCING RULE (strict): Every value MUST carry the exact source URL of the page that stated it. Uncited model knowledge is NEVER an acceptable source. If after genuine searching a fact cannot be sourced, mark it "Nicht öffentlich verfügbar" with source null — but for official name, address, and legal form this should essentially never happen for a real company.`;

const ANCHOR_INSTRUCTION = `After searching, return ONLY this JSON object. No prose, no markdown fences.

JSON rules: straight ASCII double quotes only; escape literal " inside strings as \\"; escape \\ as \\\\; no literal newlines inside string values; no trailing commas.

Each field uses this shape:
{ "value": "...", "source": "<exact source URL>|null", "confidence": "high|medium|low" }

Use confidence "high" only when the value comes directly from a citable URL. Use "Nicht öffentlich verfügbar" with source null and confidence "low" only as a genuine last resort.

{
  "officialName": "<official legal name, e.g. Zalando SE>",
  "website": "<official primary domain as absolute URL, e.g. https://www.zalando.de>",
  "anchor": {
    "Firmenname (Rufname)": { "value": "...", "source": "...", "confidence": "..." },
    "Firmenname (offiziell, wie im Handelsregister etc.)": { "value": "...", "source": "...", "confidence": "..." },
    "Adresse Hauptsitz (Strasse, Nr., PLZ, Stadt, Ort, Bundesland/Kanton, Land)": { "value": "...", "source": "...", "confidence": "..." },
    "Webseite (als Link zur Landing Page, können mehrere Links sein)": { "value": "...", "source": "...", "confidence": "..." },
    "Gründungsjahr, Fusionsjahr, etc.": { "value": "...", "source": "...", "confidence": "..." },
    "Rechtsform (GmbH, AG, UG, etc.)": { "value": "...", "source": "...", "confidence": "..." }
  }
}`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-valantic-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!SHARED_SECRET || req.headers['x-valantic-secret'] !== SHARED_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { company } = req.body || {};
  if (!company) return res.status(400).json({ error: 'company required' });

  try {
    const t0 = Date.now();
    const userMessage = `Company name: "${company}"

Identify the real legal entity, resolve its official primary website, and establish its authoritative identity anchors (official name, registered head-office address, legal form, founding year). Search the impressum / Handelsregister / Wikipedia specifically for the address and legal form.`;

    const parsed = await runGroundedJson({
      model: MODEL_RESEARCH,
      system: ANCHOR_SYSTEM,
      userMessage,
      instruction: ANCHOR_INSTRUCTION,
      maxTokens: 2048
    });
    console.log(`[research-seed] "${company}" took ${Date.now() - t0}ms`);

    return res.status(200).json({
      company,
      officialName: parsed.officialName || company,
      website: parsed.website || null,
      anchor: parsed.anchor || {}
    });
  } catch (err) {
    const status = Number.isInteger(err?.status) ? err.status : 500;
    console.error(`[research-seed] "${company}" error (${status}):`, err.message);
    return res.status(status).json({ error: err.message, status });
  }
}
