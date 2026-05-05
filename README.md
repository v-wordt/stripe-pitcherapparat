# Stripe Pitcher

Internal Valantic tool that generates a personalised **Stripe pitch** — as a shareable landing page — for a named prospect company. Three-stage flow with human review gates between stages: deep prospect research → Stripe-fit mapping draft → pitch website. UI in German; internal artefacts in English.

**Live:** [stripe-pitcherapparat.vercel.app](https://stripe-pitcherapparat.vercel.app)
(hardcoded as `BACKEND_URL` in `index.html:1105`)

---

## User flow

| # | Screen (DOM id) | What it does |
|---|---|---|
| 1 | `#pw-gate` | Single shared password (`SHARED_SECRET`); validated on every API call via the `x-valantic-secret` header. |
| 2 | `#profile-gate` | Sender enters name / role / email / photo; persisted to `localStorage['valantic_profile']`. |
| 3 | `#input-screen` | Prospect company + website. |
| 4 | `#prospect-profile-screen` | Output of `/api/research`, structured by 8 categories (Grundinformationen, Geschäftstätigkeit, …). Refinement chat, max 5 iterations (`_profileIterations` in `index.html:1733`). |
| 5 | `#mapping-draft-screen` | Output of `/api/mapping`: prospect snapshot + 3 pain → solution blocks + narrative. Refinement chat, max 5 iterations (`_mappingIterations` in `index.html:1736`). |
| 6 | `#output-screen` | Final pitch landing page, published to Vercel Blob, copy-to-clipboard URL. |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│  index.html  (single-page app, no framework)    │
│  state: localStorage + sessionStorage           │
└──────────────┬──────────────────────────────────┘
               │ x-valantic-secret on every call
               ▼
┌─────────────────────────────────────────────────┐
│  Vercel serverless functions (Node.js)          │
│  /api/research → /api/mapping → /api/generate   │
│  /api/stats   /api/open/[slug]                  │
└─────┬──────────────┬──────────────┬─────────────┘
      │              │              │
      ▼              ▼              ▼
  Anthropic       Jina + Google   Vercel Blob
  Opus 4.7        Sheets CSV      (public store)
  Haiku 4.5
                         optional: MCP
                         (with hardcoded fallback)
```

- **Models:** Opus 4.7 for the initial deep research pass (`api/research.js:206`); Haiku 4.5 (`claude-haiku-4-5-20251001`) for refinement, mapping, and pitch HTML generation.
- **Web enrichment:** Jina Reader (`r.jina.ai/{url}`) for clean-rendered website text and Jina Search (`s.jina.ai/{q}`) for top web results, both timeboxed to 15s.
- **Profile schema** is fetched at runtime from a Google Sheets CSV (`api/research.js:6–10`) — decoupled from code so you can edit fields without redeploying.
- **MCP** lookup for valantic services is attempted if `MCP_AUTH_TOKEN` is set; otherwise falls back to the hardcoded `INTELLIGENCE` object in `api/generate.js`.

---

## Repository layout

```
index.html                           Single-page frontend (~2200 lines, embedded CSS/JS)
api/
  research.js                        Stage 1: prospect research + refinement
  mapping.js                         Stage 2: Stripe-fit mapping draft + refinement
  generate.js                        Stage 3: build pitch HTML + publish to Blob
  stats.js                           Public stats endpoint
  open/[slug].js                     Tracking pixel handler
package.json                         @anthropic-ai/sdk, @vercel/blob, uuid
vercel.json                          maxDuration=60s, CORS
20260422_stripe_pitcherapparat.xlsx  Target spec (7-agent v2) — see Roadmap
```

Note: `api/generate.js` *also* path-routes its own GET handler for `/api/stats` and `/api/open/[slug]`, duplicating `api/stats.js` and `api/open/[slug].js`. The standalone files are the canonical handlers; the in-`generate.js` branches are legacy and should be ignored when reasoning about routing.

---

## API reference

| Endpoint | Method | Auth | Inputs | Returns |
|---|---|---|---|---|
| `/api/generate` | GET | header | — | `{ok:true}` / 401 (password ping) |
| `/api/generate` | POST | header | `{company, website, contact, mappingDraft}` | `{url, slug, story}` |
| `/api/research` | POST | header | `{company, website}` *or* `{profile, message, url?}` | `{profile}` |
| `/api/mapping` | POST | header | `{profile}` *or* `{mapping, message}` | `{mapping}` |
| `/api/stats` | GET | none | — | `{total, opened, senders, recent[]}` |
| `/api/open/[slug]` | GET | none | — | 1×1 transparent GIF |

Auth header on the protected endpoints is `x-valantic-secret: $SHARED_SECRET`.

`POST /api/generate` accepts either a pre-built `mappingDraft` (the three-stage flow) or just `{company, website}` (single-call legacy flow — runs Haiku 4.5 to synthesize a mapping draft on the fly).

---

## Data model (Vercel Blob, public store)

Two files per pitch, both with `addRandomSuffix:false` so URLs are deterministic:

- `pitches/{slug}.html` — landing page the prospect sees, with tracking pixel injected before `</body>`.
- `index/{slug}.json` — `{ slug, company, website, sender, senderEmail, created, opens, lastOpened, url }`.

Slug = `kebab(company)-{first 8 chars of uuidv4}` (`api/generate.js:345`).

The tracking pixel URL is hardcoded to the production domain in `api/generate.js:347`; if you deploy to a different origin you must change this string or the pixel will hit prod.

---

## Local development

```bash
npm install
vercel dev
```

`.env.local`:

| Variable | Required | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | `sk-ant-…` |
| `SHARED_SECRET` | yes | the password the gate checks |
| `BLOB_READ_WRITE_TOKEN` | yes | from a **public** Vercel Blob store |
| `MCP_AUTH_TOKEN` | no | enables MCP service lookup; falls back to hardcoded `INTELLIGENCE` if absent |
| `BLOB_BASE_URL` | no | overrides the default `public.blob.vercel-storage.com` host used by the tracking pixel reader |

The frontend's `BACKEND_URL` (`index.html:1105`) is hardcoded to production. To test locally end-to-end, change it to `http://localhost:3000/api` for the duration of your dev session — don't commit that.

---

## Editing prompts

Three prompt builders, all in their respective API files. Keep them tight — every JSON string field has a word cap and the model honours them.

| Prompt | File | Purpose |
|---|---|---|
| `buildResearchPrompt` | `api/research.js:78` | Initial deep-research pass; fills the 8-category prospect profile. |
| `buildRefinementPrompt` | `api/research.js:119` | Profile refinement — returns *only* changed fields, merged via `mergeProfiles`. |
| `buildMappingPrompt` | `api/mapping.js:16` | Authors the Mapping Draft from the profile. |
| `buildMappingRefinementPrompt` | `api/mapping.js:76` | Mapping refinement — returns *only* changed fields, merged via `mergeMapping`. |
| `buildPrompt` | `api/generate.js:167` | Single-call legacy flow only. Three-stage flow uses the prebuilt `mappingDraft` directly. |

Output schema (Mapping Draft): `prospect_snapshot` (5 fields) · `pain_solution_blocks` (exactly 3, each with `block_name`, `prospect_situation`, `stripe_answer`, `fit`, `rationale`, `pitch_angle`) · `narrative` (`headline_message`, `headline_highlight`, `top_3_priorities`, `de_emphasize`) · `open_items` · `next_step` · `cta_label`.

---

## Auth model

- One shared password, stored as `SHARED_SECRET` on the server.
- Frontend sends it via `x-valantic-secret` once (validated by `GET /api/generate`), then caches the same value in `sessionStorage['vauth_token']` and re-sends it on every subsequent API call.
- Stateless on the backend — every request validates the header against `process.env.SHARED_SECRET`. No sessions, no cookies, no rotation.

---

## Roadmap

The workbook `20260422_stripe_pitcherapparat.xlsx` is the source of truth for a planned **7-agent multi-agent rewrite** (Golf, Mike, Papa, Sierra, Romeo + Piccolo cheap-mode variants of Golf/Mike/Romeo) with a 14-step `Process` sheet, an `Interaction Matrix`, and per-agent prompts on the `Prompts` sheet. The current code is a precursor — three of the workbook's stages collapse into the three API endpoints today. This README documents v1; treat the workbook as the spec for v2.
