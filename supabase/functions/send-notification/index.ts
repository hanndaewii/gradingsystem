import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  userId: string
  type: 'grade_released' | 'waitlist_promoted' | 'enrollment_confirmed' | 'enrollment_dropped'
  data: Record<string, any>
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { userId, type, data } = await req.json() as NotificationPayload

    // Get user profile for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, college_email')
      .eq('id', userId)
      .single()

    if (!profile) {
      // Try students table
      const { data: student } = await supabase
        .from('students')
        .select('full_name, college_email')
        .eq('id', userId)
        .single()
      
      if (!student) {
        throw new Error('User not found')
      }
    }

    const recipient = profile || { full_name: 'Student', college_email: 'student@example.com' }

    // Prepare notification content
    const templates: Record<string, { subject: string; body: string }> = {
      grade_released: {
        subject: `Grade Released: ${data.courseCode} - ${data.courseTitle}`,
        body: `
          Dear ${recipient.full_name},
          
          Your final grade for ${data.courseCode} (Section ${data.section}) has been released.
          
          Final Grade: ${data.finalGrade}
          Term: ${data.term}
          
          You can view your complete transcript in the grading system.
          
          Best regards,
          CWPC Business Administration Department
        `,
      },
      waitlist_promoted: {
        subject: `Waitlist Update: You've been enrolled in ${data.course}`,
        body: `
          Dear ${recipient.full_name},
          
          Great news! A spot has opened up and you have been promoted from the waitlist.
          
          Course: ${data.course} (Section ${data.section})
          Term: ${data.term}
          
          You are now officially enrolled. Please check your schedule for class times.
          
          Best regards,
          CWPC Business Administration Department
        `,
      },
      enrollment_confirmed: {
        subject: `Enrollment Confirmed: ${data.course}`,
        body: `
          Dear ${recipient.full_name},
          
          Your enrollment has been confirmed.
          
          Course: ${data.course} (Section ${data.section})
          Term: ${data.term}
          
          You can view your schedule in the student portal.
          
          Best regards,
          CWPC Business Administration Department
        `,
      },
      enrollment_dropped: {
        subject: `Course Dropped: ${data.course}`,
        body: `
          Dear ${recipient.full_name},
          
          You have been dropped from the following course:
          
          Course: ${data.course} (Section ${data.section})
          Term: ${data.term}
          Reason: ${data.reason || 'Administrative'}
          
          If you believe this is an error, please contact the registrar's office.
          
          Best regards,
          CWPC Business Administration Department
        `,
      },
    }

    const template = templates[type]
    if (!template) {
      throw new Error(`Unknown notification type: ${type}`)
    }

    // In production, send via email service (SendGrid, Resend, etc.)
    // For now, log to database
    await supabase.from('notifications').insert({
      user_id: userId,
      type,
      subject: template.subject,
      body: template.body,
      data,
      sent: true,
      sent_at: new Date().toISOString(),
    })

    // Also send real-time notification
    await supabase.channel(`user:${userId}`).send({
      type: 'broadcast',
      event: 'notification',
      payload: {
        type,
        subject: template.subject,
        data,
        timestamp: new Date().toISOString(),
      },
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationId: crypto.randomUUID(),
        type,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Notification Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})