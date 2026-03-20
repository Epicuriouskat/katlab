import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, BookOpen, Zap, Users, User, Flame, Dumbbell, Wheat, Droplets, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'

const SLOT_LABELS = {
  breakfast: 'Breakfast',
  lunch:     'Lunch',
  dinner:    'Dinner',
  snacks:    'Snacks',
}

const PERSON_META = {
  kat:      { name: 'Kat',      accent: '#C4622D' },
  jeremiah: { name: 'Jeremiah', accent: '#5A7D68' },
}

function getRecipeNutForPerson(recipe, person) {
  const rows = recipe.recipe_nutrition ?? []
  return (
    rows.find((n) => n.person === person) ??
    rows.find((n) => n.person === 'kat') ?? // fallback for single recipes
    null
  )
}

function NutritionChips({ nut }) {
  if (!nut) return null
  return (
    <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
      <span className="text-[11px] font-body text-warm-gray flex items-center gap-1">
        <Flame size={9} className="text-terracotta" />
        {nut.calories} kcal
      </span>
      {nut.protein > 0 && (
        <span className="text-[11px] font-body text-sage-dark flex items-center gap-1">
          <Dumbbell size={9} /> P {nut.protein}g
        </span>
      )}
      {nut.carbs > 0 && (
        <span className="text-[11px] font-body text-amber flex items-center gap-1">
          <Wheat size={9} /> C {nut.carbs}g
        </span>
      )}
      {nut.fat > 0 && (
        <span className="text-[11px] font-body text-warm-gray flex items-center gap-1">
          <Droplets size={9} /> F {nut.fat}g
        </span>
      )}
    </div>
  )
}

function ItemButton({ name, badge, nut, onAdd, loading }) {
  return (
    <button
      onClick={onAdd}
      disabled={loading}
      className="w-full flex items-center gap-3 p-3 rounded-xl border border-parchment bg-cream hover:border-terracotta-lighter hover:bg-warm-white transition-all duration-150 text-left disabled:opacity-60 group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <p className="font-body font-medium text-charcoal text-sm truncate">{name}</p>
          {badge}
        </div>
        <NutritionChips nut={nut} />
      </div>
      <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-terracotta/10 text-terracotta group-hover:bg-terracotta group-hover:text-cream transition-all">
        {loading
          ? <span className="w-3.5 h-3.5 border-2 border-terracotta/30 border-t-terracotta rounded-full animate-spin group-hover:border-cream/30 group-hover:border-t-cream" />
          : <Plus size={14} />
        }
      </div>
    </button>
  )
}

function EmptyList({ search, tab }) {
  return (
    <p className="text-center text-sm text-warm-gray-light font-body py-10">
      {search
        ? `No ${tab === 'recipes' ? 'recipes' : 'items'} matching "${search}"`
        : tab === 'recipes'
          ? 'No recipes yet — add some in the library.'
          : 'No quick items yet — add some in the library.'}
    </p>
  )
}

export default function AddLogEntryModal({
  open, person, mealSlot, date, onClose, onAdded, recipes, quickItems,
}) {
  const [search, setSearch] = useState('')
  const [tab, setTab]       = useState('recipes')
  const [adding, setAdding] = useState(null)

  const meta = PERSON_META[person] ?? PERSON_META.kat

  useEffect(() => {
    if (open) {
      setSearch('')
      setTab(recipes.length > 0 ? 'recipes' : 'quick')
      setAdding(null)
    }
  }, [open, recipes.length])

  const filteredRecipes = useMemo(() => {
    const q = search.toLowerCase()
    return recipes.filter((r) => r.name.toLowerCase().includes(q))
  }, [recipes, search])

  const filteredQuick = useMemo(() => {
    const q = search.toLowerCase()
    return quickItems.filter((i) => i.name.toLowerCase().includes(q))
  }, [quickItems, search])

  const addEntry = async ({ recipeId, quickItemId }) => {
    const key = recipeId ?? quickItemId
    setAdding(key)
    try {
      const { error } = await supabase.from('daily_log_entries').insert({
        date,
        person,
        meal_slot:    mealSlot,
        recipe_id:    recipeId    ?? null,
        quick_item_id: quickItemId ?? null,
        quantity: 1,
      })
      if (!error) { onAdded(); onClose() }
    } finally {
      setAdding(null)
    }
  }

  const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose() }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4"
          style={{ backgroundColor: 'rgba(44,36,22,0.5)', backdropFilter: 'blur(6px)' }}
          onClick={handleBackdrop}
        >
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="w-full sm:max-w-md bg-warm-white rounded-t-3xl sm:rounded-3xl border border-parchment shadow-xl flex flex-col"
            style={{ maxHeight: '82dvh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-4 shrink-0 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p
                    className="font-body text-[11px] font-medium tracking-widest uppercase"
                    style={{ color: meta.accent }}
                  >
                    {meta.name} · {SLOT_LABELS[mealSlot] ?? mealSlot}
                  </p>
                  <h2 className="font-display text-2xl font-medium text-charcoal mt-0.5">
                    Add to log
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-warm-gray hover:text-charcoal hover:bg-parchment transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-gray-light" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  autoFocus
                  className="input-field pl-9 py-2.5 text-sm"
                />
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-parchment/60 rounded-xl p-1">
                {[
                  { id: 'recipes', label: 'Recipes',     Icon: BookOpen },
                  { id: 'quick',   label: 'Quick items', Icon: Zap },
                ].map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-body font-medium transition-all duration-200 ${
                      tab === id
                        ? 'bg-warm-white text-charcoal shadow-sm'
                        : 'text-warm-gray hover:text-charcoal'
                    }`}
                  >
                    <Icon size={12} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2">
              {tab === 'recipes' && (
                filteredRecipes.length === 0
                  ? <EmptyList search={search} tab="recipes" />
                  : filteredRecipes.map((recipe) => {
                      const nut = getRecipeNutForPerson(recipe, person)
                      const TypeBadge = (
                        <span className={`shrink-0 text-[10px] font-body font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
                          recipe.type === 'split'
                            ? 'bg-terracotta/10 text-terracotta-dark'
                            : 'bg-sage/15 text-sage-dark'
                        }`}>
                          {recipe.type === 'split' ? <Users size={9} /> : <User size={9} />}
                          {recipe.type}
                        </span>
                      )
                      return (
                        <ItemButton
                          key={recipe.id}
                          name={recipe.name}
                          badge={TypeBadge}
                          nut={nut}
                          loading={adding === recipe.id}
                          onAdd={() => addEntry({ recipeId: recipe.id })}
                        />
                      )
                    })
              )}

              {tab === 'quick' && (
                filteredQuick.length === 0
                  ? <EmptyList search={search} tab="quick" />
                  : filteredQuick.map((item) => (
                      <ItemButton
                        key={item.id}
                        name={item.name}
                        nut={item}
                        loading={adding === item.id}
                        onAdd={() => addEntry({ quickItemId: item.id })}
                      />
                    ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
