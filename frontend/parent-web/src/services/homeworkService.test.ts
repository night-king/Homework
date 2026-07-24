import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('./api', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }))
import { api } from './api'
import {
  listChildren, createChild, getDailyBoard, revokeDailyTask,
  listJourneys, deleteJourney,
  listSharedJourneys, getSharedJourney, createSharedJourney, updateSharedJourney, deleteSharedJourney,
  addParticipants, removeParticipant,
  listJourneyTemplates, createJourneyTemplate,
  listActiveRewardItems, listActiveMedals, listActivePetSpecies,
} from './homeworkService'
import {
  listAllRewardItems, createRewardItem, updateRewardItem, deleteRewardItem, uploadRewardItemIcon,
  listAllMedals, createMedal, uploadMedalImage,
  listAllPetSpecies, getPetSpecies, createPetSpecies, setPetForm,
  uploadPetCover, uploadPetFormSprite, uploadPetFormEvolveVideo, activatePetSpecies, deactivatePetSpecies,
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
  it('deleteJourney DELETEs /journey/{id}', async () => {
    await deleteJourney('j1'); expect(api.delete).toHaveBeenCalledWith('/api/app/journey/j1')
  })
  it('listSharedJourneys GETs /shared-journey and unwraps items', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { items: [{ id: 's1' }] } })
    expect(await listSharedJourneys()).toEqual([{ id: 's1' }])
    expect(api.get).toHaveBeenCalledWith('/api/app/shared-journey')
  })
  it('getSharedJourney GETs /shared-journey/{id}', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 's1' } })
    expect(await getSharedJourney('s1')).toEqual({ id: 's1' })
    expect(api.get).toHaveBeenCalledWith('/api/app/shared-journey/s1')
  })
  it('createSharedJourney POSTs dto and unwraps data', async () => {
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 's1' } })
    const dto = { title: '暑假', startDate: '2026-07-01', endDate: '2026-08-31', medalId: 'm1' }
    expect(await createSharedJourney(dto)).toEqual({ id: 's1' })
    expect(api.post).toHaveBeenCalledWith('/api/app/shared-journey', dto)
  })
  it('updateSharedJourney PUTs to /shared-journey/{id}', async () => {
    ;(api.put as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 's1' } })
    await updateSharedJourney('s1', { title: 't', startDate: '2026-07-01', endDate: '2026-07-02', medalId: 'm1' })
    expect(api.put).toHaveBeenCalledWith('/api/app/shared-journey/s1', { title: 't', startDate: '2026-07-01', endDate: '2026-07-02', medalId: 'm1' })
  })
  it('deleteSharedJourney DELETEs /shared-journey/{id}', async () => {
    await deleteSharedJourney('s1'); expect(api.delete).toHaveBeenCalledWith('/api/app/shared-journey/s1')
  })
  it('addParticipants POSTs dto to /add-participants', async () => {
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: undefined })
    const dto = { sharedJourneyId: 's1', childIds: ['c1', 'c2'] }
    await addParticipants(dto)
    expect(api.post).toHaveBeenCalledWith('/api/app/shared-journey/add-participants', dto)
  })
  it('removeParticipant POSTs to /remove-participant with query params', async () => {
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: undefined })
    await removeParticipant('s1', 'c1')
    expect(api.post).toHaveBeenCalledWith('/api/app/shared-journey/remove-participant', null, { params: { sharedJourneyId: 's1', childId: 'c1' } })
  })
  it('listJourneyTemplates GETs with input as params', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { items: [] } })
    await listJourneyTemplates({ sharedJourneyId: 'j1' })
    expect(api.get).toHaveBeenCalledWith('/api/app/journey-task-template', { params: { sharedJourneyId: 'j1' } })
  })
  it('createJourneyTemplate POSTs dto', async () => {
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 'tt1' } })
    const dto = { sharedJourneyId: 'j1', dayOfWeek: 1 as const, title: '背单词', order: 0, rewardIsRandom: true }
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
  it('listAllRewardItems GETs full list and unwraps items', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { items: [{ id: 'r1' }] } })
    expect(await listAllRewardItems()).toEqual([{ id: 'r1' }])
    expect(api.get).toHaveBeenCalledWith('/api/app/reward-item')
  })
  it('createRewardItem POSTs dto', async () => {
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 'r1' } })
    const dto = { name: '书签', glyph: '✦', growthValue: 12, randomWeight: 1, displayOrder: 0, isActive: true }
    await createRewardItem(dto)
    expect(api.post).toHaveBeenCalledWith('/api/app/reward-item', dto)
  })
  it('updateRewardItem PUTs and deleteRewardItem DELETEs', async () => {
    ;(api.put as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} })
    await updateRewardItem('r1', { name: 'x', growthValue: 12, randomWeight: 1, displayOrder: 0, isActive: false })
    expect(api.put).toHaveBeenCalledWith('/api/app/reward-item/r1', expect.objectContaining({ name: 'x' }))
    await deleteRewardItem('r1'); expect(api.delete).toHaveBeenCalledWith('/api/app/reward-item/r1')
  })
  it('uploadRewardItemIcon posts FormData with file field and undefined Content-Type', async () => {
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 'r1' } })
    const file = new File(['x'], 'i.png', { type: 'image/png' })
    await uploadRewardItemIcon('r1', file)
    const call = (api.post as ReturnType<typeof vi.fn>).mock.calls.at(-1)!
    expect(call[0]).toBe('/api/app/reward-item/r1/upload-icon')
    expect(call[1]).toBeInstanceOf(FormData)
    expect((call[1] as FormData).get('file')).toBe(file)
    expect(call[2].headers['Content-Type']).toBeUndefined()
  })
  it('listAllMedals GETs full list and unwraps items', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { items: [{ id: 'm1' }] } })
    expect(await listAllMedals()).toEqual([{ id: 'm1' }])
    expect(api.get).toHaveBeenCalledWith('/api/app/medal')
  })
  it('createMedal POSTs dto', async () => {
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 'm1' } })
    const dto = { name: '勤奋勋章', description: '连续七天全勤', displayOrder: 0, isActive: true }
    await createMedal(dto)
    expect(api.post).toHaveBeenCalledWith('/api/app/medal', dto)
  })
  it('uploadMedalImage targets /upload-image', async () => {
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} })
    await uploadMedalImage('m1', new File(['x'], 'm.png'))
    expect((api.post as ReturnType<typeof vi.fn>).mock.calls.at(-1)![0]).toBe('/api/app/medal/m1/upload-image')
  })
  it('pet-species admin: list/get/create/setForm/uploads/activate paths', async () => {
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { items: [], id: 'p1' } })
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 'p1' } })
    await listAllPetSpecies(); expect(api.get).toHaveBeenCalledWith('/api/app/pet-species')
    await getPetSpecies('p1'); expect(api.get).toHaveBeenCalledWith('/api/app/pet-species/p1')
    await createPetSpecies({ name: '火龙', code: 'dragon', displayOrder: 0 })
    expect(api.post).toHaveBeenCalledWith('/api/app/pet-species', expect.objectContaining({ code: 'dragon' }))
    await setPetForm('p1', { level: 2, name: '幼龙' })
    expect(api.post).toHaveBeenCalledWith('/api/app/pet-species/p1/set-form', expect.objectContaining({ level: 2 }))
    await uploadPetFormSprite('p1', 3, new File(['x'], 's.png'))
    expect((api.post as ReturnType<typeof vi.fn>).mock.calls.at(-1)![0]).toBe('/api/app/pet-species/p1/upload-form-sprite?level=3')
    await uploadPetFormEvolveVideo('p1', 1, new File(['x'], 'v.mp4'))
    expect((api.post as ReturnType<typeof vi.fn>).mock.calls.at(-1)![0]).toBe('/api/app/pet-species/p1/upload-form-evolve-video?level=1')
    await uploadPetCover('p1', new File(['x'], 'c.png'))
    expect((api.post as ReturnType<typeof vi.fn>).mock.calls.at(-1)![0]).toBe('/api/app/pet-species/p1/upload-cover')
    await activatePetSpecies('p1'); expect(api.post).toHaveBeenCalledWith('/api/app/pet-species/p1/activate')
    await deactivatePetSpecies('p1'); expect(api.post).toHaveBeenCalledWith('/api/app/pet-species/p1/deactivate')
  })
})
