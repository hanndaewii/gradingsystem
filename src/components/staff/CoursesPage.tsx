'use client';

import { useState } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  Download, 
  Edit, 
  Trash2, 
  Copy,
  Eye,
  BookOpen,
  Archive,
  MoreHorizontal
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
import { Input } from '@/components/ui/Input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/DropdownMenu';
import { Modal } from '@/components/ui/Modal';

interface Course {
  id: string;
  code: string;
  title: string;
  description: string;
  units: number;
  department: string;
  prerequisites: string[];
  status: 'active' | 'archived' | 'draft';
  sectionsCount: number;
  enrollmentCount: number;
}

const mockCourses: Course[] = [
  { id: '1', code: 'BUSAD 101', title: 'Introduction to Business Administration', description: 'Fundamental concepts of business management', units: 3, department: 'Business Administration', prerequisites: [], status: 'active', sectionsCount: 4, enrollmentCount: 156 },
  { id: '2', code: 'BUSAD 301', title: 'Strategic Management', description: 'Strategic planning and decision making', units: 3, department: 'Business Administration', prerequisites: ['BUSAD 101', 'BUSAD 201'], status: 'active', sectionsCount: 3, enrollmentCount: 98 },
  { id: '3', code: 'ECON 101', title: 'Principles of Microeconomics', description: 'Microeconomic theory and applications', units: 3, department: 'Economics', prerequisites: [], status: 'active', sectionsCount: 5, enrollmentCount: 203 },
  { id: '4', code: 'ECON 201', title: 'Principles of Macroeconomics', description: 'Macroeconomic theory and policy', units: 3, department: 'Economics', prerequisites: ['ECON 101'], status: 'active', sectionsCount: 3, enrollmentCount: 112 },
  { id: '5', code: 'MGMT 401', title: 'Operations Management', description: 'Production and operations strategy', units: 3, department: 'Management', prerequisites: ['BUSAD 101', 'STAT 201'], status: 'active', sectionsCount: 2, enrollmentCount: 67 },
  { id: '6', code: 'MKTG 301', title: 'Marketing Management', description: 'Marketing strategy and consumer behavior', units: 3, department: 'Marketing', prerequisites: ['BUSAD 101'], status: 'active', sectionsCount: 3, enrollmentCount: 124 },
  { id: '7', code: 'FIN 401', title: 'Corporate Finance', description: 'Financial management and valuation', units: 3, department: 'Finance', prerequisites: ['ACCT 201', 'ECON 201'], status: 'active', sectionsCount: 2, enrollmentCount: 78 },
  { id: '8', code: 'ACCT 201', title: 'Financial Accounting', description: 'Accounting principles and financial statements', units: 3, department: 'Accounting', prerequisites: [], status: 'active', sectionsCount: 4, enrollmentCount: 167 },
];

const courseColumns: ColumnDef<Course>[] = [
  { 
    accessorKey: 'code', 
    header: 'Course Code', 
    cell: ({ row }) => <div className="font-mono font-medium">{row.original.code}</div> 
  },
  { 
    accessorKey: 'title', 
    header: 'Title',
    cell: ({ row }) => <div className="font-medium max-w-xs truncate" title={row.original.title}>{row.original.title}</div>
  },
  { accessorKey: 'units', header: 'Units' },
  { accessorKey: 'department', header: 'Department' },
  { 
    accessorKey: 'prerequisites', 
    header: 'Prerequisites',
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.prerequisites.map((p, i) => (
          <Badge key={i} variant="outline" className="text-xs">{p}</Badge>
        ))}
      </div>
    )
  },
  { 
    accessorKey: 'status', 
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={
        row.original.status === 'active' ? 'success' : 
        row.original.status === 'archived' ? 'secondary' : 'warning'
      }>
        {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
      </Badge>
    )
  },
  { accessorKey: 'sectionsCount', header: 'Sections' },
  { accessorKey: 'enrollmentCount', header: 'Enrollment' },
];

export function CoursesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="equal-edges">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-display-sm font-semibold text-gray-900 dark:text-gray-100">Course Management</h1>
            <p className="text-body text-gray-500 dark:text-gray-400 mt-1">Manage course catalog, prerequisites, and curriculum</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline"><Download className="w-4 h-4 mr-2" />Export</Button>
            <Button onClick={() => setShowCreateModal(true)}><Plus className="w-4 h-4 mr-2" />New Course</Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="equal-edges">
        <CardContent className="p-4 pt-6">
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
            <div className="flex-1 min-w-[250px]">
              <Input placeholder="Search courses..." icon={<Search className="w-4 h-4" />} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All Departments" /></SelectTrigger>
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Course Table */}
      <Card className="equal-edges">
        <CardContent className="p-0">
          <DataTable
            columns={courseColumns}
            data={mockCourses.filter(c => 
              (statusFilter === 'all' || c.status === statusFilter) &&
              (deptFilter === 'all' || c.department.toLowerCase() === deptFilter) &&
              (searchQuery === '' || 
                c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.title.toLowerCase().includes(searchQuery.toLowerCase()))
            )}
            searchable
            filterable
            sortable
            pagination
            pageSize={10}
            rowActions={[
              { label: 'View Details', onClick: (row) => setSelectedCourse(row.original), icon: <Eye className="w-4 h-4" /> },
              { label: 'Edit', onClick: (row) => setSelectedCourse(row.original), icon: <Edit className="w-4 h-4" /> },
              { label: 'Clone', onClick: (row) => console.log('Clone', row.original.id), icon: <Copy className="w-4 h-4" /> },
              { label: row.original.status === 'active' ? 'Archive' : 'Restore', onClick: (row) => console.log('Toggle archive', row.original.id), icon: <Archive className="w-4 h-4" />, variant: row.original.status === 'active' ? 'warning' : 'success' },
              { label: 'Delete', onClick: (row) => console.log('Delete', row.original.id), icon: <Trash2 className="w-4 h-4" />, variant: 'danger' },
            ]}
          />
        </CardContent>
      </Card>

      {/* Course Detail Modal */}
      <Modal open={!!selectedCourse} onOpenChange={(open) => !open && setSelectedCourse(null)} title={selectedCourse ? `${selectedCourse.code} - ${selectedCourse.title}` : 'Course Details'} size="lg">
        {selectedCourse && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm text-gray-500">Course Code</label><p className="font-mono font-medium">{selectedCourse.code}</p></div>
              <div><label className="text-sm text-gray-500">Units</label><p>{selectedCourse.units}</p></div>
              <div><label className="text-sm text-gray-500">Department</label><p>{selectedCourse.department}</p></div>
              <div><label className="text-sm text-gray-500">Status</label><p><Badge variant={selectedCourse.status === 'active' ? 'success' : selectedCourse.status === 'archived' ? 'secondary' : 'warning'}>{selectedCourse.status}</Badge></p></div>
              <div className="col-span-2"><label className="text-sm text-gray-500">Description</label><p className="mt-1">{selectedCourse.description}</p></div>
              <div className="col-span-2">
                <label className="text-sm text-gray-500">Prerequisites</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedCourse.prerequisites.length > 0 ? selectedCourse.prerequisites.map(p => <Badge key={p} variant="outline">{p}</Badge>) : <span className="text-gray-400 text-sm">None</span>}
                </div>
              </div>
              <div><label className="text-sm text-gray-500">Sections</label><p>{selectedCourse.sectionsCount}</p></div>
              <div><label className="text-sm text-gray-500">Total Enrollment</label><p>{selectedCourse.enrollmentCount}</p></div>
            </div>
            <div className="pt-4 border-t flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedCourse(null)}>Close</Button>
              <Button onClick={() => setSelectedCourse(null)}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Course Modal */}
      <Modal open={showCreateModal} onOpenChange={setShowCreateModal} title="Create New Course" size="lg">
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Course Code" placeholder="e.g., BUSAD 101" required />
            <Input label="Units" type="number" value="3" required />
          </div>
          <Input label="Course Title" placeholder="e.g., Introduction to Business Administration" required />
          <Select defaultValue="business">
            <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="business">Business Administration</SelectItem>
              <SelectItem value="economics">Economics</SelectItem>
              <SelectItem value="management">Management</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
              <SelectItem value="accounting">Accounting</SelectItem>
            </SelectContent>
          </Select>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[100px]" placeholder="Course description..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prerequisites (comma-separated course codes)</label>
            <Input placeholder="e.g., BUSAD 101, ECON 101" />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button type="submit">Create Course</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}