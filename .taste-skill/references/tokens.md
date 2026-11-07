# Design-Taste Token Architecture

## Three-Layer Token System

### Layer 1: Primitive Tokens (Raw Values)
```css
/* Colors */
--primitive-blue-50: #eff6ff;
--primitive-blue-100: #dbeafe;
--primitive-blue-500: #3b82f6;
--primitive-blue-600: #2563eb;
--primitive-blue-700: #1d4ed8;
--primitive-blue-900: #1e3a8a;

--primitive-slate-50: #f8fafc;
--primitive-slate-100: #f1f5f9;
--primitive-slate-500: #64748b;
--primitive-slate-900: #0f172a;

--primitive-emerald-500: #10b981;
--primitive-emerald-600: #059669;
--primitive-amber-500: #f59e0b;
--primitive-amber-600: #d97706;
--primitive-red-500: #ef4444;
--primitive-red-600: #dc2626;

/* Spacing Scale (4px base) */
--primitive-space-0: 0;
--primitive-space-1: 0.25rem;  /* 4px */
--primitive-space-2: 0.5rem;   /* 8px */
--primitive-space-3: 0.75rem;  /* 12px */
--primitive-space-4: 1rem;     /* 16px */
--primitive-space-5: 1.25rem;  /* 20px */
--primitive-space-6: 1.5rem;   /* 24px */
--primitive-space-8: 2rem;     /* 32px */
--primitive-space-10: 2.5rem;  /* 40px */
--primitive-space-12: 3rem;    /* 48px */
--primitive-space-16: 4rem;    /* 64px */
--primitive-space-20: 5rem;    /* 80px */
--primitive-space-24: 6rem;    /* 96px */

/* Typography Scale */
--primitive-text-xs: 0.75rem;    /* 12px */
--primitive-text-sm: 0.875rem;   /* 14px */
--primitive-text-base: 1rem;     /* 16px */
--primitive-text-lg: 1.125rem;   /* 18px */
--primitive-text-xl: 1.25rem;    /* 20px */
--primitive-text-2xl: 1.5rem;    /* 24px */
--primitive-text-3xl: 1.875rem;  /* 30px */
--primitive-text-4xl: 2.25rem;   /* 36px */
--primitive-text-5xl: 3rem;      /* 48px */
--primitive-text-6xl: 3.75rem;   /* 60px */

/* Font Weights */
--primitive-font-normal: 400;
--primitive-font-medium: 500;
--primitive-font-semibold: 600;
--primitive-font-bold: 700;

/* Line Heights */
--primitive-leading-tight: 1.25;
--primitive-leading-snug: 1.375;
--primitive-leading-normal: 1.5;
--primitive-leading-relaxed: 1.625;

/* Border Radius */
--primitive-radius-none: 0;
--primitive-radius-sm: 0.25rem;   /* 4px */
--primitive-radius-md: 0.375rem;  /* 6px */
--primitive-radius-lg: 0.5rem;    /* 8px */
--primitive-radius-xl: 0.75rem;   /* 12px */
--primitive-radius-2xl: 1rem;     /* 16px */
--primitive-radius-full: 9999px;

/* Shadows */
--primitive-shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--primitive-shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--primitive-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
--primitive-shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);

/* Transitions */
--primitive-duration-fast: 150ms;
--primitive-duration-normal: 250ms;
--primitive-duration-slow: 350ms;
--primitive-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--primitive-ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

### Layer 2: Semantic Tokens (Contextual Meaning)
```css
/* Color Semantics */
--color-bg-primary: var(--primitive-slate-50);
--color-bg-secondary: var(--primitive-white);
--color-bg-tertiary: var(--primitive-slate-100);
--color-bg-inverse: var(--primitive-slate-900);

--color-text-primary: var(--primitive-slate-900);
--color-text-secondary: var(--primitive-slate-600);
--color-text-tertiary: var(--primitive-slate-400);
--color-text-inverse: var(--primitive-white);
--color-text-link: var(--color-primary);
--color-text-link-hover: var(--color-primary-hover);

--color-border-primary: var(--primitive-slate-200);
--color-border-secondary: var(--primitive-slate-300);
--color-border-focus: var(--color-primary);
--color-border-error: var(--color-danger);

--color-primary: var(--primitive-blue-700);
--color-primary-hover: var(--primitive-blue-800);
--color-primary-light: var(--primitive-blue-100);
--color-secondary: var(--primitive-slate-900);
--color-accent: var(--primitive-sky-500);

--color-success: var(--primitive-emerald-600);
--color-success-light: var(--primitive-emerald-50);
--color-warning: var(--primitive-amber-600);
--color-warning-light: var(--primitive-amber-50);
--color-danger: var(--primitive-red-600);
--color-danger-light: var(--primitive-red-50);
--color-info: var(--primitive-cyan-600);
--color-info-light: var(--primitive-cyan-50);

/* Spacing Semantics */
--space-xs: var(--primitive-space-1);
--space-sm: var(--primitive-space-2);
--space-md: var(--primitive-space-4);
--space-lg: var(--primitive-space-6);
--space-xl: var(--primitive-space-8);
--space-2xl: var(--primitive-space-12);
--space-3xl: var(--primitive-space-16);

/* Typography Semantics */
--text-display-xl: var(--primitive-text-6xl);
--text-display-lg: var(--primitive-text-5xl);
--text-display-md: var(--primitive-text-4xl);
--text-display-sm: var(--primitive-text-3xl);
--text-heading-xl: var(--primitive-text-4xl);
--text-heading-lg: var(--primitive-text-3xl);
--text-heading-md: var(--primitive-text-2xl);
--text-heading-sm: var(--primitive-text-xl);
--text-body-lg: var(--primitive-text-lg);
--text-body: var(--primitive-text-base);
--text-body-sm: var(--primitive-text-sm);
--text-caption: var(--primitive-text-xs);

/* Radius Semantics */
--radius-none: var(--primitive-radius-none);
--radius-sm: var(--primitive-radius-sm);
--radius-md: var(--primitive-radius-md);
--radius-lg: var(--primitive-radius-lg);
--radius-xl: var(--primitive-radius-xl);
--radius-soft: var(--primitive-radius-2xl);  /* 16px - Design-taste soft radius */
--radius-full: var(--primitive-radius-full);

/* Shadow Semantics */
--shadow-card: var(--primitive-shadow-md);
--shadow-card-hover: var(--primitive-shadow-lg);
--shadow-dropdown: var(--primitive-shadow-lg);
--shadow-modal: var(--primitive-shadow-xl);
```

### Layer 3: Component Tokens (Component-Specific)
```css
/* Button */
--btn-height-sm: 32px;
--btn-height-md: 40px;
--btn-height-lg: 48px;
--btn-padding-x-sm: 12px;
--btn-padding-x-md: 16px;
--btn-padding-x-lg: 24px;
--btn-font-size: var(--text-body-sm);
--btn-font-weight: var(--primitive-font-semibold);
--btn-radius: var(--radius-soft);

/* Input */
--input-height-sm: 32px;
--input-height-md: 40px;
--input-height-lg: 48px;
--input-padding-x: 12px;
--input-font-size: var(--text-body);
--input-border-width: 1px;
--input-radius: var(--radius-soft);

/* Card */
--card-padding: var(--space-lg);
--card-gap: var(--space-md);
--card-radius: var(--radius-soft);
--card-border: 1px solid var(--color-border-primary);

/* Table */
--table-cell-padding-y: 10px;
--table-cell-padding-x: 12px;
--table-header-bg: var(--color-bg-tertiary);
--table-row-hover: var(--color-bg-tertiary);
--table-border: 1px solid var(--color-border-primary);

/* Badge */
--badge-padding-x: 8px;
--badge-padding-y: 2px;
--badge-font-size: var(--text-caption);
--badge-radius: var(--radius-full);

/* Modal */
--modal-padding: var(--space-xl);
--modal-radius: var(--radius-xl);
--modal-max-width: 640px;
--modal-backdrop: rgba(0, 0, 0, 0.5);
```

## Dark Mode Overrides
```css
.dark {
  --color-bg-primary: var(--primitive-slate-950);
  --color-bg-secondary: var(--primitive-slate-900);
  --color-bg-tertiary: var(--primitive-slate-800);
  --color-bg-inverse: var(--primitive-slate-50);

  --color-text-primary: var(--primitive-slate-50);
  --color-text-secondary: var(--primitive-slate-400);
  --color-text-tertiary: var(--primitive-slate-500);
  --color-text-inverse: var(--primitive-slate-900);

  --color-border-primary: var(--primitive-slate-700);
  --color-border-secondary: var(--primitive-slate-600);

  --color-primary-light: var(--primitive-blue-900);
  --color-success-light: var(--primitive-emerald-900);
  --color-warning-light: var(--primitive-amber-900);
  --color-danger-light: var(--primitive-red-900);
  --color-info-light: var(--primitive-cyan-900);

  --table-header-bg: var(--primitive-slate-800);
  --table-row-hover: var(--primitive-slate-800);
  --card-border: 1px solid var(--primitive-slate-700);
}
```

## Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```