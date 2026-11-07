'use client';

import * as React from 'react';
import { X, Award, Clock, AlertTriangle, TrendingUp, Target, BookOpen, Calendar, MessageSquare, Download, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Progress } from '@/components/ui/Progress';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/DropdownMenu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { GPATrendChart } from '@/components/ui/GPATrendChart';
import { formatDateTime, formatRelativeTime } from '@/lib/utils';
import { StudentGradeRow, GradeCellData, AssessmentColumn } from './GradebookGrid';

interface StudentDetailModalProps {
  student: StudentGradeRow;
  assessments: AssessmentColumn[];
  onClose: () => void;
  onGradeChange?: (assessmentId: string, value: number | null) => void;
  onSendMessage?: () => void;
  onViewHistory?: (assessmentId: string) => void;
}

const GRADE_COLORS = {
  A: 'text-emerald-600 bg-emerald-50',
  B: 'text-blue-600 bg-blue-50',
  C: 'text-amber-600 bg-amber-50',
  D: 'text-orange-600 bg-orange-50',
  F: 'text-rose-600 bg-rose-50',
} as const;

function getLetterGrade(percentage: number | null): string {
  if (percentage === null) return 'N/A';
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
}

export function StudentDetailModal({
  student,
  assessments,
  onClose,
  onGradeChange,
  onSendMessage,
  onViewHistory,
}: StudentDetailModalProps) {
  const [activeTab, setActiveTab] = React.useState<'overview' | 'grades' | 'attendance' | 'notes'>('overview');

  // Calculate stats
  const gradedAssessments = assessments.filter(a => student.grades[a.id]?.value !== null);
  const totalPoints = gradedAssessments.reduce((sum, a) => sum + (student.grades[a.id]?.value || 0), 0);
  const maxPoints = gradedAssessments.reduce((sum, a) => sum + a.maxPoints, 0);
  const avgPercentage = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : null;
  const letterGrade = getLetterGrade(avgPercentage);
  const missingCount = assessments.filter(a => student.grades[a.id]?.status === 'missing').length;
  const lateCount = assessments.filter(a => student.grades[a.id]?.status === 'late').length;

  // Mock trend data
  const trendData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8'],
    datasets: [{
      label: 'Grade Trend',
      data: [85, 87, 82, 88, 90, 85, 89, avgPercentage || 87],
      borderColor: 'var(--color-brand-primary)',
      backgroundColor: 'var(--color-brand-primary)20',
    }],
  };

  // Mock attendance data
  const attendanceData = {
    present: 22,
    absent: 2,
    late: 3,
    excused: 1,
    total: 28,
  };

  const attendanceRate = attendanceData.total > 0
    ? Math.round((attendanceData.present / attendanceData.total) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-labelledby="student-detail-title">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Panel */}
      <div className="flex-1 max-w-4xl bg-semantic-card-bg animate-scale-in shadow-2xl flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-semantic-border-primary sticky top-0 z-10 bg-semantic-card-bg">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-xl">
                {student.firstName[0]}{student.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 id="student-detail-title" className="text-heading-lg font-semibold text-semantic-text-primary">
                {student.firstName} {student.lastName}
              </h2>
              <div className="flex items-center gap-3 mt-1 text-body-sm text-semantic-text-secondary">
                <span className="font-mono">{student.studentNumber}</span>
                <span>•</span>
                <span>{student.email}</span>
                <Badge variant={student.status === 'active' ? 'success' : 'default'}>
                  {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onSendMessage} className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Send Message
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export Transcript
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Schedule Meeting
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center gap-2 text-semantic-status-error">
                  <AlertTriangle className="h-4 w-4" />
                  Flag for Review
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10" aria-label="Close">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="px-4 py-3 border-b border-semantic-border-primary bg-semantic-bg-secondary/50 flex flex-wrap gap-4">
          <StatPill
            icon={<Award className="h-4 w-4" />}
            label="Current Grade"
            value={avgPercentage !== null ? `${avgPercentage}%` : '—'}
            color={avgPercentage !== null ? GRADE_COLORS[letterGrade as keyof typeof GRADE_COLORS] : ''}
          />
          <StatPill
            icon={<Target className="h-4 w-4" />}
            label="Letter Grade"
            value={letterGrade}
            color={GRADE_COLORS[letterGrade as keyof typeof GRADE_COLORS]}
          />
          <StatPill
            icon={<BookOpen className="h-4 w-4" />}
            label="Completed"
            value={`${gradedAssessments.length}/${assessments.length}`}
          />
          <StatPill
            icon={<Clock className="h-4 w-4" />}
            label="Missing"
            value={missingCount.toString()}
            color={missingCount > 0 ? 'text-rose-600 bg-rose-50' : ''}
          />
          <StatPill
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Late"
            value={lateCount.toString()}
            color={lateCount > 0 ? 'text-amber-600 bg-amber-50' : ''}
          />
          <StatPill
            icon={<TrendingUp className="h-4 w-4" />}
            label="Attendance"
            value={`${attendanceRate}%`}
            color={attendanceRate >= 90 ? 'text-emerald-600 bg-emerald-50' : attendanceRate >= 75 ? 'text-amber-600 bg-amber-50' : 'text-rose-600 bg-rose-50'}
          />
        </div>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="border-b border-semantic-border-primary">
          <TabsList className="px-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="grades">All Grades</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Tab Content */}
        <ScrollArea className="flex-1 p-4">
          {activeTab === 'overview' && (
            <OverviewTab
              student={student}
              avgPercentage={avgPercentage}
              letterGrade={letterGrade}
              trendData={trendData}
              attendanceData={attendanceData}
              attendanceRate={attendanceRate}
              gradedCount={gradedAssessments.length}
              totalCount={assessments.length}
              missingCount={missingCount}
              lateCount={lateCount}
            />
          )}

          {activeTab === 'grades' && (
            <GradesTab
              student={student}
              assessments={assessments}
              onGradeChange={onGradeChange}
              onViewHistory={onViewHistory}
            />
          )}

          {activeTab === 'attendance' && (
            <AttendanceTab attendanceData={attendanceData} attendanceRate={attendanceRate} />
          )}

          {activeTab === 'notes' && (
            <NotesTab studentId={student.studentId} />
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

interface StatPillProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: string;
}

function StatPill({ icon, label, value, color = '' }: StatPillProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-semantic-card-bg border border-semantic-border-primary">
      <div className={cn('h-8 w-8 rounded-lg flex-center', color || 'bg-semantic-bg-tertiary text-semantic-text-tertiary')}>
        {icon}
      </div>
      <div>
        <p className="text-caption text-semantic-text-tertiary">{label}</p>
        <p className={cn('font-semibold text-body-sm text-semantic-text-primary', color)}>{value}</p>
      </div>
    </div>
  );
}

function OverviewTab({
  student,
  avgPercentage,
  letterGrade,
  trendData,
  attendanceData,
  attendanceRate,
  gradedCount,
  totalCount,
  missingCount,
  lateCount,
}: {
  student: StudentGradeRow;
  avgPercentage: number | null;
  letterGrade: string;
  trendData: { labels: string[]; datasets: Array<{ label: string; data: (number | null)[]; borderColor?: string; backgroundColor?: string }> };
  attendanceData: { present: number; absent: number; late: number; excused: number; total: number };
  attendanceRate: number;
  gradedCount: number;
  totalCount: number;
  missingCount: number;
  lateCount: number;
}) {
  return (
    <div className="space-y-6">
      {/* Grade Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-heading-md">Grade Trend</CardTitle>
          <CardDescription>Performance over the term</CardDescription>
        </CardHeader>
        <CardContent>
          <GPATrendChart
            data={trendData}
            height={250}
            showPoints={true}
            options={{
              scales: {
                y: { min: 0, max: 100, stepSize: 10 },
              },
            }}
          />
        </CardContent>
      </Card>

      {/* Attendance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-heading-md">Attendance Summary</CardTitle>
          <CardDescription>{attendanceData.total} sessions this term</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <AttendanceStat label="Present" value={attendanceData.present} color="text-emerald-600 bg-emerald-50" icon={<CheckCircle className="h-4 w-4" />} />
            <AttendanceStat label="Absent" value={attendanceData.absent} color="text-rose-600 bg-rose-50" icon={<X className="h-4 w-4" />} />
            <AttendanceStat label="Late" value={attendanceData.late} color="text-amber-600 bg-amber-50" icon={<Clock className="h-4 w-4" />} />
            <AttendanceStat label="Excused" value={attendanceData.excused} color="text-blue-600 bg-blue-50" icon={<Shield className="h-4 w-4" />} />
          </div>
          <Progress value={attendanceRate} className="h-3" showLabel label={`Attendance Rate: ${attendanceRate}%`} />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-heading-md">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ActionButton icon={<MessageSquare className="h-5 w-5" />} label="Send Message" />
            <ActionButton icon={<Calendar className="h-5 w-5" />} label="Schedule Meeting" />
            <ActionButton icon={<Download className="h-5 w-5" />} label="Export Report" />
            <ActionButton icon={<AlertTriangle className="h-5 w-5" />} label="Flag for Review" variant="warning" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AttendanceStat({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="text-center p-3 rounded-lg bg-semantic-card-bg border border-semantic-border-primary">
      <div className={cn('h-10 w-10 rounded-lg flex-center mx-auto mb-2', color)}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-semantic-text-primary">{value}</p>
      <p className="text-caption text-semantic-text-tertiary">{label}</p>
    </div>
  );
}

function Shield({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}

function ActionButton({ icon, label, variant = 'default' }: { icon: React.ReactNode; label: string; variant?: 'default' | 'warning' }) {
  const baseClass = 'flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors';
  const variantClass = variant === 'warning'
    ? 'border-semantic-status-warning/50 text-semantic-status-warning hover:bg-semantic-status-warning/5'
    : 'border-semantic-border-primary text-semantic-text-secondary hover:bg-semantic-bg-secondary hover:text-semantic-text-primary';

  return (
    <button type="button" className={cn(baseClass, variantClass)}>
      <div className="h-10 w-10 rounded-lg flex-center bg-semantic-bg-tertiary">{icon}</div>
      <span className="text-caption font-medium">{label}</span>
    </button>
  );
}

function GradesTab({
  student,
  assessments,
  onGradeChange,
  onViewHistory,
}: {
  student: StudentGradeRow;
  assessments: AssessmentColumn[];
  onGradeChange?: (assessmentId: string, value: number | null) => void;
  onViewHistory?: (assessmentId: string) => void;
}) {
  const visibleAssessments = assessments.filter(a => a.visible).sort((a, b) => a.order - b.order);

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead>
              <tr className="border-b border-semantic-border-primary bg-semantic-bg-secondary">
                <th className="p-3 text-left text-body-sm font-semibold text-semantic-text-secondary">Assessment</th>
                <th className="p-3 text-left text-body-sm font-semibold text-semantic-text-secondary">Type</th>
                <th className="p-3 text-right text-body-sm font-semibold text-semantic-text-secondary">Score</th>
                <th className="p-3 text-right text-body-sm font-semibold text-semantic-text-secondary">%</th>
                <th className="p-3 text-left text-body-sm font-semibold text-semantic-text-secondary">Status</th>
                <th className="p-3 text-right text-body-sm font-semibold text-semantic-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-semantic-border-primary">
              {visibleAssessments.map((assessment) => {
                const gradeData = student.grades[assessment.id];
                const percentage = gradeData?.value !== null && assessment.maxPoints > 0
                  ? Math.round((gradeData.value / assessment.maxPoints) * 100)
                  : null;
                const letterGrade = getLetterGrade(percentage);
                const statusConfig = gradeData ? {
                  draft: { variant: 'warning' as const, label: 'Draft', icon: <Clock className="h-3 w-3" /> },
                  submitted: { variant: 'info' as const, label: 'Submitted', icon: <Save className="h-3 w-3" /> },
                  approved: { variant: 'success' as const, label: 'Approved', icon: <CheckCircle className="h-3 w-3" /> },
                  missing: { variant: 'error' as const, label: 'Missing', icon: <AlertTriangle className="h-3 w-3" /> },
                  late: { variant: 'warning' as const, label: 'Late', icon: <Clock className="h-3 w-3" /> },
                  excused: { variant: 'default' as const, label: 'Excused', icon: <EyeOff className="h-3 w-3" /> },
                }[gradeData.status] : { variant: 'default' as const, label: '—', icon: <Minus className="h-3 w-3" /> };

                return (
                  <tr key={assessment.id} className="hover:bg-semantic-bg-secondary/50">
                    <td className="p-3">
                      <div>
                        <p className="font-medium text-body-sm text-semantic-text-primary">{assessment.title}</p>
                        {assessment.dueDate && (
                          <p className="text-caption text-semantic-text-tertiary">
                            Due: {new Date(assessment.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="gap-1">
                        {ASSESSMENT_TYPE_ICONS[assessment.type]}
                        {assessment.type.charAt(0).toUpperCase() + assessment.type.slice(1)}
                      </Badge>
                    </td>
                    <td className="p-3 text-right font-mono font-medium text-body-sm text-semantic-text-primary">
                      {gradeData?.value !== null ? `${gradeData.value}/${assessment.maxPoints}` : '—'}
                    </td>
                    <td className="p-3 text-right">
                      {percentage !== null && (
                        <Badge variant="default" className={GRADE_COLORS[letterGrade as keyof typeof GRADE_COLORS]}>
                          {percentage}%
                        </Badge>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge variant={statusConfig.variant} className="gap-1">
                        {statusConfig.icon}
                        {statusConfig.label}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {gradeData?.rubricScores && Object.keys(gradeData.rubricScores).length > 0 && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="View rubric">
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {onViewHistory && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onViewHistory(assessment.id)} title="View history">
                            <History className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function Save({ className }: { className?: string }) {
  return <CheckCircle className={className} />;
}

function EyeOff({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
}

function Minus({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}

function CheckCircle({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
}

function Clock({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}

function History({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>;
}

function Edit({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
}

function AttendanceTab({
  attendanceData,
  attendanceRate,
}: {
  attendanceData: { present: number; absent: number; late: number; excused: number; total: number };
  attendanceRate: number;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-heading-md">Attendance Overview</CardTitle>
          <CardDescription>Term attendance summary</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <AttendanceStat label="Present" value={attendanceData.present} color="text-emerald-600 bg-emerald-50" icon={<CheckCircle className="h-4 w-4" />} />
            <AttendanceStat label="Absent" value={attendanceData.absent} color="text-rose-600 bg-rose-50" icon={<X className="h-4 w-4" />} />
            <AttendanceStat label="Late" value={attendanceData.late} color="text-amber-600 bg-amber-50" icon={<Clock className="h-4 w-4" />} />
            <AttendanceStat label="Excused" value={attendanceData.excused} color="text-blue-600 bg-blue-50" icon={<Shield className="h-4 w-4" />} />
          </div>
          <Progress value={attendanceRate} className="h-3" showLabel label={`Attendance Rate: ${attendanceRate}%`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-heading-md">Session Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { date: '2024-01-15', status: 'present', topic: 'Lecture: Database Design' },
              { date: '2024-01-12', status: 'present', topic: 'Lab: SQL Queries' },
              { date: '2024-01-10', status: 'late', topic: 'Lecture: Normalization' },
              { date: '2024-01-08', status: 'present', topic: 'Lab: ER Diagrams' },
              { date: '2024-01-05', status: 'absent', topic: 'Lecture: Transactions' },
            ].map((session, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-semantic-bg-secondary">
                <div className="flex items-center gap-3">
                  <Badge variant={session.status === 'present' ? 'success' : session.status === 'late' ? 'warning' : session.status === 'absent' ? 'error' : 'info'}>
                    {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                  </Badge>
                  <div>
                    <p className="font-medium text-body-sm text-semantic-text-primary">{session.topic}</p>
                    <p className="text-caption text-semantic-text-tertiary">{new Date(session.date).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NotesTab({ studentId }: { studentId: string }) {
  const [notes, setNotes] = React.useState([
    { id: '1', text: 'Student struggling with recursive functions. Recommended office hours.', date: '2024-01-10', author: 'Prof. Chen' },
    { id: '2', text: 'Excellent project proposal submitted. Approved for final project.', date: '2024-01-05', author: 'Prof. Chen' },
    { id: '3', text: 'Requested extension for Assignment 3 due to illness. Granted until Friday.', date: '2024-01-02', author: 'TA Alex' },
  ]);
  const [newNote, setNewNote] = React.useState('');

  const handleAddNote = () => {
    if (newNote.trim()) {
      setNotes([{ id: Date.now().toString(), text: newNote.trim(), date: new Date().toISOString().split('T')[0], author: 'Prof. Chen' }, ...notes]);
      setNewNote('');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-heading-md">Add Note</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a private note about this student..."
              rows={3}
              className="flex-1"
            />
            <Button onClick={handleAddNote} disabled={!newNote.trim()} className="self-end">
              Add Note
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-heading-md">Notes History</CardTitle>
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <p className="text-body-sm text-semantic-text-tertiary text-center py-8">No notes yet</p>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => (
                <div key={note.id} className="p-3 rounded-lg bg-semantic-bg-secondary border border-semantic-border-primary">
                  <p className="text-body-sm text-semantic-text-primary mb-2">{note.text}</p>
                  <div className="flex items-center justify-between text-caption text-semantic-text-tertiary">
                    <span>{note.author} • {formatDateTime(note.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string }) {
  return (
    <textarea
      className={cn(
        'w-full px-3 py-2 bg-semantic-input-bg border border-semantic-input-border rounded-lg',
        'focus:border-semantic-input-focus focus:ring-2 focus:ring-semantic-brand-primary/20',
        'placeholder:text-semantic-input-placeholder',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    />
  );
}

const ASSESSMENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  exam: <span className="text-caption">📝</span>,
  quiz: <span className="text-caption">❓</span>,
  assignment: <span className="text-caption">📋</span>,
  project: <span className="text-caption">📁</span>,
  participation: <span className="text-caption">👥</span>,
  final: <span className="text-caption">🏆</span>,
};