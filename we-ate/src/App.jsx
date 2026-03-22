import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './components/AuthProvider'
import LoginPage from './pages/LoginPage'
import UserSelectPage from './pages/UserSelectPage'
import SetupPage from './pages/SetupPage'
import TrackingPage from './pages/TrackingPage'
import RecipeLibraryPage from './pages/RecipeLibraryPage'
import SettingsPage from './pages/SettingsPage'
import HistoryPage from './pages/HistoryPage'
import WeightPage from './pages/WeightPage'

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center grain-overlay">
      <div className="text-center">
        <h1 className="font-display text-5xl text-terracotta animate-pulse">
          We Ate
        </h1>
      </div>
    </div>
  )
}

function AppRoutes() {
  const { session, profiles, activeProfileId, loading, profilesReady } = useAuth()

  if (loading || (session && !profilesReady)) return <LoadingScreen />

  // Determine where to redirect unauthenticated/un-setup users
  const noSession    = !session
  const noProfiles   = session && profiles.length === 0
  const noActivePro  = session && profiles.length > 0 && !activeProfileId

  return (
    <Routes>
      <Route
        path="/login"
        element={
          noSession
            ? <LoginPage />
            : noProfiles
              ? <Navigate to="/setup"  replace />
              : noActivePro
                ? <Navigate to="/select" replace />
                : <Navigate to="/"       replace />
        }
      />
      <Route
        path="/setup"
        element={
          noSession
            ? <Navigate to="/login"  replace />
            : !noProfiles
              ? <Navigate to="/"     replace />
              : <SetupPage />
        }
      />
      <Route
        path="/select"
        element={
          noSession
            ? <Navigate to="/login"  replace />
            : noProfiles
              ? <Navigate to="/setup"  replace />
              : <UserSelectPage />
        }
      />

      {/* Protected app routes */}
      {[
        { path: '/',         Component: TrackingPage },
        { path: '/library',  Component: RecipeLibraryPage },
        { path: '/settings', Component: SettingsPage },
        { path: '/history',  Component: HistoryPage },
        { path: '/weight',   Component: WeightPage },
      ].map(({ path, Component }) => (
        <Route
          key={path}
          path={path}
          element={
            noSession
              ? <Navigate to="/login"  replace />
              : noProfiles
                ? <Navigate to="/setup"  replace />
                : noActivePro
                  ? <Navigate to="/select" replace />
                  : <Component />
          }
        />
      ))}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
