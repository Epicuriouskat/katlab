import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Scale, Pencil, Trash2, Check, X as XIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getLocalDate } from '../hooks/useDailyLog'
import { useAuth } from '../components/AuthProvider'
import PageHeader from '../components/PageHeader'
import BottomNav from '../components/BottomNav'

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

// ── SVG Line Chart ─────────────────────────────────────────────────────────────

function WeightChart({ rows, profiles }) {
  const profileRows = useMemo(
    () => profiles.map((p) => rows.filter((r) => r.profile_id === p.id)),
    [rows, profiles]
  )

  const allDates = useMemo(() => {
    const dates = new Set(rows.map((r) => r.date))
    return [...dates].sort()
  }, [rows])

  if (allDates.length < 2) return null

  const W = 560
  const H = 180
  const PAD = { top: 16, right: 16, bottom: 28, left: 44 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top  - PAD.bottom

  const allWeights = rows.map((r) => Number(r.weight_lbs))
  const minW = Math.floor(Math.min(...allWeights)) - 2
  const maxW = Math.ceil( Math.max(...allWeights)) + 2

  const xScale = (i) => PAD.left + (i / (allDates.length - 1)) * innerW
  const yScale = (w) => PAD.top  + ((maxW - w) / (maxW - minW)) * innerH

  const buildPath = (personRows) => {
    const pts = personRows.map((r) => {
      const xi = allDates.indexOf(r.date)
      return [xScale(xi), yScale(Number(r.weight_lbs))]
    })
    if (pts.length === 0) return ''
    return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  }

  const range = maxW - minW
  const step  = range <= 10 ? 2 : range <= 30 ? 5 : 10
  const yTicks = []
  for (let w = Math.ceil(minW / step) * step; w <= maxW; w += step) yTicks.push(w)

  const xStep = Math.max(1, Math.ceil(allDates.length / 6))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: 'visible' }}>
      {yTicks.map((w) => (
        <g key={w}>
          <line
            x1={PAD.left}      y1={yScale(w)}
            x2={W - PAD.right} y2={yScale(w)}
            stroke="#EDE4D6" strokeWidth="1"
          />
          <text x={PAD.left - 6} y={yScale(w) + 4}
            textAnchor="end" fill="#8A7E74" fontSize="10"
            fontFamily="DM Sans, sans-serif">
            {w}
          </text>
        </g>
      ))}

      {allDates.map((date, i) => {
        if (i % xStep !== 0 && i !== allDates.length - 1) return null
        const [, m, d] = date.split('-').map(Number)
        return (
          <text key={date} x={xScale(i)} y={H - 4}
            textAnchor="middle" fill="#8A7E74" fontSize="9"
            fontFamily="DM Sans, sans-serif">
            {`${m}/${d}`}
          </text>
        )
      })}

      {profiles.map((profile, i) => {
        const pRows = profileRows[i]
        if (pRows.length === 0) return null
        return (
          <g key={profile.id}>
            <path d={buildPath(pRows)} fill="none" stroke={profile.accent} strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" />
            {pRows.map((r) => {
              const xi = allDates.indexOf(r.date)
              return (
                <circle key={r.id} cx={xScale(xi)} cy={yScale(Number(r.weight_lbs))} r="3.5"
                  fill={profile.accent} />
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}

// ── Entry form ─────────────────────────────────────────────────────────────────

function WeightEntryForm({ profile, personRows, onSaved }) {
  const today = getLocalDate()

  const [selectedDate, setSelectedDate] = useState(today)
  const [value,        setValue]        = useState('')
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)

  useEffect(() => {
    const existing = personRows.find((r) => r.date === selectedDate)
    setValue(existing ? String(existing.weight_lbs) : '')
    setSaved(false)
  }, [selectedDate, personRows])

  const handleSave = async () => {
    if (!value) return
    setSaving(true)
    await supabase
      .from('weight_log')
      .upsert(
        { date: selectedDate, profile_id: profile.id, weight_lbs: Number(value) },
        { onConflict: 'date,profile_id' }
      )
    setSaving(false)
    setSaved(true)
    onSaved()
    setTimeout(() => setSaved(false), 3000)
  }

  const isEditing = personRows.some((r) => r.date === selectedDate)

  return (
    <div className="card p-4 overflow-hidden">
      <div className="flex items-center gap-2.5 mb-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-display text-lg italic shrink-0"
          style={{ backgroundColor: profile.accent }}
        >
          {profile.initial}
        </div>
        <span className="font-display text-lg font-medium" style={{ color: profile.accent }}>
          {profile.name}
        </span>
        {isEditing && (
          <span className="ml-auto eyebrow text-warm-gray-light">editing</span>
        )}
      </div>

      <div className="mb-2 min-w-0">
        <input
          type="date"
          max={today}
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="input-field w-full max-w-full"
        />
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          min="50"
          max="600"
          step="0.1"
          value={value}
          onChange={(e) => { setValue(e.target.value); setSaved(false) }}
          placeholder="lbs"
          className="input-field flex-1"
        />
        <button
          onClick={handleSave}
          disabled={saving || !value}
          className="px-5 py-2 rounded-full font-body font-medium text-sm text-white transition-all disabled:opacity-40 shrink-0 hover:-translate-y-px active:scale-[0.97]"
          style={{ backgroundColor: saved ? '#7B9E87' : profile.accent }}
        >
          {saving ? '…' : saved ? '✓ Saved' : 'Save'}
        </button>
      </div>
    </div>
  )
}

// ── Weight table cell with inline edit / delete ───────────────────────────────

function WeightCell({ row, accent, profileId, onRefetch }) {
  const today = getLocalDate()

  const [editing,    setEditing]    = useState(false)
  const [editDate,   setEditDate]   = useState('')
  const [editValue,  setEditValue]  = useState('')
  const [saving,     setSaving]     = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting,   setDeleting]   = useState(false)

  const startEdit = () => {
    setEditDate(row.date)
    setEditValue(String(row.weight_lbs))
    setEditing(true)
  }

  const handleSave = async () => {
    if (!editValue) return
    setSaving(true)
    if (editDate === row.date) {
      await supabase.from('weight_log').update({ weight_lbs: Number(editValue) }).eq('id', row.id)
    } else {
      await supabase.from('weight_log').delete().eq('id', row.id)
      await supabase
        .from('weight_log')
        .upsert(
          { date: editDate, profile_id: profileId, weight_lbs: Number(editValue) },
          { onConflict: 'date,profile_id' }
        )
    }
    setSaving(false)
    setEditing(false)
    onRefetch()
  }

  const handleDelete = async () => {
    setDeleting(true)
    await supabase.from('weight_log').delete().eq('id', row.id)
    onRefetch()
  }

  if (!row) {
    return (
      <td className="px-4 py-3 align-middle">
        <span className="font-body text-sm text-warm-gray-light">—</span>
      </td>
    )
  }

  if (editing) {
    return (
      <td className="px-4 py-3 align-middle">
        <div className="flex flex-col gap-1.5 min-w-0">
          <input
            type="date"
            max={today}
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
            className="input-field py-1.5 px-2.5 text-xs w-full max-w-full"
          />
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="50"
              max="600"
              step="0.1"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter')  handleSave()
                if (e.key === 'Escape') setEditing(false)
              }}
              placeholder="lbs"
              className="input-field py-1.5 px-2.5 text-xs w-20"
              autoFocus
            />
            <button
              onClick={handleSave}
              disabled={saving || !editValue}
              className="w-7 h-7 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-40 shrink-0 hover:brightness-90"
              style={{ backgroundColor: accent }}
              aria-label="Save"
            >
              {saving
                ? <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                : <Check size={12} />
              }
            </button>
            <button
              onClick={() => setEditing(false)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-warm-gray hover:text-charcoal hover:bg-parchment transition-all shrink-0"
              aria-label="Cancel"
            >
              <XIcon size={12} />
            </button>
          </div>
        </div>
      </td>
    )
  }

  return (
    <td className="px-4 py-3 align-middle group">
      {confirming ? (
        <div className="flex items-center gap-2">
          <span className="font-body text-xs text-warm-gray">Remove?</span>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="font-body text-xs font-medium text-terracotta hover:text-terracotta-dark transition-colors disabled:opacity-50"
          >
            {deleting ? '…' : 'Yes'}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="font-body text-xs text-warm-gray hover:text-charcoal transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <span className="font-display text-xl font-medium leading-none" style={{ color: accent }}>
            {Number(row.weight_lbs).toFixed(1)}
            <span className="font-body text-xs text-warm-gray font-normal ml-1">lbs</span>
          </span>
          <div className="flex gap-0.5 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={startEdit}
              className="w-6 h-6 rounded-md flex items-center justify-center text-warm-gray hover:text-charcoal hover:bg-parchment transition-all"
              aria-label="Edit entry"
            >
              <Pencil size={11} />
            </button>
            <button
              onClick={() => setConfirming(true)}
              className="w-6 h-6 rounded-md flex items-center justify-center text-warm-gray hover:text-terracotta hover:bg-terracotta/8 transition-all"
              aria-label="Delete entry"
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      )}
    </td>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function WeightPage() {
  const { profiles } = useAuth()
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)

  const fetchRows = async () => {
    const { data } = await supabase
      .from('weight_log')
      .select('*')
      .order('date', { ascending: false })
    setRows(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchRows() }, [])

  // Rows per profile
  const profileRows = useMemo(
    () => profiles.map((p) => rows.filter((r) => r.profile_id === p.id)),
    [rows, profiles]
  )

  const grouped = useMemo(() => {
    const map = {}
    rows.forEach((r) => {
      if (!map[r.date]) map[r.date] = {}
      map[r.date][r.profile_id] = r
    })
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a))
  }, [rows])

  const chartRows = useMemo(
    () => [...rows].sort((a, b) => a.date.localeCompare(b.date)),
    [rows]
  )

  const hasChart = chartRows.length >= 2

  return (
    <div className="min-h-screen bg-cream grain-overlay pb-24">

      <PageHeader subtitle="Weight" />

      <main className="max-w-3xl mx-auto px-4 py-6">

        <div className="mb-6">
          <h2 className="font-display text-3xl font-light text-charcoal">Weight log</h2>
          <p className="font-body text-sm text-warm-gray mt-1">
            {grouped.length > 0
              ? `${grouped.length} day${grouped.length !== 1 ? 's' : ''} recorded`
              : "Log today's weight below."}
          </p>
        </div>

        {/* Entry forms */}
        <div className={`grid grid-cols-1 ${profiles.length > 1 ? 'sm:grid-cols-2' : 'max-w-sm'} gap-3 mb-8`}>
          {profiles.map((profile, i) => (
            <WeightEntryForm
              key={profile.id}
              profile={profile}
              personRows={profileRows[i]}
              onSaved={fetchRows}
            />
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="spinner" />
          </div>
        ) : grouped.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-parchment flex items-center justify-center mb-4">
              <Scale size={24} className="text-warm-gray" />
            </div>
            <p className="font-display text-2xl text-charcoal font-medium mb-1">No entries yet</p>
            <p className="font-body text-sm text-warm-gray">Save your first weight above to see the trend.</p>
          </motion.div>
        ) : (
          <>
            {hasChart && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="card p-5 mb-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="eyebrow">Trend</p>
                  {profiles.length > 1 && (
                    <div className="flex items-center gap-4">
                      {profiles.map((p) => (
                        <span key={p.id} className="flex items-center gap-1.5 font-body text-[11px] text-warm-gray">
                          <span className="w-4 h-0.5 rounded-full inline-block" style={{ backgroundColor: p.accent }} />
                          {p.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <WeightChart rows={chartRows} profiles={profiles} />
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="card overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ minWidth: profiles.length > 1 ? 480 : 320 }}>
                  <thead>
                    <tr className="border-b border-parchment">
                      <th className="px-4 py-3 text-left eyebrow w-36">Date</th>
                      {profiles.map((p) => (
                        <th key={p.id} className="px-4 py-3 text-left eyebrow" style={{ color: p.accent }}>
                          {p.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {grouped.map(([date, byProfile], i) => (
                      <motion.tr
                        key={date}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.18, delay: i * 0.025 }}
                        className={`border-b border-parchment/60 last:border-0 ${
                          i % 2 === 0 ? 'bg-transparent' : 'bg-warm-white/50'
                        }`}
                      >
                        <td className="px-4 py-3 align-middle">
                          <p className="font-body text-sm font-medium text-charcoal whitespace-nowrap">
                            {formatDate(date)}
                          </p>
                        </td>
                        {profiles.map((profile) => (
                          <WeightCell
                            key={profile.id}
                            row={byProfile[profile.id]}
                            accent={profile.accent}
                            profileId={profile.id}
                            onRefetch={fetchRows}
                          />
                        ))}
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
