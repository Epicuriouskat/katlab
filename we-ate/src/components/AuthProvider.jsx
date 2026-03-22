import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { applyStyle } from '../lib/profileStyles'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session,          setSession]          = useState(null)
  const [loading,          setLoading]          = useState(true)
  const [profiles,         setProfiles]         = useState([])
  const [activeProfileId,  setActiveProfileIdState] = useState(() => {
    return localStorage.getItem('we-ate-active-profile') || null
  })

  const loadProfiles = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, created_at')
      .order('created_at')
    setProfiles((data ?? []).map(applyStyle))
  }, [])

  useEffect(() => {
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        setSession(session)
        try {
          if (session) await loadProfiles()
        } catch (e) {
          console.error('loadProfiles failed', e)
        } finally {
          setLoading(false)
        }
      })
      .catch((e) => {
        console.error('getSession failed', e)
        setLoading(false)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session) {
        try { await loadProfiles() } catch (e) { console.error('loadProfiles failed', e) }
      } else {
        setProfiles([])
        setActiveProfileIdState(null)
        localStorage.removeItem('we-ate-active-profile')
      }
    })

    return () => subscription.unsubscribe()
  }, [loadProfiles])

  const setActiveProfileId = (id) => {
    setActiveProfileIdState(id)
    if (id) localStorage.setItem('we-ate-active-profile', id)
    else     localStorage.removeItem('we-ate-active-profile')
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setActiveProfileId(null)
  }

  return (
    <AuthContext.Provider value={{
      session,
      loading,
      profiles,
      loadProfiles,
      activeProfileId,
      setActiveProfileId,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
