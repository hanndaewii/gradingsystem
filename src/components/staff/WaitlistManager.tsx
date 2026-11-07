'use client';

import * as React from 'react';
import { X, CheckCircle, AlertCircle, Loader2, ChevronLeft, ChevronRight, AlertTriangle, Eye, Download, UserPlus, Bell, Settings, Filter, Search, ArrowUp, ArrowDown, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { Badge } from '@/components/ui/Badge';
import { DataTable, columnHelper } from '@/components/ui/DataTable';
import { Switch } from '@/components/ui/Switch';
import { cn, formatRelativeTime } from '@/lib/utils';

interface WaitlistManagerProps {
  onClose: () => void;
}

interface WaitlistEntry {
  id: string;
  studentId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  sectionId: string;
  sectionCode: string;
  courseCode: string;
  position: number;
  joinedAt: string;
  status: 'waiting' | 'notified' | 'promoted' | 'expired' | 'removed';
  notifiedAt?: string;
  promotedAt?: string;
  priority: number;
  notes?: string;
}

interface SectionWaitlist {
  sectionId: string;
  sectionCode: string;
  courseCode: string;
  courseName: string;
  term: string;
  capacity: number;
  enrolled: number;
  waitlisted: number;
  waitlistLimit: number;
  autoPromote: boolean;
  notificationWindow: number; // hours
  entries: WaitlistEntry[];
}

const mockSections: SectionWaitlist[] = [
  {
    sectionId: 'sec-1',
    sectionCode: 'CS 301-A',
    courseCode: 'CS 301',
    courseName: 'Database Systems',
    term: 'Fall 2024',
    capacity: 40,
    enrolled: 38,
    waitlisted: 5,
    waitlistLimit: 10,
    autoPromote: true,
    notificationWindow: 24,
    entries: [
      { id: 'wl-1', studentId: 'stu-2001', studentNumber: 'S20242001', firstName: 'Alex', lastName: 'Johnson', email: 'alex.johnson@university.edu', sectionId: 'sec-1', sectionCode: 'CS 301-A', courseCode: 'CS 301', position: 1, joinedAt: '2024-08-10T08:00:00Z', status: 'waiting', priority: 1 },
      { id: 'wl-2', studentId: 'stu-2002', studentNumber: 'S20242002', firstName: 'Maria', lastName: 'Garcia', email: 'maria.garcia@university.edu', sectionId: 'sec-1', sectionCode: 'CS 301-A', courseCode: 'CS 301', position: 2, joinedAt: '2024-08-11T14:30:00Z', status: 'waiting', priority: 2 },
      { id: 'wl-3', studentId: 'stu-2003', studentNumber: 'S20242003', firstName: 'James', lastName: 'Wilson', email: 'james.wilson@university.edu', sectionId: 'sec-1', sectionCode: 'CS 301-A', courseCode: 'CS 301', position: 3, joinedAt: '2024-08-12T10:15:00Z', status: 'notified', notifiedAt: '2024-08-15T09:00:00Z', priority: 3 },
      { id: 'wl-4', studentId: 'stu-2004', studentNumber: 'S20242004', firstName: 'Sarah', lastName: 'Davis', email: 'sarah.davis@university.edu', sectionId: 'sec-1', sectionCode: 'CS 301-A', courseCode: 'CS 301', position: 4, joinedAt: '2024-08-13T16:45:00Z', status: 'waiting', priority: 4 },
      { id: 'wl-5', studentId: 'stu-2005', studentNumber: 'S20242005', firstName: 'Michael', lastName: 'Brown', email: 'michael.brown@university.edu', sectionId: 'sec-1', sectionCode: 'CS 301-A', courseCode: 'CS 301', position: 5, joinedAt: '2024-08-14T11:20:00Z', status: 'waiting', priority: 5 },
    ],
  },
  {
    sectionId: 'sec-2',
    sectionCode: 'CS 101-A',
    courseCode: 'CS 101',
    courseName: 'Introduction to Computer Science',
    term: 'Fall 2024',
    capacity: 150,
    enrolled: 142,
    waitlisted: 12,
    waitlistLimit: 20,
    autoPromote: true,
    notificationWindow: 24,
    entries: [
      { id: 'wl-6', studentId: 'stu-2006', studentNumber: 'S20242006', firstName: 'Emily', lastName: 'Johnson', email: 'emily.johnson@university.edu', sectionId: 'sec-2', sectionCode: 'CS 101-A', courseCode: 'CS 101', position: 1, joinedAt: '2024-08-15T09:00:00Z', status: 'waiting', priority: 1 },
      { id: 'wl-7', studentId: 'stu-2007', studentNumber: 'S20242007', firstName: 'David', lastName: 'Miller', email: 'david.miller@university.edu', sectionId: 'sec-2', sectionCode: 'CS 101-A', courseCode: 'CS 101', position: 2, joinedAt: '2024-08-15T10:30:00Z', status: 'waiting', priority: 2 },
    ],
  },
  {
    sectionId: 'sec-3',
    sectionCode: 'CS 201-B',
    courseCode: 'CS 201',
    courseName: 'Data Structures & Algorithms',
    term: 'Fall 2024',
    capacity: 50,
    enrolled: 50,
    waitlisted: 8,
    waitlistLimit: 10,
    autoPromote: false,
    notificationWindow: 12,
    entries: [
      { id: 'wl-8', studentId: 'stu-2008', studentNumber: 'S20242008', firstName: 'Lisa', lastName: 'Anderson', email: 'lisa.anderson@university.edu', sectionId: 'sec-3', sectionCode: 'CS 201-B', courseCode: 'CS 201', position: 1, joinedAt: '2024-08-16T08:00:00Z', status: 'waiting', priority: 1 },
      { id: 'wl-9', studentId: 'stu-2009', studentNumber: 'S20242009', firstName: 'Robert', lastName: 'Taylor', email: 'robert.taylor@university.edu', sectionId: 'sec-3', sectionCode: 'CS 201-B', courseCode: 'CS 201', position: 2, joinedAt: '2024-08-16T09:15:00Z', status: 'waiting', priority: 2 },
    ],
  },
];

const allEntries = mockSections.flatMap(s => s.entries);

const statusConfig = {
  waiting: { label: 'Waiting', variant: 'info' as const, icon: AlertTriangle },
  notified: { label: 'Notified', variant: 'warning' as const, icon: Bell },
  promoted: { label: 'Promoted', variant: 'success' as const, icon: CheckCircle },
  expired: { label: 'Expired', variant: 'error' as const, icon: AlertCircle },
  removed: { label: 'Removed', variant: 'default' as const, icon: X },
};

export function WaitlistManager({ onClose }: WaitlistManagerProps) {
  const [activeTab, setActiveTab] = React.useState<'overview' | 'entries' | 'config' | 'audit'>('overview');
  const [selectedSection, setSelectedSection] = React.useState<string | null>(mockSections[0].sectionId);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showConfig, setShowConfig] = React.useState<string | null>(null);

  const currentSection = mockSections.find(s => s.sectionId === selectedSection) || mockSections[0];
  const sectionEntries = currentSection.entries;

  const waitingCount = allEntries.filter(e => e.status === 'waiting').length;
  const notifiedCount = allEntries.filter(e => e.status === 'notified').length;
  const promotedCount = allEntries.filter(e => e.status === 'promoted').length;
  const totalWaitlisted = allEntries.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-6xl max-h-[90vh] bg-semantic-bg-primary rounded-xl border border-semantic-border-primary shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-semantic-border-primary bg-semantic-bg-secondary">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-semantic-status-warning/10 flex-center">
              <AlertTriangle className="h-5 w-5 text-semantic-status-warning" />
            </div>
            <div>
              <h2 className="text-heading-md font-semibold text-semantic-text-primary">Waitlist Manager</h2>
              <p className="text-body-sm text-semantic-text-secondary">Monitor and manage waitlist promotions across all sections</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="p-4 border-b border-semantic-border-primary bg-semantic-bg-secondary/50">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-caption text-semantic-text-tertiary">Total Waitlisted</p>
                <p className="text-heading-lg font-bold text-semantic-text-primary">{totalWaitlisted}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-caption text-semantic-text-tertiary">Waiting</p>
                <p className="text-heading-lg font-bold text-semantic-status-info">{waitingCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-caption text-semantic-text-tertiary">Notified</p>
                <p className="text-heading-lg font-bold text-semantic-status-warning">{notifiedCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-caption text-semantic-text-tertiary">Promoted</p>
                <p className="text-heading-lg font-bold text-semantic-status-success">{promotedCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-caption text-semantic-text-tertiary">Sections with Waitlist</p>
                <p className="text-heading-lg font-bold text-semantic-text-primary">{mockSections.filter(s => s.waitlisted > 0).length}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full md:w-auto m-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="entries">All Entries ({totalWaitlisted})</TabsTrigger>
            <TabsTrigger value="config">Auto-Promotion Config</TabsTrigger>
            <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="m-4 space-y-6">
            {/* Section Waitlist Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-heading-md">Section Waitlists</CardTitle>
                <CardDescription>Sections with active waitlists</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  columns={[
                    columnHelper.accessor('sectionCode', { header: 'Section', cell: info => <span className="font-mono font-medium">{info.getValue()}</span>, size: 120 }),
                    columnHelper.accessor('courseName', { header: 'Course', cell: info => info.getValue() as string, size: 200 }),
                    columnHelper.accessor('term', { header: 'Term', cell: info => info.getValue() as string, size: 120 }),
                    columnHelper.accessor('capacity', { header: 'Capacity', cell: info => info.getValue() as number, size: 80 }),
                    columnHelper.accessor('enrolled', { header: 'Enrolled', cell: info => info.getValue() as number, size: 80 }),
                    columnHelper.accessor('waitlisted', { header: 'Waitlisted', cell: info => info.getValue() as number, size: 80 }),
                    columnHelper.accessor('waitlistLimit', { header: 'Limit', cell: info => info.getValue() as number, size: 70 }),
                    columnHelper.display({
                      id: 'utilization',
                      header: 'Utilization',
                      cell: ({ row }) => {
                        const util = Math.round((row.original.enrolled / row.original.capacity) * 100);
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
                    columnHelper.accessor('autoPromote', { 
                      header: 'Auto-Promote', 
                      cell: info => info.getValue() ? (
                        <Badge variant="success" className="gap-1"><CheckCircle className="h-3 w-3" /> Enabled</Badge>
                      ) : (
                        <Badge variant="warning" className="gap-1"><AlertTriangle className="h-3 w-3" /> Disabled</Badge>
                      ),
                      size: 120,
                    }),
                    columnHelper.display({
                      id: 'actions',
                      header: 'Actions',
                      cell: ({ row }) => (
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedSection(row.original.sectionId); setActiveTab('entries'); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowConfig(row.original.sectionId)}>
                            <Settings className="h-4 w-4" />
                          </Button>
                          {(row.original.waitlisted > 0 && row.original.enrolled < row.original.capacity) && (
                            <Button variant="success" size="sm" className="gap-1" onClick={() => {}}>
                              <UserPlus className="h-3 w-3" />
                              Promote
                            </Button>
                          )}
                        </div>
                      ),
                      size: 140,
                    }),
                  ]}
                  data={mockSections.filter(s => s.waitlisted > 0)}
                  rowKey="sectionId"
                  pageSize={10}
                  showColumnVisibility={false}
                  showExport={false}
                  className="rounded-none"
                />
              </CardContent            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-heading-md">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Button variant="outline" className="gap-2 justify-start" onClick={() => {}}>
                    <Download className="h-4 w-4" />
                    Export All Waitlists
                  </Button>
                  <Button variant="outline" className="gap-2 justify-start" onClick={() => {}}>
                    <Bell className="h-4 w-4" />
                    Send Reminder Notifications
                  </Button>
                  <Button variant="outline" className="gap-2 justify-start" onClick={() => {}}>
                    <Filter className="h-4 w-4" />
                    Run Conflict Check
                  </Button>
                  <Button variant="primary" className="gap-2 justify-start" onClick={() => {}}>
                    <ArrowUp className="h-4 w-4" />
                    Process All Promotions
                  </Button>
                </div>
              </CardContent            </Card>
          </TabsContent>

          <TabsContent value="entries" className="m-4 space-y-6">
            {/* Section Selector */}
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                  <div className="flex items-center gap-2 flex-1">
                    <label className="text-caption text-semantic-text-tertiary whitespace-nowrap">Section:</label>
                    <Select
                      value={selectedSection || ''}
                      onValueChange={setSelectedSection}
                      options={mockSections.map(s => ({ value: s.sectionId, label: `${s.sectionCode} - ${s.courseName} (${s.waitlisted} waiting)` }))}
                      placeholder="Select section"
                      size="sm"
                      className="w-full lg:w-80"
                    />
                  </div>
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-semantic-text-tertiary" aria-hidden="true" />
                    <Input
                      placeholder="Search waitlist entries..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      size="sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section Info */}
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <p className="text-caption text-semantic-text-tertiary">Section</p>
                    <p className="font-mono font-medium text-semantic-text-primary">{currentSection.sectionCode}</p>
                  </div>
                  <div>
                    <p className="text-caption text-semantic-text-tertiary">Course</p>
                    <p className="font-medium text-semantic-text-primary">{currentSection.courseName}</p>
                  </div>
                  <div>
                    <p className="text-caption text-semantic-text-tertiary">Available Seats</p>
                    <p className="font-bold text-semantic-status-success">{currentSection.capacity - currentSection.enrolled}</p>
                  </div>
                  <div>
                    <p className="text-caption text-semantic-text-tertiary">Waitlisted</p>
                    <p className="font-bold text-semantic-status-warning">{currentSection.waitlisted}</p>
                  </div>
                  <div>
                    <p className="text-caption text-semantic-text-tertiary">Auto-Promote</p>
                    <Badge variant={currentSection.autoPromote ? 'success' : 'warning'} className="gap-1">
                      {currentSection.autoPromote ? <CheckCircle className="h-3 w-3" /> Enabled : <AlertTriangle className="h-3 w-3" /> Disabled}
                    </Badge>
                  </div>
                </div>
              </CardContent            </Card>

            {/* Waitlist Entries */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-heading-md">Waitlist Entries</CardTitle>
                  <CardDescription>{sectionEntries.length} students on waitlist</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => {}}>
                    <ArrowUp className="h-3 w-3" />
                    Promote Next
                  </Button>
                  <Button variant="primary" size="sm" className="gap-2" onClick={() => {}}>
                    <UserPlus className="h-3 w-3" />
                    Promote All Available
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  columns={[
                    columnHelper.accessor('position', { header: 'Position', cell: info => <span className="font-mono font-medium text-semantic-text-primary">#{info.getValue()}</span>, size: 80 }),
                    columnHelper.accessor('studentNumber', { header: 'Student ID', cell: info => <span className="font-mono">{info.getValue()}</span>, size: 120 }),
                    columnHelper.accessor('lastName', { 
                      header: 'Name', 
                      cell: info => {
                        const row = info.row.original;
                        return `${row.lastName}, ${row.firstName}`;
                      }, 
                      size: 150 
                    }),
                    columnHelper.accessor('email', { header: 'Email', cell: info => info.getValue() as string, size: 200 }),
                    columnHelper.accessor('joinedAt', { 
                      header: 'Joined', 
                      cell: info => formatRelativeTime(info.getValue() as string),
                      size: 140,
                    }),
                    columnHelper.accessor('status', { 
                      header: 'Status', 
                      cell: info => {
                        const status = info.getValue() as keyof typeof statusConfig;
                        const config = statusConfig[status];
                        return (
                          <Badge variant={config.variant} className="gap-1">
                            <config.icon className="h-3 w-3" />
                            {config.label}
                          </Badge>
                        );
                      },
                      size: 120,
                    }),
                    columnHelper.accessor('notifiedAt', { 
                      header: 'Notified', 
                      cell: info => info.getValue() ? formatRelativeTime(info.getValue() as string) : <span className="text-semantic-text-tertiary">—</span>,
                      size: 140,
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
                              <DropdownMenuItem onClick={() => {}} className="gap-2 text-semantic-status-success">
                                <ArrowUp className="h-4 w-4" />
                                Promote Now
                              </DropdownMenuItem>
                            )}
                            {row.original.status === 'notified' && (
                              <DropdownMenuItem onClick={() => {}} className="gap-2 text-semantic-status-success">
                                <ArrowUp className="h-4 w-4" />
                                Promote Now
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => {}} className="gap-2">
                              <Bell className="h-4 w-4" />
                              Renotify
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {}} className="gap-2">
                              <Eye className="h-4 w-4" />
                              View Student Profile
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => {}} className="gap-2 text-semantic-status-error">
                              <X className="h-4 w-4" />
                              Remove from Waitlist
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ),
                      size: 100,
                    }),
                  ]}
                  data={sectionEntries.filter(e => 
                    e.studentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    e.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    e.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    e.email.toLowerCase().includes(searchQuery.toLowerCase())
                  )}
                  rowKey="id"
                  pageSize={15}
                  showColumnVisibility={false}
                  showExport={false}
                  className="rounded-none"
                />
              </CardContent            </Card>
          </TabsContent>

          <TabsContent value="config" className="m-4 space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-heading-md">Auto-Promotion Configuration</CardTitle>
                <CardDescription>Configure automatic waitlist promotion settings per section</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {mockSections.map((section) => (
                    <Card key={section.sectionId} className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-semibold text-semantic-text-primary">{section.sectionCode}</h4>
                          <p className="text-body-sm text-semantic-text-secondary">{section.courseName}</p>
                        </div>
                        <Badge variant={section.autoPromote ? 'success' : 'warning'} className="gap-1">
                          {section.autoPromote ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                          {section.autoPromote ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      
                      <div className="space-y-4">
                        <label className="flex items-center justify-between">
                          <span className="text-body-sm text-semantic-text-primary">Auto-Promote Enabled</span>
                          <Switch
                            checked={section.autoPromote}
                            onCheckedChange={(checked) => {}}
                          />
                        </label>
                        
                        <div>
                          <label className="text-caption text-semantic-text-tertiary">Notification Window (hours)</label>
                          <Input
                            type="number"
                            defaultValue={section.notificationWindow}
                            size="sm"
                            className="w-24 mt-1"
                            onChange={(e) => {}}
                          />
                        </div>
                        
                        <div>
                          <label className="text-caption text-semantic-text-tertiary">Waitlist Limit</label>
                          <Input
                            type="number"
                            defaultValue={section.waitlistLimit}
                            size="sm"
                            className="w-24 mt-1"
                            onChange={(e) => {}}
                          />
                        </div>

                        <div className="pt-4 border-t border-semantic-border-primary flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => {}}>
                            <Bell className="h-3 w-3" />
                            Test Notification
                          </Button>
                          <Button variant="primary" size="sm" className="flex-1 gap-1" onClick={() => {}}>
                            <ArrowUp className="h-3 w-3" />
                            Promote Next
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent            </Card>
          </TabsContent>

          <TabsContent value="audit" className="m-4 space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-heading-md">Promotion Audit Trail</CardTitle>
                <CardDescription>History of all waitlist promotions and notifications</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  columns={[
                    columnHelper.accessor('timestamp', { 
                      header: 'Date', 
                      cell: info => formatRelativeTime(info.getValue() as string),
                      size: 140,
                    }),
                    columnHelper.accessor('action', { 
                      header: 'Action', 
                      cell: info => {
                        const action = info.getValue() as string;
                        const variants = { promoted: 'success', notified: 'warning', expired: 'error', removed: 'default', manual_promote: 'info' };
                        return <Badge variant={variants[action as keyof typeof variants] || 'default'}>{action.replace('_', ' ')}</Badge>;
                      },
                      size: 140,
                    }),
                    columnHelper.accessor('sectionCode', { header: 'Section', cell: info => <span className="font-mono">{info.getValue()}</span>, size: 120 }),
                    columnHelper.accessor('studentName', { header: 'Student', cell: info => info.getValue() as string, size: 180 }),
                    columnHelper.accessor('position', { header: 'Position', cell: info => `#${info.getValue()}`, size: 80 }),
                    columnHelper.accessor('performedBy', { header: 'Performed By', cell: info => info.getValue() as string, size: 180 }),
                    columnHelper.accessor('details', { header: 'Details', cell: info => info.getValue() as string, size: 250 }),
                  ]}
                  data={[
                    { id: '1', timestamp: '2024-01-15T08:45:00Z', action: 'promoted', sectionCode: 'CS 101-A', studentName: 'Alex Johnson', position: 1, performedBy: 'System (Auto-promotion)', details: 'Seat opened due to drop; promoted from position #1' },
                    { id: '2', timestamp: '2024-01-15T08:44:00Z', action: 'notified', sectionCode: 'CS 301-A', studentName: 'James Wilson', position: 3, performedBy: 'System (Auto-promotion)', details: 'Notification sent; 24-hour response window started' },
                    { id: '3', timestamp: '2024-01-14T16:30:00Z', action: 'manual_promote', sectionCode: 'CS 201-B', studentName: 'Maria Garcia', position: 2, performedBy: 'Registrar Office', details: 'Manual promotion approved by registrar' },
                    { id: '4', timestamp: '2024-01-14T10:15:00Z', action: 'promoted', sectionCode: 'CS 101-A', studentName: 'Sarah Davis', position: 1, performedBy: 'System (Auto-promotion)', details: 'Seat opened due to drop; promoted from position #1' },
                    { id: '5', timestamp: '2024-01-13T14:20:00Z', action: 'expired', sectionCode: 'CS 301-A', studentName: 'Robert Taylor', position: 5, performedBy: 'System (Auto-promotion)', details: 'Notification expired after 24 hours; removed from waitlist' },
                    { id: '6', timestamp: '2024-01-13T09:00:00Z', action: 'notified', sectionCode: 'CS 101-A', studentName: 'Emily Johnson', position: 1, performedBy: 'System (Auto-promotion)', details: 'Notification sent; 24-hour response window started' },
                    { id: '7', timestamp: '2024-01-12T16:45:00Z', action: 'removed', sectionCode: 'CS 201-B', studentName: 'Lisa Anderson', position: 1, performedBy: 'Student Portal', details: 'Student requested removal from waitlist' },
                  ]}
                  rowKey="id"
                  pageSize={15}
                  showColumnVisibility={false}
                  showExport={true}
                  onExport={() => {}}
                  className="rounded-none"
                />
              </CardContent            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/DropdownMenu';