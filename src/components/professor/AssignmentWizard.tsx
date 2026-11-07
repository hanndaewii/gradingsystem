'use client';

import * as React from 'react';
import { ArrowLeft, ArrowRight, CheckCircle, X, Plus, Trash2, GripVertical, FileText, Settings, Eye, EyeOff, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Label } from '@/components/ui/Label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';
import { DatePicker } from '@/components/ui/DatePicker';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Toast, useToast } from '@/components/ui/Toast';

export interface AssessmentData {
  id?: string;
  title: string;
  description: string;
  type: 'exam' | 'quiz' | 'assignment' | 'project' | 'participation' | 'final';
  maxPoints: number;
  weight: number;
  dueDate?: string;
  availableDate?: string;
  latePenalty?: number;
  allowLateSubmission: boolean;
  rubricId?: string;
  visible: boolean;
  releaseGrades: boolean;
  instructions?: string;
  attachments?: string[];
}

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

interface AssignmentWizardProps {
  initialData?: Partial<AssessmentData>;
  onComplete: (data: AssessmentData) => void;
  onCancel: () => void;
  existingRubrics?: Array<{ id: string; name: string }>;
}

const ASSESSMENT_TYPES = [
  { value: 'exam', label: 'Exam', icon: '📝', description: 'Formal examination' },
  { value: 'quiz', label: 'Quiz', icon: '❓', description: 'Short assessment' },
  { value: 'assignment', label: 'Assignment', icon: '📋', description: 'Homework or coursework' },
  { value: 'project', label: 'Project', icon: '📁', description: 'Long-term project' },
  { value: 'participation', label: 'Participation', icon: '👥', description: 'Class participation' },
  { value: 'final', label: 'Final Exam', icon: '🏆', description: 'Final examination' },
] as const;

const STEPS = [
  { id: 'basic', title: 'Basic Info', description: 'Title, type, points, weight' },
  { id: 'rubric', title: 'Rubric', description: 'Grading criteria and levels' },
  { id: 'dates', title: 'Dates', description: 'Due dates and availability' },
  { id: 'visibility', title: 'Visibility', description: 'Student access and grade release' },
  { id: 'review', title: 'Review', description: 'Final review and create' },
] as const;

export function AssignmentWizard({
  initialData = {},
  onComplete,
  onCancel,
  existingRubrics = [],
}: AssignmentWizardProps) {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [formData, setFormData] = React.useState<AssessmentData>({
    title: '',
    description: '',
    type: 'assignment',
    maxPoints: 100,
    weight: 10,
    allowLateSubmission: true,
    latePenalty: 10,
    visible: true,
    releaseGrades: false,
    instructions: '',
    attachments: [],
    ...initialData,
  });
  const [rubric, setRubric] = React.useState<{ criteria: RubricCriterion[] }>({ criteria: [] });
  const { toast } = useToast();

  const canGoNext = () => {
    switch (STEPS[currentStep].id) {
      case 'basic':
        return formData.title.trim() && formData.maxPoints > 0 && formData.weight > 0;
      case 'rubric':
        return true; // Optional
      case 'dates':
        return true;
      case 'visibility':
        return true;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      if (canGoNext()) {
        setCurrentStep(prev => prev + 1);
      } else {
        toast({ title: 'Please complete required fields', variant: 'destructive' });
      }
    } else {
      // Submit
      const finalData = {
        ...formData,
        rubricId: rubric.criteria.length > 0 ? `rubric-${Date.now()}` : undefined,
      };
      onComplete(finalData);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const updateField = <K extends keyof AssessmentData>(field: K, value: AssessmentData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const StepComponent = STEPS[currentStep].id === 'basic' ? BasicInfoStep :
    STEPS[currentStep].id === 'rubric' ? RubricStep :
    STEPS[currentStep].id === 'dates' ? DatesStep :
    STEPS[currentStep].id === 'visibility' ? VisibilityStep :
    ReviewStep;

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-labelledby="wizard-title">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
        aria-hidden="true"
      />

      <div className="flex-1 max-w-3xl bg-semantic-card-bg animate-scale-in shadow-2xl flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-semantic-border-primary sticky top-0 z-10 bg-semantic-card-bg">
          <div>
            <h2 id="wizard-title" className="text-heading-lg font-semibold text-semantic-text-primary">
              {formData.id ? 'Edit Assessment' : 'Create New Assessment'}
            </h2>
            <p className="text-body-sm text-semantic-text-secondary mt-1">
              Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].title}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel} className="h-10 w-10" aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Progress Steps */}
        <div className="px-4 py-3 border-b border-semantic-border-primary bg-semantic-bg-secondary/50 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center gap-2">
                <div className={cn(
                  'h-8 w-8 rounded-full flex-center text-caption font-medium transition-all',
                  index < currentStep
                    ? 'bg-semantic-status-success text-semantic-text-inverse'
                    : index === currentStep
                      ? 'bg-semantic-brand-primary text-semantic-text-inverse ring-2 ring-semantic-brand-primary ring-offset-2 ring-offset-semantic-card-bg'
                      : 'bg-semantic-bg-tertiary text-semantic-text-tertiary'
                )}>
                  {index < currentStep ? <CheckCircle className="h-4 w-4" /> : index + 1}
                </div>
                {index < STEPS.length - 1 && (
                  <div className={cn(
                    'h-1 w-12 hidden sm:block rounded transition-colors',
                    index < currentStep ? 'bg-semantic-status-success' : 'bg-semantic-border-primary'
                  )} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 hidden sm:block">
            <div className="h-1 bg-semantic-bg-tertiary rounded-full overflow-hidden">
              <div
                className="h-full bg-semantic-brand-primary transition-all duration-300"
                style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <StepComponent
            formData={formData}
            rubric={rubric}
            onFormDataChange={updateField}
            onRubricChange={setRubric}
            existingRubrics={existingRubrics}
          />
        </div>

        {/* Navigation */}
        <CardFooter className="p-4 border-t border-semantic-border-primary sticky bottom-0 z-10 bg-semantic-card-bg flex items-center justify-between">
          <div className="text-caption text-semantic-text-tertiary">
            Step {currentStep + 1} of {STEPS.length}
          </div>
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button variant="secondary" onClick={handleBack} className="gap-1">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            {currentStep < STEPS.length - 1 ? (
              <Button variant="primary" onClick={handleNext} className="gap-1" disabled={!canGoNext()}>
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="primary" onClick={handleNext} className="gap-1">
                <CheckCircle className="h-4 w-4" />
                Create Assessment
              </Button>
            )}
          </div>
        </CardFooter>
      </div>
    </div>
  );
}

function BasicInfoStep({
  formData,
  onFormDataChange,
}: {
  formData: AssessmentData;
  onFormDataChange: <K extends keyof AssessmentData>(field: K, value: AssessmentData[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => onFormDataChange('title', e.target.value)}
          placeholder="e.g., Midterm Exam, Project 1, Homework 3"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => onFormDataChange('description', e.target.value)}
          placeholder="Brief description of the assessment..."
          rows={3}
          className="mt-1"
        />
      </div>

      <div>
        <Label>Type *</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
          {ASSESSMENT_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => onFormDataChange('type', type.value)}
              className={cn(
                'p-4 rounded-lg border-2 text-left transition-all',
                formData.type === type.value
                  ? 'border-semantic-brand-primary bg-semantic-brand-primary/5'
                  : 'border-semantic-border-primary hover:border-semantic-brand-primary/50'
              )}
            >
              <div className="text-2xl mb-1">{type.icon}</div>
              <div className="font-medium text-body-sm text-semantic-text-primary">{type.label}</div>
              <div className="text-caption text-semantic-text-tertiary">{type.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="maxPoints">Max Points *</Label>
          <Input
            id="maxPoints"
            type="number"
            min="1"
            value={formData.maxPoints}
            onChange={(e) => onFormDataChange('maxPoints', parseInt(e.target.value) || 0)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="weight">Weight (%) *</Label>
          <Input
            id="weight"
            type="number"
            min="0"
            max="100"
            value={formData.weight}
            onChange={(e) => onFormDataChange('weight', parseInt(e.target.value) || 0)}
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="instructions">Instructions for Students</Label>
        <Textarea
          id="instructions"
          value={formData.instructions || ''}
          onChange={(e) => onFormDataChange('instructions', e.target.value)}
          placeholder="Provide detailed instructions, requirements, formatting guidelines, etc."
          rows={4}
          className="mt-1"
        />
      </div>
    </div>
  );
}

function RubricStep({
  rubric,
  onRubricChange,
  existingRubrics,
}: {
  rubric: { criteria: RubricCriterion[] };
  onRubricChange: React.Dispatch<React.SetStateAction<{ criteria: RubricCriterion[] }>>;
  existingRubrics: Array<{ id: string; name: string }>;
}) {
  const [editingCriterion, setEditingCriterion] = React.useState<RubricCriterion | null>(null);

  const addCriterion = () => {
    const newCriterion: RubricCriterion = {
      id: `criterion-${Date.now()}`,
      title: '',
      description: '',
      points: 0,
      levels: [
        { id: `level-1-${Date.now()}`, title: 'Exemplary', description: '', points: 0 },
        { id: `level-2-${Date.now()}`, title: 'Proficient', description: '', points: 0 },
        { id: `level-3-${Date.now()}`, title: 'Developing', description: '', points: 0 },
        { id: `level-4-${Date.now()}`, title: 'Beginning', description: '', points: 0 },
      ],
    };
    onRubricChange(prev => ({ ...prev, criteria: [...prev.criteria, newCriterion] }));
    setEditingCriterion(newCriterion);
  };

  const totalPoints = rubric.criteria.reduce((sum, c) => sum + c.points, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-body text-semantic-text-primary">Rubric Builder</h3>
          <p className="text-body-sm text-semantic-text-secondary">Define grading criteria and performance levels</p>
        </div>
        {existingRubrics.length > 0 && (
          <Select
            placeholder="Or select existing rubric..."
            options={existingRubrics.map(r => ({ value: r.id, label: r.name }))}
            onValueChange={(value) => {
              // Load existing rubric
              console.log('Load rubric:', value);
            }}
            className="w-64"
          />
        )}
      </div>

      {rubric.criteria.length === 0 ? (
        <Card className="border-dashed border-semantic-border-primary">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-semantic-text-tertiary mx-auto mb-4" />
            <h4 className="text-heading-sm font-semibold text-semantic-text-primary mb-2">No rubric criteria yet</h4>
            <p className="text-body-sm text-semantic-text-secondary mb-4">Add criteria to create a structured grading rubric</p>
            <Button onClick={addCriterion} className="gap-2">
              <Plus className="h-4 w-4" />
              Add First Criterion
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {rubric.criteria.map((criterion, index) => (
              <CriterionEditor
                key={criterion.id}
                criterion={criterion}
                index={index}
                totalCriteria={rubric.criteria.length}
                onUpdate={(updated) => {
                  onRubricChange(prev => ({
                    ...prev,
                    criteria: prev.criteria.map((c, i) => i === index ? updated : c),
                  }));
                }}
                onDelete={() => {
                  onRubricChange(prev => ({
                    ...prev,
                    criteria: prev.criteria.filter((_, i) => i !== index),
                  }));
                }}
                onEdit={() => setEditingCriterion(criterion)}
              />
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-semantic-border-primary">
            <div className="text-body-sm text-semantic-text-secondary">
              Total Points: <span className="font-semibold text-semantic-text-primary">{totalPoints}</span>
            </div>
            <Button variant="outline" onClick={addCriterion} className="gap-1">
              <Plus className="h-4 w-4" />
              Add Criterion
            </Button>
          </div>
        </>
      )}

      {/* Edit Criterion Modal */}
      {editingCriterion && (
        <CriterionEditModal
          criterion={editingCriterion}
          onSave={(updated) => {
            onRubricChange(prev => ({
              ...prev,
              criteria: prev.criteria.map(c => c.id === editingCriterion.id ? updated : c),
            }));
            setEditingCriterion(null);
          }}
          onCancel={() => setEditingCriterion(null)}
        />
      )}
    </div>
  );
}

function CriterionEditor({
  criterion,
  index,
  totalCriteria,
  onUpdate,
  onDelete,
  onEdit,
}: {
  criterion: RubricCriterion;
  index: number;
  totalCriteria: number;
  onUpdate: (criterion: RubricCriterion) => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const criterionTotal = criterion.levels.reduce((sum, l) => Math.max(sum, l.points), 0);

  return (
    <Card className="relative">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3 flex-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-50 hover:opacity-100" onClick={onEdit} aria-label="Edit criterion">
              <GripVertical className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-caption text-semantic-text-tertiary bg-semantic-bg-tertiary px-2 py-0.5 rounded">
                  Criterion {index + 1}
                </span>
                <h4 className="font-medium text-body text-semantic-text-primary truncate">
                  {criterion.title || 'Untitled Criterion'}
                </h4>
              </div>
              {criterion.description && (
                <p className="text-caption text-semantic-text-tertiary mt-1 truncate">{criterion.description}</p>
              )}
            </div>
            <Badge variant="outline" className="text-capacity font-medium whitespace-nowrap">
              {criterionTotal} pts
            </Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-semantic-status-error" onClick={onDelete} aria-label="Delete criterion">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Levels Preview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {criterion.levels.map((level) => (
            <div
              key={level.id}
              className={cn(
                'p-2 rounded-lg text-center text-caption transition-colors',
                level.points === criterionTotal
                  ? 'bg-semantic-status-success/10 text-semantic-status-success border border-semantic-status-success/30'
                  : 'bg-semantic-bg-tertiary text-semantic-text-secondary'
              )}
            >
              <div className="font-medium">{level.title}</div>
              <div className="text-body-sm font-semibold">{level.points} pts</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CriterionEditModal({
  criterion,
  onSave,
  onCancel,
}: {
  criterion: RubricCriterion;
  onSave: (criterion: RubricCriterion) => void;
  onCancel: () => void;
}) {
  const [editing, setEditing] = React.useState({ ...criterion });

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="flex-1 max-w-2xl bg-semantic-card-bg m-auto mt-20 rounded-xl shadow-2xl animate-scale-in">
        <CardHeader className="p-4 border-b border-semantic-border-primary flex items-center justify-between">
          <CardTitle className="text-heading-md">Edit Criterion</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}><X className="h-5 w-5" /></Button>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div>
            <Label htmlFor="criterion-title">Title</Label>
            <Input
              id="criterion-title"
              value={editing.title}
              onChange={(e) => setEditing(prev => ({ ...prev, title: e.target.value }))}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="criterion-description">Description</Label>
            <Textarea
              id="criterion-description"
              value={editing.description}
              onChange={(e) => setEditing(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Total Points</Label>
            <Input
              type="number"
              min="0"
              value={editing.points}
              onChange={(e) => setEditing(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
              className="mt-1"
            />
          </div>
          <div className="space-y-2">
            <Label>Performance Levels</Label>
            {editing.levels.map((level, i) => (
              <div key={level.id} className="grid grid-cols-[1fr_80px] gap-2">
                <Input
                  placeholder={`Level ${i + 1} title`}
                  value={level.title}
                  onChange={(e) => setEditing(prev => ({
                    ...prev,
                    levels: prev.levels.map((l, idx) => idx === i ? { ...l, title: e.target.value } : l)
                  }))}
                />
                <Input
                  type="number"
                  min="0"
                  placeholder="Points"
                  value={level.points}
                  onChange={(e) => setEditing(prev => ({
                    ...prev,
                    levels: prev.levels.map((l, idx) => idx === i ? { ...l, points: parseInt(e.target.value) || 0 } : l)
                  }))}
                />
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="p-4 border-t border-semantic-border-primary flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" onClick={() => onSave(editing)}>Save</Button>
        </CardFooter>
      </div>
    </div>
  );
}

function DatesStep({
  formData,
  onFormDataChange,
}: {
  formData: AssessmentData;
  onFormDataChange: <K extends keyof AssessmentData>(field: K, value: AssessmentData[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="availableDate">Available From</Label>
        <DatePicker
          id="availableDate"
          value={formData.availableDate}
          onChange={(date) => onFormDataChange('availableDate', date ? date.toISOString() : undefined)}
          className="mt-1"
          placeholder="Select date"
        />
        <p className="text-caption text-semantic-text-tertiary mt-1">Students can see the assessment from this date</p>
      </div>

      <div>
        <Label htmlFor="dueDate">Due Date *</Label>
        <DatePicker
          id="dueDate"
          value={formData.dueDate}
          onChange={(date) => onFormDataChange('dueDate', date ? date.toISOString() : undefined)}
          className="mt-1"
          placeholder="Select due date"
        />
        <p className="text-caption text-semantic-text-tertiary mt-1">Deadline for submission</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch
            id="allowLate"
            checked={formData.allowLateSubmission}
            onCheckedChange={(checked) => onFormDataChange('allowLateSubmission', checked)}
          />
          <Label htmlFor="allowLate">Allow late submissions</Label>
        </div>
      </div>

      {formData.allowLateSubmission && (
        <div>
          <Label htmlFor="latePenalty">Late Penalty (% per day)</Label>
          <Input
            id="latePenalty"
            type="number"
            min="0"
            max="100"
            value={formData.latePenalty || 0}
            onChange={(e) => onFormDataChange('latePenalty', parseInt(e.target.value) || 0)}
            className="mt-1"
          />
          <p className="text-caption text-semantic-text-tertiary mt-1">Percentage deducted per day late</p>
        </div>
      )}
    </div>
  );
}

function VisibilityStep({
  formData,
  onFormDataChange,
}: {
  formData: AssessmentData;
  onFormDataChange: <K extends keyof AssessmentData>(field: K, value: AssessmentData[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 p-4 rounded-lg bg-semantic-bg-secondary">
        <div className="flex items-center gap-2">
          <Switch
            id="visible"
            checked={formData.visible}
            onCheckedChange={(checked) => onFormDataChange('visible', checked)}
          />
        </div>
        <div>
          <Label htmlFor="visible" className="mb-0 font-medium">Visible to Students</Label>
          <p className="text-caption text-semantic-text-tertiary">Students can see this assessment in their portal</p>
        </div>
      </div>

      <div className="flex items-center gap-4 p-4 rounded-lg bg-semantic-bg-secondary">
        <div className="flex items-center gap-2">
          <Switch
            id="releaseGrades"
            checked={formData.releaseGrades}
            onCheckedChange={(checked) => onFormDataChange('releaseGrades', checked)}
          />
        </div>
        <div>
          <Label htmlFor="releaseGrades" className="mb-0 font-medium">Release Grades Immediately</Label>
          <p className="text-caption text-semantic-text-tertiary">Grades become visible to students as soon as entered</p>
        </div>
      </div>

      <div className="p-4 rounded-lg border border-semantic-border-primary bg-semantic-card-bg">
        <h4 className="font-medium text-body-sm text-semantic-text-primary mb-3">Grade Release Options</h4>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="gradeRelease" defaultChecked className="h-4 w-4" />
            <span className="text-body-sm text-semantic-text-primary">Manual release (recommended)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="gradeRelease" className="h-4 w-4" />
            <span className="text-body-sm text-semantic-text-primary">Release after due date</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="gradeRelease" className="h-4 w-4" />
            <span className="text-body-sm text-semantic-text-primary">Release after all grades entered</span>
          </label>
        </div>
      </div>
    </div>
  );
}

function ReviewStep({
  formData,
  rubric,
}: {
  formData: AssessmentData;
  rubric: { criteria: RubricCriterion[] };
}) {
  const typeInfo = ASSESSMENT_TYPES.find(t => t.value === formData.type);
  const totalRubricPoints = rubric.criteria.reduce((sum, c) => sum + c.points, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-heading-md">Assessment Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ReviewRow label="Title" value={formData.title || '—'} />
          <ReviewRow label="Type" value={
            <Badge variant="outline" className="gap-1">
              {typeInfo?.icon} {typeInfo?.label}
            </Badge>
          } />
          <ReviewRow label="Description" value={formData.description || '—'} />
          <ReviewRow label="Max Points" value={formData.maxPoints.toString()} />
          <ReviewRow label="Weight" value={`${formData.weight}%`} />
          <ReviewRow label="Due Date" value={formData.dueDate ? new Date(formData.dueDate).toLocaleDateString() : 'Not set'} />
          <ReviewRow label="Available From" value={formData.availableDate ? new Date(formData.availableDate).toLocaleDateString() : 'Immediately'} />
          <ReviewRow label="Late Submissions" value={formData.allowLateSubmission ? `Allowed (${formData.latePenalty}%/day penalty)` : 'Not allowed'} />
          <ReviewRow label="Visible to Students" value={formData.visible ? 'Yes' : 'No'} />
          <ReviewRow label="Release Grades" value={formData.releaseGrades ? 'Immediately' : 'Manual'} />
          {rubric.criteria.length > 0 && (
            <ReviewRow label="Rubric Criteria" value={`${rubric.criteria.length} criteria (${totalRubricPoints} pts)`} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-heading-md">Instructions Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none text-semantic-text-secondary">
            {formData.instructions ? (
              formData.instructions.split('\n').map((line, i) => (
                <p key={i} className="mb-2">{line || <br />}</p>
              ))
            ) : (
              <p className="text-semantic-text-tertiary italic">No instructions provided</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-semantic-border-primary/50 last:border-0">
      <span className="text-body-sm text-semantic-text-tertiary">{label}</span>
      <span className="text-body-sm font-medium text-semantic-text-primary text-right">{value}</span>
    </div>
  );
}

function DatePicker({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  return <input type="date" className={cn('w-full px-3 py-2 bg-semantic-input-bg border border-semantic-input-border rounded-lg focus:border-semantic-input-focus focus:ring-2 focus:ring-semantic-brand-primary/20', className)} {...props} />;
}

function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string }) {
  return (
    <textarea
      className={cn(
        'w-full px-3 py-2 bg-semantic-input-bg border border-semantic-input-border rounded-lg',
        'focus:border-semantic-input-focus focus:ring-2 focus:ring-semantic-brand-primary/20',
        'placeholder:text-semantic-input-placeholder',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    />
  );
}