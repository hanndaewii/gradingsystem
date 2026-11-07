'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

export interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  value?: number;
  max?: number;
  showLabel?: boolean;
  label?: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, showLabel = false, label, variant = 'default', size = 'md', ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const variants = {
      default: 'bg-semantic-brand-primary',
      success: 'bg-semantic-status-success',
      warning: 'bg-semantic-status-warning',
      error: 'bg-semantic-status-error',
    };

    const sizes = {
      sm: 'h-1.5',
      md: 'h-2',
      lg: 'h-3',
    };

    return (
      <div className={cn('w-full', className)} {...props}>
        {(label || showLabel) && (
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-body-sm font-medium text-semantic-text-primary">{label}</span>
            {showLabel && <span className="text-body-sm text-semantic-text-tertiary tabular-nums">{Math.round(percentage)}%</span>}
          </div>
        )}
        <ProgressPrimitive.Root
          ref={ref}
          className={cn(
            'relative overflow-hidden bg-semantic-bg-tertiary rounded-full',
            sizes[size]
          )}
          value={value}
          max={max}
        >
          <ProgressPrimitive.Indicator
            className={cn(
              'h-full w-full flex-1 rounded-full transition-all duration-500 ease-out',
              variants[variant]
            )}
            style={{ transform: `translateX(-${100 - percentage}%)` }}
          />
        </ProgressPrimitive.Root>
      </div>
    );
  }
);

Progress.displayName = ProgressPrimitive.Root.displayName;

export interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  variant?: 'default' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export const CircularProgress = React.forwardRef<SVGSVGElement, CircularProgressProps>(
  ({ value = 0, max = 100, size = 48, strokeWidth = 4, variant = 'default', showLabel = false, label, className }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    const variants = {
      default: 'text-semantic-brand-primary',
      success: 'text-semantic-status-success',
      warning: 'text-semantic-status-warning',
      error: 'text-semantic-status-error',
    };

    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={cn(variants[variant], className)}
        role="img"
        aria-label={label || `Progress: ${Math.round(percentage)}%`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="opacity-20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out -rotate-90"
          style={{ transformOrigin: 'center' }}
        />
        {(showLabel || label) && (
          <text
            x={size / 2}
            y={size / 2}
            dominantBaseline="middle"
            textAnchor="middle"
            className="font-medium"
            style={{ fontSize: size * 0.25 }}
          >
            {label || `${Math.round(percentage)}%`}
          </text>
        )}
      </svg>
    );
  }
);

CircularProgress.displayName = 'CircularProgress';

export interface IndeterminateProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
}

export const IndeterminateProgress = React.forwardRef<HTMLDivElement, IndeterminateProgressProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    const variants = {
      default: 'bg-semantic-brand-primary',
      success: 'bg-semantic-status-success',
      warning: 'bg-semantic-status-warning',
      error: 'bg-semantic-status-error',
    };

    const sizes = {
      sm: 'h-1.5',
      md: 'h-2',
      lg: 'h-3',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'relative overflow-hidden bg-semantic-bg-tertiary rounded-full',
          sizes[size],
          className
        )}
        {...props}
      >
        <div
          className={cn(
            'absolute inset-0 rounded-full animate-pulse',
            variants[variant]
          )}
          style={{
            animation: 'progress-indeterminate 1.5s ease-in-out infinite',
          }}
        />
        <style jsx>{`
          @keyframes progress-indeterminate {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  }
);

IndeterminateProgress.displayName = 'IndeterminateProgress';

export { Progress };