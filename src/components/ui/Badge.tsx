'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', dot = false, children, ...props }, ref) => {
    const variants = {
      default: 'bg-component-badge-default text-semantic-text-secondary',
      success: 'bg-component-badge-success text-semantic-status-success',
      warning: 'bg-component-badge-warning text-semantic-status-warning',
      danger: 'bg-component-badge-error text-semantic-status-error',
      info: 'bg-component-badge-info text-semantic-status-info',
      outline: 'bg-transparent border border-semantic-border-primary text-semantic-text-secondary',
    };

    const sizes = {
      sm: 'px-2 py-0.5 text-caption gap-1',
      md: 'px-2.5 py-1 text-caption gap-1.5',
      lg: 'px-3 py-1 text-body-sm gap-2',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center font-medium rounded-full border',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              'rounded-full',
              variant === 'default' && 'bg-semantic-text-tertiary',
              variant === 'success' && 'bg-semantic-status-success',
              variant === 'warning' && 'bg-semantic-status-warning',
              variant === 'danger' && 'bg-semantic-status-error',
              variant === 'info' && 'bg-semantic-status-info',
              variant === 'outline' && 'bg-current',
              { 'h-1.5 w-1.5': size === 'sm', 'h-2 w-2': size === 'md', 'h-2.5 w-2.5': size === 'lg' }
            )}
            aria-hidden="true"
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };