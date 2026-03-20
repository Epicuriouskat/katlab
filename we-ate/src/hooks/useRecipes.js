import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useRecipes() {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('recipes')
      .select(`
        id, name, type, notes, created_at,
        recipe_ingredients(id, ingredient_name, kat_amount, jeremiah_amount, sort_order),
        recipe_nutrition(id, person, calories, protein, carbs, fat, fiber)
      `)
      .order('name')

    if (error) setError(error.message)
    else setRecipes(
      (data || []).map((r) => ({
        ...r,
        recipe_ingredients: (r.recipe_ingredients || []).sort(
          (a, b) => a.sort_order - b.sort_order
        ),
      }))
    )
    setLoading(false)
  }, [])

  useEffect(() => { refetch() }, [refetch])

  return { recipes, loading, error, refetch }
}

export function useQuickItems() {
  const [quickItems, setQuickItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('quick_items')
      .select('*')
      .order('name')

    if (error) setError(error.message)
    else setQuickItems(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { refetch() }, [refetch])

  return { quickItems, loading, error, refetch }
}
