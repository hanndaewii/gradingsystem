'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, Calendar, Clock, AlertTriangle, CheckCircle, XCircle, MoreHorizontal, Edit, Trash2, Plus, Download, UserPlus, UserMinus, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/DropdownMenu';
import { DataTable, columnHelper } from '@/components/ui/DataTable';
import { formatRelativeTime, cn } from '@/lib/utils';

interface SectionDetail {
  id: string;
  code: string;
  course: {
    id: string;
    code: string;
    name: string;
    credits: number;
    department: string;
  };
  term: string;
  professor: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    department: string;
    avatar?: string;
  } | null;
  schedule: {
    days: string[];
    startTime: string;
    endTime: string;
    location: string;
    building: string;
    room: string;
  };
  capacity: number;
  enrolled: number;
  waitlisted: number;
  waitlistLimit: number;
  status: 'open' | 'closed' | 'cancelled' | 'draft';
  roster: Array<{
    id: string;
    studentId: string;
    studentNumber: string;
    firstName: string;
    lastName: string;
    email: string;
    major: string;
    year: string;
    enrolledAt: string;
    status: 'active' | 'dropped' | 'waitlisted';
    grade?: string;
  }>;
  waitlist: Array<{
    id: string;
    studentId: string;
    studentNumber: string;
    firstName: string;
    lastName: string;
    email: string;
    position: number;
    joinedAt: string;
    notifiedAt?: string;
    status: 'waiting' | 'notified' | 'promoted' | 'expired';
  }>;
  scheduleConflicts: Array<{
    studentId: string;
    studentName: string;
    conflictingSection: string;
    conflictType: 'time' | 'room' | 'professor';
  }>;
  roomAssignments: Array<{
    id: string;
    building: string;
    room: string;
    capacity: number;
    features: string[];
    available: boolean;
  }>;
}

const mockSection: SectionDetail = {
  id: 'sec-1',
  code: 'CS 301-A',
  course: {
    id: '1',
    code: 'CS 301',
    name: 'Database Systems',
    credits: 3,
    department: 'Computer Science',
  },
  term: 'Fall 2024',
  professor: {
    id: 'prof-1',
    name: 'Dr. Sarah Chen',
    email: 'sarah.chen@university.edu',
    phone: '(555) 234-5678',
    department: 'Computer Science',
    avatar: '/avatars/prof1.jpg',
  },
  schedule: {
    days: ['Monday', 'Wednesday'],
    startTime: '10:00',
    endTime: '11:15',
    location: 'Engineering Hall 204',
    building: 'Engineering Hall',
    room: '204',
  },
  capacity: 40,
  enrolled: 38,
  waitlisted: 5,
  waitlistLimit: 10,
  status: 'open',
  roster: Array.from({ length: 38 }, (_, i) => ({
    id: `enr-${i + 1}`,
    studentId: `stu-${1000 + i}`,
    studentNumber: `S${20240000 + i}`,
    firstName: `Student`,
    lastName: `${i + 1}`,
    email: `student${i + 1}@university.edu`,
    major: ['Computer Science', 'Data Science', 'Computer Engineering'][i % 3],
    year: ['Freshman', 'Sophomore', 'Junior', 'Senior'][i % 4],
    enrolledAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    grade: i < 5 ? ['A', 'A-', 'B+', 'B', 'B-'][i] : undefined,
  })),
  waitlist: [
    { id: 'wl-1', studentId: 'stu-2001', studentNumber: 'S20242001', firstName: 'Alex', lastName: 'Johnson', email: 'alex.johnson@university.edu', position: 1, joinedAt: '2024-08-10T08:00:00Z', status: 'waiting' },
    { id: 'wl-2', studentId: 'stu-2002', studentNumber: 'S20242002', firstName: 'Maria', lastName: 'Garcia', email: 'maria.garcia@university.edu', position: 2, joinedAt: '2024-08-11T14:30:00Z', status: 'waiting' },
    { id: 'wl-3', studentId: 'stu-2003', studentNumber: 'S20242003', firstName: 'James', lastName: 'Wilson', email: 'james.wilson@university.edu', position: 3, joinedAt: '2024-08-12T10:15:00Z', status: 'notified', notifiedAt: '2024-08-15T09:00:00Z' },
    { id: 'wl-4', studentId: 'stu-2004', studentNumber: 'S20242004', firstName: 'Sarah', lastName: 'Davis', email: 'sarah.davis@university.edu', position: 4, joinedAt: '2024-08-13T16:45:00Z', status: 'waiting' },
    { id: 'wl-5', studentId: 'stu-2005', studentNumber: 'S20242005', firstName: 'Michael', lastName: 'Brown', email: 'michael.brown@university.edu', position: 5, joinedAt: '2024-08-14T11:20:00Z', status: 'waiting' },
  ],
  scheduleConflicts: [
    { studentId: 'stu-1005', studentName: 'Student 5', conflictingSection: 'MATH 201-B', conflictType: 'time' },
    { studentId: 'stu-1012', studentName: 'Student 12', conflictingSection: 'PHYS 101-A', conflictType: 'time' },
  ],
  roomAssignments: [
    { id: 'room-1', building: 'Engineering Hall', room: '204', capacity: 45, features: ['Projector', 'Whiteboard', 'Outlets'], available: true },
    { id: 'room-2', building: 'Engineering Hall', room: '205', capacity: 40, features: ['Projector', 'Whiteboard'], available: true },
    { id: 'room-3', building: 'Science Building', room: '101', capacity: 50, features: ['Projector', 'Smart Board', 'Outlets'], available: false },
    { id: 'room-4', building: 'Main Lecture Hall', room: 'A', capacity: 150, features: ['Projector', 'Sound System', 'Recording'], available: true },
  ],
};

export default function SectionDetailPage() {
  const params = useParams();
  const sectionId = params.id as string;
  const section = mockSection;
  const [activeTab, setActiveTab] = React.useState<'overview' | 'roster' | 'waitlist' | 'conflicts' | 'room'>('overview');

  const statusConfig = {
    open: { label: 'Open', variant: 'success' as const, icon: CheckCircle },
    closed: { label: 'Full', variant: 'error' as const, icon: XCircle },
    cancelled: { label: 'Cancelled', variant: 'default' as const, icon: AlertTriangle },
    draft: { label: 'Draft', variant: 'warning' as const, icon: Clock },
  };

  const config = statusConfig[section.status];
  const utilization = Math.round((section.enrolled / section.capacity) * 100);

  return (
    <div className="min-h-screen bg-semantic-bg-primary">
      {/* Header */}
      <header className="border-b border-semantic-border-primary bg-semantic-bg-secondary/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container equal-edges">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
            <div className="flex items-center gap-4">
              <Link href="/staff/sections" className="p-2 rounded-lg hover:bg-semantic-bg-tertiary transition-colors">
                <ArrowLeft className="h-5 w-5 text-semantic-text-secondary" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-display-sm font-semibold text-semantic-text-primary">{section.code}</h1>
                  <Badge variant={config.variant} className="gap-1">
                    <config.icon className="h-3 w-3" />
                    {config.label}
                  </Badge>
                </div>
                <p className="text-body-sm text-semantic-text-secondary">{section.course.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Export Roster
              </Button>
              <Button variant="primary" size="sm" className="gap-2">
                <Edit className="h-4 w-4" />
                Edit Section
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {}} className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Add Student
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {}} className="gap-2">
                    <Mail className="h-4 w-4" />
                    Email Class
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {section.status === 'open' && (
                    <DropdownMenuItem onClick={() => {}} className="gap-2 text-semantic-status-warning">
                      Close Section
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => {}} className="gap-2 text-semantic-status-error">
                    <Trash2 className="h-4 w-4" />
                    Cancel Section
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="container equal-edges py-6 section-spacing">
        {/* Section Header Info */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-heading-md">Section Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-caption text-semantic-text-tertiary">Course</p>
                  <p className="font-medium text-semantic-text-primary">{section.course.code} - {section.course.name}</p>
                </div>
                <div>
                  <p className="text-caption text-semantic-text-tertiary">Term</p>
                  <p className="font-medium text-semantic-text-primary">{section.term}</p>
                </div>
                <div>
                  <p className="text-caption text-semantic-text-tertiary">Credits</p>
                  <p className="font-medium text-semantic-text-primary">{section.course.credits}</p>
                </div>
                <div>
                  <p className="text-caption text-semantic-text-tertiary">Department</p>
                  <p className="font-medium text-semantic-text-primary">{section.course.department}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-semantic-border-primary">
                <h4 className="font-medium text-semantic-text-primary mb-3">Schedule</h4>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <span className="flex items-center gap-1 text-semantic-text-secondary">
                    <Calendar className="h-4 w-4" />
                    {section.schedule.days.join(', ')}
                  </span>
                  <span className="flex items-center gap-1 text-semantic-text-secondary">
                    <Clock className="h-4 w-4" />
                    {section.schedule.startTime} - {section.schedule.endTime}
                  </span>
                  <span className="flex items-center gap-1 text-semantic-text-secondary">
                    <Calendar className="h-4 w-4" />
                    {section.schedule.location}
                  </span>
                </div>
              </div>

              {section.professor && (
                <div className="pt-4 border-t border-semantic-border-primary">
                  <h4 className="font-medium text-semantic-text-primary mb-3">Instructor</h4>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-semantic-brand-primary/10 flex-center">
                      <Calendar className="h-6 w-6 text-semantic-brand-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-semantic-text-primary">{section.professor.name}</p>
                      <p className="text-body-sm text-semantic-text-secondary">{section.professor.email}</p>
                      <p className="text-body-sm text-semantic-text-secondary">{section.professor.department}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Email">
                        <Mail className="h-4 w-4" />
                      </Button>
                      {section.professor.phone && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Phone">
                          <Phone className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-heading-md">Capacity Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-semantic-bg-secondary rounded-lg text-center">
                <p className="text-caption text-semantic-text-tertiary">Enrolled</p>
                <p className="text-3xl font-bold text-semantic-text-primary">{section.enrolled}</p>
              </div>
              <div className="p-4 bg-semantic-bg-secondary rounded-lg text-center">
                <p className="text-caption text-semantic-text-tertiary">Capacity</p>
                <p className="text-3xl font-bold text-semantic-text-primary">{section.capacity}</p>
              </div>
              <div className="p-4 bg-semantic-bg-secondary rounded-lg text-center">
                <p className="text-caption text-semantic-text-tertiary">Waitlisted</p>
                <p className="text-3xl font-bold text-semantic-status-warning">{section.waitlisted}</p>
              </div>
              <div className="p-4 bg-semantic-bg-secondary rounded-lg text-center">
                <p className="text-caption text-semantic-text-tertiary">Waitlist Limit</p>
                <p className="text-3xl font-bold text-semantic-text-primary">{section.waitlistLimit}</p>
              </div>
              <div className="pt-4 border-t border-semantic-border-primary">
                <p className="text-caption text-semantic-text-tertiary">Utilization</p>
                <div className="h-3 bg-semantic-bg-tertiary rounded-full overflow-hidden mt-2">
                  <div 
                    className={cn(
                      'h-full rounded-full transition-all',
                      utilization >= 95 && 'bg-semantic-status-error',
                      utilization >= 80 && utilization < 95 && 'bg-semantic-status-warning',
                      utilization < 80 && 'bg-semantic-status-success'
                    )} 
                    style={{ width: `${utilization}%` }}
                  />
                </div>
                <p className={cn(
                  'text-body-sm font-medium mt-1 text-right',
                  utilization >= 95 && 'text-semantic-status-error',
                  utilization >= 80 && utilization < 95 && 'text-semantic-status-warning',
                  utilization < 80 && 'text-semantic-status-success'
                )}>{utilization}% full</p>
              </div>
              <div className="pt-4 border-t border-semantic-border-primary">
                <p className="text-caption text-semantic-text-tertiary">Available Seats</p>
                <p className="text-2xl font-bold text-semantic-status-success">{section.capacity - section.enrolled}</p>
              </div>
            </CardContent          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full md:w-auto mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="roster">Roster ({section.roster.length})</TabsTrigger>
            <TabsTrigger value="waitlist">Waitlist ({section.waitlisted})</TabsTrigger>
            <TabsTrigger value="conflicts">Conflicts ({section.scheduleConflicts.length})</TabsTrigger>
            <TabsTrigger value="room">Room Assignment</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-heading-md">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Button variant="primary" className="gap-2" onClick={() => {}}>
                    <UserPlus className="h-4 w-4" />
                    Enroll Student
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={() => {}}>
                    <Mail className="h-4 w-4" />
                    Email All Students
                  </Button>
                  {section.waitlisted > 0 && (
                    <Button variant="success" className="gap-2" onClick={() => {}}>
                      <UserPlus className="h-4 w-4" />
                      Promote from Waitlist
                    </Button>
                  )}
                  <Button variant="outline" className="gap-2" onClick={() => {}}>
                    <Download className="h-4 w-4" />
                    Print Roster
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={() => {}}>
                    <Calendar className="h-4 w-4" />
                    View Schedule
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={() => {}}>
                    <UserMinus className="h-4 w-4" />
                    Drop Student
                  </Button>
                </div>
              </CardContent            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-heading-md">Enrollment Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-semantic-bg-secondary rounded-lg">
                    <div className="h-10 w-10 rounded-lg bg-semantic-status-success/10 flex-center">
                      <CheckCircle className="h-5 w-5 text-semantic-status-success" />
                    </div>
                    <div>
                      <p className="font-medium text-semantic-text-primary">Registration Opened</p>
                      <p className="text-caption text-semantic-text-tertiary">April 1, 2024 - Students could begin enrolling</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-semantic-bg-secondary rounded-lg">
                    <div className="h-10 w-10 rounded-lg bg-semantic-brand-primary/10 flex-center">
                      <Users className="h-5 w-5 text-semantic-brand-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-semantic-text-primary">First Enrollment</p>
                      <p className="text-caption text-semantic-text-tertiary">April 15, 2024 - Student 1 enrolled</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-semantic-bg-secondary rounded-lg">
                    <div className="h-10 w-10 rounded-lg bg-semantic-status-warning/10 flex-center">
                      <Clock className="h-5 w-5 text-semantic-status-warning" />
                    </div>
                    <div>
                      <p className="font-medium text-semantic-text-primary">Waitlist Activated</p>
                      <p className="text-caption text-semantic-text-tertiary">August 10, 2024 - Section reached capacity</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-semantic-bg-secondary rounded-lg">
                    <div className="h-10 w-10 rounded-lg bg-semantic-status-info/10 flex-center">
                      <Calendar className="h-5 w-5 text-semantic-status-info" />
                    </div>
                    <div>
                      <p className="font-medium text-semantic-text-primary">Add/Drop Deadline</p>
                      <p className="text-caption text-semantic-text-tertiary">September 15, 2024 - Last day for changes</p>
                    </div>
                  </div>
                </div>
              </CardContent            </Card>
          </TabsContent>

          <TabsContent value="roster" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-heading-md">Class Roster</CardTitle>
                  <CardDescription>{section.roster.length} enrolled students</CardDescription>
                </div>
                <Button variant="primary" size="sm" className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Add Student
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  columns={[
                    columnHelper.accessor('studentNumber', { header: 'Student ID', cell: info => <span className="font-mono">{info.getValue()}</span>, size: 120 }),
                    columnHelper.accessor('lastName', { 
                      header: 'Name', 
                      cell: info => {
                        const row = info.row.original;
                        return (
                          <div>
                            <p className="font-medium text-semantic-text-primary">{row.lastName}, {row.firstName}</p>
                            <p className="text-caption text-semantic-text-tertiary">{row.email}</p>
                          </div>
                        );
                      },
                      size: 200,
                    }),
                    columnHelper.accessor('major', { header: 'Major', cell: info => info.getValue() as string, size: 150 }),
                    columnHelper.accessor('year', { header: 'Year', cell: info => info.getValue() as string, size: 100 }),
                    columnHelper.accessor('enrolledAt', { 
                      header: 'Enrolled', 
                      cell: info => formatRelativeTime(info.getValue() as string),
                      size: 120,
                    }),
                    columnHelper.accessor('status', { 
                      header: 'Status', 
                      cell: info => {
                        const status = info.getValue() as string;
                        const variants = { active: 'success', dropped: 'error', waitlisted: 'warning' };
                        return <Badge variant={variants[status as keyof typeof variants] || 'default'}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Badge>;
                      },
                      size: 100,
                    }),
                    columnHelper.accessor('grade', { header: 'Grade', cell: info => info.getValue() ? <span className="font-mono font-medium">{info.getValue()}</span> : <span className="text-semantic-text-tertiary">—</span>, size: 80 }),
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
                            <DropdownMenuItem onClick={() => {}} className="gap-2">View Profile</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {}} className="gap-2">Message</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {row.original.status === 'active' && (
                              <DropdownMenuItem onClick={() => {}} className="gap-2 text-semantic-status-warning">Drop</DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => {}} className="gap-2">View Grades</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ),
                      size: 100,
                    }),
                  ]}
                  data={section.roster}
                  rowKey="id"
                  pageSize={15}
                  showColumnVisibility={false}
                  className="rounded-none"
                />
              </CardContent            </Card>
          </TabsContent>

          <TabsContent value="waitlist" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-heading-md">Waitlist</CardTitle>
                  <CardDescription>{section.waitlist.length} students waiting</CardDescription>
                </div>
                <Button variant="success" size="sm" className="gap-2" disabled={section.waitlist.length === 0}>
                  <UserPlus className="h-4 w-4" />
                  Promote Next
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  columns={[
                    columnHelper.accessor('position', { header: 'Position', cell: info => <span className="font-mono font-medium text-semantic-text-primary">#{info.getValue()}</span>, size: 100 }),
                    columnHelper.accessor('studentNumber', { header: 'Student ID', cell: info => <span className="font-mono">{info.getValue()}</span>, size: 120 }),
                    columnHelper.accessor('lastName', { 
                      header: 'Name', 
                      cell: info => {
                        const row = info.row.original;
                        return (
                          <div>
                            <p className="font-medium text-semantic-text-primary">{row.lastName}, {row.firstName}</p>
                            <p className="text-caption text-semantic-text-tertiary">{row.email}</p>
                          </div>
                        );
                      },
                      size: 200,
                    }),
                    columnHelper.accessor('joinedAt', { 
                      header: 'Joined', 
                      cell: info => formatRelativeTime(info.getValue() as string),
                      size: 120,
                    }),
                    columnHelper.accessor('status', { 
                      header: 'Status', 
                      cell: info => {
                        const status = info.getValue() as string;
                        const variants = { waiting: 'info', notified: 'warning', promoted: 'success', expired: 'error' };
                        return <Badge variant={variants[status as keyof typeof variants] || 'default'}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Badge>;
                      },
                      size: 120,
                    }),
                    columnHelper.accessor('notifiedAt', { 
                      header: 'Notified', 
                      cell: info => info.getValue() ? formatRelativeTime(info.getValue() as string) : <span className="text-semantic-text-tertiary">—</span>,
                      size: 120,
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
                            {row.original.status === 'waiting' && (
                              <DropdownMenuItem onClick={() => {}} className="gap-2 text-semantic-status-success">Promote Now</DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => {}} className="gap-2">Message</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {}} className="gap-2">View Profile</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => {}} className="gap-2 text-semantic-status-error">Remove from Waitlist</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ),
                      size: 100,
                    }),
                  ]}
                  data={section.waitlist}
                  rowKey="id"
                  pageSize={10}
                  showColumnVisibility={false}
                  className="rounded-none"
                />
              </CardContent            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-heading-md">Waitlist Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-caption text-semantic-text-tertiary">Auto-Promotion</label>
                    <Badge variant="success" className="mt-1">Enabled</Badge>
                  </div>
                  <div>
                    <label className="text-caption text-semantic-text-tertiary">Notification Window</label>
                    <p className="font-medium text-semantic-text-primary">24 hours</p>
                  </div>
                  <div>
                    <label className="text-caption text-semantic-text-tertiary">Max Waitlist Size</label>
                    <p className="font-medium text-semantic-text-primary">{section.waitlistLimit}</p>
                  </div>
                  <div>
                    <label className="text-caption text-semantic-text-tertiary">Current Waitlist</label>
                    <p className="font-medium text-semantic-text-primary">{section.waitlisted}/{section.waitlistLimit}</p>
                  </div>
                </div>
              </CardContent            </Card>
          </TabsContent>

          <TabsContent value="conflicts" className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-heading-md">Schedule Conflicts</CardTitle>
                <CardDescription>Students with scheduling conflicts in this section</CardDescription>
              </CardHeader>
              <CardContent>
                {section.scheduleConflicts.length === 0 ? (
                  <div className="py-12 text-center">
                    <CheckCircle className="h-12 w-12 text-semantic-status-success mx-auto mb-4" />
                    <h3 className="text-heading-md font-semibold text-semantic-text-primary mb-2">No Conflicts Found</h3>
                    <p className="text-body text-semantic-text-secondary">All enrolled students have compatible schedules.</p>
                  </div>
                ) : (
                  <DataTable
                    columns={[
                      columnHelper.accessor('studentName', { header: 'Student', cell: info => info.getValue() as string, size: 200 }),
                      columnHelper.accessor('conflictingSection', { header: 'Conflicting Section', cell: info => <span className="font-mono">{info.getValue()}</span>, size: 150 }),
                      columnHelper.accessor('conflictType', { 
                        header: 'Conflict Type', 
                        cell: info => {
                          const type = info.getValue() as string;
                          const icons = { time: Clock, room: Calendar, professor: Users };
                          const Icon = icons[type as keyof typeof icons] || AlertTriangle;
                          return <Badge variant="warning" className="gap-1"><Icon className="h-3 w-3" />{type.charAt(0).toUpperCase() + type.slice(1)}</Badge>;
                        },
                        size: 120,
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
                              <DropdownMenuItem onClick={() => {}} className="gap-2">View Student Schedule</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {}} className="gap-2">Message Student</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {}} className="gap-2">View Conflicting Section</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ),
                        size: 100,
                      }),
                    ]}
                    data={section.scheduleConflicts}
                    rowKey="studentId"
                    pageSize={10}
                    showColumnVisibility={false}
                    className="rounded-none"
                  />
                )}
              </CardContent            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-heading-md">Conflict Resolution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => {}}>
                  <Calendar className="h-4 w-4" />
                  Run Conflict Check for All Enrolled
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => {}}>
                  <Download className="h-4 w-4" />
                  Export Conflict Report
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => {}}>
                  <UserPlus className="h-4 w-4" />
                  Bulk Resolve (Move to Other Sections)
                </Button>
              </CardContent            </Card>
          </TabsContent>

          <TabsContent value="room" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-heading-md">Current Room</CardTitle>
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <Edit className="h-4 w-4" />
                  Change Room
                </Button>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-semantic-bg-secondary rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-semantic-text-primary">{section.schedule.building} {section.schedule.room}</h4>
                      <p className="text-body-sm text-semantic-text-secondary">{section.schedule.location}</p>
                    </div>
                    <Badge variant="success">Assigned</Badge>
                  </div>
                  <div className="mt-4 grid sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-caption text-semantic-text-tertiary">Room Capacity</p>
                      <p className="font-medium text-semantic-text-primary">45</p>
                    </div>
                    <div>
                      <p className="text-caption text-semantic-text-tertiary">Section Enrollment</p>
                      <p className="font-medium text-semantic-text-primary">{section.enrolled}</p>
                    </div>
                    <div>
                      <p className="text-caption text-semantic-text-tertiary">Utilization</p>
                      <p className="font-medium text-semantic-text-primary">84%</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant="default">Projector</Badge>
                    <Badge variant="default">Whiteboard</Badge>
                    <Badge variant="default">Outlets</Badge>
                  </div>
                </div>
              </CardContent            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-heading-md">Available Rooms</CardTitle>
                <CardDescription>Rooms available for this time slot</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  columns={[
                    columnHelper.accessor('building', { header: 'Building', cell: info => info.getValue() as string }),
                    columnHelper.accessor('room', { header: 'Room', cell: info => info.getValue() as string }),
                    columnHelper.accessor('capacity', { header: 'Capacity', cell: info => info.getValue() as number }),
                    columnHelper.accessor('features', { 
                      header: 'Features', 
                      cell: info => {
                        const features = info.getValue() as string[];
                        return (
                          <div className="flex flex-wrap gap-1">
                            {features.map(f => <Badge key={f} variant="default" className="text-[10px]">{f}</Badge>)}
                          </div>
                        );
                      },
                    }),
                    columnHelper.accessor('available', { 
                      header: 'Available', 
                      cell: info => info.getValue() ? (
                        <Badge variant="success" className="gap-1"><CheckCircle className="h-3 w-3" /> Yes</Badge>
                      ) : (
                        <Badge variant="error" className="gap-1"><XCircle className="h-3 w-3" /> No</Badge>
                      )
                    }),
                    columnHelper.display({
                      id: 'actions',
                      header: 'Actions',
                      cell: ({ row }) => (
                        <Button 
                          variant={row.original.available ? 'primary' : 'outline'} 
                          size="sm" 
                          className="gap-1"
                          disabled={!row.original.available}
                          onClick={() => {}}
                        >
                          Assign
                        </Button>
                      ),
                      size: 100,
                    }),
                  ]}
                  data={section.roomAssignments}
                  rowKey="id"
                  pageSize={10}
                  showColumnVisibility={false}
                  className="rounded-none"
                />
              </CardContent            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}