import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

// Use local date (not UTC) so midnight resets align with the user's timezone
export function getLocalDate(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

// ── Data fetching ─────────────────────────────────────────────────────────────

export function useDailyLog(date) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    if (!date) { setLoading(false); return }
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('daily_log_entries')
      .select(`
        id, person, meal_slot, quantity, logged_at, recipe_id, quick_item_id,
        recipes (
          id, name, type,
          recipe_nutrition ( person, calories, protein, carbs, fat, fiber )
        ),
        quick_items ( id, name, calories, protein, carbs, fat, fiber )
      `)
      .eq('date', date)
      .order('logged_at')

    if (error) setError(error.message)
    else setEntries(data ?? [])
    setLoading(false)
  }, [date])

  useEffect(() => { refetch() }, [refetch])

  return { entries, loading, error, refetch }
}

// ── Nutrition helpers ─────────────────────────────────────────────────────────

export function getEntryNutrition(entry) {
  const qty = Number(entry.quantity) || 1

  if (entry.quick_item_id && entry.quick_items) {
    const qi = entry.quick_items
    return {
      name:     qi.name,
      calories: (qi.calories || 0) * qty,
      protein:  (qi.protein  || 0) * qty,
      carbs:    (qi.carbs    || 0) * qty,
      fat:      (qi.fat      || 0) * qty,
      fiber:    qi.fiber != null ? qi.fiber * qty : null,
    }
  }

  if (entry.recipe_id && entry.recipes) {
    const r = entry.recipes
    // For split: use person-specific row. For single: any row (they're identical).
    const nut =
      (r.recipe_nutrition ?? []).find((n) => n.person === entry.person) ??
      (r.recipe_nutrition ?? [])[0]
    if (!nut) return { name: r.name, calories: 0, protein: 0, carbs: 0, fat: 0, fiber: null }
    return {
      name:     r.name,
      calories: (nut.calories || 0) * qty,
      protein:  (nut.protein  || 0) * qty,
      carbs:    (nut.carbs    || 0) * qty,
      fat:      (nut.fat      || 0) * qty,
      fiber:    nut.fiber != null ? nut.fiber * qty : null,
    }
  }

  return { name: 'Unknown', calories: 0, protein: 0, carbs: 0, fat: 0, fiber: null }
}

export function computeTotals(entries) {
  return entries.reduce(
    (acc, e) => {
      const n = getEntryNutrition(e)
      return {
        calories: acc.calories + n.calories,
        protein:  acc.protein  + n.protein,
        carbs:    acc.carbs    + n.carbs,
        fat:      acc.fat      + n.fat,
      }
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )
}

// ── Midnight auto-reset ───────────────────────────────────────────────────────
//
// Watches for the local date changing and snapshots the previous day's totals
// into daily_history via the snapshot_daily_history() Postgres function.
//
// If the app is closed overnight, the snapshot runs on next open.
// For guaranteed midnight archival, also set up a pg_cron job in Supabase:
//   SELECT cron.schedule('nightly-snapshot','59 23 * * *','SELECT snapshot_daily_history()');

export function useMidnightReset() {
  const [currentDate, setCurrentDate] = useState(getLocalDate)

  useEffect(() => {
    let lastDate = getLocalDate()

    const check = async () => {
      const today = getLocalDate()
      if (today === lastDate) return

      // New day detected — snapshot yesterday before rolling over
      try {
        await supabase.rpc('snapshot_daily_history', { snapshot_date: lastDate })
      } catch (err) {
        console.warn('[We Ate] snapshot_daily_history failed:', err)
      }

      lastDate = today
      setCurrentDate(today)
    }

    check() // Run immediately to catch overnight opens
    const id = setInterval(check, 30_000) // Then every 30 s
    return () => clearInterval(id)
  }, []) // Intentionally empty — runs once on mount

  return currentDate
}
