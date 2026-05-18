# valantic Brand Assets Reference

This file documents all real brand assets extracted from the official valantic CI guidelines PDF and the Phosphor Icons package.

---

## Logo SVGs

Located in `assets/logo/`:

| File | Use |
|---|---|
| `valantic-black.svg` | On white/light backgrounds |
| `valantic-white.svg` | On dark (#100c2a) backgrounds or gradient |

The full SVG `viewBox` is `0 0 1964 757.3`. This is the real valantic wordmark logo — custom letterforms, not just a font.

**Critical:** The official SVG has large save-area whitespace. Use the **tight viewBox** `"232 216 1500 325"` which crops to just the letterforms. With this viewBox, setting `height: 28px` renders letterforms that are actually 28px tall.

**Inline HTML usage (recommended for crispest rendering):**
```html
<!-- Black logo (tight viewBox) -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="232 216 1500 325" style="height:28px; width:auto;">
  <path fill="#100C2A" d="M1678,456.2c-7.8,14.8-24.3,23.9-43.6,23.9c-30,0-51.8-22.4-51.8-53.2s21.8-53.2,51.8-53.2c19.2,0,35.3,8.9,43.6,23.9l54-31.4c-19.3-33.1-56.2-53.6-96.8-53.6c-65.4,0-114.7,49.1-114.7,114.2S1569.8,541,1635.2,541c40.6,0,77.5-20.6,96.8-54L1678,456.2z"/>
  <rect x="1439" y="318.8" fill="#100C2A" width="62" height="216.2"/>
  <path fill="#100C2A" d="M1470,216.1c-20.4,0-37.6,17.2-37.6,37.6s17.2,37.6,37.6,37.6s37.6-17.2,37.6-37.6S1490.4,216.1,1470,216.1z"/>
  <path fill="#100C2A" d="M1331.8,519.9c16.2,14.6,44.1,19.5,87.8,15.2v-55.9c-19.9,1.1-32.8,0.3-39.9-6.3c-3.7-3.5-5.5-8.3-5.5-14.8v-80h45.4v-59.4h-45.4v-75.9l-62,18.6v57.3H1277V378h35.2v80C1312.2,488.2,1318.4,507.8,1331.8,519.9z"/>
  <path fill="#100C2A" d="M1163.4,374.6c23,0,41.7,18.7,41.7,41.7v118.6h62V402.1c0-49.4-40-89.5-89.4-89.5c-18.9,0-37.4,6-52.7,17.2l-3.3,2.4v-13.4h-62V535h62V416.3C1121.8,393.3,1140.4,374.6,1163.4,374.6z"/>
  <path fill="#100C2A" d="M1029.2,534.9V318.8h-62v24.1l-3.6-4.1c-15-17.4-36.6-26.2-64.1-26.2c-27.5,0-53.4,11.7-72.8,32.9c-19.7,21.5-30.5,50.4-30.5,81.4s10.8,59.9,30.5,81.4c19.4,21.2,45.2,32.9,72.8,32.9c27.6,0,49-8.8,64.1-26.2l3.6-4.1V535L1029.2,534.9z M912.8,482.6c-32.6,0-54.5-22.4-54.5-55.8s21.9-55.8,54.5-55.8c32.6,0,54.5,22.4,54.5,55.8S945.3,482.6,912.8,482.6z"/>
  <polygon fill="#100C2A" points="714.8,234.7 714.8,534.9 776.8,534.9 776.8,216.1"/>
  <path fill="#100C2A" d="M684.3,534.9V318.8h-62v24.1l-3.6-4.1c-15.1-17.4-36.6-26.2-64.1-26.2c-27.5,0-53.4,11.7-72.8,32.9c-19.6,21.5-30.5,50.4-30.5,81.4s10.8,59.9,30.5,81.4c19.4,21.2,45.2,32.9,72.8,32.9c27.5,0,49-8.8,64.1-26.2l3.6-4.1V535L684.3,534.9z M567.8,482.6c-32.6,0-54.5-22.4-54.5-55.8s21.9-55.8,54.5-55.8c32.6,0,54.5,22.4,54.5,55.8S600.4,482.6,567.8,482.6z"/>
  <polygon fill="#100C2A" points="395.3,318.8 348,463 300.7,318.8 232,318.8 312,534.9 384,534.9 464,318.8"/>
</svg>

<!-- White logo (change fill to #ffffff) -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="232 216 1500 325" style="height:28px; width:auto;">
  <!-- same paths as above with fill="#ffffff" -->
</svg>
```

---

## Brand Shape PNGs

Located in `assets/images/`:

### Route A: Guilloche (Fine Line Art)

These are the real Guilloche patterns extracted from the brand PDF. They have **black transparent context** — the black areas are empty, only the coral/peach lines are visible.

For light backgrounds: use `mix-blend-mode: multiply` so the black transparent context disappears.
For dark backgrounds: use directly (dark variant), no blend mode needed.

| File | Dimensions | Mode | Orientation |
|---|---|---|---|
| `guilloche-landscape-1-light.png` | 600×338 | Light | Landscape (main) |
| `guilloche-landscape-2-light.png` | 600×338 | Light | Landscape (alt) |
| `guilloche-portrait-light.png` | 600×849 | Light | Portrait/tall |
| `guilloche-landscape-1-dark.png` | 600×338 | Dark | Landscape (main) |
| `guilloche-portrait-dark.png` | 600×849 | Dark | Portrait/tall |

**Light mode placement:**
```css
.guilloche-hero-img {
  position: absolute;
  top: -20px;
  right: -60px;
  height: 140%;
  width: auto;
  pointer-events: none;
  mix-blend-mode: multiply;  /* makes black areas invisible on white */
  opacity: 0.9;
}
```

**Dark mode placement:**
```css
.guilloche-hero-img-dark {
  position: absolute;
  top: -20px;
  right: -60px;
  height: 140%;
  width: auto;
  pointer-events: none;
  /* no mix-blend-mode needed */
}
```

### Route B: valantic Shape (Filled Blob)

These are the real coral-to-peach gradient blob shapes. Also have black transparent context.

| File | Dimensions | Orientation |
|---|---|---|
| `shape-b-landscape-1.png` | 708×400 | Landscape crop (top area) |
| `shape-b-landscape-2.png` | 708×398 | Landscape alt |
| `shape-b-landscape-3.png` | 779×438 | Landscape wide |
| `shape-b-portrait.png` | 779×1102 | Portrait (full dual-lobe) |

**Placement:**
```css
.shape-b-img {
  position: absolute;
  bottom: -40px;
  right: -60px;
  height: 130%;
  width: auto;
  pointer-events: none;
  mix-blend-mode: multiply;
}
```

---

## Phosphor Icons (Font)

Located in `assets/icons/`:

| File | Purpose |
|---|---|
| `Phosphor.woff2` | Icon font (modern browsers, preferred) |
| `Phosphor.woff` | Icon font (fallback) |
| `phosphor.css` | Full CSS with all ~1,200 icon class names |

**Self-hosted setup:**
```html
<link rel="stylesheet" href="assets/icons/phosphor.css">
<!-- or inline the @font-face and .ph base class, then load phosphor.css for the icon names -->
```

**CDN setup (for online artifacts):**
```html
<script src="https://unpkg.com/@phosphor-icons/web@2.1.2"></script>
```

**Usage:**
```html
<i class="ph ph-arrow-right"></i>
<i class="ph ph-check-circle"></i>
<i class="ph ph-chart-bar"></i>
<i class="ph ph-robot"></i>
<i class="ph ph-lightning"></i>
```

**Styling icons for valantic CI:**
```css
/* Use valantic gradient on icons */
.ph {
  background: linear-gradient(135deg, #ff4b4b, #ff744f);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: 24px;
}

/* Or use solid valantic Black */
.ph-dark {
  color: #100c2a;
  font-size: 24px;
}
```

**Common icons for valantic documents:**
- `ph-arrow-right` — CTAs, navigation
- `ph-check-circle` — Benefits, checklist items
- `ph-chart-bar`, `ph-chart-line-up` — Analytics
- `ph-robot`, `ph-brain` — AI/digital
- `ph-gear` — Settings/process
- `ph-users` — Team/people
- `ph-shield-check` — Security
- `ph-lightning` — Speed/energy
- `ph-leaf` — Sustainability
- `ph-buildings` — Enterprise/B2B

---

## Visual Reference Pages

Located in `assets/images/` — full-page renders from the brand guidelines PDF:

| File | Content |
|---|---|
| `reference_p05_logo_colors.png` | Logo color rules |
| `reference_p06_logo_placement.png` | Logo placement guidelines |
| `reference_p08_color_palette.png` | Color palette overview |
| `reference_p09_typography.png` | Typography rules |
| `reference_p26_route_a_examples.png` | Route A Guilloche shapes |
| `reference_p27_route_b_examples.png` | Route B examples |
| `reference_p28_route_c_examples.png` | Route C examples |
| `reference_p33_mockups_a.png` | Route B mockups (light) |
| `reference_p34_mockups_b.png` | Route B mockups |
| `reference_p35_mockups_c.png` | Route C mockups |

These are for reference only — not for use in output documents.
