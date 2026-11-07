import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface TranscriptRequest {
  studentId: string
  template: 'transcript' | 'grade-report' | 'enrollment-verification'
  format: 'pdf'
  options?: {
    includeLogo?: boolean
    watermark?: boolean
    digitalSignature?: boolean
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { studentId, template, format, options } = await req.json() as TranscriptRequest

    // Fetch student data
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single()

    if (studentError || !student) {
      throw new Error('Student not found')
    }

    // Fetch enrollments with grades
    const { data: enrollments, error: enrollError } = await supabase
      .from('enrollments')
      .select(`
        *,
        classes!inner(
          id,
          section,
          schedule,
          courses!inner(id, code, title, units, department),
          terms!inner(id, code, label, grading_scale),
          professor:profiles!classes_professor_id_fkey(full_name, college_email)
        )
      `)
      .eq('student_id', studentId)
      .eq('status', 'completed')

    if (enrollError) throw enrollError

    // Fetch grade components for each enrollment
    const enrollmentsWithGrades = await Promise.all(
      (enrollments || []).map(async (enrollment) => {
        const { data: grades } = await supabase
          .from('grade_components')
          .select(`
            *,
            assessment_types!inner(id, name, weight, max_score)
          `)
          .eq('enrollment_id', enrollment.id)
          .eq('status', 'finalized')
        
        return { ...enrollment, grades: grades || [] }
      })
    )

    // Generate PDF
    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    
    let page = pdfDoc.addPage()
    const { width, height } = page.getSize()
    const margin = 50
    let y = height - margin

    // Helper functions
    const drawText = (text: string, x: number, y: number, size = 10, font_ = font, color = rgb(0, 0, 0)) => {
      page.drawText(text, { x, y, size, font: font_, color })
    }

    const drawLine = (y: number) => {
      page.drawLine({
        start: { x: margin, y },
        end: { x: width - margin, y },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      })
    }

    const checkPageBreak = (requiredSpace: number) => {
      if (y < margin + requiredSpace) {
        page = pdfDoc.addPage()
        y = height - margin
      }
    }

    // Header with CWPC branding
    if (options?.includeLogo !== false) {
      drawText('CAVITE WEST POINT COLLEGE', margin, y, 18, fontBold, rgb(0.1, 0.2, 0.5))
      y -= 22
      drawText('Department of Business Administration', margin, y, 12, font, rgb(0.3, 0.3, 0.3))
      y -= 18
      drawText('Ternate, Cavite, Philippines', margin, y, 10, font, rgb(0.5, 0.5, 0.5))
      y -= 10
      drawLine(y)
      y -= 20
    }

    // Document title
    const titles: Record<string, string> = {
      transcript: 'OFFICIAL TRANSCRIPT OF RECORDS',
      'grade-report': 'GRADE REPORT',
      'enrollment-verification': 'ENROLLMENT VERIFICATION',
    }
    drawText(titles[template] || 'REPORT', margin, y, 16, fontBold, rgb(0.1, 0.2, 0.5))
    y -= 30

    // Student info
    drawText('STUDENT INFORMATION', margin, y, 12, fontBold)
    y -= 20
    
    const info = [
      ['Student Name:', student.full_name],
      ['Student Number:', student.student_number],
      ['Program:', student.program],
      ['Year Level:', student.year_level.toString()],
      ['College Email:', student.college_email || 'N/A'],
    ]

    info.forEach(([label, value]) => {
      drawText(label, margin, y, 10, fontBold)
      drawText(value, margin + 140, y, 10, font)
      y -= 16
    })

    y -= 10
    drawLine(y)
    y -= 20

    if (template === 'enrollment-verification') {
      // Enrollment verification content
      drawText('ENROLLMENT STATUS VERIFICATION', margin, y, 12, fontBold)
      y -= 20
      
      const currentEnrollments = enrollmentsWithGrades.filter(e => e.status === 'enrolled')
      drawText(`This certifies that ${student.full_name} (${student.student_number}) is currently enrolled in ${currentEnrollments.length} course(s) for the current term.`, margin, y, 10, font, undefined, { maxWidth: width - 2 * margin })
      y -= 40

      currentEnrollments.forEach(e => {
        checkPageBreak(30)
        drawText(`${e.classes.courses.code} - ${e.classes.courses.title} (Section ${e.classes.section})`, margin, y, 10, fontBold)
        y -= 14
        drawText(`Units: ${e.classes.courses.units} | Professor: ${e.classes.professor?.full_name || 'TBA'}`, margin + 10, y, 9, font)
        y -= 18
      })
    } else {
      // Transcript / Grade Report content
      drawText('ACADEMIC RECORD', margin, y, 12, fontBold)
      y -= 20

      // Table header
      const colWidths = [60, 220, 50, 70, 70, 70]
      const headers = ['Term', 'Course', 'Units', 'Grade', 'GPA Equiv.', 'Remarks']
      
      drawLine(y)
      y -= 2
      headers.forEach((header, i) => {
        const x = margin + colWidths.slice(0, i).reduce((a, b) => a + b, 0)
        drawText(header, x + 2, y, 8, fontBold)
      })
      y -= 14
      drawLine(y)
      y -= 10

      // Group by term
      const byTerm = enrollmentsWithGrades.reduce((acc, e) => {
        const termLabel = e.classes.terms.label
        if (!acc[termLabel]) acc[termLabel] = []
        acc[termLabel].push(e)
        return acc
      }, {} as Record<string, typeof enrollmentsWithGrades>)

      let totalUnits = 0
      let totalGradePoints = 0

      Object.entries(byTerm).forEach(([termLabel, termEnrollments]) => {
        checkPageBreak(40)
        drawText(termLabel, margin, y, 10, fontBold, rgb(0.1, 0.2, 0.5))
        y -= 18

        termEnrollments.forEach(e => {
          checkPageBreak(20)
          const course = e.classes.courses
          const finalGrade = e.final_grade || 0
          const gradePoint = calculateGradePoint(finalGrade, e.classes.terms.grading_scale)
          
          totalUnits += course.units
          totalGradePoints += gradePoint * course.units

          const rowData = [
            e.classes.terms.code,
            `${course.code} - ${course.title}`,
            course.units.toString(),
            finalGrade.toFixed(2),
            gradePoint.toFixed(2),
            e.status === 'completed' ? 'Passed' : 'In Progress',
          ]

          rowData.forEach((cell, i) => {
            const x = margin + colWidths.slice(0, i).reduce((a, b) => a + b, 0)
            drawText(cell, x + 2, y, 8, font)
          })
          y -= 14
        })
        y -= 8
      })

      // Summary
      y -= 10
      drawLine(y)
      y -= 15
      const gpa = totalUnits > 0 ? totalGradePoints / totalUnits : 0
      drawText(`Total Units Earned: ${totalUnits}`, margin, y, 10, fontBold)
      y -= 16
      drawText(`General Weighted Average (GWA): ${gpa.toFixed(2)}`, margin, y, 10, fontBold, rgb(0.1, 0.2, 0.5))
    }

    // Footer with signature lines
    y -= 30
    drawLine(y)
    y -= 20
    drawText('___________________________', margin, y, 10, font)
    drawText('___________________________', width - margin - 200, y, 10, font)
    y -= 14
    drawText('Registrar', margin, y, 9, font)
    drawText('Dean, College of Business Administration', width - margin - 200, y, 9, font)
    y -= 20
    drawText(`Date Generated: ${new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin, y, 9, font)
    drawText(`Document ID: ${crypto.randomUUID().slice(0, 8).toUpperCase()}`, width - margin - 150, y, 9, font)

    // Watermark
    if (options?.watermark) {
      const pages = pdfDoc.getPages()
      pages.forEach(p => {
        p.drawText('OFFICIAL DOCUMENT', {
          x: width / 2 - 150,
          y: height / 2,
          size: 60,
          font,
          color: rgb(0.9, 0.9, 0.9),
          rotate: { type: 'degrees', angle: 45 },
          opacity: 0.1,
        })
      })
    }

    const pdfBytes = await pdfDoc.save()

    // Upload to Supabase Storage
    const fileName = `${template}-${student.student_number}-${Date.now()}.pdf`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('reports')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) throw uploadError

    // Create signed URL (valid for 1 hour)
    const { data: signedUrlData } = await supabase.storage
      .from('reports')
      .createSignedUrl(fileName, 3600)

    // Log audit
    await supabase.from('audit_logs').insert({
      actor_id: (await supabase.auth.getUser()).data.user?.id,
      action: 'GENERATE_REPORT',
      entity_type: 'Report',
      entity_id: studentId,
      new_data: { template, format, fileName },
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        downloadUrl: signedUrlData?.signedUrl,
        fileName,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('PDF Generation Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function calculateGradePoint(grade: number, gradingScale: any): number {
  // Philippine 1.0-5.0 scale
  if (gradingScale && gradingScale['1.00']) {
    if (grade >= 97) return 1.00
    if (grade >= 94) return 1.25
    if (grade >= 91) return 1.50
    if (grade >= 88) return 1.75
    if (grade >= 85) return 2.00
    if (grade >= 82) return 2.25
    if (grade >= 79) return 2.50
    if (grade >= 76) return 2.75
    if (grade >= 75) return 3.00
    return 5.00
  }
  // Default: assume 4.0 scale
  if (grade >= 90) return 4.0
  if (grade >= 85) return 3.5
  if (grade >= 80) return 3.0
  if (grade >= 75) return 2.5
  if (grade >= 70) return 2.0
  if (grade >= 65) return 1.5
  if (grade >= 60) return 1.0
  return 0.0
}