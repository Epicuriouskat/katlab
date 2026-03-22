import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const FALLBACK_TARGETS = {
  calories: 2000,
  protein:  150,
  carbs:    200,
  fat:      65,
  fiber:    null,
  sodium:   2300,
}

// Returns targets keyed by profile_id: { [profileId]: { calories, protein, ... } }
export function useTargets() {
  const [targets, setTargets] = useState({})
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    const { data } = await supabase.from('user_targets').select('*')
    const next = {}
    ;(data ?? []).forEach((row) => {
      next[row.profile_id] = {
        calories: row.calories,
        protein:  row.protein,
        carbs:    row.carbs,
        fat:      row.fat,
        fiber:    row.fiber  ?? null,
        sodium:   row.sodium ?? 2300,
      }
    })
    setTargets(next)
    setLoading(false)
  }, [])

  useEffect(() => { refetch() }, [refetch])

  // Returns targets for a given profile_id, falling back to defaults
  const getTargets = (profileId) => targets[profileId] ?? FALLBACK_TARGETS

  return { targets, getTargets, loading, refetch }
}
