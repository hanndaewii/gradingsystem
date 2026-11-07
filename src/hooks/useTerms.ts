import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface Term {
  id: string
  code: string
  label: string
  starts_at: string
  ends_at: string
  registration_start: string
  registration_end: string
  grading_scale: Record<string, [number, number]>
  is_active: boolean
  created_at: string
}

export interface TermFormData {
  code: string
  label: string
  starts_at: string
  ends_at: string
  registration_start: string
  registration_end: string
  grading_scale: Record<string, [number, number]>
  is_active?: boolean
}

export interface GradingScale {
  [grade: string]: [number, number]
}

export function useTerms() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['terms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('terms')
        .select('*')
        .order('starts_at', { ascending: false })
      if (error) throw error
      return data || []
    },
  })

  const createMutation = useMutation({
    mutationFn: async (term: TermFormData) => {
      const { data, error } = await supabase.from('terms').insert(term).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['terms'] }),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...term }: TermFormData & { id: string }) => {
      const { data, error } = await supabase.from('terms').update(term).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['terms'] }),
  })

  const setActiveMutation = useMutation({
    mutationFn: async (termId: string) => {
      // Deactivate all other terms
      await supabase.from('terms').update({ is_active: false }).neq('id', termId)
      // Activate selected term
      const { error } = await supabase.from('terms').update({ is_active: true }).eq('id', termId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['terms'] }),
  })

  const updateGradingScaleMutation = useMutation({
    mutationFn: async ({ termId, gradingScale }: { termId: string; gradingScale: GradingScale }) => {
      const { error } = await supabase.from('terms').update({ grading_scale: gradingScale }).eq('id', termId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['terms'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('terms').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['terms'] }),
  })

  return {
    ...query,
    createTerm: createMutation.mutateAsync,
    updateTerm: updateMutation.mutateAsync,
    setActiveTerm: setActiveMutation.mutateAsync,
    updateGradingScale: updateGradingScaleMutation.mutateAsync,
    deleteTerm: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isSettingActive: setActiveMutation.isPending,
    isUpdatingScale: updateGradingScaleMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}