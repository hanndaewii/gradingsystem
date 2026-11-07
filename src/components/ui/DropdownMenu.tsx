'use client';

import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DropdownMenuProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Root> {
  children: React.ReactNode;
}

const DropdownMenu = React.forwardRef<HTMLDivElement, DropdownMenuProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <DropdownMenuPrimitive.Root ref={ref} className={cn('', className)} {...props}>
        {children}
      </DropdownMenuPrimitive.Root>
    );
  }
);
DropdownMenu.displayName = DropdownMenuPrimitive.Root.displayName;

export interface DropdownMenuTriggerProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger> {
  asChild?: boolean;
}

const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(
  ({ className, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? DropdownMenuPrimitive.Trigger : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-1.5',
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
DropdownMenuTrigger.displayName = DropdownMenuPrimitive.Trigger.displayName;

export interface DropdownMenuContentProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content> {
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
}

const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ className, align = 'end', sideOffset = 4, children, ...props }, ref) => {
    return (
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          ref={ref}
          align={align}
          sideOffset={sideOffset}
          className={cn(
            'z-[var(--z-dropdown)] min-w-[180px] bg-component-card-bg border border-component-card-border rounded-xl shadow-lg p-1',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'focus-visible:outline-none',
            className
          )}
          {...props}
        >
          {children}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    );
  }
);
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

export interface DropdownMenuItemProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> {
  icon?: React.ReactNode;
  shortcut?: string;
  inset?: boolean;
  destructive?: boolean;
}

const DropdownMenuItem = React.forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  ({ className, icon, shortcut, inset = true, destructive = false, children, ...props }, ref) => {
    return (
      <DropdownMenuPrimitive.Item
        ref={ref}
        className={cn(
          'relative flex items-center gap-2 px-3 py-2 text-body-sm rounded-lg transition-colors',
          'focus:bg-semantic-bg-secondary focus:outline-none',
          'data-[disabled]:opacity-50 data-[disabled]:pointer-events-none',
          inset && 'pl-8',
          destructive && 'text-semantic-status-error focus:bg-semantic-status-error-bg',
          className
        )}
        {...props}
      >
        {icon && <span className="h-4 w-4 flex-shrink-0" aria-hidden="true">{icon}</span>}
        <span className="flex-1 truncate">{children}</span>
        {shortcut && <span className="text-caption text-semantic-text-tertiary font-mono ml-auto">{shortcut}</span>}
      </DropdownMenuPrimitive.Item>
    );
  }
);
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

export interface DropdownMenuCheckboxItemProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem> {
  inset?: boolean;
}

const DropdownMenuCheckboxItem = React.forwardRef<HTMLDivElement, DropdownMenuCheckboxItemProps>(
  ({ className, inset = true, children, checked, ...props }, ref) => {
    return (
      <DropdownMenuPrimitive.CheckboxItem
        ref={ref}
        className={cn(
          'relative flex items-center gap-2 px-3 py-2 text-body-sm rounded-lg transition-colors',
          'focus:bg-semantic-bg-secondary focus:outline-none',
          'data-[disabled]:opacity-50 data-[disabled]:pointer-events-none',
          inset && 'pl-8',
          className
        )}
        checked={checked}
        {...props}
      >
        <span className="flex items-center justify-center h-4 w-4 rounded-sm border border-semantic-border-primary">
          {checked && <Check className="h-3 w-3 text-semantic-brand-primary" />}
        </span>
        <span className="flex-1 truncate">{children}</span>
      </DropdownMenuPrimitive.CheckboxItem>
    );
  }
);
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;

export interface DropdownMenuRadioItemProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem> {
  inset?: boolean;
}

const DropdownMenuRadioItem = React.forwardRef<HTMLDivElement, DropdownMenuRadioItemProps>(
  ({ className, inset = true, children, ...props }, ref) => {
    return (
      <DropdownMenuPrimitive.RadioItem
        ref={ref}
        className={cn(
          'relative flex items-center gap-2 px-3 py-2 text-body-sm rounded-lg transition-colors',
          'focus:bg-semantic-bg-secondary focus:outline-none',
          'data-[disabled]:opacity-50 data-[disabled]:pointer-events-none',
          inset && 'pl-8',
          className
        )}
        {...props}
      >
        <span className="flex items-center justify-center h-4 w-4 rounded-full border border-semantic-border-primary">
          <span className="h-2 w-2 rounded-full bg-semantic-brand-primary" />
        </span>
        <span className="flex-1 truncate">{children}</span>
      </DropdownMenuPrimitive.RadioItem>
    );
  }
);
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

export interface DropdownMenuSubProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Sub> {}

const DropdownMenuSub = React.forwardRef<HTMLDivElement, DropdownMenuSubProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <DropdownMenuPrimitive.Sub ref={ref} className={cn('', className)} {...props}>
        {children}
      </DropdownMenuPrimitive.Sub>
    );
  }
);
DropdownMenuSub.displayName = DropdownMenuPrimitive.Sub.displayName;

export interface DropdownMenuSubTriggerProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> {
  icon?: React.ReactNode;
  inset?: boolean;
}

const DropdownMenuSubTrigger = React.forwardRef<HTMLDivElement, DropdownMenuSubTriggerProps>(
  ({ className, icon, inset = true, children, ...props }, ref) => {
    return (
      <DropdownMenuPrimitive.SubTrigger
        ref={ref}
        className={cn(
          'relative flex items-center gap-2 px-3 py-2 text-body-sm rounded-lg transition-colors',
          'focus:bg-semantic-bg-secondary focus:outline-none',
          'data-[state=open]:bg-semantic-bg-secondary',
          'data-[disabled]:opacity-50 data-[disabled]:pointer-events-none',
          inset && 'pl-8',
          className
        )}
        {...props}
      >
        {icon && <span className="h-4 w-4 flex-shrink-0" aria-hidden="true">{icon}</span>}
        <span className="flex-1 truncate">{children}</span>
        <ChevronRight className="h-4 w-4 text-semantic-text-tertiary ml-auto" aria-hidden="true" />
      </DropdownMenuPrimitive.SubTrigger>
    );
  }
);
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;

export interface DropdownMenuSubContentProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent> {}

const DropdownMenuSubContent = React.forwardRef<HTMLDivElement, DropdownMenuSubContentProps>(
  ({ className, ...props }, ref) => {
    return (
      <DropdownMenuPrimitive.SubContent
        ref={ref}
        className={cn(
          'z-[var(--z-dropdown)] min-w-[180px] bg-component-card-bg border border-component-card-border rounded-xl shadow-lg p-1',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          'data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          className
        )}
        {...props}
      />
    );
  }
);
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;

export interface DropdownMenuSeparatorProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator> {}

const DropdownMenuSeparator = React.forwardRef<HTMLDivElement, DropdownMenuSeparatorProps>(
  ({ className, ...props }, ref) => {
    return (
      <DropdownMenuPrimitive.Separator
        ref={ref}
        className={cn('h-px bg-component-card-border mx-1 my-1', className)}
        {...props}
      />
    );
  }
);
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

export interface DropdownMenuLabelProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> {
  inset?: boolean;
}

const DropdownMenuLabel = React.forwardRef<HTMLDivElement, DropdownMenuLabelProps>(
  ({ className, inset = true, children, ...props }, ref) => {
    return (
      <DropdownMenuPrimitive.Label
        ref={ref}
        className={cn('px-3 py-1.5 text-caption font-semibold text-semantic-text-tertiary uppercase tracking-wider', inset && 'pl-8', className)}
        {...props}
      >
        {children}
      </DropdownMenuPrimitive.Label>
    );
  }
);
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

export interface DropdownMenuGroupProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Group> {}

const DropdownMenuGroup = React.forwardRef<HTMLDivElement, DropdownMenuGroupProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <DropdownMenuPrimitive.Group ref={ref} className={cn('', className)} {...props}>
        {children}
      </DropdownMenuPrimitive.Group>
    );
  }
);
DropdownMenuGroup.displayName = DropdownMenuPrimitive.Group.displayName;

export interface DropdownMenuShortcutProps {
  children: React.ReactNode;
}

const DropdownMenuShortcut = ({ children }: DropdownMenuShortcutProps) => {
  return <span className="ml-auto text-caption text-semantic-text-tertiary font-mono">{children}</span>;
};

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuShortcut,
};