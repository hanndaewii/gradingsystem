'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface StatCardProps {
  label: string;
  value: string | number;
  trend?: {
    value: number;
    label?: string;
    direction?: 'up' | 'down' | 'neutral';
  };
  icon?: React.ReactNode;
  sparkline?: number[];
  className?: string;
  variant?: 'default' | 'highlight';
}

export const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, label, value, trend, icon, sparkline, variant = 'default', ...props }, ref) => {
    const trendColor = trend?.direction === 'up' ? 'text-semantic-status-success' : trend?.direction === 'down' ? 'text-semantic-status-error' : 'text-semantic-text-tertiary';
    const TrendIcon = trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : Minus;

    return (
      <div
        ref={ref}
        className={cn(
          'card p-6 flex flex-col gap-4 transition-all duration-normal',
          variant === 'highlight' && 'border-semantic-brand-primary bg-semantic-brand-primary/5',
          className
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-body-sm font-medium text-semantic-text-secondary truncate">{label}</p>
            <p className="mt-1 text-display-sm font-semibold text-semantic-text-primary tabular-nums">
              {value}
            </p>
          </div>
          {icon && (
            <div className="flex-shrink-0 p-3 rounded-xl bg-semantic-bg-secondary text-semantic-text-secondary">
              {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement, { className: 'h-6 w-6' }) : icon}
            </div>
          )}
        </div>

        <div className="flex items-end gap-4">
          {trend && (
            <div className={cn('flex items-center gap-1.5', trendColor)}>
              <TrendIcon className="h-4 w-4" aria-hidden="true" />
              <span className="text-body-sm font-medium">{trend.value >= 0 ? '+' : ''}{trend.value}%</span>
              {trend.label && <span className="text-body-sm text-semantic-text-tertiary">{trend.label}</span>}
            </div>
          )}
          {sparkline && sparkline.length > 1 && (
            <div className="flex-1 h-12 relative" aria-hidden="true">
              <Sparkline data={sparkline} color={trendColor} />
            </div>
          )}
        </div>
      </div>
    );
  }
);

StatCard.displayName = 'StatCard';

interface SparklineProps {
  data: number[];
  color?: string;
}

function Sparkline({ data, color = 'currentColor' }: SparklineProps) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 100;
  const height = 48;

  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`M${points}`}
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-all duration-500"
      />
      <path
        d={`M${points} L${width},${height} L0,${height} Z`}
        fill="url(#sparkline-gradient)"
        className="transition-all duration-500"
      />
    </svg>
  );
}