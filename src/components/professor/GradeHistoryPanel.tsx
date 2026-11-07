'use client';

import * as React from 'react';
import { X, History, User, Clock, ArrowUp, ArrowDown, Minus, Plus, Edit, Eye, MessageSquare, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { formatDateTime, formatRelativeTime } from '@/lib/utils';
import { GradeHistoryEntry } from './GradebookGrid';

interface GradeHistoryPanelProps {
  studentId: string;
  assessmentId: string;
  history: GradeHistoryEntry[];
  onClose: () => void;
  onRevert?: (entryId: string) => void;
  studentName?: string;
  assessmentTitle?: string;
}

const ACTION_CONFIG: Record<GradeHistoryEntry['action'], { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  created: { icon: <Plus className="h-3 w-3" />, label: 'Created', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  updated: { icon: <Edit className="h-3 w-3" />, label: 'Updated', color: 'text-blue-600', bg: 'bg-blue-50' },
  submitted: { icon: <RotateCcw className="h-3 w-3" />, label: 'Submitted', color: 'text-purple-600', bg: 'bg-purple-50' },
  approved: { icon: <CheckCircle className="h-3 w-3" />, label: 'Approved', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  reverted: { icon: <RotateCcw className="h-3 w-3" />, label: 'Reverted', color: 'text-amber-600', bg: 'bg-amber-50' },
};

export function GradeHistoryPanel({
  studentId,
  assessmentId,
  history,
  onClose,
  onRevert,
  studentName = 'Student',
  assessmentTitle = 'Assessment',
}: GradeHistoryPanelProps) {
  const [filter, setFilter] = React.useState<'all' | 'grade' | 'status' | 'comment'>('all');

  const filteredHistory = history.filter((entry) => {
    if (filter === 'all') return true;
    if (filter === 'grade') return entry.oldValue !== entry.newValue;
    if (filter === 'status') return entry.action === 'submitted' || entry.action === 'approved';
    if (filter === 'comment') return entry.action === 'updated'; // Simplified
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-labelledby="history-title">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="flex-1 max-w-xl bg-semantic-card-bg animate-slide-in-from-right shadow-2xl flex flex-col h-full">
        {/* Header */}
        <CardHeader className="p-4 border-b border-semantic-border-primary sticky top-0 z-10 bg-semantic-card-bg">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 id="history-title" className="text-heading-md font-semibold text-semantic-text-primary">
                Grade History
              </h2>
              <div className="flex items-center gap-2 mt-1 text-body-sm text-semantic-text-secondary">
                <span className="font-medium">{studentName}</span>
                <span>•</span>
                <span>{assessmentTitle}</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10" aria-label="Close history">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Filter */}
          <div className="mt-3 flex items-center gap-2">
            <History className="h-4 w-4 text-semantic-text-tertiary" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="flex-1 px-3 py-2 text-body-sm bg-semantic-input-bg border border-semantic-input-border rounded-lg focus:border-semantic-input-focus focus:ring-2 focus:ring-semantic-brand-primary/20"
            >
              <option value="all">All Changes</option>
              <option value="grade">Grade Changes</option>
              <option value="status">Status Changes</option>
              <option value="comment">Comments</option>
            </select>
          </div>
        </CardHeader>

        {/* History List */}
        <ScrollArea className="flex-1 p-4">
          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <History className="h-12 w-12 text-semantic-text-tertiary mb-4" />
              <h3 className="text-heading-sm font-semibold text-semantic-text-primary mb-1">No history available</h3>
              <p className="text-body-sm text-semantic-text-secondary">
                {filter === 'all' ? 'No changes have been made to this grade yet.' : 'No changes match the selected filter.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((entry, index) => (
                <HistoryEntryCard
                  key={entry.id}
                  entry={entry}
                  index={index}
                  isFirst={index === 0}
                  isLast={index === filteredHistory.length - 1}
                  onRevert={onRevert}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <CardFooter className="p-4 border-t border-semantic-border-primary sticky bottom-0 z-10 bg-semantic-card-bg">
          <div className="flex items-center justify-between text-body-sm text-semantic-text-secondary">
            <span>{history.length} total change{history.length !== 1 ? 's' : ''}</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        </CardFooter>
      </div>
    </div>
  );
}

interface HistoryEntryCardProps {
  entry: GradeHistoryEntry;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onRevert?: (entryId: string) => void;
}

function HistoryEntryCard({ entry, index, isFirst, isLast, onRevert }: HistoryEntryCardProps) {
  const actionConfig = ACTION_CONFIG[entry.action];

  return (
    <Card className={cn('relative overflow-hidden', !isLast && 'border-b border-semantic-border-primary/50')}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Timeline */}
          <div className="flex flex-col items-center flex-shrink-0">
            <div className={cn(
              'h-8 w-8 rounded-full flex-center border-2',
              actionConfig.bg,
              actionConfig.color.replace('text-', 'border-')
            )}>
              {actionConfig.icon}
            </div>
            {!isLast && (
              <div className="w-0.5 h-full bg-semantic-border-primary mt-1 flex-1" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Badge variant="default" className={cn('gap-1', actionConfig.bg, actionConfig.color)}>
                  {actionConfig.icon}
                  {actionConfig.label}
                </Badge>
                {entry.action === 'reverted' && (
                  <Badge variant="outline" className="text-caption">
                    Reverted
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-caption text-semantic-text-tertiary">
                <Clock className="h-3 w-3" />
                <time dateTime={entry.timestamp}>
                  {formatDateTime(entry.timestamp)}
                </time>
                <span>•</span>
                <span>{formatRelativeTime(entry.timestamp)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-body-sm">
              <User className="h-4 w-4 text-semantic-text-tertiary" />
              <span className="font-medium text-semantic-text-primary">{entry.user}</span>
            </div>

            {/* Value Changes */}
            {(entry.oldValue !== null || entry.newValue !== null) && (
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                {entry.oldValue !== null && (
                  <div className={cn('flex items-center gap-1 px-3 py-1.5 rounded-lg', 'bg-rose-50 border border-rose-200')}>
                    <ArrowDown className="h-3 w-3 text-rose-600" />
                    <span className="text-body-sm font-mono font-medium text-rose-700">
                      {entry.oldValue}
                    </span>
                    <span className="text-caption text-rose-600">Previous</span>
                  </div>
                )}
                {entry.oldValue !== null && entry.newValue !== null && (
                  <div className="text-semantic-text-tertiary">→</div>
                )}
                {entry.newValue !== null && (
                  <div className={cn('flex items-center gap-1 px-3 py-1.5 rounded-lg', 'bg-emerald-50 border border-emerald-200')}>
                    <ArrowUp className="h-3 w-3 text-emerald-600" />
                    <span className="text-body-sm font-mono font-medium text-emerald-700">
                      {entry.newValue}
                    </span>
                    <span className="text-caption text-emerald-600">New</span>
                  </div>
                )}
                {entry.oldValue === null && entry.newValue !== null && (
                  <div className={cn('flex items-center gap-1 px-3 py-1.5 rounded-lg', 'bg-emerald-50 border border-emerald-200')}>
                    <Plus className="h-3 w-3 text-emerald-600" />
                    <span className="text-body-sm font-mono font-medium text-emerald-700">
                      {entry.newValue}
                    </span>
                    <span className="text-caption text-emerald-600">Added</span>
                  </div>
                )}
                {entry.oldValue !== null && entry.newValue === null && (
                  <div className={cn('flex items-center gap-1 px-3 py-1.5 rounded-lg', 'bg-rose-50 border border-rose-200')}>
                    <Minus className="h-3 w-3 text-rose-600" />
                    <span className="text-body-sm font-mono font-medium text-rose-700">
                      Cleared
                    </span>
                    <span className="text-caption text-rose-600">Removed</span>
                  </div>
                )}
              </div>
            )}

            {/* Revert Action */}
            {onRevert && entry.action !== 'created' && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 gap-1 text-semantic-status-warning hover:text-semantic-status-error"
                onClick={() => onRevert(entry.id)}
              >
                <RotateCcw className="h-3 w-3" />
                Revert to this version
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}