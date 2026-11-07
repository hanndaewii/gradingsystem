'use client';

import { useState } from 'react';
import { 
  Download, 
  Filter, 
  Calendar,
  BarChart2,
  Users,
  FileText,
  Building2,
  GraduationCap,
  TrendingUp,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardFooter 
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { EnrollmentChart } from '@/components/ui/EnrollmentChart';
import { GradeDistributionChart } from '@/components/ui/GradeDistributionChart';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'enrollment' | 'grades' | 'capacity' | 'demographics';
}

const reportTemplates: ReportTemplate[] = [
  { id: 'enrollment-by-course', name: 'Enrollment by Course', description: 'Student enrollment counts per course with capacity utilization', icon: <BookOpen className="w-5 h-5" />, category: 'enrollment' },
  { id: 'enrollment-by-professor', name: 'Enrollment by Professor', description: 'Teaching loads and section assignments per faculty member', icon: <Users className="w-5 h-5" />, category: 'enrollment' },
  { id: 'enrollment-by-term', name: 'Enrollment by Term', description: 'Term-over-term enrollment trends and comparisons', icon: <Calendar className="w-5 h-5" />, category: 'enrollment' },
  { id: 'capacity-utilization', name: 'Capacity Utilization', description: 'Section fill rates, waitlist analysis, and room optimization', icon: <Building2 className="w-5 h-5" />, category: 'capacity' },
  { id: 'grade-distribution', name: 'Grade Distribution', description: 'Grade distributions across courses, sections, and terms', icon: <BarChart2 className="w-5 h-5" />, category: 'grades' },
  { id: 'student-demographics', name: 'Student Demographics', description: 'Enrollment breakdown by program, year level, and status', icon: <GraduationCap className="w-5 h-5" />, category: 'demographics' },
  { id: 'at-risk-students', name: 'At-Risk Students', description: 'Students with low grades, excessive absences, or probation status', icon: <TrendingUp className="w-5 h-5" />, category: 'grades' },
  { id: 'completion-rates', name: 'Course Completion Rates', description: 'Drop/withdrawal rates and completion statistics', icon: <FileText className="w-5 h-5" />, category: 'enrollment' },
];

const enrollmentByCourseData = [
  { label: 'BUSAD 101', enrolled: 156, capacity: 160 },
  { label: 'ECON 101', enrolled: 203, capacity: 225 },
  { label: 'BUSAD 301', enrolled: 98, capacity: 120 },
  { label: 'ACCT 201', enrolled: 167, capacity: 160 },
  { label: 'MGMT 401', enrolled: 67, capacity: 70 },
  { label: 'MKTG 301', enrolled: 124, capacity: 120 },
  { label: 'FIN 401', enrolled: 78, capacity: 60 },
  { label: 'ECON 201', enrolled: 112, capacity: 135 },
];

const gradeDistributionData = [
  { label: '1.00 - 1.25', count: 234 },
  { label: '1.50 - 1.75', count: 456 },
  { label: '2.00 - 2.25', count: 678 },
  { label: '2.50 - 2.75', count: 890 },
  { label: '3.00', count: 567 },
  { label: '5.00 (Fail)', count: 123 },
];

const enrollmentTrendData = [
  { label: 'Fall 2022', enrolled: 11200 },
  { label: 'Spring 2023', enrolled: 10800 },
  { label: 'Fall 2023', enrolled: 11500 },
  { label: 'Spring 2024', enrolled: 11100 },
  { label: 'Fall 2024', enrolled: 12847 },
];

export function StaffReportsPage() {
  const [activeTab, setActiveTab] = useState<'templates' | 'builder' | 'scheduled'>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [reportFilters, setReportFilters] = useState({
    term: 'fall-2024',
    department: 'all',
    format: 'pdf',
  });

  return (
    <div className="space-y-6">
      <div className="equal-edges">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-display-sm font-semibold text-gray-900 dark:text-gray-100">Reports & Analytics</h1>
            <p className="text-body text-gray-500 dark:text-gray-400 mt-1">Generate and schedule enrollment, grade, and capacity reports</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline"><RefreshCw className="w-4 h-4 mr-2" />Refresh Data</Button>
            <Button variant="outline"><Download className="w-4 h-4 mr-2" />Export All</Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="equal-edges">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates">Report Templates</TabsTrigger>
          <TabsTrigger value="builder">Custom Report</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {reportTemplates.map((template) => (
              <Card 
                key={template.id} 
                className="card-hover cursor-pointer relative overflow-hidden"
                onClick={() => setSelectedTemplate(template.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-primary/10 text-primary rounded-lg">{template.icon}</div>
                    <Badge variant="outline" className="text-xs">{template.category}</Badge>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{template.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{template.description}</p>
                </CardContent>
                <CardFooter className="pt-0 pb-4 px-6">
                  <Button className="w-full" variant="outline" size="sm">Generate Report</Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Enrollment by Course (Fall 2024)</CardTitle>
              </CardHeader>
              <CardContent>
                <EnrollmentChart
                  data={enrollmentByCourseData}
                  xKey="label"
                  yKeys={['enrolled', 'capacity']}
                  labels={['Enrolled', 'Capacity']}
                  colors={['var(--color-primary)', 'var(--color-gray-300)']}
                  height={300}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Grade Distribution (All Courses)</CardTitle>
              </CardHeader>
              <CardContent>
                <GradeDistributionChart
                  data={gradeDistributionData}
                  height={300}
                  horizontal
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Enrollment Trend (5 Terms)</CardTitle>
            </CardHeader>
            <CardContent>
              <EnrollmentChart
                data={enrollmentTrendData}
                xKey="label"
                yKeys={['enrolled']}
                labels={['Total Enrollment']}
                colors={['var(--color-primary)']}
                height={250}
                type="line"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="builder" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Custom Report Builder</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Report Type</label>
                    <Select defaultValue="enrollment">
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="enrollment">Enrollment Report</SelectItem>
                        <SelectItem value="grades">Grade Report</SelectItem>
                        <SelectItem value="capacity">Capacity Report</SelectItem>
                        <SelectItem value="demographics">Demographics Report</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Academic Term</label>
                    <Select value={reportFilters.term} onValueChange={(v) => setReportFilters(prev => ({ ...prev, term: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fall-2024">Fall 2024</SelectItem>
                        <SelectItem value="spring-2025">Spring 2025</SelectItem>
                        <SelectItem value="summer-2024">Summer 2024</SelectItem>
                        <SelectItem value="all">All Terms</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Department</label>
                    <Select value={reportFilters.department} onValueChange={(v) => setReportFilters(prev => ({ ...prev, department: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        <SelectItem value="business">Business Administration</SelectItem>
                        <SelectItem value="economics">Economics</SelectItem>
                        <SelectItem value="management">Management</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="accounting">Accounting</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Output Format</label>
                    <Select value={reportFilters.format} onValueChange={(v) => setReportFilters(prev => ({ ...prev, format: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select format" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF Document</SelectItem>
                        <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                        <SelectItem value="csv">CSV File</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Group By</label>
                    <Select defaultValue="course">
                      <SelectTrigger><SelectValue placeholder="Group by" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="course">Course</SelectItem>
                        <SelectItem value="section">Section</SelectItem>
                        <SelectItem value="professor">Professor</SelectItem>
                        <SelectItem value="program">Student Program</SelectItem>
                        <SelectItem value="year">Year Level</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="pt-4 border-t">
                    <Button className="w-full" size="lg"><Download className="w-4 h-4 mr-2" />Generate Report</Button>
                    <Button className="w-full mt-2" variant="outline"><RefreshCw className="w-4 h-4 mr-2" />Preview Data</Button>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Live Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <EnrollmentChart
                          data={enrollmentByCourseData}
                          xKey="label"
                          yKeys={['enrolled', 'capacity']}
                          labels={['Enrolled', 'Capacity']}
                          colors={['var(--color-primary)', 'var(--color-gray-300)']}
                          height={250}
                        />
                        <GradeDistributionChart
                          data={gradeDistributionData}
                          height={250}
                          horizontal
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Scheduled Reports</CardTitle>
              <Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-2" />Schedule New</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'Weekly Enrollment Summary', frequency: 'Weekly (Mondays 8:00 AM)', recipients: 'Registrar, Dean', lastRun: '2024-01-15', nextRun: '2024-01-22', status: 'active' },
                  { name: 'Monthly Grade Distribution', frequency: 'Monthly (1st of month)', recipients: 'Department Heads', lastRun: '2024-01-01', nextRun: '2024-02-01', status: 'active' },
                  { name: 'Term-End Capacity Report', frequency: 'End of Term', recipients: 'Registrar, Facilities', lastRun: '2023-12-15', nextRun: '2024-05-30', status: 'pending' },
                  { name: 'At-Risk Student Alert', frequency: 'Daily (Weekdays 9:00 AM)', recipients: 'Academic Advisors', lastRun: '2024-01-15', nextRun: '2024-01-16', status: 'active' },
                ].map((report, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">{report.name}</h4>
                      <div className="flex flex-wrap gap-4 mt-1 text-sm text-gray-500">
                        <span><strong>Frequency:</strong> {report.frequency}</span>
                        <span><strong>Recipients:</strong> {report.recipients}</span>
                        <span><strong>Last Run:</strong> {report.lastRun}</span>
                        <span><strong>Next Run:</strong> {report.nextRun}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={report.status === 'active' ? 'success' : 'warning'}>{report.status}</Badge>
                      <Button variant="ghost" size="icon"><ChevronDown className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}