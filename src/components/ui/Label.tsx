'use client';

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/utils';

export interface LabelProps extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {
  required?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'secondary';
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, size = 'md', variant = 'default', children, ...props }, ref) => {
    return (
      <LabelPrimitive.Root
        ref={ref}
        className={cn(
          'block font-medium',
          'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed',
          {
            'text-body-sm': size === 'sm',
            'text-body-sm': size === 'md',
            'text-body': size === 'lg',
            'text-semantic-text-primary': variant === 'default',
            'text-semantic-text-secondary': variant === 'secondary',
          },
          className
        )}
        {...props}
      >
        {children}
        {required && (
          <span className="ml-1 text-semantic-status-error" aria-hidden="true">
            *
          </span>
        )}
      </LabelPrimitive.Root>
    );
  }
);

Label.displayName = LabelPrimitive.Root.displayName;

export { Label };