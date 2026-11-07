'use client';

import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

export interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
  label?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  labelPosition?: 'right' | 'left';
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, label, description, size = 'md', labelPosition = 'right', id, ...props }, ref) => {
    const switchId = id || `switch-${React.useId()}`;
    const descriptionId = description ? `${switchId}-description` : undefined;

    const sizes = {
      sm: { track: 'w-8 h-4', thumb: 'w-3 h-3', translate: 'translate-x-4' },
      md: { track: 'w-11 h-6', thumb: 'w-5 h-5', translate: 'translate-x-5' },
      lg: { track: 'w-14 h-7', thumb: 'w-6 h-6', translate: 'translate-x-7' },
    };

    const currentSize = sizes[size];

    return (
      <div className="flex items-center gap-3">
        {labelPosition === 'left' && label && (
          <label htmlFor={switchId} className="text-body-sm font-medium text-semantic-text-primary cursor-pointer">
            {label}
          </label>
        )}
        <SwitchPrimitive.Root
          ref={ref}
          id={switchId}
          className={cn(
            'relative inline-flex items-center shrink-0 rounded-full border transition-colors duration-fast ease-out',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-semantic-brand-primary focus-visible:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'data-[state=checked]:bg-semantic-brand-primary data-[state=checked]:border-semantic-brand-primary',
            'data-[state=unchecked]:bg-semantic-input-border data-[state=unchecked]:border-semantic-input-border data-[state=unchecked]:hover:bg-semantic-border-secondary',
            currentSize.track,
            className
          )}
          aria-describedby={descriptionId}
          {...props}
        >
          <SwitchPrimitive.Thumb
            className={cn(
              'pointer-events-none block rounded-full bg-white shadow-lg ring-0 transition-transform duration-fast ease-spring',
              'data-[state=checked]:translate-x-full',
              currentSize.thumb,
              'data-[state=checked]:translate-x-[calc(100%+2px)]'
            )}
          />
        </SwitchPrimitive.Root>
        {labelPosition === 'right' && label && (
          <label htmlFor={switchId} className="flex flex-col gap-0.5 cursor-pointer">
            <span className="text-body-sm font-medium text-semantic-text-primary">{label}</span>
            {description && (
              <span id={descriptionId} className="text-caption text-semantic-text-tertiary">
                {description}
              </span>
            )}
          </label>
        )}
      </div>
    );
  }
);

Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };