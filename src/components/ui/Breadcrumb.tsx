'use client';

import * as React from 'react';
import * as BreadcrumbPrimitive from '@radix-ui/react-breadcrumb';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbProps extends React.ComponentPropsWithoutRef<typeof BreadcrumbPrimitive.Root> {
  className?: string;
  separator?: React.ReactNode;
}

const Breadcrumb = React.forwardRef<HTMLNavElement, BreadcrumbProps>(
  ({ className, separator, children, ...props }, ref) => {
    return (
      <BreadcrumbPrimitive.Root
        ref={ref}
        className={cn('flex items-center gap-1.5 text-body-sm', className)}
        {...props}
      >
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 flex-wrap">
          <ol className="flex items-center gap-1.5 flex-wrap">
            {React.Children.map(children, (child, index) => {
              if (!React.isValidElement(child)) return child;
              const isLast = index === React.Children.count(children) - 1;
              return React.cloneElement(child, {
                separator: !isLast ? separator || <ChevronRight className="h-4 w-4 text-semantic-text-tertiary" aria-hidden="true" /> : undefined,
              });
            })}
          </ol>
        </nav>
      </BreadcrumbPrimitive.Root>
    );
  }
);
Breadcrumb.displayName = BreadcrumbPrimitive.Root.displayName;

export interface BreadcrumbItemProps extends React.ComponentPropsWithoutRef<typeof BreadcrumbPrimitive.Item> {
  separator?: React.ReactNode;
}

const BreadcrumbItem = React.forwardRef<HTMLLIElement, BreadcrumbItemProps>(
  ({ className, separator, children, ...props }, ref) => {
    return (
      <BreadcrumbPrimitive.Item
        ref={ref}
        className={cn('flex items-center gap-1.5', className)}
        {...props}
      >
        {children}
        {separator && <span className="flex-shrink-0" aria-hidden="true">{separator}</span>}
      </BreadcrumbPrimitive.Item>
    );
  }
);
BreadcrumbItem.displayName = BreadcrumbPrimitive.Item.displayName;

export interface BreadcrumbLinkProps extends React.ComponentPropsWithoutRef<typeof BreadcrumbPrimitive.Link> {
  asChild?: boolean;
}

const BreadcrumbLink = React.forwardRef<HTMLAnchorElement, BreadcrumbLinkProps>(
  ({ className, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? 'span' : 'a';
    return (
      <BreadcrumbPrimitive.Link
        ref={ref}
        asChild={asChild}
        className={cn(
          'flex items-center gap-1.5 text-semantic-text-secondary hover:text-semantic-text-primary transition-colors',
          className
        )}
        {...props}
      >
        {Comp === 'a' ? children : <span>{children}</span>}
      </BreadcrumbPrimitive.Link>
    );
  }
);
BreadcrumbLink.displayName = BreadcrumbPrimitive.Link.displayName;

export interface BreadcrumbPageProps extends React.ComponentPropsWithoutRef<typeof BreadcrumbPrimitive.Page> {}

const BreadcrumbPage = React.forwardRef<HTMLSpanElement, BreadcrumbPageProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <BreadcrumbPrimitive.Page
        ref={ref}
        className={cn('text-semantic-text-primary font-medium truncate max-w-[200px]', className)}
        {...props}
      >
        {children}
      </BreadcrumbPrimitive.Page>
    );
  }
);
BreadcrumbPage.displayName = BreadcrumbPrimitive.Page.displayName;

export interface BreadcrumbSeparatorProps extends React.ComponentPropsWithoutRef<typeof BreadcrumbPrimitive.Separator> {}

const BreadcrumbSeparator = React.forwardRef<HTMLSpanElement, BreadcrumbSeparatorProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <BreadcrumbPrimitive.Separator
        ref={ref}
        className={cn('text-semantic-text-tertiary', className)}
        {...props}
      >
        {children || <ChevronRight className="h-4 w-4" />}
      </BreadcrumbPrimitive.Separator>
    );
  }
);
BreadcrumbSeparator.displayName = BreadcrumbPrimitive.Separator.displayName;

export const BreadcrumbHome = React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement>>(
  ({ className, ...props }, ref) => {
    return (
      <BreadcrumbPrimitive.Link
        ref={ref}
        className={cn('flex items-center text-semantic-text-secondary hover:text-semantic-text-primary transition-colors p-1 rounded-md hover:bg-semantic-bg-tertiary', className)}
        {...props}
      >
        <Home className="h-4 w-4" aria-hidden="true" />
      </BreadcrumbPrimitive.Link>
    );
  }
);
BreadcrumbHome.displayName = 'BreadcrumbHome';

export { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbHome };