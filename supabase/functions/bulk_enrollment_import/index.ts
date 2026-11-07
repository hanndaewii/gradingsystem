import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ImportRequest {
  csvData: string
  termId: string
  options?: {
    skipHeader?: boolean
    validateOnly?: boolean
    sendNotifications?: boolean
  }
}

interface CSVRow {
  student_id: string
  course_code: string
  section: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { csvData, termId, options } = await req.json() as ImportRequest

    // Parse CSV
    const lines = csvData.trim().split('\n')
    const startIndex = options?.skipHeader !== false ? 1 : 0
    const rows: CSVRow[] = lines.slice(startIndex).map(line => {
      const [student_id, course_code, section] = line.split(',').map(s => s.trim())
      return { student_id, course_code, section }
    })

    const results = {
      total: rows.length,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ row: number; student_id: string; error: string }>,
      warnings: [] as Array<{ row: number; student_id: string; warning: string }>,
    }

    // Validate term exists
    const { data: term } = await supabase
      .from('terms')
      .select('id, code')
      .eq('id', termId)
      .single()

    if (!term) {
      throw new Error('Term not found')
    }

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + startIndex + 1

      try {
        // Validate required fields
        if (!row.student_id || !row.course_code || !row.section) {
          results.errors.push({ row: rowNum, student_id: row.student_id || 'N/A', error: 'Missing required fields' })
          results.failed++
          continue
        }

        // Find student
        const { data: student } = await supabase
          .from('students')
          .select('id')
          .eq('student_number', row.student_id)
          .single()

        if (!student) {
          results.errors.push({ row: rowNum, student_id: row.student_id, error: 'Student not found' })
          results.failed++
          continue
        }

        // Find class
        const { data: classData } = await supabase
          .from('classes')
          .select('id, max_students, course_id')
          .eq('course_id', (await supabase.from('courses').select('id').eq('code', row.course_code).single()).data?.id)
          .eq('term_id', termId)
          .eq('section', row.section)
          .single()

        if (!classData) {
          results.errors.push({ row: rowNum, student_id: row.student_id, error: 'Class not found for this term/section' })
          results.failed++
          continue
        }

        // Check if already enrolled
        const { data: existingEnrollment } = await supabase
          .from('enrollments')
          .select('id')
          .eq('student_id', student.id)
          .eq('class_id', classData.id)
          .single()

        if (existingEnrollment) {
          results.warnings.push({ row: rowNum, student_id: row.student_id, warning: 'Already enrolled in this section' })
          results.failed++
          continue
        }

        // Check capacity
        const { count: enrolledCount } = await supabase
          .from('enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', classData.id)
          .eq('status', 'enrolled')

        if ((enrolledCount || 0) >= classData.max_students) {
          // Add to waitlist
          if (!options?.validateOnly) {
            await supabase.from('enrollments').insert({
              student_id: student.id,
              class_id: classData.id,
              status: 'waitlisted',
            })
          }
          results.warnings.push({ row: rowNum, student_id: row.student_id, warning: 'Section full - added to waitlist' })
          results.successful++
          continue
        }

        // Check prerequisites
        const { data: course } = await supabase
          .from('courses')
          .select('id, code, prerequisites')
          .eq('id', classData.course_id)
          .single()

        if (course?.prerequisites && course.prerequisites.length > 0) {
          const { data: completedCourses } = await supabase
            .from('enrollments')
            .select('classes!inner(courses!inner(code))')
            .eq('student_id', student.id)
            .eq('status', 'completed')

          const completedCodes = completedCourses?.map(e => e.classes.courses.code) || []
          const missingPrereqs = course.prerequisites.filter((p: string) => !completedCodes.includes(p))

          if (missingPrereqs.length > 0) {
            results.warnings.push({ row: rowNum, student_id: row.student_id, warning: `Missing prerequisites: ${missingPrereqs.join(', ')}` })
            // Still enroll but flag
          }
        }

        if (!options?.validateOnly) {
          // Create enrollment
          const { error: enrollError } = await supabase.from('enrollments').insert({
            student_id: student.id,
            class_id: classData.id,
            status: 'enrolled',
          })

          if (enrollError) throw enrollError

          // Send notification if enabled
          if (options?.sendNotifications) {
            await supabase.functions.invoke('send-notification', {
              body: {
                userId: student.id,
                type: 'enrollment_confirmed',
                data: { course: row.course_code, section: row.section, term: term.code },
              },
            })
          }
        }

        results.successful++

      } catch (error) {
        results.errors.push({ row: rowNum, student_id: row.student_id, error: error.message })
        results.failed++
      }
    }

    // Log audit
    await supabase.from('audit_logs').insert({
      actor_id: (await supabase.auth.getUser()).data.user?.id,
      action: 'BULK_ENROLLMENT_IMPORT',
      entity_type: 'Enrollment',
      entity_id: termId,
      new_data: { 
        term: term.code,
        total: results.total,
        successful: results.successful,
        failed: results.failed,
      },
    })

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Bulk Import Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})