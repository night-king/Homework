import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { listAllMedals, createMedal, updateMedal, deleteMedal, uploadMedalImage } from '@/services/homeworkService'
import { getErrorMessage } from '@/services/api'
import type { CreateUpdateMedalDto } from '@/types/homework'

export const adminMedalsKey = ['admin', 'medals']
export const useAdminMedals = () => useQuery({ queryKey: adminMedalsKey, queryFn: listAllMedals })

export function useMedalMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: adminMedalsKey })
  const onErr = (e: unknown) => toast.error(getErrorMessage(e))
  return {
    create: useMutation({ mutationFn: (d: CreateUpdateMedalDto) => createMedal(d), onSuccess: () => { void invalidate(); toast.success('已创建') }, onError: onErr }),
    update: useMutation({ mutationFn: (a: { id: string; dto: CreateUpdateMedalDto }) => updateMedal(a.id, a.dto), onSuccess: () => { void invalidate(); toast.success('已保存') }, onError: onErr }),
    remove: useMutation({ mutationFn: (id: string) => deleteMedal(id), onSuccess: () => { void invalidate(); toast.success('已删除') }, onError: onErr }),
    uploadImage: useMutation({ mutationFn: (a: { id: string; file: File }) => uploadMedalImage(a.id, a.file), onSuccess: () => { void invalidate(); toast.success('已上传') }, onError: onErr }),
  }
}
