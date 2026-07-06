import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import i18n from '@/i18n/config'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''
export const CLIENT_ID = 'Homework_App'
export const SCOPE = 'Homework offline_access'
export const TOKEN_URL = `${API_BASE_URL}/connect/token`

export const tokenStore = {
  get access() { return localStorage.getItem('accessToken') },
  get refresh() { return localStorage.getItem('refreshToken') },
  set(access: string, refresh: string) { localStorage.setItem('accessToken', access); localStorage.setItem('refreshToken', refresh) },
  clear() { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken') },
}

export const api = axios.create({ baseURL: API_BASE_URL, headers: { 'Content-Type': 'application/json' } })

api.interceptors.request.use((config) => {
  const token = tokenStore.access
  if (token) config.headers.Authorization = `Bearer ${token}`
  config.headers['Accept-Language'] = i18n.language || 'zh-CN'
  return config
})

let refreshing: Promise<string> | null = null
async function doRefresh(): Promise<string> {
  const refreshToken = tokenStore.refresh
  if (!refreshToken) throw new Error('no_refresh_token')
  const body = new URLSearchParams({ grant_type: 'refresh_token', client_id: CLIENT_ID, refresh_token: refreshToken, scope: SCOPE })
  const resp = await axios.post(TOKEN_URL, body, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
  tokenStore.set(resp.data.access_token, resp.data.refresh_token)
  return resp.data.access_token
}
// 共享同一次在途刷新（并发 401 只刷一次）；authStore.initialize() 也用它做过期静默刷新。
export function refreshAccessToken(): Promise<string> {
  refreshing ??= doRefresh().finally(() => { refreshing = null })
  return refreshing
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    const status = error.response?.status
    if (status === 401 && original && !original._retry && !original.url?.includes('/connect/token')) {
      original._retry = true
      try {
        const newToken = await refreshAccessToken()
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch {
        tokenStore.clear()
        window.dispatchEvent(new Event('auth:logout'))
      }
    }
    return Promise.reject(error)
  },
)

interface AbpError { error?: { message?: string; details?: string; validationErrors?: { message: string }[] } }
export function getErrorMessage(error: unknown, fallback = '出错了，请稍后再试'): string {
  const data = (error as AxiosError<AbpError>)?.response?.data?.error
  if (data?.message) {
    if (data.validationErrors?.length) return data.validationErrors.map((v) => v.message).join('；')
    return data.details ? `${data.message}：${data.details}` : data.message
  }
  return fallback
}
