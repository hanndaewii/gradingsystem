import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScheduledReportConfig {
  id: string
  name: string
  template: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'term-end'
  recipients: string[] // user IDs
  filters: Record<string, any>
  format: 'pdf' | 'excel' | 'csv'
  enabled: boolean
  lastRun?: string
  nextRun?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get all scheduled reports that are due
    const now = new Date().toISOString()
    const { data: scheduledReports, error: reportsError } = await supabase
      .from('scheduled_reports')
      .select('*')
      .eq('enabled', true)
      .lte('next_run', now)

    if (reportsError) throw reportsError

    const results = []

    for (const report of scheduledReports || []) {
      try {
        // Generate report based on template
        const reportData = await generateReport(supabase, report.template, report.filters)
        
        // Generate file
        let fileBuffer: Uint8Array
        let fileName: string
        
        if (report.format === 'pdf') {
          fileBuffer = await generatePDF(report.template, reportData, report.name)
          fileName = `${report.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`
        } else if (report.format === 'excel') {
          fileBuffer = await generateExcel(report.template, reportData)
          fileName = `${report.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`
        } else {
          fileBuffer = await generateCSV(report.template, reportData)
          fileName = `${report.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`
        }

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('reports')
          .upload(`scheduled/${fileName}`, fileBuffer, {
            contentType: getContentType(report.format),
            upsert: true,
          })

        if (uploadError) throw uploadError

        // Create signed URLs for recipients
        const { data: signedUrlData } = await supabase.storage
          .from('reports')
          .createSignedUrl(`scheduled/${fileName}`, 604800) // 7 days

        // Send notifications to recipients
        for (const recipientId of report.recipients) {
          await supabase.functions.invoke('send-notification', {
            body: {
              userId: recipientId,
              type: 'report_ready',
              data: {
                reportName: report.name,
                downloadUrl: signedUrlData?.signedUrl,
                format: report.format,
              },
            },
          })
        }

        // Calculate next run
        const nextRun = calculateNextRun(report.frequency, new Date())

        // Update scheduled report
        await supabase
          .from('scheduled_reports')
          .update({
            last_run: now,
            next_run: nextRun.toISOString(),
          })
          .eq('id', report.id)

        // Log audit
        await supabase.from('audit_logs').insert({
          actor_id: 'system-cron',
          action: 'SCHEDULED_REPORT_GENERATED',
          entity_type: 'ScheduledReport',
          entity_id: report.id,
          new_data: { 
            reportName: report.name,
            recipients: report.recipients.length,
            format: report.format,
            fileName,
          },
        })

        results.push({ reportId: report.id, success: true, fileName })

      } catch (error) {
        console.error(`Failed to generate scheduled report ${report.id}:`, error)
        results.push({ reportId: report.id, success: false, error: error.message })
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Scheduled Reports Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function generateReport(supabase: any, template: string, filters: Record<string, any>) {
  // This would query the database based on the template and filters
  // Simplified for example
  switch (template) {
    case 'enrollment-summary':
      return getEnrollmentSummary(supabase, filters)
    case 'grade-distribution':
      return getGradeDistribution(supabase, filters)
    case 'capacity-report':
      return getCapacityReport(supabase, filters)
    default:
      return { template, filters, generatedAt: new Date().toISOString() }
  }
}

async function getEnrollmentSummary(supabase: any, filters: any) {
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select(`
      *,
      student:students(full_name, student_number, program, year_level),
      class:classes(
        section,
        course:courses(code, title, units),
        term:terms(code, label)
      )
    `)
    .eq('term_id', filters.termId || (await getCurrentTerm(supabase)))
  
  return { enrollments: enrollments || [], summary: { total: enrollments?.length || 0 } }
}

async function getGradeDistribution(supabase: any, filters: any) {
  const { data: grades } = await supabase
    .from('enrollments')
    .select('final_grade, class:classes(course:courses(code, title))')
    .not('final_grade', 'is', null)
    .eq('class.term_id', filters.termId || (await getCurrentTerm(supabase)))
  
  return { grades: grades || [] }
}

async function getCapacityReport(supabase: any, filters: any) {
  const { data: classes } = await supabase
    .from('classes')
    .select(`
      id, section, max_students,
      course:courses(code, title),
      term:terms(code, label)
    `)
    .eq('term_id', filters.termId || (await getCurrentTerm(supabase)))
  
  const classesWithCounts = await Promise.all(
    (classes || []).map(async (c: any) => {
      const { count } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', c.id)
        .eq('status', 'enrolled')
      return { ...c, enrolled: count || 0 }
    })
  )
  
  return { classes: classesWithCounts }
}

async function getCurrentTerm(supabase: any) {
  const { data: term } = await supabase
    .from('terms')
    .select('id')
    .eq('is_active', true)
    .single()
  return term?.id
}

async function generatePDF(template: string, data: any, title: string): Promise<Uint8Array> {
  // Simplified PDF generation - in production use pdf-lib or similar
  const content = `
%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 100 >>
stream
BT /F1 12 Tf 50 700 Td (${title}) Tj ET
BT /F1 10 Tf 50 680 Td (Generated: ${new Date().toLocaleString()}) Tj ET
BT /F1 10 Tf 50 660 Td (Template: ${template}) Tj ET
BT /F1 10 Tf 50 640 Td (Data: ${JSON.stringify(data).substring(0, 200)}) Tj ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000252 00000 n
0000000400 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
500
%%EOF
  `
  return new TextEncoder().encode(content)
}

async function generateExcel(template: string, data: any): Promise<Uint8Array> {
  // Simplified - in production use xlsx or similar
  const csv = await generateCSV(template, data)
  return csv
}

async function generateCSV(template: string, data: any): Promise<Uint8Array> {
  // Simple CSV generation
  let csv = 'Report,Template,Generated At\n'
  csv += `"${template}","${template}","${new Date().toISOString()}"\n`
  return new TextEncoder().encode(csv)
}

function getContentType(format: string): string {
  switch (format) {
    case 'pdf': return 'application/pdf'
    case 'excel': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    case 'csv': return 'text/csv'
    default: return 'application/octet-stream'
  }
}

function calculateNextRun(frequency: string, from: Date): Date {
  const next = new Date(from)
  switch (frequency) {
    case 'daily': next.setDate(next.getDate() + 1); break
    case 'weekly': next.setDate(next.getDate() + 7); break
    case 'monthly': next.setMonth(next.getMonth() + 1); break
    case 'term-end': next.setMonth(next.getMonth() + 4); break // ~4 months per term
  }
  // Set to 8 AM
  next.setHours(8, 0, 0, 0)
  return next
}