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
    const query = supabase
      .from('profiles')
      .select('id, name, created_at')
      .order('created_at')
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('profiles timeout')), 8000)
    )
    const { data } = await Promise.race([query, timeout])
    const list = (data ?? []).map(applyStyle)
    setProfiles(list)
    setProfilesReady(true)
    try { localStorage.setItem(PROFILES_CACHE_KEY, JSON.stringify(list)) } catch {}
  }, [])

  useEffect(() => {
    // Fallback: if INITIAL_SESSION never fires, unblock everything after 4s
    const fallback = setTimeout(() => {
      setLoading(false)
      setProfilesReady(true)
    }, 4000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)

      if (event === 'INITIAL_SESSION') {
        clearTimeout(fallback)
        if (session) {
          loadProfiles().catch(e => {
            console.error('loadProfiles failed', e)
            setProfilesReady(true)  // unblock routing even if load fails/times out
          })
        } else {
          setProfilesReady(true)  // no session = no profiles needed
        }
        setLoading(false)
      } else if (event === 'SIGNED_IN') {
        try { await loadProfiles() } catch (e) {
          console.error('loadProfiles failed', e)
          setProfilesReady(true)
        }
      } else if (event === 'SIGNED_OUT') {
        setProfiles([])
        setProfilesReady(false)
        setActiveProfileIdState(null)
        localStorage.removeItem('we-ate-active-profile')
        try { localStorage.removeItem(PROFILES_CACHE_KEY) } catch {}
      }
    })

    return () => {
      clearTimeout(fallback)
      subscription.unsubscribe()
    }
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
