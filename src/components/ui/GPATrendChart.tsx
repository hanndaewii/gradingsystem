'use client';

import * as React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { cn } from '@/lib/utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export interface GPATrendData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: (number | null)[];
    borderColor?: string;
    backgroundColor?: string;
    borderWidth?: number;
    pointRadius?: number;
    pointHoverRadius?: number;
    tension?: number;
    fill?: boolean;
  }>;
}

export interface GPATrendChartProps {
  data: GPATrendData;
  options?: Partial<{
    responsive: boolean;
    maintainAspectRatio: boolean;
    plugins: {
      legend: { display: boolean; position: 'top' | 'bottom' | 'left' | 'right' };
      title: { display: boolean; text: string };
      tooltip: { enabled: boolean; mode: 'index' | 'point' | 'nearest'; intersect: boolean };
    };
    scales: {
      x: { grid: { display: boolean; color: string }; ticks: { color: string } };
      y: { grid: { color: string }; ticks: { color: string; min: number; max: number; stepSize: number } };
    };
    interaction: { mode: 'index' | 'point' | 'nearest'; intersect: boolean };
  }>;
  className?: string;
  height?: number;
  title?: string;
  subtitle?: string;
  showPoints?: boolean;
}

const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true, position: 'top' as const, labels: { usePointStyle: true, padding: 16, font: { size: 12 } } },
    title: { display: false },
    tooltip: {
      enabled: true,
      mode: 'index' as const,
      intersect: false,
      backgroundColor: 'var(--color-text-primary)',
      titleColor: 'var(--color-text-inverse)',
      bodyColor: 'var(--color-text-inverse)',
      borderColor: 'var(--color-border-primary)',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
      displayColors: true,
    },
  },
  scales: {
    x: {
      grid: { display: false, color: 'var(--color-border-primary)' },
      ticks: { color: 'var(--color-text-tertiary)', font: { size: 12 } },
    },
    y: {
      grid: { color: 'var(--color-border-primary)', drawBorder: false },
      ticks: { color: 'var(--color-text-tertiary)', font: { size: 12 }, min: 0, max: 4, stepSize: 0.5 },
    },
  },
  interaction: { mode: 'index' as const, intersect: false },
  elements: {
    line: { tension: 0.3 },
    point: { radius: 4, hoverRadius: 6 },
  },
};

export const GPATrendChart = React.forwardRef<HTMLDivElement, GPATrendChartProps>(
  (
    {
      data,
      options = {},
      className,
      height = 300,
      title: chartTitle,
      subtitle,
      showPoints = true,
    },
    ref
  ) => {
    const chartData = React.useMemo(() => {
      const colors = [
        'var(--color-brand-primary)',
        'var(--color-status-success)',
        'var(--color-status-warning)',
        'var(--color-status-error)',
        'var(--color-status-info)',
      ];

      return {
        ...data,
        datasets: data.datasets.map((dataset, i) => ({
          ...dataset,
          borderColor: dataset.borderColor || colors[i % colors.length],
          backgroundColor: dataset.backgroundColor || `${colors[i % colors.length]}20`,
          borderWidth: dataset.borderWidth ?? 2,
          pointRadius: showPoints ? (dataset.pointRadius ?? 4) : 0,
          pointHoverRadius: dataset.pointHoverRadius ?? 6,
          tension: dataset.tension ?? 0.3,
          fill: dataset.fill ?? true,
        })),
      };
    }, [data, showPoints]);

    const mergedOptions = React.useMemo(
      () => ({
        ...defaultOptions,
        ...options,
        plugins: { ...defaultOptions.plugins, ...options.plugins },
        scales: { ...defaultOptions.scales, ...options.scales },
        elements: { ...defaultOptions.elements, ...options.elements },
      }),
      [options]
    );

    return (
      <div ref={ref} className={cn('w-full', className)} style={{ height }}>
        {(chartTitle || subtitle) && (
          <div className="mb-4">
            {chartTitle && <h3 className="text-heading-sm font-semibold text-semantic-text-primary">{chartTitle}</h3>}
            {subtitle && <p className="text-body-sm text-semantic-text-secondary mt-1">{subtitle}</p>}
          </div>
        )}
        <div className="relative" style={{ height: height - (chartTitle || subtitle ? 40 : 0) }}>
          <Line data={chartData} options={mergedOptions} />
        </div>
      </div>
    );
  }
);

GPATrendChart.displayName = 'GPATrendChart';

export interface MultiLineChartProps extends GPATrendChartProps {
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: (number | null)[];
      borderColor?: string;
      backgroundColor?: string;
      borderWidth?: number;
      pointRadius?: number;
      pointHoverRadius?: number;
      tension?: number;
      fill?: boolean;
      borderDash?: number[];
    }>;
  };
}

export const MultiLineChart = React.forwardRef<HTMLDivElement, MultiLineChartProps>(
  ({ data, options = {}, className, height = 300, title: chartTitle, subtitle, showPoints = true }, ref) => {
    const chartData = React.useMemo(() => {
      const colors = [
        'var(--color-brand-primary)',
        'var(--color-status-success)',
        'var(--color-status-warning)',
        'var(--color-status-error)',
        'var(--color-status-info)',
      ];

      return {
        ...data,
        datasets: data.datasets.map((dataset, i) => ({
          ...dataset,
          borderColor: dataset.borderColor || colors[i % colors.length],
          backgroundColor: dataset.backgroundColor || `${colors[i % colors.length]}20`,
          borderWidth: dataset.borderWidth ?? 2,
          pointRadius: showPoints ? (dataset.pointRadius ?? 4) : 0,
          pointHoverRadius: dataset.pointHoverRadius ?? 6,
          tension: dataset.tension ?? 0.3,
          fill: dataset.fill ?? false,
          borderDash: dataset.borderDash,
        })),
      };
    }, [data, showPoints]);

    const mergedOptions = React.useMemo(
      () => ({
        ...defaultOptions,
        ...options,
        plugins: { ...defaultOptions.plugins, ...options.plugins },
        scales: { ...defaultOptions.scales, ...options.scales },
        elements: { ...defaultOptions.elements, ...options.elements },
      }),
      [options]
    );

    return (
      <div ref={ref} className={cn('w-full', className)} style={{ height }}>
        {(chartTitle || subtitle) && (
          <div className="mb-4">
            {chartTitle && <h3 className="text-heading-sm font-semibold text-semantic-text-primary">{chartTitle}</h3>}
            {subtitle && <p className="text-body-sm text-semantic-text-secondary mt-1">{subtitle}</p>}
          </div>
        )}
        <div className="relative" style={{ height: height - (chartTitle || subtitle ? 40 : 0) }}>
          <Line data={chartData} options={mergedOptions} />
        </div>
      </div>
    );
  }
);

MultiLineChart.displayName = 'MultiLineChart';