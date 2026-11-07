'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

export interface TooltipProps extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root> {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  delayDuration?: number;
  skipDelayDuration?: number;
  className?: string;
}

const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  (
    {
      className,
      content,
      children,
      side = 'top',
      align = 'center',
      sideOffset = 4,
      delayDuration = 200,
      skipDelayDuration = 300,
      ...props
    },
    ref
  ) => {
    if (!React.isValidElement(children)) {
      throw new Error('Tooltip requires a single child element');
    }

    return (
      <TooltipPrimitive.Root
        ref={ref}
        delayDuration={delayDuration}
        skipDelayDuration={skipDelayDuration}
        {...props}
      >
        <TooltipPrimitive.Trigger asChild>
          {React.cloneElement(children, {
            'data-radix-tooltip-trigger': '',
          })}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            align={align}
            sideOffset={sideOffset}
            className={cn(
              'z-[var(--z-tooltip)] px-3 py-1.5 text-caption font-medium text-semantic-text-inverse',
              'bg-semantic-text-primary rounded-md shadow-lg',
              'animate-fade-in data-[state=delayed-open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              className
            )}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-semantic-text-primary" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    );
  }
);

Tooltip.displayName = TooltipPrimitive.Root.displayName;

export interface TooltipProviderProps {
  children: React.ReactNode;
  delayDuration?: number;
  skipDelayDuration?: number;
}

export const TooltipProvider = ({ children, delayDuration = 200, skipDelayDuration = 300 }: TooltipProviderProps) => {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration} skipDelayDuration={skipDelayDuration}>
      {children}
    </TooltipPrimitive.Provider>
  );
};

export { Tooltip };