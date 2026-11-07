# Design-Taste Frontend Skill - Reference Files

This directory contains the core reference files for the design-taste-frontend skill (tasteskill 2.5.0).

## Key Files to Copy from Skill

When setting up a new project, copy these files from the design-taste-frontend skill:

```
.taste-skill/
├── assets/
│   ├── layout/
│   │   ├── hero-editorial.html
│   │   ├── hero-dashboard.html
│   │   ├── hero-minimal.html
│   │   ├── deal.mjs
│   │   └── check.mjs
│   ├── motion/
│   │   ├── hover-lift.css
│   │   ├── photo-zoom.css
│   │   ├── card-loop.css
│   │   └── index.js
│   ├── photos/
│   │   ├── stand-ins/
│   │   └── credits.json
│   └── icons/
│       └── scan.mjs
├── scripts/
│   ├── start.mjs
│   ├── consistency.mjs
│   ├── perf.mjs
│   ├── shoot.mjs
│   └── icons.mjs
└── references/
    ├── copy.md
    ├── sections.md
    ├── palette.md
    └── tokens.md
```

## Quick Start Commands

```bash
# 1. Deal layout (run once per project)
node .taste-skill/assets/layout/deal.mjs --type software --has ui --history .taste-skill/layout-history.json

# 2. Deal palette (run once per page type)
node .taste-skill/scripts/start.mjs deal --page software --history .taste-skill/history.json

# 3. Build CSS with chosen palette
node .taste-skill/scripts/start.mjs css --page software --palette <PALETTE_ID> --type <HERO_ID> --radius soft --history .taste-skill/history.json

# 4. Verify compliance
node .taste-skill/scripts/consistency.mjs index.html --widths 1440,1024,768,390 --page software --category "Grading System" --primary "Enter Grades"
node .taste-skill/assets/layout/check.mjs --url http://localhost:3000 --sizes 1440x900,1024x768,768x1024,390x844
node .taste-skill/scripts/perf.mjs index.html --profile .taste-skill/profile

# 5. Scan icons after markup complete
node .taste-skill/scripts/icons.mjs scan index.html --out public/icons --colour
```

## Design-Taste Requirements Checklist

### Meta Tags (Required on every page)
```html
<html data-type="software" data-site-kind="software">
<meta name="page-type" content="software">
<meta name="site-kind" content="software">
```

### Layout Rules
- [ ] One section per screen height
- [ ] Equal left/right content edges (`.wrap` with consistent padding)
- [ ] Hero fills viewport on landing pages
- [ ] No captions under images (credits in single footer line)
- [ ] Contacts: "Ternate, Cavite" only, `.example` domains

### Visual Rules
- [ ] Soft radius (10px) via `rounded-soft`
- [ ] Real icons (Lucide React, not drawn)
- [ ] Real photographs where applicable (CWPC campus, faculty)
- [ ] Flat grounds on non-tech pages
- [ ] One button style (primary) per page
- [ ] No violet/lavender in design tokens

### Motion Rules
- [ ] Hover lift: 2px on buttons/cards
- [ ] Photo zoom: 1.02-1.03 on images
- [ ] Card loops: 2.5-4s cycle, pause on hover
- [ ] Button press animation
- [ ] Underline draw on links
- [ ] Reduced motion: everything rests, nothing hidden

### Performance
- [ ] Image weight < 100KB per page
- [ ] WebGL contexts ≤ 0 (no shaders on non-tech)
- [ ] No layout shift (CLS < 0.1)
- [ ] Lighthouse: Perf ≥ 90, A11y ≥ 95, BP ≥ 90, SEO ≥ 90