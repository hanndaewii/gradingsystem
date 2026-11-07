'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'avatar' | 'button' | 'input' | 'card' | 'table-row';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = 'text', width, height, lines = 1, ...props }, ref) => {
    const baseStyles = 'animate-pulse bg-semantic-bg-tertiary rounded';

    const variants = {
      text: 'h-4 w-full',
      circular: 'rounded-full',
      rectangular: 'rounded-lg',
      avatar: 'rounded-full',
      button: 'rounded-soft',
      input: 'rounded-soft',
      card: 'rounded-xl',
      'table-row': 'rounded-none',
    };

    const sizes = {
      text: { height: '1rem' },
      circular: { width: '2.5rem', height: '2.5rem' },
      rectangular: { width: '100%', height: '1.5rem' },
      avatar: { width: '2.5rem', height: '2.5rem' },
      button: { width: '6rem', height: '2.5rem' },
      input: { width: '100%', height: '2.5rem' },
      card: { width: '100%', height: '12rem' },
      'table-row': { width: '100%', height: '3rem' },
    };

    const variantStyles = variants[variant];
    const defaultSize = sizes[variant];

    if (variant === 'text' && lines > 1) {
      return (
        <div ref={ref} className={cn('space-y-2', className)} {...props}>
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className={cn(
                baseStyles,
                variantStyles,
                i === lines - 1 && 'w-3/4'
              )}
              style={{ width: i === lines - 1 ? '75%' : width }}
            />
          ))}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(baseStyles, variantStyles, className)}
        style={{
          width: width ?? defaultSize.width,
          height: height ?? defaultSize.height,
        }}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

export interface SkeletonCardProps {
  variant?: 'default' | 'with-image' | 'with-avatar';
  className?: string;
}

export const SkeletonCard = ({ variant = 'default', className }: SkeletonCardProps) => {
  return (
    <div className={cn('card p-6 space-y-4 animate-pulse', className)}>
      {variant === 'with-image' && (
        <div className="aspect-video w-full rounded-lg bg-semantic-bg-tertiary" />
      )}
      {variant === 'with-avatar' && (
        <div className="flex items-center gap-4">
          <Skeleton variant="avatar" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="text" width="60%" />
          </div>
        </div>
      )}
      <Skeleton variant="text" width="30%" />
      <Skeleton variant="text" lines={3} />
      <div className="flex justify-end gap-2 pt-2">
        <Skeleton variant="button" />
        <Skeleton variant="button" />
      </div>
    </div>
  );
};

export interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export const SkeletonTable = ({ rows = 5, columns = 4, className }: SkeletonTableProps) => {
  return (
    <div className={cn('rounded-xl border border-component-card-border bg-component-card-bg overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full" role="grid">
          <thead>
            <tr className="border-b border-component-card-border bg-semantic-bg-secondary">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="p-3 text-left">
                  <Skeleton variant="text" width={80 + Math.random() * 60} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-component-card-border">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className="p-3">
                    <Skeleton variant="text" width={60 + Math.random() * 80} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export interface SkeletonFormProps {
  fields?: number;
  className?: string;
}

export const SkeletonForm = ({ fields = 4, className }: SkeletonFormProps) => {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton variant="text" width="25%" />
          <Skeleton variant="input" />
        </div>
      ))}
    </div>
  );
};

export interface SkeletonListProps {
  items?: number;
  variant?: 'simple' | 'with-avatar' | 'with-image';
  className?: string;
}

export const SkeletonList = ({ items = 5, variant = 'simple', className }: SkeletonListProps) => {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className={cn('flex items-center gap-3 p-3 rounded-lg bg-semantic-bg-secondary animate-pulse')}>
          {variant === 'with-avatar' && <Skeleton variant="avatar" />}
          {variant === 'with-image' && <Skeleton variant="circular" className="h-12 w-12 rounded-lg" />}
          <div className="flex-1 space-y-1.5 min-w-0">
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" />
          </div>
          {variant === 'simple' && <Skeleton variant="circular" className="h-8 w-8" />}
        </div>
      ))}
    </div>
  );
};

export interface SkeletonChartProps {
  className?: string;
  height?: number;
}

export const SkeletonChart = ({ className, height = 300 }: SkeletonChartProps) => {
  return (
    <div className={cn('card p-6 animate-pulse', className)} style={{ height }}>
      <div className="space-y-3 mb-6">
        <Skeleton variant="text" width="30%" />
        <Skeleton variant="text" width="20%" />
      </div>
      <div className="h-full bg-semantic-bg-tertiary rounded-lg" />
    </div>
  );
};

export { Skeleton };