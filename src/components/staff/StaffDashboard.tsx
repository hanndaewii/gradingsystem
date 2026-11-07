'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Users, 
  FileText, 
  Calendar, 
  AlertCircle, 
  TrendingUp,
  Settings,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Bell,
  Mail,
  Phone,
  Activity,
  GraduationCap,
  Building2
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
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { StatCard } from '@/components/ui/StatCard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { EnrollmentChart } from '@/components/ui/EnrollmentChart';

interface EnrollmentStat {
  label: string;
  value: number | string;
  change?: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple';
}

interface PendingAction {
  id: string;
  type: 'enrollment' | 'drop' | 'waitlist' | 'prerequisite' | 'override';
  student: string;
  course: string;
  section: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface QuickLink {
  label: string;
  href: string;
  icon: React.ReactNode;
  description: string;
}

const enrollmentStats: EnrollmentStat[] = [
  { label: 'Total Enrollments', value: '12,847', change: 5.2, icon: <Users className="w-6 h-6" />, color: 'blue' },
  { label: 'Active Students', value: '8,234', change: 3.1, icon: <GraduationCap className="w-6 h-6" />, color: 'green' },
  { label: 'Waitlisted', value: 342, change: -12.5, icon: <AlertCircle className="w-6 h-6" />, color: 'orange' },
  { label: 'Pending Actions', value: 87, change: 0, icon: <FileText className="w-6 h-6" />, color: 'red' },
  { label: 'Sections at Capacity', value: '23 / 156', change: 0, icon: <Building2 className="w-6 h-6" />, color: 'purple' },
  { label: 'This Term', value: 'Fall 2024', change: 0, icon: <Calendar className="w-6 h-6" />, color: 'blue' },
];

const pendingActions: PendingAction[] = [
  { id: '1', type: 'enrollment', student: 'Maria Santos', course: 'BUSAD 301', section: 'A', requestedAt: '2024-01-15 09:30', status: 'pending' },
  { id: '2', type: 'waitlist', student: 'Juan Dela Cruz', course: 'ECON 201', section: 'B', requestedAt: '2024-01-15 08:45', status: 'pending' },
  { id: '3', type: 'prerequisite', student: 'Ana Reyes', course: 'MGMT 401', section: 'A', requestedAt: '2024-01-14 16:20', status: 'pending' },
  { id: '4', type: 'drop', student: 'Carlos Mendoza', course: 'MKTG 301', section: 'C', requestedAt: '2024-01-14 14:10', status: 'approved' },
  { id: '5', type: 'override', student: 'Lisa Garcia', course: 'FIN 401', section: 'A', requestedAt: '2024-01-13 11:05', status: 'rejected' },
];

const quickLinks: QuickLink[] = [
  { label: 'Bulk Enrollment', href: '/staff/enrollments/bulk', icon: <Upload className="w-5 h-5" />, description: 'Import students via CSV' },
  { label: 'Manage Courses', href: '/staff/courses', icon: <FileText className="w-5 h-5" />, description: 'Create and edit courses' },
  { label: 'Section Management', href: '/staff/sections', icon: <Building2 className="w-5 h-5" />, description: 'Assign professors, set schedules' },
  { label: 'Waitlist Manager', href: '/staff/waitlist', icon: <Users className="w-5 h-5" />, description: 'Review and promote waitlisted students' },
  { label: 'Academic Terms', href: '/staff/terms', icon: <Calendar className="w-5 h-5" />, description: 'Configure terms and deadlines' },
  { label: 'Generate Reports', href: '/staff/reports', icon: <TrendingUp className="w-5 h-5" />, description: 'Enrollment and capacity reports' },
];

const enrollmentChartData = [
  { label: 'Week 1', enrolled: 8200, waitlisted: 450, dropped: 120 },
  { label: 'Week 2', enrolled: 9100, waitlisted: 380, dropped: 95 },
  { label: 'Week 3', enrolled: 10200, waitlisted: 320, dropped: 80 },
  { label: 'Week 4', enrolled: 11500, waitlisted: 280, dropped: 65 },
  { label: 'Week 5', enrolled: 12100, waitlisted: 342, dropped: 72 },
  { label: 'Week 6', enrolled: 12847, waitlisted: 342, dropped: 87 },
];

const enrollmentColumns: ColumnDef<PendingAction>[] = [
  { 
    accessorKey: 'type', 
    header: 'Type', 
    cell: ({ row }) => (
      <Badge variant={row.original.type === 'enrollment' ? 'default' : row.original.type === 'waitlist' ? 'info' : row.original.type === 'prerequisite' ? 'warning' : row.original.type === 'drop' ? 'danger' : 'secondary'}>
        {row.original.type.charAt(0).toUpperCase() + row.original.type.slice(1)}
      </Badge>
    ),
  },
  { accessorKey: 'student', header: 'Student' },
  { accessorKey: 'course', header: 'Course' },
  { accessorKey: 'section', header: 'Section' },
  { accessorKey: 'requestedAt', header: 'Requested' },
  { 
    accessorKey: 'status', 
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={row.original.status === 'pending' ? 'warning' : row.original.status === 'approved' ? 'success' : 'danger'}>
        {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
      </Badge>
    ),
  },
];

export function StaffDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'enrollments' | 'actions'>('overview');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="equal-edges">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-display-sm font-semibold text-gray-900 dark:text-gray-100">Staff Dashboard</h1>
            <p className="text-body text-gray-500 dark:text-gray-400 mt-1">Manage enrollments, courses, and academic operations</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Export</Button>
            <Button variant="outline" size="sm"><Upload className="w-4 h-4 mr-2" />Import</Button>
            <Button><Plus className="w-4 h-4 mr-2" />New Enrollment</Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="equal-edges">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {enrollmentStats.map((stat) => (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              change={stat.change}
              icon={stat.icon}
              color={stat.color}
            />
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="equal-edges">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
            <TabsTrigger value="actions">Pending Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Enrollment Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Enrollment Trends (Current Term)</CardTitle>
              </CardHeader>
              <CardContent>
                <EnrollmentChart 
                  data={enrollmentChartData}
                  xKey="label"
                  yKeys={['enrolled', 'waitlisted', 'dropped']}
                  labels={['Enrolled', 'Waitlisted', 'Dropped']}
                  colors={['var(--color-success)', 'var(--color-warning)', 'var(--color-danger)']}
                  height={300}
                  stacked
                />
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {quickLinks.map((link) => (
                    <Link 
                      key={link.label} 
                      href={link.href}
                      className="card-hover p-4 flex items-start gap-4 group"
                    >
                      <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300 group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                        {link.icon}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">{link.label}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{link.description}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Activity</CardTitle>
                <Button variant="ghost" size="sm">View All</Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { action: 'Bulk enrollment completed', details: '500 students enrolled in Fall 2024', time: '2 hours ago', icon: <Activity className="w-5 h-5 text-green-500" /> },
                    { action: 'Waitlist promotion run', details: '42 students promoted from waitlists', time: '4 hours ago', icon: <Users className="w-5 h-5 text-blue-500" /> },
                    { action: 'Term registration opened', details: 'Spring 2025 registration now open', time: '1 day ago', icon: <Calendar className="w-5 h-5 text-purple-500" /> },
                    { action: 'Course catalog updated', details: '15 new courses added for next term', time: '2 days ago', icon: <FileText className="w-5 h-5 text-orange-500" /> },
                  ].map((activity, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <div className="flex-shrink-0 mt-0.5">{activity.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{activity.action}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{activity.details}</p>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{activity.time}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="enrollments" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input placeholder="Search students, courses..." icon={<Search className="w-4 h-4" />} />
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All Terms" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Terms</SelectItem>
                  <SelectItem value="fall-2024">Fall 2024</SelectItem>
                  <SelectItem value="spring-2025">Spring 2025</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="all">
                <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="enrolled">Enrolled</SelectItem>
                  <SelectItem value="waitlisted">Waitlisted</SelectItem>
                  <SelectItem value="dropped">Dropped</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Card>
              <CardContent className="p-0">
                <DataTable
                  columns={[
                    { accessorKey: 'student', header: 'Student', cell: ({ row }) => <div className="font-medium">{row.original.student}</div> },
                    { accessorKey: 'studentId', header: 'Student ID' },
                    { accessorKey: 'course', header: 'Course' },
                    { accessorKey: 'section', header: 'Section' },
                    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <Badge variant={row.original.status === 'enrolled' ? 'success' : row.original.status === 'waitlisted' ? 'warning' : 'danger'}>{row.original.status}</Badge> },
                    { accessorKey: 'enrolledAt', header: 'Enrolled Date' },
                    { accessorKey: 'professor', header: 'Professor' },
                  ]}
                  data={[
                    { student: 'Maria Santos', studentId: '2021-00123', course: 'BUSAD 301', section: 'A', status: 'enrolled', enrolledAt: '2024-01-10', professor: 'Dr. Reyes' },
                    { student: 'Juan Dela Cruz', studentId: '2021-00456', course: 'ECON 201', section: 'B', status: 'waitlisted', enrolledAt: '2024-01-12', professor: 'Prof. Garcia' },
                    { student: 'Ana Reyes', studentId: '2022-00789', course: 'MGMT 401', section: 'A', status: 'enrolled', enrolledAt: '2024-01-08', professor: 'Dr. Martinez' },
                    { student: 'Carlos Mendoza', studentId: '2020-00234', course: 'MKTG 301', section: 'C', status: 'dropped', enrolledAt: '2024-01-05', professor: 'Prof. Lopez' },
                    { student: 'Lisa Garcia', studentId: '2021-00567', course: 'FIN 401', section: 'A', status: 'enrolled', enrolledAt: '2024-01-11', professor: 'Dr. Chen' },
                  ]}
                  searchable
                  filterable
                  sortable
                  pagination
                  pageSize={10}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Actions Queue</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  columns={enrollmentColumns}
                  data={pendingActions}
                  searchable
                  filterable
                  sortable
                  pagination
                  pageSize={10}
                  rowActions={[
                    { label: 'Approve', onClick: (row) => console.log('Approve', row.original.id), variant: 'success' },
                    { label: 'Reject', onClick: (row) => console.log('Reject', row.original.id), variant: 'danger' },
                    { label: 'View Details', onClick: (row) => console.log('View', row.original.id), variant: 'outline' },
                  ]}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}