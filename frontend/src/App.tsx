import { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { GroupProvider, useGroup } from './hooks/useGroup'
import { ToastProvider } from './components/ui/Toast'
import Layout from './components/layout/Layout'
import LoadingScreen from './components/ui/LoadingScreen'
import ErrorBoundary from './components/ui/ErrorBoundary'

// Lazy load pages
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })))
const GroupPage = lazy(() => import('./pages/GroupPage').then(m => ({ default: m.GroupPage })))
const PairPage = lazy(() => import('./pages/PairPage').then(m => ({ default: m.PairPage })))
const SubjectsPage = lazy(() => import('./pages/SubjectsPage').then(m => ({ default: m.SubjectsPage })))
const MaterialsPage = lazy(() => import('./pages/MaterialsPage').then(m => ({ default: m.MaterialsPage })))
const HomeworksPage = lazy(() => import('./pages/HomeworksPage').then(m => ({ default: m.HomeworksPage })))
const GradesPage = lazy(() => import('./pages/GradesPage').then(m => ({ default: m.GradesPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })))
const AdminPage = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const InvitePage = lazy(() => import('./pages/InvitePage').then(m => ({ default: m.InvitePage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })))

function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode; requireAdmin?: boolean }) {
  const { user, loading } = useAuth()
  const { currentGroup } = useGroup()

  if (loading) {
    return <LoadingScreen text="Проверка доступа..." />
  }

  if (!user) {
    return <Navigate to="/invite" replace />
  }

  if (!currentGroup) {
    return <Navigate to="/groups" replace />
  }

  if (requireAdmin && !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public invite/registration page */}
      <Route path="/invite" element={<InvitePage />} />

      {/* Protected routes requiring group selection */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<HomePage />} />
        <Route path="/groups" element={<GroupPage />} />
        <Route path="/pair/:pairId" element={<PairPage />} />
        <Route path="/subjects" element={<SubjectsPage />} />
        <Route path="/materials" element={<MaterialsPage />} />
        <Route path="/homeworks" element={<HomeworksPage />} />
        <Route path="/grades" element={<GradesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminPage /></ProtectedRoute>} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

function App() {
  useEffect(() => {
    // Initialize Telegram WebApp SDK v3
    import('@telegram-apps/sdk-react').then(({ init }) => {
      try { init() } catch {}
    })
  }, [])

  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <GroupProvider>
            <AppRoutes />
          </GroupProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App