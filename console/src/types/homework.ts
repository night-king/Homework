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
export interface DailyTaskDto { id: string; childId: string; date: string; title: string; subject?: string | null; order: number; isCompleted: boolean; completedTime?: string | null; reviewState: TaskReviewState; countsAsCompleted: boolean; sourceTemplateItemId?: string | null }
export interface CreateDailyTaskDto { childId: string; date: string; title: string; subject?: string | null; order: number }
export interface UpdateDailyTaskDto { title: string; subject?: string | null; order: number }
export interface GetDailyBoardInput { childId: string; date: string }
export interface DailyBoardDto { childId: string; date: string; tasks: DailyTaskDto[]; tasksTotal: number; tasksCompleted: number; stars: number; isFull: boolean; isRestDay: boolean }

// ---- Family goal ----
export interface FamilyGoalDto { id: string; title: string; targetStars: number; rewardText?: string | null; startDate: string; endDate: string; achievedTime?: string | null; currentStars: number; isAchieved: boolean; progressPercent: number }
export interface CreateUpdateFamilyGoalDto { title: string; targetStars: number; rewardText?: string | null; startDate: string; endDate: string }

// ---- Auth ----
export interface AppUser { id: string; userName: string; email?: string }
export interface TokenResponse { access_token: string; refresh_token: string; expires_in: number; token_type: string }
