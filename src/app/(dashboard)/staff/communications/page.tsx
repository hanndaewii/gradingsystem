'use client';

import * as React from 'react';
import { Mail, Send, Clock, Filter, Download, Search, Plus, X, Save, Loader2, CheckCircle, AlertTriangle, Users, User, FileText, MoreHorizontal, Trash2, Edit, Copy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/DropdownMenu';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { DataTable, columnHelper } from '@/components/ui/DataTable';
import { CommunicationCenter } from '@/components/staff/CommunicationCenter';
import { formatRelativeTime, cn } from '@/lib/utils';

interface Communication {
  id: string;
  subject: string;
  type: 'email' | 'sms';
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  recipients: {
    type: 'students' | 'professors' | 'sections' | 'custom';
    count: number;
    filters?: Record<string, unknown>;
  };
  template?: string;
  scheduledAt?: string;
  sentAt?: string;
  delivered?: number;
  opened?: number;
  clicked?: number;
  createdBy: string;
  createdAt: string;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  type: 'email' | 'sms';
  category: string;
  lastUsed: string;
  useCount: number;
}

const mockCommunications: Communication[] = [
  {
    id: '1',
    subject: 'Fall 2024 Registration Reminder',
    type: 'email',
    status: 'sent',
    recipients: { type: 'students', count: 12450, filters: { term: 'Fall 2024', status: 'not_registered' } },
    template: 'registration-reminder',
    sentAt: '2024-01-14T15:00:00Z',
    delivered: 12380,
    opened: 8945,
    clicked: 2134,
    createdBy: 'Registrar Office',
    createdAt: '2024-01-14T14:30:00Z',
  },
  {
    id: '2',
    subject: 'Grade Submission Deadline - January 20',
    type: 'email',
    status: 'scheduled',
    recipients: { type: 'professors', count: 387, filters: { term: 'Fall 2024', hasPendingGrades: true } },
    template: 'grade-deadline',
    scheduledAt: '2024-01-16T09:00:00Z',
    createdBy: 'Registrar Office',
    createdAt: '2024-01-15T10:15:00Z',
  },
  {
    id: '3',
    subject: 'Waitlist Promotion Notification',
    type: 'email',
    status: 'sent',
    recipients: { type: 'students', count: 23, filters: { sections: ['CS 101-A', 'CS 201-B'] } },
    template: 'waitlist-promotion',
    sentAt: '2024-01-15T08:45:00Z',
    delivered: 23,
    opened: 19,
    clicked: 12,
    createdBy: 'System (Auto-promotion)',
    createdAt: '2024-01-15T08:45:00Z',
  },
  {
    id: '4',
    subject: 'CS 301-A Schedule Change',
    type: 'sms',
    status: 'sent',
    recipients: { type: 'sections', count: 38, filters: { section: 'CS 301-A' } },
    template: 'schedule-change',
    sentAt: '2024-01-13T14:20:00Z',
    delivered: 38,
    opened: 35,
    clicked: 8,
    createdBy: 'Dr. Sarah Chen',
    createdAt: '2024-01-13T14:15:00Z',
  },
  {
    id: '5',
    subject: 'Spring 2025 Course Catalog Available',
    type: 'email',
    status: 'draft',
    recipients: { type: 'students', count: 15420, filters: { year: ['Junior', 'Senior'] } },
    template: 'catalog-available',
    createdBy: 'Registrar Office',
    createdAt: '2024-01-12T11:30:00Z',
  },
  {
    id: '6',
    subject: 'Prerequisite Override Request - Action Required',
    type: 'email',
    status: 'failed',
    recipients: { type: 'professors', count: 1, filters: { professorId: 'prof-5' } },
    template: 'override-request',
    sentAt: '2024-01-11T16:30:00Z',
    delivered: 0,
    opened: 0,
    clicked: 0,
    createdBy: 'Student Portal',
    createdAt: '2024-01-11T16:25:00Z',
  },
];

const templates: Template[] = [
  { id: 'registration-reminder', name: 'Registration Reminder', subject: 'Reminder: Register for {term} Classes', type: 'email', category: 'Registration', lastUsed: '2024-01-14T15:00:00Z', useCount: 45 },
  { id: 'grade-deadline', name: 'Grade Submission Deadline', subject: 'Action Required: Grade Submission Due {date}', type: 'email', category: 'Grading', lastUsed: '2024-01-10T09:00:00Z', useCount: 28 },
  { id: 'waitlist-promotion', name: 'Waitlist Promotion', subject: 'You\'ve been promoted from the waitlist for {course}', type: 'email', category: 'Enrollment', lastUsed: '2024-01-15T08:45:00Z', useCount: 156 },
  { id: 'schedule-change', name: 'Schedule Change Notification', subject: 'Schedule Update: {course} - {details}', type: 'sms', category: 'Schedule', lastUsed: '2024-01-13T14:20:00Z', useCount: 34 },
  { id: 'catalog-available', name: 'Course Catalog Available', subject: 'New Course Catalog for {term} Now Available', type: 'email', category: 'Registration', lastUsed: '2024-11-01T10:00:00Z', useCount: 12 },
  { id: 'override-request', name: 'Prerequisite Override Request', subject: 'Override Request: {student} for {course}', type: 'email', category: 'Enrollment', lastUsed: '2024-01-11T16:30:00Z', useCount: 67 },
  { id: 'welcome-new-students', name: 'Welcome New Students', subject: 'Welcome to {institution}! Your Next Steps', type: 'email', category: 'Onboarding', lastUsed: '2024-08-15T09:00:00Z', useCount: 89 },
  { id: 'drop-confirmation', name: 'Course Drop Confirmation', subject: 'Confirmation: You have been dropped from {course}', type: 'email', category: 'Enrollment', lastUsed: '2024-01-05T14:20:00Z', useCount: 234 },
];

const statusConfig = {
  draft: { label: 'Draft', variant: 'default' as const, icon: FileText },
  scheduled: { label: 'Scheduled', variant: 'info' as const, icon: Clock },
  sending: { label: 'Sending', variant: 'warning' as const, icon: Loader2 },
  sent: { label: 'Sent', variant: 'success' as const, icon: CheckCircle },
  failed: { label: 'Failed', variant: 'error' as const, icon: AlertTriangle },
};

const typeConfig = {
  email: { label: 'Email', icon: Mail, color: 'text-semantic-brand-primary' },
  sms: { label: 'SMS', icon: Send, color: 'text-semantic-status-success' },
};

export default function CommunicationsPage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'history' | 'templates' | 'compose'>('history');
  const [showCompose, setShowCompose] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<Template | null>(null);

  const filteredCommunications = mockCommunications.filter(c => {
    const matchesSearch = c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.recipients.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.createdBy.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-semantic-bg-primary">
      {/* Header */}
      <header className="border-b border-semantic-border-primary bg-semantic-bg-secondary/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container equal-edges">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
            <div>
              <h1 className="text-display-sm font-semibold text-semantic-text-primary">Communications Center</h1>
              <p className="text-body-sm text-semantic-text-secondary mt-1">Send emails and SMS to students and faculty with templates and tracking</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => { setActiveTab('compose'); setShowCompose(true); }} className="gap-2">
              <Plus className="h-4 w-4" />
              New Communication
            </Button>
          </div>
        </div>
      </header>

      <main className="container equal-edges py-6 section-spacing">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-semantic-text-tertiary">Sent This Month</p>
                  <p className="text-heading-lg font-bold text-semantic-text-primary">1,247</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-semantic-brand-primary/10 flex-center">
                  <Mail className="h-5 w-5 text-semantic-brand-primary" />
                </div>
              </div>
            </CardContent          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-semantic-text-tertiary">Delivery Rate</p>
                  <p className="text-heading-lg font-bold text-semantic-status-success">98.2%</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-semantic-status-success/10 flex-center">
                  <CheckCircle className="h-5 w-5 text-semantic-status-success" />
                </div>
              </div>
            </CardContent          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-semantic-text-tertiary">Open Rate</p>
                  <p className="text-heading-lg font-bold text-semantic-text-primary">72.1%</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-semantic-status-info/10 flex-center">
                  <CheckCircle className="h-5 w-5 text-semantic-status-info" />
                </div>
              </div>
            </CardContent          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-semantic-text-tertiary">Click Rate</p>
                  <p className="text-heading-lg font-bold text-semantic-text-primary">17.8%</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-semantic-status-warning/10 flex-center">
                  <CheckCircle className="h-5 w-5 text-semantic-status-warning" />
                </div>
              </div>
            </CardContent          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full md:w-auto mb-6">
            <TabsTrigger value="history">History ({mockCommunications.length})</TabsTrigger>
            <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
            <TabsTrigger value="compose">Compose</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-6">
            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="p-4 pt-6">
                <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-semantic-text-tertiary" aria-hidden="true" />
                    <Input
                      placeholder="Search communications..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      size="sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Communications Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-heading-md">Communication History</CardTitle>
                  <CardDescription>All sent, scheduled, and draft communications</CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1">
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {}}>Export to CSV</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {}}>Export to Excel</DropdownMenuItem>
                  </DropdownMenuContent
                ></DropdownMenu>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  columns={[
                    columnHelper.accessor('subject', { 
                      header: 'Subject', 
                      cell: info => <span className="font-medium text-semantic-text-primary">{info.getValue()}</span>,
                      size: 300,
                    }),
                    columnHelper.accessor('type', { 
                      header: 'Type', 
                      cell: info => {
                        const type = info.getValue() as keyof typeof typeConfig;
                        const config = typeConfig[type];
                        const Icon = config.icon;
                        return (
                          <Badge variant="default" className="gap-1">
                            <Icon className={cn('h-3 w-3', config.color)} />
                            {config.label}
                          </Badge>
                        );
                      },
                      size: 80,
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
                    columnHelper.accessor('recipients', { 
                      header: 'Recipients', 
                      cell: info => {
                        const r = info.getValue() as Communication['recipients'];
                        return (
                          <div>
                            <p className="font-medium text-semantic-text-primary">{r.count.toLocaleString()} {r.type}</p>
                            <p className="text-caption text-semantic-text-tertiary capitalize">{r.type.replace('_', ' ')}</p>
                          </div>
                        );
                      },
                      size: 180,
                    }),
                    columnHelper.accessor('template', { 
                      header: 'Template', 
                      cell: info => info.getValue() ? <Badge variant="default">{info.getValue()}</Badge> : <span className="text-semantic-text-tertiary">Custom</span>,
                      size: 150,
                    }),
                    columnHelper.accessor('scheduledAt', { 
                      header: 'Scheduled', 
                      cell: info => info.getValue() ? formatRelativeTime(info.getValue() as string) : <span className="text-semantic-text-tertiary">—</span>,
                      size: 140,
                    }),
                    columnHelper.accessor('sentAt', { 
                      header: 'Sent', 
                      cell: info => info.getValue() ? formatRelativeTime(info.getValue() as string) : <span className="text-semantic-text-tertiary">—</span>,
                      size: 140,
                    }),
                    columnHelper.accessor('delivered', { 
                      header: 'Delivered', 
                      cell: info => info.getValue() !== undefined ? info.getValue() : <span className="text-semantic-text-tertiary">—</span>,
                      size: 100,
                    }),
                    columnHelper.accessor('opened', { 
                      header: 'Opened', 
                      cell: info => info.getValue() !== undefined ? (
                        <>
                          {info.getValue()} ({Math.round((info.getValue() / (info.row.original.delivered || 1)) * 100)}%)
                        </>
                      ) : <span className="text-semantic-text-tertiary">—</span>,
                      size: 120,
                    }),
                    columnHelper.accessor('clicked', { 
                      header: 'Clicked', 
                      cell: info => info.getValue() !== undefined ? (
                        <>
                          {info.getValue()} ({Math.round((info.getValue() / (info.row.original.delivered || 1)) * 100)}%)
                        </>
                      ) : <span className="text-semantic-text-tertiary">—</span>,
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
                            {row.original.status === 'draft' && (
                              <>
                                <DropdownMenuItem onClick={() => {}} className="gap-2">
                                  <Edit className="h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {}} className="gap-2">
                                  <Send className="h-4 w-4" />
                                  Send Now
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {}} className="gap-2">
                                  <Clock className="h-4 w-4" />
                                  Schedule
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            {row.original.status === 'scheduled' && (
                              <>
                                <DropdownMenuItem onClick={() => {}} className="gap-2">
                                  <Edit className="h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {}} className="gap-2">
                                  <Send className="h-4 w-4" />
                                  Send Now
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            {row.original.status === 'sent' && (
                              <>
                                <DropdownMenuItem onClick={() => {}} className="gap-2">
                                  <BarChart2 className="h-4 w-4" />
                                  View Analytics
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {}} className="gap-2">
                                  <Copy className="h-4 w-4" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            {row.original.status === 'failed' && (
                              <>
                                <DropdownMenuItem onClick={() => {}} className="gap-2">
                                  <AlertTriangle className="h-4 w-4" />
                                  View Error
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {}} className="gap-2">
                                  <Send className="h-4 w-4" />
                                  Retry
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem onClick={() => {}} className="gap-2 text-semantic-status-error">
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ),
                      size: 100,
                    }),
                  ]}
                  data={filteredCommunications}
                  rowKey="id"
                  pageSize={10}
                  pageSizes={[10, 25, 50, 100]}
                  showExport
                  onExport={() => {}}
                  className="rounded-none"
                />
              </CardContent            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-heading-md">Message Templates</CardTitle>
                  <CardDescription>Reusable templates for common communications</CardDescription>
                </div>
                <Button variant="primary" size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Template
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {templates.map((template) => (
                    <Card key={template.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="h-10 w-10 rounded-lg bg-semantic-brand-primary/10 flex-center">
                            {template.type === 'email' ? (
                              <Mail className="h-5 w-5 text-semantic-brand-primary" />
                            ) : (
                              <Send className="h-5 w-5 text-semantic-status-success" />
                            )}
                          </div>
                          <Badge variant="default" className="text-[10px] capitalize">{template.category}</Badge>
                        </div>
                        <h4 className="font-semibold text-semantic-text-primary mb-1">{template.name}</h4>
                        <p className="text-body-sm text-semantic-text-secondary mb-3">{template.subject}</p>
                        <div className="flex items-center justify-between text-caption text-semantic-text-tertiary mb-4">
                          <span>Used {template.useCount} times</span>
                          <span>Last used: {formatRelativeTime(template.lastUsed)}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="primary" size="sm" className="flex-1 gap-1" onClick={() => { setActiveTab('compose'); setShowCompose(true); }}>
                            <Mail className="h-3 w-3" />
                            Use Template
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="gap-1">
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {}} className="gap-2">
                                <Edit className="h-4 w-4" />
                                Edit Template
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {}} className="gap-2">
                                <Copy className="h-4 w-4" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => {}} className="gap-2 text-semantic-status-error">
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent            </Card>
          </TabsContent>

          <TabsContent value="compose">
            <CommunicationCenter
              onClose={() => { setActiveTab('history'); setShowCompose(false); }}
              onSend={() => { setActiveTab('history'); setShowCompose(false); }}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}