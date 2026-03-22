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

function NutritionSummary({ nut }) {
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
      <MacroRow icon={Dumbbell} label="Protein" value={nut.protein}  color="#7B9E87" />
      <MacroRow icon={Wheat}    label="Carbs"   value={nut.carbs}    color="#E8A44A" />
      <MacroRow icon={Droplets} label="Fat"     value={nut.fat}      color="#E8C4B0" />
      {nut.fiber != null && (
        <MacroRow icon={Leaf} label="Fiber" value={nut.fiber} color="#7B9E87" />
      )}
    </div>
  )
}

export default function RecipeCard({ recipe, profiles = [], onEdit, onDeleted }) {
  const [expanded, setExpanded] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isSplit = recipe.type === 'split'

  // Find nutrition for each profile by profile_id
  const nutByProfile = (recipe.recipe_nutrition ?? []).reduce((acc, n) => {
    acc[n.profile_id] = n
    return acc
  }, {})

  const p0Nut = profiles[0] ? nutByProfile[profiles[0].id] : null
  const p1Nut = profiles[1] ? nutByProfile[profiles[1].id] : null

  const handleDelete = async () => {
    setDeleting(true)
    const { error } = await supabase.from('recipes').delete().eq('id', recipe.id)
    if (!error) onDeleted()
    setDeleting(false)
    setConfirming(false)
  }

  return (
    <div className="card overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-3 p-4">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 flex items-center gap-3 text-left min-w-0"
        >
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
              {!isSplit && p0Nut && (
                <span className="font-body text-xs text-warm-gray">
                  {p0Nut.calories} kcal
                </span>
              )}
              {isSplit && p0Nut && p1Nut && (
                <span className="font-body text-xs text-warm-gray">
                  {p0Nut.calories} / {p1Nut.calories} kcal
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
                            <span style={{ color: profiles[0]?.accent ?? '#C4622D' }}>
                              {ing.kat_amount || '—'}
                            </span>
                            <span style={{ color: profiles[1]?.accent ?? '#5A7D68' }}>
                              {ing.jeremiah_amount || '—'}
                            </span>
                          </div>
                        ) : (
                          <span className="font-body text-xs text-warm-gray shrink-0">
                            {ing.kat_amount || '—'}
                          </span>
                        )}
                      </div>
                    ))}
                    {isSplit && profiles.length >= 2 && (
                      <div className="flex justify-end gap-3 pt-1 text-[10px] font-body font-medium tracking-wide">
                        <span style={{ color: profiles[0].accent }}>{profiles[0].name}</span>
                        <span style={{ color: profiles[1].accent }}>{profiles[1].name}</span>
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
                {isSplit && profiles.length >= 2 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {profiles.map((profile) => (
                      <div
                        key={profile.id}
                        className="rounded-xl border p-3 space-y-1.5"
                        style={{
                          backgroundColor: profile.accent + '0d',
                          borderColor: profile.accent + '26',
                        }}
                      >
                        <p
                          className="font-display text-sm font-medium mb-2"
                          style={{ color: profile.accent }}
                        >
                          {profile.name}
                        </p>
                        <NutritionSummary nut={nutByProfile[profile.id]} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl bg-cream border border-parchment p-3 space-y-1.5">
                    <NutritionSummary nut={p0Nut} />
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
