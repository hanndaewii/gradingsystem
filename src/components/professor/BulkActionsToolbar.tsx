'use client';

import * as React from 'react';
import { Download, Upload, Fill, Copy, Save, AlertTriangle, CheckCircle, FileSpreadsheet, Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuCheckboxItem } from '@/components/ui/DropdownMenu';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { Progress } from '@/components/ui/Progress';
import { Toast, ToastTitle, ToastDescription, ToastAction, useToast } from '@/components/ui/Toast';

type BulkAction = 'fillDown' | 'fillRight' | 'import' | 'export' | 'submitAll' | 'clearAll' | 'excuseAll';

interface BulkActionsToolbarProps {
  onAction: (action: BulkAction, data?: unknown) => void;
  studentCount: number;
  assessmentCount: number;
  hasChanges?: boolean;
  disabled?: boolean;
}

export function BulkActionsToolbar({
  onAction,
  studentCount,
  assessmentCount,
  hasChanges = false,
  disabled = false,
}: BulkActionsToolbarProps) {
  const [fillDownValue, setFillDownValue] = React.useState('');
  const [fillRightValue, setFillRightValue] = React.useState('');
  const [importFile, setImportFile] = React.useState<File | null>(null);
  const [importProgress, setImportProgress] = React.useState(0);
  const [showImportProgress, setShowImportProgress] = React.useState(false);
  const { toast } = useToast();

  const handleFillDown = () => {
    const value = fillDownValue ? parseFloat(fillDownValue) : null;
    if (fillDownValue && isNaN(value!)) {
      toast({ title: 'Invalid value', description: 'Please enter a valid number', variant: 'destructive' });
      return;
    }
    onAction('fillDown', { value });
    setFillDownValue('');
  };

  const handleFillRight = () => {
    const value = fillRightValue ? parseFloat(fillRightValue) : null;
    if (fillRightValue && isNaN(value!)) {
      toast({ title: 'Invalid value', description: 'Please enter a valid number', variant: 'destructive' });
      return;
    }
    onAction('fillRight', { value });
    setFillRightValue('');
  };

  const handleImport = (file: File) => {
    setImportFile(file);
    setShowImportProgress(true);
    setImportProgress(0);

    // Simulate import progress
    const interval = setInterval(() => {
      setImportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setShowImportProgress(false);
          onAction('import', { file });
          toast({ title: 'Import complete', description: `Imported grades for ${studentCount} students`, variant: 'success' });
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImport(file);
      e.target.value = '';
    }
  };

  const handleExport = (format: 'csv' | 'xlsx' | 'pdf') => {
    onAction('export', { format });
    toast({ title: 'Export started', description: `Downloading ${format.toUpperCase()} file...`, variant: 'default' });
  };

  const handleSubmitAll = () => {
    if (confirm(`Submit all ${studentCount} students' grades for review? This action cannot be undone.`)) {
      onAction('submitAll');
      toast({ title: 'Grades submitted', description: 'All grades sent for review', variant: 'success' });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Fill Down */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1" disabled={disabled} aria-label="Fill down">
            <Fill className="h-4 w-4" />
            Fill Down
          </Button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" className="w-64 p-3">
          <div className="space-y-2">
            <Label className="text-body-sm">Fill down for selected column</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.5"
                placeholder="Value"
                value={fillDownValue}
                onChange={(e) => setFillDownValue(e.target.value)}
                className="flex-1"
                size="sm"
              />
              <Button size="sm" onClick={handleFillDown} disabled={disabled}>
                Apply
              </Button>
            </div>
            <p className="text-caption text-semantic-text-tertiary">
              Applies to all visible rows in the selected column
            </p>
          </div>
        </PopoverContent>
      </Popover>

      {/* Fill Right */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1" disabled={disabled} aria-label="Fill right">
            <Copy className="h-4 w-4" />
            Fill Right
          </Button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" className="w-64 p-3">
          <div className="space-y-2">
            <Label className="text-body-sm">Fill right for selected student</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.5"
                placeholder="Value"
                value={fillRightValue}
                onChange={(e) => setFillRightValue(e.target.value)}
                className="flex-1"
                size="sm"
              />
              <Button size="sm" onClick={handleFillRight} disabled={disabled}>
                Apply
              </Button>
            </div>
            <p className="text-caption text-semantic-text-tertiary">
              Applies to all visible assessments for the selected student
            </p>
          </div>
        </PopoverContent>
      </Popover>

      {/* Import */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1" disabled={disabled} aria-label="Import grades">
            <Upload className="h-4 w-4" />
            Import
          </Button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" className="w-72 p-3">
          <div className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-body font-semibold">Import Grades</CardTitle>
                <CardDescription className="text-caption">Upload CSV or Excel file with grades</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="relative">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={disabled}
                    id="import-file"
                  />
                  <Label htmlFor="import-file" className={cn(
                    'flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
                    disabled ? 'opacity-50 cursor-not-allowed' : 'border-semantic-border-primary hover:border-semantic-brand-primary hover:bg-semantic-bg-secondary'
                  )}>
                    <FileSpreadsheet className="h-6 w-6 text-semantic-text-tertiary" />
                    <span className="text-body-sm text-semantic-text-secondary">Click or drag to upload</span>
                  </Label>
                </div>

                <div className="text-caption text-semantic-text-tertiary space-y-1">
                  <p>• CSV or Excel format</p>
                  <p>• Columns: Student ID, Assessment ID, Score</p>
                  <p>• Max file size: 10MB</p>
                </div>

                {showImportProgress && (
                  <div className="space-y-2">
                    <Progress value={importProgress} className="h-2" showLabel />
                    <p className="text-caption text-semantic-text-secondary text-center">
                      Processing... {importProgress}%
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </PopoverContent>
      </Popover>

      {/* Export */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1" disabled={disabled} aria-label="Export grades">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => handleExport('csv')} disabled={disabled} className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            <span>CSV</span>
            <span className="ml-auto text-caption text-semantic-text-tertiary">.csv</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport('xlsx')} disabled={disabled} className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            <span>Excel</span>
            <span className="ml-auto text-caption text-semantic-text-tertiary">.xlsx</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport('pdf')} disabled={disabled} className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            <span>PDF Report</span>
            <span className="ml-auto text-caption text-semantic-text-tertiary">.pdf</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={false}
            onCheckedChange={() => {}}
            className="flex items-center gap-2 px-2 py-1.5 text-body-sm"
          >
            Include comments
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={true}
            onCheckedChange={() => {}}
            className="flex items-center gap-2 px-2 py-1.5 text-body-sm"
          >
            Include rubric scores
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={false}
            onCheckedChange={() => {}}
            className="flex items-center gap-2 px-2 py-1.5 text-body-sm"
          >
            Include history
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Submit All */}
      {hasChanges && (
        <Button
          variant="primary"
          size="sm"
          className="gap-1"
          onClick={handleSubmitAll}
          disabled={disabled}
        >
          <CheckCircle className="h-4 w-4" />
          Submit All ({studentCount})
        </Button>
      )}

      {/* More Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1 h-9" aria-label="More actions">
            <span className="text-body-sm font-medium">More</span>
            <X className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onClick={() => onAction('clearAll')}
            disabled={disabled}
            className="flex items-center gap-2 text-semantic-status-warning"
          >
            <AlertTriangle className="h-4 w-4" />
            Clear All Grades
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onAction('excuseAll')}
            disabled={disabled}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Excuse All Missing
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onAction('submitAll')}
            disabled={disabled}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save All as Draft
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}