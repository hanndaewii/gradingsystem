'use client';

import { useState } from 'react';
import { 
  Download, 
  FileText, 
  Users, 
  GraduationCap, 
  BarChart2,
  Filter,
  Calendar,
  Eye,
  Settings,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Loader2
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
import { Modal } from '@/components/ui/Modal';
import { Progress } from '@/components/ui/Progress';
import { GradeDistributionChart } from '@/components/ui/GradeDistributionChart';
import { GPATrendChart } from '@/components/ui/GPATrendChart';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  roles: ('professor' | 'staff' | 'admin' | 'student')[];
}

interface GeneratedReport {
  id: string;
  name: string;
  template: string;
  generatedAt: string;
  generatedBy: string;
  status: 'completed' | 'processing' | 'failed';
  format: 'pdf' | 'excel' | 'csv';
  size?: string;
  downloadUrl?: string;
}

const reportTemplates: ReportTemplate[] = [
  { id: 'transcript', name: 'Official Transcript', description: 'Complete academic transcript with all courses, grades, and GPA', icon: <FileText className="w-5 h-5" />, roles: ['staff', 'admin', 'student'] },
  { id: 'grade-report', name: 'Grade Report', description: 'Term grade report for a specific student or section', icon: <BarChart2 className="w-5 h-5" />, roles: ['professor', 'staff', 'admin', 'student'] },
  { id: 'class-roster', name: 'Class Roster', description: 'Student roster with contact info and enrollment status', icon: <Users className="w-5 h-5" />, roles: ['professor', 'staff', 'admin'] },
  { id: 'enrollment-verification', name: 'Enrollment Verification', description: 'Official verification of student enrollment status', icon: <GraduationCap className="w-5 h-5" />, roles: ['staff', 'admin', 'student'] },
  { id: 'grade-distribution', name: 'Grade Distribution Report', description: 'Statistical analysis of grade distributions across sections', icon: <BarChart2 className="w-5 h-5" />, roles: ['professor', 'staff', 'admin'] },
  { id: 'completion-report', name: 'Course Completion Report', description: 'Completion rates, drop/withdrawal statistics', icon: <FileText className="w-5 h-5" />, roles: ['staff', 'admin'] },
];

const mockGeneratedReports: GeneratedReport[] = [
  { id: '1', name: 'Transcript - Maria Santos (2021-00123)', template: 'transcript', generatedAt: '2024-01-15 09:30', generatedBy: 'Maria Santos (Staff)', status: 'completed', format: 'pdf', size: '245 KB', downloadUrl: '#' },
  { id: '2', name: 'Grade Report - BUSAD 301 Section A', template: 'grade-report', generatedAt: '2024-01-14 16:45', generatedBy: 'Dr. Reyes (Professor)', status: 'completed', format: 'pdf', size: '180 KB', downloadUrl: '#' },
  { id: '3', name: 'Class Roster - ECON 101 Section A', template: 'class-roster', generatedAt: '2024-01-14 14:20', generatedBy: 'Dr. Santos (Professor)', status: 'completed', format: 'excel', size: '95 KB', downloadUrl: '#' },
  { id: '4', name: 'Enrollment Verification - Juan Dela Cruz', template: 'enrollment-verification', generatedAt: '2024-01-13 11:10', generatedBy: 'Staff User', status: 'completed', format: 'pdf', size: '120 KB', downloadUrl: '#' },
  { id: '5', name: 'Grade Distribution - Fall 2024', template: 'grade-distribution', generatedAt: '2024-01-12 10:00', generatedBy: 'Admin User', status: 'completed', format: 'pdf', size: '1.2 MB', downloadUrl: '#' },
  { id: '6', name: 'Course Completion - Fall 2024', template: 'completion-report', generatedAt: '2024-01-11 09:00', generatedBy: 'Admin User', status: 'failed', format: 'pdf', size: '0 KB' },
];

const gradeDistData = [
  { label: '1.00 - 1.25', count: 234 },
  { label: '1.50 - 1.75', count: 456 },
  { label: '2.00 - 2.25', count: 678 },
  { label: '2.50 - 2.75', count: 890 },
  { label: '3.00', count: 567 },
  { label: '5.00 (Fail)', count: 123 },
];

const gpaTrendData = [
  { label: 'Fall 2022', gpa: 2.45 },
  { label: 'Spring 2023', gpa: 2.52 },
  { label: 'Fall 2023', gpa: 2.48 },
  { label: 'Spring 2024', gpa: 2.55 },
  { label: 'Fall 2024', gpa: 2.61 },
];

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'templates' | 'generated' | 'builder'>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [reportFilters, setReportFilters] = useState({
    term: 'fall-2024',
    course: '',
    section: '',
    student: '',
    format: 'pdf',
  });

  const handleGenerate = (templateId: string) => {
    const template = reportTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      setGeneratingReport(templateId);
      setGenerationProgress(0);
      
      // Simulate generation
      const interval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            setTimeout(() => {
              setGeneratingReport(null);
              setGenerationProgress(100);
              setSelectedTemplate(null);
            }, 500);
            return 100;
          }
          return prev + Math.random() * 15;
        });
      }, 200);
    }
  };

  return (
    <div className="space-y-6">
      <div className="equal-edges">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-display-sm font-semibold text-gray-900 dark:text-gray-100">Reports & Transcripts</h1>
            <p className="text-body text-gray-500 dark:text-gray-400 mt-1">Generate official transcripts, grade reports, and academic documents</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline"><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates">Report Templates</TabsTrigger>
          <TabsTrigger value="generated">Generated Reports</TabsTrigger>
          <TabsTrigger value="builder">Custom Report</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <div className="equal-edges grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportTemplates.map((template) => (
              <Card 
                key={template.id} 
                className="card-hover relative overflow-hidden"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-primary/10 text-primary rounded-lg">{template.icon}</div>
                    <div className="flex gap-1">
                      {template.roles.map(role => (
                        <Badge key={role} variant="outline" className="text-xs">{role}</Badge>
                      ))}
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{template.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{template.description}</p>
                  <Button 
                    className="w-full" 
                    onClick={() => handleGenerate(template.id)}
                    disabled={!!generatingReport}
                  >
                    {generatingReport === template.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      'Generate Report'
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Preview Charts */}
          <div className="equal-edges grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sample Grade Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <GradeDistributionChart
                  data={gradeDistData}
                  height={300}
                  horizontal
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sample GPA Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <GPATrendChart
                  data={gpaTrendData}
                  height={300}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="generated" className="space-y-4">
          <div className="equal-edges flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1 min-w-[250px]">
              <Input placeholder="Search reports..." icon={<Search className="w-4 h-4" />} />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="All Formats" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Formats</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="equal-edges">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left p-4 font-medium text-gray-500">Report Name</th>
                      <th className="text-left p-4 font-medium text-gray-500">Template</th>
                      <th className="text-left p-4 font-medium text-gray-500">Generated</th>
                      <th className="text-left p-4 font-medium text-gray-500">Generated By</th>
                      <th className="text-left p-4 font-medium text-gray-500">Status</th>
                      <th className="text-left p-4 font-medium text-gray-500">Format</th>
                      <th className="text-left p-4 font-medium text-gray-500">Size</th>
                      <th className="text-left p-4 font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockGeneratedReports.map((report) => (
                      <tr key={report.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="p-4 font-medium">{report.name}</td>
                        <td className="p-4">
                          <Badge variant="outline">{report.template}</Badge>
                        </td>
                        <td className="p-4 text-sm text-gray-500">{report.generatedAt}</td>
                        <td className="p-4 text-sm text-gray-500">{report.generatedBy}</td>
                        <td className="p-4">
                          <Badge variant={
                            report.status === 'completed' ? 'success' :
                            report.status === 'processing' ? 'info' : 'danger'
                          }>
                            {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                          </Badge>
                        </td>
                        <td className="p-4 text-uppercase text-sm font-mono">{report.format}</td>
                        <td className="p-4 text-sm text-gray-500">{report.size}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {report.status === 'completed' && report.downloadUrl && (
                              <Button variant="ghost" size="icon" onClick={() => window.open(report.downloadUrl, '_blank')}><Download className="w-4 h-4" /></Button>
                            )}
                            <Button variant="ghost" size="icon"><Eye className="w-4 h-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="builder" className="space-y-6">
          <Card className="equal-edges">
            <CardHeader>
              <CardTitle>Custom Report Builder</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Report Type</label>
                    <Select defaultValue="transcript">
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="transcript">Student Transcript</SelectItem>
                        <SelectItem value="grade-report">Grade Report</SelectItem>
                        <SelectItem value="class-roster">Class Roster</SelectItem>
                        <SelectItem value="enrollment-verification">Enrollment Verification</SelectItem>
                        <SelectItem value="grade-distribution">Grade Distribution</SelectItem>
                        <SelectItem value="completion-report">Completion Report</SelectItem>
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Course (optional)</label>
                    <Input placeholder="e.g., BUSAD 301" value={reportFilters.course} onChange={(e) => setReportFilters(prev => ({ ...prev, course: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Section (optional)</label>
                    <Input placeholder="e.g., A" value={reportFilters.section} onChange={(e) => setReportFilters(prev => ({ ...prev, section: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Student (for individual reports)</label>
                    <Input placeholder="Student ID or Name" value={reportFilters.student} onChange={(e) => setReportFilters(prev => ({ ...prev, student: e.target.value }))} />
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
                  <div className="pt-4 border-t space-y-2">
                    <Button className="w-full" size="lg"><Download className="w-4 h-4 mr-2" />Generate Report</Button>
                    <Button className="w-full" variant="outline"><Eye className="w-4 h-4 mr-2" />Preview</Button>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Report Preview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="aspect-video bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                        <div className="text-center p-8">
                          <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                          <p className="text-gray-500 dark:text-gray-400">Select parameters and click Preview to see a sample report</p>
                          <p className="text-sm text-gray-400 mt-2">Report will include CWPC branding, official seal, and digital signature</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <GradeDistributionChart
                          data={gradeDistData}
                          height={250}
                          horizontal
                        />
                        <GPATrendChart
                          data={gpaTrendData}
                          height={250}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Generation Progress Modal */}
      <Modal open={!!generatingReport} onOpenChange={() => {}} title="Generating Report" size="md">
        {selectedTemplate && (
          <div className="space-y-4 text-center">
            <div className="p-3 bg-primary/10 text-primary rounded-full w-12 h-12 mx-auto flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <h3 className="font-medium">{selectedTemplate.name}</h3>
            <p className="text-sm text-gray-500">Preparing your report...</p>
            <Progress value={generationProgress} showLabel className="max-w-md mx-auto" />
            <p className="text-xs text-gray-400">This may take a few moments for large reports</p>
          </div>
        )}
      </Modal>
    </div>
  );
}