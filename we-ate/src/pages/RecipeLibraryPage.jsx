import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, X, BookOpen, Zap, Pencil, Trash2, Flame, Dumbbell, Wheat, Droplets, Leaf } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRecipes, useQuickItems } from '../hooks/useRecipes'
import RecipeCard from '../components/RecipeCard'
import RecipeFormModal from '../components/RecipeFormModal'
import QuickItemFormModal from '../components/QuickItemFormModal'
import BottomNav from '../components/BottomNav'

// ── Quick item row ─────────────────────────────────────────────────────────

function QuickItemRow({ item, onEdit, onDeleted }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    await supabase.from('quick_items').delete().eq('id', item.id)
    onDeleted()
    setDeleting(false)
  }

  return (
    <div className="card px-4 py-3 flex items-center gap-3 group">
      <div className="flex-1 min-w-0">
        <p className="font-body font-medium text-charcoal text-sm truncate">{item.name}</p>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="text-xs font-body text-warm-gray flex items-center gap-1">
            <Flame size={10} className="text-terracotta" />
            {item.calories} kcal
          </span>
          {item.protein > 0 && (
            <span className="text-xs font-body text-sage-dark flex items-center gap-1">
              <Dumbbell size={10} /> P {item.protein}g
            </span>
          )}
          {item.carbs > 0 && (
            <span className="text-xs font-body text-amber flex items-center gap-1">
              <Wheat size={10} /> C {item.carbs}g
            </span>
          )}
          {item.fat > 0 && (
            <span className="text-xs font-body text-warm-gray flex items-center gap-1">
              <Droplets size={10} /> F {item.fat}g
            </span>
          )}
          {item.fiber != null && (
            <span className="text-xs font-body text-warm-gray flex items-center gap-1">
              <Leaf size={10} /> Fi {item.fiber}g
            </span>
          )}
        </div>
      </div>

      {confirming ? (
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs font-body font-medium text-terracotta hover:text-terracotta-dark transition-colors"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="text-xs font-body text-warm-gray hover:text-charcoal transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => onEdit(item)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-warm-gray hover:text-charcoal hover:bg-parchment transition-all"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => setConfirming(true)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-warm-gray hover:text-terracotta hover:bg-terracotta/8 transition-all"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState({ tab, onAdd }) {
  const isRecipes = tab === 'recipes'
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center px-8"
    >
      <div className="w-14 h-14 rounded-full bg-parchment flex items-center justify-center mb-4">
        {isRecipes ? <BookOpen size={24} className="text-warm-gray" /> : <Zap size={24} className="text-warm-gray" />}
      </div>
      <p className="font-display text-2xl text-charcoal font-medium mb-1">
        {isRecipes ? 'No recipes yet' : 'No quick items yet'}
      </p>
      <p className="font-body text-sm text-warm-gray mb-6">
        {isRecipes
          ? 'Build your recipe library to quickly log meals.'
          : 'Add snacks and simple items without a full recipe.'}
      </p>
      <button onClick={onAdd} className="btn-primary">
        {isRecipes ? 'Add first recipe' : 'Add first item'}
      </button>
    </motion.div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function RecipeLibraryPage() {
  const [tab, setTab] = useState('recipes')
  const [search, setSearch] = useState('')

  const [recipeModalOpen, setRecipeModalOpen] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState(null)

  const [quickModalOpen, setQuickModalOpen] = useState(false)
  const [editingQuick, setEditingQuick] = useState(null)

  const { recipes, loading: recipesLoading, refetch: refetchRecipes } = useRecipes()
  const { quickItems, loading: quickLoading, refetch: refetchQuick } = useQuickItems()

  const filteredRecipes = useMemo(() => {
    const q = search.toLowerCase()
    return recipes.filter((r) => r.name.toLowerCase().includes(q))
  }, [recipes, search])

  const filteredQuick = useMemo(() => {
    const q = search.toLowerCase()
    return quickItems.filter((i) => i.name.toLowerCase().includes(q))
  }, [quickItems, search])

  const openAddRecipe = () => { setEditingRecipe(null); setRecipeModalOpen(true) }
  const openEditRecipe = (r) => { setEditingRecipe(r); setRecipeModalOpen(true) }
  const openAddQuick = () => { setEditingQuick(null); setQuickModalOpen(true) }
  const openEditQuick = (i) => { setEditingQuick(i); setQuickModalOpen(true) }

  const isLoading = tab === 'recipes' ? recipesLoading : quickLoading

  return (
    <div className="min-h-screen bg-cream grain-overlay pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-cream/90 border-b border-parchment backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-display text-2xl font-light text-charcoal italic">
              We <span className="text-terracotta not-italic font-medium">Ate</span>
            </h1>
            <button
              onClick={tab === 'recipes' ? openAddRecipe : openAddQuick}
              className="btn-primary py-2 text-sm flex items-center gap-1.5"
            >
              <Plus size={15} />
              {tab === 'recipes' ? 'New recipe' : 'New item'}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-parchment/60 rounded-xl p-1 mb-3">
            {[
              { id: 'recipes', label: 'Recipes', Icon: BookOpen },
              { id: 'quick',   label: 'Quick items', Icon: Zap },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => { setTab(id); setSearch('') }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-body font-medium transition-all duration-200 ${
                  tab === id
                    ? 'bg-warm-white text-charcoal shadow-sm'
                    : 'text-warm-gray hover:text-charcoal'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-gray-light" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === 'recipes' ? 'Search recipes…' : 'Search quick items…'}
              className="input-field pl-9 pr-9 py-2.5 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-gray-light hover:text-charcoal transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-parchment border-t-terracotta rounded-full animate-spin" />
          </div>
        ) : (
          <AnimatePresence mode="wait">

            {/* ── Recipes tab ── */}
            {tab === 'recipes' && (
              <motion.div
                key="recipes"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {filteredRecipes.length === 0 ? (
                  <EmptyState tab="recipes" onAdd={openAddRecipe} />
                ) : (
                  <div className="space-y-2">
                    <p className="font-body text-xs text-warm-gray mb-3">
                      {filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? 's' : ''}
                      {search && ` matching "${search}"`}
                    </p>
                    <AnimatePresence initial={false}>
                      {filteredRecipes.map((recipe) => (
                        <motion.div
                          key={recipe.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <RecipeCard
                            recipe={recipe}
                            onEdit={openEditRecipe}
                            onDeleted={refetchRecipes}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Quick items tab ── */}
            {tab === 'quick' && (
              <motion.div
                key="quick"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {filteredQuick.length === 0 ? (
                  <EmptyState tab="quick" onAdd={openAddQuick} />
                ) : (
                  <div className="space-y-2">
                    <p className="font-body text-xs text-warm-gray mb-3">
                      {filteredQuick.length} item{filteredQuick.length !== 1 ? 's' : ''}
                      {search && ` matching "${search}"`}
                    </p>
                    <AnimatePresence initial={false}>
                      {filteredQuick.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <QuickItemRow
                            item={item}
                            onEdit={openEditQuick}
                            onDeleted={refetchQuick}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        )}
      </main>

      <BottomNav />

      <RecipeFormModal
        open={recipeModalOpen}
        onClose={() => setRecipeModalOpen(false)}
        onSaved={refetchRecipes}
        recipe={editingRecipe}
      />

      <QuickItemFormModal
        open={quickModalOpen}
        onClose={() => setQuickModalOpen(false)}
        onSaved={refetchQuick}
        item={editingQuick}
      />
    </div>
  )
}
