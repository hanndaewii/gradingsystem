'use client';

import { useState } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Plus, 
  UserPlus,
  FileText,
  Eye,
  Edit,
  Trash2,
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
import { BulkEnrollWizard } from './BulkEnrollWizard';

interface Enrollment {
  id: string;
  student: string;
  studentId: string;
  course: string;
  section: string;
  status: 'enrolled' | 'waitlisted' | 'dropped' | 'pending';
  enrolledAt: string;
  professor: string;
  term: string;
}

const mockEnrollments: Enrollment[] = [
  { id: '1', student: 'Maria Santos', studentId: '2021-00123', course: 'BUSAD 301', section: 'A', status: 'enrolled', enrolledAt: '2024-01-10', professor: 'Dr. Reyes', term: 'Fall 2024' },
  { id: '2', student: 'Juan Dela Cruz', studentId: '2021-00456', course: 'ECON 201', section: 'B', status: 'waitlisted', enrolledAt: '2024-01-12', professor: 'Prof. Garcia', term: 'Fall 2024' },
  { id: '3', student: 'Ana Reyes', studentId: '2022-00789', course: 'MGMT 401', section: 'A', status: 'enrolled', enrolledAt: '2024-01-08', professor: 'Dr. Martinez', term: 'Fall 2024' },
  { id: '4', student: 'Carlos Mendoza', studentId: '2020-00234', course: 'MKTG 301', section: 'C', status: 'dropped', enrolledAt: '2024-01-05', professor: 'Prof. Lopez', term: 'Fall 2024' },
  { id: '5', student: 'Lisa Garcia', studentId: '2021-00567', course: 'FIN 401', section: 'A', status: 'enrolled', enrolledAt: '2024-01-11', professor: 'Dr. Chen', term: 'Fall 2024' },
  { id: '6', student: 'Roberto Cruz', studentId: '2022-00890', course: 'BUSAD 101', section: 'A', status: 'enrolled', enrolledAt: '2024-01-09', professor: 'Dr. Santos', term: 'Fall 2024' },
  { id: '7', student: 'Patricia Lim', studentId: '2023-00111', course: 'ECON 101', section: 'A', status: 'waitlisted', enrolledAt: '2024-01-13', professor: 'Prof. Tan', term: 'Fall 2024' },
  { id: '8', student: 'Miguel Torres', studentId: '2021-00345', course: 'ACCT 201', section: 'B', status: 'enrolled', enrolledAt: '2024-01-07', professor: 'Dr. Rivera', term: 'Fall 2024' },
];

const enrollmentColumns: ColumnDef<Enrollment>[] = [
  { accessorKey: 'student', header: 'Student', cell: ({ row }) => <div className="font-medium">{row.original.student}</div> },
  { accessorKey: 'studentId', header: 'Student ID' },
  { accessorKey: 'course', header: 'Course' },
  { accessorKey: 'section', header: 'Section' },
  { accessorKey: 'term', header: 'Term' },
  { 
    accessorKey: 'status', 
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={
        row.original.status === 'enrolled' ? 'success' : 
        row.original.status === 'waitlisted' ? 'warning' : 
        row.original.status === 'dropped' ? 'danger' : 'info'
      }>
        {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
      </Badge>
    ),
  },
  { accessorKey: 'professor', header: 'Professor' },
  { accessorKey: 'enrolledAt', header: 'Enrolled Date' },
];

export function EnrollmentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [termFilter, setTermFilter] = useState('all');
  const [showBulkEnroll, setShowBulkEnroll] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);

  const handleRowAction = (action: string, enrollment: Enrollment) => {
    switch (action) {
      case 'view':
        setSelectedEnrollment(enrollment);
        break;
      case 'edit':
        console.log('Edit enrollment', enrollment.id);
        break;
      case 'drop':
        console.log('Drop student', enrollment.id);
        break;
      case 'waitlist':
        console.log('Move to waitlist', enrollment.id);
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="equal-edges">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-display-sm font-semibold text-gray-900 dark:text-gray-100">Enrollment Management</h1>
            <p className="text-body text-gray-500 dark:text-gray-400 mt-1">View, filter, and manage student enrollments across all terms</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Export CSV</Button>
            <Button variant="outline" size="sm"><FileText className="w-4 h-4 mr-2" />Export PDF</Button>
            <Button variant="outline" onClick={() => setShowBulkEnroll(true)}><Upload className="w-4 h-4 mr-2" />Bulk Import</Button>
            <Button onClick={() => setShowBulkEnroll(true)}><UserPlus className="w-4 h-4 mr-2" />Enroll Student</Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="equal-edges">
        <CardContent className="p-4 pt-6">
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
            <div className="flex-1 min-w-[250px]">
              <Input 
                placeholder="Search by student name, ID, course..." 
                icon={<Search className="w-4 h-4" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={termFilter} onValueChange={setTermFilter}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All Terms" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Terms</SelectItem>
                <SelectItem value="fall-2024">Fall 2024</SelectItem>
                <SelectItem value="spring-2025">Spring 2025</SelectItem>
                <SelectItem value="summer-2024">Summer 2024</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="enrolled">Enrolled</SelectItem>
                <SelectItem value="waitlisted">Waitlisted</SelectItem>
                <SelectItem value="dropped">Dropped</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All Courses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                <SelectItem value="busad">Business Administration</SelectItem>
                <SelectItem value="econ">Economics</SelectItem>
                <SelectItem value="mgmt">Management</SelectItem>
                <SelectItem value="mktg">Marketing</SelectItem>
                <SelectItem value="fin">Finance</SelectItem>
                <SelectItem value="acct">Accounting</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Enrollment Table */}
      <Card className="equal-edges">
        <CardContent className="p-0">
          <DataTable
            columns={enrollmentColumns}
            data={mockEnrollments.filter(e => 
              (statusFilter === 'all' || e.status === statusFilter) &&
              (termFilter === 'all' || e.term === termFilter) &&
              (searchQuery === '' || 
                e.student.toLowerCase().includes(searchQuery.toLowerCase()) ||
                e.studentId.includes(searchQuery) ||
                e.course.toLowerCase().includes(searchQuery.toLowerCase()))
            )}
            searchable
            filterable
            sortable
            pagination
            pageSize={15}
            rowActions={[
              { label: 'View Details', onClick: (row) => handleRowAction('view', row.original), icon: <Eye className="w-4 h-4" /> },
              { label: 'Edit', onClick: (row) => handleRowAction('edit', row.original), icon: <Edit className="w-4 h-4" /> },
              { label: 'Drop Student', onClick: (row) => handleRowAction('drop', row.original), icon: <UserPlus className="w-4 h-4" />, variant: 'danger' },
              { label: 'Move to Waitlist', onClick: (row) => handleRowAction('waitlist', row.original), icon: <FileText className="w-4 h-4" />, variant: 'warning' },
            ]}
          />
        </CardContent>
      </Card>

      {/* View Details Modal */}
      <Modal
        open={!!selectedEnrollment}
        onOpenChange={(open) => !open && setSelectedEnrollment(null)}
        title="Enrollment Details"
        size="lg"
      >
        {selectedEnrollment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm text-gray-500">Student</label><p className="font-medium">{selectedEnrollment.student}</p></div>
              <div><label className="text-sm text-gray-500">Student ID</label><p>{selectedEnrollment.studentId}</p></div>
              <div><label className="text-sm text-gray-500">Course</label><p className="font-medium">{selectedEnrollment.course}</p></div>
              <div><label className="text-sm text-gray-500">Section</label><p>{selectedEnrollment.section}</p></div>
              <div><label className="text-sm text-gray-500">Term</label><p>{selectedEnrollment.term}</p></div>
              <div><label className="text-sm text-gray-500">Professor</label><p>{selectedEnrollment.professor}</p></div>
              <div><label className="text-sm text-gray-500">Status</label><p><Badge variant={selectedEnrollment.status === 'enrolled' ? 'success' : selectedEnrollment.status === 'waitlisted' ? 'warning' : 'danger'}>{selectedEnrollment.status}</Badge></p></div>
              <div><label className="text-sm text-gray-500">Enrolled Date</label><p>{selectedEnrollment.enrolledAt}</p></div>
            </div>
            <div className="pt-4 border-t flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedEnrollment(null)}>Close</Button>
              <Button onClick={() => setSelectedEnrollment(null)}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Bulk Enroll Wizard Modal */}
      <BulkEnrollWizard open={showBulkEnroll} onOpenChange={setShowBulkEnroll} />
    </div>
  );
}