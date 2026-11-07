'use client';

import * as React from 'react';
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';
import { ChevronRight, ChevronDown, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import { Avatar } from './Avatar';

export interface NavItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  badge?: string | number;
  children?: NavItem[];
  disabled?: boolean;
  onClick?: () => void;
}

export interface SidebarProps {
  items: NavItem[];
  collapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
  user?: {
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  };
  brand?: {
    logo?: React.ReactNode;
    name: string;
    tagline?: string;
  };
  className?: string;
  width?: number;
  collapsedWidth?: number;
}

const Sidebar = React.forwardRef<HTMLAsideElement, SidebarProps>(
  (
    {
      className,
      items,
      collapsed = false,
      onCollapseChange,
      user,
      brand,
      width = 260,
      collapsedWidth = 72,
      ...props
    },
    ref
  ) => {
    const [openItems, setOpenItems] = React.useState<Set<string>>(new Set());

    const toggleItem = (label: string) => {
      setOpenItems((prev) => {
        const next = new Set(prev);
        if (next.has(label)) next.delete(label);
        else next.add(label);
        return next;
      });
    };

    const isOpen = (label: string) => openItems.has(label);

    const renderItem = (item: NavItem, level = 0, parentLabel = '') => {
      const fullLabel = parentLabel ? `${parentLabel}.${item.label}` : item.label;
      const hasChildren = item.children && item.children.length > 0;

      if (hasChildren) {
        return (
          <CollapsiblePrimitive.Root key={fullLabel} open={isOpen(fullLabel)} onOpenChange={() => toggleItem(fullLabel)}>
            <CollapsiblePrimitive.Trigger
              className={cn(
                'flex items-center justify-between w-full px-3 py-2 text-body-sm font-medium rounded-xl transition-colors',
                'hover:bg-semantic-bg-secondary',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-semantic-brand-primary focus-visible:ring-offset-2',
                level > 0 && 'pl-8',
                collapsed && 'justify-center px-2',
                item.disabled && 'opacity-50 cursor-not-allowed'
              )}
              aria-expanded={isOpen(fullLabel)}
            >
              <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
                {item.icon && <span className={cn('h-5 w-5 flex-shrink-0', collapsed && 'mx-auto')} aria-hidden="true">{item.icon}</span>}
                {!collapsed && <span className="truncate">{item.label}</span>}
              </div>
              {!collapsed && (
                <ChevronDown className={cn('h-4 w-4 text-semantic-text-tertiary transition-transform', isOpen(fullLabel) && 'rotate-180')} aria-hidden="true" />
              )}
            </CollapsiblePrimitive.Trigger>
            <CollapsiblePrimitive.Content className={cn('overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up', collapsed && 'hidden')}>
              <div className="space-y-1 pl-2">
                {item.children!.map((child) => renderItem(child, level + 1, fullLabel))}
              </div>
            </CollapsiblePrimitive.Content>
          </CollapsiblePrimitive.Root>
        );
      }

      return (
        <button
          key={fullLabel}
          onClick={item.onClick}
          disabled={item.disabled}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2 text-body-sm font-medium rounded-xl transition-colors',
            'hover:bg-semantic-bg-secondary',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-semantic-brand-primary focus-visible:ring-offset-2',
            level > 0 && 'pl-8',
            collapsed && 'justify-center px-2',
            item.disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {item.icon && <span className={cn('h-5 w-5 flex-shrink-0', collapsed && 'mx-auto')} aria-hidden="true">{item.icon}</span>}
          {!collapsed && (
            <>
              <span className="truncate flex-1">{item.label}</span>
              {item.badge && (
                <span className="ml-auto px-2 py-0.5 text-[10px] font-semibold rounded-full bg-semantic-brand-primary/10 text-semantic-brand-primary">
                  {item.badge}
                </span>
              )}
            </>
          )}
        </button>
      );
    };

    return (
      <aside
        ref={ref}
        className={cn(
          'fixed left-0 top-0 h-screen bg-component-card-bg border-r border-component-card-border transition-all duration-normal ease-out z-[var(--z-sticky)] flex flex-col',
          collapsed ? `w-[${collapsedWidth}px]` : `w-[${width}px]`,
          className
        )}
        style={{ width: collapsed ? collapsedWidth : width }}
        {...props}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-component-card-border flex-shrink-0">
          {!collapsed && brand && (
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {brand.logo && <span className="flex-shrink-0">{brand.logo}</span>}
              <div className="min-w-0">
                <p className="font-semibold text-heading-sm text-semantic-text-primary truncate">{brand.name}</p>
                {brand.tagline && <p className="text-[11px] text-semantic-text-tertiary truncate">{brand.tagline}</p>}
              </div>
            </div>
          )}
          {collapsed && brand?.logo && (
            <div className="flex justify-center">{brand.logo}</div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCollapseChange?.(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn('flex-shrink-0', collapsed && 'ml-auto')}
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1" aria-label="Main navigation">
          {items.map((item) => renderItem(item))}
        </nav>

        {user && !collapsed && (
          <div className="p-3 border-t border-component-card-border">
            <div className="flex items-center gap-3">
              <Avatar src={user.avatar} alt={user.name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-body-sm text-semantic-text-primary truncate">{user.name}</p>
                <p className="text-[11px] text-semantic-text-tertiary truncate">{user.email}</p>
                {user.role && <p className="text-[10px] text-semantic-text-tertiary">{user.role}</p>}
              </div>
            </div>
          </div>
        )}

        {user && collapsed && (
          <div className="p-2 border-t border-component-card-border">
            <Avatar src={user.avatar} alt={user.name} size="sm" />
          </div>
        )}
      </aside>
    );
  }
);

Sidebar.displayName = 'Sidebar';

export { Sidebar };