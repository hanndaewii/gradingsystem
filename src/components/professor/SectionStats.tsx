'use client';

import * as React from 'react';
import { Users, Award, Clock, TrendingUp, Target, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { GradeDistributionChart } from '@/components/ui/GradeDistributionChart';

interface SectionStatsProps {
  enrollment: number;
  capacity: number;
  avgGrade: number | null;
  medianGrade: number | null;
  gradeDistribution: { label: string; count: number }[];
  completionRate: number;
  submissionsPending: number;
  submissionsTotal: number;
  className?: string;
}

export function SectionStats({
  enrollment,
  capacity,
  avgGrade,
  medianGrade,
  gradeDistribution,
  completionRate,
  submissionsPending,
  submissionsTotal,
  className,
}: SectionStatsProps) {
  const enrollmentPercent = capacity > 0 ? Math.round((enrollment / capacity) * 100) : 0;
  const submissionPercent = submissionsTotal > 0 ? Math.round(((submissionsTotal - submissionsPending) / submissionsTotal) * 100) : 0;

  const distributionData = {
    labels: gradeDistribution.map(d => d.label),
    datasets: [{
      label: 'Students',
      data: gradeDistribution.map(d => d.count),
      backgroundColor: [
        'var(--color-status-success)',
        'var(--color-brand-primary)',
        'var(--color-status-info)',
        'var(--color-status-warning)',
        'var(--color-status-error)',
      ],
      borderRadius: 8,
    }],
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-caption text-semantic-text-tertiary mb-1">Enrollment</p>
                <p className="text-3xl font-bold text-semantic-text-primary">{enrollment}/{capacity}</p>
                <p className="text-body-sm text-semantic-text-secondary mt-1">{enrollmentPercent}% capacity</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-semantic-brand-primary/10 flex-center">
                <Users className="h-6 w-6 text-semantic-brand-primary" />
              </div>
            </div>
            <Progress value={enrollmentPercent} className="mt-4 h-1.5" showLabel={false} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-caption text-semantic-text-tertiary mb-1">Average Grade</p>
                <p className="text-3xl font-bold text-semantic-text-primary">
                  {avgGrade !== null ? `${avgGrade.toFixed(1)}%` : '—'}
                </p>
                {medianGrade !== null && (
                  <p className="text-body-sm text-semantic-text-secondary mt-1">Median: {medianGrade.toFixed(1)}%</p>
                )}
              </div>
              <div className="h-12 w-12 rounded-xl bg-semantic-status-success/10 flex-center">
                <Award className="h-6 w-6 text-semantic-status-success" />
              </div>
            </div>
            <div className="mt-4 h-1.5 bg-semantic-bg-tertiary rounded-full overflow-hidden">
              <div
                className="h-full bg-semantic-status-success rounded-full transition-all duration-500"
                style={{ width: `${Math.min(avgGrade || 0, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-caption text-semantic-text-tertiary mb-1">Completion Rate</p>
                <p className="text-3xl font-bold text-semantic-text-primary">{completionRate}%</p>
                <p className="text-body-sm text-semantic-text-secondary mt-1">Assignments submitted</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-semantic-status-info/10 flex-center">
                <CheckCircle className="h-6 w-6 text-semantic-status-info" />
              </div>
            </div>
            <Progress value={completionRate} className="mt-4 h-1.5" showLabel={false} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-caption text-semantic-text-tertiary mb-1">Pending Grades</p>
                <p className="text-3xl font-bold text-semantic-text-primary">{submissionsPending}</p>
                <p className="text-body-sm text-semantic-text-secondary mt-1">
                  {submissionPercent}% graded ({submissionsTotal - submissionsPending}/{submissionsTotal})
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-semantic-status-warning/10 flex-center">
                <Clock className="h-6 w-6 text-semantic-status-warning" />
              </div>
            </div>
            <Progress value={submissionPercent} className="mt-4 h-1.5" showLabel={false} />
          </CardContent>
        </Card>
      </div>

      {/* Grade Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-heading-md">Grade Distribution</CardTitle>
          <CardDescription>Distribution of final grades across the section</CardDescription>
        </CardHeader>
        <CardContent>
          <GradeDistributionChart
            data={distributionData}
            height={280}
            options={{
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (context: { parsed: { y: number }; dataset: { data: number[] } }) => {
                      const total = context.dataset.data.reduce((a, b) => a + b, 0);
                      const percent = total > 0 ? ((context.parsed.y / total) * 100).toFixed(1) : '0';
                      return `${context.parsed.y} students (${percent}%)`;
                    },
                  },
                },
              },
            }}
          />
        </CardContent>
      </Card>

      {/* Quick Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-heading-md">Quick Insights</CardTitle>
          <CardDescription>Key metrics at a glance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InsightCard
              icon={<Target className="h-5 w-5" />}
              label="Top Performer"
              value="98.5%"
              description="Highest grade in section"
              color="text-emerald-600 bg-emerald-50"
            />
            <InsightCard
              icon={<TrendingUp className="h-5 w-5" />}
              label="Improvement"
              value="+4.2%"
              description="Avg vs last assessment"
              color="text-blue-600 bg-blue-50"
            />
            <InsightCard
              icon={<Clock className="h-5 w-5" />}
              label="At Risk"
              value="3 students"
              description="Below 60% average"
              color="text-rose-600 bg-rose-50"
            />
            <InsightCard
              icon={<Award className="h-5 w-5" />}
              label="Honor Roll"
              value="12 students"
              description="90%+ average"
              color="text-amber-600 bg-amber-50"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface InsightCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
  color: string;
}

function InsightCard({ icon, label, value, description, color }: InsightCardProps) {
  return (
    <div className="p-4 rounded-xl bg-semantic-bg-secondary border border-semantic-border-primary">
      <div className="flex items-center gap-3 mb-2">
        <div className={cn('h-10 w-10 rounded-lg flex-center', color)}>
          {icon}
        </div>
      </div>
      <p className="text-caption text-semantic-text-tertiary">{label}</p>
      <p className="text-heading-md font-bold text-semantic-text-primary mt-1">{value}</p>
      <p className="text-caption text-semantic-text-tertiary mt-1">{description}</p>
    </div>
  );
}