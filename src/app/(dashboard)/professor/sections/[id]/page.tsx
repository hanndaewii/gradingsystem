'use client';

import * as React from 'react';
import { Users, Clock, AlertTriangle, TrendingUp, Settings, ArrowLeft, MoreVertical, Download, Plus, Search, Filter } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ClassCard } from '@/components/professor/ClassCard';
import { SectionStats } from '@/components/professor/SectionStats';
import { GradebookGrid } from '@/components/professor/GradebookGrid';
import { AssessmentTabs } from '@/components/professor/AssessmentTabs';
import { AssignmentWizard } from '@/components/professor/AssignmentWizard';
import { StudentDetailModal } from '@/components/professor/StudentDetailModal';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/DropdownMenu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { StatCard } from '@/components/ui/StatCard';
import { formatRelativeTime } from '@/lib/utils';
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

export default function SectionDetailPage() {
  const params = useParams();
  const sectionId = params.id as string;

  const [activeTab, setActiveTab] = React.useState<'roster' | 'assignments' | 'gradebook' | 'settings'>('roster');
  const [showAssignmentWizard, setShowAssignmentWizard] = React.useState(false);
  const [editingAssessment, setEditingAssessment] = React.useState<AssessmentColumn | null>(null);
  const [selectedStudent, setSelectedStudent] = React.useState<StudentGradeRow | null>(null);
  const [showStudentDetail, setShowStudentDetail] = React.useState(false);

  // Mock section data
  const section = {
    id: sectionId,
    courseCode: 'CS 101',
    courseName: 'Introduction to Computer Science',
    section: 'A',
    term: 'Fall 2024',
    instructor: 'Prof. Sarah Chen',
    schedule: 'MWF 10:00-10:50 AM',
    location: 'Engineering Hall 101',
    capacity: 150,
    enrolled: 142,
    waitlist: 8,
  };

  const handleGradeChange = (studentId: string, assessmentId: string, value: number | null, status?: any) => {
    console.log('Grade changed:', studentId, assessmentId, value, status);
  };

  const handleBulkAction = (action: string, data?: any) => {
    console.log('Bulk action:', action, data);
  };

  const handleCreateAssessment = (data: any) => {
    console.log('Create assessment:', data);
    setShowAssignmentWizard(false);
  };

  const handleStudentClick = (student: StudentGradeRow) => {
    setSelectedStudent(student);
    setShowStudentDetail(true);
  };

  return (
    <div className="min-h-screen bg-semantic-bg-primary">
      {/* Header */}
      <header className="border-b border-semantic-border-primary bg-semantic-bg-secondary/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container equal-edges">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="h-10 w-10" aria-label="Back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{section.courseCode}</Badge>
                  <Badge variant="secondary">Section {section.section}</Badge>
                </div>
                <h1 className="text-heading-lg font-semibold text-semantic-text-primary mt-1">{section.courseName}</h1>
                <p className="text-body-sm text-semantic-text-secondary">{section.term} • {section.schedule} • {section.location}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export Roster
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export Gradebook
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="flex items-center gap-2 text-semantic-status-error">
                    <AlertTriangle className="h-4 w-4" />
                    Archive Section
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="border-b border-semantic-border-primary bg-semantic-bg-secondary/50 sticky top-16 z-10">
        <div className="container equal-edges">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="roster">
                <Users className="h-4 w-4 mr-2" />
                Roster
              </TabsTrigger>
              <TabsTrigger value="assignments">
                <Plus className="h-4 w-4 mr-2" />
                Assignments
              </TabsTrigger>
              <TabsTrigger value="gradebook">
                <TrendingUp className="h-4 w-4 mr-2" />
                Gradebook
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </nav>

      <main className="container equal-edges py-6 section-spacing">
        {/* Roster Tab */}
        <TabsContent value="roster" className="animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-heading-lg font-semibold text-semantic-text-primary">Class Roster</h2>
              <p className="text-body-sm text-semantic-text-secondary mt-1">
                {section.enrolled} of {section.capacity} enrolled • {section.waitlist} on waitlist
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative max-w-xs hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-semantic-text-tertiary" />
                <Input placeholder="Search students..." className="pl-10" size="sm" />
              </div>
              <Button variant="outline" size="sm" className="gap-1">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          {/* Roster Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard title="Enrolled" value={section.enrolled} icon={<Users className="h-5 w-5" />} />
            <StatCard title="Capacity" value={`${Math.round((section.enrolled/section.capacity)*100)}%`} icon={<Users className="h-5 w-5" />} />
            <StatCard title="Waitlist" value={section.waitlist} icon={<Clock className="h-5 w-5" />} variant="warning" />
            <StatCard title="Avg Grade" value="87.3%" icon={<TrendingUp className="h-5 w-5" />} trend="+2.1% vs last term" trendUp />
          </div>

          {/* Student Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full" role="table">
                  <thead>
                    <tr className="border-b border-semantic-border-primary bg-semantic-bg-secondary">
                      <th className="p-3 text-left text-body-sm font-semibold text-semantic-text-secondary">Student</th>
                      <th className="p-3 text-left text-body-sm font-semibold text-semantic-text-secondary">ID</th>
                      <th className="p-3 text-left text-body-sm font-semibold text-semantic-text-secondary">Email</th>
                      <th className="p-3 text-left text-body-sm font-semibold text-semantic-text-secondary">Status</th>
                      <th className="p-3 text-right text-body-sm font-semibold text-semantic-text-secondary">Attendance</th>
                      <th className="p-3 text-right text-body-sm font-semibold text-semantic-text-secondary">Current Grade</th>
                      <th className="p-3 text-right text-body-sm font-semibold text-semantic-text-secondary">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-semantic-border-primary">
                    {mockStudents.slice(0, 20).map((student) => (
                      <tr key={student.id} className="hover:bg-semantic-bg-secondary/50 cursor-pointer" onClick={() => handleStudentClick(student)}>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">{student.firstName[0]}{student.lastName[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-body-sm text-semantic-text-primary">
                                {student.lastName}, {student.firstName}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-body-sm text-semantic-text-secondary">{student.studentNumber}</td>
                        <td className="p-3 text-body-sm text-semantic-text-secondary truncate max-w-xs">{student.email}</td>
                        <td className="p-3">
                          <Badge variant={student.status === 'active' ? 'success' : 'default'}>
                            {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                          </Badge>
                        </td>
                        <td className="p-3 text-right text-body-sm text-semantic-text-primary">{student.attendance}%</td>
                        <td className="p-3 text-right">
                          {student.finalGrade !== null ? (
                            <Badge variant="default" className={
                              student.finalGrade >= 90 ? 'text-emerald-600 bg-emerald-50' :
                              student.finalGrade >= 80 ? 'text-blue-600 bg-blue-50' :
                              student.finalGrade >= 70 ? 'text-amber-600 bg-amber-50' :
                              student.finalGrade >= 60 ? 'text-orange-600 bg-orange-50' :
                              'text-rose-600 bg-rose-50'
                            }>
                              {student.finalGrade}% ({student.letterGrade})
                            </Badge>
                          ) : (
                            <span className="text-body-sm text-semantic-text-tertiary">—</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleStudentClick(student); }} aria-label="View details">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-semantic-border-primary flex items-center justify-between">
                <span className="text-body-sm text-semantic-text-secondary">
                  Showing 20 of {section.enrolled} students
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" disabled><ChevronLeft className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon"><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments" className="animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-heading-lg font-semibold text-semantic-text-primary">Assignments & Assessments</h2>
              <p className="text-body-sm text-semantic-text-secondary mt-1">Manage all assessments for this section</p>
            </div>
            <Button onClick={() => { setEditingAssessment(null); setShowAssignmentWizard(true); }} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Assessment
            </Button>
          </div>

          <AssessmentTabs
            assessments={mockAssessments}
            activeType="all"
            onTypeChange={() => {}}
            onAssessmentClick={(a) => { setEditingAssessment(a); setShowAssignmentWizard(true); }}
            onCreateAssessment={() => { setEditingAssessment(null); setShowAssignmentWizard(true); }}
          />
        </TabsContent>

        {/* Gradebook Tab */}
        <TabsContent value="gradebook" className="animate-fade-in">
          <GradebookGrid
            students={mockStudents}
            assessments={mockAssessments}
            onGradeChange={handleGradeChange}
            onBulkAction={handleBulkAction}
            onStudentClick={handleStudentClick}
            autoSaveEnabled={true}
          />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="animate-fade-in">
          <div className="space-y-6 max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle className="text-heading-md">Section Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <SettingRow label="Course Code" value={section.courseCode} />
                <SettingRow label="Section" value={section.section} />
                <SettingRow label="Term" value={section.term} />
                <SettingRow label="Instructor" value={section.instructor} />
                <SettingRow label="Schedule" value={section.schedule} />
                <SettingRow label="Location" value={section.location} />
                <SettingRow label="Capacity" value={`${section.enrolled}/${section.capacity}`} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-heading-md">Grading Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <SettingToggle label="Auto-save draft grades" description="Automatically save grade changes as drafts" defaultChecked />
                <SettingToggle label="Release grades immediately" description="Make grades visible to students upon entry" />
                <SettingToggle label="Allow late submissions" description="Accept submissions after due date with penalty" defaultChecked />
                <SettingToggle label="Show class averages" description="Display class averages to students" />
                <SettingToggle label="Enable grade notifications" description="Notify students when grades are posted" defaultChecked />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-heading-md">Grade Scheme</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <GradeSchemeRow grade="A" range="90-100%" points="4.0" />
                  <GradeSchemeRow grade="B" range="80-89%" points="3.0" />
                  <GradeSchemeRow grade="C" range="70-79%" points="2.0" />
                  <GradeSchemeRow grade="D" range="60-69%" points="1.0" />
                  <GradeSchemeRow grade="F" range="Below 60%" points="0.0" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </main>

      {/* Modals */}
      {showAssignmentWizard && (
        <AssignmentWizard
          initialData={editingAssessment || undefined}
          onComplete={handleCreateAssessment}
          onCancel={() => { setShowAssignmentWizard(false); setEditingAssessment(null); }}
          existingRubrics={[{ id: 'r1', name: 'Standard Project Rubric' }, { id: 'r2', name: 'Exam Rubric' }]}
        />
      )}

      {showStudentDetail && selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          assessments={mockAssessments}
          onClose={() => { setShowStudentDetail(false); setSelectedStudent(null); }}
          onGradeChange={handleGradeChange}
          onViewHistory={(assessmentId) => console.log('View history:', assessmentId)}
        />
      )}
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-semantic-border-primary/50 last:border-0">
      <span className="text-body-sm text-semantic-text-tertiary">{label}</span>
      <span className="text-body-sm font-medium text-semantic-text-primary">{value}</span>
    </div>
  );
}

function SettingToggle({ label, description, defaultChecked = false }: { label: string; description: string; defaultChecked?: boolean }) {
  const [checked, setChecked] = React.useState(defaultChecked);
  return (
    <div className="flex items-center justify-between py-2 border-b border-semantic-border-primary/50 last:border-0">
      <div className="flex-1">
        <p className="text-body-sm font-medium text-semantic-text-primary">{label}</p>
        <p className="text-caption text-semantic-text-tertiary">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => setChecked(!checked)}
        className={cn(
          'relative h-6 w-11 rounded-full transition-colors',
          checked ? 'bg-semantic-brand-primary' : 'bg-semantic-border-primary'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5'
          )}
        />
      </button>
    </div>
  );
}

function GradeSchemeRow({ grade, range, points }: { grade: string; range: string; points: string }) {
  const colors: Record<string, string> = {
    A: 'text-emerald-600 bg-emerald-50',
    B: 'text-blue-600 bg-blue-50',
    C: 'text-amber-600 bg-amber-50',
    D: 'text-orange-600 bg-orange-50',
    F: 'text-rose-600 bg-rose-50',
  };
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-semantic-bg-secondary">
      <Badge variant="default" className={colors[grade]}>{grade}</Badge>
      <span className="text-body-sm text-semantic-text-secondary">{range}</span>
      <span className="text-body-sm font-medium text-semantic-text-primary">{points}</span>
    </div>
  );
}

import { ChevronLeft, ChevronRight } from 'lucide-react';