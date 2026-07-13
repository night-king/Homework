import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  listAllPetSpecies, getPetSpecies, createPetSpecies, updatePetSpecies, deletePetSpecies,
  setPetForm, uploadPetCover, uploadPetFormSprite, uploadPetFormEvolveVideo, activatePetSpecies, deactivatePetSpecies,
} from '@/services/homeworkService'
import { getErrorMessage } from '@/services/api'
import type { CreateUpdatePetSpeciesDto, SetPetFormDto } from '@/types/homework'

export const adminPetSpeciesKey = ['admin', 'pet-species']
export const petSpeciesKey = (id: string) => ['admin', 'pet-species', id]

export const useAdminPetSpecies = () => useQuery({ queryKey: adminPetSpeciesKey, queryFn: listAllPetSpecies })
export const usePetSpecies = (id: string) => useQuery({ queryKey: petSpeciesKey(id), queryFn: () => getPetSpecies(id), enabled: !!id })

export function usePetSpeciesMutations(id?: string) {
  const qc = useQueryClient()
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: adminPetSpeciesKey })
    if (id) void qc.invalidateQueries({ queryKey: petSpeciesKey(id) })
  }
  const onErr = (e: unknown) => toast.error(getErrorMessage(e))
  const ok = (msg: string) => () => { invalidate(); toast.success(msg) }
  return {
    create: useMutation({ mutationFn: (d: CreateUpdatePetSpeciesDto) => createPetSpecies(d), onSuccess: ok('已创建'), onError: onErr }),
    update: useMutation({ mutationFn: (a: { id: string; dto: CreateUpdatePetSpeciesDto }) => updatePetSpecies(a.id, a.dto), onSuccess: ok('已保存'), onError: onErr }),
    remove: useMutation({ mutationFn: (rid: string) => deletePetSpecies(rid), onSuccess: ok('已删除'), onError: onErr }),
    setForm: useMutation({ mutationFn: (a: { id: string; dto: SetPetFormDto }) => setPetForm(a.id, a.dto), onSuccess: ok('形态已保存'), onError: onErr }),
    uploadCover: useMutation({ mutationFn: (a: { id: string; file: File }) => uploadPetCover(a.id, a.file), onSuccess: ok('封面已上传'), onError: onErr }),
    uploadSprite: useMutation({ mutationFn: (a: { id: string; level: number; file: File }) => uploadPetFormSprite(a.id, a.level, a.file), onSuccess: ok('精灵图已上传'), onError: onErr }),
    uploadEvolveVideo: useMutation({ mutationFn: (a: { id: string; level: number; file: File }) => uploadPetFormEvolveVideo(a.id, a.level, a.file), onSuccess: ok('进化视频已上传'), onError: onErr }),
    activate: useMutation({ mutationFn: (rid: string) => activatePetSpecies(rid), onSuccess: ok('已启用'), onError: onErr }),
    deactivate: useMutation({ mutationFn: (rid: string) => deactivatePetSpecies(rid), onSuccess: ok('已停用'), onError: onErr }),
  }
}
