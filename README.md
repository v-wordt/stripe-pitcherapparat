# valantic.ai Pitch Backend — Vercel

Deploy in ~10 minutes. No Azure needed.

---

## What it does

`POST /api/generate` — takes contact info, calls Claude, builds HTML, stores it in Vercel Blob, returns a public URL like `https://blob.vercel-storage.com/pitches/stefan-rewe-abc12345.html`

Later: point valantic.ai/p/* to these URLs via a redirect rule.

---

## Deploy steps

### 1. Push to GitHub

```bash
cd valantic-pitch-vercel
git init
git add .
git commit -m "initial"
# create a repo on github.com, then:
git remote add origin https://github.com/YOUR_ORG/valantic-pitch-api.git
git push -u origin main
```

### 2. Import on Vercel

1. Go to vercel.com → New Project
2. Import the GitHub repo
3. Framework: Other
4. Click Deploy (first deploy will fail — that's fine, we need env vars)

### 3. Set environment variables

In Vercel project → Settings → Environment Variables, add:

| Name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` (your Anthropic key) |
| `BLOB_READ_WRITE_TOKEN` | (from Vercel Storage → Blob → Create store → copy token) |
| `SHARED_SECRET` | `valantic2026` (or choose your own) |

### 4. Create Vercel Blob store

1. Vercel Dashboard → Storage → Create → Blob
2. Name it `valantic-pitches`
3. Copy the `BLOB_READ_WRITE_TOKEN` → paste into env vars above

### 5. Redeploy

Vercel → Deployments → Redeploy latest. Should be green.

### 6. Test

```bash
curl -X POST https://YOUR-PROJECT.vercel.app/api/generate \
  -H "Content-Type: application/json" \
  -H "x-valantic-secret: valantic2026" \
  -d '{
    "name": "Stefan Müller",
    "company": "REWE Group",
    "role": "CIO",
    "context": "Facing SAP migration, board asking for AI ROI",
    "contact": {
      "name": "Maike Saager",
      "role": "Head of Growth Platform AI Hub",
      "email": "maike.saager@valantic.com"
    }
  }'
```

Returns: `{ "url": "https://...", "slug": "stefan-rewe-group-abc12345" }`

### 7. Connect to frontend

In `valantic-pitch-generator.html`, update:

```js
const BACKEND_URL = 'https://YOUR-PROJECT.vercel.app/api';
const BACKEND_SECRET = 'valantic2026';
```

---

## Later: custom domain

Once valantic.ai is available, add a redirect in `vercel.json`:

```json
{
  "redirects": [
    {
      "source": "/p/:slug",
      "destination": "https://YOUR-BLOB-URL/pitches/:slug.html",
      "permanent": false
    }
  ]
}
```

Or point the whole project to valantic.ai and serve pages directly.

---

## Questions

Contact: Maike Saager / Jonas Metz
