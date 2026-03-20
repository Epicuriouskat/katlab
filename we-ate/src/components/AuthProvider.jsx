import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeUser, setActiveUserState] = useState(() => {
    return localStorage.getItem('we-ate-active-user') || null
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) {
        setActiveUserState(null)
        localStorage.removeItem('we-ate-active-user')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const setActiveUser = (user) => {
    setActiveUserState(user)
    if (user) {
      localStorage.setItem('we-ate-active-user', user)
    } else {
      localStorage.removeItem('we-ate-active-user')
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setActiveUser(null)
  }

  return (
    <AuthContext.Provider value={{ session, loading, activeUser, setActiveUser, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
