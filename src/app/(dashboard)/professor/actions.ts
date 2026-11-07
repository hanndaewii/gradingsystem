'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

// Validation schemas
const gradeSchema = z.object({
  student_id: z.string().uuid(),
  assessment_id: z.string().uuid(),
  value: z.number().nullable(),
  status: z.enum(['draft', 'submitted', 'approved', 'missing', 'late', 'excused']).optional(),
  comment: z.string().optional(),
  rubric_scores: z.record(z.number()).optional(),
});

const bulkGradesSchema = z.array(gradeSchema.extend({
  section_id: z.string().uuid(),
}));

const assessmentSchema = z.object({
  section_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(['exam', 'quiz', 'assignment', 'project', 'participation', 'final']),
  max_points: z.number().positive(),
  weight: z.number().min(0).max(100),
  due_date: z.string().datetime().nullable().optional(),
  available_date: z.string().datetime().nullable().optional(),
  late_penalty: z.number().min(0).max(100).default(0),
  allow_late_submission: z.boolean().default(true),
  rubric_id: z.string().uuid().nullable().optional(),
  visible: z.boolean().default(true),
  release_grades: z.boolean().default(false),
  instructions: z.string().optional(),
  order: z.number().int().positive(),
});

const rubricSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  criteria: z.array(z.object({
    id: z.string(),
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    points: z.number().positive(),
    levels: z.array(z.object({
      id: z.string(),
      title: z.string().min(1).max(100),
      description: z.string().optional(),
      points: z.number().min(0),
    })).min(2),
  })).min(1),
  total_points: z.number().positive(),
});

/**
 * Save a single grade as draft
 */
export async function saveGradeDraft(
  sectionId: string,
  studentId: string,
  assessmentId: string,
  value: number | null,
  options?: { status?: string; comment?: string; rubricScores?: Record<string, number> }
) {
  const supabase = await createServerSupabaseClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' };
  }

  // Verify professor owns this section
  const { data: section, error: sectionError } = await supabase
    .from('sections')
    .select('instructor_id')
    .eq('id', sectionId)
    .single();

  if (sectionError || section?.instructor_id !== user.id) {
    return { error: 'Forbidden', code: 'FORBIDDEN' };
  }

  // Get assessment for max_points and weight
  const { data: assessment, error: assessmentError } = await supabase
    .from('assessments')
    .select('max_points, weight')
    .eq('id', assessmentId)
    .single();

  if (assessmentError) {
    return { error: 'Assessment not found', code: 'NOT_FOUND' };
  }

  // Validate grade value
  if (value !== null && (value < 0 || value > assessment.max_points)) {
    return { error: `Grade must be between 0 and ${assessment.max_points}`, code: 'INVALID_VALUE' };
  }

  const { data, error } = await supabase
    .from('grades')
    .upsert({
      section_id: sectionId,
      student_id: studentId,
      assessment_id: assessmentId,
      value,
      max_points: assessment.max_points,
      weight: assessment.weight,
      status: options?.status || 'draft',
      comment: options?.comment || null,
      rubric_scores: options?.rubricScores || null,
      graded_by: user.id,
      graded_at: new Date().toISOString(),
    }, {
      onConflict: 'section_id,student_id,assessment_id',
    })
    .select()
    .single();

  if (error) {
    console.error('Save grade error:', error);
    return { error: 'Failed to save grade', code: 'DB_ERROR' };
  }

  revalidatePath(`/professor/sections/${sectionId}/gradebook`);
  return { data, success: true };
}

/**
 * Submit grades for review
 */
export async function submitGrades(
  sectionId: string,
  studentIds: string[],
  assessmentIds: string[]
) {
  const supabase = await createServerSupabaseClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' };
  }

  // Verify professor owns this section
  const { data: section, error: sectionError } = await supabase
    .from('sections')
    .select('instructor_id')
    .eq('id', sectionId)
    .single();

  if (sectionError || section?.instructor_id !== user.id) {
    return { error: 'Forbidden', code: 'FORBIDDEN' };
  }

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

  if (error) {
    console.error('Submit grades error:', error);
    return { error: 'Failed to submit grades', code: 'DB_ERROR' };
  }

  revalidatePath(`/professor/sections/${sectionId}/gradebook`);
  return { data, count: data?.length || 0, success: true };
}

/**
 * Bulk import grades from CSV/Excel
 */
export async function bulkImportGrades(
  sectionId: string,
  grades: Array<{
    student_id: string;
    assessment_id: string;
    value: number | null;
    status?: string;
    comment?: string;
  }>
) {
  const supabase = await createServerSupabaseClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' };
  }

  // Verify professor owns this section
  const { data: section, error: sectionError } = await supabase
    .from('sections')
    .select('instructor_id')
    .eq('id', sectionId)
    .single();

  if (sectionError || section?.instructor_id !== user.id) {
    return { error: 'Forbidden', code: 'FORBIDDEN' };
  }

  // Validate all grades
  const validatedGrades = [];
  for (const grade of grades) {
    const parsed = gradeSchema.safeParse(grade);
    if (!parsed.success) {
      return { error: `Invalid grade data: ${parsed.error.message}`, code: 'VALIDATION_ERROR' };
    }

    // Get assessment for max_points and weight
    const { data: assessment } = await supabase
      .from('assessments')
      .select('max_points, weight')
      .eq('id', grade.assessment_id)
      .single();

    if (!assessment) {
      return { error: `Assessment ${grade.assessment_id} not found`, code: 'NOT_FOUND' };
    }

    if (grade.value !== null && (grade.value < 0 || grade.value > assessment.max_points)) {
      return { error: `Grade for ${grade.student_id} exceeds max points`, code: 'INVALID_VALUE' };
    }

    validatedGrades.push({
      ...parsed.data,
      section_id: sectionId,
      max_points: assessment.max_points,
      weight: assessment.weight,
      graded_by: user.id,
      graded_at: new Date().toISOString(),
    });
  }

  const { data, error } = await supabase
    .from('grades')
    .upsert(validatedGrades, {
      onConflict: 'section_id,student_id,assessment_id',
    })
    .select();

  if (error) {
    console.error('Bulk import error:', error);
    return { error: 'Failed to import grades', code: 'DB_ERROR' };
  }

  revalidatePath(`/professor/sections/${sectionId}/gradebook`);
  return { data, count: data?.length || 0, success: true };
}

/**
 * Export grades in various formats
 */
export async function exportGrades(
  sectionId: string,
  format: 'csv' | 'xlsx' | 'pdf',
  options?: { includeComments?: boolean; includeHistory?: boolean; includeRubric?: boolean }
) {
  const supabase = await createServerSupabaseClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' };
  }

  // Verify professor owns this section
  const { data: section, error: sectionError } = await supabase
    .from('sections')
    .select('instructor_id, course_id, term')
    .eq('id', sectionId)
    .single();

  if (sectionError || section?.instructor_id !== user.id) {
    return { error: 'Forbidden', code: 'FORBIDDEN' };
  }

  // Fetch grades with related data
  let query = supabase
    .from('grades')
    .select(`
      *,
      student:students(student_number, first_name, last_name, email),
      assessment:assessments(title, type, max_points, weight, due_date, order)
    `)
    .eq('section_id', sectionId)
    .order('order', { referencedTable: 'assessments', ascending: true });

  const { data: grades, error } = await query;

  if (error) {
    console.error('Export grades error:', error);
    return { error: 'Failed to fetch grades', code: 'DB_ERROR' };
  }

  // Format for export
  const formatted = grades?.map(g => ({
    student_id: g.student?.student_number,
    student_name: `${g.student?.last_name}, ${g.student?.first_name}`,
    student_email: g.student?.email,
    assessment_title: g.assessment?.title,
    assessment_type: g.assessment?.type,
    max_points: g.assessment?.max_points,
    weight: g.assessment?.weight,
    due_date: g.assessment?.due_date,
    score: g.value,
    percentage: g.value !== null && g.assessment?.max_points 
      ? Math.round((g.value / g.assessment.max_points) * 100) 
      : null,
    status: g.status,
    comment: options?.includeComments ? g.comment : undefined,
    graded_at: g.graded_at,
    submitted_at: g.submitted_at,
    approved_at: g.approved_at,
  })) || [];

  if (format === 'csv') {
    const headers = Object.keys(formatted[0] || {}).join(',');
    const rows = formatted.map(row => 
      Object.values(row).map(v => `"${v ?? ''}"`).join(',')
    ).join('\n');
    
    return { 
      data: `${headers}\n${rows}`, 
      filename: `grades-${section.course_id}-${section.term}-${Date.now()}.csv`,
      mimeType: 'text/csv',
      success: true 
    };
  }

  // For xlsx and pdf, return JSON (client will handle formatting)
  return { 
    data: formatted, 
    filename: `grades-${section.course_id}-${section.term}-${Date.now()}.json`,
    mimeType: 'application/json',
    success: true 
  };
}

/**
 * Create a new assessment
 */
export async function createAssessment(input: z.infer<typeof assessmentSchema>) {
  const supabase = await createServerSupabaseClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' };
  }

  // Verify professor owns this section
  const { data: section, error: sectionError } = await supabase
    .from('sections')
    .select('instructor_id')
    .eq('id', input.section_id)
    .single();

  if (sectionError || section?.instructor_id !== user.id) {
    return { error: 'Forbidden', code: 'FORBIDDEN' };
  }

  const parsed = assessmentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.message, code: 'VALIDATION_ERROR' };
  }

  const { data, error } = await supabase
    .from('assessments')
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    console.error('Create assessment error:', error);
    return { error: 'Failed to create assessment', code: 'DB_ERROR' };
  }

  revalidatePath(`/professor/sections/${input.section_id}/assignments`);
  revalidatePath(`/professor/sections/${input.section_id}/gradebook`);
  return { data, success: true };
}

/**
 * Update an existing assessment
 */
export async function updateAssessment(
  assessmentId: string,
  input: Partial<z.infer<typeof assessmentSchema>>
) {
  const supabase = await createServerSupabaseClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' };
  }

  // Verify professor owns this assessment's section
  const { data: assessment, error: assessmentError } = await supabase
    .from('assessments')
    .select('section_id, section:instructor_id')
    .eq('id', assessmentId)
    .single();

  if (assessmentError || assessment?.section?.instructor_id !== user.id) {
    return { error: 'Forbidden', code: 'FORBIDDEN' };
  }

  const { data, error } = await supabase
    .from('assessments')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', assessmentId)
    .select()
    .single();

  if (error) {
    console.error('Update assessment error:', error);
    return { error: 'Failed to update assessment', code: 'DB_ERROR' };
  }

  revalidatePath(`/professor/sections/${assessment.section_id}/assignments`);
  revalidatePath(`/professor/sections/${assessment.section_id}/gradebook`);
  return { data, success: true };
}

/**
 * Delete an assessment
 */
export async function deleteAssessment(assessmentId: string) {
  const supabase = await createServerSupabaseClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' };
  }

  // Verify professor owns this assessment's section
  const { data: assessment, error: assessmentError } = await supabase
    .from('assessments')
    .select('section_id, section:instructor_id')
    .eq('id', assessmentId)
    .single();

  if (assessmentError || assessment?.section?.instructor_id !== user.id) {
    return { error: 'Forbidden', code: 'FORBIDDEN' };
  }

  const { error } = await supabase
    .from('assessments')
    .delete()
    .eq('id', assessmentId);

  if (error) {
    console.error('Delete assessment error:', error);
    return { error: 'Failed to delete assessment', code: 'DB_ERROR' };
  }

  revalidatePath(`/professor/sections/${assessment.section_id}/assignments`);
  revalidatePath(`/professor/sections/${assessment.section_id}/gradebook`);
  return { success: true };
}

/**
 * Create a new rubric
 */
export async function createRubric(input: z.infer<typeof rubricSchema>) {
  const supabase = await createServerSupabaseClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' };
  }

  const parsed = rubricSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.message, code: 'VALIDATION_ERROR' };
  }

  const { data, error } = await supabase
    .from('rubrics')
    .insert({
      ...parsed.data,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Create rubric error:', error);
    return { error: 'Failed to create rubric', code: 'DB_ERROR' };
  }

  return { data, success: true };
}

/**
 * Update an existing rubric
 */
export async function updateRubric(
  rubricId: string,
  input: Partial<z.infer<typeof rubricSchema>>
) {
  const supabase = await createServerSupabaseClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' };
  }

  // Verify ownership
  const { data: rubric, error: rubricError } = await supabase
    .from('rubrics')
    .select('created_by')
    .eq('id', rubricId)
    .single();

  if (rubricError || rubric?.created_by !== user.id) {
    return { error: 'Forbidden', code: 'FORBIDDEN' };
  }

  const { data, error } = await supabase
    .from('rubrics')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', rubricId)
    .select()
    .single();

  if (error) {
    console.error('Update rubric error:', error);
    return { error: 'Failed to update rubric', code: 'DB_ERROR' };
  }

  return { data, success: true };
}

/**
 * Get class roster with grades summary
 */
export async function getClassRoster(sectionId: string) {
  const supabase = await createServerSupabaseClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' };
  }

  // Verify professor owns this section
  const { data: section, error: sectionError } = await supabase
    .from('sections')
    .select('instructor_id')
    .eq('id', sectionId)
    .single();

  if (sectionError || section?.instructor_id !== user.id) {
    return { error: 'Forbidden', code: 'FORBIDDEN' };
  }

  const { data, error } = await supabase
    .from('enrollments')
    .select(`
      *,
      student:students(student_number, first_name, last_name, email),
      grades:grades(value, status, assessment:assessments(max_points, weight))
    `)
    .eq('section_id', sectionId)
    .eq('status', 'active')
    .order('last_name', { referencedTable: 'students', ascending: true });

  if (error) {
    console.error('Get class roster error:', error);
    return { error: 'Failed to fetch roster', code: 'DB_ERROR' };
  }

  return { data, success: true };
}

/**
 * Get student grades for a specific student
 */
export async function getStudentGrades(sectionId: string, studentId: string) {
  const supabase = await createServerSupabaseClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' };
  }

  // Verify professor owns this section
  const { data: section, error: sectionError } = await supabase
    .from('sections')
    .select('instructor_id')
    .eq('id', sectionId)
    .single();

  if (sectionError || section?.instructor_id !== user.id) {
    return { error: 'Forbidden', code: 'FORBIDDEN' };
  }

  const { data, error } = await supabase
    .from('grades')
    .select(`
      *,
      assessment:assessments(title, type, max_points, weight, due_date, order)
    `)
    .eq('section_id', sectionId)
    .eq('student_id', studentId)
    .order('order', { referencedTable: 'assessments', ascending: true });

  if (error) {
    console.error('Get student grades error:', error);
    return { error: 'Failed to fetch student grades', code: 'DB_ERROR' };
  }

  return { data, success: true };
}