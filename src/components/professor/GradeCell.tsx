'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/Tooltip';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover';
import { CheckCircle, Clock, AlertTriangle, MessageSquare, Edit, Eye, EyeOff, History, Maximize } from 'lucide-react';
import { GradeCellData, AssessmentColumn } from './GradebookGrid';

interface GradeCellProps {
  gradeData: GradeCellData;
  assessment: AssessmentColumn;
  student: { studentId: string; firstName: string; lastName: string };
  isSelected: boolean;
  onChange: (value: number | null, status?: GradeCellData['status']) => void;
  onSelect: () => void;
  onRubricClick: () => void;
  onHistoryClick: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  readOnly?: boolean;
}

const STATUS_CONFIG: Record<GradeCellData['status'], { variant: 'default' | 'success' | 'warning' | 'error' | 'info'; icon: React.ReactNode; label: string }> = {
  draft: { variant: 'warning', icon: <Clock className="h-3 w-3" />, label: 'Draft' },
  submitted: { variant: 'info', icon: <Save className="h-3 w-3" />, label: 'Submitted' },
  approved: { variant: 'success', icon: <CheckCircle className="h-3 w-3" />, label: 'Approved' },
  missing: { variant: 'error', icon: <AlertTriangle className="h-3 w-3" />, label: 'Missing' },
  late: { variant: 'warning', icon: <Clock className="h-3 w-3" />, label: 'Late' },
  excused: { variant: 'default', icon: <EyeOff className="h-3 w-3" />, label: 'Excused' },
};

function Save({ className }: { className?: string }) {
  return <CheckCircle className={cn('h-3 w-3', className)} />;
}

export function GradeCell({
  gradeData,
  assessment,
  student,
  isSelected,
  onChange,
  onSelect,
  onRubricClick,
  onHistoryClick,
  onKeyDown,
  readOnly = false,
}: GradeCellProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [localValue, setLocalValue] = React.useState<string>('');
  const [showPopover, setShowPopover] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const statusConfig = STATUS_CONFIG[gradeData.status];
  const percentage = gradeData.value !== null && assessment.maxPoints > 0
    ? Math.round((gradeData.value / assessment.maxPoints) * 100)
    : null;

  const getGradeColor = (pct: number | null) => {
    if (pct === null) return 'text-semantic-text-tertiary';
    if (pct >= 90) return 'text-emerald-600';
    if (pct >= 80) return 'text-blue-600';
    if (pct >= 70) return 'text-amber-600';
    if (pct >= 60) return 'text-orange-600';
    return 'text-rose-600';
  };

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  React.useEffect(() => {
    if (gradeData.value !== null) {
      setLocalValue(gradeData.value.toString());
    } else {
      setLocalValue('');
    }
  }, [gradeData.value]);

  const handleBlur = () => {
    if (isEditing) {
      const value = localValue === '' ? null : parseFloat(localValue);
      if (!isNaN(value as number) || value === null) {
        if (value !== null && value > assessment.maxPoints) {
          // Show validation error - in real app would use toast
          setLocalValue(assessment.maxPoints.toString());
          onChange(assessment.maxPoints, 'draft');
        } else {
          onChange(value, 'draft');
        }
      }
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
    } else if (e.key === 'Escape') {
      setLocalValue(gradeData.value?.toString() || '');
      setIsEditing(false);
    } else {
      onKeyDown(e);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    if (!isEditing && !readOnly) {
      setIsEditing(true);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!readOnly) {
      setIsEditing(true);
    }
  };

  // Render display value
  const displayValue = gradeData.value !== null
    ? `${gradeData.value}/${assessment.maxPoints}`
    : gradeData.status === 'missing'
      ? '—'
      : gradeData.status === 'excused'
        ? 'EXC'
        : '—';

  const displayPercentage = percentage !== null ? `(${percentage}%)` : '';

  return (
    <Popover open={showPopover} onOpenChange={setShowPopover}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            'relative min-h-[44px] transition-all duration-150',
            'hover:shadow-[inset_0_0_0_2px_var(--color-brand-primary)]',
            'hover:z-10',
            isSelected && 'ring-2 ring-semantic-brand-primary ring-offset-2 ring-offset-semantic-card-bg',
            gradeData.status === 'missing' && 'bg-semantic-status-error/5',
            gradeData.status === 'late' && 'bg-semantic-status-warning/5',
            gradeData.status === 'excused' && 'bg-semantic-bg-tertiary/50',
            readOnly && 'opacity-75 cursor-not-allowed'
          )}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="gridcell"
          aria-selected={isSelected}
          aria-label={`${assessment.title}: ${displayValue}`}
        >
          {/* Edit Mode */}
          {isEditing && !readOnly && (
            <div className="absolute inset-0 z-10 flex items-center px-1">
              <Input
                ref={inputRef}
                type="number"
                min={0}
                max={assessment.maxPoints}
                step={0.5}
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="w-full h-full text-center text-body font-mono bg-semantic-bg-primary border-semantic-brand-primary focus:ring-0"
                placeholder="—"
                aria-label={`Enter grade for ${assessment.title}`}
              />
            </div>
          )}

          {/* Display Mode */}
          {!isEditing && (
            <div className={cn('flex flex-col items-center justify-center h-full p-1', getGradeColor(percentage))}>
              <div className="text-body font-mono font-medium">
                {displayValue}
              </div>
              {percentage !== null && (
                <div className="text-caption font-normal opacity-70">
                  {displayPercentage}
                </div>
              )}
            </div>
          )}

          {/* Status Badge */}
          {gradeData.status !== 'draft' && gradeData.status !== 'approved' && (
            <div className="absolute bottom-0 right-0 m-1">
              <Badge variant={statusConfig.variant} className="gap-0.5 px-1.5 py-0.5 text-[10px]">
                {statusConfig.icon}
              </Badge>
            </div>
          )}

          {/* Comment Indicator */}
          {gradeData.comment && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="absolute top-0 right-0 m-1">
                  <MessageSquare className="h-3 w-3 text-semantic-brand-primary" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" align="start" className="max-w-xs">
                <p className="text-body-sm text-semantic-text-primary">{gradeData.comment}</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Rubric Indicator */}
          {gradeData.rubricScores && Object.keys(gradeData.rubricScores).length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="absolute bottom-0 left-0 m-1">
                  <Edit className="h-3 w-3 text-semantic-text-tertiary hover:text-semantic-brand-primary transition-colors" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start">
                <p className="text-body-sm text-semantic-text-primary">Rubric graded</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </PopoverTrigger>

      <PopoverContent side="bottom" align="start" className="w-72 p-0">
        <div className="p-3 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-caption text-semantic-text-tertiary">{assessment.type.toUpperCase()}</p>
              <p className="font-semibold text-body-sm text-semantic-text-primary">{assessment.title}</p>
            </div>
            <Badge variant={statusConfig.variant} className="gap-1">
              {statusConfig.icon}
              {statusConfig.label}
            </Badge>
          </div>

          {/* Quick Grade Buttons */}
          <div className="grid grid-cols-4 gap-1 pt-2 border-t border-semantic-border-primary">
            {[0.25, 0.5, 0.75, 1].map((ratio) => (
              <Button
                key={ratio}
                variant="ghost"
                size="sm"
                className="h-8 py-0 text-caption"
                onClick={() => {
                  const value = Math.round(assessment.maxPoints * ratio * 10) / 10;
                  onChange(value, 'draft');
                  setShowPopover(false);
                }}
                disabled={readOnly}
              >
                {Math.round(ratio * 100)}%
              </Button>
            ))}
          </div>

          {/* Custom Value */}
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={assessment.maxPoints}
              step={0.5}
              placeholder="Custom score"
              className="flex-1"
              size="sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const value = parseFloat((e.target as HTMLInputElement).value);
                  if (!isNaN(value)) {
                    onChange(value, 'draft');
                    setShowPopover(false);
                  }
                }
              }}
            />
            <Button size="sm" onClick={() => { onChange(null, 'missing'); setShowPopover(false); }} disabled={readOnly}>
              Clear
            </Button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 pt-2 border-t border-semantic-border-primary">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 gap-1 justify-start"
              onClick={() => { onRubricClick(); setShowPopover(false); }}
              disabled={readOnly || !assessment.rubricId}
            >
              <Edit className="h-3 w-3" />
              Rubric
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 gap-1 justify-start"
              onClick={() => { onHistoryClick(); setShowPopover(false); }}
            >
              <History className="h-3 w-3" />
              History
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 gap-1 justify-start"
              onClick={() => { setShowPopover(false); }}
            >
              <Maximize className="h-3 w-3" />
              Expand
            </Button>
          </div>

          {/* Metadata */}
          <div className="pt-2 border-t border-semantic-border-primary space-y-1 text-caption text-semantic-text-tertiary">
            <div className="flex justify-between">
              <span>Max Points</span>
              <span className="font-medium text-semantic-text-primary">{assessment.maxPoints}</span>
            </div>
            <div className="flex justify-between">
              <span>Weight</span>
              <span className="font-medium text-semantic-text-primary">{assessment.weight}%</span>
            </div>
            {assessment.dueDate && (
              <div className="flex justify-between">
                <span>Due</span>
                <span className="font-medium text-semantic-text-primary">
                  {new Date(assessment.dueDate).toLocaleDateString()}
                </span>
              </div>
            )}
            {gradeData.history.length > 0 && (
              <div className="flex justify-between">
                <span>Last Change</span>
                <span className="font-medium text-semantic-text-primary">
                  {new Date(gradeData.history[0].timestamp).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}