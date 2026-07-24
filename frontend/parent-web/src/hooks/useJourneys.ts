import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  listJourneys, getJourney, deleteJourney,
  listSharedJourneys, getSharedJourney, createSharedJourney, updateSharedJourney, deleteSharedJourney,
  addParticipants, removeParticipant,
} from '@/services/homeworkService'
import { getErrorMessage } from '@/services/api'
import type { CreateUpdateSharedJourneyDto } from '@/types/homework'

// ---- per-child journeys（只读；孩子端游玩 + 家长删除单份旅程用）----
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
    remove: useMutation({ mutationFn: (id: string) => deleteJourney(id), onSuccess: () => { void invalidate(); toast.success('已删除') }, onError: onErr }),
  }
}

// ---- shared journeys（家长端共享计划 CRUD + 参与者）----
export const sharedJourneysKey = ['shared-journeys']

export const useSharedJourneys = () =>
  useQuery({ queryKey: sharedJourneysKey, queryFn: listSharedJourneys })

export const useSharedJourney = (id: string) =>
  useQuery({ queryKey: ['shared-journey', id], queryFn: () => getSharedJourney(id), enabled: !!id })

export function useSharedJourneyMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: sharedJourneysKey })
  const onErr = (e: unknown) => toast.error(getErrorMessage(e))
  return {
    create: useMutation({ mutationFn: (d: CreateUpdateSharedJourneyDto) => createSharedJourney(d), onSuccess: () => { void invalidate(); toast.success('已创建') }, onError: onErr }),
    update: useMutation({ mutationFn: (a: { id: string; dto: CreateUpdateSharedJourneyDto }) => updateSharedJourney(a.id, a.dto), onSuccess: () => { void invalidate(); toast.success('已保存') }, onError: onErr }),
    remove: useMutation({ mutationFn: (id: string) => deleteSharedJourney(id), onSuccess: () => { void invalidate(); toast.success('已删除') }, onError: onErr }),
  }
}

// ---- 参与者管理（加入/移出）----
export function useParticipantMutations(sharedJourneyId: string) {
  const qc = useQueryClient()
  // 加入/移出会新建或删除孩子名下的 Draft 旅程 → 让相关 per-child journeys 失效
  const invalidate = () => qc.invalidateQueries({ queryKey: ['journeys'] })
  const onErr = (e: unknown) => toast.error(getErrorMessage(e))
  return {
    add: useMutation({
      mutationFn: (childIds: string[]) => addParticipants({ sharedJourneyId, childIds }),
      onSuccess: () => { void invalidate(); toast.success('已加入') },
      onError: onErr,
    }),
    remove: useMutation({
      mutationFn: (childId: string) => removeParticipant(sharedJourneyId, childId),
      onSuccess: () => { void invalidate(); toast.success('已移出') },
      onError: onErr,
    }),
  }
}
