import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Calendar } from 'lucide-react'
import { supabase } from '../lib/supabase'
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

function MacroCell({ row, accent }) {
  if (!row) {
    return (
      <td className="px-4 py-4 align-top">
        <span className="font-body text-sm text-warm-gray-light">—</span>
      </td>
    )
  }
  return (
    <td className="px-4 py-4 align-top">
      <p className="font-display text-2xl font-medium leading-none" style={{ color: accent }}>
        {Math.round(row.total_calories)}
        <span className="font-body text-xs text-warm-gray font-normal ml-1">kcal</span>
      </p>
      <p className="font-body text-xs text-warm-gray mt-1.5 leading-relaxed">
        <span className="text-sage-dark">P {Math.round(row.protein)}g</span>
        {' · '}
        <span className="text-amber">C {Math.round(row.carbs)}g</span>
        {' · '}
        <span>F {Math.round(row.fat)}g</span>
        {row.fiber != null && (
          <span className="text-warm-gray-light"> · Fi {Math.round(row.fiber)}g</span>
        )}
      </p>
    </td>
  )
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="w-14 h-14 rounded-full bg-parchment flex items-center justify-center mb-4">
        <Calendar size={24} className="text-warm-gray" />
      </div>
      <p className="font-display text-2xl text-charcoal font-medium mb-1">No history yet</p>
      <p className="font-body text-sm text-warm-gray">
        Daily totals are saved automatically at midnight.
      </p>
    </motion.div>
  )
}

export default function HistoryPage() {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('daily_history')
      .select('*')
      .order('date', { ascending: false })
      .then(({ data }) => { setRows(data ?? []); setLoading(false) })
  }, [])

  // Group by date → { date: { kat: row|null, jeremiah: row|null } }
  const grouped = useMemo(() => {
    const map = {}
    rows.forEach((r) => {
      if (!map[r.date]) map[r.date] = { kat: null, jeremiah: null }
      map[r.date][r.person] = r
    })
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a))
  }, [rows])

  return (
    <div className="min-h-screen bg-cream grain-overlay pb-24">

      <PageHeader subtitle="History" />

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="font-display text-3xl font-light text-charcoal">Daily log</h2>
          <p className="font-body text-sm text-warm-gray mt-1">
            {rows.length > 0
              ? `${grouped.length} day${grouped.length !== 1 ? 's' : ''} recorded`
              : 'Snapshot saved automatically each midnight'}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="spinner" />
          </div>
        ) : grouped.length === 0 ? (
          <EmptyState />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="card overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse">
                <thead>
                  <tr className="border-b border-parchment">
                    <th className="px-4 py-3 text-left eyebrow w-36">Date</th>
                    <th className="px-4 py-3 text-left eyebrow"
                      style={{ color: USER_META.kat.accent }}>
                      Kat
                    </th>
                    <th className="px-4 py-3 text-left eyebrow"
                      style={{ color: USER_META.jeremiah.accent }}>
                      Jeremiah
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {grouped.map(([date, people], i) => (
                    <motion.tr
                      key={date}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.03 }}
                      className={`border-b border-parchment/60 last:border-0 ${
                        i % 2 === 0 ? 'bg-transparent' : 'bg-warm-white/50'
                      }`}
                    >
                      <td className="px-4 py-4 align-top">
                        <p className="font-body text-sm font-medium text-charcoal whitespace-nowrap">
                          {formatDate(date)}
                        </p>
                      </td>
                      <MacroCell row={people.kat}      accent={USER_META.kat.accent} />
                      <MacroCell row={people.jeremiah} accent={USER_META.jeremiah.accent} />
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
