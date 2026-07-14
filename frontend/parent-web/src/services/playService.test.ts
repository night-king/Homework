import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api } from '@/services/api'
import * as play from './playService'

vi.mock('@/services/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }))
const mockApi = api as unknown as { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> }

beforeEach(() => vi.clearAllMocks())

describe('playService', () => {
  it('getActiveJourney → GET journey-play/active with childId, null passes through', async () => {
    mockApi.get.mockResolvedValue({ data: null })
    const r = await play.getActiveJourney('c1')
    expect(mockApi.get).toHaveBeenCalledWith('/api/app/journey-play/active', { params: { childId: 'c1' } })
    expect(r).toBeNull()
  })

  it('startJourney → POST journey-play/start with body', async () => {
    const dto = { childId: 'c1', journeyId: 'j1', petSpeciesId: 'p1' }
    mockApi.post.mockResolvedValue({ data: { id: 'j1' } })
    await play.startJourney(dto)
    expect(mockApi.post).toHaveBeenCalledWith('/api/app/journey-play/start', dto)
  })

  it('getPlayDailyBoard → GET journey-play/daily-board with childId+date', async () => {
    mockApi.get.mockResolvedValue({ data: { tasks: [] } })
    await play.getPlayDailyBoard({ childId: 'c1', date: '2026-07-14' })
    expect(mockApi.get).toHaveBeenCalledWith('/api/app/journey-play/daily-board', { params: { childId: 'c1', date: '2026-07-14' } })
  })

  it('getBackpack → GET journey-play/backpack, unwraps items', async () => {
    mockApi.get.mockResolvedValue({ data: { items: [{ rewardItemId: 'r1' }] } })
    const r = await play.getBackpack('c1', 'j1')
    expect(mockApi.get).toHaveBeenCalledWith('/api/app/journey-play/backpack', { params: { childId: 'c1', journeyId: 'j1' } })
    expect(r).toHaveLength(1)
  })

  it('getCollection → GET journey-play/collection, unwraps items', async () => {
    mockApi.get.mockResolvedValue({ data: { items: [] } })
    await play.getCollection('c1')
    expect(mockApi.get).toHaveBeenCalledWith('/api/app/journey-play/collection', { params: { childId: 'c1' } })
  })

  it('completeTask / uncompleteTask → POST with childId+taskId params', async () => {
    mockApi.post.mockResolvedValue({ data: { id: 't1' } })
    await play.completeTask('c1', 't1')
    expect(mockApi.post).toHaveBeenCalledWith('/api/app/journey-play/complete-task', null, { params: { childId: 'c1', taskId: 't1' } })
    await play.uncompleteTask('c1', 't1')
    expect(mockApi.post).toHaveBeenCalledWith('/api/app/journey-play/uncomplete-task', null, { params: { childId: 'c1', taskId: 't1' } })
  })

  it('feed → POST journey-play/feed with body', async () => {
    const dto = { childId: 'c1', journeyId: 'j1', rewardItemId: 'r1' }
    mockApi.post.mockResolvedValue({ data: { evolved: false } })
    await play.feed(dto)
    expect(mockApi.post).toHaveBeenCalledWith('/api/app/journey-play/feed', dto)
  })
})
