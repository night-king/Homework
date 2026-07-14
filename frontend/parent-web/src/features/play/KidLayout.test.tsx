import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { KidLayout } from './KidLayout'

function ui() {
  return render(
    <MemoryRouter initialEntries={['/play']}>
      <Routes>
        <Route element={<KidLayout />}>
          <Route path="/play" element={<div>kid-home</div>} />
        </Route>
        <Route path="/login" element={<div>login-page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}
beforeEach(() => useAuthStore.setState({ isAuthenticated: true, isInitializing: false }))

describe('KidLayout', () => {
  it('renders child route when authenticated', () => {
    ui()
    expect(screen.getByText('kid-home')).toBeInTheDocument()
    expect(screen.getByTestId('kid-exit')).toBeInTheDocument()
  })
  it('redirects to /login when not authenticated', () => {
    useAuthStore.setState({ isAuthenticated: false, isInitializing: false })
    ui()
    expect(screen.getByText('login-page')).toBeInTheDocument()
  })
})
