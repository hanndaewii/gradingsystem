import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get all active classes with waitlisted students
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select(`
        id,
        section,
        max_students,
        course:courses!inner(code, title),
        term:terms!inner(code, label)
      `)
      .eq('status', 'active')

    if (classesError) throw classesError

    let totalPromoted = 0
    const promotions: Array<{ classId: string; studentId: string; position: number }> = []

    for (const classItem of classes || []) {
      // Count currently enrolled
      const { count: enrolledCount } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', classItem.id)
        .eq('status', 'enrolled')

      const availableSlots = (classItem.max_students || 40) - (enrolledCount || 0)

      if (availableSlots <= 0) continue

      // Get waitlisted students in order
      const { data: waitlisted } = await supabase
        .from('enrollments')
        .select('id, student_id, enrolled_at')
        .eq('class_id', classItem.id)
        .eq('status', 'waitlisted')
        .order('enrolled_at', { ascending: true })
        .limit(availableSlots)

      if (!waitlisted || waitlisted.length === 0) continue

      // Promote each waitlisted student
      for (let i = 0; i < waitlisted.length; i++) {
        const enrollment = waitlisted[i]
        
        const { error: updateError } = await supabase
          .from('enrollments')
          .update({ 
            status: 'enrolled',
            enrolled_at: new Date().toISOString(),
          })
          .eq('id', enrollment.id)

        if (updateError) {
          console.error('Failed to promote:', updateError)
          continue
        }

        promotions.push({
          classId: classItem.id,
          studentId: enrollment.student_id,
          position: i + 1,
        })

        // Send notification
        await supabase.functions.invoke('send-notification', {
          body: {
            userId: enrollment.student_id,
            type: 'waitlist_promoted',
            data: {
              course: classItem.course.code,
              section: classItem.section,
              term: classItem.term.label,
            },
          },
        })

        totalPromoted++
      }
    }

    // Log audit
    await supabase.from('audit_logs').insert({
      actor_id: 'system-cron',
      action: 'WAITLIST_PROMOTION',
      entity_type: 'Enrollment',
      entity_id: null,
      new_data: { 
        totalPromoted,
        promotions: promotions.length,
        timestamp: new Date().toISOString(),
      },
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalPromoted,
        promotions,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Waitlist Processor Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})