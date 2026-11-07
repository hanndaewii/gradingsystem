'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export interface AppShellProps {
  children: React.ReactNode;
  sidebar?: {
    items: React.ComponentProps<typeof Sidebar>['items'];
    user?: React.ComponentProps<typeof Sidebar>['user'];
    brand?: React.ComponentProps<typeof Sidebar>['brand'];
    collapsed?: boolean;
    onCollapseChange?: (collapsed: boolean) => void;
    width?: number;
    collapsedWidth?: number;
  };
  header?: React.ComponentProps<typeof Header>;
  className?: string;
  sidebarClassName?: string;
  headerClassName?: string;
  mainClassName?: string;
}

export const AppShell = React.forwardRef<HTMLDivElement, AppShellProps>(
  (
    {
      children,
      sidebar,
      header,
      className,
      sidebarClassName,
      headerClassName,
      mainClassName,
    },
    ref
  ) => {
    const [sidebarCollapsed, setSidebarCollapsed] = React.useState(sidebar?.collapsed ?? false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

    const sidebarWidth = sidebar?.width ?? 260;
    const collapsedWidth = sidebar?.collapsedWidth ?? 72;

    const handleMenuClick = () => setMobileSidebarOpen(true);

    const handleSidebarCollapseChange = (collapsed: boolean) => {
      setSidebarCollapsed(collapsed);
      sidebar?.onCollapseChange?.(collapsed);
    };

    return (
      <div ref={ref} className={cn('min-h-screen bg-semantic-bg-primary', className)}>
        {sidebar && (
          <>
            <Sidebar
              items={sidebar.items}
              user={sidebar.user}
              brand={sidebar.brand}
              collapsed={sidebarCollapsed}
              onCollapseChange={handleSidebarCollapseChange}
              width={sidebarWidth}
              collapsedWidth={collapsedWidth}
              className={cn(
                'fixed left-0 top-0 z-[var(--z-sticky)] h-screen transition-transform duration-normal ease-out lg:translate-x-0',
                mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
                sidebarClassName
              )}
            />
            {mobileSidebarOpen && (
              <div
                className="fixed inset-0 bg-black/50 z-[calc(var(--z-sticky)-1)] lg:hidden"
                onClick={() => setMobileSidebarOpen(false)}
                aria-hidden="true"
              />
            )}
          </>
        )}

        <div
          className={cn(
            'transition-all duration-normal ease-out',
            sidebar && !sidebarCollapsed ? `lg:ml-[${sidebarWidth}px]` : sidebar ? `lg:ml-[${collapsedWidth}px]` : 'lg:ml-0',
            sidebar && !sidebarCollapsed ? `ml-[${sidebarWidth}px]` : sidebar ? `ml-[${collapsedWidth}px]` : 'ml-0',
            mainClassName
          )}
        >
          {header && (
            <Header
              onMenuClick={handleMenuClick}
              className={cn(
                sidebar ? 'lg:right-0' : 'right-0',
                sidebar && !sidebarCollapsed ? `lg:left-[${sidebarWidth}px]` : sidebar ? `lg:left-[${collapsedWidth}px]` : 'lg:left-0',
                headerClassName
              )}
              {...header}
            />
          )}

          <main
            className={cn('min-h-screen pt-16 pb-8', header ? `pt-[${header.height || 64}px]` : 'pt-16')}
            role="main"
          >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    );
  }
);

AppShell.displayName = 'AppShell';

export interface SimpleLayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  sidebar?: React.ReactNode;
  className?: string;
}

export const SimpleLayout = ({ children, header, footer, sidebar, className }: SimpleLayoutProps) => {
  return (
    <div className={cn('min-h-screen bg-semantic-bg-primary flex flex-col', className)}>
      {header && <header className="border-b border-component-card-border bg-component-card-bg">{header}</header>}
      <div className="flex flex-1">
        {sidebar && <aside className="w-64 border-r border-component-card-border bg-component-card-bg p-4 overflow-y-auto">{sidebar}</aside>}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
      {footer && <footer className="border-t border-component-card-border bg-component-card-bg p-4">{footer}</footer>}
    </div>
  );
};

export { AppShell };