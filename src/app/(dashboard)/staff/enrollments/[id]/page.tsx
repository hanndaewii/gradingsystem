'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, BookOpen, Calendar, Clock, AlertTriangle, CheckCircle, XCircle, FileText, History, MessageSquare, Download, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/DropdownMenu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { DataTable, columnHelper } from '@/components/ui/DataTable';
import { formatDate, formatDateTime, formatRelativeTime, cn } from '@/lib/utils';

interface EnrollmentDetail {
  id: string;
  student: {
    id: string;
    studentNumber: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    major: string;
    year: string;
    advisor: string;
    avatar?: string;
  };
  course: {
    code: string;
    name: string;
    credits: number;
    department: string;
  };
  section: {
    id: string;
    code: string;
    term: string;
    schedule: string;
    location: string;
    professor: string;
    capacity: number;
    enrolled: number;
    waitlisted: number;
  };
  enrollment: {
    status: 'active' | 'dropped' | 'waitlisted' | 'pending' | 'completed';
    enrolledAt: string;
    droppedAt?: string;
    dropReason?: string;
    grade?: string;
    creditsEarned?: number;
    waitlistPosition?: number;
  };
  history: Array<{
    id: string;
    action: string;
    description: string;
    performedBy: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
  }>;
  notes: Array<{
    id: string;
    content: string;
    createdBy: string;
    createdAt: string;
    isPrivate: boolean;
  }>;
  classHistory: Array<{
    term: string;
    courseCode: string;
    courseName: string;
    grade: string;
    credits: number;
    status: string;
  }>;
}

const mockEnrollment: EnrollmentDetail = {
  id: 'enr-12345',
  student: {
    id: 'stu-1001',
    studentNumber: 'S20240001',
    firstName: 'Maria',
    lastName: 'Santos',
    email: 'maria.santos@university.edu',
    phone: '(555) 123-4567',
    major: 'Computer Science',
    year: 'Junior',
    advisor: 'Dr. James Wilson',
    avatar: '/avatars/student1.jpg',
  },
  course: {
    code: 'CS 301',
    name: 'Database Systems',
    credits: 3,
    department: 'Computer Science',
  },
  section: {
    id: 'sec-456',
    code: 'CS 301-A',
    term: 'Fall 2024',
    schedule: 'Mon/Wed 10:00-11:15 AM',
    location: 'Engineering Hall 204',
    professor: 'Dr. Sarah Chen',
    capacity: 40,
    enrolled: 38,
    waitlisted: 5,
  },
  enrollment: {
    status: 'active',
    enrolledAt: '2024-08-15T10:30:00Z',
    grade: 'B+',
    creditsEarned: 3,
  },
  history: [
    { id: '1', action: 'enrolled', description: 'Student enrolled in CS 301-A', performedBy: 'Registrar Office', timestamp: '2024-08-15T10:30:00Z' },
    { id: '2', action: 'waitlist_promoted', description: 'Promoted from waitlist position #3', performedBy: 'System (Auto-promotion)', timestamp: '2024-08-10T08:00:00Z' },
    { id: '3', action: 'waitlist_joined', description: 'Joined waitlist at position #3', performedBy: 'Student Portal', timestamp: '2024-08-01T14:22:00Z' },
    { id: '4', action: 'prerequisite_override', description: 'Prerequisite override approved for CS 201', performedBy: 'Dr. Johnson', timestamp: '2024-07-28T09:15:00Z', metadata: { overrideType: 'prerequisite', course: 'CS 201' } },
    { id: '5', action: 'enrollment_request', description: 'Submitted late enrollment request', performedBy: 'Maria Santos', timestamp: '2024-07-25T16:45:00Z' },
  ],
  notes: [
    { id: '1', content: 'Student requested prerequisite override for CS 201 - approved by Dr. Johnson', createdBy: 'Registrar Office', createdAt: '2024-07-28T09:20:00Z', isPrivate: false },
    { id: '2', content: 'Excellent student, strong performance in CS 101 and CS 201', createdBy: 'Dr. Sarah Chen', createdAt: '2024-09-15T11:00:00Z', isPrivate: true },
    { id: '3', content: 'Monitor attendance - missed 3 classes in September', createdBy: 'Dr. Sarah Chen', createdAt: '2024-10-01T14:30:00Z', isPrivate: true },
  ],
  classHistory: [
    { term: 'Spring 2024', courseCode: 'CS 201', courseName: 'Data Structures & Algorithms', grade: 'A-', credits: 4, status: 'completed' },
    { term: 'Spring 2024', courseCode: 'MATH 201', courseName: 'Linear Algebra', grade: 'B+', credits: 3, status: 'completed' },
    { term: 'Fall 2023', courseCode: 'CS 101', courseName: 'Introduction to Computer Science', grade: 'A', credits: 3, status: 'completed' },
    { term: 'Fall 2023', courseCode: 'MATH 101', courseName: 'Calculus I', grade: 'A-', credits: 4, status: 'completed' },
    { term: 'Spring 2023', courseCode: 'ENG 101', courseName: 'Composition & Rhetoric', grade: 'B+', credits: 3, status: 'completed' },
    { term: 'Spring 2023', courseCode: 'PHYS 101', courseName: 'General Physics I', grade: 'A', credits: 4, status: 'completed' },
  ],
};

export default function EnrollmentDetailPage() {
  const params = useParams();
  const enrollmentId = params.id as string;
  const enrollment = mockEnrollment;
  const [activeTab, setActiveTab] = React.useState<'overview' | 'history' | 'notes' | 'class-history'>('overview');

  const statusConfig = {
    active: { label: 'Active', variant: 'success' as const, icon: CheckCircle },
    dropped: { label: 'Dropped', variant: 'error' as const, icon: XCircle },
    waitlisted: { label: 'Waitlisted', variant: 'warning' as const, icon: Clock },
    pending: { label: 'Pending', variant: 'info' as const, icon: AlertTriangle },
    completed: { label: 'Completed', variant: 'default' as const, icon: FileText },
  };

  const status = statusConfig[enrollment.enrollment.status];

  return (
    <div className="min-h-screen bg-semantic-bg-primary">
      {/* Header */}
      <header className="border-b border-semantic-border-primary bg-semantic-bg-secondary/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container equal-edges">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
            <div className="flex items-center gap-4">
              <Link href="/staff/enrollments" className="p-2 rounded-lg hover:bg-semantic-bg-tertiary transition-colors">
                <ArrowLeft className="h-5 w-5 text-semantic-text-secondary" />
              </Link>
              <div>
                <h1 className="text-display-sm font-semibold text-semantic-text-primary">Enrollment Detail</h1>
                <p className="text-body-sm text-semantic-text-secondary">#{enrollmentId}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {}}>Edit Enrollment</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {}}>Print Record</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-semantic-status-error" onClick={() => {}}>Delete Enrollment</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
              <Button variant="primary" size="sm" className="gap-2">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container equal-edges py-6 section-spacing">
        {/* Student & Enrollment Header */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Student Info */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-heading-md">Student Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-6">
                <Avatar className="h-24 w-24 flex-shrink-0">
                  <AvatarImage src={enrollment.student.avatar} alt={enrollment.student.firstName} />
                  <AvatarFallback className="text-2xl">
                    {enrollment.student.firstName[0]}{enrollment.student.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-heading-lg font-semibold text-semantic-text-primary">
                        {enrollment.student.firstName} {enrollment.student.lastName}
                      </h2>
                      <p className="text-body text-semantic-text-secondary">{enrollment.student.email}</p>
                    </div>
                    <Badge variant={status.variant} className="gap-1 text-body-sm">
                      <status.icon className="h-3 w-3" />
                      {status.label}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-caption text-semantic-text-tertiary">Student ID</p>
                      <p className="font-mono font-medium text-semantic-text-primary">{enrollment.student.studentNumber}</p>
                    </div>
                    <div>
                      <p className="text-caption text-semantic-text-tertiary">Major</p>
                      <p className="font-medium text-semantic-text-primary">{enrollment.student.major}</p>
                    </div>
                    <div>
                      <p className="text-caption text-semantic-text-tertiary">Year</p>
                      <p className="font-medium text-semantic-text-primary">{enrollment.student.year}</p>
                    </div>
                    <div>
                      <p className="text-caption text-semantic-text-tertiary">Advisor</p>
                      <p className="font-medium text-semantic-text-primary">{enrollment.student.advisor}</p>
                    </div>
                  </div>
                  {enrollment.student.phone && (
                    <p className="text-body-sm text-semantic-text-secondary flex items-center gap-2">
                      <User className="h-4 w-4" /> {enrollment.student.phone}
                    </p>
                  )}
                </div>
              </div>
            </CardContent          </Card>

          {/* Course & Section Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-heading-md">Course & Section</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-semantic-bg-secondary rounded-lg">
                <h3 className="text-heading-md font-semibold text-semantic-text-primary">{enrollment.course.code}</h3>
                <p className="text-body text-semantic-text-secondary">{enrollment.course.name}</p>
                <div className="flex flex-wrap gap-4 mt-3 text-sm">
                  <span className="flex items-center gap-1 text-semantic-text-tertiary">
                    <BookOpen className="h-4 w-4" /> {enrollment.course.credits} credits
                  </span>
                  <span className="flex items-center gap-1 text-semantic-text-tertiary">
                    <Calendar className="h-4 w-4" /> {enrollment.course.department}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-semantic-bg-secondary rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-semantic-brand-primary/10 flex-center">
                      <Calendar className="h-5 w-5 text-semantic-brand-primary" />
                    </div>
                    <div>
                      <p className="text-caption text-semantic-text-tertiary">Section</p>
                      <p className="font-medium text-semantic-text-primary">{enrollment.section.code}</p>
                    </div>
                  </div>
                  <Badge variant="default">{enrollment.section.term}</Badge>
                </div>
                <div className="flex items-center gap-3 text-sm text-semantic-text-secondary">
                  <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {enrollment.section.schedule}</span>
                  <span className="flex items-center gap-1"><BookOpen className="h-4 w-4" /> {enrollment.section.location}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-semantic-text-secondary">
                  <span className="flex items-center gap-1"><User className="h-4 w-4" /> {enrollment.section.professor}</span>
                </div>
                <div className="flex items-center gap-4 pt-2 border-t border-semantic-border-primary">
                  <div className="flex-1">
                    <p className="text-caption text-semantic-text-tertiary">Capacity</p>
                    <p className="font-medium text-semantic-text-primary">{enrollment.section.enrolled}/{enrollment.section.capacity}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-caption text-semantic-text-tertiary">Waitlisted</p>
                    <p className="font-medium text-semantic-text-warning">{enrollment.section.waitlisted}</p>
                  </div>
                </div>
              </div>
            </CardContent          </Card>
        </div>

        {/* Enrollment Details */}
        <Card className="mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-heading-md">Enrollment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-caption text-semantic-text-tertiary">Enrollment Date</p>
                <p className="font-medium text-semantic-text-primary">{formatDate(enrollment.enrollment.enrolledAt)}</p>
                <p className="text-caption text-semantic-text-tertiary">{formatRelativeTime(enrollment.enrollment.enrolledAt)}</p>
              </div>
              <div>
                <p className="text-caption text-semantic-text-tertiary">Current Grade</p>
                <p className="font-mono font-semibold text-heading-md text-semantic-text-primary">
                  {enrollment.enrollment.grade || '—'}
                </p>
              </div>
              <div>
                <p className="text-caption text-semantic-text-tertiary">Credits Earned</p>
                <p className="font-medium text-semantic-text-primary">
                  {enrollment.enrollment.creditsEarned !== undefined ? enrollment.enrollment.creditsEarned : '—'}
                </p>
              </div>
              {enrollment.enrollment.waitlistPosition && (
                <div>
                  <p className="text-caption text-semantic-text-tertiary">Waitlist Position</p>
                  <p className="font-medium text-semantic-text-warning">#{enrollment.enrollment.waitlistPosition}</p>
                </div>
              )}
              {enrollment.enrollment.droppedAt && (
                <div className="md:col-span-2">
                  <p className="text-caption text-semantic-text-tertiary">Dropped Date</p>
                  <p className="font-medium text-semantic-text-error">{formatDate(enrollment.enrollment.droppedAt)}</p>
                  <p className="text-body-sm text-semantic-text-secondary">{enrollment.enrollment.dropReason}</p>
                </div>
              )}
            </div>
          </CardContent        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full md:w-auto mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="history">Status History</TabsTrigger>
            <TabsTrigger value="notes">Notes ({enrollment.notes.length})</TabsTrigger>
            <TabsTrigger value="class-history">Class History ({enrollment.classHistory.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-heading-md">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-3">
                  {enrollment.enrollment.status === 'waitlisted' && (
                    <Button variant="primary" className="gap-2" onClick={() => {}}>
                      <CheckCircle className="h-4 w-4" />
                      Promote from Waitlist
                    </Button>
                  )}
                  {enrollment.enrollment.status === 'pending' && (
                    <>
                      <Button variant="success" className="gap-2" onClick={() => {}}>
                        <CheckCircle className="h-4 w-4" />
                        Approve Enrollment
                      </Button>
                      <Button variant="destructive" className="gap-2" onClick={() => {}}>
                        <XCircle className="h-4 w-4" />
                        Deny Enrollment
                      </Button>
                    </>
                  )}
                  {enrollment.enrollment.status === 'active' && (
                    <>
                      <Button variant="warning" className="gap-2" onClick={() => {}}>
                        <AlertTriangle className="h-4 w-4" />
                        Drop Student
                      </Button>
                      <Button variant="outline" className="gap-2" onClick={() => {}}>
                        <Clock className="h-4 w-4" />
                        Move to Waitlist
                      </Button>
                    </>
                  )}
                  <Button variant="outline" className="gap-2" onClick={() => {}}>
                    <MessageSquare className="h-4 w-4" />
                    Message Student
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={() => {}}>
                    <MessageSquare className="h-4 w-4" />
                    Message Professor
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={() => {}}>
                    <History className="h-4 w-4" />
                    View Audit Log
                  </Button>
                </div>
              </CardContent            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-heading-md">Related Sections</CardTitle>
                <CardDescription>Other sections this student is enrolled in for {enrollment.section.term}</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    columnHelper.accessor('courseCode', { header: 'Course', cell: info => <span className="font-medium">{info.getValue()}</span> }),
                    columnHelper.accessor('courseName', { header: 'Course Name', cell: info => info.getValue() as string }),
                    columnHelper.accessor('section', { header: 'Section', cell: info => info.getValue() as string }),
                    columnHelper.accessor('status', { 
                      header: 'Status', 
                      cell: info => {
                        const s = info.getValue() as string;
                        const variants: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
                          active: 'success', waitlisted: 'warning', dropped: 'error', pending: 'info', completed: 'default'
                        };
                        return <Badge variant={variants[s] || 'default'}>{s}</Badge>;
                      }
                    }),
                    columnHelper.accessor('grade', { header: 'Grade', cell: info => info.getValue() ? <span className="font-mono">{info.getValue()}</span> : '—' }),
                  ]}
                  data={[
                    { id: '1', courseCode: 'CS 101', courseName: 'Intro to Computer Science', section: 'A', status: 'completed', grade: 'A' },
                    { id: '2', courseCode: 'MATH 201', courseName: 'Linear Algebra', section: 'B', status: 'completed', grade: 'B+' },
                    { id: '3', courseCode: 'PHYS 101', courseName: 'General Physics I', section: 'A', status: 'active', grade: undefined },
                  ]}
                  pageSize={5}
                  showColumnVisibility={false}
                  className="rounded-none"
                />
              </CardContent            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardContent className="p-0">
                <DataTable
                  columns={[
                    columnHelper.accessor('timestamp', { 
                      header: 'Date', 
                      cell: info => formatDateTime(info.getValue() as string),
                      size: 180,
                    }),
                    columnHelper.accessor('action', { 
                      header: 'Action', 
                      cell: info => {
                        const action = info.getValue() as string;
                        return <Badge variant="default" className="capitalize">{action.replace('_', ' ')}</Badge>;
                      },
                      size: 160,
                    }),
                    columnHelper.accessor('description', { header: 'Description', cell: info => info.getValue() as string }),
                    columnHelper.accessor('performedBy', { header: 'Performed By', cell: info => info.getValue() as string, size: 180 }),
                  ]}
                  data={enrollment.history}
                  pageSize={10}
                  showColumnVisibility={false}
                  className="rounded-none"
                />
              </CardContent            </Card>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-heading-md">Notes</CardTitle>
                  <CardDescription>Internal notes about this enrollment</CardDescription>
                </div>
                <Button variant="primary" size="sm" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Add Note
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {enrollment.notes.map((note) => (
                    <div key={note.id} className="p-4 bg-semantic-bg-secondary rounded-lg border border-semantic-border-primary">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-body text-semantic-text-primary">{note.content}</p>
                          <div className="flex items-center gap-4 mt-2 text-caption text-semantic-text-tertiary">
                            <span>{note.createdBy}</span>
                            <time>{formatRelativeTime(note.createdAt)}</time>
                            {note.isPrivate && <Badge variant="default" className="text-[10px]">Private</Badge>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent            </Card>
          </TabsContent>

          <TabsContent value="class-history" className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-heading-md">Academic History</CardTitle>
                <CardDescription>All completed and in-progress courses</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  columns={[
                    columnHelper.accessor('term', { header: 'Term', cell: info => info.getValue() as string, size: 120 }),
                    columnHelper.accessor('courseCode', { header: 'Course', cell: info => <span className="font-medium">{info.getValue()}</span>, size: 100 }),
                    columnHelper.accessor('courseName', { header: 'Course Name', cell: info => info.getValue() as string }),
                    columnHelper.accessor('grade', { header: 'Grade', cell: info => info.getValue() ? <span className="font-mono font-medium">{info.getValue()}</span> : <span className="text-semantic-text-tertiary">In Progress</span>, size: 80 }),
                    columnHelper.accessor('credits', { header: 'Credits', cell: info => info.getValue() as number, size: 80 }),
                    columnHelper.accessor('status', { 
                      header: 'Status', 
                      cell: info => {
                        const s = info.getValue() as string;
                        return <Badge variant={s === 'completed' ? 'success' : 'info'}>{s}</Badge>;
                      },
                      size: 100,
                    }),
                  ]}
                  data={enrollment.classHistory}
                  pageSize={15}
                  showColumnVisibility={false}
                  className="rounded-none"
                />
              </CardContent            </Card>

            {/* GPA Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-heading-md">Cumulative Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center p-4 bg-semantic-bg-secondary rounded-lg">
                    <p className="text-caption text-semantic-text-tertiary">Total Credits</p>
                    <p className="text-heading-xl font-bold text-semantic-text-primary">{enrollment.classHistory.reduce((sum, c) => sum + c.credits, 0)}</p>
                  </div>
                  <div className="text-center p-4 bg-semantic-bg-secondary rounded-lg">
                    <p className="text-caption text-semantic-text-tertiary">Completed Courses</p>
                    <p className="text-heading-xl font-bold text-semantic-text-primary">{enrollment.classHistory.filter(c => c.status === 'completed').length}</p>
                  </div>
                  <div className="text-center p-4 bg-semantic-bg-secondary rounded-lg">
                    <p className="text-caption text-semantic-text-tertiary">Current Term Credits</p>
                    <p className="text-heading-xl font-bold text-semantic-text-primary">{enrollment.course.credits}</p>
                  </div>
                  <div className="text-center p-4 bg-semantic-bg-secondary rounded-lg">
                    <p className="text-caption text-semantic-text-tertiary">Cumulative GPA</p>
                    <p className="text-heading-xl font-bold text-semantic-brand-primary">3.67</p>
                  </div>
                </div>
              </CardContent            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}