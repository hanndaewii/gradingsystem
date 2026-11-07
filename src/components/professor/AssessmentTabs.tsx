'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { AssessmentColumn } from './GradebookGrid';

interface AssessmentTabsProps {
  assessments: AssessmentColumn[];
  activeType: AssessmentColumn['type'] | 'all';
  onTypeChange: (type: AssessmentColumn['type'] | 'all') => void;
  onAssessmentClick: (assessment: AssessmentColumn) => void;
  onCreateAssessment: () => void;
  className?: string;
}

const ASSESSMENT_TYPES = [
  { id: 'all', label: 'All', icon: null },
  { id: 'exam', label: 'Exams', icon: '📝' },
  { id: 'quiz', label: 'Quizzes', icon: '❓' },
  { id: 'assignment', label: 'Assignments', icon: '📋' },
  { id: 'project', label: 'Projects', icon: '📁' },
  { id: 'participation', label: 'Participation', icon: '👥' },
  { id: 'final', label: 'Finals', icon: '🏆' },
] as const;

export function AssessmentTabs({
  assessments,
  activeType,
  onTypeChange,
  onAssessmentClick,
  onCreateAssessment,
  className,
}: AssessmentTabsProps) {
  const filteredAssessments = activeType === 'all'
    ? assessments
    : assessments.filter(a => a.type === activeType);

  const typeCounts = ASSESSMENT_TYPES.slice(1).map(type => ({
    ...type,
    count: assessments.filter(a => a.type === type.id).length,
  }));

  return (
    <div className={cn('space-y-4', className)}>
      {/* Type Filter Tabs */}
      <Tabs value={activeType} onValueChange={onTypeChange} className="w-full">
        <TabsList className="grid grid-cols-4 md:grid-cols-8 gap-1 bg-semantic-bg-tertiary p-1 rounded-lg">
          {ASSESSMENT_TYPES.map((type) => (
            <TabsTrigger
              key={type.id}
              value={type.id}
              className={cn(
                'flex items-center justify-center gap-1 px-3 py-2 text-body-sm',
                type.id === 'all' && 'font-medium'
              )}
            >
              {type.icon && <span>{type.icon}</span>}
              {type.label}
              {type.id !== 'all' && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                  {typeCounts.find(t => t.id === type.id)?.count || 0}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Assessments List */}
        <TabsContent value="all" className="pt-4">
          <AssessmentsList
            assessments={filteredAssessments}
            onAssessmentClick={onAssessmentClick}
            onCreateAssessment={onCreateAssessment}
          />
        </TabsContent>

        {ASSESSMENT_TYPES.slice(1).map((type) => (
          <TabsContent key={type.id} value={type.id} className="pt-4">
            <AssessmentsList
              assessments={filteredAssessments}
              onAssessmentClick={onAssessmentClick}
              onCreateAssessment={onCreateAssessment}
              emptyMessage={`No ${type.label.toLowerCase()} yet`}
              emptyActionLabel={`Create ${type.label.slice(0, -1)}`}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function AssessmentsList({
  assessments,
  onAssessmentClick,
  onCreateAssessment,
  emptyMessage = 'No assessments yet',
  emptyActionLabel = 'Create Assessment',
}: {
  assessments: AssessmentColumn[];
  onAssessmentClick: (assessment: AssessmentColumn) => void;
  onCreateAssessment: () => void;
  emptyMessage?: string;
  emptyActionLabel?: string;
}) {
  if (assessments.length === 0) {
    return (
      <div className="text-center py-12 rounded-xl border border-dashed border-semantic-border-primary">
        <p className="text-body text-semantic-text-secondary mb-4">{emptyMessage}</p>
        <Button onClick={onCreateAssessment} className="gap-2">
          <Plus className="h-4 w-4" />
          {emptyActionLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {assessments
        .sort((a, b) => a.order - b.order)
        .map((assessment) => (
          <AssessmentCard
            key={assessment.id}
            assessment={assessment}
            onClick={() => onAssessmentClick(assessment)}
          />
        ))}
    </div>
  );
}

function AssessmentCard({ assessment, onClick }: { assessment: AssessmentColumn; onClick: () => void }) {
  const statusConfig = {
    visible: { color: 'text-emerald-600 bg-emerald-50', label: 'Visible', icon: <Eye className="h-3 w-3" /> },
    hidden: { color: 'text-semantic-text-tertiary bg-semantic-bg-tertiary', label: 'Hidden', icon: <EyeOff className="h-3 w-3" /> },
  }[assessment.visible ? 'visible' : 'hidden'];

  const typeColors: Record<AssessmentColumn['type'], string> = {
    exam: 'text-blue-600 bg-blue-50',
    quiz: 'text-purple-600 bg-purple-50',
    assignment: 'text-emerald-600 bg-emerald-50',
    project: 'text-amber-600 bg-amber-50',
    participation: 'text-rose-600 bg-rose-50',
    final: 'text-indigo-600 bg-indigo-50',
  };

  const typeColor = typeColors[assessment.type] || 'text-semantic-text-tertiary bg-semantic-bg-tertiary';

  return (
    <Button
      variant="ghost"
      className="w-full justify-start gap-4 p-4 hover:bg-semantic-bg-secondary transition-colors"
      onClick={onClick}
    >
      <div className={cn('h-12 w-12 rounded-xl flex-center flex-shrink-0', typeColor)}>
        {ASSESSMENT_TYPE_ICONS[assessment.type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-semibold text-body text-semantic-text-primary truncate">
            {assessment.title}
          </h4>
          <Badge variant="outline" className={typeColor}>
            {assessment.type.charAt(0).toUpperCase() + assessment.type.slice(1)}
          </Badge>
          <Badge variant="default" className={statusConfig.color} gap={1}>
            {statusConfig.icon}
            {statusConfig.label}
          </Badge>
        </div>
        <div className="flex items-center gap-4 mt-1 text-body-sm text-semantic-text-tertiary">
          <span><strong>{assessment.maxPoints}</strong> points</span>
          <span><strong>{assessment.weight}%</strong> weight</span>
          {assessment.dueDate && (
            <span>Due <strong>{new Date(assessment.dueDate).toLocaleDateString()}</strong></span>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className="text-heading-md font-bold text-semantic-text-primary">
          #{assessment.order}
        </p>
      </div>
    </Button>
  );
}

const ASSESSMENT_TYPE_ICONS: Record<AssessmentColumn['type'], React.ReactNode> = {
  exam: <span className="text-xl">📝</span>,
  quiz: <span className="text-xl">❓</span>,
  assignment: <span className="text-xl">📋</span>,
  project: <span className="text-xl">📁</span>,
  participation: <span className="text-xl">👥</span>,
  final: <span className="text-xl">🏆</span>,
};

function Eye({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
}

function EyeOff({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
}

function Plus({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}