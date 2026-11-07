'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, icon, iconPosition = 'left', size = 'md', id, 'aria-describedby': ariaDescribedBy, ...props }, ref) => {
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;
    const describedBy = [error && errorId, hint && hintId, ariaDescribedBy].filter(Boolean).join(' ') || undefined;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-body-sm font-medium text-semantic-text-primary mb-2">
            {label}
            {props.required && <span className="text-semantic-status-error ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && iconPosition === 'left' && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-semantic-text-tertiary pointer-events-none" aria-hidden="true">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            className={cn(
              'w-full border rounded-soft bg-semantic-input-bg border-semantic-input-border placeholder:text-semantic-input-placeholder transition-all duration-fast ease-out',
              'focus:outline-none focus:ring-2 focus:ring-semantic-brand-primary focus:ring-offset-2 focus:border-semantic-input-focus',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-semantic-bg-tertiary',
              'aria-invalid:border-semantic-input-error aria-invalid:focus:ring-semantic-status-error',
              {
                'pl-10': icon && iconPosition === 'left',
                'pr-10': icon && iconPosition === 'right',
                'py-2 px-3 text-caption rounded-md': size === 'sm',
                'py-2.5 px-4 text-body-sm': size === 'md',
                'py-3 px-4 text-body': size === 'lg',
              },
              error && 'border-semantic-input-error focus:ring-semantic-status-error',
              className
            )}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            {...props}
          />
          {icon && iconPosition === 'right' && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-semantic-text-tertiary pointer-events-none" aria-hidden="true">
              {icon}
            </div>
          )}
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

Input.displayName = 'Input';

export { Input };