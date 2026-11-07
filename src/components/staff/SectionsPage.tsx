'use client';

import { useState } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  Download, 
  Edit, 
  Trash2, 
  UserPlus,
  Calendar,
  Building2,
  Eye,
  Users,
  MoreHorizontal
} from 'lucide-react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent 
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';

interface Section {
  id: string;
  courseCode: string;
  courseTitle: string;
  section: string;
  term: string;
  professor: string;
  professorEmail: string;
  schedule: string;
  room: string;
  capacity: number;
  enrolled: number;
  waitlisted: number;
  status: 'active' | 'cancelled' | 'completed';
}

const mockSections: Section[] = [
  { id: '1', courseCode: 'BUSAD 101', courseTitle: 'Intro to Business Admin', section: 'A', term: 'Fall 2024', professor: 'Dr. Reyes', professorEmail: 'reyes@cwc.edu.ph', schedule: 'MWF 09:00-10:30', room: 'B-201', capacity: 40, enrolled: 38, waitlisted: 2, status: 'active' },
  { id: '2', courseCode: 'BUSAD 101', courseTitle: 'Intro to Business Admin', section: 'B', term: 'Fall 2024', professor: 'Prof. Garcia', professorEmail: 'garcia@cwc.edu.ph', schedule: 'TTh 10:30-12:00', room: 'B-202', capacity: 40, enrolled: 35, waitlisted: 0, status: 'active' },
  { id: '3', courseCode: 'ECON 101', courseTitle: 'Principles of Microeconomics', section: 'A', term: 'Fall 2024', professor: 'Dr. Santos', professorEmail: 'santos@cwc.edu.ph', schedule: 'MWF 13:00-14:30', room: 'B-301', capacity: 45, enrolled: 42, waitlisted: 5, status: 'active' },
  { id: '4', courseCode: 'MGMT 401', courseTitle: 'Operations Management', section: 'A', term: 'Fall 2024', professor: 'Dr. Martinez', professorEmail: 'martinez@cwc.edu.ph', schedule: 'TTh 14:30-16:00', room: 'B-204', capacity: 35, enrolled: 30, waitlisted: 0, status: 'active' },
  { id: '5', courseCode: 'MKTG 301', courseTitle: 'Marketing Management', section: 'A', term: 'Fall 2024', professor: 'Prof. Lopez', professorEmail: 'lopez@cwc.edu.ph', schedule: 'MWF 10:30-12:00', room: 'B-302', capacity: 40, enrolled: 40, waitlisted: 8, status: 'active' },
  { id: '6', courseCode: 'FIN 401', courseTitle: 'Corporate Finance', section: 'A', term: 'Fall 2024', professor: 'Dr. Chen', professorEmail: 'chen@cwc.edu.ph', schedule: 'TTh 09:00-10:30', room: 'B-203', capacity: 30, enrolled: 28, waitlisted: 0, status: 'active' },
];

const sectionColumns: ColumnDef<Section>[] = [
  { 
    accessorKey: 'courseCode', 
    header: 'Course', 
    cell: ({ row }) => (
      <div>
        <div className="font-mono font-medium">{row.original.courseCode}</div>
        <div className="text-xs text-gray-500">{row.original.courseTitle}</div>
      </div>
    )
  },
  { 
    accessorKey: 'section', 
    header: 'Section',
    cell: ({ row }) => <span className="font-medium px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">{row.original.section}</span>
  },
  { accessorKey: 'term', header: 'Term' },
  { 
    accessorKey: 'professor', 
    header: 'Professor',
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.professor}</div>
        <div className="text-xs text-gray-500">{row.original.professorEmail}</div>
      </div>
    )
  },
  { accessorKey: 'schedule', header: 'Schedule' },
  { accessorKey: 'room', header: 'Room' },
  { 
    accessorKey: 'capacity', 
    header: 'Capacity',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span>{row.original.enrolled}/{row.original.capacity}</span>
        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${(row.original.enrolled / row.original.capacity) * 100}%` }} />
        </div>
        {row.original.waitlisted > 0 && <Badge variant="warning" className="text-xs">+{row.original.waitlisted} wait</Badge>}
      </div>
    )
  },
  { 
    accessorKey: 'status', 
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={
        row.original.status === 'active' ? 'success' : 
        row.original.status === 'cancelled' ? 'danger' : 'secondary'
      }>
        {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
      </Badge>
    )
  },
];

export function SectionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [termFilter, setTermFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);

  return (
    <div className="space-y-6">
      <div className="equal-edges">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-display-sm font-semibold text-gray-900 dark:text-gray-100">Section Management</h1>
            <p className="text-body text-gray-500 dark:text-gray-400 mt-1">Manage class sections, schedules, and professor assignments</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline"><Download className="w-4 h-4 mr-2" />Export</Button>
            <Button onClick={() => setShowCreateModal(true)}><Plus className="w-4 h-4 mr-2" />New Section</Button>
          </div>
        </div>
      </div>

      <Card className="equal-edges">
        <CardContent className="p-4 pt-6">
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
            <div className="flex-1 min-w-[250px]">
              <Input placeholder="Search sections..." icon={<Search className="w-4 h-4" />} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Select value={termFilter} onValueChange={setTermFilter}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All Terms" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Terms</SelectItem>
                <SelectItem value="fall-2024">Fall 2024</SelectItem>
                <SelectItem value="spring-2025">Spring 2025</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="equal-edges">
        <CardContent className="p-0">
          <DataTable
            columns={sectionColumns}
            data={mockSections.filter(s => 
              (termFilter === 'all' || s.term === termFilter) &&
              (statusFilter === 'all' || s.status === statusFilter) &&
              (searchQuery === '' || 
                s.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.courseTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.professor.toLowerCase().includes(searchQuery.toLowerCase()))
            )}
            searchable
            filterable
            sortable
            pagination
            pageSize={10}
            rowActions={[
              { label: 'View Roster', onClick: (row) => setSelectedSection(row.original), icon: <Users className="w-4 h-4" /> },
              { label: 'Edit', onClick: (row) => setSelectedSection(row.original), icon: <Edit className="w-4 h-4" /> },
              { label: 'Assign Professor', onClick: (row) => console.log('Assign prof', row.original.id), icon: <UserPlus className="w-4 h-4" /> },
              { label: row.original.status === 'active' ? 'Cancel' : 'Restore', onClick: (row) => console.log('Toggle status', row.original.id), icon: row.original.status === 'active' ? <Trash2 className="w-4 h-4" /> : <Calendar className="w-4 h-4" />, variant: row.original.status === 'active' ? 'warning' : 'success' },
            ]}
          />
        </CardContent>
      </Card>

      <Modal open={!!selectedSection} onOpenChange={(open) => !open && setSelectedSection(null)} title={selectedSection ? `${selectedSection.courseCode} - Section ${selectedSection.section}` : 'Section Details'} size="lg">
        {selectedSection && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm text-gray-500">Course</label><p className="font-mono font-medium">{selectedSection.courseCode}</p></div>
              <div><label className="text-sm text-gray-500">Section</label><p className="font-medium px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded inline-block">{selectedSection.section}</p></div>
              <div><label className="text-sm text-gray-500">Term</label><p>{selectedSection.term}</p></div>
              <div><label className="text-sm text-gray-500">Status</label><p><Badge variant={selectedSection.status === 'active' ? 'success' : selectedSection.status === 'cancelled' ? 'danger' : 'secondary'}>{selectedSection.status}</Badge></p></div>
              <div><label className="text-sm text-gray-500">Professor</label><p>{selectedSection.professor}</p></div>
              <div><label className="text-sm text-gray-500">Email</label><p className="text-sm">{selectedSection.professorEmail}</p></div>
              <div><label className="text-sm text-gray-500">Schedule</label><p>{selectedSection.schedule}</p></div>
              <div><label className="text-sm text-gray-500">Room</label><p>{selectedSection.room}</p></div>
              <div><label className="text-sm text-gray-500">Capacity</label><p>{selectedSection.enrolled}/{selectedSection.capacity}</p></div>
              <div><label className="text-sm text-gray-500">Waitlisted</label><p className="text-orange-600">{selectedSection.waitlisted}</p></div>
            </div>
            <div className="pt-4 border-t flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedSection(null)}>Close</Button>
              <Button onClick={() => setSelectedSection(null)}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={showCreateModal} onOpenChange={setShowCreateModal} title="Create New Section" size="lg">
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select defaultValue="busad-101">
              <SelectTrigger><SelectValue placeholder="Select Course" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="busad-101">BUSAD 101 - Intro to Business Admin</SelectItem>
                <SelectItem value="busad-301">BUSAD 301 - Strategic Management</SelectItem>
                <SelectItem value="econ-101">ECON 101 - Microeconomics</SelectItem>
                <SelectItem value="mgmt-401">MGMT 401 - Operations Management</SelectItem>
              </SelectContent>
            </Select>
            <Input label="Section" placeholder="A, B, C..." required />
          </div>
          <Select defaultValue="fall-2024">
            <SelectTrigger><SelectValue placeholder="Term" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fall-2024">Fall 2024</SelectItem>
              <SelectItem value="spring-2025">Spring 2025</SelectItem>
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Select defaultValue="dr-reyes">
              <SelectTrigger><SelectValue placeholder="Assign Professor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dr-reyes">Dr. Reyes</SelectItem>
                <SelectItem value="prof-garcia">Prof. Garcia</SelectItem>
                <SelectItem value="dr-santos">Dr. Santos</SelectItem>
                <SelectItem value="dr-martinez">Dr. Martinez</SelectItem>
              </SelectContent>
            </Select>
            <Input label="Room" placeholder="e.g., B-201" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Schedule" placeholder="e.g., MWF 09:00-10:30" />
            <Input label="Capacity" type="number" value="40" required />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button type="submit">Create Section</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}