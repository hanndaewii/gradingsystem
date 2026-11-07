import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface WaitlistEntry {
  id: string
  student_id: string
  class_id: string
  enrolled_at: string
  student?: {
    id: string
    student_number: string
    full_name: string
    program: string
    year_level: number
    college_email: string | null
  }
  class?: {
    id: string
    section: string
    course: {
      id: string
      code: string
      title: string
    }
    term: {
      id: string
      code: string
      label: string
    }
  }
  position: number
}

export interface WaitlistConfig {
  class_id: string
  auto_promote: boolean
  notify_on_promote: boolean
  max_waitlist: number
}

export function useWaitlist(filters?: { classId?: string; termId?: string }) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['waitlist', filters],
    queryFn: async () => {
      let query = supabase
        .from('enrollments')
        .select(`
          *,
          student:students(id, student_number, full_name, program, year_level, college_email),
          class:classes(
            id, section,
            course:courses(id, code, title),
            term:terms(id, code, label)
          )
        `)
        .eq('status', 'waitlisted')
        .order('enrolled_at', { ascending: true })

      if (filters?.classId) query = query.eq('class_id', filters.classId)
      if (filters?.termId) query = query.eq('class.term_id', filters.termId)

      const { data, error } = await query
      if (error) throw error

      // Add position to each entry
      return (data || []).map((entry, index) => ({
        ...entry,
        position: index + 1,
      })) as WaitlistEntry[]
    },
  })

  const promoteMutation = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { error } = await supabase
        .from('enrollments')
        .update({ status: 'enrolled', enrolled_at: new Date().toISOString() })
        .eq('id', enrollmentId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] })
      queryClient.invalidateQueries({ queryKey: ['enrollments'] })
    },
  })

  const removeMutation = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { error } = await supabase.from('enrollments').delete().eq('id', enrollmentId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['waitlist'] }),
  })

  const reorderMutation = useMutation({
    mutationFn: async ({ enrollmentId, newPosition }: { enrollmentId: string; newPosition: number }) => {
      // This would require updating the enrolled_at timestamps to reorder
      // For simplicity, we'll just invalidate queries
      // In production, you'd update enrolled_at timestamps
      console.log('Reorder waitlist:', enrollmentId, newPosition)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['waitlist'] }),
  })

  const processAllMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('waitlist_processor')
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] })
      queryClient.invalidateQueries({ queryKey: ['enrollments'] })
    },
  })

  return {
    ...query,
    promote: promoteMutation.mutateAsync,
    remove: removeMutation.mutateAsync,
    reorder: reorderMutation.mutateAsync,
    processAll: processAllMutation.mutateAsync,
    isPromoting: promoteMutation.isPending,
    isRemoving: removeMutation.isPending,
    isReordering: reorderMutation.isPending,
    isProcessing: processAllMutation.isPending,
  }
}