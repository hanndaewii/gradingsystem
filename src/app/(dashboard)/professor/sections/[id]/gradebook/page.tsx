'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Download, Upload, Filter, MoreVertical } from 'lucide-react';
import Link from 'next/link';
import { GradebookGrid } from '@/components/professor/GradebookGrid';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuCheckboxItem } from '@/components/ui/DropdownMenu';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { AssessmentColumn, StudentGradeRow } from '@/components/professor/GradebookGrid';

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

const mockStudents: StudentGradeRow[] = Array.from({ length: 142 }, (_, i) => {
  const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn', 'Blake', 'Cameron'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  const firstName = firstNames[i % firstNames.length];
  const lastName = lastNames[i % lastNames.length];
  const studentId = `STU${String(i + 1).padStart(6, '0')}`;

  const grades: Record<string, any> = {};
  mockAssessments.forEach(a => {
    const hasGrade = Math.random() > 0.15;
    const value = hasGrade ? Math.round((Math.random() * 40 + 60) * 10) / 10 : null;
    grades[a.id] = {
      value,
      maxPoints: a.maxPoints,
      weight: a.weight,
      status: hasGrade ? (Math.random() > 0.1 ? 'approved' : 'submitted') : 'missing',
      comment: Math.random() > 0.9 ? 'Good work!' : undefined,
      history: [
        { id: 'h1', timestamp: new Date(Date.now() - 86400000).toISOString(), user: 'Prof. Chen', oldValue: null, newValue: value, action: 'created' },
      ],
      assessmentId: a.id,
      assessmentType: a.type,
    };
  });

  const graded = mockAssessments.filter(a => grades[a.id].value !== null);
  const totalPoints = graded.reduce((sum, a) => sum + (grades[a.id].value || 0), 0);
  const maxPoints = graded.reduce((sum, a) => sum + a.maxPoints, 0);
  const finalGrade = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : null;

  return {
    id: `student-${i}`,
    studentId,
    studentNumber: studentId,
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@university.edu`,
    grades,
    finalGrade,
    letterGrade: finalGrade !== null ? (finalGrade >= 90 ? 'A' : finalGrade >= 80 ? 'B' : finalGrade >= 70 ? 'C' : finalGrade >= 60 ? 'D' : 'F') : 'N/A',
    attendance: Math.round(Math.random() * 10 + 90),
    status: 'active',
  };
});

export default function GradebookPage() {
  const params = useParams();
  const sectionId = params.id as string;

  const handleGradeChange = (studentId: string, assessmentId: string, value: number | null, status?: any) => {
    console.log('Grade changed:', studentId, assessmentId, value, status);
  };

  const handleBulkAction = (action: string, data?: any) => {
    console.log('Bulk action:', action, data);
  };

  const handleExport = (format: 'csv' | 'xlsx' | 'pdf') => {
    console.log('Export:', format);
  };

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
                <h1 className="text-heading-lg font-semibold text-semantic-text-primary">Gradebook</h1>
                <p className="text-body-sm text-semantic-text-secondary">CS 101-A • Fall 2024 • 142 students • 8 assessments</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                    <Download className="h-4 w-4 mr-2" />
                    Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('pdf')}>
                    <Download className="h-4 w-4 mr-2" />
                    PDF Report
                  </DropdownMenuItem>
                </DropdownMenuContent              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuCheckboxItem checked={true} onCheckedChange={() => {}}>Show student names</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={true} onCheckedChange={() => {}}>Show student IDs</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={false} onCheckedChange={() => {}}>Show attendance</DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem checked={true} onCheckedChange={() => {}}>Auto-save drafts</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={true} onCheckedChange={() => {}}>Highlight missing</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={true} onCheckedChange={() => {}}>Highlight late</DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="container equal-edges py-6 section-spacing">
        <GradebookGrid
          students={mockStudents}
          assessments={mockAssessments}
          onGradeChange={handleGradeChange}
          onBulkAction={handleBulkAction}
          autoSaveEnabled={true}
        />
      </main>
    </div>
  );
}