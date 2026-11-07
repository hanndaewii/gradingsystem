'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea as RadixScrollArea, ScrollBar } from '@radix-ui/react-scroll-area';

interface ScrollAreaProps extends React.ComponentPropsWithoutRef<typeof RadixScrollArea.Root> {
  className?: string;
}

export const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <RadixScrollArea.Root
        ref={ref}
        className={cn('relative', className)}
        {...props}
      >
        <RadixScrollArea.Viewport className="h-full w-full -fs-scrollbar">
          {children}
        </RadixScrollArea.Viewport>
        <ScrollBar orientation="vertical" className="flex h-full w-2.5 border-l border-semantic-border-primary/50" />
        <ScrollBar orientation="horizontal" className="flex h-2.5 w-full border-t border-semantic-border-primary/50" />
        <RadixScrollArea.Corner className="bg-semantic-border-primary/50" />
      </RadixScrollArea.Root>
    );
  }
);

ScrollArea.displayName = 'ScrollArea';

export const ScrollBar = React.forwardRef<
  React.ElementRef<typeof RadixScrollArea.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof RadixScrollArea.ScrollAreaScrollbar>
>(({ className, orientation = 'vertical', ...props }, ref) => {
  return (
    <RadixScrollArea.ScrollAreaScrollbar
      ref={ref}
      orientation={orientation}
      className={cn(
        'flex touch-none select-none transition-colors',
        orientation === 'vertical' && 'h-full w-2.5 border-l border-l-transparent p-[1px]',
        orientation === 'horizontal' && 'h-2.5 flex-col border-t border-t-transparent p-[1px]',
        className
      )}
      {...props}
    >
      <RadixScrollArea.ScrollAreaThumb className="relative flex-1 rounded-full bg-semantic-border-primary/30 hover:bg-semantic-border-primary/50 active:bg-semantic-border-primary/60" />
    </RadixScrollArea.ScrollAreaScrollbar>
  );
});

ScrollBar.displayName = 'ScrollBar';