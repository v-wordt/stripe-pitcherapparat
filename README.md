# valantic AI Sales Lab — Personalised Pitch Generator

> Generates personalised client landing pages in seconds. Enter name + context → Claude builds a bespoke value story → shareable link.

**Demo:** Sales All-Hands, April 16th · **Live:** [valantic-pitch-api.vercel.app](https://valantic-pitch-api.vercel.app)

---

## ⚡ Thursday Checklist

| Task | Owner | Status |
|------|-------|--------|
| CNAME: valantic.ai → valantic-pitch-api.vercel.app | Jenny | ⏳ |
| Add domain in Vercel Dashboard → Settings → Domains | Jenny | ⏳ |
| Services JSON dump → structured into `generate.js` | Maike → Jonas | ⏳ |
| Reference database via MCP endpoint in `generate.js` | Jonas | ⏳ |
| Fallback to hardcoded seed data if MCP down | Jonas | ⏳ |
| Test tracking end-to-end (generate → open → check /api/stats) | Jonas | ⏳ |
| Redirect `/` → `/valantic-pitch-generator.html` in vercel.json | Jonas | ⏳ |
| QR code for demo | Maike | ⏳ |
| Azure migration (compliance?) | Jonas / Tim | ❓ POST-DEMO |

---

## Architecture

```
Frontend    valantic-pitch-generator.html (Vercel static)
Backend     Vercel serverless — api/generate.js, api/stats.js, api/open/[slug].js
AI          Claude Sonnet 4.5 (Anthropic API)
Storage     Vercel Blob (PUBLIC store) — pitches/ + index/ per pitch
Tracking    1×1 GIF pixel → /api/open/[slug] → increments opens in index JSON
```

## API Files

| File | Purpose |
|------|---------|
| `api/generate.js` | Main function — auth, Claude call, HTML build, Blob store, index write |
| `api/stats.js` | Returns `{total, opened, senders, recent}` — powers the live counter in the tool |
| `api/open/[slug].js` | Tracking pixel — fires when client opens generated page |

## Environment Variables

| Variable | Notes |
|----------|-------|
| `ANTHROPIC_API_KEY` | sk-ant-... |
| `SHARED_SECRET` | valantic2026 |
| `BLOB_READ_WRITE_TOKEN` | From Vercel Blob — **must be PUBLIC store** |

## Data Model

Every pitch writes two files to Vercel Blob:

- `pitches/[slug].html` — the page the client sees
- `index/[slug].json` — `{ slug, name, company, role, sender, senderEmail, created, opens, lastOpened, url }`

## Prompt Rules (Important for Jonas)

- `approaches` = **future tense only** — what we WOULD do for this client
- `references` = **past tense only** — what we DID elsewhere
- Never mix. The prompt is explicit. If Claude mixes them the page reads like a brochure.
- `next_step` always mentions dedicated AI specialists + ROI anchor from similar client
- `greeting` always includes an urgency signal

## Contacts

| Name | Role | Owns |
|------|------|------|
| Maike Saager | Head of Growth Platform AI Hub | Product, prompt, content |
| Jonas Metz | AI Architect | Backend, MCP, Azure (post-demo) |
| Jenny Vytruchenko | AI Product Owner | valantic.ai domain, Vercel |
| Alex Wach | CC Engagement Lead | Sales session presenter |
