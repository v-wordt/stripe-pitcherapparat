---
name: prospect-briefing
description: "Use this skill whenever the user wants to turn a researched company profile into a one-page internal Stripe-prospect briefing. Triggers include: any mention of a 'briefing', 'account brief', or 'Steckbrief' for a sales lead; pasting a prospect profile JSON; or asking to prepare a prospect company for a discovery conversation. Also use it when the user does not say 'briefing' but is clearly preparing internal sales material about a prospect company and its Stripe fit. Do NOT use for client-facing material, general company research, or producing the prospect profile itself."
---

# Prospect Briefing

## Overview

This skill generates a single-page **internal** briefing that a Stripe account owner reads before approaching a prospect. Input is a structured prospect profile (JSON) produced by an earlier research step — treat that profile as given.

The briefing is internal only. It openly discusses referral commission, consulting pull-through, and a personal SPIF, and is never shown to the prospect. Do not produce a client-facing variant.

This skill produces **content and structure only**. Fonts, colours, chips, arrows, and layout are handled by a separate corporate-design skill — do not address them here.

Output language is **German, always**.

## Quick Reference

| Element | Rule |
|---------|------|
| Title block | Snapshot paragraph, 60–90 words, prioritised by Stripe relevance |
| Section 01 / 1.1 | 4 pain points (3 acceptable), 20–35 words each, per-company tag |
| Section 01 / 1.2 | 4 Stripe-answer items, 20–35 words each, 1–3 product chips, one consequence each |
| Section 02 | 3 goals, 30–45 words each, all Stripe-addressable |
| Section 03 | 3 fixed items (Referral, Pull-Through, SPIF), 15–25 words each |
| Section 04 | 3 fixed steps, 20–30 words each |
| Total | ~650–850 words, one A4 page |

## Workflow

### Step 1 — Validate the input

The input is a prospect profile JSON with this shape:

```
{ "Category Name": { "Field Name": { "value": "...", "confidence": "high|medium|low", "assumption": true|false, ... } } }
```

Standard categories: Grundinformationen, Geschäftstätigkeit, Grösse und Struktur, Produkte & Services, Finanzierung & Wachstum, Markt & Wettbewerb, Technologie & Infrastructure, Online-Touchpoints, Signale. Users may add or remove fields — read what is present, assume nothing.

**Stop check.** The briefing needs, at minimum: a company identity, what the company does, and at least one entry in **Online-Touchpoints**. If all three are missing, stop — tell the user the profile is too thin and to complete the research step. Do not invent a company. If they are present but sparse, proceed and hedge heavily.

### Step 2 — Anchor on the touchpoints

Online-Touchpoints is the pivot of the briefing. These are the specific surfaces where money does or could change hands (webshop, B2B ordering portal, training academy, subscription manager, spare-parts shop) — not the corporate homepage. Each entry holds Bezeichnung, Typ, URL, Zielgruppe, Betreiber, Technische Basis, Aktueller Bezahl-/Buchungsprozess, Beobachtete Lücken / Auffälligkeiten, Status.

A `Status` of "nicht vorhanden" is meaningful: a *missing* touchpoint (no B2C shop, no online booking) can be the briefing's central angle.

### Step 3 — Apply hedging throughout

The briefing must not give the account owner false confidence. Key the certainty of every claim off the profile metadata, not your own judgement:

- `confidence: high` → state plainly. "Der Shop läuft auf Hybris."
- `confidence: low` or `assumption: true` → hedge. "Eine Multi-Country-Bezahl-Architektur fehlt vermutlich."
- `confidence: medium` → lean toward hedging. Better to under-claim than over-claim internally.

Hedge through wording only (vermutlich, wahrscheinlich, dürfte, oft). Never show confidence levels in the text.

### Step 4 — Write the briefing

Follow the structure below exactly.

## Briefing structure

### Title block — company snapshot

A paragraph of roughly 60–90 words introducing the company. It is a *prioritised summary*, not a profile recap: weight the content so the reader quickly grasps what the company is and why Stripe is relevant; assume the full profile is available for detail. Typically touches heritage, ownership, scale, core business, brands, the touchpoint(s) in scope, and closes on where Stripe is a lever. Guideline, not a checklist — let Stripe-relevance decide what makes the cut.

### Section 01 — Status Quo & Stripe-Antwort

**1.1 — Status Quo & Pain Points.** Four pain points (three acceptable only if the company genuinely offers no more). Each: a short bold lead-in plus one or two sentences, 20–35 words, with a short tag.

Pain-point tags are coined per company — no fixed vocabulary. Keep them short, in proper German or correctly-spelled English, no Denglisch (e.g. "outgesourced", not a half-German hybrid). Real examples: OUTGESOURCED, B2B-SHOP, INTERNATIONAL, MULTI-SHOP, OPS, VERBRAUCH.

Each pain point diagnoses what slows a touchpoint down today. Ground it in the Online-Touchpoints entries and hedge per Step 3.

**1.2 — Stripe als Antwort.** Four items, one per pain point, 20–35 words each. Each item is one Stripe move that addresses a pain and carries a **consequence** — a statement of what the move produces for the company.

Write the consequence in client-facing sales language: it is deliberately a phrasing the account owner can reuse in the actual pitch. It is the only place a sales register is correct. Everything else stays dry.

Tag each 1.2 item with 1–3 chips from this fixed catalogue:

| Tag | Stripe product |
|-----|----------------|
| CHECKOUT | Optimized Checkout Suite (hosted/embedded checkout) |
| LINK | Link — one-click checkout for returning customers |
| SUBS | Billing & Subscriptions — recurring revenue |
| CONNECT | Connect — multi-brand / multi-shop / marketplace splits |
| B2B | Invoicing & Net-Terms — invoice purchase, payment terms, multi-user accounts |
| TAX | Tax & Radar — automated VAT/USt, fraud protection |
| PAYLINK | Payment Links — low-effort booking/payment links (academies, training) |
| ACP | Agentic Commerce Suite — discoverability and checkout inside AI agents |

A move may span products — use multiple chips (max 3); the item still counts as one of the four. CHECKOUT and LINK are always distinct tags, never merged.

This catalogue is a **fallback**. A separate skill researches Stripe's current product suite; prefer its output if available, but keep the tag conventions, the 1–3 chip rule, and the four-item limit from this skill regardless. Select freely from the catalogue — never invent or rename Stripe products.

### Section 02 — Strategische Ziele

Three goals (Ziel 01, 02, 03), each a heading plus a short rationale, 30–45 words.

Every goal must be Stripe-addressable — never a generic strategy goal Stripe does not concretely enable.

The `NEU` tag belongs only on the Agentic Commerce / ACP goal, and only when that goal is present. Never tag any other goal `NEU`.

Include the ACP goal **only with a plausible discovery hook** — a believable scenario where a buyer asks an AI agent for something this company sells. For pure niche-B2B cases with no such scenario, drop it and use another Stripe-addressable goal (recurring revenue, consolidation, internationalisation, back-office automation). Do not force ACP where the hook is not credible.

### Section 03 — Was springt für uns dabei raus?

Three fixed items, compact (15–25 words each). Structure fixed; tailoring light — name the company's specific products/touchpoints only. Keep the footprint small; the weight is on 01 and 02.

- **Referral** — one-time Stripe referral commission on processed volume. Keep qualitative ("substanziell"); do not invent a number.
- **Pull-Through** — consulting and implementation volume the engagement opens up; reference the company's actual workstreams.
- **SPIF** — personal SPIF for the account owner on a successful signing. Amount is a variable; default `5.000€` unless the user supplies another.

### Section 04 — Next Steps

Three fixed steps, 20–30 words each. Insert the company name; otherwise fixed.

1. **Kurzes internes Sync** — ~15 min, internal: hand over argumentation and open questions; the account owner shares what they know.
2. **Easy Talk mit [Company]** — low-pressure introduction, not a pitch; test whether the hypotheses hold.
3. **Discovery Workshop — auf uns** — if the conversation carries, offer a discovery workshop, free for the prospect.

## Length budget

Targets and a total-length sanity check, not hard per-item caps: snapshot 60–90 w; 1.1 four × 20–35 w; 1.2 four × 20–35 w; 02 three × 30–45 w; 03 three × 15–25 w; 04 three × 20–30 w. Total ~650–850 words. If pain points drop to three, remaining items may run slightly longer — the budget flexes around the total.

## Tone

Default register: dry, informational, internal, pragmatic, honest. Short sentences. The reader is a colleague who needs facts, not a sell. The single exception is the consequence statement in each 1.2 item, written in client-facing sales language as reusable pitch phrasing.

Avoid AI-tells in the briefing text. No em dashes. No theatrical colons ("The result: ..."). No inflated phrasing ("game-changer", "unlock", "seamless"). No rule-of-three flourishes, no grand closing sentences. Every pain point, product mapping, and goal must be specific to this company and its touchpoints — a sentence that could appear in any briefing is a failure.
