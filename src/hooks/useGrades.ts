'use client';

import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useClasses } from './useClasses';

export interface Grade {
  id: string;
  section_id: string;
  student_id: string;
  assessment_id: string;
  value: number | null;
  max_points: number;
  weight: number;
  status: 'draft' | 'submitted' | 'approved' | 'missing' | 'late' | 'excused';
  comment: string | null;
  rubric_scores: Record<string, number> | null;
  graded_by: string;
  graded_at: string;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BulkGradeOperation {
  section_id: string;
  operations: Array<{
    student_id: string;
    assessment_id: string;
    value: number | null;
    status?: Grade['status'];
    comment?: string;
  }>;
}

export function useGrades(sectionId: string) {
  const queryClient = useQueryClient();
  const { data: gradesData } = useClasses().useSectionGrades?.(sectionId) || { data: undefined };

  // Save single grade as draft
  const saveGradeDraft = useMutation({
    mutationFn: async (grade: {
      student_id: string;
      assessment_id: string;
      value: number | null;
      status?: Grade['status'];
      comment?: string;
      rubric_scores?: Record<string, number>;
    }) => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('grades')
        .upsert({
          section_id: sectionId,
          ...grade,
          status: grade.status || 'draft',
          max_points: 0, // Will be filled from assessment
          weight: 0, // Will be filled from assessment
          graded_by: user.id,
          graded_at: new Date().toISOString(),
        }, {
          onConflict: 'section_id,student_id,assessment_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professor', 'grades', sectionId] });
    },
  });

  // Submit grades for review
  const submitGrades = useMutation({
    mutationFn: async ({ studentIds, assessmentIds }: { studentIds: string[]; assessmentIds: string[] }) => {
      const { data, error } = await supabase
        .from('grades')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        })
        .eq('section_id', sectionId)
        .in('student_id', studentIds)
        .in('assessment_id', assessmentIds)
        .eq('status', 'draft')
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professor', 'grades', sectionId] });
    },
  });

  // Bulk import grades
  const bulkImportGrades = useMutation({
    mutationFn: async (operations: BulkGradeOperation['operations']) => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const grades = operations.map(op => ({
        section_id: sectionId,
        ...op,
        status: op.status || 'draft',
        max_points: 0,
        weight: 0,
        graded_by: user.id,
        graded_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('grades')
        .upsert(grades, {
          onConflict: 'section_id,student_id,assessment_id',
        })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professor', 'grades', sectionId] });
    },
  });

  // Export grades
  const exportGrades = useMutation({
    mutationFn: async (format: 'csv' | 'xlsx' | 'pdf') => {
      const { data: grades, error } = await supabase
        .from('grades')
        .select(`
          *,
          student:students(student_number, first_name, last_name, email),
          assessment:assessments(title, type, max_points, weight)
        `)
        .eq('section_id', sectionId);

      if (error) throw error;

      // Format for export
      const formatted = grades?.map(g => ({
        student_id: g.student?.student_number,
        student_name: `${g.student?.last_name}, ${g.student?.first_name}`,
        student_email: g.student?.email,
        assessment_title: g.assessment?.title,
        assessment_type: g.assessment?.type,
        max_points: g.assessment?.max_points,
        weight: g.assessment?.weight,
        score: g.value,
        percentage: g.value !== null && g.assessment?.max_points ? Math.round((g.value / g.assessment.max_points) * 100) : null,
        status: g.status,
        comment: g.comment,
        graded_at: g.graded_at,
      })) || [];

      if (format === 'csv') {
        const headers = Object.keys(formatted[0] || {}).join(',');
        const rows = formatted.map(row => Object.values(row).map(v => `"${v ?? ''}"`).join(',')).join('\n');
        return `${headers}\n${rows}`;
      }

      return formatted;
    },
  });

  // Get student grades for a specific student
  const getStudentGrades = useMutation({
    mutationFn: async (studentId: string) => {
      const { data, error } = await supabase
        .from('grades')
        .select(`
          *,
          assessment:assessments(title, type, max_points, weight, due_date, order)
        `)
        .eq('section_id', sectionId)
        .eq('student_id', studentId)
        .order('order', { referencedTable: 'assessments', ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Get class roster with grades summary
  const getClassRoster = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          student:students(student_number, first_name, last_name, email),
          grades:grades(value, status, assessment:assessments(max_points, weight))
        `)
        .eq('section_id', sectionId)
        .eq('status', 'active');

      if (error) throw error;
      return data;
    },
  });

  return {
    // Data
    grades: gradesData,
    
    // Mutations
    saveGradeDraft,
    submitGrades,
    bulkImportGrades,
    exportGrades,
    getStudentGrades,
    getClassRoster,
    
    // Helpers
    isLoading: saveGradeDraft.isPending || submitGrades.isPending || bulkImportGrades.isPending,
    isSaving: saveGradeDraft.isPending,
    isSubmitting: submitGrades.isPending,
    isImporting: bulkImportGrades.isPending,
  };
}

// Auto-save hook with debouncing
export function useAutoSaveGrade(sectionId: string, delay = 300) {
  const { saveGradeDraft } = useGrades(sectionId);
  const pendingSaves = React.useRef<Map<string, NodeJS.Timeout>>(new Map());

  const scheduleSave = React.useCallback((
    studentId: string,
    assessmentId: string,
    value: number | null,
    status?: Grade['status']
  ) => {
    const key = `${studentId}-${assessmentId}`;
    
    // Clear existing timeout
    const existing = pendingSaves.current.get(key);
    if (existing) clearTimeout(existing);
    
    // Schedule new save
    const timeout = setTimeout(() => {
      saveGradeDraft.mutate({ student_id: studentId, assessment_id: assessmentId, value, status });
      pendingSaves.current.delete(key);
    }, delay);
    
    pendingSaves.current.set(key, timeout);
  }, [saveGradeDraft, delay]);

  // Flush all pending saves
  const flush = React.useCallback(() => {
    pendingSaves.current.forEach((timeout) => {
      clearTimeout(timeout);
    });
    pendingSaves.current.clear();
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => flush();
  }, [flush]);

  return { scheduleSave, flush };
}