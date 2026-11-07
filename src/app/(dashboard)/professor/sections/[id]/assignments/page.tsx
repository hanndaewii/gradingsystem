'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Plus, Search, Filter, Download, Edit, Trash2, Eye, EyeOff, Copy, MoreVertical } from 'lucide-react';
import Link from 'next/link';
import { AssessmentTabs } from '@/components/professor/AssessmentTabs';
import { AssignmentWizard } from '@/components/professor/AssignmentWizard';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/DropdownMenu';
import { AssessmentColumn } from '@/components/professor/GradebookGrid';

const mockAssessments: AssessmentColumn[] = [
  { id: 'a1', title: 'Midterm Exam', type: 'exam', maxPoints: 100, weight: 25, dueDate: '2024-01-15', visible: true, order: 1 },
  { id: 'a2', title: 'Quiz 1', type: 'quiz', maxPoints: 20, weight: 5, dueDate: '2024-01-10', visible: true, order: 2 },
  { id: 'a3', title: 'Quiz 2', type: 'quiz', maxPoints: 20, weight: 5, dueDate: '2024-01-17', visible: true, order: 3 },
  { id: 'a4', title: 'Homework 1', type: 'assignment', maxPoints: 50, weight: 10, dueDate: '2024-01-12', visible: true, order: 4 },
  { id: 'a5', title: 'Homework 2', type: 'assignment', maxPoints: 50, weight: 10, dueDate: '2024-01-19', visible: true, order: 5 },
  { id: 'a6', title: 'Project Proposal', type: 'project', maxPoints: 100, weight: 15, dueDate: '2024-01-25', visible: true, order: 6 },
  { id: 'a7', title: 'Final Project', type: 'project', maxPoints: 200, weight: 20, dueDate: '2024-02-15', visible: true, order: 7 },
  { id: 'a8', title: 'Class Participation', type: 'participation', maxPoints: 50, weight: 10, visible: true, order: 8 },
];

export default function AssignmentsPage() {
  const params = useParams();
  const sectionId = params.id as string;

  const [showWizard, setShowWizard] = React.useState(false);
  const [editingAssessment, setEditingAssessment] = React.useState<AssessmentColumn | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeType, setActiveType] = React.useState<AssessmentColumn['type'] | 'all'>('all');

  const handleCreateAssessment = (data: any) => {
    console.log('Create assessment:', data);
    setShowWizard(false);
    setEditingAssessment(null);
  };

  const handleEdit = (assessment: AssessmentColumn) => {
    setEditingAssessment(assessment);
    setShowWizard(true);
  };

  const handleDelete = (assessment: AssessmentColumn) => {
    if (confirm(`Delete "${assessment.title}"? This action cannot be undone.`)) {
      console.log('Delete assessment:', assessment.id);
    }
  };

  const handleDuplicate = (assessment: AssessmentColumn) => {
    console.log('Duplicate assessment:', assessment.id);
  };

  const filteredAssessments = mockAssessments.filter(a =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (activeType === 'all' || a.type === activeType)
  );

  return (
    <div className="min-h-screen bg-semantic-bg-primary">
      {/* Header */}
      <header className="border-b border-semantic-border-primary bg-semantic-bg-secondary/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container equal-edges">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
            <div className="flex items-center gap-4">
              <Link href={`/professor/sections/${sectionId}`} className="h-10 w-10">
                <Button variant="ghost" size="icon" aria-label="Back to section">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-heading-lg font-semibold text-semantic-text-primary">Assignments</h1>
                <p className="text-body-sm text-semantic-text-secondary">Manage assessments for CS 101-A • Fall 2024</p>
              </div>
            </div>
            <Button onClick={() => { setEditingAssessment(null); setShowWizard(true); }} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Assessment
            </Button>
          </div>
        </div>
      </header>

      <main className="container equal-edges py-6 section-spacing">
        {/* Search & Filter */}
        <Card className="mb-6">
          <CardContent className="p-4 pt-0">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-semantic-text-tertiary" />
                <Input
                  placeholder="Search assessments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  size="sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={activeType}
                  onValueChange={setActiveType}
                  options={[
                    { value: 'all', label: 'All Types' },
                    { value: 'exam', label: 'Exams' },
                    { value: 'quiz', label: 'Quizzes' },
                    { value: 'assignment', label: 'Assignments' },
                    { value: 'project', label: 'Projects' },
                    { value: 'participation', label: 'Participation' },
                    { value: 'final', label: 'Finals' },
                  ]}
                  size="sm"
                  className="w-40"
                />
                <Button variant="outline" size="sm" className="gap-1">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assessment Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total Assessments" value={mockAssessments.length} icon={<Plus className="h-5 w-5" />} />
          <StatCard title="Total Points" value={mockAssessments.reduce((sum, a) => sum + a.maxPoints, 0)} icon={<Plus className="h-5 w-5" />} />
          <StatCard title="Total Weight" value={`${mockAssessments.reduce((sum, a) => sum + a.weight, 0)}%`} icon={<Plus className="h-5 w-5" />} />
          <StatCard title="Visible" value={mockAssessments.filter(a => a.visible).length} icon={<Eye className="h-5 w-5" />} />
        </div>

        {/* Assessments List */}
        <AssessmentTabs
          assessments={mockAssessments}
          activeType={activeType}
          onTypeChange={setActiveType}
          onAssessmentClick={handleEdit}
          onCreateAssessment={() => { setEditingAssessment(null); setShowWizard(true); }}
        />
      </main>

      {/* Assignment Wizard Modal */}
      {showWizard && (
        <AssignmentWizard
          initialData={editingAssessment || undefined}
          onComplete={handleCreateAssessment}
          onCancel={() => { setShowWizard(false); setEditingAssessment(null); }}
          existingRubrics={[{ id: 'r1', name: 'Standard Project Rubric' }, { id: 'r2', name: 'Exam Rubric' }]}
        />
      )}
    </div>
  );
}

function StatCard({ title, value, icon, variant }: { title: string; value: number | string; icon: React.ReactNode; variant?: 'default' | 'warning' | 'success' }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-caption text-semantic-text-tertiary mb-1">{title}</p>
            <p className="text-2xl font-bold text-semantic-text-primary">{value}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-semantic-bg-tertiary flex-center text-semantic-text-secondary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}