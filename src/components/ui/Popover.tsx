'use client';

import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';

export interface PopoverProps extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Root> {
  children: React.ReactNode;
}

const Popover = React.forwardRef<HTMLDivElement, PopoverProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <PopoverPrimitive.Root ref={ref} className={cn('', className)} {...props}>
        {children}
      </PopoverPrimitive.Root>
    );
  }
);
Popover.displayName = PopoverPrimitive.Root.displayName;

export interface PopoverTriggerProps extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger> {
  asChild?: boolean;
}

const PopoverTrigger = React.forwardRef<HTMLButtonElement, PopoverTriggerProps>(
  ({ className, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? PopoverPrimitive.Trigger : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-semantic-brand-primary focus-visible:ring-offset-2',
          className
        )}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);
PopoverTrigger.displayName = PopoverPrimitive.Trigger.displayName;

export interface PopoverContentProps extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> {
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  hideWhenDetached?: boolean;
}

const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ className, align = 'center', sideOffset = 4, hideWhenDetached = false, children, ...props }, ref) => {
    return (
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          ref={ref}
          align={align}
          sideOffset={sideOffset}
          hideWhenDetached={hideWhenDetached}
          className={cn(
            'z-[var(--z-popover)] bg-component-card-bg border border-component-card-border rounded-xl shadow-lg p-4',
            'min-w-[280px] max-w-[380px]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'focus-visible:outline-none',
            className
          )}
          {...props}
        >
          {children}
          <PopoverPrimitive.Arrow className="fill-component-card-bg stroke-component-card-border" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    );
  }
);
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export interface PopoverAnchorProps extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Anchor> {}

const PopoverAnchor = React.forwardRef<HTMLDivElement, PopoverAnchorProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <PopoverPrimitive.Anchor ref={ref} className={cn('', className)} {...props}>
        {children}
      </PopoverPrimitive.Anchor>
    );
  }
);
PopoverAnchor.displayName = PopoverPrimitive.Anchor.displayName;

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };