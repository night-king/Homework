import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'
import { HomePage } from '@/features/home/HomePage'
import { ChildrenPage } from '@/features/children/ChildrenPage'
import { WeeklyTemplatePage } from '@/features/schedule/WeeklyTemplatePage'
import { DailyBoardPage } from '@/features/board/DailyBoardPage'
import { FamilyGoalsPage } from '@/features/goals/FamilyGoalsPage'

export default function App() {
  useEffect(() => { useAuthStore.getState().initialize() }, [])
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/children" element={<ChildrenPage />} />
          <Route path="/schedule" element={<WeeklyTemplatePage />} />
          <Route path="/board" element={<DailyBoardPage />} />
          <Route path="/goals" element={<FamilyGoalsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
      <Toaster position="top-center" richColors />
    </BrowserRouter>
  )
}
