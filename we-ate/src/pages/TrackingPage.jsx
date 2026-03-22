import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/PageHeader'
import { useDailyLog, getEntryNutrition, computeTotals, useMidnightReset, getLocalDate } from '../hooks/useDailyLog'
import { useRecipes, useQuickItems } from '../hooks/useRecipes'
import { useTargets } from '../hooks/useTargets'
import AddLogEntryModal from '../components/AddLogEntryModal'
import BottomNav from '../components/BottomNav'

// ── Constants ─────────────────────────────────────────────────────────────────

const PORTION_PRESETS = [0.5, 1, 1.5, 2]

const MEAL_SLOTS = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { id: 'lunch',     label: 'Lunch',     emoji: '☀️'  },
  { id: 'dinner',    label: 'Dinner',    emoji: '🌙'  },
  { id: 'snacks',    label: 'Snacks',    emoji: '🍎'  },
]


const USER_META = {
  kat:      { name: 'Kat',      initial: 'K', accent: '#C4622D', accentBg: '#F5E4D8' },
  jeremiah: { name: 'Jeremiah', initial: 'J', accent: '#5A7D68', accentBg: '#DFF0E5' },
}

function formatDisplayDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const today = getLocalDate()
  const isToday = dateStr === today
  const formatted = new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
  return isToday ? `Today — ${formatted}` : formatted
}

// ── MacroBar ──────────────────────────────────────────────────────────────────

function MacroBar({ label, value, target, unit }) {
  const pct = target > 0 ? (value / target) * 100 : 0
  const over = pct > 100

  let barColor = '#7B9E87'           // sage   — on track
  if (pct > 100) barColor = '#EF4444' // red    — over
  else if (pct > 90) barColor = '#F59E0B' // amber — close

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="font-body text-[11px] text-warm-gray">{label}</span>
        <span className="font-body text-[11px] font-medium" style={{ color: over ? '#EF4444' : '#2C2416' }}>
          {Math.round(value)}
          <span className="text-warm-gray-light font-normal">/{target}{unit}</span>
        </span>
      </div>
      <div className="h-1.5 bg-parchment rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: barColor }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(pct, 100)}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      {over && (
        <p className="font-body text-[10px] mt-0.5" style={{ color: '#EF4444' }}>
          {Math.round(value - target)}{unit} over
        </p>
      )}
    </div>
  )
}

// ── MacroTotals ───────────────────────────────────────────────────────────────

function MacroTotals({ entries, person, allTargets }) {
  const totals   = useMemo(() => computeTotals(entries), [entries])
  const targets  = allTargets[person] ?? { calories: 2000, protein: 150, carbs: 200, fat: 65 }
  const calPct  = targets.calories > 0 ? (totals.calories / targets.calories) * 100 : 0
  const calColor = calPct > 100 ? '#EF4444' : calPct > 90 ? '#F59E0B' : '#2C2416'

  return (
    <div className="mt-4 rounded-2xl border border-parchment bg-warm-white p-4 space-y-3">
      <p className="font-body text-[10px] font-medium text-warm-gray tracking-widest uppercase">
        Daily totals
      </p>

      {/* Big calorie display */}
      <div className="flex items-end gap-1.5">
        <span
          className="font-display text-4xl font-medium leading-none"
          style={{ color: calColor }}
        >
          {Math.round(totals.calories)}
        </span>
        <span className="font-body text-xs text-warm-gray pb-0.5">
          / {targets.calories} kcal
        </span>
      </div>

      <MacroBar label="Calories" value={totals.calories} target={targets.calories} unit=" kcal" />
      <MacroBar label="Protein"  value={totals.protein}  target={targets.protein}  unit="g" />
      <MacroBar label="Carbs"    value={totals.carbs}    target={targets.carbs}    unit="g" />
      <MacroBar label="Fat"      value={totals.fat}      target={targets.fat}      unit="g" />
      {targets.sodium > 0 && (
        <MacroBar label="Sodium" value={totals.sodium} target={targets.sodium} unit="mg" />
      )}
    </div>
  )
}

// ── Log entry row ─────────────────────────────────────────────────────────────

function LogEntryRow({ entry, onRemoved }) {
  const nut = useMemo(() => getEntryNutrition(entry), [entry])
  const [removing, setRemoving] = useState(false)
  const [editing, setEditing]   = useState(false)
  const [portion, setPortion]   = useState(Number(entry.quantity) || 1)
  const [saving, setSaving]     = useState(false)

  const handleRemove = async () => {
    setRemoving(true)
    await supabase.from('daily_log_entries').delete().eq('id', entry.id)
    onRemoved()
  }

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('daily_log_entries').update({ quantity: portion }).eq('id', entry.id)
    setSaving(false)
    setEditing(false)
    onRemoved()
  }

  const cancelEdit = () => {
    setEditing(false)
    setPortion(Number(entry.quantity) || 1)
  }

  if (editing) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="py-2 space-y-2"
      >
        <div className="flex items-center justify-between">
          <p className="font-body text-sm font-medium text-charcoal truncate pr-2">{nut.name}</p>
          <button onClick={cancelEdit} className="text-warm-gray-light hover:text-warm-gray transition-colors shrink-0">
            <X size={13} />
          </button>
        </div>
        <div className="flex gap-1.5">
          {PORTION_PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setPortion(p)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-body font-medium border transition-all ${
                portion === p
                  ? 'bg-terracotta text-cream border-terracotta'
                  : 'bg-cream text-warm-gray border-parchment hover:border-terracotta-lighter'
              }`}
            >
              {p}×
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={portion}
            onChange={(e) => {
              const v = parseFloat(e.target.value)
              if (!isNaN(v) && v > 0) setPortion(Math.round(v * 10) / 10)
            }}
            className="input-field py-1.5 text-sm text-center flex-1"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 rounded-full bg-terracotta text-cream text-xs font-body font-medium hover:bg-terracotta-dark transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
          >
            {saving
              ? <span className="w-3 h-3 border border-cream/30 border-t-cream rounded-full animate-spin" />
              : <Check size={12} />
            }
            Save
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ duration: 0.18 }}
      className="flex items-center gap-2 py-1.5 min-w-0"
    >
      <button
        onClick={() => setEditing(true)}
        className="flex-1 min-w-0 text-left hover:opacity-70 transition-opacity"
      >
        <p className="font-body text-sm text-charcoal truncate leading-snug">{nut.name}</p>
        <p className="font-body text-[11px] text-warm-gray">
          {Math.round(nut.calories)} kcal
          {Number(entry.quantity) !== 1 && (
            <span className="text-warm-gray-light ml-1">· {entry.quantity}×</span>
          )}
        </p>
      </button>
      <button
        onClick={handleRemove}
        disabled={removing}
        aria-label={`Remove ${nut.name}`}
        className="w-6 h-6 flex items-center justify-center rounded text-warm-gray-light hover:text-terracotta hover:bg-terracotta/8 transition-all shrink-0 disabled:opacity-40"
      >
        {removing
          ? <span className="w-3 h-3 border border-warm-gray-light border-t-terracotta rounded-full animate-spin" />
          : <X size={13} />
        }
      </button>
    </motion.div>
  )
}

// ── Meal slot ─────────────────────────────────────────────────────────────────

function MealSlot({ slot, entries, accent, onAdd, onRefetch }) {
  const slotCals = useMemo(
    () => entries.reduce((s, e) => s + getEntryNutrition(e).calories, 0),
    [entries]
  )

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm leading-none">{slot.emoji}</span>
          <h3 className="font-display text-lg font-medium text-charcoal leading-none">
            {slot.label}
          </h3>
          {slotCals > 0 && (
            <span className="font-body text-[11px] text-warm-gray">
              {Math.round(slotCals)} kcal
            </span>
          )}
        </div>

        <button
          onClick={onAdd}
          className="flex items-center gap-1 text-[11px] font-body font-medium transition-colors group"
          style={{ color: accent }}
        >
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center group-hover:opacity-75 transition-opacity"
            style={{ backgroundColor: accent + '22' }}
          >
            <Plus size={11} />
          </span>
          Add
        </button>
      </div>

      <div className="pl-0.5">
        <AnimatePresence initial={false}>
          {entries.length === 0 ? (
            <p className="font-body text-[11px] text-warm-gray-light italic">Nothing yet</p>
          ) : (
            <div className="divide-y divide-parchment/50">
              {entries.map((entry) => (
                <LogEntryRow key={entry.id} entry={entry} onRemoved={onRefetch} />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── Person column ─────────────────────────────────────────────────────────────

function PersonColumn({ person, entries, onAdd, onRefetch, allTargets }) {
  const meta = USER_META[person]
  const personEntries = useMemo(() => entries.filter((e) => e.person === person), [entries, person])
  const getSlotEntries = (slotId) => personEntries.filter((e) => e.meal_slot === slotId)

  return (
    <div className="h-full">
      {/* Person header */}
      <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-parchment">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-display text-xl italic shrink-0"
          style={{ backgroundColor: meta.accent }}
        >
          {meta.initial}
        </div>
        <h2 className="font-display text-2xl font-medium" style={{ color: meta.accent }}>
          {meta.name}
        </h2>
      </div>

      {/* Totals + progress bars */}
      <MacroTotals entries={personEntries} person={person} allTargets={allTargets} />

      {/* Meal slots */}
      <div className="mt-5">
        {MEAL_SLOTS.map((slot) => (
          <MealSlot
            key={slot.id}
            slot={slot}
            entries={getSlotEntries(slot.id)}
            accent={meta.accent}
            onAdd={() => onAdd(person, slot.id)}
            onRefetch={onRefetch}
          />
        ))}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TrackingPage() {
  const [mobilePerson, setMobilePerson] = useState('kat')
  const [addModal, setAddModal] = useState({ open: false, person: null, slot: null })

  // Midnight auto-reset — returns current local date, snapshots at rollover
  const currentDate = useMidnightReset()

  const { entries, loading, refetch: refetchLog } = useDailyLog(currentDate)
  const { recipes }              = useRecipes()
  const { quickItems }           = useQuickItems()
  const { targets: allTargets }  = useTargets()

  const openAdd  = (person, slot) => setAddModal({ open: true, person, slot })
  const closeAdd = ()              => setAddModal({ open: false, person: null, slot: null })

  const [simulating, setSimulating] = useState(false)
  const simulateMidnight = async () => {
    setSimulating(true)
    try {
      await supabase.rpc('snapshot_daily_history', { snapshot_date: currentDate })
      await supabase.from('daily_log_entries').delete().eq('date', currentDate)
      await refetchLog()
    } finally {
      setSimulating(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream grain-overlay pb-20">

      <PageHeader subtitle={formatDisplayDate(currentDate)} maxWidth="max-w-4xl">
        {import.meta.env.DEV && (
          <button
            onClick={simulateMidnight}
            disabled={simulating}
            title="Simulate midnight reset (dev only)"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-body font-medium transition-all border border-amber/40 bg-amber/10 text-amber hover:bg-amber/20 disabled:opacity-50"
          >
            <span className="font-body text-[9px] font-bold tracking-widest uppercase bg-amber/20 px-1 py-0.5 rounded">dev</span>
            {simulating ? 'Saving…' : '⟳ Midnight'}
          </button>
        )}
      </PageHeader>

      {/* Mobile person toggle */}
      <div className="md:hidden px-4 pt-3">
        <div className="flex gap-2">
          {['kat', 'jeremiah'].map((p) => {
            const m = USER_META[p]
            const active = mobilePerson === p
            return (
              <button
                key={p}
                onClick={() => setMobilePerson(p)}
                className="flex-1 py-2.5 rounded-full text-sm font-body font-medium transition-all duration-200"
                style={
                  active
                    ? { backgroundColor: m.accent, color: '#FAF7F2' }
                    : { backgroundColor: '#F5EFE6', color: '#8A7E74', border: '1px solid #EDE4D6' }
                }
              >
                {m.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-4xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-parchment border-t-terracotta rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col md:flex-row">

            {/* Kat */}
            <div
              className={`flex-1 px-4 py-5 md:border-r md:border-parchment ${
                mobilePerson !== 'kat' ? 'hidden md:block' : ''
              }`}
            >
              <PersonColumn
                person="kat"
                entries={entries}
                onAdd={openAdd}
                onRefetch={refetchLog}
                allTargets={allTargets}
              />
            </div>

            {/* Jeremiah */}
            <div
              className={`flex-1 px-4 py-5 ${
                mobilePerson !== 'jeremiah' ? 'hidden md:block' : ''
              }`}
            >
              <PersonColumn
                person="jeremiah"
                entries={entries}
                onAdd={openAdd}
                onRefetch={refetchLog}
                allTargets={allTargets}
              />
            </div>

          </div>
        )}
      </main>

      <AddLogEntryModal
        open={addModal.open}
        person={addModal.person}
        mealSlot={addModal.slot}
        date={currentDate}
        onClose={closeAdd}
        onAdded={refetchLog}
        recipes={recipes}
        quickItems={quickItems}
      />

      <BottomNav />
    </div>
  )
}
