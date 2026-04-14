import Anthropic from '@anthropic-ai/sdk';
import { put, list } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const SHARED_SECRET = process.env.SHARED_SECRET || 'valantic2026';

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


2-3 approaches. 2-3 references. First reference most impactful.`;
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
    { client: "DATEV", metric: "AI roadmap + shared vision", description: "Developed shared AI vision and strategy for DATEV's internal IT including use case clustering, strategic roadmap and stakeholder alignment workshops.", industry: "Software", service: "AI North Star" },
    { client: "Siemens Energy", metric: "KPI needle moved", description: "6-week impact increments to discover, build and scale AI-supported process enhancements across KPI-critical business areas.", industry: "Energy", service: "AI North Star / Process AI" },
    { client: "JUMO", metric: "119 → 12 prioritised use cases, 3 in production", description: "Business-oriented AI strategy with governance model. 119 use cases identified, 12 prioritised, 3 in production by end of 2025.", industry: "Manufacturing", service: "AI North Star" },
    { client: "Amedes", metric: "Investor-ready AI narrative in 6 weeks", description: "Top-down AI use case assessment and value driver modelling — creating investor-grade AI ambition narrative for Strategy Days.", industry: "Healthcare", service: "AI Value Quantification" },
    { client: "ERGO", metric: "20–40% request deflection", description: "Conversational AI agents for 24/7 customer service reducing repetitive inquiry volume while improving CSAT through faster response times.", industry: "Insurance", service: "OmniCare Agent" },
    { client: "Toyota", metric: "CSAT improvement", description: "AI-powered customer service automation with CRM integration and continuous learning from customer feedback loops.", industry: "Automotive", service: "OmniCare Agent / Conversational AI" },
    { client: "Bestseller", metric: "15–30% fewer forecast errors", description: "ML demand forecasting models tailored to fashion retail patterns, reducing inventory costs while maintaining service levels.", industry: "Retail", service: "DemandSense AI" },
    { client: "A1 Telekom Austria", metric: "Improved planning accuracy", description: "AI-based demand forecasting incorporating external signals (seasonality, promotions) to reduce stockouts and tied-up capital.", industry: "Telecommunications", service: "DemandSense AI" },
    { client: "Dockweiler", metric: "3 FTEs saved", description: "GenAI automation reading and interpreting incoming email orders and generating SAP order suggestions — improving data accuracy and offer lead time.", industry: "Manufacturing", service: "SAP AI / Process Automation" },
    { client: "Pandora", metric: "Demand forecasting optimised", description: "AI-driven demand and sales forecasting tailored to retail patterns, optimising inventory and supply chain planning.", industry: "Retail", service: "DemandSense AI / Data Platform" },
    { client: "valantic (internal)", metric: "30% time savings, 4.500 employees", description: "AI-first transformation: vally as enterprise AI assistant, 4,500+ employees trained, up to 30% time savings through streamlined data access.", industry: "Consulting", service: "AI North Star / vally Platform" },
    { client: "DB (Deutsche Bahn)", metric: "200+ AI cases, >20 in production", description: "Organisation-wide AI programme — use case workshops, management decisions, portfolio steering with significantly higher C-level funding.", industry: "Transport & Logistics", service: "AI North Star / Portfolio Management" },
    { client: "MEWA", metric: "Data governance established", description: "Data governance organisation and AI use-case portfolio management framework aligning AI initiatives with circular economy business goals.", industry: "Logistics", service: "Data Excellence" },
    { client: "NDA TelCo", metric: "40% cost reduction per feature", description: "GenAI-powered automated ticket generator for requirements engineering — integrating Azure, OpenAI and Jira.", industry: "Telecommunications", service: "AI Coding / Ticket Automation" },
    { client: "Sonax", metric: "Enterprise AI platform deployed", description: "Company Intelligence Hub deployment for internal productivity — vally as central AI assistant with enterprise data integration.", industry: "Manufacturing", service: "Enterprise AI Agent Hub / vally" },
    { client: "Allianz", metric: "GEO + Agentic Web", description: "AI Visibility & GEO Audit plus MCP integration and Agentic Web services for digital marketing and AI-native search optimisation.", industry: "Insurance", service: "GEO Audit / MCP / Agent Development" },
    { client: "PIK AG", metric: "AI-powered product data", description: "Automated product data generation and enrichment using AI — improving data quality and efficiency in digital sales.", industry: "Retail", service: "AI in E-Commerce / Content AI" },
    { client: "Miele", metric: "CRM AI integration", description: "AI-enhanced CRM with next best action recommendations and automated pipeline insights.", industry: "Manufacturing", service: "AI for CRM" },
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
function buildPrompt(name, role, company, context, mcpServices = null) {
  const firstName = name.split(' ')[0];

  // Pick relevant services from intelligence (match by industry/role keywords)
  const roleLC = (role||'').toLowerCase();
  const contextLC = (context||'').toLowerCase();
  const companyLC = (company||'').toLowerCase();

  // Score services by relevance to this prospect
  const scored = INTELLIGENCE.services.map(s => {
    let score = 0;
    const ind = (s.industries||[]).map(i=>i.toLowerCase());
    if (ind.includes('all')) score += 1;
    if (ind.some(i => contextLC.includes(i) || companyLC.includes(i))) score += 3;
    if (roleLC.includes('cio') || roleLC.includes('cto')) { if (['build','plan'].includes(s.phase)) score += 2; }
    if (roleLC.includes('cfo') || roleLC.includes('finance')) { if (s.phase === 'plan' || s.name.toLowerCase().includes('finance')) score += 3; }
    if (roleLC.includes('coo') || roleLC.includes('supply') || roleLC.includes('operations')) { if (s.name.toLowerCase().includes('demand') || s.name.toLowerCase().includes('supply') || s.name.toLowerCase().includes('process')) score += 3; }
    if (roleLC.includes('cdo') || roleLC.includes('data')) { if (s.name.toLowerCase().includes('data') || s.name.toLowerCase().includes('golden')) score += 3; }
    if (roleLC.includes('marketing') || roleLC.includes('cmo')) { if (s.phase === 'build' && (s.name.toLowerCase().includes('content') || s.name.toLowerCase().includes('marketing') || s.name.toLowerCase().includes('geo') || s.name.toLowerCase().includes('persona'))) score += 3; }
    if (roleLC.includes('cco') || roleLC.includes('customer service') || roleLC.includes('service')) { if (s.name.toLowerCase().includes('omni') || s.name.toLowerCase().includes('chatbot') || s.name.toLowerCase().includes('dialogue')) score += 3; }
    if (s.hot) score += 1;
    return { ...s, score };
  });

  const topServices = scored.sort((a,b) => b.score - a.score).slice(0, 6);

  // Pick relevant references
  const topRefs = INTELLIGENCE.references.slice(0, 8);

  // Use MCP data if available, fallback to intelligence
  const serviceList = mcpServices || topServices;

  const servicesStr = serviceList.map(s =>
    `- ${s.name} (${s.phase.toUpperCase()}): ${s.tagline}${s.entry_metric ? ' | Result: '+s.entry_metric : ''}${s.owner && s.owner !== 'TBD' ? ' | Owner: '+s.owner : ''}`
  ).join('\n');

  const refsStr = topRefs.map(r =>
    `- ${r.client} (${r.industry}): ${r.metric} — ${r.description}`
  ).join('\n');

  return \`You are a world-class B2B sales strategist at valantic.
Create a personalised value story. Approaches = future (what we WOULD do). References = past proof. Keep them completely separate.

## Contact: \${name}, \${role||'not specified'}, \${company}
## Context: \${context||'not specified'}

## valantic AI Services available for this prospect (choose the 2-3 most relevant):
\${servicesStr}

## valantic References (choose the 2-3 most relevant to this industry/role):
\${refsStr}

RULES:
- greeting: Include urgency signal (competitor moving, window closing). Max 15 words.
- situation: 3-4 sentences, specific tension this role faces, opinionated, no buzzwords.
- approaches: FUTURE tense only. Mention valantic brings dedicated AI specialists (not all of valantic). Use specific service names from the list above where relevant.
- references: PAST tense only. Use real client names and metrics from the references list above. NEVER mix with approaches.
- next_step: Mention dedicated AI specialists, anchor with ROI from a similar client, include why now.
- cta_label: 4-6 words, specific.

Respond ONLY with valid JSON:
{
  "greeting": "...",
  "situation": "...",
  "approaches": [{ "title": "Action verb + what, 5-7 words", "description": "2 sentences, future tense", "outcome": "Specific measurable result" }],
  "references": [{ "number": "e.g. 40%", "description": "What was achieved. Past tense.", "client": "Client name" }],
  "next_step": "2-3 sentences.",
  "cta_label": "4-6 words"
}
2-3 approaches. 2-3 references.\`;
}

function buildHTML(data, input, contact) {
  const firstName = input.name.split(' ')[0];
  const domain = input.company.toLowerCase().replace(/\s+/g,'').replace(/[^a-z0-9]/g,'') + '.com';
  const refs = data.references || [];
  const greetingClean = (data.greeting||'').replace(new RegExp('^'+firstName+'[,.]?\\s*','i'),'');
  const fullHeadline = firstName + ', ' + greetingClean;
  const nameLen = (firstName + ',').length;

  const approachCards = (data.approaches||[]).map((a,i) => `
    <div style="background:white;border-radius:16px;padding:28px;box-shadow:0 1px 6px rgba(0,0,0,.06);display:flex;flex-direction:column;transition:transform .2s,box-shadow .2s;" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,.1)'" onmouseout="this.style.transform='';this.style.boxShadow='0 1px 6px rgba(0,0,0,.06)'">
      <div style="font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#ff4b4b;margin-bottom:12px;">0${i+1}</div>
      <div style="font-size:15px;font-weight:700;color:#100c2a;margin-bottom:10px;line-height:1.35;">${a.title}</div>
      <div style="font-size:14px;color:#555;line-height:1.7;flex:1;">${a.description}</div>
      ${a.outcome?`<div style="font-size:12px;font-weight:600;color:#193773;border-top:1px solid #f0eeee;padding-top:12px;margin-top:12px;">→ ${a.outcome}</div>`:''}
    </div>`).join('');

  const refSpotlight = refs.length ? `
    <div style="position:relative;">
      ${refs.map((r,i)=>`
      <div class="rsp" style="display:${i===0?'block':'none'};background:#100c2a;border-radius:20px;padding:52px 56px;min-height:280px;position:relative;overflow:hidden;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px;">
          <img src="https://logo.clearbit.com/${(r.client||'').toLowerCase().replace(/[^a-z0-9]/g,'')}.com" style="height:18px;width:auto;opacity:.4;filter:brightness(10);" onerror="this.style.display='none'" alt="">
          <span style="font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.35);">${r.client}</span>
        </div>
        <div style="display:grid;grid-template-columns:auto 1fr;gap:48px;align-items:center;">
          <div style="font-size:clamp(72px,10vw,120px);font-weight:700;line-height:1;color:#ff4b4b;white-space:nowrap;">${r.number}</div>
          <div style="font-size:17px;color:rgba(255,255,255,.78);line-height:1.7;">${r.description}</div>
        </div>
        <div style="position:absolute;right:-20px;bottom:-30px;font-size:220px;font-weight:700;color:rgba(255,255,255,.025);line-height:1;pointer-events:none;user-select:none;">${r.number}</div>
      </div>`).join('')}
      ${refs.length>1?`<div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;">
        <div style="display:flex;gap:7px;">${refs.map((_,i)=>`<button onclick="sg(${i})" style="width:${i===0?'24':'8'}px;height:8px;border-radius:4px;border:none;background:${i===0?'#ff4b4b':'#ccc'};cursor:pointer;transition:all .25s;padding:0;" id="rb-${i}"></button>`).join('')}</div>
        <span id="rsc" style="font-size:12px;font-weight:600;color:#aaa;">1 / ${refs.length}</span>
      </div>`:''}
    </div>` : '';

  const avatar = contact.photo
    ? `<img src="${contact.photo}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
    : `<div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#ff4b4b,#ff744f);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:white;flex-shrink:0;">${contact.initials||'VS'}</div>`;

  const LOGO_W = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="232 216 1500 325" style="height:22px;width:auto;"><path fill="#FFFFFF" d="M1678,456.2c-7.8,14.8-24.3,23.9-43.6,23.9c-30,0-51.8-22.4-51.8-53.2s21.8-53.2,51.8-53.2c19.2,0,35.3,8.9,43.6,23.9l54-31.4c-19.3-33.1-56.2-53.6-96.8-53.6c-65.4,0-114.7,49.1-114.7,114.2S1569.8,541,1635.2,541c40.6,0,77.5-20.6,96.8-54L1678,456.2z"/><rect fill="#FFFFFF" x="1439" y="318.8" width="62" height="216.2"/><path fill="#FFFFFF" d="M1470,216.1c-20.4,0-37.6,17.6,37.6,37.6s17.2,37.6,37.6,37.6s37.6-17.2,37.6-37.6S1490.4,216.1,1470,216.1z"/><path fill="#FFFFFF" d="M1331.8,519.9c16.2,14.6,44.1,19.5,87.8,15.2v-55.9c-19.9,1.1-32.8,0.3-39.9-6.3c-3.7-3.5-5.5-8.3-5.5-14.8v-80h45.4v-59.4h-45.4v-75.9l-62,18.6v57.3H1277V378h35.2v80C1312.2,488.2,1318.4,507.8,1331.8,519.9z"/><path fill="#FFFFFF" d="M1163.4,374.6c23,0,41.7,18.7,41.7,41.7v118.6h62V402.1c0-49.4-40-89.5-89.4-89.5c-18.9,0-37.4,6-52.7,17.2l-3.3,2.4v-13.4h-62V535h62V416.3C1121.8,393.3,1140.4,374.6,1163.4,374.6z"/><path fill="#FFFFFF" d="M1029.2,534.9V318.8h-62v24.1l-3.6-4.1c-15-17.4-36.6-26.2-64.1-26.2c-27.5,0-53.4,11.7-72.8,32.9c-19.7,21.5-30.5,50.4-30.5,81.4s10.8,59.9,30.5,81.4c19.4,21.2,45.2,32.9,72.8,32.9c27.6,0,49-8.8,64.1-26.2l3.6-4.1V535L1029.2,534.9z M912.8,482.6c-32.6,0-54.5-22.4-54.5-55.8s21.9-55.8,54.5-55.8c32.6,0,54.5,22.4,54.5,55.8S945.3,482.6,912.8,482.6z"/><polygon fill="#FFFFFF" points="714.8,234.7 714.8,534.9 776.8,534.9 776.8,216.1"/><path fill="#FFFFFF" d="M684.3,534.9V318.8h-62v24.1l-3.6-4.1c-15.1-17.4-36.6-26.2-64.1-26.2c-27.5,0-53.4,11.7-72.8,32.9c-19.6,21.5-30.5,50.4-30.5,81.4s10.8,59.9,30.5,81.4c19.4,21.2,45.2,32.9,72.8,32.9c27.5,0,49-8.8,64.1-26.2l3.6-4.1V535L684.3,534.9z M567.8,482.6c-32.6,0-54.5-22.4-54.5-55.8s21.9-55.8,54.5-55.8c32.6,0,54.5,22.4,54.5,55.8S600.4,482.6,567.8,482.6z"/><polygon fill="#FFFFFF" points="395.3,318.8 348,463 300.7,318.8 232,318.8 312,534.9 384,534.9 464,318.8"/></svg>`;

  const BLOB = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1015.91 1154.31" style="height:100%;width:auto;"><defs><linearGradient id="bg1" gradientUnits="userSpaceOnUse" x1="0" y1="577" x2="1016" y2="577"><stop offset="0" style="stop-color:#FF4B4B"/><stop offset="1" style="stop-color:#FF744F"/></linearGradient></defs><path fill="url(#bg1)" d="M812.3,47.5C694.8-31.8,530.7,12.9,415.6,89.7C300.5,166.5,185.4,276.2,113.2,408.8C41,541.4,11.7,697.8,47.6,840.1c35.9,142.3,136.9,270.4,266.7,316.2c129.8,45.8,288.3-0.6,407.4-82.1c119.1-81.5,199-197.8,264.9-318.7c65.9-120.9,117.8-246.4,121.9-374.2C1112.6,253.5,1059.3,156.1,975,99.5C933.8,71.3,875.2,53.8,812.3,47.5z"/></svg>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>For ${input.name} · valantic</title>
<link href="https://fonts.googleapis.com/css2?family=Maven+Pro:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="https://unpkg.com/@phosphor-icons/web@2.1.2"></script>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Maven Pro',sans-serif;background:#f5f3f0;color:#100c2a;-webkit-font-smoothing:antialiased;}
nav{background:#100c2a;border-bottom:1px solid rgba(255,255,255,.07);padding:14px 56px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:50;}
.nc{font-family:'Maven Pro',sans-serif;font-size:13px;font-weight:700;color:white;background:linear-gradient(135deg,#ff4b4b,#ff744f);padding:9px 22px;border-radius:99px;text-decoration:none;}
.hero{position:relative;overflow:hidden;background:#100c2a;padding:64px 56px 72px;min-height:300px;display:flex;align-items:flex-end;}
.blob{position:absolute;top:-15%;right:-10%;height:115%;pointer-events:none;opacity:.9;mix-blend-mode:screen;}
.hc{position:relative;z-index:1;max-width:900px;width:100%;}
.wrap{max-width:1100px;margin:0 auto;padding:52px 56px 80px;}
.lbl{font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#ff4b4b;margin-bottom:14px;}
.wcard{background:white;border-radius:16px;padding:28px 32px;box-shadow:0 1px 6px rgba(0,0,0,.06);}
.card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;}
.cta{display:inline-flex;align-items:center;gap:8px;padding:13px 26px;background:linear-gradient(135deg,#ff4b4b,#ff744f);color:white;font-family:'Maven Pro',sans-serif;font-weight:700;font-size:14px;border-radius:99px;text-decoration:none;transition:transform .15s,box-shadow .15s;}
.cta:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(255,75,75,.35);}
footer{background:#100c2a;padding:28px 56px;display:flex;justify-content:space-between;align-items:center;}
.mob{display:none;position:fixed;bottom:0;left:0;right:0;z-index:99;background:white;border-top:1px solid #e5e2dc;padding:12px 16px;}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
.sr{opacity:0;transform:translateY(18px);transition:opacity .6s ease,transform .6s ease;}
.sr.v{opacity:1;transform:none;}
@media(max-width:700px){nav,.hero,footer,.wrap{padding-left:20px;padding-right:20px;}.rsp{padding:28px 24px !important;}.rsp>div:last-of-type{grid-template-columns:1fr !important;gap:16px !important;}.mob{display:block;}body{padding-bottom:68px;}}
</style>
</head>
<body>
<nav>
  ${LOGO_W}
  <div style="display:flex;align-items:center;gap:12px;">
    <img src="https://logo.clearbit.com/${domain}" style="height:18px;opacity:.4;filter:brightness(10);" onerror="this.style.display='none'" alt="">
    <a href="mailto:${contact.email}?subject=Re: valantic for ${input.company}" class="nc">Get in touch</a>
  </div>
</nav>
<section class="hero">
  <div class="blob">${BLOB}</div>
  <div class="hc">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:22px;opacity:0;animation:fadeUp .5s .1s ease forwards;">
      <span style="font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.35);">${input.name}</span>
      <span style="width:3px;height:3px;border-radius:50%;background:rgba(255,255,255,.2);"></span>
      <span style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.35);">${input.company}</span>
    </div>
    <div style="font-size:clamp(28px,4vw,52px);font-weight:700;line-height:1.18;max-width:840px;opacity:0;animation:fadeUp .6s .3s ease forwards;">
      <span id="tw" style="color:white;"></span><span id="twn" style="display:none;background:linear-gradient(135deg,#ff4b4b,#ff744f);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">${firstName},</span><span id="twr" style="color:white;display:none;"> ${greetingClean}</span><span id="twc" style="color:#ff4b4b;animation:blink 1s step-end infinite;display:none;">|</span>
    </div>
  </div>
</section>
<div style="background:#f5f3f0;">
<div class="wrap">
  <div class="sr" style="margin-bottom:44px;"><div class="lbl">Your situation</div><div class="wcard"><p style="font-size:16px;line-height:1.85;color:#2a2a2a;">${data.situation||''}</p></div></div>
  <div class="sr" style="margin-bottom:44px;"><div class="lbl">What we'd do for ${input.company}</div><div class="card-grid">${approachCards}</div></div>
  ${refs.length?`<div class="sr" style="margin-bottom:44px;"><div class="lbl">Proven results</div>${refSpotlight}</div>`:''}
  <div class="sr" style="margin-bottom:32px;"><div class="lbl">Here's what I'd suggest</div>
    <div class="wcard">
      <p style="font-size:15px;color:#444;line-height:1.75;margin-bottom:22px;">${data.next_step||''}</p>
      <a href="mailto:${contact.email}?subject=Re: valantic for ${input.company}&body=Hi ${contact.name.split(' ')[0]}," class="cta"><i class="ph ph-calendar-check" style="font-size:15px;"></i> ${data.cta_label||'Book 30 minutes'}</a>
      <div style="font-size:11px;color:#bbb;margin-top:10px;">No deck. No pitch. Just a conversation.</div>
    </div>
  </div>
  <div class="sr wcard" style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
    ${avatar}
    <div style="flex:1;min-width:180px;">
      <div style="font-size:17px;font-weight:700;color:#100c2a;margin-bottom:3px;">${contact.name}</div>
      <div style="font-size:13px;color:#888;margin-bottom:8px;">${contact.role}</div>
      <a href="mailto:${contact.email}" style="font-size:14px;color:#ff4b4b;font-weight:600;text-decoration:none;">${contact.email}</a>
    </div>
    <a href="mailto:${contact.email}" style="display:inline-flex;align-items:center;gap:7px;padding:10px 20px;background:#f5f3f0;color:#100c2a;font-family:'Maven Pro',sans-serif;font-weight:700;font-size:13px;border-radius:99px;text-decoration:none;"><i class="ph ph-envelope" style="font-size:14px;"></i> Send a message</a>
  </div>
</div>
</div>
<footer>${LOGO_W}<span style="font-size:12px;color:rgba(255,255,255,.25);">valantic.ai</span></footer>
<div class="mob"><a href="mailto:${contact.email}" class="cta" style="width:100%;justify-content:center;"><i class="ph ph-calendar-check" style="font-size:15px;"></i> ${data.cta_label||'Book 30 minutes'}</a></div>
<script>
// Typewriter on full headline — delay start to avoid flash
const full='${(firstName+', '+greetingClean).replace(/'/g,"\\'")}',nl=${nameLen};
let ni=0;const tw=document.getElementById('tw'),twn=document.getElementById('twn'),twr=document.getElementById('twr'),twc=document.getElementById('twc');
setTimeout(()=>{
  if(twc)twc.style.display='inline';
  const ti=setInterval(()=>{
    if(ni<=full.length){
      if(ni<=nl){if(tw)tw.textContent=full.slice(0,ni);}
      else{if(tw)tw.style.display='none';if(twn)twn.style.display='inline';if(twr){twr.style.display='inline';twr.textContent=' '+full.slice(nl+1,ni);}}
      ni++;
    }else{clearInterval(ti);if(twc)twc.style.display='none';}
  },45);
},400);
// Spotlight auto-advance
const rl=${JSON.stringify(refs.length)};let ri=0,rt;
function sg(i){ri=i;clearInterval(rt);if(rl>1)rt=setInterval(()=>sg((ri+1)%rl),8000);
  document.querySelectorAll('.rsp').forEach((e,j)=>e.style.display=j===i?'block':'none');
  for(let j=0;j<rl;j++){const b=document.getElementById('rb-'+j);if(b){b.style.width=j===i?'24px':'8px';b.style.background=j===i?'#ff4b4b':'#ccc';}}
  const c=document.getElementById('rsc');if(c)c.textContent=(i+1)+' / '+rl;}
if(rl>1)rt=setInterval(()=>sg((ri+1)%rl),8000);
// Scroll reveal
const obs=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('v');obs.unobserve(e.target);}});},{threshold:.08});
document.querySelectorAll('.sr').forEach(el=>obs.observe(el));
</script>
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
  const {name,company,role,context,industry,contact}=req.body||{};
  if(!name||!company) return res.status(400).json({error:'name and company required'});
  const contactInfo={name:contact?.name||'Maike Saager',role:contact?.role||'Head of Growth Platform AI Hub, valantic',email:contact?.email||'maike.saager@valantic.com',photo:contact?.photo||null,initials:(contact?.name||'Maike Saager').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()};
  try {
    const mcpServices = await fetchMCPServices(company, industry||'', role||'');
    const msg=await client.messages.create({model:'claude-sonnet-4-5',max_tokens:1500,messages:[{role:'user',content:buildPrompt(name,role,company,context,mcpServices)}]});
    const text=msg.content.map(b=>b.text||'').join('');
    const story=JSON.parse(text.replace(/^```json\s*/i,'').replace(/```\s*$/i,'').trim());
    const prefix=`${name.split(' ')[0].toLowerCase()}-${company.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')}`;
    const slug=`${prefix}-${uuidv4().slice(0,8)}`;
    const html=buildHTML(story,{name,company,role},contactInfo);
    const trackingPixel = `<img src="https://valantic-pitch-api.vercel.app/api/open/${slug}" width="1" height="1" style="position:absolute;opacity:0;pointer-events:none;" alt="">`;
    const htmlWithTracking = html.replace('</body>', trackingPixel + '</body>');
    const blob=await put(`pitches/${slug}.html`,htmlWithTracking,{access:'public',contentType:'text/html; charset=utf-8',addRandomSuffix:false});
    await put(`index/${slug}.json`,JSON.stringify({
      slug, name, company, role,
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
