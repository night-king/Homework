import { api } from '@/services/api'
import type {
  ListResult, JourneyDto, DailyBoardDto, DailyTaskDto,
  StartJourneyDto, FeedDto, FeedResultDto, BackpackItemDto, CollectionEntryDto, GetDailyBoardInput,
} from '@/types/homework'

const base = '/api/app/journey-play'

export const getActiveJourney = (childId: string) =>
  api.get<JourneyDto | null>(`${base}/active`, { params: { childId } }).then((r) => r.data)

export const startJourney = (dto: StartJourneyDto) =>
  api.post<JourneyDto>(`${base}/start`, dto).then((r) => r.data)

export const getPlayDailyBoard = (input: GetDailyBoardInput) =>
  api.get<DailyBoardDto>(`${base}/daily-board`, { params: { childId: input.childId, date: input.date } }).then((r) => r.data)

export const getBackpack = (childId: string, journeyId: string) =>
  api.get<ListResult<BackpackItemDto>>(`${base}/backpack`, { params: { childId, journeyId } }).then((r) => r.data.items)

export const getCollection = (childId: string) =>
  api.get<ListResult<CollectionEntryDto>>(`${base}/collection`, { params: { childId } }).then((r) => r.data.items)

export const completeTask = (childId: string, taskId: string) =>
  api.post<DailyTaskDto>(`${base}/complete-task`, null, { params: { childId, taskId } }).then((r) => r.data)

export const uncompleteTask = (childId: string, taskId: string) =>
  api.post<DailyTaskDto>(`${base}/uncomplete-task`, null, { params: { childId, taskId } }).then((r) => r.data)

export const feed = (dto: FeedDto) =>
  api.post<FeedResultDto>(`${base}/feed`, dto).then((r) => r.data)
