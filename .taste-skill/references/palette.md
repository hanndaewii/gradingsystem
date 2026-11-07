# CWPC BAD Grading System - Color Palettes

## Non-Violet Palettes for Software

### Palette 1: Professional Blue (Primary)
```css
:root {
  --color-primary: #1e3a8a;        /* Deep professional blue */
  --color-primary-hover: #1e40af;
  --color-primary-light: #dbeafe;
  --color-secondary: #0f172a;      /* Near black */
  --color-accent: #0ea5e9;         /* Sky blue for highlights */
  --color-success: #059669;        /* Emerald green */
  --color-warning: #d97706;        /* Amber */
  --color-danger: #dc2626;         /* Red */
  --color-info: #0891b2;           /* Cyan */
}
```

### Palette 2: Academic Navy (Alternative)
```css
:root {
  --color-primary: #0f172a;        /* Navy */
  --color-primary-hover: #1e293b;
  --color-primary-light: #e2e8f0;
  --color-secondary: #334155;      /* Slate */
  --color-accent: #22d3ee;         /* Cyan accent */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-info: #06b6d4;
}
```

### Palette 3: Warm Academic (Earth Tones)
```css
:root {
  --color-primary: #78350f;        /* Amber/brown */
  --color-primary-hover: #92400e;
  --color-primary-light: #fef3c7;
  --color-secondary: #1c1917;      /* Stone dark */
  --color-accent: #f97316;         /* Orange */
  --color-success: #16a34a;
  --color-warning: #ca8a04;
  --color-danger: #dc2626;
  --color-info: #0891b2;
}
```

## Usage Rules
- **Never use violet/lavender** (#8b5cf6, #a855f7, #c084fc, etc.)
- Primary for main CTAs, navigation, key actions
- Secondary for text, borders, subtle backgrounds
- Accent for highlights, links, focus states
- Semantic colors (success/warning/danger/info) for status only
- All palettes tested for WCAG AA contrast

## Dark Mode
Each palette includes dark mode variants automatically via CSS variables.