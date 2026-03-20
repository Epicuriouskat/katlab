import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Flame, Dumbbell, Wheat, Droplets, Leaf, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

const EMPTY = { name: '', calories: '', protein: '', carbs: '', fat: '', fiber: '' }

const FIELDS = [
  { key: 'calories', label: 'Calories',    Icon: Flame,    required: true, span: 2 },
  { key: 'protein',  label: 'Protein (g)', Icon: Dumbbell, span: 1 },
  { key: 'carbs',    label: 'Carbs (g)',   Icon: Wheat,    span: 1 },
  { key: 'fat',      label: 'Fat (g)',     Icon: Droplets, span: 1 },
  { key: 'fiber',    label: 'Fiber (g)',   Icon: Leaf,     span: 1 },
]

export default function QuickItemFormModal({ open, onClose, onSaved, item = null }) {
  const isEdit = !!item
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setError(null)
      setForm(
        item
          ? {
              name:     item.name,
              calories: item.calories?.toString() ?? '',
              protein:  item.protein?.toString()  ?? '',
              carbs:    item.carbs?.toString()    ?? '',
              fat:      item.fat?.toString()      ?? '',
              fiber:    item.fiber?.toString()    ?? '',
            }
          : EMPTY
      )
    }
  }, [open, item])

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        name:     form.name.trim(),
        calories: Number(form.calories) || 0,
        protein:  Number(form.protein)  || 0,
        carbs:    Number(form.carbs)    || 0,
        fat:      Number(form.fat)      || 0,
        fiber:    form.fiber !== '' ? Number(form.fiber) : null,
      }

      if (isEdit) {
        const { error: e } = await supabase.from('quick_items').update(payload).eq('id', item.id)
        if (e) throw e
      } else {
        const { error: e } = await supabase.from('quick_items').insert(payload)
        if (e) throw e
      }

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
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="w-full sm:max-w-md bg-warm-white rounded-t-3xl sm:rounded-3xl border border-parchment shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSubmit}>
              {/* Header */}
              <div className="flex items-start justify-between px-6 pt-6 pb-4">
                <div>
                  <h2 className="font-display text-2xl font-medium text-charcoal">
                    {isEdit ? 'Edit item' : 'Quick item'}
                  </h2>
                  <p className="font-body text-xs text-warm-gray mt-0.5">
                    Name and nutrition, no ingredients needed
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-warm-gray hover:text-charcoal hover:bg-parchment transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="px-6 pb-6 space-y-4">
                {error && (
                  <div className="flex items-start gap-2 bg-terracotta/8 border border-terracotta/20 text-terracotta-dark rounded-xl px-4 py-3 text-sm font-body">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    {error}
                  </div>
                )}

                <div>
                  <label className="label">Item name *</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={form.name}
                    onChange={set('name')}
                    placeholder="e.g. Greek yogurt"
                    className="input-field"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {FIELDS.map(({ key, label, Icon, required, span }) => (
                    <div key={key} className={span === 2 ? 'col-span-2' : ''}>
                      <label className="label flex items-center gap-1.5">
                        <Icon size={11} className="text-terracotta" />
                        {label}
                        {required && <span className="text-terracotta">*</span>}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        required={required}
                        value={form[key]}
                        onChange={set(key)}
                        placeholder={key === 'calories' ? '150' : '0'}
                        className="input-field"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={onClose} className="btn-ghost flex-1 border border-parchment">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="btn-primary flex-1">
                    {saving ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-cream/40 border-t-cream rounded-full animate-spin" />
                        Saving…
                      </span>
                    ) : (
                      isEdit ? 'Save changes' : 'Add item'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
