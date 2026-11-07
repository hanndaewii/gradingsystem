'use client';

import * as React from 'react';
import Link from 'next/link';
import { Users, Clock, AlertTriangle, TrendingUp, ArrowRight, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/DropdownMenu';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';

export interface ClassCardData {
  id: string;
  courseCode: string;
  courseName: string;
  section: string;
  term: string;
  studentCount: number;
  avgGrade: number | null;
  pendingGrades: number;
  upcomingDeadlines: number;
  color: string;
}

interface ClassCardProps {
  classData: ClassCardData;
  onClick?: () => void;
  className?: string;
}

const gradeColors = {
  A: 'text-emerald-600 bg-emerald-50',
  B: 'text-blue-600 bg-blue-50',
  C: 'text-amber-600 bg-amber-50',
  D: 'text-orange-600 bg-orange-50',
  F: 'text-rose-600 bg-rose-50',
} as const;

function getLetterGrade(avgGrade: number | null): string {
  if (avgGrade === null) return 'N/A';
  if (avgGrade >= 90) return 'A';
  if (avgGrade >= 80) return 'B';
  if (avgGrade >= 70) return 'C';
  if (avgGrade >= 60) return 'D';
  return 'F';
}

export function ClassCard({ classData, onClick, className }: ClassCardProps) {
  const letterGrade = getLetterGrade(classData.avgGrade);
  const gradeColor = gradeColors[letterGrade as keyof typeof gradeColors] || gradeColors.B;
  const hasPendingGrades = classData.pendingGrades > 0;
  const hasUpcomingDeadlines = classData.upcomingDeadlines > 0;

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-300 hover:shadow-lg',
        'hover:border-semantic-brand-primary/30',
        className
      )}
      onClick={onClick}
    >
      {/* Color accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r"
        style={{ background: `linear-gradient(90deg, var(--color-${classData.color.replace('from-', '').replace('to-', '')})` }}
        aria-hidden="true"
      />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={cn(
                'px-2 py-0.5 text-caption font-medium rounded-full',
                gradeColor
              )}>
                {classData.courseCode}
              </span>
              <Badge variant="outline" className="text-caption">
                Section {classData.section}
              </Badge>
            </div>
            <CardTitle className="text-heading-sm font-semibold text-semantic-text-primary truncate">
              {classData.courseName}
            </CardTitle>
            <p className="text-caption text-semantic-text-tertiary mt-1">{classData.term}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Class options">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="flex items-center gap-2" onClick={onClick}>
                <ArrowRight className="h-4 w-4" />
                Enter Grades
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                View Roster
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Assignments
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex items-center gap-2 text-semantic-status-error">
                <AlertTriangle className="h-4 w-4" />
                Archive Section
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pb-3">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-semantic-bg-secondary">
            <div className="text-2xl font-bold text-semantic-text-primary">{classData.studentCount}</div>
            <div className="text-caption text-semantic-text-tertiary">Students</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-semantic-bg-secondary">
            <div className={cn('text-2xl font-bold', gradeColor.replace('bg-', 'text-'))}>
              {classData.avgGrade !== null ? `${classData.avgGrade.toFixed(1)}%` : '—'}
            </div>
            <div className="text-caption text-semantic-text-tertiary">Avg Grade</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-semantic-bg-secondary">
            <div className="text-2xl font-bold text-semantic-text-primary">{classData.pendingGrades}</div>
            <div className="text-caption text-semantic-text-tertiary">Pending</div>
          </div>
        </div>

        {/* Grade Distribution Mini */}
        {classData.avgGrade !== null && (
          <div className="pt-2">
            <div className="flex items-center justify-between text-caption mb-1">
              <span className="text-semantic-text-tertiary">Grade Distribution</span>
              <span className={cn('font-medium', gradeColor.replace('bg-', 'text-'))}>{letterGrade}</span>
            </div>
            <div className="h-2 bg-semantic-bg-tertiary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(classData.avgGrade, 100)}%`,
                  background: `linear-gradient(90deg, var(--color-${classData.color.replace('from-', '').replace('to-', '')})`,
                }}
              />
            </div>
          </div>
        )}

        {/* Alerts */}
        {(hasPendingGrades || hasUpcomingDeadlines) && (
          <div className="flex items-center gap-2 pt-2 border-t border-semantic-border-primary">
            {hasPendingGrades && (
              <Badge variant="warning" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {classData.pendingGrades} pending
              </Badge>
            )}
            {hasUpcomingDeadlines && (
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                {classData.upcomingDeadlines} due soon
              </Badge>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3">
        <Link
          href={`/professor/sections/${classData.id}/gradebook`}
          onClick={(e) => { e.preventDefault(); onClick?.(); }}
          className="w-full"
        >
          <Button
            className="w-full justify-center gap-2 group-hover:gap-3 transition-gap"
            variant="primary"
            size="sm"
          >
            Enter Grades
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}