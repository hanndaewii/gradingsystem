'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Award, Clock, AlertTriangle, TrendingUp, Target, BookOpen, Calendar, MessageSquare, Download, MoreVertical, X } from 'lucide-react';
import Link from 'next/link';
import { StudentDetailModal } from '@/components/professor/StudentDetailModal';
import { Button } from '@/components/ui/Button';
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

export default function StudentDetailPage() {
  const params = useParams();
  const sectionId = params.id as string;
  const studentId = params.studentId as string;

  const student = mockStudents.find(s => s.studentId === studentId) || mockStudents[0];

  const handleGradeChange = (assessmentId: string, value: number | null) => {
    console.log('Grade changed:', assessmentId, value);
  };

  return (
    <div className="min-h-screen bg-semantic-bg-primary">
      <StudentDetailModal
        student={student}
        assessments={mockAssessments}
        onClose={() => window.history.back()}
        onGradeChange={handleGradeChange}
      />
    </div>
  );
}