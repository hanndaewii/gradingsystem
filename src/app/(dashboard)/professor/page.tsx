'use client';

import * as React from 'react';
import Link from 'next/link';
import { Users, Clock, AlertTriangle, Bell, TrendingUp, ArrowRight, Plus, Filter, Search, MoreVertical } from 'lucide-react';
import { ClassCard } from '@/components/professor/ClassCard';
import { SectionStats } from '@/components/professor/SectionStats';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/DropdownMenu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { formatRelativeTime, cn } from '@/lib/utils';

interface ClassData {
  id: string;
  courseCode: string;
  courseName: string;
  section: string;
  term: string;
  studentCount: number;
  avgGrade: number | null;
  pendingGrades: number;
  upcomingDeadlines: number;
  color: string;
}

interface ActivityItem {
  id: string;
  type: 'grade_submitted' | 'grade_draft' | 'assignment_created' | 'student_enrolled' | 'announcement';
  title: string;
  description: string;
  timestamp: string;
  user: { name: string; avatar?: string };
  metadata?: Record<string, unknown>;
}

const mockClasses: ClassData[] = [
  {
    id: '1',
    courseCode: 'CS 101',
    courseName: 'Introduction to Computer Science',
    section: 'A',
    term: 'Fall 2024',
    studentCount: 142,
    avgGrade: 87.3,
    pendingGrades: 12,
    upcomingDeadlines: 3,
    color: 'from-blue-500 to-blue-600',
  },
  {
    id: '2',
    courseCode: 'CS 201',
    courseName: 'Data Structures & Algorithms',
    section: 'B',
    term: 'Fall 2024',
    studentCount: 89,
    avgGrade: 82.1,
    pendingGrades: 8,
    upcomingDeadlines: 2,
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    id: '3',
    courseCode: 'CS 301',
    courseName: 'Database Systems',
    section: 'A',
    term: 'Fall 2024',
    studentCount: 67,
    avgGrade: 91.5,
    pendingGrades: 3,
    upcomingDeadlines: 1,
    color: 'from-purple-500 to-purple-600',
  },
  {
    id: '4',
    courseCode: 'CS 401',
    courseName: 'Software Engineering',
    section: 'C',
    term: 'Fall 2024',
    studentCount: 45,
    avgGrade: 88.7,
    pendingGrades: 5,
    upcomingDeadlines: 4,
    color: 'from-amber-500 to-amber-600',
  },
];

const mockActivity: ActivityItem[] = [
  {
    id: '1',
    type: 'grade_submitted',
    title: 'Grades submitted for Midterm Exam',
    description: 'CS 101-A • 142 grades submitted for review',
    timestamp: '2024-01-15T10:30:00Z',
    user: { name: 'Prof. Sarah Chen' },
  },
  {
    id: '2',
    type: 'grade_draft',
    title: 'Draft grades saved for Project 2',
    description: 'CS 201-B • 45 of 89 grades saved as draft',
    timestamp: '2024-01-15T09:15:00Z',
    user: { name: 'Prof. Sarah Chen' },
  },
  {
    id: '3',
    type: 'assignment_created',
    title: 'New assignment created',
    description: 'CS 301-A • "Final Project Proposal" assigned, due Jan 25',
    timestamp: '2024-01-14T16:45:00Z',
    user: { name: 'Prof. Sarah Chen' },
  },
  {
    id: '4',
    type: 'student_enrolled',
    title: 'New student enrolled',
    description: 'CS 101-A • Alex Rodriguez joined the section',
    timestamp: '2024-01-14T14:20:00Z',
    user: { name: 'System' },
  },
  {
    id: '5',
    type: 'announcement',
    title: 'Announcement posted',
    description: 'CS 401-C • "Office hours moved to Thursday 2-4pm"',
    timestamp: '2024-01-13T11:00:00Z',
    user: { name: 'Prof. Sarah Chen' },
  },
];

const mockAnnouncements = [
  {
    id: '1',
    title: 'Grade submission deadline approaching',
    body: 'Reminder: All Fall 2024 final grades must be submitted by January 20th, 2024 at 11:59 PM.',
    type: 'warning' as const,
    createdAt: '2024-01-10T08:00:00Z',
  },
  {
    id: '2',
    title: 'New rubric templates available',
    body: 'Check out the updated rubric templates in the Assessment Builder for faster grading setup.',
    type: 'info' as const,
    createdAt: '2024-01-08T10:30:00Z',
  },
  {
    id: '3',
    title: 'System maintenance scheduled',
    body: 'Platform will be unavailable Saturday 2-4 AM EST for routine maintenance.',
    type: 'info' as const,
    createdAt: '2024-01-05T15:00:00Z',
  },
];

export default function ProfessorDashboard() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'all' | 'active' | 'archived'>('all');

  const totalStudents = mockClasses.reduce((sum, c) => sum + c.studentCount, 0);
  const totalPendingGrades = mockClasses.reduce((sum, c) => sum + c.pendingGrades, 0);
  const totalUpcomingDeadlines = mockClasses.reduce((sum, c) => sum + c.upcomingDeadlines, 0);
  const avgGradeAll = mockClasses.reduce((sum, c) => sum + (c.avgGrade || 0), 0) / mockClasses.length;

  const filteredClasses = mockClasses.filter((cls) =>
    cls.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cls.courseName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-semantic-bg-primary">
      {/* Header */}
      <header className="border-b border-semantic-border-primary bg-semantic-bg-secondary/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container equal-edges">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
            <div>
              <h1 className="text-display-sm font-semibold text-semantic-text-primary">Professor Dashboard</h1>
              <p className="text-body-sm text-semantic-text-secondary mt-1">Manage your classes, grades, and assessments</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Notifications">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-semantic-status-error text-[10px] font-medium rounded-full flex-center">3</span>
              </Button>
              <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-semantic-border-primary">
                <Avatar className="h-9 w-9">
                  <AvatarImage src="/avatars/professor.jpg" alt="Prof. Sarah Chen" />
                  <AvatarFallback>SC</AvatarFallback>
                </Avatar>
                <div className="text-right">
                  <p className="text-body-sm font-medium text-semantic-text-primary">Prof. Sarah Chen</p>
                  <p className="text-caption text-semantic-text-tertiary">Computer Science Dept.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container equal-edges py-6 section-spacing">
        {/* Quick Stats */}
        <section className="mb-8 animate-fade-in" aria-labelledby="stats-heading">
          <h2 id="stats-heading" className="sr-only">Quick Statistics</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Students"
              value={totalStudents.toLocaleString()}
              icon={<Users className="h-5 w-5 text-semantic-brand-primary" />}
              trend="+12 this term"
              trendUp
            />
            <StatCard
              title="Pending Grades"
              value={totalPendingGrades}
              icon={<AlertTriangle className="h-5 w-5 text-semantic-status-warning" />}
              trend={`${totalUpcomingDeadlines} upcoming deadlines`}
              variant="warning"
            />
            <StatCard
              title="Avg Grade (All Classes)"
              value={`${avgGradeAll.toFixed(1)}%`}
              icon={<TrendingUp className="h-5 w-5 text-semantic-status-success" />}
              trend="Above institution avg"
              trendUp
            />
            <StatCard
              title="Active Sections"
              value={mockClasses.length}
              icon={<Clock className="h-5 w-5 text-semantic-status-info" />}
              term="Fall 2024"
            />
          </div>
        </section>

        {/* Search & Filter */}
        <section className="mb-8 animate-slide-in-from-bottom" style={{ animationDelay: '100ms' }} aria-labelledby="classes-heading">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <h2 id="classes-heading" className="text-heading-lg font-semibold text-semantic-text-primary">Your Classes</h2>
              <Badge variant="default" className="ml-2">{filteredClasses.length} sections</Badge>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-semantic-text-tertiary" aria-hidden="true" />
                <Input
                  placeholder="Search classes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  size="sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="hidden sm:flex">
                  <TabsList className="bg-semantic-bg-tertiary p-1 rounded-lg">
                    <TabsTrigger value="all" className="px-3 py-1.5 text-caption">All</TabsTrigger>
                    <TabsTrigger value="active" className="px-3 py-1.5 text-caption">Active</TabsTrigger>
                    <TabsTrigger value="archived" className="px-3 py-1.5 text-caption">Archived</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Section
                </Button>
              </div>
            </div>
          </div>

          {/* Class Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
            {filteredClasses.map((cls) => (
              <ClassCard
                key={cls.id}
                classData={cls}
                onClick={() => {}}
              />
            ))}
          </div>

          {filteredClasses.length === 0 && (
            <Card className="py-12 text-center">
              <CardContent className="pt-6">
                <Search className="h-12 w-12 text-semantic-text-tertiary mx-auto mb-4" aria-hidden="true" />
                <h3 className="text-heading-md font-semibold text-semantic-text-primary mb-2">No classes found</h3>
                <p className="text-body text-semantic-text-secondary mb-4">Try adjusting your search or create a new section.</p>
                <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Create Section</Button>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Recent Activity & Announcements */}
        <section className="grid lg:grid-cols-3 gap-6 animate-slide-in-from-bottom" style={{ animationDelay: '200ms' }}>
          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-heading-md">Recent Activity</CardTitle>
                <CardDescription>Latest updates across your sections</CardDescription>
              </div>
              <Button variant="ghost" size="sm">View All</Button>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                {mockActivity.map((activity) => (
                  <div key={activity.id} className="flex gap-3 p-3 rounded-lg hover:bg-semantic-bg-secondary transition-colors">
                    <div className={cn(
                      'h-10 w-10 rounded-lg flex-center flex-shrink-0',
                      activity.type === 'grade_submitted' && 'bg-semantic-status-success/10 text-semantic-status-success',
                      activity.type === 'grade_draft' && 'bg-semantic-status-warning/10 text-semantic-status-warning',
                      activity.type === 'assignment_created' && 'bg-semantic-brand-primary/10 text-semantic-brand-primary',
                      activity.type === 'student_enrolled' && 'bg-semantic-status-info/10 text-semantic-status-info',
                      activity.type === 'announcement' && 'bg-semantic-status-info/10 text-semantic-status-info'
                    )}>
                      {activity.type === 'grade_submitted' && <AlertTriangle className="h-5 w-5" />}
                      {activity.type === 'grade_draft' && <Clock className="h-5 w-5" />}
                      {activity.type === 'assignment_created' && <Plus className="h-5 w-5" />}
                      {activity.type === 'student_enrolled' && <Users className="h-5 w-5" />}
                      {activity.type === 'announcement' && <Bell className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm font-medium text-semantic-text-primary">{activity.title}</p>
                      <p className="text-body-sm text-semantic-text-secondary truncate">{activity.description}</p>
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      <time className="text-caption text-semantic-text-tertiary whitespace-nowrap">
                        {formatRelativeTime(activity.timestamp)}
                      </time>
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px]">
                          {activity.user.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Announcements */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-heading-md">Announcements</CardTitle>
                <CardDescription>System & department updates</CardDescription>
              </div>
              <Button variant="ghost" size="sm">All</Button>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {mockAnnouncements.map((announcement) => (
                  <div key={announcement.id} className={cn(
                    'p-3 rounded-lg border-l-4 transition-colors',
                    announcement.type === 'warning' && 'bg-semantic-status-warning/5 border-semantic-status-warning',
                    announcement.type === 'info' && 'bg-semantic-status-info/5 border-semantic-status-info',
                    announcement.type === 'success' && 'bg-semantic-status-success/5 border-semantic-status-success'
                  )}>
                    <h4 className="text-body-sm font-semibold text-semantic-text-primary mb-1">{announcement.title}</h4>
                    <p className="text-body-sm text-semantic-text-secondary mb-2">{announcement.body}</p>
                    <time className="text-caption text-semantic-text-tertiary">{formatRelativeTime(announcement.createdAt)}</time>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}