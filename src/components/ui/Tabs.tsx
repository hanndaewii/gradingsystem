'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

export interface TabsProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {
  variant?: 'default' | 'underline' | 'pills';
  className?: string;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, variant = 'default', defaultValue, onValueChange, children, ...props }, ref) => {
    return (
      <TabsPrimitive.Root
        ref={ref}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        className={cn('w-full', className)}
        {...props}
      >
        {children}
      </TabsPrimitive.Root>
    );
  }
);
Tabs.displayName = TabsPrimitive.Root.displayName;

export interface TabsListProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
  variant?: 'default' | 'underline' | 'pills';
}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    return (
      <TabsPrimitive.List
        ref={ref}
        className={cn(
          'flex items-center gap-1',
          variant === 'default' && 'bg-semantic-bg-secondary p-1 rounded-xl',
          variant === 'underline' && 'border-b border-component-card-border pb-1',
          variant === 'pills' && 'gap-2',
          className
        )}
        {...props}
      >
        {children}
      </TabsPrimitive.List>
    );
  }
);
TabsList.displayName = TabsPrimitive.List.displayName;

export interface TabsTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  variant?: 'default' | 'underline' | 'pills';
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, variant = 'default', icon, badge, children, ...props }, ref) => {
    return (
      <TabsPrimitive.Trigger
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center gap-2 font-medium text-body-sm transition-all duration-fast',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-semantic-brand-primary focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variant === 'default' &&
            'rounded-xl px-4 py-2 text-semantic-text-secondary ' +
            'data-[state=active]:bg-component-card-bg data-[state=active]:text-semantic-text-primary data-[state=active]:shadow-sm',
          variant === 'underline' &&
            'pb-3 px-2 text-semantic-text-secondary ' +
            'data-[state=active]:text-semantic-brand-primary data-[state=active]:border-b-2 data-[state=active]:border-semantic-brand-primary',
          variant === 'pills' &&
            'rounded-xl px-4 py-2 text-semantic-text-secondary ' +
            'data-[state=active]:bg-semantic-brand-primary data-[state=active]:text-semantic-text-inverse ' +
            'hover:data-[state=inactive]:bg-semantic-bg-tertiary',
          className
        )}
        {...props}
      >
        {icon && <span className="h-4 w-4" aria-hidden="true">{icon}</span>}
        {children}
        {badge && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-5 px-1.5 text-[10px] font-semibold text-center rounded-full bg-semantic-status-error text-semantic-text-inverse">
            {badge}
          </span>
        )}
      </TabsPrimitive.Trigger>
    );
  }
);
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export interface TabsContentProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content> {}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <TabsPrimitive.Content
        ref={ref}
        className={cn(
          'mt-4 animate-fade-in',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-semantic-brand-primary focus-visible:ring-offset-2',
          className
        )}
        {...props}
      >
        {children}
      </TabsPrimitive.Content>
    );
  }
);
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };