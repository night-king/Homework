import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { listJourneyTemplates, createJourneyTemplate, updateJourneyTemplate, deleteJourneyTemplate } from '@/services/homeworkService'
import { getErrorMessage } from '@/services/api'
import type { CreateJourneyTaskTemplateItemDto, UpdateJourneyTaskTemplateItemDto } from '@/types/homework'

export const journeyTemplatesKey = (journeyId: string) => ['journey-templates', journeyId]

export const useJourneyTemplates = (journeyId: string) =>
  useQuery({ queryKey: journeyTemplatesKey(journeyId), queryFn: () => listJourneyTemplates({ journeyId }), enabled: !!journeyId })

export function useJourneyTemplateMutations(journeyId: string) {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: journeyTemplatesKey(journeyId) })
  const onErr = (e: unknown) => toast.error(getErrorMessage(e))
  return {
    create: useMutation({
      mutationFn: (d: CreateJourneyTaskTemplateItemDto) => createJourneyTemplate(d),
      onSuccess: () => { void invalidate(); toast.success('已添加') },
      onError: onErr,
    }),
    update: useMutation({
      mutationFn: (a: { id: string; dto: UpdateJourneyTaskTemplateItemDto }) =>
        updateJourneyTemplate(a.id, a.dto),
      onSuccess: () => { void invalidate(); toast.success('已保存') },
      onError: onErr,
    }),
    remove: useMutation({
      mutationFn: (id: string) => deleteJourneyTemplate(id),
      onSuccess: () => { void invalidate(); toast.success('已删除') },
      onError: onErr,
    }),
  }
}
