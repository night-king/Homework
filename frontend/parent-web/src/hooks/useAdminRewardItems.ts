import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { listAllRewardItems, createRewardItem, updateRewardItem, deleteRewardItem, uploadRewardItemIcon } from '@/services/homeworkService'
import { getErrorMessage } from '@/services/api'
import type { CreateUpdateRewardItemDto } from '@/types/homework'

export const adminRewardItemsKey = ['admin', 'reward-items']
export const useAdminRewardItems = () => useQuery({ queryKey: adminRewardItemsKey, queryFn: listAllRewardItems })

export function useRewardItemMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: adminRewardItemsKey })
  const onErr = (e: unknown) => toast.error(getErrorMessage(e))
  return {
    create: useMutation({ mutationFn: (d: CreateUpdateRewardItemDto) => createRewardItem(d), onSuccess: () => { void invalidate(); toast.success('已创建') }, onError: onErr }),
    update: useMutation({ mutationFn: (a: { id: string; dto: CreateUpdateRewardItemDto }) => updateRewardItem(a.id, a.dto), onSuccess: () => { void invalidate(); toast.success('已保存') }, onError: onErr }),
    remove: useMutation({ mutationFn: (id: string) => deleteRewardItem(id), onSuccess: () => { void invalidate(); toast.success('已删除') }, onError: onErr }),
    uploadIcon: useMutation({ mutationFn: (a: { id: string; file: File }) => uploadRewardItemIcon(a.id, a.file), onSuccess: () => { void invalidate(); toast.success('已上传') }, onError: onErr }),
  }
}
