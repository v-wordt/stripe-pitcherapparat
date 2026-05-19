import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { put } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';
import { runGroundedJson, MODEL_RESEARCH } from './_lib/research-core.js';
import { GUILLOCHE_SVG } from './_lib/guilloche.js';

const SHARED_SECRET = process.env.SHARED_SECRET;
const SPIF_DEFAULT = '5.000€';

// ── SKILL: prospect-briefing (.claude/skills/stripe-briefing.md) ───────────
// The skill normally consumes a researched prospect-profile JSON. Here there
// is no profile: the model researches the company live (web_search) for the
// skill's minimum — identity, what it does, and the Online-Touchpoints — then
// writes the briefing in one pass. Rules below are the operative content of
// the skill (structure, hedging, tag catalogue, length budget, tone).
const SYSTEM = `Du erstellst ein einseitiges, INTERNES Stripe-Prospect-Briefing, das ein Stripe-Account-Owner vor der Ansprache eines Unternehmens liest. Es ist rein intern: es benennt offen Referral-Provision, Consulting-Pull-Through und einen persönlichen SPIF und wird dem Prospect nie gezeigt. Es gibt keine kundenseitige Variante.

Ausgabesprache: IMMER Deutsch. Register: trocken, sachlich, intern, pragmatisch, ehrlich, kurze Sätze. Einzige Ausnahme ist der "consequence"-Satz je 1.2-Item, der in kundentauglicher Vertriebssprache formuliert ist (wiederverwendbare Pitch-Phrase).

RECHERCHE (du hast kein vorbereitetes Profil): Nutze web_search, um das reale Unternehmen zu identifizieren und mindestens zu klären: (a) Identität (offizieller Name, Sitz, Rechtsform grob), (b) Kerngeschäft, (c) Online-Touchpoints — die konkreten Flächen, an denen Geld den Besitzer wechselt oder wechseln könnte (Webshop, B2B-Bestellportal, Trainings-Academy, Abo-/Buchungsmanager, Ersatzteilshop) — NICHT die Corporate-Homepage. Ein FEHLENDER Touchpoint ("nicht vorhanden": kein B2C-Shop, keine Online-Buchung) ist eine valide, oft zentrale Briefing-Achse.

STOP-CHECK: Wenn sich Identität ODER Kerngeschäft ODER mindestens ein (vorhandener oder bewusst fehlender) Online-Touchpoint auch nach ernsthafter Suche nicht belegen lässt, gib NUR { "insufficient": true, "insufficientReason": "<knapp, Deutsch>" } aus. Erfinde niemals ein Unternehmen.

HEDGING: Keine Scheinsicherheit. Was gut belegt ist: klar benennen. Was unsicher/abgeleitet ist: sprachlich hedgen (vermutlich, wahrscheinlich, dürfte, oft). Im Zweifel intern lieber unter- als überbehaupten. Konfidenzlevel niemals im Text zeigen.

STRUKTUR & LÄNGENBUDGET (Gesamt ~650–850 Wörter, eine A4-Seite):
- snapshot: priorisierter Kurzabriss des Unternehmens, 60–90 Wörter. Kein Profil-Recap; gewichtet nach Stripe-Relevanz; schließt darauf, wo Stripe Hebel ist.
- painPoints: 4 Pain Points (3 nur zulässig, wenn das Unternehmen wirklich nicht mehr hergibt). Je: kurzer fetter lead + 1–2 Sätze (20–35 Wörter), plus kurzer per-Company-Tag in sauberem Deutsch oder korrektem Englisch (kein Denglisch), z.B. OUTGESOURCED, B2B-SHOP, INTERNATIONAL, MULTI-SHOP, OPS, VERBRAUCH. Jeder Pain diagnostiziert, was einen Touchpoint heute ausbremst.
- stripeAnswers: genau ein Item je Pain Point (gleiche Anzahl, gleiche Reihenfolge), 20–35 Wörter. Jeweils ein Stripe-Move plus eine "consequence" (was der Move dem Unternehmen bringt, in Vertriebssprache). 1–3 Chips je Item aus diesem festen Katalog (niemals Stripe-Produkte erfinden/umbenennen; CHECKOUT und LINK nie zusammenlegen):
  CHECKOUT = Optimized Checkout Suite (hosted/embedded checkout)
  LINK = Link — One-Click-Checkout für wiederkehrende Kunden
  SUBS = Billing & Subscriptions — wiederkehrender Umsatz
  CONNECT = Connect — Multi-Brand / Multi-Shop / Marketplace-Splits
  B2B = Invoicing & Net-Terms — Rechnungskauf, Zahlungsziele, Multi-User-Accounts
  TAX = Tax & Radar — automatisierte USt/VAT, Betrugsschutz
  PAYLINK = Payment Links — niedrigschwellige Buchungs-/Zahlungslinks (Academies, Trainings)
  ACP = Agentic Commerce Suite — Auffindbarkeit und Checkout in KI-Agenten
- goals: 3 strategische Ziele (Titel + kurze Begründung, 30–45 Wörter). Jedes Ziel MUSS Stripe-adressierbar sein (kein generisches Strategieziel, das Stripe nicht konkret ermöglicht). Das Flag "neu" nur beim Agentic-Commerce/ACP-Ziel auf true setzen, und nur wenn ein plausibler Discovery-Hook existiert (glaubhaftes Szenario, in dem ein Käufer einen KI-Agenten nach etwas fragt, das dieses Unternehmen verkauft). Sonst ACP weglassen und ein anderes Stripe-adressierbares Ziel nehmen (wiederkehrender Umsatz, Konsolidierung, Internationalisierung, Backoffice-Automatisierung).
- rewards: 3 feste, kompakte Items (15–25 Wörter), nur leicht auf die konkreten Produkte/Touchpoints des Unternehmens zugeschnitten:
  referral = einmalige Stripe-Referral-Provision auf das verarbeitete Volumen. Qualitativ halten ("substanziell"); keine Zahl erfinden.
  pullThrough = Consulting-/Implementierungsvolumen, das das Engagement öffnet; auf die echten Workstreams des Unternehmens referenzieren.
  spif = persönlicher SPIF für den Account-Owner bei erfolgreichem Abschluss; Betrag ${SPIF_DEFAULT}.
- nextSteps: 3 feste Schritte (20–30 Wörter), Unternehmensname eingesetzt:
  1. Kurzes internes Sync (~15 Min, intern: Argumentation und offene Fragen übergeben; Account-Owner teilt sein Wissen).
  2. Easy Talk mit [Unternehmen] (lockerer Erstkontakt, kein Pitch; testen, ob die Hypothesen halten).
  3. Discovery Workshop — auf uns (wenn das Gespräch trägt: Discovery Workshop, für den Prospect kostenlos).

KEINE KI-Tells: keine Gedankenstriche, keine theatralischen Doppelpunkte ("Das Ergebnis: ..."), kein aufgeblähtes Vokabular ("Game-Changer", "nahtlos"), keine Dreierfiguren, kein großer Schlusssatz. Jeder Pain, jedes Produkt-Mapping, jedes Ziel muss spezifisch für dieses Unternehmen und seine Touchpoints sein — ein Satz, der in jedem Briefing stehen könnte, ist ein Fehler.`;

function buildInstruction(company) {
  return `Unternehmen: "${company}"

Recherchiere zuerst mit web_search (Identität, Kerngeschäft, Online-Touchpoints), dann gib NUR dieses JSON-Objekt aus. Kein Prosa-Text, keine Markdown-Fences. Straight ASCII double quotes; literale " in Strings als \\" escapen; keine literalen Zeilenumbrüche in Strings; keine trailing commas.

Bei ausreichender Faktenlage:
{
  "company": "<Anzeigename des Unternehmens>",
  "insufficient": false,
  "snapshot": "<60-90 Wörter, Deutsch>",
  "painPoints": [ { "tag": "<KURZTAG>", "lead": "<fetter Einstieg>", "text": "<20-35 Wörter>" } ],
  "stripeAnswers": [ { "chips": ["CHECKOUT"], "text": "<20-35 Wörter>", "consequence": "<Vertriebssprache, 1 Satz>" } ],
  "goals": [ { "title": "Ziel 01 — <Titel>", "text": "<30-45 Wörter>", "neu": false } ],
  "rewards": { "referral": "<15-25 Wörter>", "pullThrough": "<15-25 Wörter>", "spif": "<15-25 Wörter, Betrag ${SPIF_DEFAULT}>" },
  "nextSteps": [ { "title": "<Schritttitel>", "text": "<20-30 Wörter>" } ]
}

painPoints: 4 (3 nur als Ausnahme). stripeAnswers: gleiche Anzahl/Reihenfolge wie painPoints. goals: 3. nextSteps: 3.

Bei unzureichender Recherche stattdessen NUR:
{ "insufficient": true, "insufficientReason": "<knapp, Deutsch>" }`;
}

// ── valantic CI — Route A (Guilloche) / Light ──────────────────────────────
function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="232 216 1500 325" style="height:30px;width:auto;">
  <path fill="#100C2A" d="M1678,456.2c-7.8,14.8-24.3,23.9-43.6,23.9c-30,0-51.8-22.4-51.8-53.2s21.8-53.2,51.8-53.2c19.2,0,35.3,8.9,43.6,23.9l54-31.4c-19.3-33.1-56.2-53.6-96.8-53.6c-65.4,0-114.7,49.1-114.7,114.2S1569.8,541,1635.2,541c40.6,0,77.5-20.6,96.8-54L1678,456.2z"/>
  <rect fill="#100C2A" x="1439" y="318.8" width="62" height="216.2"/>
  <path fill="#100C2A" d="M1470,216.1c-20.4,0-37.6,17.2-37.6,37.6s17.2,37.6,37.6,37.6s37.6-17.2,37.6-37.6S1490.4,216.1,1470,216.1z"/>
  <path fill="#100C2A" d="M1331.8,519.9c16.2,14.6,44.1,19.5,87.8,15.2v-55.9c-19.9,1.1-32.8,0.3-39.9-6.3c-3.7-3.5-5.5-8.3-5.5-14.8v-80h45.4v-59.4h-45.4v-75.9l-62,18.6v57.3H1277V378h35.2v80C1312.2,488.2,1318.4,507.8,1331.8,519.9z"/>
  <path fill="#100C2A" d="M1163.4,374.6c23,0,41.7,18.7,41.7,41.7v118.6h62V402.1c0-49.4-40-89.5-89.4-89.5c-18.9,0-37.4,6-52.7,17.2l-3.3,2.4v-13.4h-62V535h62V416.3C1121.8,393.3,1140.4,374.6,1163.4,374.6z"/>
  <path fill="#100C2A" d="M1029.2,534.9V318.8h-62v24.1l-3.6-4.1c-15-17.4-36.6-26.2-64.1-26.2c-27.5,0-53.4,11.7-72.8,32.9c-19.7,21.5-30.5,50.4-30.5,81.4s10.8,59.9,30.5,81.4c19.4,21.2,45.2,32.9,72.8,32.9c27.6,0,49-8.8,64.1-26.2l3.6-4.1V535L1029.2,534.9z M912.8,482.6c-32.6,0-54.5-22.4-54.5-55.8s21.9-55.8,54.5-55.8c32.6,0,54.5,22.4,54.5,55.8S945.3,482.6,912.8,482.6z"/>
  <polygon fill="#100C2A" points="714.8,234.7 714.8,534.9 776.8,534.9 776.8,216.1"/>
  <path fill="#100C2A" d="M684.3,534.9V318.8h-62v24.1l-3.6-4.1c-15.1-17.4-36.6-26.2-64.1-26.2c-27.5,0-53.4,11.7-72.8,32.9c-19.6,21.5-30.5,50.4-30.5,81.4s10.8,59.9,30.5,81.4c19.4,21.2,45.2,32.9,72.8,32.9c27.5,0,49-8.8,64.1-26.2l3.6-4.1V535L684.3,534.9z M567.8,482.6c-32.6,0-54.5-22.4-54.5-55.8s21.9-55.8,54.5-55.8c32.6,0,54.5,22.4,54.5,55.8S600.4,482.6,567.8,482.6z"/>
  <polygon fill="#100C2A" points="395.3,318.8 348,463 300.7,318.8 232,318.8 312,534.9 384,534.9 464,318.8"/>
</svg>`;

function buildBriefingHTML(b, company, contact, date) {
  const pains = Array.isArray(b.painPoints) ? b.painPoints : [];
  const answers = Array.isArray(b.stripeAnswers) ? b.stripeAnswers : [];
  const goals = Array.isArray(b.goals) ? b.goals : [];
  const steps = Array.isArray(b.nextSteps) ? b.nextSteps : [];
  const rewards = b.rewards || {};

  const painHtml = pains.map((p, i) => `
    <div class="item">
      <div class="item-head">
        <span class="num">1.1 · 0${i + 1}</span>
        <span class="tag">${esc(p.tag)}</span>
      </div>
      <div class="item-body"><strong>${esc(p.lead)}</strong> ${esc(p.text)}</div>
    </div>`).join('');

  const answerHtml = answers.map((a, i) => {
    const chips = (Array.isArray(a.chips) ? a.chips : [])
      .map(c => `<span class="chip">${esc(c)}</span>`).join('');
    return `
    <div class="item">
      <div class="item-head">
        <span class="num">1.2 · 0${i + 1}</span>
        <span class="chips">${chips}</span>
      </div>
      <div class="item-body">${esc(a.text)}</div>
      <div class="consequence">${esc(a.consequence)}</div>
    </div>`;
  }).join('');

  const goalHtml = goals.map((g, i) => `
    <div class="goal">
      <div class="goal-title">${esc(g.title)}${g.neu ? ' <span class="neu">NEU</span>' : ''}</div>
      <div class="goal-text">${esc(g.text)}</div>
    </div>`).join('');

  const rewardRow = (label, val) => val ? `
    <div class="reward">
      <div class="reward-label">${label}</div>
      <div class="reward-text">${esc(val)}</div>
    </div>` : '';

  const stepHtml = steps.map((s, i) => `
    <div class="step">
      <div class="step-n">${i + 1}</div>
      <div><div class="step-title">${esc(s.title)}</div><div class="step-text">${esc(s.text)}</div></div>
    </div>`).join('');

  const initials = (contact.name || 'V').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Internes Briefing – ${esc(company)} | valantic</title>
<link href="https://fonts.googleapis.com/css2?family=Maven+Pro:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root{
    --val-coral:#ff4b4b; --val-peach:#ff744f; --val-gradient:linear-gradient(135deg,#ff4b4b,#ff744f);
    --val-black:#100c2a; --val-indigo:#193773; --val-silver:#cdcdcd;
    --bg:#ffffff; --text:#100c2a; --text-sub:#193773; --border:#f0eeee; --card-bg:#fafafa;
    --sp-1:8px; --sp-2:16px; --sp-3:24px; --sp-4:32px; --sp-6:48px;
  }
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Maven Pro',sans-serif;font-size:13px;line-height:1.5;color:var(--text);background:var(--bg);-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .page{max-width:860px;margin:0 auto;padding:40px 48px 48px;position:relative;}
  .hero{position:relative;overflow:hidden;border-bottom:1px solid var(--border);padding-bottom:var(--sp-3);margin-bottom:var(--sp-3);}
  .guilloche{position:absolute;top:-130px;right:-150px;height:340px;pointer-events:none;mix-blend-mode:multiply;opacity:.9;}
  .logo{position:absolute;top:0;right:0;}
  .eyebrow{font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--val-coral);margin-bottom:10px;}
  h1{font-size:38px;font-weight:400;line-height:1.1;background:var(--val-gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:6px;max-width:70%;}
  .meta{font-size:12px;color:var(--text-sub);}
  .snapshot{font-size:13.5px;line-height:1.6;color:var(--text);margin-bottom:var(--sp-4);max-width:760px;}
  .section{margin-bottom:var(--sp-4);break-inside:avoid;}
  .label{font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--val-coral);margin-bottom:4px;}
  .divider{height:1px;background:linear-gradient(90deg,#ff4b4b,#ff744f,transparent);opacity:.3;margin-bottom:var(--sp-2);}
  .sub{font-size:12px;font-weight:600;color:var(--text-sub);text-transform:uppercase;letter-spacing:.06em;margin:var(--sp-2) 0 var(--sp-1);}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
  .item{background:var(--card-bg);border:1px solid var(--border);border-radius:10px;padding:12px 14px;break-inside:avoid;}
  .item-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;gap:8px;}
  .num{font-size:10px;font-weight:700;letter-spacing:.1em;color:var(--val-coral);}
  .tag{font-size:9.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#fff;background:var(--val-gradient);padding:3px 9px;border-radius:99px;}
  .chips{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;}
  .chip{font-size:9.5px;font-weight:700;letter-spacing:.05em;color:var(--val-coral);border:1.5px solid var(--val-coral);padding:2px 7px;border-radius:99px;}
  .item-body{font-size:12.5px;line-height:1.5;color:var(--text);}
  .item-body strong{font-weight:600;color:var(--text-sub);}
  .consequence{margin-top:8px;padding-top:8px;border-top:1px solid var(--border);font-size:12px;font-weight:600;color:var(--val-indigo);font-style:italic;}
  .goal{padding:10px 0;border-bottom:1px solid var(--border);}
  .goal:last-child{border-bottom:none;}
  .goal-title{font-size:14px;font-weight:600;color:var(--text-sub);margin-bottom:3px;}
  .neu{font-size:9px;font-weight:700;letter-spacing:.08em;color:#fff;background:var(--val-gradient);padding:2px 7px;border-radius:99px;vertical-align:middle;}
  .goal-text{font-size:12.5px;line-height:1.5;}
  .rewards{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
  .reward{background:var(--card-bg);border:1px solid var(--border);border-radius:10px;padding:12px 14px;}
  .reward-label{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--val-coral);margin-bottom:6px;}
  .reward-text{font-size:12px;line-height:1.45;}
  .steps{display:flex;flex-direction:column;gap:10px;}
  .step{display:flex;gap:12px;align-items:flex-start;}
  .step-n{width:24px;height:24px;border-radius:50%;background:var(--val-gradient);color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .step-title{font-size:13px;font-weight:600;color:var(--text-sub);}
  .step-text{font-size:12.5px;line-height:1.45;}
  .footer{margin-top:var(--sp-4);padding-top:var(--sp-2);border-top:2px solid;border-image:linear-gradient(90deg,#ff4b4b,#ff744f,transparent) 1;display:flex;align-items:center;gap:14px;}
  .avatar{width:38px;height:38px;border-radius:50%;background:var(--val-gradient);color:#fff;font-weight:600;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .confidential{margin-top:var(--sp-2);text-align:center;font-size:10px;letter-spacing:.1em;color:var(--val-silver);text-transform:uppercase;}
  @page{size:A4;margin:15mm;}
</style>
</head>
<body>
<div class="page">

  <div class="hero">
    <div class="guilloche">${GUILLOCHE_SVG}</div>
    <div class="logo">${LOGO_SVG}</div>
    <div class="eyebrow">Internes Briefing · Stripe × valantic</div>
    <h1>${esc(company)}</h1>
    <div class="meta">${esc(date)} &nbsp;·&nbsp; Vertraulich — nicht an den Prospect</div>
  </div>

  <div class="snapshot">${esc(b.snapshot)}</div>

  <div class="section">
    <div class="label">01 · Status Quo & Stripe-Antwort</div>
    <div class="divider"></div>
    <div class="sub">1.1 — Status Quo & Pain Points</div>
    <div class="grid">${painHtml}</div>
    <div class="sub">1.2 — Stripe als Antwort</div>
    <div class="grid">${answerHtml}</div>
  </div>

  <div class="section">
    <div class="label">02 · Strategische Ziele</div>
    <div class="divider"></div>
    ${goalHtml}
  </div>

  <div class="section">
    <div class="label">03 · Was springt für uns dabei raus?</div>
    <div class="divider"></div>
    <div class="rewards">
      ${rewardRow('Referral', rewards.referral)}
      ${rewardRow('Pull-Through', rewards.pullThrough)}
      ${rewardRow('SPIF', rewards.spif)}
    </div>
  </div>

  <div class="section">
    <div class="label">04 · Next Steps</div>
    <div class="divider"></div>
    <div class="steps">${stepHtml}</div>
  </div>

  <div class="footer">
    <div class="avatar">${esc(initials)}</div>
    <div>
      <div style="font-weight:600;font-size:13px;color:var(--text);">${esc(contact.name)}</div>
      <div style="font-size:12px;color:var(--text-sub);">${esc(contact.role)}${contact.email ? ` &nbsp;·&nbsp; ${esc(contact.email)}` : ''}</div>
    </div>
  </div>
  <div class="confidential">valantic confidential · internes Briefing · powered by Claude</div>

</div>
</body>
</html>`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-valantic-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!SHARED_SECRET || req.headers['x-valantic-secret'] !== SHARED_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { company, contact } = req.body || {};
  if (!company || !String(company).trim()) {
    return res.status(400).json({ error: 'company required' });
  }
  const companyName = String(company).trim();

  const contactInfo = {
    name: contact?.name || 'Joshua Marckwordt',
    role: contact?.role || 'Account Manager, valantic',
    email: contact?.email || 'joshua.marckwordt@nxt.valantic.com',
  };

  let browser;
  try {
    const t0 = Date.now();

    const briefing = await runGroundedJson({
      model: MODEL_RESEARCH,
      system: SYSTEM,
      userMessage: `Erstelle das interne Stripe-Briefing für: "${companyName}".`,
      instruction: buildInstruction(companyName),
      maxTokens: 4500,
      maxContinuations: 2,
      searchMaxUses: 4,
    });
    console.log(`[briefing] "${companyName}" model done in ${Date.now() - t0}ms`);

    if (briefing && briefing.insufficient) {
      return res.status(422).json({
        error: `Profil zu dünn — Recherche unzureichend.${briefing.insufficientReason ? ' ' + briefing.insufficientReason : ''}`,
      });
    }
    if (!briefing || !briefing.snapshot || !Array.isArray(briefing.painPoints) || briefing.painPoints.length === 0) {
      return res.status(422).json({ error: 'Profil zu dünn — Recherche unzureichend.' });
    }

    const displayName = briefing.company || companyName;
    const date = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const slug = `briefing-${companyName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${uuidv4().slice(0, 8)}`;
    const html = buildBriefingHTML(briefing, displayName, contactInfo, date);

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
      printBackground: true,
    });

    const blob = await put(`briefings/${slug}.pdf`, pdfBuffer, {
      access: 'public',
      contentType: 'application/pdf',
      addRandomSuffix: false,
    });

    console.log(`[briefing] "${companyName}" total ${Date.now() - t0}ms`);
    return res.status(200).json({ url: blob.url, slug });
  } catch (err) {
    const status = Number.isInteger(err?.status) ? err.status : 500;
    console.error(`[briefing] "${companyName}" error (${status}):`, err.message);
    return res.status(status).json({ error: err.message });
  } finally {
    if (browser) await browser.close();
  }
}
