import { describe, it, expect, beforeEach, vi } from 'vitest'
vi.mock('@/services/authService', () => ({
  passwordLogin: vi.fn(async () => ({ access_token: `x.${btoa(JSON.stringify({ sub: '1', unique_name: 'demo' }))}.y`, refresh_token: 'r' })),
  register: vi.fn(async () => {}),
  getApplicationConfiguration: vi.fn(async () => ({ 'Homework.ParentAdmin': true })),
  decodeUser: (t: string) => JSON.parse(atob(t.split('.')[1])),
  isTokenExpired: () => false,
}))
import { useAuthStore } from './authStore'

beforeEach(() => { localStorage.clear(); useAuthStore.setState({ user: null, permissions: {}, isAuthenticated: false, isInitializing: true }) })

describe('authStore', () => {
  it('login sets user + permissions', async () => {
    await useAuthStore.getState().login('demo', '1q2w3E*')
    const s = useAuthStore.getState()
    expect(s.isAuthenticated).toBe(true)
    expect(s.hasPermission('Homework.ParentAdmin')).toBe(true)
  })
  it('logout clears state', () => {
    useAuthStore.setState({ isAuthenticated: true, user: { id: '1', userName: 'x' }, permissions: { a: true } })
    useAuthStore.getState().logout()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })
})
