'use client';

import * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { cn } from '@/lib/utils';

export interface RadioGroupOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root> {
  label?: string;
  error?: string;
  hint?: string;
  options: RadioGroupOption[];
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  (
    { className, label, error, hint, options, orientation = 'vertical', size = 'md', id, required, disabled, 'aria-describedby': ariaDescribedBy, ...props },
    ref
  ) => {
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;
    const describedBy = [error && errorId, hint && hintId, ariaDescribedBy].filter(Boolean).join(' ') || undefined;

    return (
      <div ref={ref} className={cn('w-full', className)}>
        {label && (
          <label className="block text-body-sm font-medium text-semantic-text-primary mb-2">
            {label}
            {required && <span className="text-semantic-status-error ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <RadioGroupPrimitive.Root
          className={cn(
            'flex',
            orientation === 'horizontal' ? 'flex-wrap gap-4' : 'flex-col gap-3'
          )}
          aria-describedby={describedBy}
          aria-invalid={!!error}
          {...props}
        >
          {options.map((option) => (
            <div key={option.value} className={cn('flex items-start gap-3', orientation === 'horizontal' && 'flex-shrink-0')}>
              <RadioGroupPrimitive.Item
                value={option.value}
                disabled={option.disabled || disabled}
                className={cn(
                  'peer relative flex items-center justify-center border rounded-full transition-all duration-fast ease-out',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-semantic-brand-primary focus-visible:ring-offset-2',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'data-[state=checked]:bg-semantic-brand-primary data-[state=checked]:border-semantic-brand-primary data-[state=checked]:text-semantic-text-inverse',
                  'data-[state=unchecked]:bg-semantic-input-bg data-[state=unchecked]:border-semantic-input-border data-[state=unchecked]:hover:border-semantic-border-secondary',
                  {
                    'h-4 w-4': size === 'sm',
                    'h-5 w-5': size === 'md',
                    'h-6 w-6': size === 'lg',
                  }
                )}
              >
                <RadioGroupPrimitive.Indicator className="flex items-center justify-center text-current">
                  <span className={cn('rounded-full bg-current', 'h-2 w-2', 'h-2.5 w-2.5', 'h-3 w-3')} />
                </RadioGroupPrimitive.Indicator>
              </RadioGroupPrimitive.Item>
              <div className="flex flex-col gap-0.5 mt-0.5">
                <label className={cn('cursor-pointer font-medium text-body-sm', option.disabled && 'opacity-50 cursor-not-allowed')}>
                  {option.label}
                </label>
                {option.description && (
                  <span className="text-caption text-semantic-text-tertiary">{option.description}</span>
                )}
              </div>
            </div>
          ))}
        </RadioGroupPrimitive.Root>
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

RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

export { RadioGroup };