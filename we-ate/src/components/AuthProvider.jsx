import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { applyStyle } from '../lib/profileStyles'

const AuthContext = createContext(null)
const PROFILES_CACHE_KEY = 'we-ate-profiles'

function readProfilesCache() {
  try {
    const cached = localStorage.getItem(PROFILES_CACHE_KEY)
    return cached ? JSON.parse(cached) : null
  } catch { return null }
}

export function AuthProvider({ children }) {
  const [session,          setSession]          = useState(null)
  const [loading,          setLoading]          = useState(true)
  const [profiles,         setProfiles]         = useState(() => readProfilesCache() ?? [])
  const [profilesReady,    setProfilesReady]    = useState(() => !!readProfilesCache())
  const [activeProfileId,  setActiveProfileIdState] = useState(() => {
    return localStorage.getItem('we-ate-active-profile') || null
  })

  const loadProfiles = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, created_at')
      .order('created_at')
    const list = (data ?? []).map(applyStyle)
    setProfiles(list)
    setProfilesReady(true)
    try { localStorage.setItem(PROFILES_CACHE_KEY, JSON.stringify(list)) } catch {}
  }, [])

  useEffect(() => {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('getSession timeout')), 5000)
    )
    Promise.race([supabase.auth.getSession(), timeout])
      .then(async ({ data: { session } }) => {
        setSession(session)
        setLoading(false)  // unblock routing as soon as session is known
        try {
          if (session) await loadProfiles()
        } catch (e) {
          console.error('loadProfiles failed', e)
          if (session) setProfilesReady(true)  // don't block forever on error
        }
      })
      .catch((e) => {
        console.error('getSession failed or timed out', e)
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
        setProfilesReady(false)
        setActiveProfileIdState(null)
        localStorage.removeItem('we-ate-active-profile')
        try { localStorage.removeItem(PROFILES_CACHE_KEY) } catch {}
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
      profilesReady,
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
