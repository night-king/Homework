import { useQuery } from '@tanstack/react-query'
import { listActiveRewardItems, listActiveMedals, listActivePetSpecies } from '@/services/homeworkService'

const STALE = 5 * 60 * 1000

export const useActiveRewardItems = () =>
  useQuery({ queryKey: ['catalog', 'reward-items'], queryFn: listActiveRewardItems, staleTime: STALE })
export const useActiveMedals = () =>
  useQuery({ queryKey: ['catalog', 'medals'], queryFn: listActiveMedals, staleTime: STALE })
export const useActivePetSpecies = () =>
  useQuery({ queryKey: ['catalog', 'pet-species'], queryFn: listActivePetSpecies, staleTime: STALE })
