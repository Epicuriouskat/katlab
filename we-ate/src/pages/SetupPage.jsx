import { useState } from 'react'
import { motion } from 'framer-motion'
import { Flame, Dumbbell, Wheat, Droplets, Leaf, FlaskConical } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthProvider'
import { useNavigate } from 'react-router-dom'

const TARGET_FIELDS = [
  { key: 'calories', label: 'Calories',    unit: 'kcal', Icon: Flame,        required: true },
  { key: 'protein',  label: 'Protein',     unit: 'g',    Icon: Dumbbell,     required: true },
  { key: 'carbs',    label: 'Carbs',       unit: 'g',    Icon: Wheat,        required: true },
  { key: 'fat',      label: 'Fat',         unit: 'g',    Icon: Droplets,     required: true },
  { key: 'fiber',    label: 'Fiber',       unit: 'g',    Icon: Leaf,         required: false },
  { key: 'sodium',   label: 'Sodium',      unit: 'mg',   Icon: FlaskConical, required: false },
]

const EMPTY_TARGETS = { calories: '', protein: '', carbs: '', fat: '', fiber: '', sodium: '' }

export default function SetupPage() {
  const { setActiveProfileId, loadProfiles } = useAuth()
  const navigate = useNavigate()

  const [name,    setName]    = useState('')
  const [targets, setTargets] = useState(EMPTY_TARGETS)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState(null)

  const setTarget = (field) => (e) =>
    setTargets((p) => ({ ...p, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      // Create the profile
      const { data: profile, error: pe } = await supabase
        .from('profiles')
        .insert({ name: name.trim() })
        .select()
        .single()
      if (pe) throw pe

      // Save nutrition targets
      const { error: te } = await supabase.from('user_targets').insert({
        profile_id: profile.id,
        calories:   Number(targets.calories) || 2000,
        protein:    Number(targets.protein)  || 150,
        carbs:      Number(targets.carbs)    || 200,
        fat:        Number(targets.fat)      || 65,
        fiber:      targets.fiber  !== '' ? Number(targets.fiber)  : null,
        sodium:     targets.sodium !== '' ? Number(targets.sodium) : null,
      })
      if (te) throw te

      // Refresh profiles in context and set active
      await loadProfiles()
      setActiveProfileId(profile.id)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream grain-overlay flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-10"
        >
          <p className="font-display italic text-terracotta text-lg mb-3 opacity-80">We Ate</p>
          <h1 className="font-display text-4xl font-light text-charcoal tracking-tight mb-2">
            Welcome
          </h1>
          <p className="font-body text-sm text-warm-gray">
            Set up your profile to start tracking.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <form onSubmit={handleSubmit} className="card p-6 space-y-5">

            {error && (
              <p className="font-body text-xs text-red-500">{error}</p>
            )}

            <div>
              <label className="label">Your name *</label>
              <input
                type="text"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex"
                className="input-field"
              />
            </div>

            <div>
              <p className="label mb-3">Daily nutrition targets</p>
              <div className="grid grid-cols-2 gap-3">
                {TARGET_FIELDS.map(({ key, label, unit, Icon, required }) => (
                  <div key={key} className={key === 'calories' || key === 'sodium' ? 'col-span-2' : ''}>
                    <label className="label flex items-center gap-1.5">
                      <Icon size={11} className="text-terracotta" />
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
                      value={targets[key]}
                      onChange={setTarget(key)}
                      placeholder={required ? '0' : '—'}
                      className="input-field"
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="btn-primary w-full"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-cream/40 border-t-cream rounded-full animate-spin" />
                  Setting up…
                </span>
              ) : (
                'Get started'
              )}
            </button>
          </form>
        </motion.div>

      </div>
    </div>
  )
}
