import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getActiveJourney, getPlayDailyBoard, getBackpack, getCollection,
  startJourney, completeTask, uncompleteTask, feed,
} from '@/services/playService'
import { listActivePetSpecies, listJourneys } from '@/services/homeworkService'
import { getErrorMessage } from '@/services/api'
import type { StartJourneyDto, FeedDto } from '@/types/homework'

export const activeJourneyKey = (childId: string) => ['play', 'active', childId]
export const playBoardKey = (childId: string, date: string) => ['play', 'board', childId, date]
export const backpackKey = (childId: string, journeyId: string) => ['play', 'backpack', childId, journeyId]
export const collectionKey = (childId: string) => ['play', 'collection', childId]
export const childJourneysKey = (childId: string) => ['play', 'journeys', childId]
export const activePetSpeciesKey = ['play', 'pet-species', 'active']

export const useActiveJourney = (childId: string) =>
  useQuery({ queryKey: activeJourneyKey(childId), queryFn: () => getActiveJourney(childId), enabled: !!childId })

export const usePlayBoard = (childId: string, date: string) =>
  useQuery({ queryKey: playBoardKey(childId, date), queryFn: () => getPlayDailyBoard({ childId, date }), enabled: !!childId && !!date })

export const useBackpack = (childId: string, journeyId: string, enabled = true) =>
  useQuery({ queryKey: backpackKey(childId, journeyId), queryFn: () => getBackpack(childId, journeyId), enabled: enabled && !!childId && !!journeyId })

export const useCollection = (childId: string) =>
  useQuery({ queryKey: collectionKey(childId), queryFn: () => getCollection(childId), enabled: !!childId })

export const useChildJourneys = (childId: string) =>
  useQuery({ queryKey: childJourneysKey(childId), queryFn: () => listJourneys(childId), enabled: !!childId })

export const useActivePetSpecies = () =>
  useQuery({ queryKey: activePetSpeciesKey, queryFn: () => listActivePetSpecies(), staleTime: 5 * 60 * 1000 })

export function usePlayMutations(childId: string, journeyId?: string) {
  const qc = useQueryClient()
  const onErr = (e: unknown) => toast.error(getErrorMessage(e))
  const invalidateActive = () => qc.invalidateQueries({ queryKey: activeJourneyKey(childId) })
  const invalidateBoard = () => qc.invalidateQueries({ queryKey: ['play', 'board', childId] })
  const invalidateBackpack = () => journeyId && qc.invalidateQueries({ queryKey: backpackKey(childId, journeyId) })

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
      onSuccess: () => { void invalidateActive(); void invalidateBackpack() },
      onError: onErr,
    }),
  }
}
