import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Scale } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getLocalDate } from '../hooks/useDailyLog'
import PageHeader from '../components/PageHeader'
import BottomNav from '../components/BottomNav'

const USER_META = {
  kat:      { name: 'Kat',      accent: '#C4622D' },
  jeremiah: { name: 'Jeremiah', accent: '#5A7D68' },
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

// ── SVG Line Chart ─────────────────────────────────────────────────────────────

function WeightChart({ rows }) {
  const katRows      = useMemo(() => rows.filter(r => r.person === 'kat'),      [rows])
  const jeremiahRows = useMemo(() => rows.filter(r => r.person === 'jeremiah'), [rows])

  const allDates = useMemo(() => {
    const dates = new Set([...katRows.map(r => r.date), ...jeremiahRows.map(r => r.date)])
    return [...dates].sort()
  }, [katRows, jeremiahRows])

  if (allDates.length < 2) return null

  const W = 560
  const H = 180
  const PAD = { top: 16, right: 16, bottom: 28, left: 44 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top  - PAD.bottom

  const allWeights = rows.map(r => Number(r.weight_lbs))
  const minW = Math.floor(Math.min(...allWeights)) - 2
  const maxW = Math.ceil( Math.max(...allWeights)) + 2

  const xScale = (i) => PAD.left + (i / (allDates.length - 1)) * innerW
  const yScale = (w) => PAD.top  + ((maxW - w) / (maxW - minW)) * innerH

  const buildPath = (personRows) => {
    const pts = personRows.map(r => {
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
      {yTicks.map(w => (
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

      {katRows.length > 0 && (
        <>
          <path d={buildPath(katRows)} fill="none" stroke="#C4622D" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" />
          {katRows.map(r => {
            const xi = allDates.indexOf(r.date)
            return (
              <circle key={r.id} cx={xScale(xi)} cy={yScale(Number(r.weight_lbs))} r="3.5"
                fill="#C4622D" />
            )
          })}
        </>
      )}

      {jeremiahRows.length > 0 && (
        <>
          <path d={buildPath(jeremiahRows)} fill="none" stroke="#5A7D68" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" />
          {jeremiahRows.map(r => {
            const xi = allDates.indexOf(r.date)
            return (
              <circle key={r.id} cx={xScale(xi)} cy={yScale(Number(r.weight_lbs))} r="3.5"
                fill="#5A7D68" />
            )
          })}
        </>
      )}
    </svg>
  )
}

// ── Entry form ─────────────────────────────────────────────────────────────────

function WeightEntryForm({ person, personRows, onSaved }) {
  const meta  = USER_META[person]
  const today = getLocalDate()

  const [selectedDate, setSelectedDate] = useState(today)
  const [value,        setValue]        = useState('')
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)

  useEffect(() => {
    const existing = personRows.find(r => r.date === selectedDate)
    setValue(existing ? String(existing.weight_lbs) : '')
    setSaved(false)
  }, [selectedDate, personRows])

  const handleSave = async () => {
    if (!value) return
    setSaving(true)
    await supabase
      .from('weight_log')
      .upsert({ date: selectedDate, person, weight_lbs: Number(value) }, { onConflict: 'date,person' })
    setSaving(false)
    setSaved(true)
    onSaved()
    setTimeout(() => setSaved(false), 3000)
  }

  const isEditing = personRows.some(r => r.date === selectedDate)

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-display text-lg italic shrink-0"
          style={{ backgroundColor: meta.accent }}
        >
          {meta.name[0]}
        </div>
        <span className="font-display text-lg font-medium" style={{ color: meta.accent }}>
          {meta.name}
        </span>
        {isEditing && (
          <span className="ml-auto eyebrow text-warm-gray-light">editing</span>
        )}
      </div>

      <div className="mb-2">
        <input
          type="date"
          max={today}
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="input-field w-full"
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
          style={{ backgroundColor: saved ? '#7B9E87' : meta.accent }}
        >
          {saving ? '…' : saved ? '✓ Saved' : 'Save'}
        </button>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function WeightPage() {
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

  const katRows      = useMemo(() => rows.filter(r => r.person === 'kat'),      [rows])
  const jeremiahRows = useMemo(() => rows.filter(r => r.person === 'jeremiah'), [rows])

  const grouped = useMemo(() => {
    const map = {}
    rows.forEach(r => {
      if (!map[r.date]) map[r.date] = { kat: null, jeremiah: null }
      map[r.date][r.person] = r
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
              : "Log today's weight for each person below."}
          </p>
        </div>

        {/* Entry forms */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          <WeightEntryForm person="kat"      personRows={katRows}      onSaved={fetchRows} />
          <WeightEntryForm person="jeremiah" personRows={jeremiahRows} onSaved={fetchRows} />
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
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 font-body text-[11px] text-warm-gray">
                      <span className="w-4 h-0.5 rounded-full inline-block" style={{ backgroundColor: '#C4622D' }} />
                      Kat
                    </span>
                    <span className="flex items-center gap-1.5 font-body text-[11px] text-warm-gray">
                      <span className="w-4 h-0.5 rounded-full inline-block" style={{ backgroundColor: '#5A7D68' }} />
                      Jeremiah
                    </span>
                  </div>
                </div>
                <WeightChart rows={chartRows} />
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="card overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[380px] border-collapse">
                  <thead>
                    <tr className="border-b border-parchment">
                      <th className="px-4 py-3 text-left eyebrow w-36">Date</th>
                      <th className="px-4 py-3 text-left eyebrow"
                        style={{ color: USER_META.kat.accent }}>Kat</th>
                      <th className="px-4 py-3 text-left eyebrow"
                        style={{ color: USER_META.jeremiah.accent }}>Jeremiah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped.map(([date, people], i) => (
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
                        {['kat', 'jeremiah'].map(person => (
                          <td key={person} className="px-4 py-3 align-middle">
                            {people[person] ? (
                              <span className="font-display text-xl font-medium leading-none"
                                style={{ color: USER_META[person].accent }}>
                                {Number(people[person].weight_lbs).toFixed(1)}
                                <span className="font-body text-xs text-warm-gray font-normal ml-1">lbs</span>
                              </span>
                            ) : (
                              <span className="font-body text-sm text-warm-gray-light">—</span>
                            )}
                          </td>
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
