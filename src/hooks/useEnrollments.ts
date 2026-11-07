import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface EnrollmentFilters {
  termId?: string
  courseId?: string
  sectionId?: string
  status?: 'enrolled' | 'waitlisted' | 'dropped' | 'completed' | 'pending' | 'all'
  search?: string
  page?: number
  pageSize?: number
}

export interface Enrollment {
  id: string
  student_id: string
  class_id: string
  status: 'enrolled' | 'waitlisted' | 'dropped' | 'completed' | 'pending'
  enrolled_at: string
  dropped_at: string | null
  final_grade: number | null
  student?: {
    id: string
    student_number: string
    full_name: string
    program: string
    year_level: number
  }
  class?: {
    id: string
    section: string
    course: {
      id: string
      code: string
      title: string
      units: number
    }
    term: {
      id: string
      code: string
      label: string
    }
    professor: {
      id: string
      full_name: string
    }
  }
}

export interface BulkEnrollResult {
  total: number
  successful: number
  failed: number
  errors: Array<{ row: number; student_id: string; error: string }>
  warnings: Array<{ row: number; student_id: string; warning: string }>
}

export function useEnrollments(filters: EnrollmentFilters = {}) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['enrollments', filters],
    queryFn: async () => {
      let query = supabase
        .from('enrollments')
        .select(`
          *,
          student:students(id, student_number, full_name, program, year_level),
          class:classes(
            id, section,
            course:courses(id, code, title, units),
            term:terms(id, code, label),
            professor:profiles!classes_professor_id_fkey(id, full_name)
          )
        `)
        .order('enrolled_at', { ascending: false })

      if (filters.termId) {
        query = query.eq('class.term_id', filters.termId)
      }
      if (filters.courseId) {
        query = query.eq('class.course_id', filters.courseId)
      }
      if (filters.sectionId) {
        query = query.eq('class_id', filters.sectionId)
      }
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }
      if (filters.search) {
        query = query.or(`student.full_name.ilike.%${filters.search}%,student.student_number.ilike.%${filters.search}%`)
      }

      const page = filters.page || 1
      const pageSize = filters.pageSize || 50
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      query = query.range(from, to)

      const { data, error, count } = await query
      if (error) throw error

      return { data: data || [], count: count || 0 }
    },
  })

  const bulkEnrollMutation = useMutation({
    mutationFn: async ({ csvData, termId, options }: { csvData: string; termId: string; options?: any }) => {
      const { data, error } = await supabase.functions.invoke('bulk_enrollment_import', {
        body: { csvData, termId, options },
      })
      if (error) throw error
      return data as BulkEnrollResult
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] })
    },
  })

  const dropStudentMutation = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { error } = await supabase
        .from('enrollments')
        .update({ status: 'dropped', dropped_at: new Date().toISOString() })
        .eq('id', enrollmentId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] })
    },
  })

  const promoteWaitlistMutation = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { error } = await supabase
        .from('enrollments')
        .update({ status: 'enrolled', enrolled_at: new Date().toISOString() })
        .eq('id', enrollmentId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] })
    },
  })

  return {
    ...query,
    bulkEnroll: bulkEnrollMutation.mutateAsync,
    dropStudent: dropStudentMutation.mutateAsync,
    promoteWaitlist: promoteWaitlistMutation.mutateAsync,
    isBulkEnrolling: bulkEnrollMutation.isPending,
    isDropping: dropStudentMutation.isPending,
    isPromoting: promoteWaitlistMutation.isPending,
  }
}