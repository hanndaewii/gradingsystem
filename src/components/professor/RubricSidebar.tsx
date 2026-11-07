'use client';

import * as React from 'react';
import { X, ChevronDown, ChevronUp, CheckCircle, Circle, HelpCircle, Copy, Save, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { ScrollArea } from '@/components/ui/ScrollArea';

export interface RubricCriterion {
  id: string;
  title: string;
  description: string;
  points: number;
  levels: RubricLevel[];
}

export interface RubricLevel {
  id: string;
  title: string;
  description: string;
  points: number;
}

export interface RubricData {
  id: string;
  name: string;
  description: string;
  criteria: RubricCriterion[];
  totalPoints: number;
}

interface RubricSidebarProps {
  studentId: string;
  assessmentId: string;
  rubric?: RubricData;
  currentScores?: Record<string, number>;
  currentComments?: Record<string, string>;
  onClose: () => void;
  onGradeSubmit: (criteriaScores: Record<string, number>, comments: Record<string, string>) => void;
  onSaveDraft?: (criteriaScores: Record<string, number>, comments: Record<string, string>) => void;
}

const mockRubric: RubricData = {
  id: 'rubric-1',
  name: 'Project Evaluation Rubric',
  description: 'Standard rubric for evaluating programming projects',
  totalPoints: 100,
  criteria: [
    {
      id: 'c1',
      title: 'Functionality',
      description: 'Code compiles and runs without errors; all requirements met',
      points: 40,
      levels: [
        { id: 'l1', title: 'Exemplary', description: 'All features work perfectly; handles edge cases', points: 40 },
        { id: 'l2', title: 'Proficient', description: 'Core features work; minor bugs in edge cases', points: 32 },
        { id: 'l3', title: 'Developing', description: 'Some features incomplete or have significant bugs', points: 24 },
        { id: 'l4', title: 'Beginning', description: 'Major functionality missing or code does not run', points: 16 },
      ],
    },
    {
      id: 'c2',
      title: 'Code Quality',
      description: 'Clean, readable, well-organized code with proper naming conventions',
      points: 25,
      levels: [
        { id: 'l1', title: 'Exemplary', description: 'Exceptional organization; follows all best practices', points: 25 },
        { id: 'l2', title: 'Proficient', description: 'Well organized; minor style inconsistencies', points: 20 },
        { id: 'l3', title: 'Developing', description: 'Somewhat disorganized; several style issues', points: 15 },
        { id: 'l4', title: 'Beginning', description: 'Poor organization; difficult to read and understand', points: 10 },
      ],
    },
    {
      id: 'c3',
      title: 'Documentation',
      description: 'Clear comments, README, and API documentation',
      points: 20,
      levels: [
        { id: 'l1', title: 'Exemplary', description: 'Comprehensive documentation; clear examples', points: 20 },
        { id: 'l2', title: 'Proficient', description: 'Good documentation; minor gaps', points: 16 },
        { id: 'l3', title: 'Developing', description: 'Basic documentation; missing key details', points: 12 },
        { id: 'l4', title: 'Beginning', description: 'Minimal or no documentation', points: 8 },
      ],
    },
    {
      id: 'c4',
      title: 'Testing',
      description: 'Unit tests, integration tests, and test coverage',
      points: 15,
      levels: [
        { id: 'l1', title: 'Exemplary', description: 'Comprehensive test suite; >90% coverage', points: 15 },
        { id: 'l2', title: 'Proficient', description: 'Good test coverage; >70% coverage', points: 12 },
        { id: 'l3', title: 'Developing', description: 'Some tests; limited coverage', points: 9 },
        { id: 'l4', title: 'Beginning', description: 'Few or no tests', points: 6 },
      ],
    },
  ],
};

export function RubricSidebar({
  studentId,
  assessmentId,
  rubric = mockRubric,
  currentScores = {},
  currentComments = {},
  onClose,
  onGradeSubmit,
  onSaveDraft,
}: RubricSidebarProps) {
  const [expandedCriteria, setExpandedCriteria] = React.useState<Record<string, boolean>>(
    rubric.criteria.reduce((acc, c) => ({ ...acc, [c.id]: true }), {})
  );
  const [scores, setScores] = React.useState<Record<string, number>>(currentScores);
  const [comments, setComments] = React.useState<Record<string, string>>(currentComments);
  const [showTotal, setShowTotal] = React.useState(true);

  const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
  const maxPossible = rubric.totalPoints;
  const percentage = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0;

  const handleLevelSelect = (criterionId: string, levelPoints: number) => {
    setScores(prev => ({ ...prev, [criterionId]: levelPoints }));
  };

  const handleCommentChange = (criterionId: string, comment: string) => {
    setComments(prev => ({ ...prev, [criterionId]: comment }));
  };

  const handleCopyPrevious = () => {
    // In real app, would fetch previous student's scores
    console.log('Copy from previous student');
  };

  const handleSubmit = () => {
    onGradeSubmit(scores, comments);
    onClose();
  };

  const handleSaveDraft = () => {
    onSaveDraft?.(scores, comments);
  };

  const toggleCriterion = (criterionId: string) => {
    setExpandedCriteria(prev => ({ ...prev, [criterionId]: !prev[criterionId] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-labelledby="rubric-title">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Panel */}
      <div className="flex-1 max-w-2xl bg-semantic-card-bg animate-slide-in-from-right shadow-2xl flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-semantic-border-primary sticky top-0 z-10 bg-semantic-card-bg">
          <div>
            <h2 id="rubric-title" className="text-heading-md font-semibold text-semantic-text-primary">
              {rubric.name}
            </h2>
            <p className="text-body-sm text-semantic-text-secondary">{rubric.description}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10" aria-label="Close rubric">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="p-4 border-b border-semantic-border-primary bg-semantic-bg-secondary">
          <div className="flex items-center justify-between mb-2">
            <span className="text-body-sm font-medium text-semantic-text-primary">Total Score</span>
            <span className="text-heading-md font-bold text-semantic-text-primary">
              {totalScore} / {maxPossible} pts
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 bg-semantic-bg-tertiary rounded-full overflow-hidden">
              <div
                className="h-full bg-semantic-brand-primary rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-body-sm font-semibold text-semantic-brand-primary w-16 text-right">
              {percentage}%
            </span>
          </div>
        </div>

        {/* Rubric Content */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {rubric.criteria.map((criterion) => (
              <CriterionCard
                key={criterion.id}
                criterion={criterion}
                expanded={expandedCriteria[criterion.id]}
                currentScore={scores[criterion.id]}
                currentComment={comments[criterion.id]}
                onToggle={() => toggleCriterion(criterion.id)}
                onLevelSelect={(points) => handleLevelSelect(criterion.id, points)}
                onCommentChange={(comment) => handleCommentChange(criterion.id, comment)}
              />
            ))}
          </div>
        </ScrollArea>

        {/* Footer */}
        <CardFooter className="p-4 border-t border-semantic-border-primary sticky bottom-0 z-10 bg-semantic-card-bg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleCopyPrevious} className="gap-1">
                <Copy className="h-4 w-4" />
                Copy from Previous
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSaveDraft} className="gap-1" disabled={totalScore === 0}>
                <Save className="h-4 w-4" />
                Save Draft
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-semantic-text-secondary">
                <span className="font-semibold">{totalScore}</span> / {maxPossible} pts
              </div>
              <Button size="lg" onClick={handleSubmit} disabled={totalScore === 0} className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Submit Grade
              </Button>
            </div>
          </div>
        </CardFooter>
      </div>
    </div>
  );
}

interface CriterionCardProps {
  criterion: RubricCriterion;
  expanded: boolean;
  currentScore?: number;
  currentComment?: string;
  onToggle: () => void;
  onLevelSelect: (points: number) => void;
  onCommentChange: (comment: string) => void;
}

function CriterionCard({ criterion, expanded, currentScore, currentComment, onToggle, onLevelSelect, onCommentChange }: CriterionCardProps) {
  const selectedLevel = criterion.levels.find(l => l.points === currentScore);

  return (
    <Card className={cn('overflow-hidden', currentScore !== undefined && 'ring-2 ring-semantic-status-success/50')}>
      <CardHeader
        className="p-3 cursor-pointer hover:bg-semantic-bg-secondary/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 p-0"
              onClick={(e) => { e.stopPropagation(); onToggle(); }}
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-body text-semantic-text-primary truncate">
                  {criterion.title}
                </h4>
                <Badge variant="outline" className="text-caption font-medium">
                  {criterion.points} pts
                </Badge>
              </div>
              <p className="text-body-sm text-semantic-text-secondary truncate">
                {criterion.description}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {currentScore !== undefined && (
                <div className="text-right">
                  <div className="text-heading-md font-bold text-semantic-status-success">
                    {currentScore}
                  </div>
                  <div className="text-caption text-semantic-text-tertiary">
                    / {criterion.points}
                  </div>
                </div>
              )}
              {selectedLevel && (
                <Badge variant="success" className="text-caption whitespace-nowrap">
                  {selectedLevel.title}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pb-3">
          {/* Level Selector */}
          <div className="space-y-2 mb-3">
            {criterion.levels.map((level) => (
              <LevelOption
                key={level.id}
                level={level}
                isSelected={currentScore === level.points}
                onSelect={() => onLevelSelect(level.points)}
              />
            ))}
          </div>

          {/* Comment */}
          <div className="pt-3 border-t border-semantic-border-primary">
            <label className="block text-caption font-medium text-semantic-text-secondary mb-1">
              Feedback for this criterion
            </label>
            <Textarea
              value={currentComment || ''}
              onChange={(e) => onCommentChange(e.target.value)}
              placeholder="Add specific feedback..."
              rows={2}
              className="text-body-sm"
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}

interface LevelOptionProps {
  level: RubricLevel;
  isSelected: boolean;
  onSelect: () => void;
}

function LevelOption({ level, isSelected, onSelect }: LevelOptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full p-3 rounded-lg border-2 transition-all duration-150 text-left',
        isSelected
          ? 'border-semantic-brand-primary bg-semantic-brand-primary/5'
          : 'border-semantic-border-primary hover:border-semantic-brand-primary/50 hover:bg-semantic-bg-secondary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-semantic-brand-primary'
      )}
      aria-pressed={isSelected}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              'h-5 w-5 rounded-full flex-center flex-shrink-0 border-2',
              isSelected
                ? 'bg-semantic-brand-primary border-semantic-brand-primary text-semantic-text-inverse'
                : 'border-semantic-border-primary text-semantic-text-tertiary'
            )}>
              {isSelected && <CheckCircle className="h-3 w-3" />}
            </span>
            <span className="font-medium text-body-sm text-semantic-text-primary">
              {level.title}
            </span>
            <Badge variant="outline" className="text-caption font-medium">
              {level.points} pts
            </Badge>
          </div>
          <p className="text-body-sm text-semantic-text-secondary pl-7">
            {level.description}
          </p>
        </div>
        {isSelected && (
          <CheckCircle className="h-5 w-5 text-semantic-brand-primary flex-shrink-0" />
        )}
      </div>
    </button>
  );
}