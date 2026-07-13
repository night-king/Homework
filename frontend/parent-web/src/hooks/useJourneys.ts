import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { listJourneys, getJourney, createJourney, updateJourney, deleteJourney } from '@/services/homeworkService'
import { getErrorMessage } from '@/services/api'
import type { CreateJourneyDto, UpdateJourneyDto } from '@/types/homework'

export const journeysKey = (childId: string) => ['journeys', childId]

export const useJourneys = (childId: string) =>
  useQuery({ queryKey: journeysKey(childId), queryFn: () => listJourneys(childId), enabled: !!childId })

export const useJourney = (id: string) =>
  useQuery({ queryKey: ['journey', id], queryFn: () => getJourney(id), enabled: !!id })

export function useJourneyMutations(childId: string) {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: journeysKey(childId) })
  const onErr = (e: unknown) => toast.error(getErrorMessage(e))
  return {
    create: useMutation({ mutationFn: (d: CreateJourneyDto) => createJourney(d), onSuccess: () => { void invalidate(); toast.success('已创建') }, onError: onErr }),
    update: useMutation({ mutationFn: (a: { id: string; dto: UpdateJourneyDto }) => updateJourney(a.id, a.dto), onSuccess: () => { void invalidate(); toast.success('已保存') }, onError: onErr }),
    remove: useMutation({ mutationFn: (id: string) => deleteJourney(id), onSuccess: () => { void invalidate(); toast.success('已删除') }, onError: onErr }),
  }
}
