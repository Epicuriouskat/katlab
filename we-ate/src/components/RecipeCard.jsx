import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Pencil, Trash2, Users, User, Flame, Dumbbell, Wheat, Droplets, Leaf } from 'lucide-react'
import { supabase } from '../lib/supabase'

function MacroRow({ icon: Icon, label, value, color }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-1.5 text-warm-gray font-body">
        <Icon size={11} style={{ color }} />
        {label}
      </span>
      <span className="font-body font-medium text-charcoal">{value}g</span>
    </div>
  )
}

function NutritionSummary({ nut, compact = false }) {
  if (!nut) return <p className="text-xs text-warm-gray-light font-body">No nutrition data</p>
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-warm-gray font-body">
          <Flame size={11} className="text-terracotta" />
          Calories
        </span>
        <span className="font-display text-base font-medium text-charcoal leading-none">
          {nut.calories}
        </span>
      </div>
      {!compact && (
        <>
          <MacroRow icon={Dumbbell} label="Protein" value={nut.protein}  color="#7B9E87" />
          <MacroRow icon={Wheat}    label="Carbs"   value={nut.carbs}    color="#E8A44A" />
          <MacroRow icon={Droplets} label="Fat"     value={nut.fat}      color="#E8C4B0" />
          {nut.fiber != null && (
            <MacroRow icon={Leaf} label="Fiber" value={nut.fiber} color="#7B9E87" />
          )}
        </>
      )}
    </div>
  )
}

export default function RecipeCard({ recipe, onEdit, onDeleted }) {
  const [expanded, setExpanded] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isSplit = recipe.type === 'split'
  const katNut = (recipe.recipe_nutrition ?? []).find((n) => n.person === 'kat')
  const jerNut = (recipe.recipe_nutrition ?? []).find((n) => n.person === 'jeremiah')
  const displayNut = isSplit ? null : katNut // single: show once

  const handleDelete = async () => {
    setDeleting(true)
    const { error } = await supabase.from('recipes').delete().eq('id', recipe.id)
    if (!error) onDeleted()
    setDeleting(false)
    setConfirming(false)
  }

  return (
    <div className="card overflow-hidden">
      {/* Card header — always visible */}
      <div className="flex items-center gap-3 p-4">
        {/* Expand button */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 flex items-center gap-3 text-left min-w-0"
        >
          {/* Type indicator */}
          <span
            className={`shrink-0 w-2 h-2 rounded-full mt-0.5 ${
              isSplit ? 'bg-terracotta' : 'bg-sage'
            }`}
          />

          <div className="flex-1 min-w-0">
            <p className="font-display text-xl font-medium text-charcoal truncate leading-tight">
              {recipe.name}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`font-body text-[10px] font-medium tracking-wide px-2 py-0.5 rounded-full ${
                  isSplit
                    ? 'bg-terracotta/10 text-terracotta-dark'
                    : 'bg-sage/15 text-sage-dark'
                }`}
              >
                {isSplit ? (
                  <span className="flex items-center gap-1"><Users size={9} /> Split</span>
                ) : (
                  <span className="flex items-center gap-1"><User size={9} /> Single</span>
                )}
              </span>

              {/* Calorie preview */}
              {!isSplit && katNut && (
                <span className="font-body text-xs text-warm-gray">
                  {katNut.calories} kcal
                </span>
              )}
              {isSplit && katNut && jerNut && (
                <span className="font-body text-xs text-warm-gray">
                  {katNut.calories} / {jerNut.calories} kcal
                </span>
              )}
            </div>
          </div>

          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-warm-gray shrink-0"
          >
            <ChevronDown size={18} />
          </motion.div>
        </button>
      </div>

      {/* Expanded body */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-parchment pt-4">

              {/* Notes */}
              {recipe.notes && (
                <p className="font-body text-sm text-warm-gray italic">{recipe.notes}</p>
              )}

              {/* Ingredients */}
              {(recipe.recipe_ingredients ?? []).length > 0 && (
                <div>
                  <p className="font-body text-[10px] font-medium text-warm-gray tracking-widest uppercase mb-2">
                    Ingredients
                  </p>
                  <div className="space-y-1">
                    {recipe.recipe_ingredients.map((ing) => (
                      <div key={ing.id} className="flex items-baseline justify-between gap-4">
                        <span className="font-body text-sm text-charcoal">{ing.ingredient_name}</span>
                        {isSplit ? (
                          <div className="flex gap-3 shrink-0 text-xs font-body">
                            <span className="text-terracotta">{ing.kat_amount || '—'}</span>
                            <span className="text-sage-dark">{ing.jeremiah_amount || '—'}</span>
                          </div>
                        ) : (
                          <span className="font-body text-xs text-warm-gray shrink-0">
                            {ing.kat_amount || '—'}
                          </span>
                        )}
                      </div>
                    ))}
                    {isSplit && (
                      <div className="flex justify-end gap-3 pt-1 text-[10px] font-body font-medium tracking-wide">
                        <span className="text-terracotta">Kat</span>
                        <span className="text-sage-dark">Jeremiah</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Nutrition */}
              <div>
                <p className="font-body text-[10px] font-medium text-warm-gray tracking-widest uppercase mb-2">
                  Nutrition
                </p>
                {isSplit ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-terracotta/6 border border-terracotta/15 p-3 space-y-1.5">
                      <p className="font-display text-sm font-medium text-terracotta-dark mb-2">Kat</p>
                      <NutritionSummary nut={katNut} />
                    </div>
                    <div className="rounded-xl bg-sage/8 border border-sage/20 p-3 space-y-1.5">
                      <p className="font-display text-sm font-medium text-sage-dark mb-2">Jeremiah</p>
                      <NutritionSummary nut={jerNut} />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-cream border border-parchment p-3 space-y-1.5">
                    <NutritionSummary nut={displayNut} />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-1">
                {confirming ? (
                  <div className="flex items-center gap-2 flex-1">
                    <p className="font-body text-sm text-charcoal">Delete this recipe?</p>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="text-sm font-body font-medium text-terracotta hover:text-terracotta-dark transition-colors"
                    >
                      {deleting ? 'Deleting…' : 'Yes, delete'}
                    </button>
                    <button
                      onClick={() => setConfirming(false)}
                      className="text-sm font-body text-warm-gray hover:text-charcoal transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(recipe)}
                      className="flex items-center gap-1.5 text-xs font-body font-medium text-warm-gray hover:text-charcoal transition-colors px-3 py-1.5 rounded-full hover:bg-parchment"
                    >
                      <Pencil size={12} />
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirming(true)}
                      className="flex items-center gap-1.5 text-xs font-body font-medium text-warm-gray hover:text-terracotta transition-colors px-3 py-1.5 rounded-full hover:bg-terracotta/8"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
