'use client';

import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  label?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ className, label, description, size = 'md', id, ...props }, ref) => {
    const checkboxId = id || `checkbox-${React.useId()}`;
    const descriptionId = description ? `${checkboxId}-description` : undefined;

    return (
      <CheckboxPrimitive.Root
        ref={ref}
        id={checkboxId}
        className={cn(
          'peer relative flex items-center justify-center border rounded-sm transition-all duration-fast ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-semantic-brand-primary focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'data-[state=checked]:bg-semantic-brand-primary data-[state=checked]:border-semantic-brand-primary data-[state=checked]:text-semantic-text-inverse',
          'data-[state=unchecked]:bg-semantic-input-bg data-[state=unchecked]:border-semantic-input-border data-[state=unchecked]:hover:border-semantic-border-secondary',
          'data-[state=indeterminate]:bg-semantic-brand-primary data-[state=indeterminate]:border-semantic-brand-primary data-[state=indeterminate]:text-semantic-text-inverse',
          {
            'h-4 w-4': size === 'sm',
            'h-5 w-5': size === 'md',
            'h-6 w-6': size === 'lg',
          },
          className
        )}
        aria-describedby={descriptionId}
        {...props}
      >
        <CheckboxPrimitive.Indicator className={cn('flex items-center justify-center', 'text-current')}>
          <Check className={cn('stroke-2', 'h-3 w-3', 'h-2.5 w-2.5', 'h-3.5 w-3.5')} />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    );
  }
);

Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export interface CheckboxWithLabelProps extends CheckboxProps {
  label: string;
  labelPosition?: 'right' | 'left';
}

export const CheckboxWithLabel = React.forwardRef<HTMLButtonElement, CheckboxWithLabelProps>(
  ({ className, label, description, labelPosition = 'right', size = 'md', ...props }, ref) => {
    const checkboxId = `checkbox-${React.useId()}`;
    const descriptionId = description ? `${checkboxId}-description` : undefined;

    return (
      <div className="flex items-start gap-3" role="group" aria-labelledby={labelPosition === 'left' ? undefined : checkboxId}>
        {labelPosition === 'left' && (
          <label htmlFor={checkboxId} className="flex items-center gap-2 cursor-pointer">
            <span className="text-body-sm font-medium text-semantic-text-primary">{label}</span>
            <Checkbox ref={ref} id={checkboxId} size={size} aria-describedby={descriptionId} {...props} />
          </label>
        )}
        {labelPosition === 'right' && (
          <>
            <Checkbox ref={ref} id={checkboxId} size={size} aria-describedby={descriptionId} {...props} />
            <label htmlFor={checkboxId} className="flex flex-col gap-1 cursor-pointer mt-0.5">
              <span className="text-body-sm font-medium text-semantic-text-primary">{label}</span>
              {description && (
                <span id={descriptionId} className="text-caption text-semantic-text-tertiary">
                  {description}
                </span>
              )}
            </label>
          </>
        )}
      </div>
    );
  }
);

CheckboxWithLabel.displayName = 'CheckboxWithLabel';

export { Checkbox };