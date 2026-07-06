import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getDailyBoard,
  createDailyTask,
  updateDailyTask,
  deleteDailyTask,
  revokeDailyTask,
  restoreDailyTask,
} from '@/services/homeworkService'
import { getErrorMessage } from '@/services/api'
import type { CreateDailyTaskDto, UpdateDailyTaskDto } from '@/types/homework'

const boardKey = (childId: string, date: string) => ['board', childId, date]

export const useDailyBoard = (childId: string, date: string) =>
  useQuery({
    queryKey: boardKey(childId, date),
    queryFn: () => getDailyBoard({ childId, date }),
    enabled: !!childId,
  })

export function useBoardMutations(childId: string, date: string) {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: boardKey(childId, date) })
  const onErr = (e: unknown) => toast.error(getErrorMessage(e))
  return {
    create: useMutation({
      mutationFn: (d: CreateDailyTaskDto) => createDailyTask(d),
      onSuccess: () => { void invalidate(); toast.success('已添加') },
      onError: onErr,
    }),
    update: useMutation({
      mutationFn: (a: { id: string; dto: UpdateDailyTaskDto }) => updateDailyTask(a.id, a.dto),
      onSuccess: () => { void invalidate(); toast.success('已保存') },
      onError: onErr,
    }),
    remove: useMutation({
      mutationFn: (id: string) => deleteDailyTask(id),
      onSuccess: () => { void invalidate(); toast.success('已删除') },
      onError: onErr,
    }),
    revoke: useMutation({
      mutationFn: (id: string) => revokeDailyTask(id),
      onSuccess: () => { void invalidate(); toast.success('已撤销') },
      onError: onErr,
    }),
    restore: useMutation({
      mutationFn: (id: string) => restoreDailyTask(id),
      onSuccess: () => { void invalidate(); toast.success('已恢复') },
      onError: onErr,
    }),
  }
}
