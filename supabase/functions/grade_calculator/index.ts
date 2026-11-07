import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GradeCalculationPayload {
  enrollmentId: string
  trigger: 'grade_component_insert' | 'grade_component_update' | 'grade_component_delete' | 'assessment_weight_change'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const payload = await req.json() as GradeCalculationPayload
    const { enrollmentId } = payload

    // Get enrollment with class and term info
    const { data: enrollment, error: enrollError } = await supabase
      .from('enrollments')
      .select(`
        id,
        student_id,
        class_id,
        classes!inner(
          id,
          term_id,
          term:terms!inner(id, grading_scale),
          assessment_types(id, weight, max_score)
        )
      `)
      .eq('id', enrollmentId)
      .single()

    if (enrollError || !enrollment) {
      throw new Error('Enrollment not found')
    }

    // Get all grade components for this enrollment
    const { data: gradeComponents, error: gradesError } = await supabase
      .from('grade_components')
      .select(`
        id,
        assessment_type_id,
        raw_score,
        weighted_score,
        status
      `)
      .eq('enrollment_id', enrollmentId)

    if (gradesError) throw gradesError

    // Get assessment types for this class
    const assessmentTypes = enrollment.classes.assessment_types || []
    
    // Calculate final grade
    let totalWeightedScore = 0
    let totalWeight = 0
    let hasAllRequiredGrades = true

    for (const assessment of assessmentTypes) {
      const component = gradeComponents?.find(gc => gc.assessment_type_id === assessment.id)
      
      if (component && component.raw_score !== null && component.status === 'finalized') {
        totalWeightedScore += component.weighted_score || 0
        totalWeight += assessment.weight
      } else if (component && component.status === 'draft') {
        // Include draft grades in calculation but mark as incomplete
        totalWeightedScore += component.weighted_score || 0
        totalWeight += assessment.weight
      } else {
        hasAllRequiredGrades = false
      }
    }

    let finalGrade = totalWeight > 0 ? (totalWeightedScore / totalWeight) * 100 : null
    
    // Round to 2 decimal places
    if (finalGrade !== null) {
      finalGrade = Math.round(finalGrade * 100) / 100
    }

    // Update enrollment with calculated grade
    const { error: updateError } = await supabase
      .from('enrollments')
      .update({ 
        final_grade: finalGrade,
        updated_at: new Date().toISOString(),
      })
      .eq('id', enrollmentId)

    if (updateError) throw updateError

    // If all grades are finalized, update status
    if (hasAllRequiredGrades && finalGrade !== null) {
      const allFinalized = gradeComponents?.every(gc => gc.status === 'finalized') ?? false
      
      if (allFinalized) {
        await supabase
          .from('enrollments')
          .update({ status: 'completed' })
          .eq('id', enrollmentId)
      }
    }

    // Notify student if grade was finalized
    if (finalGrade !== null && hasAllRequiredGrades) {
      await supabase.functions.invoke('grade-release-notifier', {
        body: {
          enrollmentId,
          studentId: enrollment.student_id,
          finalGrade,
          classId: enrollment.class_id,
        },
      })
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        enrollmentId,
        finalGrade,
        totalWeight,
        hasAllRequiredGrades,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Grade Calculator Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})