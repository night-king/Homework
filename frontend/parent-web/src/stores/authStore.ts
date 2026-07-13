import { create } from 'zustand'
import { tokenStore, refreshAccessToken } from '@/services/api'
import { passwordLogin, register as registerApi, getApplicationConfiguration, decodeUser, isTokenExpired, type RegisterInput } from '@/services/authService'
import type { AppUser } from '@/types/homework'

interface AuthState {
  user: AppUser | null
  permissions: Record<string, boolean>
  permissionsLoaded: boolean
  isAuthenticated: boolean
  isInitializing: boolean
  login: (username: string, password: string) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => void
  hasPermission: (name: string) => boolean
  loadPermissions: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  permissions: {},
  permissionsLoaded: false,
  isAuthenticated: false,
  isInitializing: true,
  login: async (username, password) => {
    const tok = await passwordLogin(username, password)
    set({ user: decodeUser(tok.access_token), isAuthenticated: true })
    await get().loadPermissions()
  },
  register: async (input) => {
    await registerApi(input)
    await get().login(input.userName, input.password)
  },
  logout: () => { tokenStore.clear(); set({ user: null, permissions: {}, permissionsLoaded: false, isAuthenticated: false }) },
  hasPermission: (name) => !!get().permissions[name],
  loadPermissions: async () => {
    try { set({ permissions: await getApplicationConfiguration() }) }
    catch { /* ignore */ }
    finally { set({ permissionsLoaded: true }) }
  },
  initialize: async () => {
    const token = tokenStore.access
    if (token) {
      try {
        let active = token
        if (isTokenExpired(token)) {
          if (tokenStore.refresh) active = await refreshAccessToken()
          else throw new Error('expired_no_refresh')
        }
        set({ user: decodeUser(active), isAuthenticated: true })
        void get().loadPermissions()
      } catch { tokenStore.clear(); set({ user: null, isAuthenticated: false }) }
    }
    set({ isInitializing: false })
  },
}))

// api.ts 在 refresh 失败时派发 'auth:logout'
if (typeof window !== 'undefined') window.addEventListener('auth:logout', () => useAuthStore.getState().logout())
