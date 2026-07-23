import { useQuery } from '@tanstack/react-query'
import { getWeeklyPk } from '@/services/homeworkService'

export const useWeeklyPk = () =>
  useQuery({ queryKey: ['pk', 'weekly'], queryFn: getWeeklyPk })
