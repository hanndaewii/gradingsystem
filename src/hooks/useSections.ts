import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface Section {
  id: string
  course_id: string
  term_id: string
  professor_id: string
  section: string
  schedule: any | null
  max_students: number
  status: 'active' | 'cancelled' | 'completed'
  created_at: string
  course?: {
    id: string
    code: string
    title: string
    units: number
  }
  term?: {
    id: string
    code: string
    label: string
  }
  professor?: {
    id: string
    full_name: string
    college_email: string
  }
  _count?: {
    enrollments: number
    waitlisted: number
  }
}

export interface SectionFormData {
  course_id: string
  term_id: string
  professor_id: string
  section: string
  schedule?: any
  max_students?: number
  status?: 'active' | 'cancelled' | 'completed'
}

export function useSections(filters?: { termId?: string; courseId?: string; professorId?: string; status?: string }) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['sections', filters],
    queryFn: async () => {
      let query = supabase
        .from('classes')
        .select(`
          *,
          course:courses(id, code, title, units),
          term:terms(id, code, label),
          professor:profiles!classes_professor_id_fkey(id, full_name, college_email),
          _count:enrollments(count)
        `)
        .order('section')

      if (filters?.termId) query = query.eq('term_id', filters.termId)
      if (filters?.courseId) query = query.eq('course_id', filters.courseId)
      if (filters?.professorId) query = query.eq('professor_id', filters.professorId)
      if (filters?.status) query = query.eq('status', filters.status)

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
  })

  const createMutation = useMutation({
    mutationFn: async (section: SectionFormData) => {
      const { data, error } = await supabase.from('classes').insert(section).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sections'] }),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...section }: SectionFormData & { id: string }) => {
      const { data, error } = await supabase.from('classes').update(section).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sections'] }),
  })

  const assignProfessorMutation = useMutation({
    mutationFn: async ({ classId, professorId }: { classId: string; professorId: string }) => {
      const { error } = await supabase.from('classes').update({ professor_id: professorId }).eq('id', classId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sections'] }),
  })

  const setCapacityMutation = useMutation({
    mutationFn: async ({ classId, capacity }: { classId: string; capacity: number }) => {
      const { error } = await supabase.from('classes').update({ max_students: capacity }).eq('id', classId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sections'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('classes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sections'] }),
  })

  return {
    ...query,
    createSection: createMutation.mutateAsync,
    updateSection: updateMutation.mutateAsync,
    assignProfessor: assignProfessorMutation.mutateAsync,
    setCapacity: setCapacityMutation.mutateAsync,
    deleteSection: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isAssigning: assignProfessorMutation.isPending,
    isSettingCapacity: setCapacityMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}