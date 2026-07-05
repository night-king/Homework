import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { listChildren, createChild, updateChild, deleteChild, setChildPin } from '@/services/homeworkService'
import { getErrorMessage } from '@/services/api'
import type { CreateChildDto, UpdateChildProfileDto, SetChildPinDto } from '@/types/homework'

const KEY = ['children']
export const useChildren = () => useQuery({ queryKey: KEY, queryFn: listChildren })

export function useChildMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY })
  const onErr = (e: unknown) => toast.error(getErrorMessage(e))
  return {
    create: useMutation({ mutationFn: (d: CreateChildDto) => createChild(d), onSuccess: () => { void invalidate(); toast.success('已添加') }, onError: onErr }),
    update: useMutation({ mutationFn: (a: { id: string; dto: UpdateChildProfileDto }) => updateChild(a.id, a.dto), onSuccess: () => { void invalidate(); toast.success('已保存') }, onError: onErr }),
    remove: useMutation({ mutationFn: (id: string) => deleteChild(id), onSuccess: () => { void invalidate(); toast.success('已删除') }, onError: onErr }),
    setPin: useMutation({ mutationFn: (a: { id: string; dto: SetChildPinDto }) => setChildPin(a.id, a.dto), onSuccess: () => { void invalidate(); toast.success('PIN 已更新') }, onError: onErr }),
  }
}
