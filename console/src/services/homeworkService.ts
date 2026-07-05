import { api } from './api'
import type {
  ListResult, ChildProfileDto, CreateChildDto, UpdateChildProfileDto, SetChildPinDto,
  WeeklyTaskTemplateItemDto, CreateWeeklyTaskTemplateItemDto, UpdateWeeklyTaskTemplateItemDto, GetWeeklyTemplateInput,
  DailyTaskDto, CreateDailyTaskDto, UpdateDailyTaskDto, GetDailyBoardInput, DailyBoardDto,
  FamilyGoalDto, CreateUpdateFamilyGoalDto,
} from '@/types/homework'

// ---- child-profile ----
export const listChildren = () => api.get<ListResult<ChildProfileDto>>('/api/app/child-profile').then((r) => r.data.items)
export const getChild = (id: string) => api.get<ChildProfileDto>(`/api/app/child-profile/${id}`).then((r) => r.data)
export const createChild = (dto: CreateChildDto) => api.post<ChildProfileDto>('/api/app/child-profile', dto).then((r) => r.data)
export const updateChild = (id: string, dto: UpdateChildProfileDto) => api.put<ChildProfileDto>(`/api/app/child-profile/${id}`, dto).then((r) => r.data)
export const deleteChild = (id: string) => api.delete(`/api/app/child-profile/${id}`)
export const setChildPin = (id: string, dto: SetChildPinDto) => api.post(`/api/app/child-profile/${id}/set-pin`, dto)

// ---- weekly-task-template ----
export const listWeeklyTemplates = (input: GetWeeklyTemplateInput) =>
  api.get<ListResult<WeeklyTaskTemplateItemDto>>('/api/app/weekly-task-template', { params: input }).then((r) => r.data.items)
export const createWeeklyTemplate = (dto: CreateWeeklyTaskTemplateItemDto) => api.post<WeeklyTaskTemplateItemDto>('/api/app/weekly-task-template', dto).then((r) => r.data)
export const updateWeeklyTemplate = (id: string, dto: UpdateWeeklyTaskTemplateItemDto) => api.put<WeeklyTaskTemplateItemDto>(`/api/app/weekly-task-template/${id}`, dto).then((r) => r.data)
export const deleteWeeklyTemplate = (id: string) => api.delete(`/api/app/weekly-task-template/${id}`)

// ---- daily-task ----
export const getDailyBoard = (input: GetDailyBoardInput) => api.post<DailyBoardDto>('/api/app/daily-task/get-board', input).then((r) => r.data)
export const createDailyTask = (dto: CreateDailyTaskDto) => api.post<DailyTaskDto>('/api/app/daily-task', dto).then((r) => r.data)
export const updateDailyTask = (id: string, dto: UpdateDailyTaskDto) => api.put<DailyTaskDto>(`/api/app/daily-task/${id}`, dto).then((r) => r.data)
export const deleteDailyTask = (id: string) => api.delete(`/api/app/daily-task/${id}`)
export const revokeDailyTask = (id: string) => api.post(`/api/app/daily-task/${id}/revoke`)
export const restoreDailyTask = (id: string) => api.post(`/api/app/daily-task/${id}/restore`)

// ---- family-goal ----
export const listGoals = () => api.get<ListResult<FamilyGoalDto>>('/api/app/family-goal').then((r) => r.data.items)
export const getGoal = (id: string) => api.get<FamilyGoalDto>(`/api/app/family-goal/${id}`).then((r) => r.data)
export const createGoal = (dto: CreateUpdateFamilyGoalDto) => api.post<FamilyGoalDto>('/api/app/family-goal', dto).then((r) => r.data)
export const updateGoal = (id: string, dto: CreateUpdateFamilyGoalDto) => api.put<FamilyGoalDto>(`/api/app/family-goal/${id}`, dto).then((r) => r.data)
export const deleteGoal = (id: string) => api.delete(`/api/app/family-goal/${id}`)
