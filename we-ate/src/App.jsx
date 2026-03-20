import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './components/AuthProvider'
import LoginPage from './pages/LoginPage'
import UserSelectPage from './pages/UserSelectPage'
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
  const { session, activeUser, loading } = useAuth()

  if (loading) return <LoadingScreen />

  return (
    <Routes>
      <Route
        path="/login"
        element={
          session
            ? <Navigate to={activeUser ? '/' : '/select'} replace />
            : <LoginPage />
        }
      />
      <Route
        path="/select"
        element={
          !session
            ? <Navigate to="/login" replace />
            : <UserSelectPage />
        }
      />
      <Route
        path="/"
        element={
          !session
            ? <Navigate to="/login" replace />
            : !activeUser
              ? <Navigate to="/select" replace />
              : <TrackingPage />
        }
      />
      <Route
        path="/library"
        element={
          !session
            ? <Navigate to="/login" replace />
            : !activeUser
              ? <Navigate to="/select" replace />
              : <RecipeLibraryPage />
        }
      />
      <Route
        path="/settings"
        element={
          !session
            ? <Navigate to="/login" replace />
            : !activeUser
              ? <Navigate to="/select" replace />
              : <SettingsPage />
        }
      />
      <Route
        path="/history"
        element={
          !session
            ? <Navigate to="/login" replace />
            : !activeUser
              ? <Navigate to="/select" replace />
              : <HistoryPage />
        }
      />
      <Route
        path="/weight"
        element={
          !session
            ? <Navigate to="/login" replace />
            : !activeUser
              ? <Navigate to="/select" replace />
              : <WeightPage />
        }
      />
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
