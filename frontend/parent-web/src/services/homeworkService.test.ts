import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('./api', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }))
import { api } from './api'
import {
  listChildren, createChild, getDailyBoard, revokeDailyTask,
  listJourneys, createJourney, updateJourney, deleteJourney,
  listJourneyTemplates, createJourneyTemplate,
  listActiveRewardItems, listActiveMedals, listActivePetSpecies,
} from './homeworkService'

beforeEach(() => vi.clearAllMocks())
describe('homeworkService', () => {
  it('listChildren unwraps items', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { items: [{ id: '1' }] } })
    expect(await listChildren()).toEqual([{ id: '1' }])
    expect(api.get).toHaveBeenCalledWith('/api/app/child-profile')
  })
  it('createChild posts dto', async () => {
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 'x' } })
    await createChild({ displayName: '哥哥', grade: 3 })
    expect(api.post).toHaveBeenCalledWith('/api/app/child-profile', { displayName: '哥哥', grade: 3 })
  })
  it('getDailyBoard GETs /board with query params', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { stars: 3 } })
    await getDailyBoard({ childId: 'c', date: '2026-07-05' })
    expect(api.get).toHaveBeenCalledWith('/api/app/daily-task/board', { params: { childId: 'c', date: '2026-07-05' } })
  })
  it('revokeDailyTask posts to /{id}/revoke', async () => {
    await revokeDailyTask('t1'); expect(api.post).toHaveBeenCalledWith('/api/app/daily-task/t1/revoke')
  })
  it('listJourneys GETs /journey with childId query and unwraps items', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { items: [{ id: 'j1' }] } })
    expect(await listJourneys('c1')).toEqual([{ id: 'j1' }])
    expect(api.get).toHaveBeenCalledWith('/api/app/journey', { params: { childId: 'c1' } })
  })
  it('createJourney POSTs dto and unwraps data', async () => {
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 'j1' } })
    const dto = { childId: 'c1', title: '暑假', startDate: '2026-07-01', endDate: '2026-08-31', medalId: 'm1' }
    expect(await createJourney(dto)).toEqual({ id: 'j1' })
    expect(api.post).toHaveBeenCalledWith('/api/app/journey', dto)
  })
  it('updateJourney PUTs to /journey/{id}', async () => {
    ;(api.put as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 'j1' } })
    await updateJourney('j1', { title: 't', startDate: '2026-07-01', endDate: '2026-07-02', medalId: 'm1' })
    expect(api.put).toHaveBeenCalledWith('/api/app/journey/j1', { title: 't', startDate: '2026-07-01', endDate: '2026-07-02', medalId: 'm1' })
  })
  it('deleteJourney DELETEs /journey/{id}', async () => {
    await deleteJourney('j1'); expect(api.delete).toHaveBeenCalledWith('/api/app/journey/j1')
  })
  it('listJourneyTemplates GETs with input as params', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { items: [] } })
    await listJourneyTemplates({ journeyId: 'j1' })
    expect(api.get).toHaveBeenCalledWith('/api/app/journey-task-template', { params: { journeyId: 'j1' } })
  })
  it('createJourneyTemplate POSTs dto', async () => {
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 'tt1' } })
    const dto = { journeyId: 'j1', dayOfWeek: 1 as const, title: '背单词', order: 0, rewardIsRandom: true }
    await createJourneyTemplate(dto)
    expect(api.post).toHaveBeenCalledWith('/api/app/journey-task-template', dto)
  })
  it('catalog active-lists GET the right paths and unwrap items', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { items: [{ id: 'x' }] } })
    expect(await listActiveRewardItems()).toEqual([{ id: 'x' }])
    expect(api.get).toHaveBeenCalledWith('/api/app/reward-item/active-list')
    await listActiveMedals(); expect(api.get).toHaveBeenCalledWith('/api/app/medal/active-list')
    await listActivePetSpecies(); expect(api.get).toHaveBeenCalledWith('/api/app/pet-species/active-list')
  })
})
