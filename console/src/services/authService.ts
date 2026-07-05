import axios from 'axios'
import { api, CLIENT_ID, SCOPE, TOKEN_URL, tokenStore } from './api'
import type { TokenResponse, AppUser } from '@/types/homework'

export async function passwordLogin(username: string, password: string): Promise<TokenResponse> {
  const body = new URLSearchParams({ grant_type: 'password', client_id: CLIENT_ID, scope: SCOPE, username, password })
  const resp = await axios.post<TokenResponse>(TOKEN_URL, body, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
  tokenStore.set(resp.data.access_token, resp.data.refresh_token)
  return resp.data
}

export interface RegisterInput { userName: string; emailAddress: string; password: string }
export async function register(input: RegisterInput): Promise<void> {
  await api.post('/api/account/register', { ...input, appName: CLIENT_ID })
}

export interface GrantedPolicies { [key: string]: boolean }
export async function getApplicationConfiguration(): Promise<GrantedPolicies> {
  const resp = await api.get('/api/abp/application-configuration')
  return resp.data?.auth?.grantedPolicies ?? {}
}

// JWT 是 base64url（-/_，可能无 padding），必须先转普通 base64 再 atob，并按 UTF-8 解码。atob 不认 -/_。
function parseJwt(token: string): Record<string, string | number> {
  const seg = token.split('.')[1] ?? ''
  const b64 = seg.replace(/-/g, '+').replace(/_/g, '/')
  const json = decodeURIComponent(
    atob(b64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''),
  )
  return JSON.parse(json)
}
export function decodeUser(accessToken: string): AppUser {
  const p = parseJwt(accessToken)
  return {
    id: String(p.sub ?? ''),
    userName: String(p.unique_name ?? p.preferred_username ?? p.name ?? ''),
    email: p.email != null ? String(p.email) : undefined,
  }
}
export function isTokenExpired(accessToken: string): boolean {
  try { const exp = Number(parseJwt(accessToken).exp); return !exp || Date.now() >= exp * 1000 } catch { return true }
}

// ABP account endpoints
export const myProfile = () => api.get('/api/account/my-profile').then((r) => r.data)
export const updateMyProfile = (dto: unknown) => api.put('/api/account/my-profile', dto).then((r) => r.data)
export const changePassword = (currentPassword: string, newPassword: string) =>
  api.post('/api/account/change-password', { currentPassword, newPassword })
export const sendPasswordResetLink = (email: string, appName = CLIENT_ID) =>
  api.post('/api/account/send-password-reset-link', { email, appName, returnUrl: `${location.origin}/reset-password` })
export const resetPassword = (userId: string, resetToken: string, password: string) =>
  api.post('/api/account/reset-password', { userId, resetToken, password })
