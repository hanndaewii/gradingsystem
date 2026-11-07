'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', loading = false, asChild = false, children, disabled, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium transition-colors duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
          'rounded-soft',
          {
            'bg-semantic-brand-primary text-semantic-text-inverse hover:bg-semantic-brand-primary-hover active:bg-semantic-brand-primary-active':
              variant === 'primary',
            'bg-semantic-bg-secondary text-semantic-text-primary border border-semantic-border-primary hover:bg-semantic-bg-tertiary hover:border-semantic-border-secondary active:bg-[var(--primitive-slate-300)] dark:active:bg-[var(--primitive-slate-600)]':
              variant === 'secondary',
            'border border-semantic-border-primary bg-transparent hover:bg-semantic-bg-secondary hover:text-semantic-text-primary':
              variant === 'outline',
            'bg-transparent hover:bg-semantic-bg-secondary hover:text-semantic-text-primary':
              variant === 'ghost',
            'bg-semantic-status-error text-semantic-text-inverse hover:bg-[var(--primitive-rose-700)] dark:hover:bg-[var(--primitive-rose-500)] active:bg-[var(--primitive-rose-800)] dark:active:bg-[var(--primitive-rose-600)]':
              variant === 'destructive',
            'h-8 px-3 text-caption rounded-md': size === 'sm',
            'h-10 px-4 py-2 text-body-sm': size === 'md',
            'h-12 px-6 text-body': size === 'lg',
            'h-10 w-10 p-0': size === 'icon',
          },
          className
        )}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </Comp>
    );
  }
);

Button.displayName = 'Button';

export { Button };