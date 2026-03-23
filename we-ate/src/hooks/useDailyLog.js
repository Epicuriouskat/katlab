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
        id, profile_id, meal_slot, quantity, logged_at, recipe_id, quick_item_id,
        is_quick_add, qa_name, qa_calories, qa_protein, qa_carbs, qa_fat, qa_fiber, qa_sodium,
        recipes (
          id, name, type,
          recipe_nutrition ( profile_id, calories, protein, carbs, fat, fiber, sodium )
        ),
        quick_items ( id, name, calories, protein, carbs, fat, fiber, sodium )
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

  if (entry.is_quick_add) {
    return {
      name:     entry.qa_name ?? 'Quick add',
      calories: (entry.qa_calories || 0) * qty,
      protein:  (entry.qa_protein  || 0) * qty,
      carbs:    (entry.qa_carbs    || 0) * qty,
      fat:      (entry.qa_fat      || 0) * qty,
      fiber:    entry.qa_fiber  != null ? entry.qa_fiber  * qty : null,
      sodium:   entry.qa_sodium != null ? entry.qa_sodium * qty : null,
    }
  }

  if (entry.quick_item_id && entry.quick_items) {
    const qi = entry.quick_items
    return {
      name:     qi.name,
      calories: (qi.calories || 0) * qty,
      protein:  (qi.protein  || 0) * qty,
      carbs:    (qi.carbs    || 0) * qty,
      fat:      (qi.fat      || 0) * qty,
      fiber:    qi.fiber  != null ? qi.fiber  * qty : null,
      sodium:   qi.sodium != null ? qi.sodium * qty : null,
    }
  }

  if (entry.recipe_id && entry.recipes) {
    const r = entry.recipes
    // For split: use profile-specific row. For single: any row (identical).
    const nut =
      (r.recipe_nutrition ?? []).find((n) => n.profile_id === entry.profile_id) ??
      (r.recipe_nutrition ?? [])[0]
    if (!nut) return { name: r.name, calories: 0, protein: 0, carbs: 0, fat: 0, fiber: null, sodium: null }
    return {
      name:     r.name,
      calories: (nut.calories || 0) * qty,
      protein:  (nut.protein  || 0) * qty,
      carbs:    (nut.carbs    || 0) * qty,
      fat:      (nut.fat      || 0) * qty,
      fiber:    nut.fiber  != null ? nut.fiber  * qty : null,
      sodium:   nut.sodium != null ? nut.sodium * qty : null,
    }
  }

  return { name: 'Unknown', calories: 0, protein: 0, carbs: 0, fat: 0, fiber: null, sodium: null }
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
        sodium:   acc.sodium   + (n.sodium ?? 0),
      }
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, sodium: 0 }
  )
}

// ── Midnight auto-reset ───────────────────────────────────────────────────────
//
// Snapshots completed days into daily_history via snapshot_daily_history().
// Persists the last-active date in localStorage so any days missed while the
// app was closed are backfilled on the next open.

const LAST_ACTIVE_DATE_KEY = 'we-ate-last-active-date'

export function useMidnightReset() {
  const [currentDate, setCurrentDate] = useState(getLocalDate)

  useEffect(() => {
    const today = getLocalDate()
    const stored = localStorage.getItem(LAST_ACTIVE_DATE_KEY)
    let lastDate = (stored && stored <= today) ? stored : today

    // Record today immediately so future opens can detect missed days
    localStorage.setItem(LAST_ACTIVE_DATE_KEY, today)

    const check = async () => {
      const now = getLocalDate()
      if (now === lastDate) return

      // Snapshot every completed day from lastDate up to (not including) today
      const [ly, lm, ld] = lastDate.split('-').map(Number)
      const d = new Date(ly, lm - 1, ld)
      const [ny, nm, nd] = now.split('-').map(Number)
      const end = new Date(ny, nm - 1, nd)

      while (d < end) {
        const dateStr = [
          d.getFullYear(),
          String(d.getMonth() + 1).padStart(2, '0'),
          String(d.getDate()).padStart(2, '0'),
        ].join('-')
        try {
          await supabase.rpc('snapshot_daily_history', { snapshot_date: dateStr })
        } catch (err) {
          console.warn('[We Ate] snapshot_daily_history failed:', err)
          break
        }
        d.setDate(d.getDate() + 1)
      }

      localStorage.setItem(LAST_ACTIVE_DATE_KEY, now)
      lastDate = now
      setCurrentDate(now)
    }

    check() // Run immediately to backfill any missed days
    const id = setInterval(check, 30_000) // Then every 30 s
    return () => clearInterval(id)
  }, [])

  return currentDate
}
