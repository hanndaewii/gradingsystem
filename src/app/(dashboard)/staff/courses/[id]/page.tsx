'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Users, Calendar, Clock, AlertTriangle, CheckCircle, MoreHorizontal, Edit, Trash2, Copy, Plus, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/DropdownMenu';
import { DataTable, columnHelper } from '@/components/ui/DataTable';
import { CourseSectionForm } from '@/components/staff/CourseSectionForm';
import { formatRelativeTime, cn } from '@/lib/utils';

interface CourseDetail {
  id: string;
  code: string;
  name: string;
  department: string;
  credits: number;
  description: string;
  prerequisites: string[];
  corequisites: string[];
  status: 'active' | 'archived' | 'draft';
  learningOutcomes: string[];
  syllabusUrl?: string;
  terms: Array<{
    id: string;
    term: string;
    sectionCount: number;
    totalEnrollments: number;
    avgEnrollment: number;
    capacityUtilization: number;
  }>;
  sections: Array<{
    id: string;
    code: string;
    term: string;
    professor: string;
    schedule: string;
    location: string;
    capacity: number;
    enrolled: number;
    waitlisted: number;
    status: 'open' | 'closed' | 'cancelled';
  }>;
  curriculumMapping: Array<{
    program: string;
    requirement: string;
    category: string;
  }>;
}

const mockCourse: CourseDetail = {
  id: '1',
  code: 'CS 301',
  name: 'Database Systems',
  department: 'Computer Science',
  credits: 3,
  description: 'Relational database design, SQL, normalization, transaction management, and database administration. Covers both theoretical foundations and practical applications.',
  prerequisites: ['CS 201'],
  corequisites: [],
  status: 'active',
  learningOutcomes: [
    'Design and normalize relational databases to 3NF',
    'Write complex SQL queries including joins, subqueries, and aggregations',
    'Implement database transactions with proper ACID properties',
    'Design and implement database indexes for performance optimization',
    'Administer database users, permissions, and backup/recovery procedures',
  ],
  syllabusUrl: '/syllabi/cs301-fall2024.pdf',
  terms: [
    { id: '1', term: 'Fall 2024', sectionCount: 3, totalEnrollments: 112, avgEnrollment: 37, capacityUtilization: 93 },
    { id: '2', term: 'Spring 2024', sectionCount: 2, totalEnrollments: 78, avgEnrollment: 39, capacityUtilization: 98 },
    { id: '3', term: 'Fall 2023', sectionCount: 2, totalEnrollments: 72, avgEnrollment: 36, capacityUtilization: 90 },
    { id: '4', term: 'Spring 2023', sectionCount: 1, totalEnrollments: 38, avgEnrollment: 38, capacityUtilization: 95 },
    { id: '5', term: 'Fall 2022', sectionCount: 1, totalEnrollments: 35, avgEnrollment: 35, capacityUtilization: 88 },
  ],
  sections: [
    { id: 'sec-1', code: 'CS 301-A', term: 'Fall 2024', professor: 'Dr. Sarah Chen', schedule: 'Mon/Wed 10:00-11:15 AM', location: 'Engineering Hall 204', capacity: 40, enrolled: 38, waitlisted: 5, status: 'open' },
    { id: 'sec-2', code: 'CS 301-B', term: 'Fall 2024', professor: 'Dr. Michael Torres', schedule: 'Tue/Thu 2:00-3:15 PM', location: 'Science Building 101', capacity: 35, enrolled: 35, waitlisted: 8, status: 'closed' },
    { id: 'sec-3', code: 'CS 301-C', term: 'Fall 2024', professor: 'Dr. Lisa Park', schedule: 'Mon/Wed/Fri 9:00-9:50 AM', location: 'Engineering Hall 205', capacity: 40, enrolled: 39, waitlisted: 2, status: 'open' },
    { id: 'sec-4', code: 'CS 301-A', term: 'Spring 2024', professor: 'Dr. Sarah Chen', schedule: 'Mon/Wed 10:00-11:15 AM', location: 'Engineering Hall 204', capacity: 40, enrolled: 40, waitlisted: 12, status: 'closed' },
    { id: 'sec-5', code: 'CS 301-B', term: 'Spring 2024', professor: 'Dr. James Wilson', schedule: 'Tue/Thu 1:00-2:15 PM', location: 'Science Building 102', capacity: 38, enrolled: 38, waitlisted: 5, status: 'closed' },
  ],
  curriculumMapping: [
    { program: 'BS Computer Science', requirement: 'Core', category: 'Systems' },
    { program: 'BS Data Science', requirement: 'Core', category: 'Data Management' },
    { program: 'BA Computer Science', requirement: 'Elective', category: 'Advanced Systems' },
    { program: 'Minor in Computer Science', requirement: 'Elective', category: 'Upper Division' },
  ],
};

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.id as string;
  const course = mockCourse;
  const [activeTab, setActiveTab] = React.useState<'overview' | 'sections' | 'prerequisites' | 'curriculum'>('overview');
  const [showCreateSection, setShowCreateSection] = React.useState(false);
  const [editingSection, setEditingSection] = React.useState<typeof course.sections[0] | null>(null);

  const statusConfig = {
    active: { label: 'Active', variant: 'success' as const, icon: BookOpen },
    archived: { label: 'Archived', variant: 'default' as const, icon: FileText },
    draft: { label: 'Draft', variant: 'warning' as const, icon: AlertTriangle },
  };

  const sectionStatusConfig = {
    open: { label: 'Open', variant: 'success' as const },
    closed: { label: 'Full', variant: 'error' as const },
    cancelled: { label: 'Cancelled', variant: 'default' as const },
  };

  const config = statusConfig[course.status];

  return (
    <div className="min-h-screen bg-semantic-bg-primary">
      {/* Header */}
      <header className="border-b border-semantic-border-primary bg-semantic-bg-secondary/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container equal-edges">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
            <div className="flex items-center gap-4">
              <Link href="/staff/courses" className="p-2 rounded-lg hover:bg-semantic-bg-tertiary transition-colors">
                <ArrowLeft className="h-5 w-5 text-semantic-text-secondary" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-display-sm font-semibold text-semantic-text-primary">{course.code}</h1>
                  <Badge variant={config.variant} className="gap-1">
                    <config.icon className="h-3 w-3" />
                    {config.label}
                  </Badge>
                </div>
                <p className="text-body-sm text-semantic-text-secondary">{course.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowCreateSection(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Section
              </Button>
              <Button variant="primary" size="sm" onClick={() => {}} className="gap-2">
                <Edit className="h-4 w-4" />
                Edit Course
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {}} className="gap-2">
                    <Copy className="h-4 w-4" />
                    Clone to Term
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {}} className="gap-2">
                    <Download className="h-4 w-4" />
                    Export Course Data
                  </DropdownMenuItem>
                  {course.syllabusUrl && (
                    <DropdownMenuItem onClick={() => {}} className="gap-2">
                      <FileText className="h-4 w-4" />
                      View Syllabus
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {}} className="gap-2 text-semantic-status-error">
                    <Trash2 className="h-4 w-4" />
                    Archive Course
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="container equal-edges py-6 section-spacing">
        {/* Course Header Info */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-heading-md">Course Description</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-body text-semantic-text-secondary">{course.description}</p>
              
              <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-semantic-border-primary">
                <div>
                  <p className="text-caption text-semantic-text-tertiary">Department</p>
                  <p className="font-medium text-semantic-text-primary">{course.department}</p>
                </div>
                <div>
                  <p className="text-caption text-semantic-text-tertiary">Credits</p>
                  <p className="font-medium text-semantic-text-primary">{course.credits}</p>
                </div>
              </div>

              {course.prerequisites.length > 0 && (
                <div>
                  <p className="text-caption text-semantic-text-tertiary">Prerequisites</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {course.prerequisites.map(p => (
                      <Badge key={p} variant="default" className="gap-1">
                        <BookOpen className="h-3 w-3" />
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {course.corequisites.length > 0 && (
                <div>
                  <p className="text-caption text-semantic-text-tertiary">Corequisites</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {course.corequisites.map(c => (
                      <Badge key={c} variant="info" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-caption text-semantic-text-tertiary">Learning Outcomes</p>
                <ul className="mt-2 space-y-1 list-disc list-inside text-body-sm text-semantic-text-secondary">
                  {course.learningOutcomes.map((outcome, i) => (
                    <li key={i}>{outcome}</li>
                  ))}
                </ul>
              </div>
            </CardContent          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-heading-md">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-semantic-bg-secondary rounded-lg">
                <p className="text-caption text-semantic-text-tertiary">Total Terms Offered</p>
                <p className="text-heading-xl font-bold text-semantic-text-primary">{course.terms.length}</p>
              </div>
              <div className="p-4 bg-semantic-bg-secondary rounded-lg">
                <p className="text-caption text-semantic-text-tertiary">Active Sections</p>
                <p className="text-heading-xl font-bold text-semantic-text-primary">
                  {course.sections.filter(s => s.status === 'open').length}
                </p>
              </div>
              <div className="p-4 bg-semantic-bg-secondary rounded-lg">
                <p className="text-caption text-semantic-text-tertiary">Current Enrollment</p>
                <p className="text-heading-xl font-bold text-semantic-text-primary">
                  {course.sections.reduce((sum, s) => sum + s.enrolled, 0)}
                </p>
              </div>
              <div className="p-4 bg-semantic-bg-secondary rounded-lg">
                <p className="text-caption text-semantic-text-tertiary">Total Waitlisted</p>
                <p className="text-heading-xl font-bold text-semantic-status-warning">
                  {course.sections.reduce((sum, s) => sum + s.waitlisted, 0)}
                </p>
              </div>
              <div className="p-4 bg-semantic-bg-secondary rounded-lg">
                <p className="text-caption text-semantic-text-tertiary">Avg Capacity Utilization</p>
                <p className="text-heading-xl font-bold text-semantic-brand-primary">
                  {Math.round(course.sections.reduce((sum, s) => sum + (s.enrolled / s.capacity) * 100, 0) / course.sections.length)}%
                </p>
              </div>
              <div className="p-4 bg-semantic-bg-secondary rounded-lg">
                <p className="text-caption text-semantic-text-tertiary">Programs Mapped</p>
                <p className="text-heading-xl font-bold text-semantic-text-primary">{course.curriculumMapping.length}</p>
              </div>
            </CardContent          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full md:w-auto mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sections">Sections ({course.sections.length})</TabsTrigger>
            <TabsTrigger value="prerequisites">Prerequisites</TabsTrigger>
            <TabsTrigger value="curriculum">Curriculum Mapping</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Enrollment Trends */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-heading-md">Enrollment Trends by Term</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  columns={[
                    columnHelper.accessor('term', { header: 'Term', cell: info => info.getValue() as string }),
                    columnHelper.accessor('sectionCount', { header: 'Sections', cell: info => info.getValue() as number }),
                    columnHelper.accessor('totalEnrollments', { header: 'Total Enrollments', cell: info => (info.getValue() as number).toLocaleString() }),
                    columnHelper.accessor('avgEnrollment', { header: 'Avg/Section', cell: info => info.getValue() as number }),
                    columnHelper.accessor('capacityUtilization', { 
                      header: 'Capacity Utilization', 
                      cell: info => {
                        const val = info.getValue() as number;
                        return (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-semantic-bg-tertiary rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-semantic-brand-primary rounded-full transition-all" 
                                style={{ width: `${val}%` }}
                              />
                            </div>
                            <span className="text-body-sm font-medium text-semantic-text-primary w-16 text-right">{val}%</span>
                          </div>
                        );
                      }
                    }),
                  ]}
                  data={course.terms}
                  pageSize={10}
                  showColumnVisibility={false}
                  className="rounded-none"
                />
              </CardContent            </Card>

            {/* Learning Outcomes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-heading-md">Learning Outcomes</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {course.learningOutcomes.map((outcome, i) => (
                    <li key={i} className="flex items-start gap-3 p-3 bg-semantic-bg-secondary rounded-lg">
                      <CheckCircle className="h-5 w-5 text-semantic-status-success flex-shrink-0 mt-0.5" />
                      <span className="text-body text-semantic-text-primary">{outcome}</span>
                    </li>
                  ))}
                </ul>
              </CardContent            </Card>
          </TabsContent>

          <TabsContent value="sections" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-heading-md">Course Sections</CardTitle>
                  <CardDescription>All sections across terms</CardDescription>
                </div>
                <Button variant="primary" size="sm" onClick={() => setShowCreateSection(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Section
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  columns={[
                    columnHelper.accessor('code', { header: 'Section', cell: info => <span className="font-mono font-medium">{info.getValue()}</span>, size: 120 }),
                    columnHelper.accessor('term', { header: 'Term', cell: info => info.getValue() as string, size: 120 }),
                    columnHelper.accessor('professor', { header: 'Professor', cell: info => info.getValue() as string, size: 180 }),
                    columnHelper.accessor('schedule', { header: 'Schedule', cell: info => info.getValue() as string, size: 180 }),
                    columnHelper.accessor('location', { header: 'Location', cell: info => info.getValue() as string, size: 180 }),
                    columnHelper.accessor('capacity', { header: 'Capacity', cell: info => info.getValue() as number, size: 100 }),
                    columnHelper.accessor('enrolled', { header: 'Enrolled', cell: info => info.getValue() as number, size: 100 }),
                    columnHelper.accessor('waitlisted', { header: 'Waitlisted', cell: info => info.getValue() as number, size: 100 }),
                    columnHelper.accessor('status', { 
                      header: 'Status', 
                      cell: info => {
                        const status = info.getValue() as keyof typeof sectionStatusConfig;
                        const config = sectionStatusConfig[status];
                        return <Badge variant={config.variant}>{config.label}</Badge>;
                      },
                      size: 100,
                    }),
                    columnHelper.display({
                      id: 'actions',
                      header: 'Actions',
                      cell: ({ row }) => (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingSection(row.original)} className="gap-2">
                              <Edit className="h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {}} className="gap-2">
                              <Users className="h-4 w-4" />
                              View Roster
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {}} className="gap-2">
                              <Clock className="h-4 w-4" />
                              View Waitlist
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {row.original.status === 'open' && (
                              <DropdownMenuItem onClick={() => {}} className="gap-2 text-semantic-status-warning">
                                Close Section
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => {}} className="gap-2 text-semantic-status-error">
                              <Trash2 className="h-4 w-4" />
                              Cancel
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ),
                      size: 100,
                    }),
                  ]}
                  data={course.sections}
                  rowKey="id"
                  pageSize={10}
                  showColumnVisibility={false}
                  className="rounded-none"
                />
              </CardContent            </Card>
          </TabsContent>

          <TabsContent value="prerequisites" className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-heading-md">Prerequisite Chain</CardTitle>
                <CardDescription>Visual representation of course prerequisites</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Prerequisite Tree */}
                  <div className="p-4 bg-semantic-bg-secondary rounded-lg">
                    <p className="font-medium text-semantic-text-primary mb-4">Prerequisite Flow for {course.code}</p>
                    <div className="flex flex-col sm:flex-row items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-semantic-border-primary min-w-[150px] text-center">
                        <Badge variant="default">MATH 101</Badge>
                        <p className="text-caption text-semantic-text-tertiary mt-1">Calculus I</p>
                      </div>
                      <span className="text-semantic-text-tertiary">→</span>
                      <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-semantic-border-primary min-w-[150px] text-center">
                        <Badge variant="default">CS 101</Badge>
                        <p className="text-caption text-semantic-text-tertiary mt-1">Intro to CS</p>
                      </div>
                      <span className="text-semantic-text-tertiary">→</span>
                      <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-semantic-border-primary min-w-[150px] text-center">
                        <Badge variant="default">CS 201</Badge>
                        <p className="text-caption text-semantic-text-tertiary mt-1">Data Structures</p>
                      </div>
                      <span className="text-semantic-text-tertiary">→</span>
                      <div className="flex items-center gap-2 p-3 bg-semantic-brand-primary/10 rounded-lg border border-semantic-brand-primary min-w-[150px] text-center">
                        <Badge variant="default" className="bg-semantic-brand-primary text-white">{course.code}</Badge>
                        <p className="text-caption text-semantic-text-tertiary mt-1">{course.name}</p>
                      </div>
                    </div>
                  </div>

                  {/* Prerequisites Table */}
                  <div>
                    <h4 className="font-medium text-semantic-text-primary mb-3">Direct Prerequisites</h4>
                    <DataTable
                      columns={[
                        columnHelper.accessor('course', { header: 'Course', cell: info => <span className="font-mono font-medium">{info.getValue()}</span> }),
                        columnHelper.accessor('name', { header: 'Course Name', cell: info => info.getValue() as string }),
                        columnHelper.accessor('type', { header: 'Type', cell: info => <Badge variant="default">{info.getValue()}</Badge> }),
                        columnHelper.accessor('minGrade', { header: 'Min Grade', cell: info => <span className="font-mono">{info.getValue()}</span> }),
                        columnHelper.accessor('overrideable', { 
                          header: 'Override Allowed', 
                          cell: info => info.getValue() ? (
                            <Badge variant="success" className="gap-1"><CheckCircle className="h-3 w-3" /> Yes</Badge>
                          ) : (
                            <Badge variant="error" className="gap-1"><AlertTriangle className="h-3 w-3" /> No</Badge>
                          )
                        }),
                      ]}
                      data={[
                        { id: '1', course: 'CS 201', name: 'Data Structures & Algorithms', type: 'Direct', minGrade: 'C-', overrideable: true },
                        { id: '2', course: 'MATH 101', name: 'Calculus I', type: 'Indirect (via CS 201)', minGrade: 'C-', overrideable: false },
                      ]}
                      pageSize={10}
                      showColumnVisibility={false}
                      className="rounded-none"
                    />
                  </div>

                  {/* Courses that require this course */}
                  <div>
                    <h4 className="font-medium text-semantic-text-primary mb-3">Courses Requiring {course.code}</h4>
                    <DataTable
                      columns={[
                        columnHelper.accessor('course', { header: 'Course', cell: info => <span className="font-mono font-medium">{info.getValue()}</span> }),
                        columnHelper.accessor('name', { header: 'Course Name', cell: info => info.getValue() as string }),
                        columnHelper.accessor('relationship', { header: 'Relationship', cell: info => <Badge variant="default">{info.getValue()}</Badge> }),
                      ]}
                      data={[
                        { id: '1', course: 'CS 401', name: 'Software Engineering', relationship: 'Direct Prerequisite' },
                        { id: '2', course: 'CS 450', name: 'Advanced Database Systems', relationship: 'Direct Prerequisite' },
                        { id: '3', course: 'CS 480', name: 'Distributed Systems', relationship: 'Recommended' },
                      ]}
                      pageSize={10}
                      showColumnVisibility={false}
                      className="rounded-none"
                    />
                  </div>
                </div>
              </CardContent            </Card>
          </TabsContent>

          <TabsContent value="curriculum" className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-heading-md">Curriculum Mapping</CardTitle>
                <CardDescription>How this course maps to degree programs and requirements</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    columnHelper.accessor('program', { header: 'Program', cell: info => info.getValue() as string }),
                    columnHelper.accessor('requirement', { header: 'Requirement Type', cell: info => <Badge variant="default">{info.getValue()}</Badge> }),
                    columnHelper.accessor('category', { header: 'Category', cell: info => info.getValue() as string }),
                  ]}
                  data={course.curriculumMapping}
                  pageSize={10}
                  showColumnVisibility={false}
                  className="rounded-none"
                />
              </CardContent            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-heading-md">Degree Audit Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-4 bg-semantic-bg-secondary rounded-lg">
                    <h4 className="font-medium text-semantic-text-primary mb-2">BS Computer Science - Core Requirement</h4>
                    <p className="text-body-sm text-semantic-text-secondary">This course satisfies the "Systems" core requirement for the BS in Computer Science. Students must complete with a grade of C- or better.</p>
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <Badge variant="success">Required</Badge>
                      <Badge variant="default">Category: Systems</Badge>
                      <Badge variant="info">Min Grade: C-</Badge>
                    </div>
                  </div>
                  <div className="p-4 bg-semantic-bg-secondary rounded-lg">
                    <h4 className="font-medium text-semantic-text-primary mb-2">BS Data Science - Core Requirement</h4>
                    <p className="text-body-sm text-semantic-text-secondary">This course satisfies the "Data Management" core requirement for the BS in Data Science.</p>
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <Badge variant="success">Required</Badge>
                      <Badge variant="default">Category: Data Management</Badge>
                      <Badge variant="info">Min Grade: C-</Badge>
                    </div>
                  </div>
                  <div className="p-4 bg-semantic-bg-secondary rounded-lg">
                    <h4 className="font-medium text-semantic-text-primary mb-2">BA Computer Science - Upper Division Elective</h4>
                    <p className="text-body-sm text-semantic-text-secondary">This course counts as an upper-division elective in the "Advanced Systems" category for the BA in Computer Science.</p>
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <Badge variant="info">Elective</Badge>
                      <Badge variant="default">Category: Advanced Systems</Badge>
                    </div>
                  </div>
                </div>
              </CardContent            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Modals */}
      {showCreateSection && (
        <CourseSectionForm
          mode="create"
          type="section"
          courseId={course.id}
          onClose={() => setShowCreateSection(false)}
          onSubmit={() => setShowCreateSection(false)}
        />
      )}
      {editingSection && (
        <CourseSectionForm
          mode="edit"
          type="section"
          courseId={course.id}
          initialData={editingSection}
          onClose={() => setEditingSection(null)}
          onSubmit={() => setEditingSection(null)}
        />
      )}
    </div>
  );
}