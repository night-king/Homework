export interface ListResult<T> { items: T[] }

// ---- Child ----
export interface ChildProfileDto { id: string; displayName: string; grade: number; avatarKey?: string | null; hasPin: boolean }
export interface CreateChildDto { displayName: string; grade: number; avatarKey?: string | null }
export interface UpdateChildProfileDto { displayName: string; grade: number; avatarKey?: string | null }
export interface SetChildPinDto { pin?: string | null }  // "^\d{4}$" or null/empty to clear

// ---- Weekly template ----
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6  // Sun..Sat
export interface WeeklyTaskTemplateItemDto { id: string; childId: string; dayOfWeek: DayOfWeek; title: string; subject?: string | null; order: number; estimatedMinutes?: number | null; isActive: boolean }
export interface CreateWeeklyTaskTemplateItemDto { childId: string; dayOfWeek: DayOfWeek; title: string; subject?: string | null; order: number; estimatedMinutes?: number | null }
export interface UpdateWeeklyTaskTemplateItemDto { title: string; subject?: string | null; order: number; estimatedMinutes?: number | null; isActive: boolean }
export interface GetWeeklyTemplateInput { childId: string; dayOfWeek?: DayOfWeek }

// ---- Daily task / board ----
export type TaskReviewState = 0 | 1  // Normal | Revoked
export interface DailyTaskDto { id: string; childId: string; date: string; title: string; subject?: string | null; order: number; isCompleted: boolean; completedTime?: string | null; reviewState: TaskReviewState; countsAsCompleted: boolean; sourceTemplateItemId?: string | null; journeyId: string; rewardItemId?: string | null; rewardGranted: boolean }
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

// ---- Family goal ----
export interface FamilyGoalDto { id: string; title: string; targetStars: number; rewardText?: string | null; startDate: string; endDate: string; achievedTime?: string | null; currentStars: number; isAchieved: boolean; progressPercent: number }
export interface CreateUpdateFamilyGoalDto { title: string; targetStars: number; rewardText?: string | null; startDate: string; endDate: string }

// ---- Auth ----
export interface AppUser { id: string; userName: string; email?: string }
export interface TokenResponse { access_token: string; refresh_token: string; expires_in: number; token_type: string }
