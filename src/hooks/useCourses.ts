import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface Course {
  id: string
  code: string
  title: string
  description: string | null
  units: number
  department: string
  prerequisites: string[] | null
  created_at: string
  _count?: {
    sections: number
    enrollments: number
  }
}

export interface CourseFormData {
  code: string
  title: string
  description?: string
  units: number
  department: string
  prerequisites?: string[]
}

export function useCourses(filters?: { department?: string; status?: string; search?: string }) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['courses', filters],
    queryFn: async () => {
      let query = supabase
        .from('courses')
        .select(`
          *,
          _count:classes(count)
        `)
        .order('code')

      if (filters?.department) {
        query = query.eq('department', filters.department)
      }
      if (filters?.search) {
        query = query.or(`code.ilike.%${filters.search}%,title.ilike.%${filters.search}%`)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
  })

  const createMutation = useMutation({
    mutationFn: async (course: CourseFormData) => {
      const { data, error } = await supabase.from('courses').insert(course).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses'] }),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...course }: CourseFormData & { id: string }) => {
      const { data, error } = await supabase.from('courses').update(course).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('courses').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses'] }),
  })

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      // Soft delete by setting a status field or moving to archive table
      const { error } = await supabase.from('courses').update({ description: '[ARCHIVED] ' + (await supabase.from('courses').select('description').eq('id', id).single()).data?.description || '' }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses'] }),
  })

  const cloneMutation = useMutation({
    mutationFn: async ({ id, termId }: { id: string; termId: string }) => {
      const { data: course } = await supabase.from('courses').select('*').eq('id', id).single()
      if (!course) throw new Error('Course not found')

      const { data, error } = await supabase.from('courses').insert({
        code: `${course.code}-${new Date().getFullYear()}`,
        title: course.title,
        description: course.description,
        units: course.units,
        department: course.department,
        prerequisites: course.prerequisites,
      }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses'] }),
  })

  return {
    ...query,
    createCourse: createMutation.mutateAsync,
    updateCourse: updateMutation.mutateAsync,
    deleteCourse: deleteMutation.mutateAsync,
    archiveCourse: archiveMutation.mutateAsync,
    cloneCourse: cloneMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isArchiving: archiveMutation.isPending,
    isCloning: cloneMutation.isPending,
  }
}