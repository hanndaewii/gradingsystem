'use client';

import { useState } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Calendar,
  CheckCircle,
  XCircle,
  Settings,
  Eye,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';

interface Term {
  id: string;
  code: string;
  label: string;
  startDate: string;
  endDate: string;
  registrationStart: string;
  registrationEnd: string;
  gradingScale: string;
  isActive: boolean;
  status: 'upcoming' | 'active' | 'completed';
}

const mockTerms: Term[] = [
  { id: '1', code: '2024-1', label: 'First Semester AY 2024-2025', startDate: '2024-08-01', endDate: '2024-12-15', registrationStart: '2024-06-01', registrationEnd: '2024-08-15', gradingScale: 'Philippine 1.0-5.0', isActive: true, status: 'active' },
  { id: '2', code: '2024-2', label: 'Second Semester AY 2024-2025', startDate: '2025-01-15', endDate: '2025-05-30', registrationStart: '2024-11-01', registrationEnd: '2025-01-31', gradingScale: 'Philippine 1.0-5.0', isActive: false, status: 'upcoming' },
  { id: '3', code: '2024-S', label: 'Summer 2024', startDate: '2024-06-01', endDate: '2024-07-31', registrationStart: '2024-04-01', registrationEnd: '2024-05-31', gradingScale: 'Letter Grade A-F', isActive: false, status: 'completed' },
  { id: '4', code: '2023-2', label: 'Second Semester AY 2023-2024', startDate: '2024-01-15', endDate: '2024-05-30', registrationStart: '2023-11-01', registrationEnd: '2024-01-31', gradingScale: 'Philippine 1.0-5.0', isActive: false, status: 'completed' },
];

const termColumns: ColumnDef<Term>[] = [
  { accessorKey: 'code', header: 'Code', cell: ({ row }) => <div className="font-mono font-medium">{row.original.code}</div> },
  { accessorKey: 'label', header: 'Term Label' },
  { accessorKey: 'startDate', header: 'Start Date' },
  { accessorKey: 'endDate', header: 'End Date' },
  { accessorKey: 'registrationStart', header: 'Reg. Opens' },
  { accessorKey: 'registrationEnd', header: 'Reg. Closes' },
  { accessorKey: 'gradingScale', header: 'Grading Scale' },
  { 
    accessorKey: 'status', 
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={
        row.original.status === 'active' ? 'success' : 
        row.original.status === 'upcoming' ? 'info' : 'secondary'
      }>
        {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
      </Badge>
    )
  },
];

const philippineGradingScale = {
  "1.00": [97, 100],
  "1.25": [94, 96],
  "1.50": [91, 93],
  "1.75": [88, 90],
  "2.00": [85, 87],
  "2.25": [82, 84],
  "2.50": [79, 81],
  "2.75": [76, 78],
  "3.00": [75, 75],
  "5.00": [0, 74],
};

const letterGradingScale = {
  "A": [90, 100],
  "B+": [85, 89],
  "B": [80, 84],
  "C+": [75, 79],
  "C": [70, 74],
  "D": [65, 69],
  "F": [0, 64],
};

export function TermsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<Term | null>(null);
  const [editingScale, setEditingScale] = useState<'philippine' | 'letter' | null>(null);
  const [scaleData, setScaleData] = useState<Record<string, [number, number]>>({});

  const handleEditScale = (term: Term) => {
    if (term.gradingScale.includes('Philippine')) {
      setEditingScale('philippine');
      setScaleData({ ...philippineGradingScale });
    } else {
      setEditingScale('letter');
      setScaleData({ ...letterGradingScale });
    }
    setSelectedTerm(term);
  };

  const handleSaveScale = () => {
    if (selectedTerm) {
      console.log('Save grading scale for', selectedTerm.id, scaleData);
      setEditingScale(null);
      setSelectedTerm(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="equal-edges">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-display-sm font-semibold text-gray-900 dark:text-gray-100">Academic Terms</h1>
            <p className="text-body text-gray-500 dark:text-gray-400 mt-1">Manage academic terms, registration periods, and grading scales</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}><Plus className="w-4 h-4 mr-2" />New Term</Button>
        </div>
      </div>

      <Card className="equal-edges">
        <CardContent className="p-0">
          <DataTable
            columns={termColumns}
            data={mockTerms}
            searchable
            filterable
            sortable
            pagination
            pageSize={10}
            rowActions={[
              { label: 'View Details', onClick: (row) => setSelectedTerm(row.original), icon: <Eye className="w-4 h-4" /> },
              { label: 'Edit', onClick: (row) => setSelectedTerm(row.original), icon: <Edit className="w-4 h-4" /> },
              { label: 'Edit Grading Scale', onClick: (row) => handleEditScale(row.original), icon: <Settings className="w-4 h-4" /> },
              { label: 'Set Active', onClick: (row) => console.log('Set active', row.original.id), icon: <CheckCircle className="w-4 h-4" />, variant: row.original.isActive ? 'secondary' : 'success' },
              { label: 'Delete', onClick: (row) => console.log('Delete', row.original.id), icon: <Trash2 className="w-4 h-4" />, variant: 'danger' },
            ]}
          />
        </CardContent>
      </Card>

      {/* Term Detail Modal */}
      <Modal open={!!selectedTerm && !editingScale} onOpenChange={(open) => !open && setSelectedTerm(null)} title={selectedTerm ? `${selectedTerm.code} - ${selectedTerm.label}` : 'Term Details'} size="lg">
        {selectedTerm && !editingScale && (
          <Tabs defaultValue="details" className="space-y-4">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="grading">Grading Scale</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm text-gray-500">Term Code</label><p className="font-mono font-medium">{selectedTerm.code}</p></div>
                <div><label className="text-sm text-gray-500">Label</label><p>{selectedTerm.label}</p></div>
                <div><label className="text-sm text-gray-500">Start Date</label><p>{selectedTerm.startDate}</p></div>
                <div><label className="text-sm text-gray-500">End Date</label><p>{selectedTerm.endDate}</p></div>
                <div><label className="text-sm text-gray-500">Registration Opens</label><p>{selectedTerm.registrationStart}</p></div>
                <div><label className="text-sm text-gray-500">Registration Closes</label><p>{selectedTerm.registrationEnd}</p></div>
                <div><label className="text-sm text-gray-500">Grading Scale</label><p>{selectedTerm.gradingScale}</p></div>
                <div><label className="text-sm text-gray-500">Status</label><p><Badge variant={selectedTerm.status === 'active' ? 'success' : selectedTerm.status === 'upcoming' ? 'info' : 'secondary'}>{selectedTerm.status}</Badge></p></div>
                <div><label className="text-sm text-gray-500">Active Term</label><p>{selectedTerm.isActive ? 'Yes' : 'No'}</p></div>
              </div>
              <div className="pt-4 border-t flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedTerm(null)}>Close</Button>
                <Button onClick={() => setSelectedTerm(null)}>Save Changes</Button>
              </div>
            </TabsContent>
            <TabsContent value="grading" className="space-y-4">
              <div className="space-y-2">
                {Object.entries(selectedTerm.gradingScale.includes('Philippine') ? philippineGradingScale : letterGradingScale).map(([grade, range]) => (
                  <div key={grade} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="font-mono font-medium">{grade}</span>
                    <span className="text-gray-600 dark:text-gray-300">{range[0]} - {range[1]}</span>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedTerm(null)}>Close</Button>
                <Button onClick={() => handleEditScale(selectedTerm)}>Edit Scale</Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </Modal>

      {/* Grading Scale Editor Modal */}
      <Modal open={!!editingScale} onOpenChange={(open) => !open && setEditingScale(null)} title="Edit Grading Scale" size="lg">
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-gray-500">Edit grade ranges. Ranges should be continuous and non-overlapping.</p>
          <div className="space-y-2" id="scale-editor">
            {Object.entries(scaleData).map(([grade, range], index) => (
              <div key={grade} className="flex items-center gap-2">
                <Input 
                  label="Grade" 
                  value={grade} 
                  onChange={(e) => {}} 
                  className="w-24"
                  disabled
                />
                <Input 
                  label="Min" 
                  type="number" 
                  value={range[0]} 
                  onChange={(e) => setScaleData(prev => ({ ...prev, [grade]: [parseInt(e.target.value), prev[grade][1]] }))}
                  className="w-28"
                />
                <span className="text-gray-400">to</span>
                <Input 
                  label="Max" 
                  type="number" 
                  value={range[1]} 
                  onChange={(e) => setScaleData(prev => ({ ...prev, [grade]: [prev[grade][0], parseInt(e.target.value)] }))}
                  className="w-28"
                />
                {index > 0 && (
                  <Button variant="ghost" size="icon" onClick={() => setScaleData(prev => { const next = { ...prev }; delete next[grade]; return next; })}>
                    <XCircle className="w-4 h-4 text-red-500" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setEditingScale(null)}>Cancel</Button>
            <Button onClick={handleSaveScale}>Save Grading Scale</Button>
          </div>
        </div>
      </Modal>

      {/* Create Term Modal */}
      <Modal open={showCreateModal} onOpenChange={setShowCreateModal} title="Create New Term" size="lg">
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Term Code" placeholder="e.g., 2025-1" required />
            <Select defaultValue="philippine">
              <SelectTrigger><SelectValue placeholder="Grading Scale" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="philippine">Philippine 1.0-5.0</SelectItem>
                <SelectItem value="letter">Letter Grade A-F</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input label="Term Label" placeholder="e.g., First Semester AY 2025-2026" required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" required />
            <Input label="End Date" type="date" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Registration Opens" type="date" required />
            <Input label="Registration Closes" type="date" required />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button type="submit">Create Term</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}