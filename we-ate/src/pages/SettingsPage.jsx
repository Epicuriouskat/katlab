import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Check, Flame, Dumbbell, Wheat, Droplets, Leaf } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useTargets } from '../hooks/useTargets'
import PageHeader from '../components/PageHeader'
import BottomNav from '../components/BottomNav'

const USER_META = {
  kat:      { name: 'Kat',      initial: 'K', accent: '#C4622D', panelBg: '#FDF8F5', borderColor: '#E8C4B0' },
  jeremiah: { name: 'Jeremiah', initial: 'J', accent: '#5A7D68', panelBg: '#F5FAF7', borderColor: '#A8C4B0' },
}

const FIELDS = [
  { key: 'calories', label: 'Calories', unit: 'kcal', Icon: Flame,    required: true },
  { key: 'protein',  label: 'Protein',  unit: 'g',    Icon: Dumbbell, required: true },
  { key: 'carbs',    label: 'Carbs',    unit: 'g',    Icon: Wheat,    required: true },
  { key: 'fat',      label: 'Fat',      unit: 'g',    Icon: Droplets, required: true },
  { key: 'fiber',    label: 'Fiber',    unit: 'g',    Icon: Leaf,     required: false },
]

function toForm(t) {
  if (!t) return { calories: '', protein: '', carbs: '', fat: '', fiber: '' }
  return {
    calories: t.calories?.toString() ?? '',
    protein:  t.protein?.toString()  ?? '',
    carbs:    t.carbs?.toString()    ?? '',
    fat:      t.fat?.toString()      ?? '',
    fiber:    t.fiber != null ? t.fiber.toString() : '',
  }
}

function PersonForm({ person, initialValues, onSaved }) {
  const meta = USER_META[person]
  const [form,   setForm]   = useState(() => toForm(initialValues))
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState(null)

  useEffect(() => { setForm(toForm(initialValues)) }, [initialValues])

  const set = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }))
    setSaved(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { error } = await supabase
      .from('user_targets')
      .upsert(
        {
          person,
          calories: Number(form.calories) || 0,
          protein:  Number(form.protein)  || 0,
          carbs:    Number(form.carbs)    || 0,
          fat:      Number(form.fat)      || 0,
          fiber:    form.fiber !== '' ? Number(form.fiber) : null,
        },
        { onConflict: 'person' }
      )

    if (error) {
      setError(error.message)
    } else {
      setSaved(true)
      onSaved?.()
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border p-5"
      style={{ backgroundColor: meta.panelBg, borderColor: meta.borderColor }}
    >
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-display text-2xl italic shrink-0"
          style={{ backgroundColor: meta.accent }}
        >
          {meta.initial}
        </div>
        <h2 className="font-display text-2xl font-medium" style={{ color: meta.accent }}>
          {meta.name}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {FIELDS.map(({ key, label, unit, Icon, required }) => (
          <div key={key}>
            <label className="label flex items-center gap-1.5">
              <Icon size={11} style={{ color: meta.accent }} />
              {label}
              <span className="text-warm-gray-light font-normal normal-case tracking-normal">
                ({unit})
              </span>
              {!required && (
                <span className="text-warm-gray-light font-normal normal-case tracking-normal">
                  · optional
                </span>
              )}
            </label>
            <input
              type="number"
              min="0"
              step="1"
              required={required}
              value={form[key]}
              onChange={set(key)}
              placeholder={required ? '0' : '—'}
              className="input-field"
            />
          </div>
        ))}

        {error && (
          <p className="font-body text-xs text-red-500 pt-1">{error}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full mt-1 flex items-center justify-center gap-2 py-3 px-6 rounded-full font-body font-medium text-sm transition-all duration-200 active:scale-95 hover:-translate-y-px"
          style={{
            backgroundColor: saved ? '#7B9E87' : meta.accent,
            color: '#FAF7F2',
          }}
        >
          {saving ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving…
            </>
          ) : saved ? (
            <>
              <Check size={15} />
              Saved
            </>
          ) : (
            `Save ${meta.name}'s targets`
          )}
        </button>
      </form>
    </motion.div>
  )
}

export default function SettingsPage() {
  const { targets, loading, refetch } = useTargets()

  return (
    <div className="min-h-screen bg-cream grain-overlay pb-24">

      <PageHeader subtitle="Settings" maxWidth="max-w-2xl" />

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="font-display text-3xl font-light text-charcoal">Daily targets</h2>
          <p className="font-body text-sm text-warm-gray mt-1">
            Set the nutrition goals used for progress bars on the tracking screen.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="spinner" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PersonForm person="kat"      initialValues={targets.kat}      onSaved={refetch} />
            <PersonForm person="jeremiah" initialValues={targets.jeremiah} onSaved={refetch} />
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
