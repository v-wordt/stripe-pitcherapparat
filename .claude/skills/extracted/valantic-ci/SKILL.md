---
name: valantic-ci
description: >
  Apply valantic corporate identity (CI) to all HTML and PDF artifacts created in Claude chats.
  ALWAYS use this skill whenever you are creating or updating any HTML file, HTML artifact, web page,
  report, dashboard, presentation, or PDF for valantic. This includes whitepapers, landing pages,
  infographics, slide-style pages, data visualizations, or any other designed output.
  Even if the user does not explicitly ask for "CI" or "branding", use this skill any time you
  are producing a polished HTML or PDF artifact for a valantic user. This is the single source of
  truth for all valantic design decisions.
---

# valantic CI Skill

Apply the valantic brand identity consistently to every HTML and PDF artifact.

---

## Step 0: Confirm Design Route + Theme (REQUIRED — ask before any output)

Ask both questions together before producing any artifact:

> **1. Which design route?**
> - **Route A** — Elegant & precise (Guilloche line art, consulting documents, dashboards)
> - **Route B** — Bold & energetic (filled coral blob, marketing, proposals)
> - **Route C** — Human & photographic (organic blob with image mask, people-focused)
>
> **2. Which theme?**
> - **Light** — White background, dark text
> - **Dark** — `#100c2a` background, white text

Wait for both answers. Then read the matching route reference:
- Route A → `references/route-a.md`
- Route B → `references/route-b.md`
- Route C → `references/route-c.md`

The route reference contains hero/shape implementation details. Load it before writing any HTML.

---

## Step 1: Classify artifact type → logo position

| Artifact type | Logo position | Brand shape in hero? |
|---|---|---|
| Title / cover page | Top-right | ✅ Yes |
| Long-form report / whitepaper | Top-left header | ❌ Cover only |
| Single-page infographic | Bottom-left or right | ❌ No |
| Dashboard / data view | Top-left header | ❌ No |
| Presentation slide (HTML) | Bottom-left | ✅ First slide only |
| Landing page / hero | Top-right | ✅ Yes |
| Email / short memo | Bottom-right | ❌ No |

---

## Step 2: Universal CI rules

### Color tokens

```css
:root {
  /* Gradient */
  --val-coral:    #ff4b4b;
  --val-peach:    #ff744f;
  --val-gradient: linear-gradient(135deg, #ff4b4b, #ff744f);

  /* Base */
  --val-black:    #100c2a;
  --val-white:    #ffffff;

  /* Secondary */
  --val-indigo:   #193773;
  --val-blue:     #3c4bc8;
  --val-purple:   #5b26b7;

  /* Tertiary */
  --val-gold:     #c0aa81;
  --val-silver:   #cdcdcd;
  --val-lavender: #a78db6;

  /* Theme-aware tokens — use these in all components, never hardcode bg/text colors */
  --bg:           var(--val-white);
  --text:         var(--val-black);
  --text-sub:     var(--val-indigo);
  --border:       #f0eeee;
  --card-bg:      #fafafa;
}

/* Dark theme — add class="dark" to <html> */
.dark {
  --bg:       var(--val-black);
  --text:     var(--val-white);
  --text-sub: var(--val-silver);
  --border:   rgba(255,255,255,0.08);
  --card-bg:  rgba(255,255,255,0.04);
}
```

**Rule:** Use `--bg`, `--text`, `--text-sub`, `--card-bg`, `--border` everywhere in component styles. Never hardcode `#ffffff` or `#100c2a` in components.

### Spacing scale (8px grid — use only these)

```css
:root {
  --sp-1:  8px;   --sp-2: 16px;  --sp-3: 24px;  --sp-4: 32px;
  --sp-6: 48px;   --sp-8: 64px;  --sp-10: 80px;
}
```

### Typography

Load Maven Pro from Google Fonts (all HTML artifacts):
```html
<link href="https://fonts.googleapis.com/css2?family=Maven+Pro:wght@400;500;600;700&display=swap" rel="stylesheet">
```
Self-hosted fallback: `<link rel="stylesheet" href="assets/fonts/valantic-fonts.css">`

```css
body  { font-family:'Maven Pro',sans-serif; font-size:17px; font-weight:400; line-height:1.5; color:var(--text); background:var(--bg); }
h1    { font-size:45px; font-weight:400; line-height:1.1; margin-bottom:var(--sp-2);
        background:var(--val-gradient); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
h2    { font-size:30px; font-weight:400; line-height:1.15; margin-top:var(--sp-6); margin-bottom:var(--sp-2); color:var(--text); }
h3    { font-size:25px; font-weight:400; line-height:1.3;  margin-top:var(--sp-4); margin-bottom:var(--sp-2); color:var(--text-sub); }
p     { font-size:17px; line-height:1.5; margin-bottom:var(--sp-2); }
strong{ font-weight:600; color:var(--text-sub); }

/* Route B/C: bold headings — add .route-bc class to <body> */
.route-bc h1, .route-bc h2 { font-weight:700; }

/* Label / eyebrow */
.label { font-size:14px; font-weight:600; letter-spacing:.15em; text-transform:uppercase;
         color:var(--val-coral); display:block; margin-bottom:var(--sp-1); }
.label + h2, .label + h3 { margin-top:0; }

/* Divider */
.divider { height:1px; background:linear-gradient(90deg,#ff4b4b,#ff744f,transparent); margin:var(--sp-6) 0; opacity:.25; }

/* Badge — always use these classes; colors come from tokens */
.badge         { display:inline-flex; align-items:center; gap:var(--sp-1); font-size:12px; font-weight:600;
                 letter-spacing:.08em; text-transform:uppercase; padding:4px 10px; border-radius:99px;
                 background:var(--val-gradient); color:var(--val-white); }
.badge-outline { background:transparent; border:1.5px solid var(--val-coral); color:var(--val-coral); }
.badge-neutral { background:var(--card-bg); border:1px solid var(--border); color:var(--text-sub); }
```

### Logo — inline SVG (copy ALL paths verbatim)

**Critical:** embed inline, never `<img>`. Use tight viewBox `232 216 1500 325`.
Light bg → `fill="#100C2A"` | Dark bg → `fill="#FFFFFF"` (change ALL fill attributes).

```html
<!-- Light background logo -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="232 216 1500 325" style="height:28px;width:auto;">
  <path fill="#100C2A" d="M1678,456.2c-7.8,14.8-24.3,23.9-43.6,23.9c-30,0-51.8-22.4-51.8-53.2s21.8-53.2,51.8-53.2c19.2,0,35.3,8.9,43.6,23.9l54-31.4c-19.3-33.1-56.2-53.6-96.8-53.6c-65.4,0-114.7,49.1-114.7,114.2S1569.8,541,1635.2,541c40.6,0,77.5-20.6,96.8-54L1678,456.2z"/>
  <rect fill="#100C2A" x="1439" y="318.8" width="62" height="216.2"/>
  <path fill="#100C2A" d="M1470,216.1c-20.4,0-37.6,17.2-37.6,37.6s17.2,37.6,37.6,37.6s37.6-17.2,37.6-37.6S1490.4,216.1,1470,216.1z"/>
  <path fill="#100C2A" d="M1331.8,519.9c16.2,14.6,44.1,19.5,87.8,15.2v-55.9c-19.9,1.1-32.8,0.3-39.9-6.3c-3.7-3.5-5.5-8.3-5.5-14.8v-80h45.4v-59.4h-45.4v-75.9l-62,18.6v57.3H1277V378h35.2v80C1312.2,488.2,1318.4,507.8,1331.8,519.9z"/>
  <path fill="#100C2A" d="M1163.4,374.6c23,0,41.7,18.7,41.7,41.7v118.6h62V402.1c0-49.4-40-89.5-89.4-89.5c-18.9,0-37.4,6-52.7,17.2l-3.3,2.4v-13.4h-62V535h62V416.3C1121.8,393.3,1140.4,374.6,1163.4,374.6z"/>
  <path fill="#100C2A" d="M1029.2,534.9V318.8h-62v24.1l-3.6-4.1c-15-17.4-36.6-26.2-64.1-26.2c-27.5,0-53.4,11.7-72.8,32.9c-19.7,21.5-30.5,50.4-30.5,81.4s10.8,59.9,30.5,81.4c19.4,21.2,45.2,32.9,72.8,32.9c27.6,0,49-8.8,64.1-26.2l3.6-4.1V535L1029.2,534.9z M912.8,482.6c-32.6,0-54.5-22.4-54.5-55.8s21.9-55.8,54.5-55.8c32.6,0,54.5,22.4,54.5,55.8S945.3,482.6,912.8,482.6z"/>
  <polygon fill="#100C2A" points="714.8,234.7 714.8,534.9 776.8,534.9 776.8,216.1"/>
  <path fill="#100C2A" d="M684.3,534.9V318.8h-62v24.1l-3.6-4.1c-15.1-17.4-36.6-26.2-64.1-26.2c-27.5,0-53.4,11.7-72.8,32.9c-19.6,21.5-30.5,50.4-30.5,81.4s10.8,59.9,30.5,81.4c19.4,21.2,45.2,32.9,72.8,32.9c27.5,0,49-8.8,64.1-26.2l3.6-4.1V535L684.3,534.9z M567.8,482.6c-32.6,0-54.5-22.4-54.5-55.8s21.9-55.8,54.5-55.8c32.6,0,54.5,22.4,54.5,55.8S600.4,482.6,567.8,482.6z"/>
  <polygon fill="#100C2A" points="395.3,318.8 348,463 300.7,318.8 232,318.8 312,534.9 384,534.9 464,318.8"/>
</svg>
<!-- Dark bg: replace every fill="#100C2A" with fill="#FFFFFF" -->
```

Logo sizing: nav/header `28px` · cover/footer `32px` · hero `40px` · minimum `15px`.
**Never:** use `<text>`, fonts, or emoji as logo substitute. Never apply gradient fill to wordmark.

### Icons — Phosphor (load on every artifact, no exception)

```html
<!-- Always include this — CDN for online artifacts -->
<script src="https://unpkg.com/@phosphor-icons/web@2.1.2"></script>
<!-- Self-hosted: <link rel="stylesheet" href="assets/icons/phosphor.css"> -->
```

```html
<!-- Gradient icon -->
<i class="ph ph-arrow-right" style="background:var(--val-gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-size:20px;"></i>
<!-- Solid coral icon -->
<i class="ph ph-check-circle" style="color:var(--val-coral);font-size:20px;"></i>
```

Common: `ph-arrow-right` · `ph-check-circle` · `ph-chart-bar` · `ph-chart-line-up` · `ph-robot` · `ph-brain` · `ph-gear` · `ph-users` · `ph-shield-check` · `ph-lightning` · `ph-buildings`

---

## Step 3: Route-specific hero/header

Load the route reference from Step 0 for exact shape SVG/PNG code and placement rules.

Apply shapes **only** on: title/cover · first presentation slide · landing page hero.
**Never** on content pages, dashboards, or emails.

### Contrast rule for Route B/C shapes (solid coral fill)

| Text over coral shape | Safe? |
|---|---|
| White `#ffffff` | ✅ Yes |
| Dark `#100c2a` | ✅ Yes |
| Coral or gradient text | ❌ Never — invisible |
| Indigo `#193773` | ⚠️ Avoid |

On dark `#100c2a` sections: use `mix-blend-mode: screen` on shape — blob glows, text reads fine.

---

## Step 4: Page structure template

```html
<!DOCTYPE html>
<html lang="en" class="[add 'dark' for dark theme]">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Title] | valantic</title>
  <link href="https://fonts.googleapis.com/css2?family=Maven+Pro:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/@phosphor-icons/web@2.1.2"></script>
  <style>
    /* 1. All :root tokens + .dark override (Step 2) */
    /* 2. Spacing scale */
    /* 3. Typography + badge/label/divider styles */
    /* 4. Route/artifact-specific layout */
  </style>
</head>
<body class="[add 'route-bc' for Route B or C]">
  <!-- Logo (position per Step 1) -->
  <!-- Hero with brand shape if applicable (Step 3) -->
  <!-- Content -->
</body>
</html>
```

---

## Step 5: PDF-specific rules

- `@media print` with `15mm` page margins
- Logo in header every page; brand shape on cover only
- `page-break-before: always` before major sections
- Large print areas: replace gradient backgrounds with solid `#ff4b4b`

---

## Quality checklist (verify before output)

- [ ] Maven Pro loaded
- [ ] Phosphor Icons loaded (CDN script or self-hosted CSS)
- [ ] `:root` token block + `.dark` override present
- [ ] All component styles use `--bg`, `--text`, `--text-sub`, `--card-bg`, `--border` — no hardcoded colors
- [ ] `<html class="dark">` set for dark theme
- [ ] `<body class="route-bc">` set for Route B or C
- [ ] Logo: inline SVG only, viewBox `232 216 1500 325`, all 8 path/polygon/rect elements present
- [ ] Logo fill matches theme: `#100C2A` light · `#FFFFFF` dark
- [ ] Badges use `.badge` / `.badge-outline` / `.badge-neutral` classes
- [ ] Brand shape only in hero/cover — not repeated on content pages
- [ ] Route B/C + light bg: text over shape is `var(--text)`, NOT coral/gradient
- [ ] Gradient angle: 135° (not 0/45/90/180°)
