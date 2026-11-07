'use client';

import * as React from 'react';
import { X, Calendar, Clock, AlertTriangle, CheckCircle, Save, Loader2, Plus, Minus, Trash2, Edit, Copy, Download, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';
import { Label } from '@/components/ui/Label';
import { DataTable, columnHelper } from '@/components/ui/DataTable';
import { cn, formatRelativeTime } from '@/lib/utils';

interface TermManagerProps {
  mode: 'create' | 'edit';
  initialData?: any;
  onClose: () => void;
  onSubmit: () => void;
}

const gradingScalePresets = [
  { name: 'Standard Letter Grade (A-F)', scale: { A: 93, 'A-': 90, 'B+': 87, B: 83, 'B-': 80, 'C+': 77, C: 73, 'C-': 70, 'D+': 67, D: 63, 'D-': 60, F: 0 } },
  { name: 'Plus/Minus Only', scale: { A: 90, 'A-': 87, 'B+': 83, B: 80, 'B-': 77, 'C+': 73, C: 70, 'C-': 67, 'D+': 63, D: 60, F: 0 } },
  { name: 'Pass/Fail', scale: { P: 70, F: 0 } },
  { name: 'Honors/Pass/Fail', scale: { H: 90, P: 70, F: 0 } },
  { name: 'Percentage (0-100)', scale: {} },
  { name: 'Custom', scale: {} },
];

export function TermManager({ mode, initialData, onClose, onSubmit }: TermManagerProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  // Basic term info
  const [termCode, setTermCode] = React.useState(initialData?.code || '');
  const [termLabel, setTermLabel] = React.useState(initialData?.label || '');
  const [termStartDate, setTermStartDate] = React.useState(initialData?.startDate || '');
  const [termEndDate, setTermEndDate] = React.useState(initialData?.endDate || '');
  const [termStatus, setTermStatus] = React.useState(initialData?.status || 'upcoming');
  
  // Registration periods
  const [regOpen, setRegOpen] = React.useState(initialData?.registrationOpen || '');
  const [regClose, setRegClose] = React.useState(initialData?.registrationClose || '');
  const [addDropDeadline, setAddDropDeadline] = React.useState(initialData?.addDropDeadline || '');
  const [withdrawalDeadline, setWithdrawalDeadline] = React.useState(initialData?.withdrawalDeadline || '');
  
  // Grading scale
  const [gradingScaleName, setGradingScaleName] = React.useState(initialData?.gradingScale || 'Standard Letter Grade (A-F)');
  const [gradingScaleCustom, setGradingScaleCustom] = React.useState(initialData?.gradingScaleCustom || '');
  
  // Registration periods (multiple)
  const [registrationPeriods, setRegistrationPeriods] = React.useState<Array<{
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    audience: 'all' | 'priority' | 'continuing' | 'new';
  }>>(initialData?.registrationPeriods || [
    { id: '1', name: 'Priority Registration', startDate: '', endDate: '', audience: 'priority' },
    { id: '2', name: 'Continuing Students', startDate: '', endDate: '', audience: 'continuing' },
    { id: '3', name: 'New Students', startDate: '', endDate: '', audience: 'new' },
    { id: '4', name: 'Open Registration', startDate: '', endDate: '', audience: 'all' },
  ]));

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    onSubmit();
  };

  const addRegistrationPeriod = () => {
    setRegistrationPeriods([...registrationPeriods, {
      id: Date.now().toString(),
      name: '',
      startDate: '',
      endDate: '',
      audience: 'all',
    }]);
  };

  const removeRegistrationPeriod = (id: string) => {
    setRegistrationPeriods(registrationPeriods.filter(p => p.id !== id));
  };

  const updateRegistrationPeriod = (id: string, field: string, value: string) => {
    setRegistrationPeriods(registrationPeriods.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const moveRegistrationPeriod = (id: string, direction: 'up' | 'down') => {
    const index = registrationPeriods.findIndex(p => p.id === id);
    if ((direction === 'up' && index > 0) || (direction === 'down' && index < registrationPeriods.length - 1)) {
      const newPeriods = [...registrationPeriods];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      [newPeriods[index], newPeriods[newIndex]] = [newPeriods[newIndex], newPeriods[index]];
      setRegistrationPeriods(newPeriods);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-4xl max-h-[90vh] bg-semantic-bg-primary rounded-xl border border-semantic-border-primary shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-semantic-border-primary bg-semantic-bg-secondary">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-semantic-brand-primary/10 flex-center">
              <Calendar className="h-5 w-5 text-semantic-brand-primary" />
            </div>
            <div>
              <h2 className="text-heading-md font-semibold text-semantic-text-primary">
                {mode === 'create' ? 'Create' : 'Edit'} Academic Term
              </h2>
              <p className="text-body-sm text-semantic-text-secondary">
                Configure term dates, registration periods, deadlines, and grading scales
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            {/* Basic Term Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-heading-md">Term Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="termCode">Term Code *</Label>
                    <Input
                      id="termCode"
                      value={termCode}
                      onChange={(e) => setTermCode(e.target.value.toUpperCase())}
                      placeholder="e.g., 2025-SPRING"
                      required
                      disabled={mode === 'edit'}
                    />
                  </div>
                  <div>
                    <Label htmlFor="termLabel">Term Label *</Label>
                    <Input
                      id="termLabel"
                      value={termLabel}
                      onChange={(e) => setTermLabel(e.target.value)}
                      placeholder="e.g., Spring 2025"
                      required
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="termStartDate">Term Start Date *</Label>
                    <Input
                      id="termStartDate"
                      type="date"
                      value={termStartDate}
                      onChange={(e) => setTermStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="termEndDate">Term End Date *</Label>
                    <Input
                      id="termEndDate"
                      type="date"
                      value={termEndDate}
                      onChange={(e) => setTermEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="termStatus">Status</Label>
                  <Select
                    value={termStatus}
                    onValueChange={setTermStatus}
                    options={[
                      { value: 'upcoming', label: 'Upcoming' },
                      { value: 'active', label: 'Active' },
                      { value: 'completed', label: 'Completed' },
                      { value: 'archived', label: 'Archived' },
                    ]}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Registration Periods */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-heading-md">Registration Periods</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={addRegistrationPeriod} className="gap-1">
                    <Plus className="h-3 w-3" />
                    Add Period
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {registrationPeriods.map((period, index) => (
                    <div key={period.id} className="p-4 bg-semantic-bg-secondary rounded-lg border border-semantic-border-primary">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-body-sm font-medium text-semantic-text-secondary">Period #{index + 1}</span>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveRegistrationPeriod(period.id, 'up')} disabled={index === 0}>
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveRegistrationPeriod(period.id, 'down')} disabled={index === registrationPeriods.length - 1}>
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-semantic-status-error" onClick={() => removeRegistrationPeriod(period.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-4 gap-4">
                        <div>
                          <Label>Period Name</Label>
                          <Input
                            value={period.name}
                            onChange={(e) => updateRegistrationPeriod(period.id, 'name', e.target.value)}
                            placeholder="e.g., Priority Registration"
                          />
                        </div>
                        <div>
                          <Label>Audience</Label>
                          <Select
                            value={period.audience}
                            onValueChange={(v) => updateRegistrationPeriod(period.id, 'audience', v)}
                            options={[
                              { value: 'priority', label: 'Priority (Honors, Athletes, etc.)' },
                              { value: 'continuing', label: 'Continuing Students' },
                              { value: 'new', label: 'New/Incoming Students' },
                              { value: 'all', label: 'All Students' },
                            ]}
                          />
                        </div>
                        <div>
                          <Label>Start Date</Label>
                          <Input
                            type="date"
                            value={period.startDate}
                            onChange={(e) => updateRegistrationPeriod(period.id, 'startDate', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>End Date</Label>
                          <Input
                            type="date"
                            value={period.endDate}
                            onChange={(e) => updateRegistrationPeriod(period.id, 'endDate', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Key Deadlines */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-heading-md">Key Deadlines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="regOpen">Registration Opens *</Label>
                    <Input
                      id="regOpen"
                      type="datetime-local"
                      value={regOpen}
                      onChange={(e) => setRegOpen(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="regClose">Registration Closes *</Label>
                    <Input
                      id="regClose"
                      type="datetime-local"
                      value={regClose}
                      onChange={(e) => setRegClose(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="addDropDeadline">Add/Drop Deadline *</Label>
                    <Input
                      id="addDropDeadline"
                      type="datetime-local"
                      value={addDropDeadline}
                      onChange={(e) => setAddDropDeadline(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="withdrawalDeadline">Withdrawal Deadline *</Label>
                    <Input
                      id="withdrawalDeadline"
                      type="datetime-local"
                      value={withdrawalDeadline}
                      onChange={(e) => setWithdrawalDeadline(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Grading Scale */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-heading-md">Grading Scale</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Grading Scale Preset</Label>
                  <Select
                    value={gradingScaleName}
                    onValueChange={setGradingScaleName}
                    options={gradingScalePresets.map(g => ({ value: g.name, label: g.name }))}
                  />
                </div>
                {gradingScaleName === 'Custom' && (
                  <div>
                    <Label>Custom Grading Scale (JSON)</Label>
                    <Textarea
                      value={gradingScaleCustom}
                      onChange={(e) => setGradingScaleCustom(e.target.value)}
                      placeholder='{ "A": 93, "A-": 90, "B+": 87, "B": 83, "B-": 80, "C+": 77, "C": 73, "C-": 70, "D+": 67, "D": 63, "D-": 60, "F": 0 }'
                      rows={6}
                      className="font-mono text-sm"
                    />
                    <p className="text-caption text-semantic-text-tertiary mt-1">Enter grade thresholds as JSON object with grade keys and minimum percentage values</p>
                  </div>
                )}
                <div className="p-4 bg-semantic-bg-secondary rounded-lg">
                  <h4 className="font-medium text-semantic-text-primary mb-2">Current Scale Preview</h4>
                  <div className="flex flex-wrap gap-2">
                    {gradingScaleName !== 'Custom' && gradingScalePresets.find(g => g.name === gradingScaleName)?.scale && (
                      <>
                        {Object.entries(gradingScalePresets.find(g => g.name === gradingScaleName)!.scale).map(([grade, min]) => (
                          <Badge key={grade} variant="default" className="gap-1">
                            <span className="font-mono">{grade}</span>
                            <span className="text-[10px]">≥{min}%</span>
                          </Badge>
                        ))}
                      </>
                    )}
                    {gradingScaleName === 'Custom' && gradingScaleCustom && (
                      <>
                        {Object.entries(JSON.parse(gradingScaleCustom) || {}).map(([grade, min]) => (
                          <Badge key={grade} variant="default" className="gap-1">
                            <span className="font-mono">{grade}</span>
                            <span className="text-[10px]">≥{min}%</span>
                          </Badge>
                        ))}
                      </>
                    )}
                    {gradingScaleName === 'Custom' && !gradingScaleCustom && (
                      <span className="text-sm text-semantic-text-tertiary">Enter JSON to preview</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Footer Actions */}
            <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-semantic-border-primary">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting} className="gap-2">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === 'create' ? 'Create Term' : 'Save Changes'}
              </Button>
            </CardFooter>
          </form>
        </div>
      </div>
    </div>
  );
}