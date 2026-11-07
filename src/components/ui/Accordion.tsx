'use client';

import * as React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AccordionProps extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Root> {
  type?: 'single' | 'multiple';
  className?: string;
}

const Accordion = React.forwardRef<HTMLDivElement, AccordionProps>(
  ({ className, type = 'single', children, ...props }, ref) => {
    return (
      <AccordionPrimitive.Root
        ref={ref}
        type={type}
        className={cn('w-full', className)}
        {...props}
      >
        {children}
      </AccordionPrimitive.Root>
    );
  }
);
Accordion.displayName = AccordionPrimitive.Root.displayName;

export interface AccordionItemProps extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item> {
  className?: string;
}

const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ className, value, ...props }, ref) => {
    return (
      <AccordionPrimitive.Item
        ref={ref}
        value={value}
        className={cn('border border-component-card-border rounded-xl overflow-hidden', className)}
        {...props}
      />
    );
  }
);
AccordionItem.displayName = AccordionPrimitive.Item.displayName;

export interface AccordionTriggerProps extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> {
  className?: string;
  icon?: React.ReactNode;
}

const AccordionTrigger = React.forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  ({ className, icon, children, ...props }, ref) => {
    return (
      <AccordionPrimitive.Header className="w-full">
        <AccordionPrimitive.Trigger
          ref={ref}
          className={cn(
            'flex items-center justify-between w-full px-6 py-4 text-left font-medium text-body text-semantic-text-primary',
            'hover:bg-semantic-bg-secondary transition-colors duration-fast',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-semantic-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-component-card-bg',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            '[&[data-state=open]>svg]:rotate-180',
            className
          )}
          {...props}
        >
          <span className="flex items-center gap-3 flex-1">
            {icon && <span className="h-5 w-5 text-semantic-text-tertiary" aria-hidden="true">{icon}</span>}
            {children}
          </span>
          <ChevronDown className="h-5 w-5 text-semantic-text-tertiary transition-transform duration-fast shrink-0 ml-4" aria-hidden="true" />
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
    );
  }
);
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

export interface AccordionContentProps extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content> {
  className?: string;
}

const AccordionContent = React.forwardRef<HTMLDivElement, AccordionContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <AccordionPrimitive.Content
        ref={ref}
        className={cn(
          'overflow-hidden text-body-sm text-semantic-text-secondary',
          'data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down',
          className
        )}
        {...props}
      >
        <div className="px-6 pb-4">{children}</div>
      </AccordionPrimitive.Content>
    );
  }
);
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };