# Route C: valantic Cropped Images

**Character:** Human, approachable, dynamic. Photos or content are masked inside the organic valantic blob shape. Where no photo is available, large typographic treatment replaces it.

**When to use:** People-focused content, recruiting pages, team pages, case studies, modern landing pages.

---

## Color palette for Route C

- Primary: valantic Gradient (Coral Red → Peach) — used for titles and accents
- Secondary: **Royal Blue** `#3c4bc8` AND **Vibrant Purple** `#5b26b7`
- Body text: valantic Black `#100c2a`
- Silver `#cdcdcd` always available as neutral
- Backgrounds: White (light mode) or valantic Black `#100c2a` (dark mode)

## Typography for Route C

```css
/* Route C: Maven Pro Bold — expressive, modern */
h1, h2 {
  font-weight: 700;
  background: linear-gradient(135deg, #ff4b4b, #ff744f);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

h3 {
  font-weight: 400;
  color: #3c4bc8; /* Royal Blue subheadings */
}

strong {
  font-weight: 600;
  color: #5b26b7; /* Vibrant Purple for emphasis */
}
```

---

## Hero / Cover: Organic Image Mask

The brand shape becomes a CSS `clip-path` mask applied to an image container. At minimum 1 visible lobe beyond the primary circle must be recognizable.

```html
<!-- Route C: Image masked in valantic blob shape -->
<div style="
  position: relative;
  overflow: hidden;
  background: #ffffff;
  min-height: 260px;
">
  <!-- Masked image container — top right, cropped -->
  <div style="
    position: absolute;
    top: -60px;
    right: -80px;
    width: 48%;
    aspect-ratio: 1;
    clip-path: url(#blobMask);
  ">
    <!-- Replace src with actual image -->
    <img src="[IMAGE_URL]" alt="" style="width:100%; height:100%; object-fit:cover;" />
  </div>

  <!-- SVG clipPath definition (hidden) -->
  <svg width="0" height="0" style="position:absolute;">
    <defs>
      <clipPath id="blobMask" clipPathUnits="objectBoundingBox">
        <path d="M0.5,0.1
                 C0.65,0.05 0.85,0.15 0.9,0.3
                 C0.96,0.46 0.89,0.61 0.78,0.7
                 C0.9,0.75 0.96,0.9 0.88,0.99
                 C0.79,1.07 0.63,1.05 0.53,0.98
                 C0.44,1.05 0.28,1.1 0.19,1.01
                 C0.1,0.93 0.11,0.76 0.2,0.68
                 C0.08,0.59 0.03,0.41 0.11,0.26
                 C0.2,0.11 0.35,0.15 0.5,0.1 Z"/>
      </clipPath>
    </defs>
  </svg>

  <!-- Content -->
  <div style="position:relative; z-index:1; padding:48px 48px 40px;">
    <!-- Logo, title etc. -->
  </div>
</div>
```

### No-photo fallback: Typography as visual element

When no image is available, use a large, partially transparent gradient text as the visual anchor:

```html
<div style="
  position: absolute;
  top: -20px;
  right: -20px;
  font-family: 'Maven Pro', sans-serif;
  font-weight: 700;
  font-size: 120px;
  line-height: 1;
  background: linear-gradient(135deg, #ff4b4b22, #ff744f44);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  pointer-events: none;
  user-select: none;
">
  more<br>than that
</div>
```

---

## Route C: Full page layout example

```html
<header style="
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 32px;
  background: white;
">
  <svg viewBox="0 0 120 24" style="height:26px;">
    <text x="0" y="20" font-family="'Maven Pro',sans-serif" font-weight="700"
          font-size="22" fill="#100c2a" letter-spacing="-0.5">valantic</text>
  </svg>
</header>

<main style="max-width: 960px; margin: 0 auto; padding: 40px 32px;">
  <h1>Human. Digital. Meaningful.</h1>
  <p>Body copy — warm, direct, people-first.</p>
</main>

<footer style="
  padding: 24px 32px;
  background: #100c2a;
  color: #cdcdcd;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-family: 'Maven Pro', sans-serif;
">
  <svg viewBox="0 0 120 24" style="height:20px;">
    <text x="0" y="18" font-family="'Maven Pro',sans-serif" font-weight="700"
          font-size="20" fill="#ffffff" letter-spacing="-0.5">valantic</text>
  </svg>
  <span>© valantic</span>
</footer>
```
