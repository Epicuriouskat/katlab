import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Fallback defaults while Supabase loads or if no rows exist yet
export const TARGET_DEFAULTS = {
  kat:      { calories: 1800, protein: 130, carbs: 160, fat: 60,  fiber: null },
  jeremiah: { calories: 2400, protein: 200, carbs: 220, fat: 80,  fiber: null },
}

export function useTargets() {
  const [targets, setTargets] = useState(TARGET_DEFAULTS)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    const { data } = await supabase.from('user_targets').select('*')
    if (data?.length) {
      const next = { ...TARGET_DEFAULTS }
      data.forEach((row) => {
        if (next[row.person] !== undefined) {
          next[row.person] = {
            calories: row.calories,
            protein:  row.protein,
            carbs:    row.carbs,
            fat:      row.fat,
            fiber:    row.fiber ?? null,
          }
        }
      })
      setTargets(next)
    }
    setLoading(false)
  }, [])

  useEffect(() => { refetch() }, [refetch])

  return { targets, loading, refetch }
}
