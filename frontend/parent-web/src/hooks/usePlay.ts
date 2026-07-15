import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getActiveJourney, getPlayDailyBoard, getBackpack, getCollection,
  startJourney, completeTask, uncompleteTask, feed,
} from '@/services/playService'
import { getErrorMessage } from '@/services/api'
import type { StartJourneyDto, FeedDto } from '@/types/homework'

export { useActivePetSpecies } from './useCatalog'
export { useJourneys as useChildJourneys } from './useJourneys'

export const activeJourneyKey = (childId: string) => ['play', 'active', childId]
export const playBoardKey = (childId: string, date: string) => ['play', 'board', childId, date]
export const backpackKey = (childId: string, journeyId: string) => ['play', 'backpack', childId, journeyId]
export const collectionKey = (childId: string) => ['play', 'collection', childId]

export const useActiveJourney = (childId: string) =>
  useQuery({ queryKey: activeJourneyKey(childId), queryFn: () => getActiveJourney(childId), enabled: !!childId })

export const usePlayBoard = (childId: string, date: string) =>
  useQuery({ queryKey: playBoardKey(childId, date), queryFn: () => getPlayDailyBoard({ childId, date }), enabled: !!childId && !!date })

export const useBackpack = (childId: string, journeyId: string, enabled = true) =>
  useQuery({ queryKey: backpackKey(childId, journeyId), queryFn: () => getBackpack(childId, journeyId), enabled: enabled && !!childId && !!journeyId })

export const useCollection = (childId: string) =>
  useQuery({ queryKey: collectionKey(childId), queryFn: () => getCollection(childId), enabled: !!childId })

export function usePlayMutations(childId: string, _journeyId?: string) {
  const qc = useQueryClient()
  const onErr = (e: unknown) => toast.error(getErrorMessage(e))
  const invalidateActive = () => qc.invalidateQueries({ queryKey: activeJourneyKey(childId) })
  const invalidateBoard = () => qc.invalidateQueries({ queryKey: ['play', 'board', childId] })
  const invalidateBackpack = () => qc.invalidateQueries({ queryKey: ['play', 'backpack', childId] })
  const invalidateCollection = () => qc.invalidateQueries({ queryKey: collectionKey(childId) })

  return {
    start: useMutation({
      mutationFn: (dto: StartJourneyDto) => startJourney(dto),
      onSuccess: () => { void invalidateActive() },
      onError: onErr,
    }),
    complete: useMutation({
      mutationFn: (taskId: string) => completeTask(childId, taskId),
      onSuccess: () => { void invalidateBoard(); void invalidateBackpack() },
      onError: onErr,
    }),
    uncomplete: useMutation({
      mutationFn: (taskId: string) => uncompleteTask(childId, taskId),
      onSuccess: () => { void invalidateBoard(); void invalidateBackpack() },
      onError: onErr,
    }),
    feed: useMutation({
      mutationFn: (dto: FeedDto) => feed(dto),
      // 满级会入收藏并发勋章，满级落地屏要立刻读到这条新记录
      onSuccess: () => { void invalidateActive(); void invalidateBackpack(); void invalidateCollection() },
      onError: onErr,
    }),
  }
}
