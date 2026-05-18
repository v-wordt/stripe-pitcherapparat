# Route B: valantic Shape (Gradient Blob)

**Character:** Bold, energetic, modern. Solid gradient-filled organic blobs — the coral-to-peach fill creates strong visual impact and warmth.

**When to use:** Hero sections, landing pages, presentations, dark-mode features, bold CTAs.

---

## Color palette for Route B

- Primary: valantic Gradient (Coral `#ff4b4b` → Peach `#ff744f`) — **fills the blob shape itself**
- Secondary: **Royal Blue** `#1a4fd6` — for highlights and subheadings
- Body text: valantic Black `#100c2a` (light mode) · White `#ffffff` (dark mode)
- Backgrounds: White (light mode) · valantic Black `#100c2a` (dark mode — most impactful)
- Silver `#cdcdcd` may always be added as a neutral accent

---

## Typography for Route B

All HTML artifacts use Maven Pro throughout. Route B uses **Bold (700)** for headings.

```css
/* Route B: Maven Pro Bold headings — strong, assertive */
body  { font-family: 'Maven Pro', sans-serif; font-size: 17px; font-weight: 400; line-height: 1.5; }
h1    { font-size: 45px; font-weight: 700; line-height: 1.1; background: var(--grad); /* gradient text */ }
h2    { font-size: 30px; font-weight: 700; line-height: 1.2; }
h3    { font-size: 25px; font-weight: 400; line-height: 1.3; }  /* subheadings stay regular */
strong { font-weight: 600; color: #1a4fd6; /* Royal Blue */ }
```

---

## Route B Shape SVGs — Official Assets

The skill includes **8 official Shape SVGs** in `assets/shapes/route-b/`. These are compact, clean files (~1–2KB each): a single filled path with a coral-to-peach gradient. Embed **inline** (not `<img>`) so the internal gradient renders correctly.

### Available shapes

| File | ViewBox (w×h) | Orientation | Description |
|---|---|---|---|
| `shape-02.svg` | 1126×1126 | Square | Smooth teardrop/lollipop |
| `shape-03a.svg` | 1015×1154 | Portrait | Two-lobe vertical blob |
| `shape-03b.svg` | 838×1126 | Portrait | Rounded figure-8 / hourglass |
| `shape-03c.svg` | 839×1059 | Portrait | Side-reaching blob |
| `shape-04a-portrait.svg` | 736×1129 | Portrait | Slim tall S-curve |
| `shape-04a-landscape.svg` | 1115×752 | Landscape | Wide low S-curve |
| `shape-04b-portrait.svg` | 999×1239 | Portrait | Large multi-lobe tall |
| `shape-04b-landscape.svg` | 1056×957 | Landscape | Wide irregular blob |

### Recommended pairings

- **Dark hero / cover:** `shape-03a`, `shape-04b-portrait` — tall shapes bleed top-right, dramatic on `#100c2a`
- **Light CTA section:** `shape-03b`, `shape-03c` — float over white with subtle shadow
- **Horizontal banner:** `shape-04a-landscape`, `shape-04b-landscape` — wide shapes for full-width sections
- **Accent / corner:** `shape-02` — compact square, works in any corner

---

## Placement rules (from brand guidelines)

1. **Prominent size** — the shape must be large; it is the visual hero of the section
2. **Bleed generously** — extend beyond the medium edge; partial crops are intentional and look intentional
3. **Maintain recognisability** — at least one additional rounded lobe must remain visible after cropping
4. **With photo (optional):** A photo can be nested inside the blob using CSS `clip-path` or SVG masking

---

## HTML usage — inline SVG

Embed **inline** so the `<linearGradient>` defs render in all browsers. Strip the XML declaration, keep `<defs>` and `<path>`.

```html
<!-- Route B hero: solid gradient blob, top-right, bleeds off edge -->
<div style="position:relative; overflow:hidden; background:#100c2a; min-height:100vh;">

  <!-- Shape wrapper: positions it, controls bleed -->
  <div style="position:absolute; top:-15%; right:-12%; height:100%; width:auto; pointer-events:none; opacity:0.85; mix-blend-mode:screen;">
    <!-- PASTE full SVG inline — strip XML declaration, keep defs + path -->
    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
         viewBox="0 0 1015.91 1154.31" style="height:100%; width:auto;">
      <defs>
        <linearGradient id="SVGID_1_" gradientUnits="userSpaceOnUse" ...>
          <stop offset="0" style="stop-color:#FF4B4B"/>
          <stop offset="1" style="stop-color:#FF744F"/>
        </linearGradient>
      </defs>
      <path class="st0" d="M1015.41,662.5..."/>
    </svg>
  </div>

  <!-- Content on top -->
  <div style="position:relative; z-index:1; padding:80px 56px;">
    <!-- label, h2 (Bold), p, CTA buttons -->
  </div>
</div>
```

### Light mode (white background)

On white backgrounds, use the shape without `mix-blend-mode` — the orange gradient pops directly against white. Consider a slight drop shadow or position it partially off-screen for a floating effect.

```html
<div style="position:absolute; top:-10%; right:-15%; height:90%; pointer-events:none;
            filter: drop-shadow(0 20px 60px rgba(255,75,75,0.25));">
  <!-- inline SVG, no mix-blend-mode needed -->
</div>
```

---

## Full dark-mode CTA template (Route B)

```html
<section style="
  position:relative; overflow:hidden;
  background:#100c2a; padding:80px 56px;
  font-family:'Maven Pro',sans-serif;">

  <!-- Shape: top-right, bleed, screen blend on dark -->
  <div style="position:absolute; top:-15%; right:-12%; height:110%; pointer-events:none; opacity:0.85; mix-blend-mode:screen;">
    <!-- INLINE SVG from assets/shapes/route-b/shape-03a.svg -->
  </div>

  <div style="position:relative; z-index:1; max-width:880px; margin:0 auto;">

    <!-- Eyebrow label -->
    <p style="font-size:14px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:#ff744f;margin-bottom:16px;">
      Ready to start?
    </p>

    <!-- Route B: Bold heading + gradient keyword -->
    <h2 style="font-size:30px;font-weight:700;line-height:1.2;color:#fff;margin-bottom:20px;">
      Let's shape your
      <span style="background:linear-gradient(135deg,#ff4b4b,#ff744f);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">
        digital future
      </span>
    </h2>

    <p style="font-size:17px;line-height:1.5;color:rgba(255,255,255,.72);max-width:520px;margin-bottom:36px;">
      Body text supporting the CTA. Concise, action-oriented.
    </p>

    <!-- CTA buttons -->
    <a href="#" style="display:inline-flex;align-items:center;gap:8px;padding:14px 28px;background:linear-gradient(135deg,#ff4b4b,#ff744f);color:#fff;font-family:'Maven Pro',sans-serif;font-weight:600;font-size:15px;border-radius:8px;text-decoration:none;">
      Get in touch
    </a>
  </div>
</section>
```
