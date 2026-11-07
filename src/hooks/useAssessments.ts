'use client';

import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useClasses } from './useClasses';

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

export function useAssessments(sectionId: string) {
  const queryClient = useQueryClient();
  const { data: assessmentsData } = useClasses().useSectionAssessments?.(sectionId) || { data: undefined };

  // Create assessment
  const createAssessment = useMutation({
    mutationFn: async (assessment: Omit<Assessment, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('assessments')
        .insert(assessment)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professor', 'assessments', sectionId] });
    },
  });

  // Update assessment
  const updateAssessment = useMutation({
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professor', 'assessments', sectionId] });
    },
  });

  // Delete assessment
  const deleteAssessment = useMutation({
    mutationFn: async (assessmentId: string) => {
      const { error } = await supabase
        .from('assessments')
        .delete()
        .eq('id', assessmentId);

      if (error) throw error;
      return assessmentId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professor', 'assessments', sectionId] });
    },
  });

  // Reorder assessments
  const reorderAssessments = useMutation({
    mutationFn: async (assessmentIds: string[]) => {
      const updates = assessmentIds.map((id, index) => ({
        id,
        order: index + 1,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('assessments')
        .upsert(updates);

      if (error) throw error;
      return updates;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professor', 'assessments', sectionId] });
    },
  });

  // Duplicate assessment
  const duplicateAssessment = useMutation({
    mutationFn: async (assessmentId: string) => {
      const { data: original, error: fetchError } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from('assessments')
        .insert({
          ...original,
          id: undefined,
          title: `${original.title} (Copy)`,
          order: original.order + 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professor', 'assessments', sectionId] });
    },
  });

  return {
    // Data
    assessments: assessmentsData,
    
    // Mutations
    createAssessment,
    updateAssessment,
    deleteAssessment,
    reorderAssessments,
    duplicateAssessment,
    
    // Helpers
    isLoading: createAssessment.isPending || updateAssessment.isPending || deleteAssessment.isPending,
  };
}

export function useRubrics() {
  const queryClient = useQueryClient();
  const { data: rubricsData } = useClasses().useRubrics?.() || { data: undefined };

  // Create rubric
  const createRubric = useMutation({
    mutationFn: async (rubric: Omit<Rubric, 'id' | 'created_at' | 'updated_at'>) => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('rubrics')
        .insert({
          ...rubric,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professor', 'rubrics'] });
    },
  });

  // Update rubric
  const updateRubric = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ['professor', 'rubrics'] });
    },
  });

  // Delete rubric
  const deleteRubric = useMutation({
    mutationFn: async (rubricId: string) => {
      const { error } = await supabase
        .from('rubrics')
        .delete()
        .eq('id', rubricId);

      if (error) throw error;
      return rubricId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professor', 'rubrics'] });
    },
  });

  // Duplicate rubric
  const duplicateRubric = useMutation({
    mutationFn: async (rubricId: string) => {
      const { data: original, error: fetchError } = await supabase
        .from('rubrics')
        .select('*')
        .eq('id', rubricId)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from('rubrics')
        .insert({
          ...original,
          id: undefined,
          name: `${original.name} (Copy)`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professor', 'rubrics'] });
    },
  });

  return {
    // Data
    rubrics: rubricsData,
    
    // Mutations
    createRubric,
    updateRubric,
    deleteRubric,
    duplicateRubric,
    
    // Helpers
    isLoading: createRubric.isPending || updateRubric.isPending || deleteRubric.isPending,
  };
}

// Helper to calculate total points from rubric
export function calculateRubricTotal(rubric: Rubric): number {
  return rubric.criteria.reduce((sum, criterion) => sum + criterion.points, 0);
}

// Helper to validate rubric structure
export function validateRubric(rubric: Partial<Rubric>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!rubric.name?.trim()) {
    errors.push('Rubric name is required');
  }

  if (!rubric.criteria || rubric.criteria.length === 0) {
    errors.push('At least one criterion is required');
  } else {
    rubric.criteria.forEach((criterion, index) => {
      if (!criterion.title?.trim()) {
        errors.push(`Criterion ${index + 1}: Title is required`);
      }
      if (criterion.points <= 0) {
        errors.push(`Criterion ${index + 1}: Points must be greater than 0`);
      }
      if (!criterion.levels || criterion.levels.length < 2) {
        errors.push(`Criterion ${index + 1}: At least 2 performance levels required`);
      } else {
        criterion.levels.forEach((level, levelIndex) => {
          if (!level.title?.trim()) {
            errors.push(`Criterion ${index + 1}, Level ${levelIndex + 1}: Title is required`);
          }
          if (level.points < 0) {
            errors.push(`Criterion ${index + 1}, Level ${levelIndex + 1}: Points cannot be negative`);
          }
        });
      }
    });
  }

  return { valid: errors.length === 0, errors };
}