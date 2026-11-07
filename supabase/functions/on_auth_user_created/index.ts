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

    const { user } = await req.json()

    // Check if user is registering with CWPC email domain
    const isCwpcEmail = user.email?.endsWith('@cwc.edu.ph') ?? false
    
    // Default role: professor for CWPC emails, student for others
    const defaultRole = isCwpcEmail ? 'professor' : 'student'

    // Update user metadata with role
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        role: defaultRole,
        department: 'Business Administration',
        requires_approval: isCwpcEmail,
      },
    })

    // Create profile entry
    await supabase.from('profiles').insert({
      id: user.id,
      employee_number: user.user_metadata?.employee_number || `EMP-${Date.now()}`,
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      college_email: user.email,
      role: defaultRole,
      department: 'Business Administration',
      is_approved: !isCwpcEmail, // Auto-approve non-CWPC (students), require approval for professors
      mfa_enabled: false,
    })

    // Log audit
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'USER_REGISTERED',
      entity_type: 'Profile',
      entity_id: user.id,
      new_data: {
        email: user.email,
        role: defaultRole,
        requires_approval: isCwpcEmail,
      },
    })

    // Send notification to admins if approval required
    if (isCwpcEmail) {
      await supabase.functions.invoke('send-notification', {
        body: {
          userId: 'admin', // Will be broadcast to all admins via realtime
          type: 'professor_registration',
          data: {
            professorName: user.user_metadata?.full_name,
            professorEmail: user.email,
            employeeNumber: user.user_metadata?.employee_number,
          },
        },
      })
    }

    return new Response(
      JSON.stringify({ success: true, role: defaultRole, requiresApproval: isCwpcEmail }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Auth Hook Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})