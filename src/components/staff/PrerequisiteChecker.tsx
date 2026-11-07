'use client';

import * as React from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, ArrowRight, ArrowLeft, ChevronDown, ChevronUp, MoreHorizontal, Search, Filter, BookOpen, User, Settings, Plus, Edit, Trash2, Link as LinkIcon, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/DropdownMenu';
import { DataTable, columnHelper } from '@/components/ui/DataTable';
import { Switch } from '@/components/ui/Switch';
import { cn } from '@/lib/utils';

interface PrerequisiteCheckerProps {
  courseId: string;
  studentId?: string;
  onClose?: () => void;
}

interface PrerequisiteNode {
  id: string;
  courseCode: string;
  courseName: string;
  credits: number;
  minGrade: string;
  status: 'met' | 'in_progress' | 'not_met' | 'override_requested' | 'override_approved' | 'override_denied';
  grade?: string;
  term?: string;
  children: PrerequisiteNode[];
  overrideable: boolean;
  overrideRequested?: boolean;
  overrideReason?: string;
}

const mockPrereqTree: PrerequisiteNode = {
  id: 'cs301',
  courseCode: 'CS 301',
  courseName: 'Database Systems',
  credits: 3,
  minGrade: 'C-',
  status: 'met',
  grade: 'B+',
  term: 'Fall 2024',
  overrideable: false,
  children: [
    {
      id: 'cs201',
      courseCode: 'CS 201',
      courseName: 'Data Structures & Algorithms',
      credits: 4,
      minGrade: 'C-',
      status: 'met',
      grade: 'A-',
      term: 'Spring 2024',
      overrideable: true,
      children: [
        {
          id: 'cs101',
          courseCode: 'CS 101',
          courseName: 'Introduction to Computer Science',
          credits: 3,
          minGrade: 'C-',
          status: 'met',
          grade: 'A',
          term: 'Fall 2023',
          overrideable: false,
          children: [],
        },
      ],
    },
    {
      id: 'math101',
      courseCode: 'MATH 101',
      courseName: 'Calculus I',
      credits: 4,
      minGrade: 'C-',
      status: 'met',
      grade: 'A-',
      term: 'Fall 2023',
      overrideable: false,
      children: [],
    },
  ],
};

const mockOverrideRequests = [
  { id: '1', studentId: 'stu-1001', studentName: 'Maria Santos', courseCode: 'CS 201', reason: 'Equivalent coursework at previous institution', status: 'pending', requestedAt: '2024-01-15T10:30:00Z', reviewedBy: null, reviewedAt: null },
  { id: '2', studentId: 'stu-1002', studentName: 'James Wilson', courseCode: 'CS 101', reason: 'Self-taught programming experience', status: 'approved', requestedAt: '2024-01-14T14:20:00Z', reviewedBy: 'Dr. Johnson', reviewedAt: '2024-01-14T16:45:00Z' },
  { id: '3', studentId: 'stu-1003', studentName: 'Sarah Davis', courseCode: 'MATH 101', reason: 'AP Calculus BC score of 4', status: 'denied', requestedAt: '2024-01-13T09:15:00Z', reviewedBy: 'Dr. Smith', reviewedAt: '2024-01-13T11:30:00Z', denialReason: 'AP score 4 does not meet minimum requirement of 5' },
];

const statusConfig = {
  met: { label: 'Met', variant: 'success' as const, icon: CheckCircle, color: 'text-semantic-status-success' },
  in_progress: { label: 'In Progress', variant: 'info' as const, icon: AlertCircle, color: 'text-semantic-status-info' },
  not_met: { label: 'Not Met', variant: 'error' as const, icon: AlertTriangle, color: 'text-semantic-status-error' },
  override_requested: { label: 'Override Requested', variant: 'warning' as const, icon: Settings, color: 'text-semantic-status-warning' },
  override_approved: { label: 'Override Approved', variant: 'success' as const, icon: CheckCircle, color: 'text-semantic-status-success' },
  override_denied: { label: 'Override Denied', variant: 'error' as const, icon: AlertTriangle, color: 'text-semantic-status-error' },
};

function PrerequisiteTreeNode({ node, level = 0, onRequestOverride, onApproveOverride, onDenyOverride }: { node: PrerequisiteNode; level: number; onRequestOverride: (node: PrerequisiteNode) => void; onApproveOverride: (node: PrerequisiteNode) => void; onDenyOverride: (node: PrerequisiteNode) => void }) {
  const config = statusConfig[node.status];
  const hasChildren = node.children.length > 0;

  return (
    <div className={cn('flex flex-col', level > 0 && 'ml-8 border-l-2 border-semantic-border-primary pl-4')}>
      <div className="flex items-center gap-3 p-3 bg-semantic-bg-secondary rounded-lg border border-semantic-border-primary">
        {/* Connection line for children */}
        {level > 0 && (
          <div className="flex flex-col items-center w-6">
            <div className="w-0.5 h-4 bg-semantic-border-primary" />
            <div className="w-0.5 h-4 bg-semantic-border-primary" />
          </div>
        )}
        
        {/* Expand/Collapse */}
        {hasChildren && (
          <button className="p-1 rounded hover:bg-semantic-bg-tertiary transition-colors" onClick={() => {}}>
            <ChevronDown className={cn('h-4 w-4 transition-transform', 'rotate-0')} />
          </button>
        )}

        {/* Course Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-medium text-semantic-text-primary">{node.courseCode}</span>
            <span className="text-body-sm text-semantic-text-secondary">{node.courseName}</span>
            <Badge variant="default" className="text-[10px]">{node.credits} credits</Badge>
            <Badge variant={config.variant} className="gap-1">
              <config.icon className="h-3 w-3" />
              {config.label}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-semantic-text-tertiary flex-wrap">
            <span>Min Grade: <span className="font-mono">{node.minGrade}</span></span>
            {node.grade && <span>Grade: <span className="font-mono">{node.grade}</span></span>}
            {node.term && <span>Term: {node.term}</span>}
            {node.overrideable && <span className="text-semantic-status-warning">Override allowed</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {node.status === 'not_met' && node.overrideable && (
            <Button variant="outline" size="sm" className="gap-1" onClick={() => onRequestOverride(node)}>
              <Settings className="h-3 w-3" />
              Request Override
            </Button>
          )}
          {node.status === 'override_requested' && (
            <div className="flex items-center gap-1">
              <Button variant="success" size="sm" className="gap-1" onClick={() => onApproveOverride(node)}>
                <CheckCircle className="h-3 w-3" />
                Approve
              </Button>
              <Button variant="destructive" size="sm" className="gap-1" onClick={() => onDenyOverride(node)}>
                <AlertTriangle className="h-3 w-3" />
                Deny
              </Button>
            </div>
          )}
          {node.status === 'override_approved' && (
            <Badge variant="success" className="gap-1"><CheckCircle className="h-3 w-3" /> Approved</Badge>
          )}
          {node.status === 'override_denied' && (
            <Badge variant="error" className="gap-1"><AlertTriangle className="h-3 w-3" /> Denied</Badge>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && (
        <div className="mt-2 space-y-2">
          {node.children.map((child) => (
            <PrerequisiteTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onRequestOverride={onRequestOverride}
              onApproveOverride={onApproveOverride}
              onDenyOverride={onDenyOverride}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function PrerequisiteChecker({ courseId, studentId, onClose }: PrerequisiteCheckerProps) {
  const [activeTab, setActiveTab] = React.useState<'tree' | 'requests' | 'matrix'>('tree');
  const [selectedNode, setSelectedNode] = React.useState<PrerequisiteNode | null>(null);

  const handleRequestOverride = (node: PrerequisiteNode) => {
    setSelectedNode(node);
  };

  const handleApproveOverride = (node: PrerequisiteNode) => {
    // Handle approve
  };

  const handleDenyOverride = (node: PrerequisiteNode) => {
    // Handle deny
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-5xl max-h-[90vh] bg-semantic-bg-primary rounded-xl border border-semantic-border-primary shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-semantic-border-primary bg-semantic-bg-secondary">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-semantic-brand-primary/10 flex-center">
              <BookOpen className="h-5 w-5 text-semantic-brand-primary" />
            </div>
            <div>
              <h2 className="text-heading-md font-semibold text-semantic-text-primary">Prerequisite Checker</h2>
              <p className="text-body-sm text-semantic-text-secondary">Visual prerequisite tree with override request workflow</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full md:w-auto m-4">
            <TabsTrigger value="tree">Prerequisite Tree</TabsTrigger>
            <TabsTrigger value="requests">Override Requests ({mockOverrideRequests.length})</TabsTrigger>
            <TabsTrigger value="matrix">Course Matrix</TabsTrigger>
          </TabsList>

          <TabsContent value="tree" className="m-4 overflow-auto max-h-[60vh]">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-heading-md">Prerequisites for CS 301 - Database Systems</CardTitle>
                    <CardDescription>Student: Maria Santos (S20240001) • All prerequisites met</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Eye className="h-3 w-3" />
                      Show All Paths
                    </Button>
                    <Button variant="primary" size="sm" className="gap-2" onClick={() => setSelectedNode(mockPrereqTree)}>
                      <Plus className="h-3 w-3" />
                      Request Override
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <PrerequisiteTreeNode
                    node={mockPrereqTree}
                    onRequestOverride={handleRequestOverride}
                    onApproveOverride={handleApproveOverride}
                    onDenyOverride={handleDenyOverride}
                  />
                </div>
              </CardContent            </Card>
            </TabsContent>

          <TabsContent value="requests" className="m-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-heading-md">Override Requests</CardTitle>
                <CardDescription>Pending and processed prerequisite override requests</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  columns={[
                    columnHelper.accessor('studentName', { header: 'Student', cell: info => info.getValue() as string, size: 180 }),
                    columnHelper.accessor('courseCode', { header: 'Course', cell: info => <span className="font-mono">{info.getValue()}</span>, size: 100 }),
                    columnHelper.accessor('reason', { header: 'Reason', cell: info => info.getValue() as string, size: 250 }),
                    columnHelper.accessor('status', { 
                      header: 'Status', 
                      cell: info => {
                        const status = info.getValue() as string;
                        const variants = { pending: 'warning', approved: 'success', denied: 'error' };
                        return <Badge variant={variants[status as keyof typeof variants] || 'default'}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Badge>;
                      },
                      size: 120,
                    }),
                    columnHelper.accessor('requestedAt', { 
                      header: 'Requested', 
                      cell: info => formatRelativeTime(info.getValue() as string),
                      size: 140,
                    }),
                    columnHelper.accessor('reviewedBy', { header: 'Reviewed By', cell: info => info.getValue() || <span className="text-semantic-text-tertiary">—</span>, size: 150 }),
                    columnHelper.accessor('reviewedAt', { 
                      header: 'Reviewed', 
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
                            {row.original.status === 'pending' && (
                              <>
                                <DropdownMenuItem onClick={() => {}} className="gap-2 text-semantic-status-success">
                                  <CheckCircle className="h-4 w-4" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {}} className="gap-2 text-semantic-status-error">
                                  <AlertTriangle className="h-4 w-4" />
                                  Deny
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem onClick={() => {}} className="gap-2">
                              <Eye className="h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {}} className="gap-2">
                              <LinkIcon className="h-4 w-4" />
                              View Prerequisite Chain
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ),
                      size: 100,
                    }),
                  ]}
                  data={mockOverrideRequests}
                  rowKey="id"
                  pageSize={10}
                  showColumnVisibility={false}
                  showExport={true}
                  onExport={() => {}}
                  className="rounded-none"
                />
              </CardContent            </Card>
          </TabsContent>

          <TabsContent value="matrix" className="m-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-heading-md">Course Prerequisite Matrix</CardTitle>
                <CardDescription>All prerequisite relationships for Computer Science courses</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  columns={[
                    columnHelper.accessor('courseCode', { header: 'Course', cell: info => <span className="font-mono font-medium">{info.getValue()}</span>, size: 100 }),
                    columnHelper.accessor('courseName', { header: 'Course Name', cell: info => info.getValue() as string, size: 200 }),
                    columnHelper.accessor('prerequisites', { 
                      header: 'Prerequisites', 
                      cell: info => {
                        const prereqs = info.getValue() as string[];
                        return prereqs.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {prereqs.map(p => <Badge key={p} variant="default" className="text-[10px]">{p}</Badge>)}
                          </div>
                        ) : <span className="text-semantic-text-tertiary">None</span>;
                      },
                      size: 250,
                    }),
                    columnHelper.accessor('corequisites', { 
                      header: 'Corequisites', 
                      cell: info => {
                        const coreqs = info.getValue() as string[];
                        return coreqs.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {coreqs.map(c => <Badge key={c} variant="info" className="text-[10px]">{c}</Badge>)}
                          </div>
                        ) : <span className="text-semantic-text-tertiary">None</span>;
                      },
                      size: 200,
                    }),
                    columnHelper.accessor('minGrade', { header: 'Min Grade', cell: info => <span className="font-mono">{info.getValue()}</span>, size: 80 }),
                    columnHelper.accessor('overrideable', { 
                      header: 'Override Allowed', 
                      cell: info => info.getValue() ? (
                        <Badge variant="warning" className="gap-1"><Settings className="h-3 w-3" /> Yes</Badge>
                      ) : (
                        <Badge variant="default" className="gap-1"><X className="h-3 w-3" /> No</Badge>
                      )
                    }),
                  ]}
                  data={[
                    { id: '1', courseCode: 'CS 101', courseName: 'Introduction to Computer Science', prerequisites: [], corequisites: [], minGrade: 'C-', overrideable: false },
                    { id: '2', courseCode: 'CS 201', courseName: 'Data Structures & Algorithms', prerequisites: ['CS 101'], corequisites: [], minGrade: 'C-', overrideable: true },
                    { id: '3', courseCode: 'CS 301', courseName: 'Database Systems', prerequisites: ['CS 201'], corequisites: [], minGrade: 'C-', overrideable: false },
                    { id: '4', courseCode: 'CS 401', courseName: 'Software Engineering', prerequisites: ['CS 301'], corequisites: [], minGrade: 'C-', overrideable: true },
                    { id: '5', courseCode: 'CS 450', courseName: 'Advanced Database Systems', prerequisites: ['CS 301'], corequisites: [], minGrade: 'B-', overrideable: false },
                    { id: '6', courseCode: 'CS 480', courseName: 'Distributed Systems', prerequisites: ['CS 301', 'CS 401'], corequisites: [], minGrade: 'C-', overrideable: false },
                    { id: '7', courseCode: 'MATH 101', courseName: 'Calculus I', prerequisites: [], corequisites: [], minGrade: 'C-', overrideable: false },
                    { id: '8', courseCode: 'MATH 201', courseName: 'Linear Algebra', prerequisites: ['MATH 101'], corequisites: [], minGrade: 'C-', overrideable: false },
                    { id: '9', courseCode: 'PHYS 101', courseName: 'General Physics I', prerequisites: ['MATH 101'], corequisites: [], minGrade: 'C-', overrideable: true },
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

import { formatRelativeTime } from '@/lib/utils';