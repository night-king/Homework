export interface ListResult<T> { items: T[] }

// ---- Child ----
export interface ChildProfileDto { id: string; displayName: string; grade: number; avatarKey?: string | null; hasPin: boolean }
export interface CreateChildDto { displayName: string; grade: number; avatarKey?: string | null }
export interface UpdateChildProfileDto { displayName: string; grade: number; avatarKey?: string | null }
export interface SetChildPinDto { pin?: string | null }  // "^\d{4}$" or null/empty to clear
export interface VerifyChildPinDto { pin: string }       // "^\d{4}$"; server-side compare, returns boolean

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6  // Sun..Sat

// ---- Daily task / board ----
export type TaskReviewState = 0 | 1  // Normal | Revoked
export interface DailyTaskDto {
  id: string; childId: string; date: string; title: string; subject?: string | null; order: number; isCompleted: boolean; completedTime?: string | null; reviewState: TaskReviewState; countsAsCompleted: boolean; sourceTemplateItemId?: string | null; journeyId: string; rewardItemId?: string | null; rewardGranted: boolean
  rewardName?: string | null
  rewardGlyph?: string | null
  rewardIconUrl?: string | null
  estimatedMinutes?: number | null
}
export interface CreateDailyTaskDto { childId: string; date: string; title: string; subject?: string | null; order: number }
export interface UpdateDailyTaskDto { title: string; subject?: string | null; order: number }
export interface GetDailyBoardInput { childId: string; date: string }
export interface DailyBoardDto { childId: string; date: string; tasks: DailyTaskDto[]; tasksTotal: number; tasksCompleted: number; stars: number; isFull: boolean; isRestDay: boolean }

// ---- Journey ----
export type JourneyStatus = 0 | 1 | 2 // Draft | Active | Completed
export interface JourneyDto {
  id: string; childId: string; title: string; description?: string | null;
  startDate: string; endDate: string; medalId: string;
  status: JourneyStatus; petSpeciesId?: string | null;
  currentLevel: number; growthPoints: number; completedTime?: string | null;
}
export interface CreateJourneyDto { childId: string; title: string; description?: string | null; startDate: string; endDate: string; medalId: string }
export interface UpdateJourneyDto { title: string; description?: string | null; startDate: string; endDate: string; medalId: string }
export interface GetJourneyListInput { childId: string }

// ---- Journey task template ----
export interface JourneyTaskTemplateItemDto {
  id: string; journeyId: string; dayOfWeek: DayOfWeek; title: string;
  subject?: string | null; order: number; estimatedMinutes?: number | null;
  isActive: boolean; rewardItemId?: string | null; rewardIsRandom: boolean;
}
export interface CreateJourneyTaskTemplateItemDto { journeyId: string; dayOfWeek: DayOfWeek; title: string; subject?: string | null; order: number; estimatedMinutes?: number | null; rewardItemId?: string | null; rewardIsRandom: boolean }
export interface UpdateJourneyTaskTemplateItemDto { title: string; subject?: string | null; order: number; estimatedMinutes?: number | null; isActive: boolean; rewardItemId?: string | null; rewardIsRandom: boolean }
export interface GetJourneyTemplateInput { journeyId: string; dayOfWeek?: DayOfWeek }

// ---- Catalog (read-only) ----
export interface RewardItemDto { id: string; name: string; iconUrl?: string | null; glyph?: string | null; growthValue: number; randomWeight: number; isActive: boolean; displayOrder: number }
export interface MedalDto { id: string; name: string; description?: string | null; imageUrl?: string | null; isActive: boolean; displayOrder: number }
export interface PetFormDto { level: number; name: string; spriteUrl?: string | null; revealText?: string | null; growthToNext?: number | null; evolveVideoUrl?: string | null; scale?: number | null }
export interface PetSpeciesDto { id: string; name: string; code: string; coverUrl?: string | null; accentColor?: string | null; description?: string | null; isActive: boolean; displayOrder: number; forms: PetFormDto[] }

// ---- Catalog (admin write) ----
export interface CreateUpdateRewardItemDto { name: string; glyph?: string | null; growthValue: number; randomWeight: number; displayOrder: number; isActive: boolean }
export interface CreateUpdateMedalDto { name: string; description?: string | null; displayOrder: number; isActive: boolean }
export interface CreateUpdatePetSpeciesDto { name: string; code: string; accentColor?: string | null; description?: string | null; displayOrder: number }
export type PetFormLevel = 1 | 2 | 3 | 4 | 5
export interface SetPetFormDto { level: PetFormLevel; name: string; revealText?: string | null; growthToNext?: number | null; scale?: number | null }

// ---- Auth ----
export interface AppUser { id: string; userName: string; email?: string }
export interface TokenResponse { access_token: string; refresh_token: string; expires_in: number; token_type: string }

// ---- child play (Phase 3B) ----
export interface StartJourneyDto { childId: string; journeyId: string; petSpeciesId: string }
export interface FeedDto { childId: string; journeyId: string; rewardItemId: string }
export interface FeedResultDto {
  evolved: boolean
  newLevel: number
  revealText?: string | null
  evolveVideoUrl?: string | null
  completed: boolean
  currentLevel: number
  growthPoints: number
}
export interface BackpackItemDto {
  rewardItemId: string
  name: string
  iconUrl?: string | null
  glyph?: string | null
  quantity: number
  growthValue: number
}
export interface CollectionEntryDto {
  journeyId: string
  title: string
  petSpeciesId: string
  petName: string
  petFinalSpriteUrl?: string | null
  medalId: string
  medalName: string
  medalImageUrl?: string | null
  completedTime: string
}

export interface WeekDayDto {
  date: string
  isRestDay: boolean
  tasksTotal: number
  tasksCompleted: number
  isFull: boolean
}

export interface WeekStripDto {
  streak: number
  days: WeekDayDto[]
}
