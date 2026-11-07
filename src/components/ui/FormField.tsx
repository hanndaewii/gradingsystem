'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface FormFieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  id?: string;
  labelSize?: 'sm' | 'md' | 'lg';
  labelVariant?: 'default' | 'secondary';
}

export const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ className, label, error, hint, required, children, id, labelSize = 'md', labelVariant = 'default', ...props }, ref) => {
    const fieldId = id || `field-${React.useId()}`;
    const errorId = `${fieldId}-error`;
    const hintId = `${fieldId}-hint`;
    const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined;

    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        {label && (
          <label
            htmlFor={fieldId}
            className={cn(
              'block font-medium mb-2',
              'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed',
              {
                'text-body-sm': labelSize === 'sm',
                'text-body-sm': labelSize === 'md',
                'text-body': labelSize === 'lg',
                'text-semantic-text-primary': labelVariant === 'default',
                'text-semantic-text-secondary': labelVariant === 'secondary',
              }
            )}
          >
            {label}
            {required && <span className="ml-1 text-semantic-status-error" aria-hidden="true">*</span>}
          </label>
        )}
        <div id={fieldId} aria-describedby={describedBy} aria-invalid={!!error}>
          {React.Children.map(children, (child) => {
            if (!React.isValidElement(child)) return child;
            return React.cloneElement(child, {
              id: child.props.id || fieldId,
              'aria-describedby': describedBy,
              'aria-invalid': !!error,
            });
          })}
        </div>
        {error && (
          <p id={errorId} className="mt-1.5 text-caption text-semantic-status-error" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-caption text-semantic-text-tertiary">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';