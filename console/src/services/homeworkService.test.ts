import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('./api', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }))
import { api } from './api'
import { listChildren, createChild, getDailyBoard, revokeDailyTask } from './homeworkService'

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
})
