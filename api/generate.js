import Anthropic from '@anthropic-ai/sdk';
import { put, list } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const SHARED_SECRET = process.env.SHARED_SECRET;
if(!SHARED_SECRET) throw new Error('SHARED_SECRET env var not set');

// ── MCP SERVER ────────────────────────────────────────────────────────────
const MCP_URL = 'https://ca-reference-db-mcp-server.calmsky-b809d8a4.germanywestcentral.azurecontainerapps.io';
const MCP_TOKEN = process.env.MCP_AUTH_TOKEN || null;

// MCP uses JSON-RPC 2.0 over HTTP with SSE transport
async function mcpCall(method, params = {}) {
  if (!MCP_TOKEN) return null;
  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Authorization': `Bearer ${MCP_TOKEN}`
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(5000)
  });
  if (!res.ok) throw new Error(`MCP ${res.status}`);
  const text = await res.text();
  // Handle SSE response — extract JSON data line
  const jsonLine = text.split('\n').find(l => l.startsWith('data:') && l.includes('"result"'));
  if (jsonLine) {
    const parsed = JSON.parse(jsonLine.replace(/^data:\s*/, ''));
    return parsed.result;
  }
  // Try plain JSON response
  return JSON.parse(text).result || null;
}

async function fetchMCPServices(company, industry, role) {
  try {
    // 1. Discover available tools
    const tools = await mcpCall('tools/list');
    if (!tools) return null;
    console.log('MCP tools available:', (tools.tools||[]).map(t=>t.name).join(', '));

    // 2. Call the reference/services tool (adapt name based on what server exposes)
    const toolName = (tools.tools||[]).find(t =>
      t.name.toLowerCase().includes('service') ||
      t.name.toLowerCase().includes('reference') ||
      t.name.toLowerCase().includes('offering')
    )?.name;

    if (!toolName) return null;

    const result = await mcpCall('tools/call', {
      name: toolName,
      arguments: { company, industry: industry||'', role: role||'' }
    });

    if (!result) return null;
    // MCP tools/call returns { content: [{type:'text', text: '...'}] }
    const raw = result.content?.[0]?.text || JSON.stringify(result);
    const parsed = JSON.parse(raw.replace(/^```json\s*/i,'').replace(/```\s*$/,'').trim());
    return Array.isArray(parsed) ? parsed : parsed.services || null;

  } catch (e) {
    console.warn('MCP fetch failed, using intelligence fallback:', e.message);
    return null;
  }
}


// ── INTELLIGENCE ──────────────────────────────────────────────────────────
// valantic AI Services & References Intelligence
// Full portfolio — for generate.js: const INTELLIGENCE = {...}
// Last updated: April 2026

const INTELLIGENCE = {

  // ── ALL SERVICES (flat list for pitch matching) ────────────────────────
  services: [

    // PLAN — Strategy & Architecture
    { name: "AI North Star & Value Roadmap", phase: "plan", tagline: "From AI ambition to business impact", owner: "Laurenz Kirchner", cc: "vNXT", buying_center: "C-Suite, CIO, CDO, CEO", industries: ["All"], duration: "18 weeks", entry_metric: "12 prioritised use cases → 3 in production", hot: true },
    { name: "AI Maturity Assessment", phase: "plan", tagline: "Understand where you stand — hero use case identification", owner: "Laurenz Kirchner", cc: "vNXT", buying_center: "CIO, CDO", industries: ["All"], duration: "2–4 weeks", entry_metric: "Structured readiness scan, value stream mapping" },
    { name: "AI Value Quantification", phase: "plan", tagline: "CFO-ready business case for AI investment", owner: "David Hofmann", cc: "vNXT", buying_center: "CFO, CEO, CIO", industries: ["All"], duration: "6–12 weeks", entry_metric: "Amedes: investor-ready in 6 weeks" },
    { name: "AI Strategy & Operating Model", phase: "plan", tagline: "Governance, roles and AI strategy at scale", owner: "Felix Prettl / Rasmus Korsager Ørtoft", cc: "vACE / VENZO", buying_center: "CDO, CIO, CEO", industries: ["All"], duration: "6–10 weeks", entry_metric: "Strategy + governance model aligned to corporate goals" },
    { name: "(Gen-)AI Architecture", phase: "plan", tagline: "Tech stack design before you build", owner: "Felix Prettl", cc: "vACE", buying_center: "CIO, CTO, Enterprise Architecture", industries: ["All"], duration: "2–4 weeks", entry_metric: "Data sovereignty, scalable AI infrastructure, no vendor lock-in" },
    { name: "Data Architecture Quick Check", phase: "plan", tagline: "Rapid health check for pragmatic target architecture", owner: "Daniel Böttcher", cc: "vXPA", buying_center: "CIO, Enterprise Architecture", industries: ["All"], duration: "2–3 weeks", entry_metric: "Clear architecture blueprint, prioritised next steps" },

    // BUILD — Use Cases, Applications & Platforms
    { name: "Enterprise AI Agent Hub", phase: "build", tagline: "Build, orchestrate and govern AI agents", owner: "TBD", cc: "vNXT / vACE", buying_center: "CTO, CIO, COO, Head of AI", industries: ["Manufacturing", "Retail", "Pharma", "Utilities"], duration: "TBD", entry_metric: "30–50% faster processes through orchestrated AI agents", hot: true },
    { name: "Golden Record Agent", phase: "build", tagline: "Clean master data, easy to handle", owner: "Daniel Böttcher", cc: "vXPA", buying_center: "CDO, CIO, Head of Data Governance", industries: ["Manufacturing", "Retail", "Pharma", "Utilities"], duration: "12 weeks", entry_metric: "20–40% higher data quality, 70–90% fewer duplicates", hot: true },
    { name: "DemandSense AI", phase: "build", tagline: "Forecasts that hit inventory and revenue", owner: "Kevin Leth-Pedersen", cc: "Inspari", buying_center: "COO, Chief Supply Chain Officer", industries: ["Retail", "Manufacturing", "Utilities", "Pharma"], duration: "4–6 months", entry_price: "ab €90.000", entry_metric: "15–30% fewer forecast errors, 10–20% lower inventory", hot: true },
    { name: "OmniCare Agent", phase: "build", tagline: "24/7 service, personally scaled", owner: "Daniel Völker", cc: "vBA", buying_center: "CCO, Head of Customer Service, CMO", industries: ["Retail", "Insurance", "Utilities", "TelCo"], duration: "TBD", entry_metric: "20–40% request deflection, CSAT improvement", hot: true },
    { name: "AI Coding Factory", phase: "build", tagline: "Accelerate innovation with agentic coding", owner: "Justin Schiffmann", cc: "vSCE", buying_center: "CTO, CIO, Head of Engineering", industries: ["Manufacturing", "Retail", "Pharma"], duration: "12 weeks", entry_price: "ab €25.000", entry_metric: "Up to 55% faster delivery, 30–40% cost savings", hot: true },
    { name: "AI-Powered SAP (BTP & Joule)", phase: "build", tagline: "AI embedded deep in your SAP ecosystem", owner: "Timo Rüb / Sascha Göpfert", cc: "vERP", buying_center: "CIO, COO, Head of SAP", industries: ["Manufacturing", "Retail", "Utilities"], duration: "Varies", entry_metric: "Dockweiler: 3 FTEs saved, faster order processing" },
    { name: "Conversational AI & Chatbots", phase: "build", tagline: "Enterprise-grade chatbots and voicebots", owner: "Daniel Völker / Yavuz Bogazci", cc: "vBA / vSTI", buying_center: "CCO, Head of Customer Service, CIO", industries: ["Insurance", "Automotive", "TelCo"], duration: "Varies", entry_metric: "Daimler · Toyota · htp · Alcon" },
    { name: "AI Content Creation at Scale", phase: "build", tagline: "Automated content generation, translation and optimisation", owner: "Sebastian Drickl", cc: "vDXA / vDXS", buying_center: "CMO, Head of Marketing", industries: ["Financial Services", "Retail", "Manufacturing"], duration: "Varies", entry_metric: "Allianz · VGH Versicherungen · Swiss Post" },
    { name: "Data Platform & Engineering", phase: "build", tagline: "Modern AI-ready data foundation", owner: "Kevin Leth-Pedersen", cc: "Inspari", buying_center: "CDO, CIO, Head of Data", industries: ["Retail", "Financial Services", "Real Estate"], duration: "Varies", entry_metric: "Pandora · Bestseller · Danske Shoppingcentre" },
    { name: "Custom AI Solutions & Agents", phase: "build", tagline: "Tailored AI applications integrated into your IT landscape", owner: "Felix Prettl / Hendrik Grahl", cc: "vACE / vCEC CH", buying_center: "CTO, CDO", industries: ["All"], duration: "Varies", entry_metric: "BioNTech · Scailex · Sonepar Suisse" },
    { name: "AI Persona Generator", phase: "build", tagline: "Unified AI personas across all channels", owner: "TBD (vCX)", cc: "vCX", buying_center: "CMO, Head of Marketing", industries: ["Retail", "Insurance"], duration: "TBD", entry_metric: "VGH · Caritas" },
    { name: "AI in E-Commerce", phase: "build", tagline: "AI-powered commerce — search, personalisation, conversion", owner: "TBD (vDXS / vCX)", cc: "vDXS / vCX", buying_center: "CSO, Head of E-Commerce", industries: ["Retail", "E-Commerce"], duration: "TBD", entry_metric: "Colons · PIK AG · Riedel" },
    { name: "AI for CRM", phase: "build", tagline: "AI-enhanced CRM — next best action, pipeline, insights", owner: "TBD (vCX)", cc: "vCX", buying_center: "CSO, Head of Sales Operations", industries: ["Manufacturing", "Pharma"], duration: "TBD", entry_metric: "Miele · STADA" },
    { name: "Agent Development", phase: "build", tagline: "Custom agentic solutions for complex workflows", owner: "TBD (vCX)", cc: "vCX", buying_center: "CTO, CIO, Head of Digital", industries: ["Retail", "Manufacturing"], duration: "TBD", entry_metric: "Takko Fashion · plasmatreat" },
    { name: "MCP Integration", phase: "build", tagline: "Model Context Protocol — connecting AI agents to enterprise systems", owner: "TBD (vCX)", cc: "vCX", buying_center: "CTO, CIO, Head of AI", industries: ["All"], duration: "TBD", entry_metric: "Allianz" },
    { name: "Agentic Commerce", phase: "build", tagline: "AI agents that browse, compare and buy autonomously", owner: "TBD (vCX)", cc: "vCX", buying_center: "CSO, Head of E-Commerce", industries: ["Retail", "E-Commerce"], duration: "TBD", entry_metric: "Next frontier of commerce — Shopify K5 2025" },
    { name: "AI Visibility & GEO Audit", phase: "build", tagline: "AI-native search visibility — beyond classic SEO", owner: "Julia Saswito", cc: "vCX", buying_center: "CMO, Head of Digital Marketing", industries: ["All"], duration: "Audit: 2–4 weeks", entry_metric: "73% of consumers use AI in purchase decisions" },
    { name: "AI Workflow Automation", phase: "build", tagline: "End-to-end process automation with AI", owner: "TBD (vCX)", cc: "vCX", buying_center: "COO, Head of Operations", industries: ["All"], duration: "TBD", entry_metric: "TBD" },

    // RUN — Data Ops, ML Ops, Managed Service
    { name: "BI Build & Operations", phase: "run", tagline: "Scalable BI — smooth operations, actionable insights", owner: "Daniel Völker", cc: "vBA", buying_center: "CDO, Head of Analytics", industries: ["Insurance", "Automotive"], duration: "Ongoing", entry_metric: "Boehringer · Ministerium" },
    { name: "Data Platform Operations", phase: "run", tagline: "Efficient operations for business continuity", owner: "Kevin Leth-Pedersen", cc: "Inspari", buying_center: "CIO, Enterprise Architecture", industries: ["Retail"], duration: "Ongoing", entry_metric: "Bestseller" },
    { name: "Company Intelligence Hub (vally)", phase: "run", tagline: "Compliant AI platform — your organisation's data, available 24/7", owner: "Maike Saager", cc: "vNXT", buying_center: "CIO, COO, All employees", industries: ["All"], duration: "Ongoing", entry_metric: "valantic: 4.500 employees, 30% time savings" },
    { name: "AI Agent Monitoring & Governance", phase: "run", tagline: "Guardrails, HITL, observability and audit for AI operations", owner: "TBD", cc: "vACE / vNXT", buying_center: "CIO, CISO, COO", industries: ["All"], duration: "Ongoing", entry_metric: "EU AI Act compliance, RBAC, audit trails" },
    { name: "ML Ops & Model Lifecycle Management", phase: "run", tagline: "Systematic lifecycle management for ML models", owner: "Kevin Leth-Pedersen", cc: "Inspari / vACE", buying_center: "CDO, Head of Data Science", industries: ["Logistics", "Manufacturing"], duration: "Ongoing", entry_metric: "DHL: reduced ML management effort" },

    // TRANSFORM — Operating Model, Governance, AI Adoption
    { name: "AI Enablement & Skills Factory", phase: "transform", tagline: "Build AI competency across your organisation", owner: "Fabian Schepp", cc: "vNXT", buying_center: "CHRO, CIO, All Business Units", industries: ["All"], duration: "Ongoing", entry_metric: "valantic: 4.500 employees trained, 30% productivity gain" },
    { name: "AI Operating Model & Change Management", phase: "transform", tagline: "Roles, governance and culture for AI-first operations", owner: "Rasmus Korsager Ørtoft", cc: "VENZO", buying_center: "CHRO, CDO, CIO", industries: ["Pharma", "Public Sector", "Utilities", "Retail"], duration: "3–6 months", entry_metric: "LEGO · Pharma · Public Sector" },
    { name: "AI-First Delivery", phase: "transform", tagline: "AI embedded in your full software delivery lifecycle", owner: "Justin Schiffmann", cc: "vSCE", buying_center: "CTO, Head of Engineering", industries: ["All"], duration: "Ongoing", entry_metric: "40–60% time savings in requirements, 50–80% less manual fixing" },
    { name: "AI Governance & EU AI Act", phase: "transform", tagline: "Responsible and compliant AI deployment by design", owner: "Felix Prettl / Rasmus Korsager Ørtoft", cc: "vACE / VENZO", buying_center: "CDO, CISO, Legal", industries: ["All"], duration: "Varies", entry_metric: "Bosch Digital · Porsche · Data Compliance Office" },
    { name: "Enterprise Performance Management", phase: "transform", tagline: "AI-enhanced integrated planning and consolidation", owner: "TBD", cc: "TBD", buying_center: "CFO, Finance Leadership", industries: ["All"], duration: "Varies", entry_metric: "Uniper" },
    { name: "Pharma Commercial AI", phase: "transform", tagline: "AI across the full pharma sales process", owner: "TBD (vSMI?)", cc: "TBD", buying_center: "CCO, Head of Commercial", industries: ["Pharma"], duration: "TBD", entry_metric: "Territory planning · Call automation · Next best action" },
  ],

  // ── REFERENCES ──────────────────────────────────────────────────────────
  references: [
    { client: "DATEV", display: "DATEV", nda: false, metric: "AI roadmap + shared vision", description: "Developed shared AI vision and strategy for DATEV's internal IT including use case clustering, strategic roadmap and stakeholder alignment workshops.", industry: "Software", service: "AI North Star" },
    { client: "Siemens Energy", display: "Siemens Energy", nda: false, metric: "KPI impact in 6 weeks", description: "6-week impact increments to discover, build and scale AI-supported process enhancements across KPI-critical business areas.", industry: "Energy", service: "AI North Star / Process AI" },
    { client: "JUMO", display: "JUMO", nda: false, metric: "119 use cases identified, 3 in production by year-end", description: "Business-oriented AI strategy with governance model — 119 use cases identified, 12 prioritised, 3 selected for production.", industry: "Manufacturing", service: "AI North Star" },
    { client: "Amedes", display: "Amedes", nda: false, metric: "Investor-ready AI narrative in 6 weeks", description: "Top-down AI use case assessment and value driver modelling — creating investor-grade AI ambition narrative for Strategy Days.", industry: "Healthcare", service: "AI Value Quantification" },
    { client: "ERGO", display: "ERGO", nda: false, metric: "20–40% request deflection", description: "Conversational AI agents for 24/7 customer service reducing repetitive inquiry volume while improving CSAT through faster response times.", industry: "Insurance", service: "OmniCare Agent" },
    { client: "Toyota", display: "Toyota", nda: false, metric: "CSAT improvement", description: "AI-powered customer service automation with CRM integration and continuous learning from customer feedback loops.", industry: "Automotive", service: "OmniCare Agent / Conversational AI" },
    { client: "Bestseller", display: "Bestseller", nda: false, metric: "15–30% fewer forecast errors", description: "ML demand forecasting models tailored to fashion retail patterns, reducing inventory costs while maintaining service levels.", industry: "Retail", service: "DemandSense AI" },
    { client: "A1 Telekom Austria", display: "A1 Telekom Austria", nda: false, metric: "Improved planning accuracy", description: "AI-based demand forecasting incorporating external signals — seasonality, promotions — to reduce stockouts and tied-up capital.", industry: "Telecommunications", service: "DemandSense AI" },
    { client: "Dockweiler", display: "Dockweiler", nda: false, metric: "3 FTEs saved", description: "GenAI automation reading incoming email orders and generating SAP order suggestions — improving data accuracy and offer lead time.", industry: "Manufacturing", service: "SAP AI / Process Automation" },
    { client: "Pandora", display: "Pandora", nda: false, metric: "Demand forecasting optimised", description: "AI-driven demand and sales forecasting tailored to retail patterns, optimising inventory and supply chain planning.", industry: "Retail", service: "DemandSense AI / Data Platform" },
    { client: "valantic (internal)", display: "valantic", nda: false, metric: "30% time savings, 4.500 employees", description: "AI-first transformation: vally as enterprise AI assistant, 4,500+ employees trained, up to 30% time savings through streamlined data access.", industry: "Consulting", service: "AI North Star / vally Platform" },
    { client: "DB (Deutsche Bahn)", display: "A leading logistics & transport group", nda: "name_only", metric: "200+ AI cases identified, >20 in production", description: "Organisation-wide AI programme — use case workshops, C-level alignment, portfolio steering with significantly higher AI investment secured.", industry: "Transport & Logistics", service: "AI North Star / Portfolio Management" },
    { client: "MEWA", display: "MEWA", nda: false, metric: "Data governance established", description: "Data governance organisation and AI use-case portfolio management framework aligning AI initiatives with circular economy business goals.", industry: "Logistics", service: "Data Excellence" },
    { client: "NDA TelCo", display: "A leading European TelCo", nda: "full", metric: "40% cost reduction per feature", description: "GenAI-powered automated ticket generator for requirements engineering — integrating Azure, OpenAI and Jira, reducing blueprint cycle time significantly.", industry: "Telecommunications", service: "AI Coding / Ticket Automation" },
    { client: "Sonax", display: "Sonax", nda: false, metric: "Enterprise AI platform live", description: "Company Intelligence Hub deployment — vally as central AI assistant with enterprise data integration across all business units.", industry: "Manufacturing", service: "Enterprise AI Agent Hub / vally" },
    { client: "Allianz", display: "Allianz", nda: false, metric: "GEO + Agentic Web live", description: "AI Visibility & GEO Audit plus MCP integration and Agentic Web services for AI-native search optimisation and agentic customer journeys.", industry: "Insurance", service: "GEO Audit / MCP / Agent Development" },
    { client: "PIK AG", display: "PIK AG", nda: false, metric: "AI-powered product data", description: "Automated product data generation and enrichment — improving data quality and efficiency in digital sales.", industry: "Retail", service: "AI in E-Commerce / Content AI" },
    { client: "Miele", display: "Miele", nda: false, metric: "CRM AI integration", description: "AI-enhanced CRM with next best action recommendations and automated pipeline insights.", industry: "Manufacturing", service: "AI for CRM" },
  ],

  // ── CC OVERVIEW (for context) ────────────────────────────────────────
  ccs: [
    { cc: "vNXT", owner: "Maike Saager", focus: "AI Strategy, AI Enablement, vally Platform", industries: ["E-Commerce", "Telecom", "Logistics", "Healthcare"] },
    { cc: "vACE", owner: "Felix Prettl", focus: "AI Strategy, Data Platforms, AI Governance, EU AI Act", industries: ["Pharma", "Legal", "Manufacturing"] },
    { cc: "Inspari", owner: "Kevin Leth-Pedersen", focus: "Forecasting, Data Platform (MS Fabric/Databricks), Process Automation", industries: ["Retail", "Financial Services", "Public Sector"] },
    { cc: "vSTI", owner: "Yavuz Bogazci", focus: "AI Service Agents, SAP/Salesforce/M365 integration, Field Service", industries: ["Telecom", "Manufacturing", "Healthcare"] },
    { cc: "vXPA", owner: "Daniel Böttcher", focus: "Master Data Cleansing, AI Data Engineering, Log Analysis", industries: ["Pharma", "Finance", "Retail", "Logistics"] },
    { cc: "vBA", owner: "Daniel Völker", focus: "BI/Data Warehouse, Conversational AI (Cognigy), RAG, Agentic AI", industries: ["Insurance", "Automotive"] },
    { cc: "vERP", owner: "Timo Rüb", focus: "SAP AI, BTP, Joule Agents, Voice Agents for SAP", industries: ["Retail", "Manufacturing", "Utilities"] },
    { cc: "vCEC CH", owner: "Hendrik Grahl", focus: "Conversational/Transactional AI, Product Data Optimisation, Custom AI PoCs", industries: ["B2B Commerce", "Retail"] },
    { cc: "vDXA", owner: "Sebastian Drickl", focus: "AI Content Creation, Personalisation, PIM/MDM, Campaign Intelligence", industries: ["Financial Services", "Logistics"] },
    { cc: "vDXS", owner: "Isabelle Nevels", focus: "E-Commerce Platforms with embedded AI, SEO, AI Training, Custom Chatbots", industries: ["Retail", "Insurance", "Travel"] },
    { cc: "vMC", owner: "Christoph Nichau", focus: "AI Research Analytics, LAILA Platform, Data Management for PE/Consulting", industries: ["Private Equity"] },
    { cc: "VENZO", owner: "Rasmus Korsager Ørtoft", focus: "AI Strategy, Use Case Dev (Microsoft), AI Adoption, Compliance (AI ADOPT Framework)", industries: ["Pharma", "Public Sector", "Utilities"] },
    { cc: "vSCE", owner: "Justin Schiffmann", focus: "AI-First Software Delivery, Agentic Coding, Test Automation, Predictive Delivery", industries: ["Manufacturing", "SAP clients"] },
    { cc: "vCX", owner: "Julia Saswito", focus: "GEO Audit, AI Persona Generator, Agentic Commerce, Agent Development, MCP", industries: ["Retail", "E-Commerce", "Insurance"] },
  ]
};

// ── PROMPT ────────────────────────────────────────────────────────────────
function buildPrompt(company, website) {
  // valantic references for context — demonstrating implementation track record
  const topRefs = INTELLIGENCE.references.slice(0, 6);
  const safeRefs = topRefs.filter(r => r.nda !== 'full').map(r => ({
    ...r,
    displayClient: r.nda === 'name_only' ? r.display : r.client
  }));

  const refsStr = safeRefs.map(r =>
    `- ${r.displayClient} (${r.industry}): ${r.metric} — ${r.description}`
  ).join('\n');

  return `You are a world-class B2B sales strategist creating a Mapping Draft — a structured value narrative that maps a prospect's pains to Stripe capabilities and positions valantic as the expert implementation partner.

## Prospect Company
- Name: ${company}
- Website: ${website || 'not provided'}

## Your Task
1. **Research the prospect** from company name + website using your training knowledge to infer:
   - Industry, business model, size/scale
   - Current payment infrastructure
   - Recent strategic signals (news, growth, pivots)

2. **Identify 3-4 distinct prospect pains** that Stripe addresses:
   - Cross-border growth & local payments
   - Fraud, risk & compliance
   - Billing, monetisation & business model fit
   - Stack consolidation & integration
   - (or others specific to this prospect)

3. **Map each pain to Stripe capabilities:**
   - Stripe Payments, Billing, Connect, Radar, Treasury, Issuing, Terminal, Identity, Stripe Tax, Financial Connections, Sigma, etc.

4. **Position valantic as the implementation partner:**
   - valantic is a leading European digital consulting firm with deep expertise in AI, data, and technology integration
   - valantic has successfully delivered Stripe implementations for enterprises across industries
   - valantic brings: industry expertise, technical architecture, compliance/security, post-go-live support

## valantic Implementation Track Record
${refsStr}

## Output Format (Mapping Draft JSON)
{
  "prospect_snapshot": {
    "core_business": "Industry + primary service + markets served",
    "size_scale": "Headcount estimate + revenue band + transaction volume",
    "business_model": "B2B/B2C + pricing model + ACV or customer count",
    "current_payment_stack": "Current PSP(s) + key integrations + tech notes",
    "strategic_signals": "Recent news, hiring, funding, pivots, growth signals"
  },
  "pain_solution_blocks": [
    {
      "block_name": "e.g. Cross-border growth & local payments",
      "prospect_situation": "1-2 sentences describing the pain in prospect's language",
      "stripe_answer": "Which Stripe product(s) address this + how",
      "fit": "High | Medium | Low (based on prospect data)",
      "rationale": "Why this fit makes sense for THIS specific company",
      "pitch_angle": "One-liner headline for the website section"
    }
  ],
  "narrative": {
    "headline_message": "One sentence: why Stripe + valantic, for this prospect, now",
    "headline_highlight": "1-3 words from headline (exact substring to highlight)",
    "top_3_priorities": ["block name A", "block name B", "block name C"],
    "de_emphasize": ["block name D if any"]
  },
  "open_items": ["Clarifying question 1?", "Clarifying question 2?"],
  "next_step": "2-3 sentences proposing concrete next steps",
  "cta_label": "4-6 words, action-oriented"
}

## Rules
- Ground every claim in prospect data or training knowledge
- If data is missing, flag it in open_items (don't invent)
- Fit ratings: High = strong evidence + clear Stripe fit. Low = worth flagging but weaker fit
- Never name competitors
- Tone: opinionated, specific, human. No generic AI hype
- 3-4 pain blocks total
- open_items are internal clarifying questions for the sender, not seen by prospect`;
}

function buildHTML(data, input, contact) {
  const company = input.company || 'Prospect';
  const headline = data.narrative?.headline_message || 'Stripe Pitch';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Stripe Pitch · ${company}</title>
<link href="https://fonts.googleapis.com/css2?family=Maven+Pro:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Maven Pro', sans-serif; background: #100c2a; color: white; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
.container { max-width: 600px; text-align: center; }
h1 { font-size: 48px; margin-bottom: 16px; background: linear-gradient(135deg, #ff4b4b, #ff744f); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
p { font-size: 18px; color: rgba(255,255,255,0.8); line-height: 1.6; margin-bottom: 32px; }
.company { font-size: 28px; font-weight: 700; margin-bottom: 24px; }
.contact { background: rgba(255,255,255,0.06); border-radius: 16px; padding: 24px; margin-top: 40px; }
.contact-name { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
.contact-email { font-size: 14px; color: #ff4b4b; text-decoration: none; }
</style>
</head>
<body>
<div class="container">
  <div class="company">${company}</div>
  <h1>${headline}</h1>
  <p>Ihr personalisierter Stripe Pitch wird gerade generiert...</p>
  <div class="contact">
    <div class="contact-name">${contact.name}</div>
    <div style="font-size: 13px; color: rgba(255,255,255,0.6); margin-bottom: 12px;">${contact.role}</div>
    <a href="mailto:${contact.email}" class="contact-email">${contact.email}</a>
  </div>
</div>
</body>
</html>`;
}


export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','POST,GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type,x-valantic-secret');
  if(req.method==='OPTIONS') return res.status(200).end();

  const path = req.url || '';

  // ── GET /api/stats — public, no auth needed ───────────────────────────
  if(req.method==='GET' && path.includes('/stats')) {
    try {
      const { blobs } = await list({ prefix: 'index/', limit: 1000 });
      const entries = await Promise.all(
        blobs.map(async b => {
          try {
            const r = await fetch(b.url);
            return await r.json();
          } catch { return null; }
        })
      );
      const valid = entries.filter(Boolean);
      const opens = valid.filter(e => e.opens > 0).length;
      const senders = [...new Set(valid.map(e => e.sender).filter(Boolean))];
      return res.status(200).json({
        total: valid.length,
        opened: opens,
        senders: senders.length,
        recent: valid.slice(-5).reverse().map(e => ({
          name: e.name, company: e.company, sender: e.sender, created: e.created, opens: e.opens||0
        }))
      });
    } catch(err) {
      return res.status(500).json({error: err.message});
    }
  }

  // ── GET /api/open/[slug] — tracking pixel ─────────────────────────────
  if(req.method==='GET' && path.includes('/open/')) {
    const slug = path.split('/open/')[1]?.replace('.gif','').replace('.png','');
    if(slug) {
      try {
        const indexUrl = `https://valantic-pitch-api.vercel.app/api/blob-read?key=index/${slug}.json`;
        const r = await fetch(`https://${process.env.BLOB_BASE_URL || 'public.blob.vercel-storage.com'}/index/${slug}.json`).catch(()=>null);
        if(r && r.ok) {
          const data = await r.json();
          data.opens = (data.opens || 0) + 1;
          data.lastOpened = new Date().toISOString();
          await put(`index/${slug}.json`, JSON.stringify(data), {access:'public',contentType:'application/json',addRandomSuffix:false});
        }
      } catch(e) { /* silent — tracking should never break the page */ }
    }
    // Return 1x1 transparent GIF
    const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7','base64');
    res.setHeader('Content-Type','image/gif');
    res.setHeader('Cache-Control','no-store,no-cache');
    return res.status(200).end(gif);
  }

  // ── POST /api/generate ────────────────────────────────────────────────
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  if(req.headers['x-valantic-secret']!==SHARED_SECRET) return res.status(401).json({error:'Unauthorized'});
  const {company,website,contact}=req.body||{};
  if(!company||!website) return res.status(400).json({error:'company and website required'});
  const contactInfo={name:contact?.name||'Joshua Marckwordt',role:contact?.role||'Account Manager, valantic',email:contact?.email||'joshua.marckwordt@nxt.valantic.com',photo:contact?.photo||null,initials:(contact?.name||'Joshua Marckwordt').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()};
  try {
    const msg=await client.messages.create({model:'claude-sonnet-4-5',max_tokens:2000,messages:[{role:'user',content:buildPrompt(company,website)}]});
    const text=msg.content.map(b=>b.text||'').join('');
    const story=JSON.parse(text.replace(/^```json\s*/i,'').replace(/```\s*$/i,'').trim());
    const slug=`${company.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')}-${uuidv4().slice(0,8)}`;
    const html=buildHTML(story,{company,website},contactInfo);
    const trackingPixel = `<img src="https://stripe-pitcherapparat.vercel.app/api/open/${slug}" width="1" height="1" style="position:absolute;opacity:0;pointer-events:none;" alt="">`;
    const htmlWithTracking = html.replace('</body>', trackingPixel + '</body>');
    const blob=await put(`pitches/${slug}.html`,htmlWithTracking,{access:'public',contentType:'text/html; charset=utf-8',addRandomSuffix:false});
    await put(`index/${slug}.json`,JSON.stringify({
      slug, company, website,
      sender: contactInfo.name,
      senderEmail: contactInfo.email,
      created: new Date().toISOString(),
      opens: 0,
      lastOpened: null,
      url: blob.url
    }),{access:'public',contentType:'application/json',addRandomSuffix:false});
    return res.status(200).json({url:blob.url,slug,story});
  } catch(err){
    return res.status(500).json({error:err.message});
  }
}
