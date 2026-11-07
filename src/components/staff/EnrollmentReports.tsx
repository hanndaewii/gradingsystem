'use client';

import * as React from 'react';
import { Download, Filter, Calendar, BarChart2, PieChart, Users, BookOpen, TrendingUp, FileText, MoreHorizontal, Save, X, Plus, Settings, Eye, ArrowDown, ArrowUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';
import { Label } from '@/components/ui/Label';
import { DataTable, columnHelper } from '@/components/ui/DataTable';
import { EnrollmentChart } from '@/components/ui/EnrollmentChart';
import { cn } from '@/lib/utils';

interface EnrollmentReportsProps {
  defaultTerm?: string;
  defaultDepartment?: string;
}

const reportTemplates = [
  { id: 'enrollment-by-course', name: 'Enrollment by Course', category: 'Enrollment', description: 'Detailed enrollment breakdown by course with section-level details' },
  { id: 'enrollment-by-professor', name: 'Enrollment by Professor', category: 'Enrollment', description: 'Enrollment statistics grouped by instructor with capacity utilization' },
  { id: 'enrollment-by-term', name: 'Enrollment by Term', category: 'Enrollment', description: 'Term-over-term enrollment trends and comparisons' },
  { id: 'demographic-breakdown', name: 'Demographic Breakdown', category: 'Demographics', description: 'Student demographics by major, year, gender, ethnicity across enrollments' },
  { id: 'capacity-utilization', name: 'Capacity Utilization', category: 'Capacity', description: 'Section capacity utilization rates with waitlist analysis' },
  { id: 'waitlist-analysis', name: 'Waitlist Analysis', category: 'Capacity', description: 'Waitlist trends, promotion rates, and student impact' },
  { id: 'registration-trends', name: 'Registration Trends', category: 'Registration', description: 'Registration patterns, peak times, and early/late registration analysis' },
  { id: 'course-demand', name: 'Course Demand Forecast', category: 'Forecasting', description: 'Predictive analysis of course demand for upcoming terms' },
];

const terms = ['All Terms', 'Fall 2024', 'Spring 2025', 'Summer 2024', 'Fall 2023'];
const departments = ['All Departments', 'Computer Science', 'Mathematics', 'Physics', 'English', 'Biology', 'Chemistry', 'History'];
const groupByOptions = ['Course', 'Professor', 'Term', 'Department', 'Section', 'Student Major', 'Student Year'];
const chartTypes = ['Bar Chart', 'Line Chart', 'Pie Chart', 'Area Chart', 'Table Only'];

export function EnrollmentReports({ defaultTerm, defaultDepartment }: EnrollmentReportsProps) {
  const [activeStep, setActiveStep] = React.useState<'template' | 'configure' | 'preview' | 'save'>('template');
  const [selectedTemplate, setSelectedTemplate] = React.useState<string | null>(null);
  const [selectedTerm, setSelectedTerm] = React.useState(defaultTerm || terms[0]);
  const [selectedDepartment, setSelectedDepartment] = React.useState(defaultDepartment || departments[0]);
  const [selectedGroupBy, setSelectedGroupBy] = React.useState(groupByOptions[0]);
  const [selectedChartType, setSelectedChartType] = React.useState(chartTypes[0]);
  const [dateRange, setDateRange] = React.useState<{ from: string; to: string }>({ from: '', to: '' });
  const [filters, setFilters] = React.useState<Record<string, any>>({});
  const [reportName, setReportName] = React.useState('');
  const [reportDescription, setReportDescription] = React.useState('');
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [previewData, setPreviewData] = React.useState<any>(null);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    setActiveStep('configure');
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsGenerating(false);
    setPreviewData({ 
      template: selectedTemplate,
      term: selectedTerm,
      department: selectedDepartment,
      groupBy: selectedGroupBy,
      chartType: selectedChartType,
      generatedAt: new Date().toISOString(),
    });
    setActiveStep('preview');
  };

  const handleSave = () => {
    // Save report configuration
    setActiveStep('save');
    setTimeout(() => {
      setActiveStep('template');
      setSelectedTemplate(null);
      setReportName('');
      setReportDescription('');
    }, 1000);
  };

  const canGenerate = selectedTemplate && selectedTerm && selectedDepartment;

  return (
    <div className="space-y-6">
      {/* Step 1: Template Selection */}
      {activeStep === 'template' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-heading-md">Select Report Template</CardTitle>
            <CardDescription>Choose a pre-built report or create a custom one</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {reportTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow h-full" onClick={() => handleTemplateSelect(template.id)}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="h-10 w-10 rounded-lg bg-semantic-brand-primary/10 flex-center">
                        {template.category === 'Enrollment' && <Users className="h-5 w-5 text-semantic-brand-primary" />}
                        {template.category === 'Demographics' && <PieChart className="h-5 w-5 text-semantic-brand-primary" />}
                        {template.category === 'Capacity' && <TrendingUp className="h-5 w-5 text-semantic-brand-primary" />}
                        {template.category === 'Registration' && <Calendar className="h-5 w-5 text-semantic-brand-primary" />}
                        {template.category === 'Forecasting' && <BarChart2 className="h-5 w-5 text-semantic-brand-primary" />}
                      </div>
                      <Badge variant="default" className="text-[10px]">{template.category}</Badge>
                    </div>
                    <h4 className="font-semibold text-semantic-text-primary mb-1">{template.name}</h4>
                    <p className="text-body-sm text-semantic-text-secondary mb-4">{template.description}</p>
                    <Button variant="primary" size="sm" className="w-full gap-1">
                      <BarChart2 className="h-3 w-3" />
                      Use Template
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {/* Custom Report Card */}
              <Card className="hover:shadow-md transition-shadow h-full border-2 border-dashed border-semantic-border-primary" onClick={() => { setSelectedTemplate('custom'); setActiveStep('configure'); }}>
                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                  <div className="h-16 w-16 rounded-full bg-semantic-bg-tertiary flex-center mb-4">
                    <Plus className="h-8 w-8 text-semantic-text-tertiary" />
                  </div>
                  <h4 className="font-semibold text-semantic-text-primary mb-1">Custom Report</h4>
                  <p className="text-body-sm text-semantic-text-secondary mb-4">Build a report from scratch with your own filters and groupings</p>
                  <Button variant="outline" size="sm" className="w-full gap-1">
                    <Plus className="h-3 w-3" />
                    Create Custom Report
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Configure Report */}
      {activeStep === 'configure' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-heading-md">Configure Report</CardTitle>
                <CardDescription>Set filters, grouping, and visualization options</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setActiveStep('template')} className="gap-1">
                <ArrowLeft className="h-3 w-3" />
                Back
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Filters */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label>Term</Label>
                  <Select
                    value={selectedTerm}
                    onValueChange={setSelectedTerm}
                    options={terms.map(t => ({ value: t, label: t }))}
                  />
                </div>
                <div>
                  <Label>Department</Label>
                  <Select
                    value={selectedDepartment}
                    onValueChange={setSelectedDepartment}
                    options={departments.map(d => ({ value: d, label: d }))}
                  />
                </div>
                <div>
                  <Label>Group By</Label>
                  <Select
                    value={selectedGroupBy}
                    onValueChange={setSelectedGroupBy}
                    options={groupByOptions.map(g => ({ value: g, label: g }))}
                  />
                </div>
                <div>
                  <Label>Chart Type</Label>
                  <Select
                    value={selectedChartType}
                    onValueChange={setSelectedChartType}
                    options={chartTypes.map(c => ({ value: c, label: c }))}
                  />
                </div>
              </div>

              {/* Date Range */}
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <Label>Date From</Label>
                  <Input type="date" value={dateRange.from} onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })} />
                </div>
                <div>
                  <Label>Date To</Label>
                  <Input type="date" value={dateRange.to} onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Label>Additional Filters</Label>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="default" className="gap-1">Status: Active <X className="h-3 w-3" onClick={() => {}} /></Badge>
                    <Badge variant="default" className="gap-1">Credits: 3+ <X className="h-3 w-3" onClick={() => {}} /></Badge>
                    <Badge variant="default" className="gap-1">Enrollment: >20 <X className="h-3 w-3" onClick={() => {}} /></Badge>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Filter className="h-3 w-3" />
                      Add Filter
                    </Button>
                  </div>
                </div>
              </div>

              {/* Advanced Options */}
              <div className="p-4 bg-semantic-bg-secondary rounded-lg border border-semantic-border-primary">
                <h4 className="font-medium text-semantic-text-primary mb-4">Advanced Options</h4>
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="flex items-center gap-2">
                    <Switch defaultChecked />
                    <span className="text-body-sm text-semantic-text-primary">Include waitlisted students</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Switch defaultChecked />
                    <span className="text-body-sm text-semantic-text-primary">Include dropped students</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Switch />
                    <span className="text-body-sm text-semantic-text-primary">Show capacity utilization</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Switch defaultChecked />
                    <span className="text-body-sm text-semantic-text-primary">Include demographic breakdown</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Switch />
                    <span className="text-body-sm text-semantic-text-primary">Compare with previous term</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Switch />
                    <span className="text-body-sm text-semantic-text-primary">Show trend lines</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button variant="ghost" onClick={() => setActiveStep('template')}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button variant="primary" onClick={handleGenerate} disabled={!canGenerate || isGenerating} className="gap-2 flex-1">
                  {isGenerating && <RefreshCw className="h-4 w-4 animate-spin" />}
                  Generate Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Preview */}
      {activeStep === 'preview' && previewData && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-heading-md">Report Preview</CardTitle>
                <CardDescription>Review the generated report before saving or exporting</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setActiveStep('configure')} className="gap-1">
                  <ArrowLeft className="h-3 w-3" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" className="gap-1">
                  <Download className="h-3 w-3" />
                  Export CSV
                </Button>
                <Button variant="outline" size="sm" className="gap-1">
                  <Download className="h-3 w-3" />
                  Export Excel
                </Button>
                <Button variant="outline" size="sm" className="gap-1">
                  <Download className="h-3 w-3" />
                  Export PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-caption text-semantic-text-tertiary">Total Enrollments</p>
                    <p className="text-heading-xl font-bold text-semantic-text-primary">18,234</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-caption text-semantic-text-tertiary">Active Sections</p>
                    <p className="text-heading-xl font-bold text-semantic-text-primary">387</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-caption text-semantic-text-tertiary">Avg Utilization</p>
                    <p className="text-heading-xl font-bold text-semantic-brand-primary">91%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-caption text-semantic-text-tertiary">Waitlisted</p>
                    <p className="text-heading-xl font-bold text-semantic-status-warning">412</p>
                  </CardContent>
                </Card>
              </div>

              {/* Chart */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-heading-md">Visualization</CardTitle>
                </CardHeader>
                <CardContent>
                  <EnrollmentChart
                    data={[
                      { name: 'CS 101', enrollments: 142, capacity: 150 },
                      { name: 'CS 201', enrollments: 89, capacity: 100 },
                      { name: 'CS 301', enrollments: 67, capacity: 80 },
                      { name: 'CS 401', enrollments: 45, capacity: 50 },
                      { name: 'MATH 101', enrollments: 115, capacity: 120 },
                      { name: 'MATH 201', enrollments: 78, capacity: 85 },
                      { name: 'PHYS 101', enrollments: 56, capacity: 80 },
                      { name: 'ENG 101', enrollments: 98, capacity: 100 },
                    ]}
                    type={selectedChartType.toLowerCase().includes('bar') ? 'bar' : selectedChartType.toLowerCase().includes('line') ? 'line' : 'pie'}
                    height={400}
                  />
                </CardContent>
              </Card>

              {/* Data Table */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-heading-md">Data Table</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <DataTable
                    columns={[
                      columnHelper.accessor('name', { header: selectedGroupBy, cell: info => info.getValue() as string, size: 200 }),
                      columnHelper.accessor('enrollments', { header: 'Enrollments', cell: info => (info.getValue() as number).toLocaleString(), size: 120 }),
                      columnHelper.accessor('capacity', { header: 'Capacity', cell: info => (info.getValue() as number).toLocaleString(), size: 120 }),
                      columnHelper.display({
                        id: 'utilization',
                        header: 'Utilization',
                        cell: ({ row }) => {
                          const util = Math.round((row.original.enrollments / row.original.capacity) * 100);
                          return (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-semantic-bg-tertiary rounded-full overflow-hidden max-w-[100px]">
                                <div 
                                  className={cn(
                                    'h-full rounded-full transition-all',
                                    util >= 95 && 'bg-semantic-status-error',
                                    util >= 80 && util < 95 && 'bg-semantic-status-warning',
                                    util < 80 && 'bg-semantic-status-success'
                                  )} 
                                  style={{ width: `${util}%` }}
                                />
                              </div>
                              <span className={cn(
                                'text-body-sm font-medium w-16 text-right',
                                util >= 95 && 'text-semantic-status-error',
                                util >= 80 && util < 95 && 'text-semantic-status-warning',
                                util < 80 && 'text-semantic-status-success'
                              )}>{util}%</span>
                            </div>
                          );
                        },
                        size: 140,
                      }),
                      columnHelper.accessor('waitlisted', { header: 'Waitlisted', cell: info => (info.getValue() as number).toLocaleString(), size: 100 }),
                      columnHelper.accessor('sections', { header: 'Sections', cell: info => info.getValue() as number, size: 100 }),
                    ]}
                    data={[
                      { name: 'CS 101', enrollments: 284, capacity: 300, waitlisted: 20, sections: 2 },
                      { name: 'CS 201', enrollments: 189, capacity: 200, waitlisted: 15, sections: 2 },
                      { name: 'CS 301', enrollments: 134, capacity: 160, waitlisted: 10, sections: 2 },
                      { name: 'CS 401', enrollments: 95, capacity: 100, waitlisted: 5, sections: 2 },
                      { name: 'MATH 101', enrollments: 230, capacity: 240, waitlisted: 8, sections: 2 },
                      { name: 'MATH 201', enrollments: 156, capacity: 170, waitlisted: 12, sections: 2 },
                      { name: 'PHYS 101', enrollments: 112, capacity: 160, waitlisted: 4, sections: 2 },
                      { name: 'ENG 101', enrollments: 198, capacity: 200, waitlisted: 6, sections: 2 },
                    ]}
                    rowKey="name"
                    pageSize={10}
                    showColumnVisibility={false}
                    showExport={false}
                    className="rounded-none"
                  />
                </CardContent>
              </Card>

              {/* Save Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-heading-md">Save Report</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="reportName">Report Name *</Label>
                      <Input
                        id="reportName"
                        value={reportName}
                        onChange={(e) => setReportName(e.target.value)}
                        placeholder="e.g., Fall 2024 CS Department Enrollment"
                      />
                    </div>
                    <div>
                      <Label htmlFor="reportDescription">Description</Label>
                      <Input
                        id="reportDescription"
                        value={reportDescription}
                        onChange={(e) => setReportDescription(e.target.value)}
                        placeholder="Optional description"
                      />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <Button variant="ghost" onClick={() => setActiveStep('configure')}>
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </Button>
                    <Button variant="primary" onClick={handleSave} disabled={!reportName.trim()} className="gap-2 flex-1">
                      <Save className="h-4 w-4" />
                      Save Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}