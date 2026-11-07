'use client';

import * as React from 'react';
import { ArrowLeft, Download, FileBarChart, Users, Award, TrendingUp, Target, Calendar, Filter, Print } from 'lucide-react';
import Link from 'next/link';
import { SectionStats } from '@/components/professor/SectionStats';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/DropdownMenu';
import { GPATrendChart } from '@/components/ui/GPATrendChart';
import { GradeDistributionChart } from '@/components/ui/GradeDistributionChart';
import { StatCard } from '@/components/ui/StatCard';
import { formatDate } from '@/lib/utils';

const mockClasses = [
  { id: '1', code: 'CS 101', name: 'Introduction to Computer Science', section: 'A', term: 'Fall 2024', students: 142 },
  { id: '2', code: 'CS 201', name: 'Data Structures & Algorithms', section: 'B', term: 'Fall 2024', students: 89 },
  { id: '3', code: 'CS 301', name: 'Database Systems', section: 'A', term: 'Fall 2024', students: 67 },
  { id: '4', code: 'CS 401', name: 'Software Engineering', section: 'C', term: 'Fall 2024', students: 45 },
];

const mockReportData = {
  classPerformance: {
    labels: ['CS 101-A', 'CS 201-B', 'CS 301-A', 'CS 401-C'],
    datasets: [{
      label: 'Average Grade',
      data: [87.3, 82.1, 91.5, 88.7],
      borderColor: 'var(--color-brand-primary)',
      backgroundColor: 'var(--color-brand-primary)20',
    }],
  },
  gradeDistribution: {
    labels: ['A (90-100)', 'B (80-89)', 'C (70-79)', 'D (60-69)', 'F (<60)'],
    datasets: [{
      label: 'Students',
      data: [45, 67, 32, 12, 5],
      backgroundColor: [
        'var(--color-status-success)',
        'var(--color-brand-primary)',
        'var(--color-status-info)',
        'var(--color-status-warning)',
        'var(--color-status-error)',
      ],
      borderRadius: 8,
    }],
  },
  completionTrend: {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8'],
    datasets: [
      { label: 'CS 101-A', data: [95, 92, 89, 94, 91, 88, 93, 90], borderColor: 'var(--color-brand-primary)', backgroundColor: 'var(--color-brand-primary)20' },
      { label: 'CS 201-B', data: [88, 85, 82, 87, 84, 81, 86, 83], borderColor: 'var(--color-status-success)', backgroundColor: 'var(--color-status-success)20' },
      { label: 'CS 301-A', data: [97, 95, 93, 96, 94, 92, 95, 93], borderColor: 'var(--color-status-info)', backgroundColor: 'var(--color-status-info)20' },
      { label: 'CS 401-C', data: [90, 88, 85, 89, 87, 84, 88, 86], borderColor: 'var(--color-status-warning)', backgroundColor: 'var(--color-status-warning)20' },
    ],
  },
  atRiskStudents: [
    { name: 'Alex Smith', id: 'STU000001', class: 'CS 101-A', grade: 52, missed: 3, lastActive: '2024-01-10' },
    { name: 'Jordan Johnson', id: 'STU000005', class: 'CS 101-A', grade: 58, missed: 2, lastActive: '2024-01-12' },
    { name: 'Taylor Williams', id: 'STU000012', class: 'CS 201-B', grade: 45, missed: 5, lastActive: '2024-01-08' },
    { name: 'Morgan Brown', id: 'STU000023', class: 'CS 201-B', grade: 55, missed: 1, lastActive: '2024-01-14' },
    { name: 'Casey Jones', id: 'STU000034', class: 'CS 301-A', grade: 59, missed: 2, lastActive: '2024-01-11' },
  ],
};

export default function ReportsPage() {
  const [selectedClass, setSelectedClass] = React.useState(mockClasses[0].id);
  const [reportType, setReportType] = React.useState<'overview' | 'performance' | 'distribution' | 'completion' | 'at-risk'>('overview');
  const [dateRange, setDateRange] = React.useState('term');

  const selectedClassData = mockClasses.find(c => c.id === selectedClass) || mockClasses[0];

  const handleExport = (format: 'pdf' | 'csv' | 'xlsx') => {
    console.log(`Export ${format} report for ${selectedClassData.code}`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-semantic-bg-primary">
      {/* Header */}
      <header className="border-b border-semantic-border-primary bg-semantic-bg-secondary/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container equal-edges">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
            <div className="flex items-center gap-4">
              <Link href="/professor" className="h-10 w-10">
                <Button variant="ghost" size="icon" aria-label="Back to dashboard">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-heading-lg font-semibold text-semantic-text-primary">Reports & Analytics</h1>
                <p className="text-body-sm text-semantic-text-secondary">Class performance, grade distributions, and student insights</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Download className="h-4 w-4" />
                    Export Report
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport('pdf')}>
                    <FileBarChart className="h-4 w-4 mr-2" />
                    PDF Report
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    <Download className="h-4 w-4 mr-2" />
                    CSV Data
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                    <Download className="h-4 w-4 mr-2" />
                    Excel Workbook
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handlePrint} className="flex items-center gap-2">
                    <Print className="h-4 w-4" />
                    Print
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="container equal-edges py-6 section-spacing">
        {/* Class Selector & Filters */}
        <Card className="mb-6">
          <CardContent className="p-4 pt-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <Select
                  value={selectedClass}
                  onValueChange={setSelectedClass}
                  options={mockClasses.map(c => ({ value: c.id, label: `${c.code}-${c.section}: ${c.name}` }))}
                  className="w-64 md:w-80"
                  placeholder="Select a class..."
                />
                <Select
                  value={dateRange}
                  onValueChange={setDateRange}
                  options={[
                    { value: 'week', label: 'This Week' },
                    { value: 'month', label: 'This Month' },
                    { value: 'term', label: 'Full Term' },
                    { value: 'custom', label: 'Custom Range' },
                  ]}
                  className="w-40"
                />
              </div>
              <div className="flex items-center gap-2">
                <Tabs value={reportType} onValueChange={setReportType} className="hidden sm:flex">
                  <TabsList className="bg-semantic-bg-tertiary p-1 rounded-lg">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                    <TabsTrigger value="distribution">Distribution</TabsTrigger>
                    <TabsTrigger value="completion">Completion</TabsTrigger>
                    <TabsTrigger value="at-risk">At-Risk</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Select
                  value={reportType}
                  onValueChange={setReportType}
                  options={[
                    { value: 'overview', label: 'Overview' },
                    { value: 'performance', label: 'Performance' },
                    { value: 'distribution', label: 'Distribution' },
                    { value: 'completion', label: 'Completion' },
                    { value: 'at-risk', label: 'At-Risk Students' },
                  ]}
                  className="w-40 sm:hidden"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overview Tab */}
        {reportType === 'overview' && (
          <>
            {/* Class Stats */}
            <SectionStats
              enrollment={selectedClassData.students}
              capacity={selectedClassData.students + 8}
              avgGrade={selectedClassData.code === 'CS 101' ? 87.3 : selectedClassData.code === 'CS 201' ? 82.1 : selectedClassData.code === 'CS 301' ? 91.5 : 88.7}
              medianGrade={selectedClassData.code === 'CS 101' ? 88 : selectedClassData.code === 'CS 201' ? 81 : selectedClassData.code === 'CS 301' ? 92 : 89}
              gradeDistribution={[
                { label: 'A', count: Math.round(selectedClassData.students * 0.3) },
                { label: 'B', count: Math.round(selectedClassData.students * 0.4) },
                { label: 'C', count: Math.round(selectedClassData.students * 0.2) },
                { label: 'D', count: Math.round(selectedClassData.students * 0.07) },
                { label: 'F', count: Math.round(selectedClassData.students * 0.03) },
              ]}
              completionRate={92}
              submissionsPending={selectedClassData.code === 'CS 101' ? 12 : selectedClassData.code === 'CS 201' ? 8 : selectedClassData.code === 'CS 301' ? 3 : 5}
              submissionsTotal={selectedClassData.students * 8}
            />

            {/* Quick Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-caption text-semantic-text-tertiary">Class Average</p>
                      <p className="text-3xl font-bold text-semantic-brand-primary">
                        {selectedClassData.code === 'CS 101' ? '87.3%' : selectedClassData.code === 'CS 201' ? '82.1%' : selectedClassData.code === 'CS 301' ? '91.5%' : '88.7%'}
                      </p>
                    </div>
                    <Award className="h-10 w-10 text-semantic-brand-primary/50" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-caption text-semantic-text-tertiary">Completion Rate</p>
                      <p className="text-3xl font-bold text-semantic-status-success">92%</p>
                    </div>
                    <Target className="h-10 w-10 text-semantic-status-success/50" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-caption text-semantic-text-tertiary">At Risk</p>
                      <p className="text-3xl font-bold text-semantic-status-error">3</p>
                    </div>
                    <AlertTriangle className="h-10 w-10 text-semantic-status-error/50" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-caption text-semantic-text-tertiary">Honor Roll</p>
                      <p className="text-3xl font-bold text-semantic-status-warning">12</p>
                    </div>
                    <TrendingUp className="h-10 w-10 text-semantic-status-warning/50" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Performance Tab */}
        {reportType === 'performance' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-heading-md">Class Performance Comparison</CardTitle>
                <CardDescription>Average grades across all your sections</CardDescription>
              </CardHeader>
              <CardContent>
                <GPATrendChart
                  data={mockReportData.classPerformance}
                  height={350}
                  options={{
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (ctx: any) => `${ctx.parsed.y}% average`,
                        },
                      },
                    },
                    scales: {
                      y: { min: 0, max: 100, stepSize: 10 },
                    },
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-heading-md">Completion Rate Trend</CardTitle>
                <CardDescription>Weekly assignment completion rates by section</CardDescription>
              </CardHeader>
              <CardContent>
                <GPATrendChart
                  data={mockReportData.completionTrend}
                  height={350}
                  showPoints={true}
                  options={{
                    plugins: {
                      legend: { display: true, position: 'bottom' },
                    },
                    scales: {
                      y: { min: 70, max: 100, stepSize: 5 },
                    },
                  }}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Distribution Tab */}
        {reportType === 'distribution' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-heading-md">Grade Distribution</CardTitle>
                <CardDescription>Distribution of final grades for {selectedClassData.code}-{selectedClassData.section}</CardDescription>
              </CardHeader>
              <CardContent>
                <GradeDistributionChart
                  data={mockReportData.gradeDistribution}
                  height={350}
                  options={{
                    plugins: {
                      tooltip: {
                        callbacks: {
                          label: (ctx: any) => `${ctx.parsed.y} students`,
                        },
                      },
                    },
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-heading-md">Assessment-Level Distributions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {['Midterm', 'Quiz 1', 'Project', 'Final'].map((title, i) => (
                    <Card key={title}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-body font-semibold">{title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <GradeDistributionChart
                          data={{
                            labels: ['A', 'B', 'C', 'D', 'F'],
                            datasets: [{
                              label: 'Count',
                              data: [
                                Math.round(Math.random() * 30 + 20),
                                Math.round(Math.random() * 40 + 30),
                                Math.round(Math.random() * 20 + 10),
                                Math.round(Math.random() * 10 + 2),
                                Math.round(Math.random() * 5),
                              ],
                              backgroundColor: [
                                'var(--color-status-success)',
                                'var(--color-brand-primary)',
                                'var(--color-status-info)',
                                'var(--color-status-warning)',
                                'var(--color-status-error)',
                              ],
                              borderRadius: 6,
                            }],
                          }}
                          height={200}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Completion Tab */}
        {reportType === 'completion' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-heading-md">Assignment Completion Rates</CardTitle>
                <CardDescription>Percentage of students who submitted each assessment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: 'Quiz 1', due: 'Jan 10', submitted: 138, total: 142 },
                    { name: 'Homework 1', due: 'Jan 12', submitted: 135, total: 142 },
                    { name: 'Midterm Exam', due: 'Jan 15', submitted: 142, total: 142 },
                    { name: 'Quiz 2', due: 'Jan 17', submitted: 130, total: 142 },
                    { name: 'Homework 2', due: 'Jan 19', submitted: 125, total: 142 },
                    { name: 'Project Proposal', due: 'Jan 25', submitted: 98, total: 142 },
                  ].map((a) => (
                    <div key={a.name} className="flex items-center gap-4">
                      <div className="w-40 font-medium text-body-sm text-semantic-text-primary">{a.name}</div>
                      <div className="flex-1 h-3 bg-semantic-bg-tertiary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-semantic-brand-primary rounded-full transition-all duration-500"
                          style={{ width: `${Math.round((a.submitted / a.total) * 100)}%` }}
                        />
                      </div>
                      <div className="w-24 text-right text-body-sm text-semantic-text-secondary">
                        {Math.round((a.submitted / a.total) * 100)}%
                      </div>
                      <div className="w-28 text-right text-caption text-semantic-text-tertiary">
                        {a.submitted}/{a.total}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-heading-md">Late Submissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { name: 'Quiz 1', late: 4, total: 142 },
                    { name: 'Homework 1', late: 7, total: 142 },
                    { name: 'Midterm Exam', late: 0, total: 142 },
                    { name: 'Quiz 2', late: 12, total: 142 },
                    { name: 'Homework 2', late: 17, total: 142 },
                    { name: 'Project Proposal', late: 44, total: 142 },
                  ].map((a) => (
                    <div key={a.name} className="flex items-center justify-between py-2 border-b border-semantic-border-primary/50 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="w-40 font-medium text-body-sm text-semantic-text-primary">{a.name}</span>
                        <Badge variant={a.late > 10 ? 'error' : a.late > 5 ? 'warning' : 'default'}>
                          {a.late} late
                        </Badge>
                      </div>
                      <span className="text-body-sm text-semantic-text-secondary">
                        {Math.round((a.late / a.total) * 100)}% of submissions
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* At-Risk Tab */}
        {reportType === 'at-risk' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-heading-md">At-Risk Students</CardTitle>
              <CardDescription>Students with grades below 60% or missing multiple assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full" role="table">
                  <thead>
                    <tr className="border-b border-semantic-border-primary bg-semantic-bg-secondary">
                      <th className="p-3 text-left text-body-sm font-semibold text-semantic-text-secondary">Student</th>
                      <th className="p-3 text-left text-body-sm font-semibold text-semantic-text-secondary">ID</th>
                      <th className="p-3 text-left text-body-sm font-semibold text-semantic-text-secondary">Class</th>
                      <th className="p-3 text-right text-body-sm font-semibold text-semantic-text-secondary">Current Grade</th>
                      <th className="p-3 text-right text-body-sm font-semibold text-semantic-text-secondary">Missed</th>
                      <th className="p-3 text-left text-body-sm font-semibold text-semantic-text-secondary">Last Active</th>
                      <th className="p-3 text-right text-body-sm font-semibold text-semantic-text-secondary">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-semantic-border-primary">
                    {mockReportData.atRiskStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-semantic-bg-secondary/50">
                        <td className="p-3 font-medium text-body-sm text-semantic-text-primary">{student.name}</td>
                        <td className="p-3 font-mono text-body-sm text-semantic-text-secondary">{student.id}</td>
                        <td className="p-3 text-body-sm text-semantic-text-secondary">{student.class}</td>
                        <td className="p-3 text-right">
                          <Badge variant="default" className="text-rose-600 bg-rose-50">
                            {student.grade}%
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <Badge variant={student.missed > 3 ? 'error' : 'warning'}>
                            {student.missed} assignments
                          </Badge>
                        </td>
                        <td className="p-3 text-body-sm text-semantic-text-secondary">{formatDate(student.lastActive)}</td>
                        <td className="p-3 text-right">
                          <Button variant="ghost" size="sm">Message</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}