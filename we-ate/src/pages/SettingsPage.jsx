import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Flame, Dumbbell, Wheat, Droplets, Leaf, FlaskConical, Pencil, Trash2, UserPlus, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthProvider'
import { useTargets } from '../hooks/useTargets'
import { PROFILE_STYLES } from '../lib/profileStyles'
import PageHeader from '../components/PageHeader'
import BottomNav from '../components/BottomNav'

const FIELDS = [
  { key: 'calories', label: 'Calories', unit: 'kcal', Icon: Flame,        required: true },
  { key: 'protein',  label: 'Protein',  unit: 'g',    Icon: Dumbbell,     required: true },
  { key: 'carbs',    label: 'Carbs',    unit: 'g',    Icon: Wheat,        required: true },
  { key: 'fat',      label: 'Fat',      unit: 'g',    Icon: Droplets,     required: true },
  { key: 'fiber',    label: 'Fiber',    unit: 'g',    Icon: Leaf,         required: false },
  { key: 'sodium',   label: 'Sodium',   unit: 'mg',   Icon: FlaskConical, required: false },
]

function toForm(t) {
  if (!t) return { calories: '', protein: '', carbs: '', fat: '', fiber: '', sodium: '' }
  return {
    calories: t.calories?.toString() ?? '',
    protein:  t.protein?.toString()  ?? '',
    carbs:    t.carbs?.toString()    ?? '',
    fat:      t.fat?.toString()      ?? '',
    fiber:    t.fiber  != null ? t.fiber.toString()  : '',
    sodium:   t.sodium != null ? t.sodium.toString() : '',
  }
}

// ── Profile card with name editing + targets ─────────────────────────────────

function ProfileCard({ profile, targetsForProfile, canDelete, onSaved, onDeleted }) {
  const { activeProfileId, setActiveProfileId } = useAuth()

  const [nameEditing, setNameEditing]   = useState(false)
  const [nameValue,   setNameValue]     = useState(profile.name)
  const [nameSaving,  setNameSaving]    = useState(false)

  const [confirming, setConfirming] = useState(false)
  const [deleting,   setDeleting]   = useState(false)

  const [form,   setForm]   = useState(() => toForm(targetsForProfile))
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState(null)

  useEffect(() => { setForm(toForm(targetsForProfile)) }, [targetsForProfile])
  useEffect(() => { setNameValue(profile.name) }, [profile.name])

  const set = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }))
    setSaved(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    // Cascade-delete all profile data before removing the profile
    await supabase.from('user_targets')      .delete().eq('profile_id', profile.id)
    await supabase.from('daily_log_entries') .delete().eq('profile_id', profile.id)
    await supabase.from('daily_history')     .delete().eq('profile_id', profile.id)
    await supabase.from('weight_log')        .delete().eq('profile_id', profile.id)
    await supabase.from('recipe_nutrition')  .delete().eq('profile_id', profile.id)
    await supabase.from('profiles')          .delete().eq('id', profile.id)
    if (activeProfileId === profile.id) setActiveProfileId(null)
    onDeleted()
  }

  const handleNameSave = async () => {
    if (!nameValue.trim()) return
    setNameSaving(true)
    await supabase.from('profiles').update({ name: nameValue.trim() }).eq('id', profile.id)
    setNameSaving(false)
    setNameEditing(false)
    onSaved()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { error } = await supabase
      .from('user_targets')
      .upsert(
        {
          profile_id: profile.id,
          calories: Number(form.calories) || 0,
          protein:  Number(form.protein)  || 0,
          carbs:    Number(form.carbs)    || 0,
          fat:      Number(form.fat)      || 0,
          fiber:    form.fiber  !== '' ? Number(form.fiber)  : null,
          sodium:   form.sodium !== '' ? Number(form.sodium) : null,
        },
        { onConflict: 'profile_id' }
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
      style={{ backgroundColor: profile.panelBg, borderColor: profile.borderColor }}
    >
      {/* Profile header with editable name */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-display text-2xl italic shrink-0"
          style={{ backgroundColor: profile.accent }}
        >
          {profile.initial}
        </div>

        {nameEditing ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter')  handleNameSave()
                if (e.key === 'Escape') { setNameEditing(false); setNameValue(profile.name) }
              }}
              autoFocus
              className="input-field py-1.5 flex-1"
            />
            <button
              onClick={handleNameSave}
              disabled={nameSaving || !nameValue.trim()}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-40"
              style={{ backgroundColor: profile.accent }}
            >
              {nameSaving
                ? <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                : <Check size={13} />
              }
            </button>
            <button
              onClick={() => { setNameEditing(false); setNameValue(profile.name) }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-warm-gray hover:text-charcoal hover:bg-parchment transition-all"
            >
              <X size={13} />
            </button>
          </div>
        ) : confirming ? (
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <p className="font-body text-sm text-charcoal">Remove {profile.name}?</p>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="font-body text-sm font-medium text-terracotta hover:text-terracotta-dark transition-colors disabled:opacity-50"
            >
              {deleting ? 'Removing…' : 'Yes, remove'}
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="font-body text-sm text-warm-gray hover:text-charcoal transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1">
            <h2 className="font-display text-2xl font-medium flex-1" style={{ color: profile.accent }}>
              {profile.name}
            </h2>
            <button
              onClick={() => setNameEditing(true)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-warm-gray hover:text-charcoal hover:bg-parchment transition-all"
            >
              <Pencil size={12} />
            </button>
            {canDelete && (
              <button
                onClick={() => setConfirming(true)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-warm-gray hover:text-terracotta hover:bg-terracotta/8 transition-all"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {FIELDS.map(({ key, label, unit, Icon, required }) => (
          <div key={key}>
            <label className="label flex items-center gap-1.5">
              <Icon size={11} style={{ color: profile.accent }} />
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
            backgroundColor: saved ? '#7B9E87' : profile.accent,
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
            `Save ${profile.name}'s targets`
          )}
        </button>
      </form>
    </motion.div>
  )
}

// ── Add second person form ────────────────────────────────────────────────────

function AddPersonForm({ onSaved, onCancel, secondStyle }) {
  const [name,    setName]    = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const { error: pe } = await supabase.from('profiles').insert({ name: name.trim() })
      if (pe) throw pe
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border p-5"
      style={{ backgroundColor: secondStyle.panelBg, borderColor: secondStyle.borderColor }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-display text-2xl italic shrink-0"
          style={{ backgroundColor: secondStyle.accent }}
        >
          ?
        </div>
        <h2 className="font-display text-2xl font-medium" style={{ color: secondStyle.accent }}>
          New person
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {error && <p className="font-body text-xs text-red-500">{error}</p>}
        <div>
          <label className="label">Name *</label>
          <input
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Jordan"
            className="input-field"
          />
        </div>
        <p className="font-body text-xs text-warm-gray">
          You can set their nutrition targets after adding them.
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="btn-ghost flex-1 border border-parchment">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="flex-1 py-3 px-6 rounded-full font-body font-medium text-sm transition-all duration-200 active:scale-95 disabled:opacity-40"
            style={{ backgroundColor: secondStyle.accent, color: '#FAF7F2' }}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Adding…
              </span>
            ) : 'Add person'}
          </button>
        </div>
      </form>
    </motion.div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { profiles, loadProfiles } = useAuth()
  const { targets, loading, refetch: refetchTargets } = useTargets()
  const [addingPerson, setAddingPerson] = useState(false)

  const handleSaved = async () => {
    await Promise.all([loadProfiles(), refetchTargets()])
  }

  const handleDeleted = async () => {
    await loadProfiles()
  }

  const secondStyle = PROFILE_STYLES[1]

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
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profiles.map((profile) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  targetsForProfile={targets[profile.id]}
                  canDelete={profiles.length > 1}
                  onSaved={handleSaved}
                  onDeleted={handleDeleted}
                />
              ))}

              {/* Add second person */}
              {profiles.length < 2 && (
                <AnimatePresence>
                  {addingPerson ? (
                    <AddPersonForm
                      key="add-form"
                      secondStyle={secondStyle}
                      onSaved={async () => {
                        await handleSaved()
                        setAddingPerson(false)
                      }}
                      onCancel={() => setAddingPerson(false)}
                    />
                  ) : (
                    <motion.button
                      key="add-btn"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => setAddingPerson(true)}
                      className="rounded-2xl border-2 border-dashed border-parchment p-5 flex flex-col items-center justify-center gap-3 hover:border-warm-gray-light transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-full bg-parchment flex items-center justify-center group-hover:bg-warm-gray-light/20 transition-colors">
                        <UserPlus size={18} className="text-warm-gray" />
                      </div>
                      <div className="text-center">
                        <p className="font-body text-sm font-medium text-warm-gray group-hover:text-charcoal transition-colors">
                          Add second person
                        </p>
                        <p className="font-body text-xs text-warm-gray-light mt-0.5">
                          Share this app with a partner or family member
                        </p>
                      </div>
                    </motion.button>
                  )}
                </AnimatePresence>
              )}
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
