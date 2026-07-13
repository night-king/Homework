import { api } from './api'
import type {
  ListResult, ChildProfileDto, CreateChildDto, UpdateChildProfileDto, SetChildPinDto,
  DailyTaskDto, CreateDailyTaskDto, UpdateDailyTaskDto, GetDailyBoardInput, DailyBoardDto,
  JourneyDto, CreateJourneyDto, UpdateJourneyDto,
  JourneyTaskTemplateItemDto, CreateJourneyTaskTemplateItemDto, UpdateJourneyTaskTemplateItemDto, GetJourneyTemplateInput,
  RewardItemDto, MedalDto, PetSpeciesDto,
} from '@/types/homework'

// ---- child-profile ----
export const listChildren = () => api.get<ListResult<ChildProfileDto>>('/api/app/child-profile').then((r) => r.data.items)
export const getChild = (id: string) => api.get<ChildProfileDto>(`/api/app/child-profile/${id}`).then((r) => r.data)
export const createChild = (dto: CreateChildDto) => api.post<ChildProfileDto>('/api/app/child-profile', dto).then((r) => r.data)
export const updateChild = (id: string, dto: UpdateChildProfileDto) => api.put<ChildProfileDto>(`/api/app/child-profile/${id}`, dto).then((r) => r.data)
export const deleteChild = (id: string) => api.delete(`/api/app/child-profile/${id}`)
export const setChildPin = (id: string, dto: SetChildPinDto) => api.post(`/api/app/child-profile/${id}/set-pin`, dto)

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

// ---- catalog (read-only active lists) ----
export const listActiveRewardItems = () => api.get<ListResult<RewardItemDto>>('/api/app/reward-item/active-list').then((r) => r.data.items)
export const listActiveMedals = () => api.get<ListResult<MedalDto>>('/api/app/medal/active-list').then((r) => r.data.items)
export const listActivePetSpecies = () => api.get<ListResult<PetSpeciesDto>>('/api/app/pet-species/active-list').then((r) => r.data.items)
