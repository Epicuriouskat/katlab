import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Flame, Dumbbell, Wheat, Droplets } from 'lucide-react'

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack']

export default function AddMealModal({ open, onClose, onAdd, defaultType = 'Breakfast' }) {
  const [form, setForm] = useState({
    name: '',
    mealType: defaultType,
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    notes: '',
  })

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.calories) return
    onAdd({
      id: crypto.randomUUID(),
      name: form.name.trim(),
      mealType: form.mealType,
      calories: Number(form.calories),
      protein: Number(form.protein) || 0,
      carbs: Number(form.carbs) || 0,
      fat: Number(form.fat) || 0,
      notes: form.notes.trim(),
      loggedAt: new Date().toISOString(),
    })
    setForm({ name: '', mealType: defaultType, calories: '', protein: '', carbs: '', fat: '', notes: '' })
    onClose()
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
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
          style={{ backgroundColor: 'rgba(44, 36, 22, 0.45)', backdropFilter: 'blur(4px)' }}
          onClick={handleBackdrop}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="w-full sm:max-w-md bg-warm-white rounded-t-3xl sm:rounded-3xl border border-parchment shadow-xl p-6 sm:p-8"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="font-display text-2xl text-charcoal font-medium">Log a meal</h2>
                <p className="font-body text-xs text-warm-gray mt-0.5">What did you eat?</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-warm-gray hover:text-charcoal hover:bg-parchment transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Meal name */}
              <div>
                <label className="label">Meal name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={set('name')}
                  placeholder="e.g. Oatmeal with berries"
                  className="input-field"
                  autoFocus
                />
              </div>

              {/* Meal type selector */}
              <div>
                <label className="label">Meal type</label>
                <div className="flex gap-2 flex-wrap">
                  {MEAL_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, mealType: type }))}
                      className={`px-3.5 py-1.5 rounded-full text-sm font-body font-medium transition-all duration-150 ${
                        form.mealType === type
                          ? 'bg-terracotta text-cream'
                          : 'bg-cream border border-parchment text-warm-gray hover:border-terracotta-lighter'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nutrition grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label flex items-center gap-1.5">
                    <Flame size={12} className="text-terracotta" />
                    Calories *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={form.calories}
                    onChange={set('calories')}
                    placeholder="360"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label flex items-center gap-1.5">
                    <Dumbbell size={12} className="text-sage" />
                    Protein (g)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.protein}
                    onChange={set('protein')}
                    placeholder="24"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label flex items-center gap-1.5">
                    <Wheat size={12} className="text-amber" />
                    Carbs (g)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.carbs}
                    onChange={set('carbs')}
                    placeholder="40"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label flex items-center gap-1.5">
                    <Droplets size={12} className="text-blush" />
                    Fat (g)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.fat}
                    onChange={set('fat')}
                    placeholder="12"
                    className="input-field"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="label">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={set('notes')}
                  placeholder="Any notes about this meal…"
                  rows={2}
                  className="input-field resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="btn-ghost flex-1 border border-parchment">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Log meal
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
