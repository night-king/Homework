import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { listGoals, createGoal, updateGoal, deleteGoal } from '@/services/homeworkService'
import { getErrorMessage } from '@/services/api'
import type { CreateUpdateFamilyGoalDto } from '@/types/homework'

const KEY = ['goals']

export const useGoals = () => useQuery({ queryKey: KEY, queryFn: listGoals })

export function useGoalMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY })
  const onErr = (e: unknown) => toast.error(getErrorMessage(e))
  return {
    create: useMutation({
      mutationFn: (dto: CreateUpdateFamilyGoalDto) => createGoal(dto),
      onSuccess: () => { void invalidate(); toast.success('已添加') },
      onError: onErr,
    }),
    update: useMutation({
      mutationFn: (a: { id: string; dto: CreateUpdateFamilyGoalDto }) => updateGoal(a.id, a.dto),
      onSuccess: () => { void invalidate(); toast.success('已保存') },
      onError: onErr,
    }),
    remove: useMutation({
      mutationFn: (id: string) => deleteGoal(id),
      onSuccess: () => { void invalidate(); toast.success('已删除') },
      onError: onErr,
    }),
  }
}
