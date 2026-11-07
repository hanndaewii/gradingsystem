'use client';

import * as React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { cn } from '@/lib/utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

export interface GradeDistributionData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
    borderRadius?: number;
  }>;
}

export interface GradeDistributionChartProps {
  data: GradeDistributionData;
  options?: Partial<{
    responsive: boolean;
    maintainAspectRatio: boolean;
    plugins: {
      legend: { display: boolean; position: 'top' | 'bottom' | 'left' | 'right' };
      title: { display: boolean; text: string };
      tooltip: { enabled: boolean };
    };
    scales: {
      x: { grid: { display: boolean }; ticks: { color: string } };
      y: { grid: { color: string }; ticks: { color: string; stepSize: number }; beginAtZero: boolean };
    };
  }>;
  className?: string;
  height?: number;
  title?: string;
  subtitle?: string;
}

const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    title: { display: false },
    tooltip: {
      enabled: true,
      backgroundColor: 'var(--color-text-primary)',
      titleColor: 'var(--color-text-inverse)',
      bodyColor: 'var(--color-text-inverse)',
      borderColor: 'var(--color-border-primary)',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
      displayColors: false,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: 'var(--color-text-tertiary)', font: { size: 12 } },
    },
    y: {
      grid: { color: 'var(--color-border-primary)', drawBorder: false },
      ticks: { color: 'var(--color-text-tertiary)', font: { size: 12 }, stepSize: 1 },
      beginAtZero: true,
    },
  },
};

export const GradeDistributionChart = React.forwardRef<HTMLDivElement, GradeDistributionChartProps>(
  (
    {
      data,
      options = {},
      className,
      height = 300,
      title: chartTitle,
      subtitle,
    },
    ref
  ) => {
    const chartData = React.useMemo(() => {
      const colors = [
        'var(--color-brand-primary)',
        'var(--color-brand-primary-hover)',
        'var(--primitive-indigo-400)',
        'var(--primitive-indigo-300)',
        'var(--primitive-indigo-200)',
        'var(--primitive-indigo-100)',
      ];

      return {
        ...data,
        datasets: data.datasets.map((dataset, i) => ({
          ...dataset,
          backgroundColor: dataset.backgroundColor || colors[i % colors.length],
          borderColor: dataset.borderColor || 'transparent',
          borderWidth: dataset.borderWidth ?? 0,
          borderRadius: dataset.borderRadius ?? 8,
        })),
      };
    }, [data]);

    const mergedOptions = React.useMemo(
      () => ({
        ...defaultOptions,
        ...options,
        plugins: { ...defaultOptions.plugins, ...options.plugins },
        scales: { ...defaultOptions.scales, ...options.scales },
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
          <Bar data={chartData} options={mergedOptions} />
        </div>
      </div>
    );
  }
);

GradeDistributionChart.displayName = 'GradeDistributionChart';

export interface HorizontalBarChartProps extends Omit<GradeDistributionChartProps, 'data'> {
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
      borderWidth?: number;
      borderRadius?: number;
    }>;
  };
}

export const HorizontalBarChart = React.forwardRef<HTMLDivElement, HorizontalBarChartProps>(
  ({ data, options = {}, className, height = 300, title: chartTitle, subtitle }, ref) => {
    const chartData = React.useMemo(() => {
      const colors = [
        'var(--color-brand-primary)',
        'var(--color-brand-primary-hover)',
        'var(--primitive-indigo-400)',
        'var(--primitive-indigo-300)',
        'var(--primitive-indigo-200)',
        'var(--primitive-indigo-100)',
      ];

      return {
        ...data,
        datasets: data.datasets.map((dataset, i) => ({
          ...dataset,
          backgroundColor: dataset.backgroundColor || colors[i % colors.length],
          borderColor: dataset.borderColor || 'transparent',
          borderWidth: dataset.borderWidth ?? 0,
          borderRadius: dataset.borderRadius ?? 8,
        })),
      };
    }, [data]);

    const mergedOptions = React.useMemo(
      () => ({
        ...defaultOptions,
        indexAxis: 'y' as const,
        ...options,
        plugins: { ...defaultOptions.plugins, ...options.plugins },
        scales: {
          ...defaultOptions.scales,
          x: { ...defaultOptions.scales.x, ...options.scales?.x },
          y: { ...defaultOptions.scales.y, ...options.scales?.y },
        },
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
          <Bar data={chartData} options={mergedOptions} />
        </div>
      </div>
    );
  }
);

HorizontalBarChart.displayName = 'HorizontalBarChart';