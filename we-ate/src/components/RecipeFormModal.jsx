import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash2, Flame, Dumbbell, Wheat, Droplets, Leaf, AlertCircle, ChevronLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'

// ── helpers ────────────────────────────────────────────────────────────────

const EMPTY_ING = () => ({ ingredient_name: '', kat_amount: '', jeremiah_amount: '' })
const EMPTY_NUT = () => ({ calories: '', protein: '', carbs: '', fat: '', fiber: '' })
const initForm = () => ({
  name: '',
  type: 'single',
  notes: '',
  ingredients: [EMPTY_ING()],
  nutrition: { kat: EMPTY_NUT(), jeremiah: EMPTY_NUT() },
})

function nutFromRow(row) {
  if (!row) return EMPTY_NUT()
  return {
    calories: row.calories?.toString() ?? '',
    protein:  row.protein?.toString()  ?? '',
    carbs:    row.carbs?.toString()    ?? '',
    fat:      row.fat?.toString()      ?? '',
    fiber:    row.fiber?.toString()    ?? '',
  }
}

function populateForm(recipe) {
  const ings = (recipe.recipe_ingredients ?? [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((i) => ({
      ingredient_name: i.ingredient_name,
      kat_amount:      i.kat_amount ?? '',
      jeremiah_amount: i.jeremiah_amount ?? '',
    }))
  return {
    name:  recipe.name,
    type:  recipe.type,
    notes: recipe.notes ?? '',
    ingredients: ings.length ? ings : [EMPTY_ING()],
    nutrition: {
      kat:      nutFromRow((recipe.recipe_nutrition ?? []).find((n) => n.person === 'kat')),
      jeremiah: nutFromRow((recipe.recipe_nutrition ?? []).find((n) => n.person === 'jeremiah')),
    },
  }
}

// ── sub-components ─────────────────────────────────────────────────────────

const MACRO_FIELDS = [
  { key: 'calories', label: 'Calories',   Icon: Flame,    required: true, span: 2 },
  { key: 'protein',  label: 'Protein (g)', Icon: Dumbbell, span: 1 },
  { key: 'carbs',    label: 'Carbs (g)',   Icon: Wheat,    span: 1 },
  { key: 'fat',      label: 'Fat (g)',     Icon: Droplets, span: 1 },
  { key: 'fiber',    label: 'Fiber (g)',   Icon: Leaf,     span: 1 },
]

function NutritionPanel({ title, accentColor, values, onChange }) {
  return (
    <div
      className="rounded-2xl border p-4 space-y-3"
      style={{ borderColor: accentColor + '40', backgroundColor: accentColor + '0d' }}
    >
      {title && (
        <h4
          className="font-display text-lg font-medium"
          style={{ color: accentColor }}
        >
          {title}
        </h4>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        {MACRO_FIELDS.map(({ key, label, Icon, required, span }) => (
          <div key={key} className={span === 2 ? 'col-span-2' : ''}>
            <label className="label flex items-center gap-1.5 mb-1">
              <Icon size={11} style={{ color: accentColor }} />
              {label}
              {required && <span className="text-terracotta">*</span>}
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              required={required}
              value={values[key]}
              onChange={(e) => onChange(key, e.target.value)}
              placeholder={key === 'calories' ? '420' : '0'}
              className="input-field py-2"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function IngredientRow({ ing, isSplit, index, onChange, onRemove, isOnly }) {
  return (
    <div className="flex items-start gap-2">
      <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: isSplit ? '2fr 1fr 1fr' : '2fr 1fr' }}>
        <input
          type="text"
          value={ing.ingredient_name}
          onChange={(e) => onChange(index, 'ingredient_name', e.target.value)}
          placeholder="Ingredient"
          className="input-field py-2 text-sm"
        />
        <input
          type="text"
          value={ing.kat_amount}
          onChange={(e) => onChange(index, 'kat_amount', e.target.value)}
          placeholder={isSplit ? "Kat's" : 'Amount'}
          className="input-field py-2 text-sm"
        />
        {isSplit && (
          <input
            type="text"
            value={ing.jeremiah_amount}
            onChange={(e) => onChange(index, 'jeremiah_amount', e.target.value)}
            placeholder="Jeremiah's"
            className="input-field py-2 text-sm"
          />
        )}
      </div>
      <button
        type="button"
        onClick={() => onRemove(index)}
        disabled={isOnly}
        className="mt-2 w-8 h-8 rounded-lg flex items-center justify-center text-warm-gray hover:text-terracotta hover:bg-terracotta/8 transition-all disabled:opacity-20 disabled:cursor-not-allowed shrink-0"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

function StepDots({ step, total }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i === step ? 20 : 6,
            height: 6,
            backgroundColor: i === step ? '#C4622D' : '#EDE4D6',
          }}
        />
      ))}
    </div>
  )
}

// ── main component ─────────────────────────────────────────────────────────

const STEPS = ['Details', 'Ingredients', 'Nutrition']

export default function RecipeFormModal({ open, onClose, onSaved, recipe = null }) {
  const isEdit = !!recipe
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(initForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Populate form when editing
  useEffect(() => {
    if (open) {
      setForm(recipe ? populateForm(recipe) : initForm())
      setStep(0)
      setError(null)
    }
  }, [open, recipe])

  const setField = (field, value) => setForm((p) => ({ ...p, [field]: value }))

  // Ingredient helpers
  const updateIng = (i, field, value) =>
    setForm((p) => {
      const ings = [...p.ingredients]
      ings[i] = { ...ings[i], [field]: value }
      return { ...p, ingredients: ings }
    })
  const addIng = () => setForm((p) => ({ ...p, ingredients: [...p.ingredients, EMPTY_ING()] }))
  const removeIng = (i) =>
    setForm((p) => ({ ...p, ingredients: p.ingredients.filter((_, idx) => idx !== i) }))

  // Nutrition helpers
  const updateNut = (person, field, value) =>
    setForm((p) => ({
      ...p,
      nutrition: { ...p.nutrition, [person]: { ...p.nutrition[person], [field]: value } },
    }))

  // Step validation
  const canAdvance = () => {
    if (step === 0) return form.name.trim().length > 0
    if (step === 1) return true
    return false
  }

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1)
  }
  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1)
    else onClose()
  }

  // Save
  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        name:  form.name.trim(),
        type:  form.type,
        notes: form.notes.trim() || null,
      }

      let recipeId
      if (isEdit) {
        const { error: e } = await supabase.from('recipes').update(payload).eq('id', recipe.id)
        if (e) throw e
        recipeId = recipe.id
        await Promise.all([
          supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId),
          supabase.from('recipe_nutrition').delete().eq('recipe_id', recipeId),
        ])
      } else {
        const { data, error: e } = await supabase.from('recipes').insert(payload).select().single()
        if (e) throw e
        recipeId = data.id
      }

      // Ingredients
      const validIngs = form.ingredients.filter((i) => i.ingredient_name.trim())
      if (validIngs.length > 0) {
        const { error: e } = await supabase.from('recipe_ingredients').insert(
          validIngs.map((ing, idx) => ({
            recipe_id:       recipeId,
            ingredient_name: ing.ingredient_name.trim(),
            kat_amount:      ing.kat_amount || null,
            jeremiah_amount:
              form.type === 'split' ? (ing.jeremiah_amount || null) : (ing.kat_amount || null),
            sort_order: idx,
          }))
        )
        if (e) throw e
      }

      // Nutrition — always save a row for each person
      const toNum = (v) => (v !== '' ? Number(v) : null)
      const nutRow = (person, nut) => ({
        recipe_id: recipeId,
        person,
        calories:  Number(nut.calories) || 0,
        protein:   Number(nut.protein)  || 0,
        carbs:     Number(nut.carbs)    || 0,
        fat:       Number(nut.fat)      || 0,
        fiber:     toNum(nut.fiber),
      })

      const nutRows =
        form.type === 'split'
          ? [nutRow('kat', form.nutrition.kat), nutRow('jeremiah', form.nutrition.jeremiah)]
          : [nutRow('kat', form.nutrition.kat), nutRow('jeremiah', form.nutrition.kat)]

      const { error: ne } = await supabase.from('recipe_nutrition').insert(nutRows)
      if (ne) throw ne

      onSaved()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4"
          style={{ backgroundColor: 'rgba(44, 36, 22, 0.5)', backdropFilter: 'blur(6px)' }}
          onClick={handleBackdrop}
        >
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="w-full sm:max-w-lg bg-warm-white rounded-t-3xl sm:rounded-3xl border border-parchment shadow-2xl flex flex-col"
            style={{ maxHeight: '90dvh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBack}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-warm-gray hover:text-charcoal hover:bg-parchment transition-all"
                >
                  <ChevronLeft size={18} />
                </button>
                <div>
                  <h2 className="font-display text-2xl font-medium text-charcoal leading-none">
                    {isEdit ? 'Edit recipe' : 'New recipe'}
                  </h2>
                  <p className="font-body text-xs text-warm-gray mt-0.5">{STEPS[step]}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StepDots step={step} total={STEPS.length} />
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-warm-gray hover:text-charcoal hover:bg-parchment transition-all"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mx-6 flex items-start gap-2 bg-terracotta/8 border border-terracotta/20 text-terracotta-dark rounded-xl px-4 py-3 text-sm font-body mb-2 shrink-0">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 pb-4">
              <AnimatePresence mode="wait">

                {/* ── Step 0: Details ── */}
                {step === 0 && (
                  <motion.div
                    key="step0"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.22 }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="label">Recipe name *</label>
                      <input
                        type="text"
                        required
                        autoFocus
                        value={form.name}
                        onChange={(e) => setField('name', e.target.value)}
                        placeholder="e.g. Salmon rice bowl"
                        className="input-field"
                      />
                    </div>

                    {/* Type toggle */}
                    <div>
                      <label className="label">Recipe type</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { value: 'single', label: 'Single', sub: 'Same amounts for both' },
                          { value: 'split',  label: 'Split',  sub: 'Different amounts per person' },
                        ].map(({ value, label, sub }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setField('type', value)}
                            className={`rounded-xl border-2 p-4 text-left transition-all duration-150 ${
                              form.type === value
                                ? 'border-terracotta bg-terracotta/6'
                                : 'border-parchment hover:border-warm-gray-light'
                            }`}
                          >
                            <p
                              className={`font-body font-medium text-sm ${
                                form.type === value ? 'text-terracotta-dark' : 'text-charcoal'
                              }`}
                            >
                              {label}
                            </p>
                            <p className="font-body text-xs text-warm-gray mt-0.5">{sub}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="label">Notes</label>
                      <textarea
                        value={form.notes}
                        onChange={(e) => setField('notes', e.target.value)}
                        placeholder="Cooking notes, source, tips…"
                        rows={3}
                        className="input-field resize-none"
                      />
                    </div>
                  </motion.div>
                )}

                {/* ── Step 1: Ingredients ── */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.22 }}
                    className="space-y-3"
                  >
                    {/* Column headers for split */}
                    {form.type === 'split' && (
                      <div
                        className="grid gap-2 text-xs font-body font-medium text-warm-gray px-1"
                        style={{ gridTemplateColumns: '2fr 1fr 1fr 32px' }}
                      >
                        <span>Ingredient</span>
                        <span className="text-terracotta">Kat</span>
                        <span className="text-sage-dark">Jeremiah</span>
                        <span />
                      </div>
                    )}

                    {form.type === 'single' && (
                      <div
                        className="grid gap-2 text-xs font-body font-medium text-warm-gray px-1"
                        style={{ gridTemplateColumns: '2fr 1fr 32px' }}
                      >
                        <span>Ingredient</span>
                        <span>Amount</span>
                        <span />
                      </div>
                    )}

                    {form.ingredients.map((ing, i) => (
                      <IngredientRow
                        key={i}
                        ing={ing}
                        index={i}
                        isSplit={form.type === 'split'}
                        onChange={updateIng}
                        onRemove={removeIng}
                        isOnly={form.ingredients.length === 1}
                      />
                    ))}

                    <button
                      type="button"
                      onClick={addIng}
                      className="flex items-center gap-2 text-sm font-body font-medium text-terracotta hover:text-terracotta-dark transition-colors mt-2"
                    >
                      <span className="w-6 h-6 rounded-full bg-terracotta/10 flex items-center justify-center">
                        <Plus size={13} />
                      </span>
                      Add ingredient
                    </button>

                    <p className="text-xs text-warm-gray-light font-body pt-1">
                      Ingredients are optional — you can skip this step.
                    </p>
                  </motion.div>
                )}

                {/* ── Step 2: Nutrition ── */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.22 }}
                    className="space-y-4"
                  >
                    {form.type === 'split' ? (
                      <>
                        <NutritionPanel
                          title="Kat"
                          accentColor="#C4622D"
                          values={form.nutrition.kat}
                          onChange={(field, val) => updateNut('kat', field, val)}
                        />
                        <NutritionPanel
                          title="Jeremiah"
                          accentColor="#5A7D68"
                          values={form.nutrition.jeremiah}
                          onChange={(field, val) => updateNut('jeremiah', field, val)}
                        />
                      </>
                    ) : (
                      <NutritionPanel
                        accentColor="#C4622D"
                        values={form.nutrition.kat}
                        onChange={(field, val) => updateNut('kat', field, val)}
                      />
                    )}
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-parchment flex gap-3 shrink-0">
              {step < STEPS.length - 1 ? (
                <button
                  onClick={handleNext}
                  disabled={!canAdvance()}
                  className="btn-primary flex-1"
                >
                  Next — {STEPS[step + 1]}
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary flex-1"
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-cream/40 border-t-cream rounded-full animate-spin" />
                      Saving…
                    </span>
                  ) : (
                    isEdit ? 'Save changes' : 'Save recipe'
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
