import { api } from './api'
import type {
  ListResult, ChildProfileDto, CreateChildDto, UpdateChildProfileDto, SetChildPinDto, VerifyChildPinDto,
  DailyTaskDto, CreateDailyTaskDto, UpdateDailyTaskDto, GetDailyBoardInput, DailyBoardDto,
  JourneyDto, CreateJourneyDto, UpdateJourneyDto,
  JourneyTaskTemplateItemDto, CreateJourneyTaskTemplateItemDto, UpdateJourneyTaskTemplateItemDto, GetJourneyTemplateInput,
  RewardItemDto, MedalDto, PetSpeciesDto,
  CreateUpdateRewardItemDto, CreateUpdateMedalDto, CreateUpdatePetSpeciesDto, SetPetFormDto,
  WeeklyPkResultDto,
} from '@/types/homework'

// ---- child-profile ----
export const listChildren = () => api.get<ListResult<ChildProfileDto>>('/api/app/child-profile').then((r) => r.data.items)
export const getChild = (id: string) => api.get<ChildProfileDto>(`/api/app/child-profile/${id}`).then((r) => r.data)
export const createChild = (dto: CreateChildDto) => api.post<ChildProfileDto>('/api/app/child-profile', dto).then((r) => r.data)
export const updateChild = (id: string, dto: UpdateChildProfileDto) => api.put<ChildProfileDto>(`/api/app/child-profile/${id}`, dto).then((r) => r.data)
export const deleteChild = (id: string) => api.delete(`/api/app/child-profile/${id}`)
export const setChildPin = (id: string, dto: SetChildPinDto) => api.post(`/api/app/child-profile/${id}/set-pin`, dto)
export const verifyChildPin = (id: string, dto: VerifyChildPinDto) =>
  api.post<boolean>(`/api/app/child-profile/${id}/verify-pin`, dto).then((r) => r.data)

// ---- daily-task ----
// ABP 约定路由：GetBoardAsync → GET /api/app/daily-task/board（"Get" 前缀映射成 GET，input 走 query）。不是 POST /get-board。
export const getDailyBoard = (input: GetDailyBoardInput) => api.get<DailyBoardDto>('/api/app/daily-task/board', { params: input }).then((r) => r.data)
export const createDailyTask = (dto: CreateDailyTaskDto) => api.post<DailyTaskDto>('/api/app/daily-task', dto).then((r) => r.data)
export const updateDailyTask = (id: string, dto: UpdateDailyTaskDto) => api.put<DailyTaskDto>(`/api/app/daily-task/${id}`, dto).then((r) => r.data)
export const deleteDailyTask = (id: string) => api.delete(`/api/app/daily-task/${id}`)
export const revokeDailyTask = (id: string) => api.post(`/api/app/daily-task/${id}/revoke`)
export const restoreDailyTask = (id: string) => api.post(`/api/app/daily-task/${id}/restore`)

// ---- journey ----
export const listJourneys = (childId: string) =>
  api.get<ListResult<JourneyDto>>('/api/app/journey', { params: { childId } }).then((r) => r.data.items)
export const getJourney = (id: string) => api.get<JourneyDto>(`/api/app/journey/${id}`).then((r) => r.data)
export const createJourney = (dto: CreateJourneyDto) => api.post<JourneyDto>('/api/app/journey', dto).then((r) => r.data)
export const updateJourney = (id: string, dto: UpdateJourneyDto) => api.put<JourneyDto>(`/api/app/journey/${id}`, dto).then((r) => r.data)
export const deleteJourney = (id: string) => api.delete(`/api/app/journey/${id}`)

// ---- journey-task-template ----
export const listJourneyTemplates = (input: GetJourneyTemplateInput) =>
  api.get<ListResult<JourneyTaskTemplateItemDto>>('/api/app/journey-task-template', { params: input }).then((r) => r.data.items)
export const createJourneyTemplate = (dto: CreateJourneyTaskTemplateItemDto) => api.post<JourneyTaskTemplateItemDto>('/api/app/journey-task-template', dto).then((r) => r.data)
export const updateJourneyTemplate = (id: string, dto: UpdateJourneyTaskTemplateItemDto) => api.put<JourneyTaskTemplateItemDto>(`/api/app/journey-task-template/${id}`, dto).then((r) => r.data)
export const deleteJourneyTemplate = (id: string) => api.delete(`/api/app/journey-task-template/${id}`)

// ---- PK board (Phase 1: weekly) ----
// ABP 约定：GetWeeklyAsync → GET /api/app/pk/weekly
export const getWeeklyPk = () => api.get<WeeklyPkResultDto>('/api/app/pk/weekly').then((r) => r.data)

// ---- catalog (read-only active lists) ----
export const listActiveRewardItems = () => api.get<ListResult<RewardItemDto>>('/api/app/reward-item/active-list').then((r) => r.data.items)
export const listActiveMedals = () => api.get<ListResult<MedalDto>>('/api/app/medal/active-list').then((r) => r.data.items)
export const listActivePetSpecies = () => api.get<ListResult<PetSpeciesDto>>('/api/app/pet-species/active-list').then((r) => r.data.items)

// ---- upload helper (multipart; override the api instance's default application/json) ----
function uploadFile<T>(url: string, file: File): Promise<T> {
  const fd = new FormData()
  fd.append('file', file)
  return api.post<T>(url, fd, { headers: { 'Content-Type': undefined as unknown as string } }).then((r) => r.data)
}

// ---- reward-item (admin) ----
export const listAllRewardItems = () => api.get<ListResult<RewardItemDto>>('/api/app/reward-item').then((r) => r.data.items)
export const createRewardItem = (dto: CreateUpdateRewardItemDto) => api.post<RewardItemDto>('/api/app/reward-item', dto).then((r) => r.data)
export const updateRewardItem = (id: string, dto: CreateUpdateRewardItemDto) => api.put<RewardItemDto>(`/api/app/reward-item/${id}`, dto).then((r) => r.data)
export const deleteRewardItem = (id: string) => api.delete(`/api/app/reward-item/${id}`)
export const uploadRewardItemIcon = (id: string, file: File) => uploadFile<RewardItemDto>(`/api/app/reward-item/${id}/upload-icon`, file)

// ---- medal (admin) ----
export const listAllMedals = () => api.get<ListResult<MedalDto>>('/api/app/medal').then((r) => r.data.items)
export const createMedal = (dto: CreateUpdateMedalDto) => api.post<MedalDto>('/api/app/medal', dto).then((r) => r.data)
export const updateMedal = (id: string, dto: CreateUpdateMedalDto) => api.put<MedalDto>(`/api/app/medal/${id}`, dto).then((r) => r.data)
export const deleteMedal = (id: string) => api.delete(`/api/app/medal/${id}`)
export const uploadMedalImage = (id: string, file: File) => uploadFile<MedalDto>(`/api/app/medal/${id}/upload-image`, file)

// ---- pet-species (admin) ----
export const listAllPetSpecies = () => api.get<ListResult<PetSpeciesDto>>('/api/app/pet-species').then((r) => r.data.items)
export const getPetSpecies = (id: string) => api.get<PetSpeciesDto>(`/api/app/pet-species/${id}`).then((r) => r.data)
export const createPetSpecies = (dto: CreateUpdatePetSpeciesDto) => api.post<PetSpeciesDto>('/api/app/pet-species', dto).then((r) => r.data)
export const updatePetSpecies = (id: string, dto: CreateUpdatePetSpeciesDto) => api.put<PetSpeciesDto>(`/api/app/pet-species/${id}`, dto).then((r) => r.data)
export const deletePetSpecies = (id: string) => api.delete(`/api/app/pet-species/${id}`)
export const setPetForm = (id: string, dto: SetPetFormDto) => api.post<PetSpeciesDto>(`/api/app/pet-species/${id}/set-form`, dto).then((r) => r.data)
export const uploadPetCover = (id: string, file: File) => uploadFile<PetSpeciesDto>(`/api/app/pet-species/${id}/upload-cover`, file)
export const uploadPetFormSprite = (id: string, level: number, file: File) => uploadFile<PetSpeciesDto>(`/api/app/pet-species/${id}/upload-form-sprite?level=${level}`, file)
export const uploadPetFormEvolveVideo = (id: string, level: number, file: File) => uploadFile<PetSpeciesDto>(`/api/app/pet-species/${id}/upload-form-evolve-video?level=${level}`, file)
export const activatePetSpecies = (id: string) => api.post<PetSpeciesDto>(`/api/app/pet-species/${id}/activate`).then((r) => r.data)
export const deactivatePetSpecies = (id: string) => api.post<PetSpeciesDto>(`/api/app/pet-species/${id}/deactivate`).then((r) => r.data)
