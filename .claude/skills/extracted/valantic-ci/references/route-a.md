# Route A: valantic Guilloche

**Character:** Elegant, precise, professional. Fine coral-to-peach gradient line art — concentric contour strokes suggesting depth and sophistication, like security engraving patterns.

**When to use:** Consulting documents, whitepapers, corporate reports, proposals, dashboards.

---

## Color palette for Route A

- Primary: valantic Gradient (Coral `#ff4b4b` → Peach `#ff744f`) — for titles and Guilloche lines
- Secondary: **Indigo** `#193773` — for highlights, subheadings
- Body text: valantic Black `#100c2a`
- Backgrounds: White (light mode) · valantic Black `#100c2a` (dark mode)
- Silver `#cdcdcd` may always be added as a neutral accent

---

## Typography for Route A

All HTML artifacts use Maven Pro throughout (Segoe UI is for PowerPoint/email only).

```css
/* Route A: Maven Pro Regular throughout — elegant, not heavy */
body  { font-family: 'Maven Pro', sans-serif; font-size: 17px; font-weight: 400; line-height: 1.5; }
h1    { font-size: 45px; font-weight: 400; line-height: 1.1; /* + gradient fill */ }
h2    { font-size: 30px; font-weight: 400; line-height: 1.2; color: #100c2a; }
h3    { font-size: 25px; font-weight: 400; line-height: 1.3; color: #100c2a; }
strong { font-weight: 600; color: #193773; }
```

---

## Route A Guilloche SVGs — Official Assets

The skill includes **11 official Guilloche SVGs** in `assets/shapes/route-a/`. Stroke-only paths filled with the coral-to-peach gradient. Always embed **inline** (never as `<img>`) so the internal gradient definitions render correctly.

### Available shapes

| File | ViewBox (w×h) | Description |
|---|---|---|
| `guilloche-02.svg` | 1126×1126 | Square — soft double-lobe |
| `guilloche-03a-01.svg` | 1015×1154 | Tall — two-lobe vertical, variant 1 |
| `guilloche-03a-02.svg` | 1015×1154 | Tall — two-lobe vertical, variant 2 |
| `guilloche-03b-01.svg` | 838×1126 | Tall narrow — rounded hourglass, variant 1 |
| `guilloche-03b-02.svg` | 838×1126 | Tall narrow — rounded hourglass, variant 2 |
| `guilloche-03c-01.svg` | 839×1059 | Tall — side-pinch figure, variant 1 |
| `guilloche-03c-02.svg` | 839×1059 | Tall — side-pinch figure, variant 2 |
| `guilloche-03c-03.svg` | 839×1059 | Tall — side-pinch figure, variant 3 |
| `guilloche-04a-01.svg` | 736×1129 | Tall narrow — slim vertical, variant 1 |
| `guilloche-04a-02.svg` | 736×1129 | Tall narrow — slim vertical, variant 2 |
| `guilloche-04b-01.svg` | 999×1239 | Tall wide — multi-lobe, single variant |

### Recommended pairings

- **Cover page / hero:** `guilloche-03a-01`, `guilloche-03c-01`, `guilloche-04b-01` — tall shapes bleed off top-right
- **Section accent:** `guilloche-02` — square shape works well cropped into a corner
- **Dark mode:** Any shape; lines show clearly on `#100c2a` background

---

## Placement rules (from brand guidelines)

1. **Prominent size** — the Guilloche must fill a significant portion of the hero/cover area
2. **Bleed generously** — let it extend well beyond the medium edge; cropping is intentional
3. **Maintain recognisability** — at least one additional visible curve/loop must remain visible
4. **Position:** Top-right corner of cover pages; can fill full right half of a hero

---

## HTML usage — inline SVG

Embed SVG **inline** so gradient defs render. Strip the XML declaration (`<?xml ...?>`), keep all `<defs>`, gradients, and paths.

```html
<!-- Route A: Guilloche inline SVG, cropped top-right of cover -->
<div style="position:relative; overflow:hidden; background:#fff; min-height:100vh;">

  <!-- Guilloche wrapper: positions it top-right, bleeds off edge -->
  <div style="position:absolute; top:-10%; right:-8%; height:95%; width:auto; pointer-events:none;">
    <!-- PASTE full SVG inline here. Set style="height:100%; width:auto;" on the <svg> element -->
    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
         viewBox="0 0 1015.91 1154.31" style="height:100%; width:auto;">
      <defs>
        <!-- Keep ALL gradient definitions — they define the coral stroke colors -->
      </defs>
      <!-- All path elements -->
    </svg>
  </div>

  <!-- Content on top -->
  <div style="position:relative; z-index:1; padding:64px;">
    <!-- logo, title, etc -->
  </div>
</div>
```

### Dark mode

On `background: #100c2a`, coral lines show naturally — no blend mode needed. Use white logo.

---

## Full cover page template

```html
<section style="
  position:relative; overflow:hidden;
  background:#fff; height:100vh; min-height:640px;
  display:flex; flex-direction:column; justify-content:flex-end;
  padding:64px; font-family:'Maven Pro',sans-serif;">

  <!-- Guilloche: top-right bleed, inline SVG -->
  <div style="position:absolute; top:-10%; right:-8%; height:95%; pointer-events:none;">
    <!-- INLINE SVG from assets/shapes/route-a/guilloche-03a-01.svg -->
  </div>

  <!-- Logo: black, top-right, tight viewBox for correct sizing -->
  <div style="position:absolute; top:40px; right:52px;">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="232 216 1500 325" style="height:32px;width:auto;">
      <path fill="#100C2A" d="M1678,456.2..."/><!-- all paths -->
    </svg>
  </div>

  <!-- Cover text, bottom-left -->
  <p style="font-size:14px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:#193773;margin-bottom:24px;">
    Intelligence Report · 2025
  </p>
  <h1 style="font-size:clamp(40px,5.5vw,72px);font-weight:400;line-height:1.1;max-width:640px;margin-bottom:22px;
             background:linear-gradient(135deg,#ff4b4b,#ff744f);
             -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">
    Report Title
  </h1>
  <p style="font-size:17px;color:#193773;max-width:480px;margin-bottom:56px;line-height:1.5;">
    Subtitle text here.
  </p>
  <div style="display:flex;gap:32px;font-size:14px;color:#cdcdcd;border-top:1px solid #f0eeee;padding-top:20px;">
    <span>valantic GmbH</span><span>2025</span><span>CONFIDENTIAL</span>
  </div>
</section>
```
