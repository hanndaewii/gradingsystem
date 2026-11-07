'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

// Types
export interface ProfessorClass {
  id: string;
  course_code: string;
  course_name: string;
  section: string;
  term: string;
  instructor_id: string;
  schedule: string;
  location: string;
  capacity: number;
  enrolled_count: number;
  waitlist_count: number;
  avg_grade: number | null;
  pending_grades: number;
  upcoming_deadlines: number;
  created_at: string;
  updated_at: string;
}

export interface SectionEnrollment {
  id: string;
  section_id: string;
  student_id: string;
  student_number: string;
  first_name: string;
  last_name: string;
  email: string;
  status: 'active' | 'inactive' | 'dropped' | 'incomplete';
  enrolled_at: string;
  attendance_rate: number;
}

export interface Assessment {
  id: string;
  section_id: string;
  title: string;
  description: string;
  type: 'exam' | 'quiz' | 'assignment' | 'project' | 'participation' | 'final';
  max_points: number;
  weight: number;
  due_date: string | null;
  available_date: string | null;
  late_penalty: number;
  allow_late_submission: boolean;
  rubric_id: string | null;
  visible: boolean;
  release_grades: boolean;
  instructions: string | null;
  order: number;
  created_at: string;
  updated_at: string;
}

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

export interface Rubric {
  id: string;
  name: string;
  description: string;
  criteria: RubricCriterion[];
  total_points: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface RubricCriterion {
  id: string;
  title: string;
  description: string;
  points: number;
  levels: RubricLevel[];
}

export interface RubricLevel {
  id: string;
  title: string;
  description: string;
  points: number;
}

// Query Keys
export const professorKeys = {
  all: ['professor'] as const,
  classes: () => [...professorKeys.all, 'classes'] as const,
  class: (id: string) => [...professorKeys.all, 'class', id] as const,
  enrollments: (sectionId: string) => [...professorKeys.all, 'enrollments', sectionId] as const,
  assessments: (sectionId: string) => [...professorKeys.all, 'assessments', sectionId] as const,
  grades: (sectionId: string) => [...professorKeys.all, 'grades', sectionId] as const,
  rubrics: () => [...professorKeys.all, 'rubrics'] as const,
};

// Fetch Functions
async function fetchProfessorClasses(): Promise<ProfessorClass[]> {
  const { data, error } = await supabase
    .from('sections')
    .select(`
      *,
      course:courses(code, name),
      enrollments:enrollments(count),
      grades:grades(status, value)
    `)
    .eq('instructor_id', (await supabase.auth.getUser()).data.user?.id);

  if (error) throw error;
  return data || [];
}

async function fetchSectionEnrollments(sectionId: string): Promise<SectionEnrollment[]> {
  const { data, error } = await supabase
    .from('enrollments')
    .select(`
      *,
      student:students(student_number, first_name, last_name, email)
    `)
    .eq('section_id', sectionId)
    .eq('status', 'active');

  if (error) throw error;
  return data || [];
}

async function fetchSectionAssessments(sectionId: string): Promise<Assessment[]> {
  const { data, error } = await supabase
    .from('assessments')
    .select('*')
    .eq('section_id', sectionId)
    .order('order', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function fetchSectionGrades(sectionId: string): Promise<Grade[]> {
  const { data, error } = await supabase
    .from('grades')
    .select('*')
    .eq('section_id', sectionId);

  if (error) throw error;
  return data || [];
}

async function fetchRubrics(): Promise<Rubric[]> {
  const { data, error } = await supabase
    .from('rubrics')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Hooks
export function useClasses() {
  return useQuery({
    queryKey: professorKeys.classes(),
    queryFn: fetchProfessorClasses,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSectionEnrollments(sectionId: string) {
  return useQuery({
    queryKey: professorKeys.enrollments(sectionId),
    queryFn: () => fetchSectionEnrollments(sectionId),
    enabled: !!sectionId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useSectionAssessments(sectionId: string) {
  return useQuery({
    queryKey: professorKeys.assessments(sectionId),
    queryFn: () => fetchSectionAssessments(sectionId),
    enabled: !!sectionId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useSectionGrades(sectionId: string) {
  return useQuery({
    queryKey: professorKeys.grades(sectionId),
    queryFn: () => fetchSectionGrades(sectionId),
    enabled: !!sectionId,
    staleTime: 30 * 1000, // 30 seconds for grades
  });
}

export function useRubrics() {
  return useQuery({
    queryKey: professorKeys.rubrics(),
    queryFn: fetchRubrics,
    staleTime: 10 * 60 * 1000,
  });
}

// Mutation Hooks
export function useSaveGradeDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (grade: Partial<Grade> & { student_id: string; assessment_id: string; section_id: string }) => {
      const { data, error } = await supabase
        .from('grades')
        .upsert({
          ...grade,
          status: 'draft',
          graded_by: (await supabase.auth.getUser()).data.user?.id,
          graded_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: professorKeys.grades(variables.section_id) });
    },
  });
}

export function useSubmitGrades() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sectionId, studentIds, assessmentIds }: { sectionId: string; studentIds: string[]; assessmentIds: string[] }) => {
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: professorKeys.grades(variables.sectionId) });
    },
  });
}

export function useBulkImportGrades() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sectionId, grades }: { sectionId: string; grades: Partial<Grade>[] }) => {
      const { data, error } = await supabase
        .from('grades')
        .upsert(grades.map(g => ({
          ...g,
          status: 'draft',
          graded_by: (await supabase.auth.getUser()).data.user?.id,
          graded_at: new Date().toISOString(),
        })))
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: professorKeys.grades(variables.sectionId) });
    },
  });
}

export function useCreateAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assessment: Omit<Assessment, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('assessments')
        .insert(assessment)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: professorKeys.assessments(variables.section_id) });
    },
  });
}

export function useUpdateAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assessment: Partial<Assessment> & { id: string }) => {
      const { id, ...updates } = assessment;
      const { data, error } = await supabase
        .from('assessments')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: professorKeys.assessments(data.section_id) });
    },
  });
}

export function useDeleteAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assessmentId: string) => {
      // First get the section_id for invalidation
      const { data: assessment } = await supabase
        .from('assessments')
        .select('section_id')
        .eq('id', assessmentId)
        .single();

      const { error } = await supabase
        .from('assessments')
        .delete()
        .eq('id', assessmentId);

      if (error) throw error;
      return assessment?.section_id;
    },
    onSuccess: (sectionId) => {
      if (sectionId) {
        queryClient.invalidateQueries({ queryKey: professorKeys.assessments(sectionId) });
      }
    },
  });
}

export function useCreateRubric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rubric: Omit<Rubric, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('rubrics')
        .insert(rubric)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: professorKeys.rubrics() });
    },
  });
}

export function useUpdateRubric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rubric: Partial<Rubric> & { id: string }) => {
      const { id, ...updates } = rubric;
      const { data, error } = await supabase
        .from('rubrics')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: professorKeys.rubrics() });
    },
  });
}